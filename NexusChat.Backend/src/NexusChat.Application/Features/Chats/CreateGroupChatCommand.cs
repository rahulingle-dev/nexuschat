using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;
using NexusChat.Domain.Entities;
using NexusChat.Domain.Enums;

namespace NexusChat.Application.Features.Chats
{
    public record CreateGroupChatCommand(
        string Name,
        Guid CreatorId,
        List<Guid> MemberUserIds,
        string? ImageUrl = null
    ) : IRequest<ChatDto>;

    public class CreateGroupChatCommandHandler : IRequestHandler<CreateGroupChatCommand, ChatDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotifier _signalRNotifier;

        public CreateGroupChatCommandHandler(IApplicationDbContext context, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _signalRNotifier = signalRNotifier;
        }

        public async Task<ChatDto> Handle(CreateGroupChatCommand request, CancellationToken cancellationToken)
        {
            var allMemberIds = request.MemberUserIds.Append(request.CreatorId).Distinct().ToList();

            if (allMemberIds.Count < 2)
            {
                throw new InvalidOperationException("Group chat requires at least 2 members.");
            }

            if (allMemberIds.Count > 50)
            {
                throw new InvalidOperationException($"Group capacity limit exceeded! Maximum allowed members is 50, but {allMemberIds.Count} were requested.");
            }

            var groupChat = new Chat
            {
                Type = ChatType.Group,
                Name = request.Name.Trim(),
                ImageUrl = request.ImageUrl,
                LastMessageAt = DateTimeOffset.UtcNow
            };

            _context.Chats.Add(groupChat);

            foreach (var userId in allMemberIds)
            {
                var role = (userId == request.CreatorId) ? MemberRole.Admin : MemberRole.Member;
                _context.ChatMembers.Add(new ChatMember
                {
                    ChatId = groupChat.Id,
                    UserId = userId,
                    Role = role,
                    JoinedAt = DateTimeOffset.UtcNow
                });
            }

            await _context.SaveChangesAsync(cancellationToken);

            await _signalRNotifier.NotifyChatCreatedAsync(groupChat.Id, allMemberIds);

            var members = await _context.Users
                .Where(u => allMemberIds.Contains(u.Id))
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    FullName = u.FullName,
                    Bio = u.Bio,
                    AvatarUrl = u.AvatarUrl,
                    IsOnline = u.IsOnline,
                    LastSeenAt = u.LastSeenAt
                })
                .ToListAsync(cancellationToken);

            return new ChatDto
            {
                Id = groupChat.Id,
                Type = groupChat.Type,
                Name = groupChat.Name,
                ImageUrl = groupChat.ImageUrl,
                LastMessageAt = groupChat.LastMessageAt,
                Members = members
            };
        }
    }
}

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
    public record UpdateGroupNameCommand(Guid ChatId, string NewName) : IRequest<ChatDto>;
    public record AddGroupMemberCommand(Guid ChatId, Guid UserId) : IRequest<UserDto>;
    public record RemoveGroupMemberCommand(Guid ChatId, Guid UserId) : IRequest<bool>;
    public record DeleteGroupCommand(Guid ChatId) : IRequest<bool>;

    public class GroupManagementCommandHandler : 
        IRequestHandler<UpdateGroupNameCommand, ChatDto>,
        IRequestHandler<AddGroupMemberCommand, UserDto>,
        IRequestHandler<RemoveGroupMemberCommand, bool>,
        IRequestHandler<DeleteGroupCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotifier _signalRNotifier;

        public GroupManagementCommandHandler(IApplicationDbContext context, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _signalRNotifier = signalRNotifier;
        }

        // 1. Update Group Name
        public async Task<ChatDto> Handle(UpdateGroupNameCommand request, CancellationToken cancellationToken)
        {
            var chat = await _context.Chats
                .Include(c => c.Members)
                .ThenInclude(m => m.User)
                .FirstOrDefaultAsync(c => c.Id == request.ChatId, cancellationToken);

            if (chat == null || chat.Type != ChatType.Group)
            {
                throw new InvalidOperationException("Group chat not found.");
            }

            chat.Name = request.NewName.Trim();
            await _context.SaveChangesAsync(cancellationToken);

            // Notify members of group update via SignalR
            var memberIds = chat.Members.Select(m => m.UserId).ToList();
            await _signalRNotifier.NotifyChatCreatedAsync(chat.Id, memberIds); // Re-trigger chat update/sync

            return new ChatDto
            {
                Id = chat.Id,
                Type = chat.Type,
                Name = chat.Name,
                ImageUrl = chat.ImageUrl,
                LastMessageAt = chat.LastMessageAt,
                Members = chat.Members.Select(m => new UserDto
                {
                    Id = m.User.Id,
                    Username = m.User.Username,
                    Email = m.User.Email,
                    FullName = m.User.FullName,
                    Bio = m.User.Bio,
                    AvatarUrl = m.User.AvatarUrl,
                    IsOnline = m.User.IsOnline,
                    LastSeenAt = m.User.LastSeenAt
                }).ToList()
            };
        }

        // 2. Add Group Member
        public async Task<UserDto> Handle(AddGroupMemberCommand request, CancellationToken cancellationToken)
        {
            var chat = await _context.Chats
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == request.ChatId, cancellationToken);

            if (chat == null || chat.Type != ChatType.Group)
            {
                throw new InvalidOperationException("Group chat not found.");
            }

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            if (user == null)
            {
                throw new InvalidOperationException("User not found.");
            }

            if (chat.Members.Any(m => m.UserId == request.UserId))
            {
                throw new InvalidOperationException("User is already a member of this group.");
            }

            if (chat.Members.Count >= 50)
            {
                throw new InvalidOperationException("Group is already at maximum capacity.");
            }

            var newMember = new ChatMember
            {
                ChatId = chat.Id,
                UserId = request.UserId,
                Role = MemberRole.Member,
                JoinedAt = DateTimeOffset.UtcNow
            };

            _context.ChatMembers.Add(newMember);
            await _context.SaveChangesAsync(cancellationToken);

            // Notify all members including the new one
            var allMemberIds = chat.Members.Select(m => m.UserId).Append(request.UserId).Distinct().ToList();
            await _signalRNotifier.NotifyChatCreatedAsync(chat.Id, allMemberIds);

            return new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Bio = user.Bio,
                AvatarUrl = user.AvatarUrl,
                IsOnline = user.IsOnline,
                LastSeenAt = user.LastSeenAt
            };
        }

        // 3. Remove Group Member
        public async Task<bool> Handle(RemoveGroupMemberCommand request, CancellationToken cancellationToken)
        {
            var chat = await _context.Chats
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == request.ChatId, cancellationToken);

            if (chat == null || chat.Type != ChatType.Group)
            {
                throw new InvalidOperationException("Group chat not found.");
            }

            var member = chat.Members.FirstOrDefault(m => m.UserId == request.UserId);
            if (member == null)
            {
                throw new InvalidOperationException("User is not a member of this group.");
            }

            _context.ChatMembers.Remove(member);
            await _context.SaveChangesAsync(cancellationToken);

            // Notify members (both existing ones and the removed one to remove it from their home list)
            var allMemberIds = chat.Members.Select(m => m.UserId).Append(request.UserId).Distinct().ToList();
            await _signalRNotifier.NotifyChatCreatedAsync(chat.Id, allMemberIds);

            return true;
        }

        // 4. Delete Group
        public async Task<bool> Handle(DeleteGroupCommand request, CancellationToken cancellationToken)
        {
            var chat = await _context.Chats
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == request.ChatId, cancellationToken);

            if (chat == null || chat.Type != ChatType.Group)
            {
                throw new InvalidOperationException("Group chat not found.");
            }

            var memberGuids = chat.Members.Select(m => m.UserId).ToList();

            _context.Chats.Remove(chat);
            await _context.SaveChangesAsync(cancellationToken);

            // Notify members that the chat was deleted so they can refresh their chat lists
            await _signalRNotifier.NotifyChatCreatedAsync(request.ChatId, memberGuids);

            return true;
        }
    }
}

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;
using NexusChat.Domain.Enums;

namespace NexusChat.Application.Features.Chats
{
    public record GetUserChatsQuery(Guid UserId, string Filter = "All") : IRequest<List<ChatDto>>;

    public class GetUserChatsQueryHandler : IRequestHandler<GetUserChatsQuery, List<ChatDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetUserChatsQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<ChatDto>> Handle(GetUserChatsQuery request, CancellationToken cancellationToken)
        {
            // 1. Fetch chat memberships for user
            var memberships = await _context.ChatMembers
                .Include(cm => cm.Chat)
                .Where(cm => cm.UserId == request.UserId)
                .ToListAsync(cancellationToken);

            // 2. Apply Filters: All, Unread, Favourite, Groups
            var filterLower = request.Filter.Trim().ToLower();
            if (filterLower == "unread")
            {
                memberships = memberships.Where(cm => cm.UnreadCount > 0).ToList();
            }
            else if (filterLower == "favourite" || filterLower == "favorite")
            {
                memberships = memberships.Where(cm => cm.IsFavourite).ToList();
            }
            else if (filterLower == "groups" || filterLower == "group")
            {
                memberships = memberships.Where(cm => cm.Chat.Type == ChatType.Group).ToList();
            }

            memberships = memberships.OrderByDescending(cm => cm.Chat.LastMessageAt).ToList();

            var result = new List<ChatDto>();

            foreach (var cm in memberships)
            {
                var chatId = cm.ChatId;
                var chat = cm.Chat;

                // Load chat members
                var allMembers = await _context.ChatMembers
                    .Include(m => m.User)
                    .Where(m => m.ChatId == chatId)
                    .ToListAsync(cancellationToken);

                // Load last message respecting ClearedAt and soft-deletes
                var lastMsgQuery = _context.Messages
                    .AsNoTracking()
                    .Where(m => m.ChatId == chatId);

                if (cm.ClearedAt.HasValue)
                {
                    lastMsgQuery = lastMsgQuery.Where(m => m.SentAt > cm.ClearedAt.Value);
                }

                lastMsgQuery = lastMsgQuery.Where(m => !_context.UserDeletedMessages.Any(udm => udm.MessageId == m.Id && udm.UserId == request.UserId));

                var lastMsg = await lastMsgQuery
                    .OrderByDescending(m => m.SentAt)
                    .FirstOrDefaultAsync(cancellationToken);

                // If chat was cleared and has no new messages, hide it from the user's list
                if (cm.ClearedAt.HasValue && lastMsg == null)
                {
                    continue;
                }

                string? displayName = chat.Name;
                string? displayAvatar = chat.ImageUrl;

                if (chat.Type == ChatType.Direct)
                {
                    var otherMember = allMembers.FirstOrDefault(m => m.UserId != request.UserId)?.User;
                    if (otherMember != null)
                    {
                        displayName = otherMember.FullName;
                        displayAvatar = otherMember.AvatarUrl;
                    }
                }

                result.Add(new ChatDto
                {
                    Id = chat.Id,
                    Type = chat.Type,
                    Name = displayName,
                    ImageUrl = displayAvatar,
                    LastMessageAt = chat.LastMessageAt,
                    IsFavourite = cm.IsFavourite,
                    IsPinned = cm.IsPinned,
                    IsArchived = cm.IsArchived,
                    UnreadCount = cm.UnreadCount,
                    LastMessage = lastMsg == null ? null : new MessageDto
                    {
                        Id = lastMsg.Id,
                        ChatId = lastMsg.ChatId,
                        SenderId = lastMsg.SenderId,
                        Content = lastMsg.Content,
                        MessageType = lastMsg.MessageType,
                        SentAt = lastMsg.SentAt,
                        ReadAt = lastMsg.ReadAt
                    },
                    Members = allMembers.Select(m => new UserDto
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
                });
            }

            return result;
        }
    }
}

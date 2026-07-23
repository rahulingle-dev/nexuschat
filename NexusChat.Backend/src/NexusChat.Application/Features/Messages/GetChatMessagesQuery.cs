using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;

namespace NexusChat.Application.Features.Messages
{
    public record GetChatMessagesQuery(Guid ChatId, Guid? UserId = null, int Skip = 0, int Take = 50) : IRequest<List<MessageDto>>;

    public class GetChatMessagesQueryHandler : IRequestHandler<GetChatMessagesQuery, List<MessageDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetChatMessagesQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<MessageDto>> Handle(GetChatMessagesQuery request, CancellationToken cancellationToken)
        {
            var query = _context.Messages
                .AsNoTracking()
                .Include(m => m.Sender)
                .Where(m => m.ChatId == request.ChatId);

            if (request.UserId.HasValue)
            {
                var member = await _context.ChatMembers
                    .FirstOrDefaultAsync(cm => cm.ChatId == request.ChatId && cm.UserId == request.UserId.Value, cancellationToken);

                if (member != null)
                {
                    if (member.ClearedAt.HasValue)
                    {
                        query = query.Where(m => m.SentAt > member.ClearedAt.Value);
                    }

                    query = query.Where(m => !_context.UserDeletedMessages.Any(udm => udm.MessageId == m.Id && udm.UserId == request.UserId.Value));
                }
            }

            var messages = await query
                .OrderByDescending(m => m.SentAt)
                .Skip(request.Skip)
                .Take(request.Take)
                .Select(m => new MessageDto
                {
                    Id = m.Id,
                    ChatId = m.ChatId,
                    SenderId = m.SenderId,
                    SenderUsername = m.Sender.Username,
                    SenderFullName = m.Sender.FullName,
                    SenderAvatarUrl = m.Sender.AvatarUrl,
                    Content = m.Content,
                    MessageType = m.MessageType,
                    FileUrl = m.FileUrl,
                    FileName = m.FileName,
                    FileSize = m.FileSize,
                    SentAt = m.SentAt,
                    DeliveredAt = m.DeliveredAt,
                    ReadAt = m.ReadAt,
                    IsForwarded = m.IsForwarded,
                    ForwardedFromMessageId = m.ForwardedFromMessageId
                })
                .ToListAsync(cancellationToken);

            messages.Reverse();
            return messages;
        }
    }
}

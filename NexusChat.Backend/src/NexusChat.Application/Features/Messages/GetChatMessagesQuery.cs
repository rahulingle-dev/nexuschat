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
    public record GetChatMessagesQuery(Guid ChatId, int Skip = 0, int Take = 50) : IRequest<List<MessageDto>>;

    public class GetChatMessagesQueryHandler : IRequestHandler<GetChatMessagesQuery, List<MessageDto>>
    {
        private readonly IApplicationDbContext _context;

        public GetChatMessagesQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<MessageDto>> Handle(GetChatMessagesQuery request, CancellationToken cancellationToken)
        {
            var messages = await _context.Messages
                .AsNoTracking()
                .Include(m => m.Sender)
                .Where(m => m.ChatId == request.ChatId)
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
                    ReadAt = m.ReadAt
                })
                .ToListAsync(cancellationToken);

            messages.Reverse();
            return messages;
        }
    }
}

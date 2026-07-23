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

namespace NexusChat.Application.Features.Messages
{
    public record ForwardMessagesCommand(
        List<Guid> MessageIds, 
        List<Guid> TargetChatIds, 
        Guid UserId
    ) : IRequest<List<MessageDto>>;

    public class ForwardMessagesCommandHandler : IRequestHandler<ForwardMessagesCommand, List<MessageDto>>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotifier _signalRNotifier;

        public ForwardMessagesCommandHandler(IApplicationDbContext context, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _signalRNotifier = signalRNotifier;
        }

        public async Task<List<MessageDto>> Handle(ForwardMessagesCommand request, CancellationToken cancellationToken)
        {
            if (request.MessageIds == null || !request.MessageIds.Any() || request.TargetChatIds == null || !request.TargetChatIds.Any())
            {
                return new List<MessageDto>();
            }

            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            if (sender == null)
            {
                throw new InvalidOperationException("Sender user not found.");
            }

            var originalMessages = await _context.Messages
                .Where(m => request.MessageIds.Contains(m.Id))
                .ToListAsync(cancellationToken);

            if (!originalMessages.Any())
            {
                throw new InvalidOperationException("No original messages found to forward.");
            }

            var chats = await _context.Chats
                .Include(c => c.Members)
                .Where(c => request.TargetChatIds.Contains(c.Id))
                .ToListAsync(cancellationToken);

            var forwardedMessagesDto = new List<MessageDto>();

            foreach (var chat in chats)
            {
                foreach (var origMsg in originalMessages)
                {
                    var newMsg = new Message
                    {
                        ChatId = chat.Id,
                        SenderId = request.UserId,
                        Content = origMsg.Content,
                        MessageType = origMsg.MessageType,
                        FileUrl = origMsg.FileUrl,
                        FileName = origMsg.FileName,
                        FileSize = origMsg.FileSize,
                        SentAt = DateTimeOffset.UtcNow,
                        IsForwarded = true,
                        ForwardedFromMessageId = origMsg.Id
                    };

                    _context.Messages.Add(newMsg);
                    chat.LastMessageAt = newMsg.SentAt;

                    foreach (var member in chat.Members.Where(m => m.UserId != request.UserId))
                    {
                        member.UnreadCount += 1;
                    }

                    await _context.SaveChangesAsync(cancellationToken);

                    var dto = new MessageDto
                    {
                        Id = newMsg.Id,
                        ChatId = newMsg.ChatId,
                        SenderId = newMsg.SenderId,
                        SenderUsername = sender.Username,
                        SenderFullName = sender.FullName,
                        SenderAvatarUrl = sender.AvatarUrl,
                        Content = newMsg.Content,
                        MessageType = newMsg.MessageType,
                        FileUrl = newMsg.FileUrl,
                        FileName = newMsg.FileName,
                        FileSize = newMsg.FileSize,
                        SentAt = newMsg.SentAt,
                        IsForwarded = newMsg.IsForwarded,
                        ForwardedFromMessageId = newMsg.ForwardedFromMessageId
                    };

                    forwardedMessagesDto.Add(dto);

                    await _signalRNotifier.NotifyNewMessageAsync(chat.Id, dto);
                }
            }

            return forwardedMessagesDto;
        }
    }
}

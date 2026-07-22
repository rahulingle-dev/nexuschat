using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;
using NexusChat.Domain.Entities;
using NexusChat.Domain.Enums;

namespace NexusChat.Application.Features.Messages
{
    public record SendMessageCommand(
        Guid ChatId,
        Guid SenderId,
        string? Content,
        MessageType MessageType = MessageType.Text,
        string? FileUrl = null,
        string? FileName = null,
        long? FileSize = null
    ) : IRequest<MessageDto>;

    public class SendMessageCommandHandler : IRequestHandler<SendMessageCommand, MessageDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotifier _signalRNotifier;

        public SendMessageCommandHandler(IApplicationDbContext context, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _signalRNotifier = signalRNotifier;
        }

        public async Task<MessageDto> Handle(SendMessageCommand request, CancellationToken cancellationToken)
        {
            var sender = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.SenderId, cancellationToken);
            if (sender == null)
            {
                throw new InvalidOperationException("Sender user not found.");
            }

            var chat = await _context.Chats
                .Include(c => c.Members)
                .FirstOrDefaultAsync(c => c.Id == request.ChatId, cancellationToken);

            if (chat == null)
            {
                throw new InvalidOperationException("Target chat not found.");
            }

            var message = new Message
            {
                ChatId = request.ChatId,
                SenderId = request.SenderId,
                Content = request.Content,
                MessageType = request.MessageType,
                FileUrl = request.FileUrl,
                FileName = request.FileName,
                FileSize = request.FileSize,
                SentAt = DateTimeOffset.UtcNow
            };

            _context.Messages.Add(message);
            chat.LastMessageAt = message.SentAt;

            foreach (var member in chat.Members.Where(m => m.UserId != request.SenderId))
            {
                member.UnreadCount += 1;
            }

            await _context.SaveChangesAsync(cancellationToken);

            var messageDto = new MessageDto
            {
                Id = message.Id,
                ChatId = message.ChatId,
                SenderId = message.SenderId,
                SenderUsername = sender.Username,
                SenderFullName = sender.FullName,
                SenderAvatarUrl = sender.AvatarUrl,
                Content = message.Content,
                MessageType = message.MessageType,
                FileUrl = message.FileUrl,
                FileName = message.FileName,
                FileSize = message.FileSize,
                SentAt = message.SentAt
            };

            await _signalRNotifier.NotifyNewMessageAsync(chat.Id, messageDto);

            return messageDto;
        }
    }
}

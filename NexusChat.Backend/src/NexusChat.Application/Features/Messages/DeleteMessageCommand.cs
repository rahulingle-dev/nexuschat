using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;

namespace NexusChat.Application.Features.Messages
{
    public record DeleteMessageCommand(Guid MessageId, Guid UserId) : IRequest<bool>;

    public class DeleteMessageCommandHandler : IRequestHandler<DeleteMessageCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotifier _signalRNotifier;

        public DeleteMessageCommandHandler(IApplicationDbContext context, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _signalRNotifier = signalRNotifier;
        }

        public async Task<bool> Handle(DeleteMessageCommand request, CancellationToken cancellationToken)
        {
            var message = await _context.Messages
                .FirstOrDefaultAsync(m => m.Id == request.MessageId, cancellationToken);

            if (message == null)
            {
                throw new InvalidOperationException("Message not found.");
            }

            if (message.SenderId != request.UserId)
            {
                throw new InvalidOperationException("You can only delete messages sent by you.");
            }

            var chatId = message.ChatId;
            _context.Messages.Remove(message);

            // Also check if this was the last message of the chat, update the chat's last message if needed
            var chat = await _context.Chats
                .FirstOrDefaultAsync(c => c.Id == chatId, cancellationToken);

            await _context.SaveChangesAsync(cancellationToken);

            // Notify clients via SignalR
            await _signalRNotifier.NotifyMessageDeletedAsync(chatId, request.MessageId);

            return true;
        }
    }
}

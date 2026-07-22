using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;

namespace NexusChat.Application.Features.Chats
{
    public record ClearChatCommand(Guid ChatId, Guid UserId) : IRequest<bool>;

    public class ClearChatCommandHandler : IRequestHandler<ClearChatCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotifier _signalRNotifier;

        public ClearChatCommandHandler(IApplicationDbContext context, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _signalRNotifier = signalRNotifier;
        }

        public async Task<bool> Handle(ClearChatCommand request, CancellationToken cancellationToken)
        {
            // Verify membership
            var membership = await _context.ChatMembers
                .FirstOrDefaultAsync(cm => cm.ChatId == request.ChatId && cm.UserId == request.UserId, cancellationToken);

            if (membership == null)
            {
                throw new InvalidOperationException("You are not a member of this chat.");
            }

            // Retrieve all messages in this chat
            var messages = await _context.Messages
                .Where(m => m.ChatId == request.ChatId)
                .ToListAsync(cancellationToken);

            _context.Messages.RemoveRange(messages);

            // Reset unread count for members
            var members = await _context.ChatMembers
                .Where(cm => cm.ChatId == request.ChatId)
                .ToListAsync(cancellationToken);

            foreach (var member in members)
            {
                member.UnreadCount = 0;
            }

            await _context.SaveChangesAsync(cancellationToken);

            // Notify all clients in the chat group
            await _signalRNotifier.NotifyChatClearedAsync(request.ChatId);

            return true;
        }
    }
}

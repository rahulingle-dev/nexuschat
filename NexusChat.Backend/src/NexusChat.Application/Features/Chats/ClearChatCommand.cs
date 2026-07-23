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

            // Set ClearedAt for this member (soft delete from my side)
            membership.ClearedAt = DateTimeOffset.UtcNow;
            membership.UnreadCount = 0;

            await _context.SaveChangesAsync(cancellationToken);

            // Notify only this client via SignalR
            await _signalRNotifier.NotifyChatClearedAsync(request.ChatId, request.UserId);

            return true;
        }
    }
}

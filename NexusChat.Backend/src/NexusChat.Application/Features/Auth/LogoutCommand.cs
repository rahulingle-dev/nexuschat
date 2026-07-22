using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;

namespace NexusChat.Application.Features.Auth
{
    public record LogoutCommand(Guid UserId) : IRequest<bool>;

    public class LogoutCommandHandler : IRequestHandler<LogoutCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotifier _signalRNotifier;

        public LogoutCommandHandler(IApplicationDbContext context, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _signalRNotifier = signalRNotifier;
        }

        public async Task<bool> Handle(LogoutCommand request, CancellationToken cancellationToken)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            if (user == null)
            {
                return false;
            }

            user.IsOnline = false;
            user.LastSeenAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            // Notify all clients in real-time that the user has gone offline
            await _signalRNotifier.NotifyUserPresenceAsync(user.Id, false);

            return true;
        }
    }
}

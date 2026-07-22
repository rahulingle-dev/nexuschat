using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;

namespace NexusChat.Application.Features.Messages
{
    public record MarkAsReadCommand(Guid ChatId, Guid UserId) : IRequest<bool>;

    public class MarkAsReadCommandHandler : IRequestHandler<MarkAsReadCommand, bool>
    {
        private readonly IApplicationDbContext _context;

        public MarkAsReadCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(MarkAsReadCommand request, CancellationToken cancellationToken)
        {
            // Reset unread count for chat member
            var member = await _context.ChatMembers
                .FirstOrDefaultAsync(m => m.ChatId == request.ChatId && m.UserId == request.UserId, cancellationToken);

            if (member != null)
            {
                member.UnreadCount = 0;
            }

            // Mark unread messages as read
            var unreadMessages = await _context.Messages
                .Where(m => m.ChatId == request.ChatId && m.SenderId != request.UserId && m.ReadAt == null)
                .ToListAsync(cancellationToken);

            var now = DateTimeOffset.UtcNow;
            foreach (var msg in unreadMessages)
            {
                msg.ReadAt = now;
            }

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}

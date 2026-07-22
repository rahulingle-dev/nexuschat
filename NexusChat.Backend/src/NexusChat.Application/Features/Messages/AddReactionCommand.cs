using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Domain.Entities;

namespace NexusChat.Application.Features.Messages
{
    public record AddReactionCommand(Guid MessageId, Guid UserId, string Emoji) : IRequest<bool>;

    public class AddReactionCommandHandler : IRequestHandler<AddReactionCommand, bool>
    {
        private readonly IApplicationDbContext _context;

        public AddReactionCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(AddReactionCommand request, CancellationToken cancellationToken)
        {
            var existingReaction = await _context.MessageReactions
                .FirstOrDefaultAsync(r => r.MessageId == request.MessageId && r.UserId == request.UserId && r.Emoji == request.Emoji, cancellationToken);

            if (existingReaction != null)
            {
                _context.MessageReactions.Remove(existingReaction);
            }
            else
            {
                _context.MessageReactions.Add(new MessageReaction
                {
                    MessageId = request.MessageId,
                    UserId = request.UserId,
                    Emoji = request.Emoji
                });
            }

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}

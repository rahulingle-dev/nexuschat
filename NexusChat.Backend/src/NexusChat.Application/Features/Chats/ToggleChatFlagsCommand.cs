using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;

namespace NexusChat.Application.Features.Chats
{
    public record ToggleChatFlagsCommand(Guid ChatId, Guid UserId, string FlagType) : IRequest<bool>;

    public class ToggleChatFlagsCommandHandler : IRequestHandler<ToggleChatFlagsCommand, bool>
    {
        private readonly IApplicationDbContext _context;

        public ToggleChatFlagsCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(ToggleChatFlagsCommand request, CancellationToken cancellationToken)
        {
            var member = await _context.ChatMembers
                .FirstOrDefaultAsync(m => m.ChatId == request.ChatId && m.UserId == request.UserId, cancellationToken);

            if (member == null)
            {
                throw new InvalidOperationException("Chat membership not found.");
            }

            switch (request.FlagType.Trim().ToLower())
            {
                case "favourite":
                case "favorite":
                    member.IsFavourite = !member.IsFavourite;
                    break;
                case "pin":
                case "pinned":
                    member.IsPinned = !member.IsPinned;
                    break;
                case "archive":
                case "archived":
                    member.IsArchived = !member.IsArchived;
                    break;
            }

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
    }
}

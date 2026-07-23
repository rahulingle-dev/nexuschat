using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Domain.Entities;

namespace NexusChat.Application.Features.Messages
{
    public record DeleteMessagesCommand(List<Guid> MessageIds, Guid UserId, bool DeleteForEveryone) : IRequest<bool>;

    public class DeleteMessagesCommandHandler : IRequestHandler<DeleteMessagesCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotifier _signalRNotifier;

        public DeleteMessagesCommandHandler(IApplicationDbContext context, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _signalRNotifier = signalRNotifier;
        }

        public async Task<bool> Handle(DeleteMessagesCommand request, CancellationToken cancellationToken)
        {
            if (request.MessageIds == null || !request.MessageIds.Any())
            {
                return false;
            }

            var messages = await _context.Messages
                .Where(m => request.MessageIds.Contains(m.Id))
                .ToListAsync(cancellationToken);

            if (!messages.Any())
            {
                throw new InvalidOperationException("No messages found.");
            }

            if (request.DeleteForEveryone)
            {
                // Validate that the requesting user is the sender of all selected messages
                if (messages.Any(m => m.SenderId != request.UserId))
                {
                    throw new InvalidOperationException("You can only delete messages sent by you for everyone.");
                }

                var chatGroups = messages.GroupBy(m => m.ChatId);

                _context.Messages.RemoveRange(messages);
                await _context.SaveChangesAsync(cancellationToken);

                // Notify clients via SignalR
                foreach (var group in chatGroups)
                {
                    foreach (var msg in group)
                    {
                        await _signalRNotifier.NotifyMessageDeletedAsync(group.Key, msg.Id);
                    }
                }
            }
            else
            {
                // Delete for me (soft delete)
                var alreadyDeleted = await _context.UserDeletedMessages
                    .Where(udm => udm.UserId == request.UserId && request.MessageIds.Contains(udm.MessageId))
                    .Select(udm => udm.MessageId)
                    .ToListAsync(cancellationToken);

                foreach (var msgId in request.MessageIds)
                {
                    if (!alreadyDeleted.Contains(msgId))
                    {
                        _context.UserDeletedMessages.Add(new UserDeletedMessage
                        {
                            MessageId = msgId,
                            UserId = request.UserId
                        });
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);
            }

            return true;
        }
    }
}

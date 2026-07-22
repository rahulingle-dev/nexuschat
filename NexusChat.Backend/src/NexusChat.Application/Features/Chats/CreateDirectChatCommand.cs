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
using NexusChat.Domain.Enums;

namespace NexusChat.Application.Features.Chats
{
    public record CreateDirectChatCommand(Guid User1Id, Guid User2Id) : IRequest<ChatDto>;

    public class CreateDirectChatCommandHandler : IRequestHandler<CreateDirectChatCommand, ChatDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly ISignalRNotifier _signalRNotifier;

        public CreateDirectChatCommandHandler(IApplicationDbContext context, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _signalRNotifier = signalRNotifier;
        }

        public async Task<ChatDto> Handle(CreateDirectChatCommand request, CancellationToken cancellationToken)
        {
            var existingChat = await _context.Chats
                .Include(c => c.Members)
                .Where(c => c.Type == ChatType.Direct)
                .FirstOrDefaultAsync(c =>
                    c.Members.Any(m => m.UserId == request.User1Id) &&
                    c.Members.Any(m => m.UserId == request.User2Id), cancellationToken);

            if (existingChat != null)
            {
                return new ChatDto
                {
                    Id = existingChat.Id,
                    Type = existingChat.Type,
                    Name = existingChat.Name,
                    LastMessageAt = existingChat.LastMessageAt
                };
            }

            var newChat = new Chat
            {
                Type = ChatType.Direct,
                LastMessageAt = DateTimeOffset.UtcNow
            };

            _context.Chats.Add(newChat);

            _context.ChatMembers.Add(new ChatMember { ChatId = newChat.Id, UserId = request.User1Id });
            _context.ChatMembers.Add(new ChatMember { ChatId = newChat.Id, UserId = request.User2Id });

            await _context.SaveChangesAsync(cancellationToken);

            await _signalRNotifier.NotifyChatCreatedAsync(newChat.Id, new List<Guid> { request.User1Id, request.User2Id });

            return new ChatDto
            {
                Id = newChat.Id,
                Type = newChat.Type,
                Name = newChat.Name,
                LastMessageAt = newChat.LastMessageAt
            };
        }
    }
}

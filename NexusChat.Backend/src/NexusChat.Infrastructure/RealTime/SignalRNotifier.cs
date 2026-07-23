using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;

namespace NexusChat.Infrastructure.RealTime
{
    public class SignalRNotifier : ISignalRNotifier
    {
        private readonly IHubContext<ChatHub> _chatHubContext;
        private readonly IApplicationDbContext _context;

        public SignalRNotifier(IHubContext<ChatHub> chatHubContext, IApplicationDbContext context)
        {
            _chatHubContext = chatHubContext;
            _context = context;
        }

        public async Task NotifyNewMessageAsync(Guid chatId, MessageDto message)
        {
            // Send the new message to anyone currently viewing the chat (who joined the chat group)
            await _chatHubContext.Clients.Group($"chat_{chatId}").SendAsync("ReceiveMessage", message);

            // Fetch member user IDs for this chat as Guids
            var memberGuids = await _context.ChatMembers
                .Where(cm => cm.ChatId == chatId)
                .Select(cm => cm.UserId)
                .ToListAsync();

            // Convert to lowercase strings in memory to ensure case consistency with SignalR user IDs
            var memberIds = memberGuids.Select(id => id.ToString().ToLower()).ToList();

            // Send ChatUpdated to the specific user connections for all members of the chat
            await _chatHubContext.Clients.Users(memberIds).SendAsync("ChatUpdated", chatId, message);

            // Fallback: Send to the user-specific group as well
            foreach (var userId in memberIds)
            {
                await _chatHubContext.Clients.Group($"user_{userId}").SendAsync("ChatUpdated", chatId, message);
            }
        }

        public async Task NotifyChatCreatedAsync(Guid chatId, List<Guid> memberIds)
        {
            var memberIdStrings = memberIds.Select(id => id.ToString().ToLower()).ToList();
            await _chatHubContext.Clients.Users(memberIdStrings).SendAsync("ChatCreated", chatId);

            // Fallback: Send to the user-specific group as well
            foreach (var userId in memberIdStrings)
            {
                await _chatHubContext.Clients.Group($"user_{userId}").SendAsync("ChatCreated", chatId);
            }
        }

        public async Task NotifyUserTypingAsync(Guid chatId, Guid userId, string username)
        {
            await _chatHubContext.Clients.Group($"chat_{chatId}").SendAsync("UserTyping", chatId, username);
        }

        public async Task NotifyUserPresenceAsync(Guid userId, bool isOnline)
        {
            await _chatHubContext.Clients.All.SendAsync("UserPresenceChanged", userId, isOnline);
        }

        public async Task NotifyMessageDeletedAsync(Guid chatId, Guid messageId)
        {
            await _chatHubContext.Clients.Group($"chat_{chatId}").SendAsync("MessageDeleted", chatId.ToString(), messageId.ToString());
        }

        public async Task NotifyChatClearedAsync(Guid chatId, Guid? userId = null)
        {
            if (userId.HasValue)
            {
                var userIdStr = userId.Value.ToString().ToLower();
                await _chatHubContext.Clients.User(userIdStr).SendAsync("ChatCleared", chatId.ToString());
                await _chatHubContext.Clients.Group($"user_{userIdStr}").SendAsync("ChatCleared", chatId.ToString());
            }
            else
            {
                await _chatHubContext.Clients.Group($"chat_{chatId}").SendAsync("ChatCleared", chatId.ToString());
            }
        }
    }
}

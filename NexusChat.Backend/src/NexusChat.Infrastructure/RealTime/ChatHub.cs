using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace NexusChat.Infrastructure.RealTime
{
    public class ChatHub : Hub
    {
        public async Task JoinChatGroup(string chatId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"chat_{chatId}");
        }

        public async Task LeaveChatGroup(string chatId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"chat_{chatId}");
        }

        public async Task JoinUserGroup(string userId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userId}");
        }

        public async Task SendTypingIndicator(string chatId, string username)
        {
            await Clients.Group($"chat_{chatId}").SendAsync("UserTyping", chatId, username);
        }

        public async Task SendCallOffer(string targetUserId, string callerId, string callerName, bool isVideo)
        {
            await Clients.All.SendAsync("IncomingCall", targetUserId, callerId, callerName, isVideo);
        }

        public async Task AcceptCall(string callerId, string receiverId)
        {
            await Clients.All.SendAsync("CallAccepted", callerId, receiverId);
        }

        public async Task RejectCall(string callerId, string receiverId)
        {
            await Clients.All.SendAsync("CallRejected", callerId, receiverId);
        }

        public async Task EndCall(string targetUserId, string senderId)
        {
            await Clients.All.SendAsync("CallEnded", targetUserId, senderId);
        }

        public async Task SendSignalingMessage(string targetUserId, string senderId, string messageType, string payload)
        {
            await Clients.Group($"user_{targetUserId}").SendAsync("SignalingMessageReceived", senderId, messageType, payload);
        }
    }
}

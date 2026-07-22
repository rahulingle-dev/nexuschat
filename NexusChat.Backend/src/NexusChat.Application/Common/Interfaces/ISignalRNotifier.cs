using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using NexusChat.Application.DTOs;

namespace NexusChat.Application.Common.Interfaces
{
    public interface ISignalRNotifier
    {
        Task NotifyNewMessageAsync(Guid chatId, MessageDto message);
        Task NotifyChatCreatedAsync(Guid chatId, List<Guid> memberIds);
        Task NotifyUserTypingAsync(Guid chatId, Guid userId, string username);
        Task NotifyUserPresenceAsync(Guid userId, bool isOnline);
        Task NotifyMessageDeletedAsync(Guid chatId, Guid messageId);
        Task NotifyChatClearedAsync(Guid chatId);
    }
}

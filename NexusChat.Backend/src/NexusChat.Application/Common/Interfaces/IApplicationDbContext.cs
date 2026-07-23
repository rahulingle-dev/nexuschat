using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using NexusChat.Domain.Entities;

namespace NexusChat.Application.Common.Interfaces
{
    public interface IApplicationDbContext
    {
        DbSet<User> Users { get; }
        DbSet<Chat> Chats { get; }
        DbSet<ChatMember> ChatMembers { get; }
        DbSet<Message> Messages { get; }
        DbSet<MessageReaction> MessageReactions { get; }
        DbSet<CallLog> CallLogs { get; }
        DbSet<OtpVerification> OtpVerifications { get; }
        DbSet<UserDeletedMessage> UserDeletedMessages { get; }

        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}

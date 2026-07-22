using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Domain.Entities;

namespace NexusChat.Infrastructure.Persistence
{
    public class ApplicationDbContext : DbContext, IApplicationDbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Chat> Chats => Set<Chat>();
        public DbSet<ChatMember> ChatMembers => Set<ChatMember>();
        public DbSet<Message> Messages => Set<Message>();
        public DbSet<MessageReaction> MessageReactions => Set<MessageReaction>();
        public DbSet<CallLog> CallLogs => Set<CallLog>();
        public DbSet<OtpVerification> OtpVerifications => Set<OtpVerification>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // User Configurations
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(u => u.Id);
                entity.HasIndex(u => u.Username).IsUnique();
                entity.HasIndex(u => u.Email).IsUnique();
                entity.Property(u => u.Username).HasMaxLength(50).IsRequired();
                entity.Property(u => u.Email).HasMaxLength(100).IsRequired();
                entity.Property(u => u.FullName).HasMaxLength(100).IsRequired();
            });

            // Chat Configurations
            modelBuilder.Entity<Chat>(entity =>
            {
                entity.HasKey(c => c.Id);
                entity.Property(c => c.Name).HasMaxLength(100);
            });

            // ChatMember Configurations
            modelBuilder.Entity<ChatMember>(entity =>
            {
                entity.HasKey(cm => cm.Id);
                entity.HasOne(cm => cm.Chat)
                      .WithMany(c => c.Members)
                      .HasForeignKey(cm => cm.ChatId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(cm => cm.User)
                      .WithMany(u => u.ChatMemberships)
                      .HasForeignKey(cm => cm.UserId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(cm => new { cm.UserId, cm.ChatId }).IsUnique();
            });

            // Message Configurations
            modelBuilder.Entity<Message>(entity =>
            {
                entity.HasKey(m => m.Id);
                entity.HasOne(m => m.Chat)
                      .WithMany(c => c.Messages)
                      .HasForeignKey(m => m.ChatId)
                      .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(m => m.Sender)
                      .WithMany(u => u.SentMessages)
                      .HasForeignKey(m => m.SenderId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasIndex(m => new { m.ChatId, m.SentAt });
            });

            // MessageReaction Configurations
            modelBuilder.Entity<MessageReaction>(entity =>
            {
                entity.HasKey(mr => mr.Id);
                entity.HasOne(mr => mr.Message)
                      .WithMany(m => m.Reactions)
                      .HasForeignKey(mr => mr.MessageId)
                      .OnDelete(DeleteBehavior.Cascade);
            });

            // CallLog Configurations
            modelBuilder.Entity<CallLog>(entity =>
            {
                entity.HasKey(cl => cl.Id);
                entity.HasOne(cl => cl.Caller)
                      .WithMany()
                      .HasForeignKey(cl => cl.CallerId)
                      .OnDelete(DeleteBehavior.Restrict);

                entity.HasOne(cl => cl.Receiver)
                      .WithMany()
                      .HasForeignKey(cl => cl.ReceiverId)
                      .OnDelete(DeleteBehavior.Restrict);
            });

            // OtpVerification Configurations
            modelBuilder.Entity<OtpVerification>(entity =>
            {
                entity.HasKey(o => o.Id);
                entity.HasIndex(o => new { o.Email, o.Purpose });
            });
        }
    }
}

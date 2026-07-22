using System;
using NexusChat.Domain.Common;
using NexusChat.Domain.Enums;

namespace NexusChat.Domain.Entities
{
    public class ChatMember : BaseEntity
    {
        public Guid ChatId { get; set; }
        public Chat Chat { get; set; } = null!;

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;

        public MemberRole Role { get; set; } = MemberRole.Member;
        public DateTimeOffset JoinedAt { get; set; } = DateTimeOffset.UtcNow;

        public bool IsFavourite { get; set; } = false;
        public bool IsArchived { get; set; } = false;
        public bool IsPinned { get; set; } = false;
        public int UnreadCount { get; set; } = 0;
    }
}

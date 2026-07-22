using System;
using System.Collections.Generic;
using NexusChat.Domain.Common;

namespace NexusChat.Domain.Entities
{
    public class User : BaseEntity
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string? PhoneNumber { get; set; }
        public string? Bio { get; set; }
        public string? AvatarUrl { get; set; }
        public bool IsEmailVerified { get; set; } = false;
        public bool IsOnline { get; set; } = false;
        public DateTimeOffset? LastSeenAt { get; set; }

        public ICollection<ChatMember> ChatMemberships { get; set; } = new List<ChatMember>();
        public ICollection<Message> SentMessages { get; set; } = new List<Message>();
    }
}

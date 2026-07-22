using System;
using System.Collections.Generic;
using NexusChat.Domain.Common;
using NexusChat.Domain.Enums;

namespace NexusChat.Domain.Entities
{
    public class Chat : BaseEntity
    {
        public ChatType Type { get; set; } = ChatType.Direct;
        public string? Name { get; set; }
        public string? ImageUrl { get; set; }
        public DateTimeOffset LastMessageAt { get; set; } = DateTimeOffset.UtcNow;

        public ICollection<ChatMember> Members { get; set; } = new List<ChatMember>();
        public ICollection<Message> Messages { get; set; } = new List<Message>();
    }
}

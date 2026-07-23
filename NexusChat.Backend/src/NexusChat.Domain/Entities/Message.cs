using System;
using System.Collections.Generic;
using NexusChat.Domain.Common;
using NexusChat.Domain.Enums;

namespace NexusChat.Domain.Entities
{
    public class Message : BaseEntity
    {
        public Guid ChatId { get; set; }
        public Chat Chat { get; set; } = null!;

        public Guid SenderId { get; set; }
        public User Sender { get; set; } = null!;

        public string? Content { get; set; }
        public MessageType MessageType { get; set; } = MessageType.Text;
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }

        public DateTimeOffset SentAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? DeliveredAt { get; set; }
        public DateTimeOffset? ReadAt { get; set; }
        
        public bool IsForwarded { get; set; } = false;
        public Guid? ForwardedFromMessageId { get; set; }

        public ICollection<MessageReaction> Reactions { get; set; } = new List<MessageReaction>();
    }
}

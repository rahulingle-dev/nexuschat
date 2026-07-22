using System;
using NexusChat.Domain.Common;
using NexusChat.Domain.Enums;

namespace NexusChat.Domain.Entities
{
    public class CallLog : BaseEntity
    {
        public Guid CallerId { get; set; }
        public User Caller { get; set; } = null!;

        public Guid ReceiverId { get; set; }
        public User Receiver { get; set; } = null!;

        public bool IsVideo { get; set; } = false;
        public CallStatus Status { get; set; } = CallStatus.Missed;
        public DateTimeOffset StartedAt { get; set; } = DateTimeOffset.UtcNow;
        public DateTimeOffset? EndedAt { get; set; }
    }
}

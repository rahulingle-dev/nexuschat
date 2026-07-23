using System;
using NexusChat.Domain.Common;

namespace NexusChat.Domain.Entities
{
    public class UserDeletedMessage : BaseEntity
    {
        public Guid MessageId { get; set; }
        public Message Message { get; set; } = null!;

        public Guid UserId { get; set; }
        public User User { get; set; } = null!;
    }
}

using System;
using NexusChat.Domain.Common;

namespace NexusChat.Domain.Entities
{
    public class OtpVerification : BaseEntity
    {
        public string Email { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
        public string Purpose { get; set; } = string.Empty; // "Register" or "ForgotPassword"
        public DateTimeOffset ExpiresAt { get; set; }
        public bool IsUsed { get; set; } = false;
    }
}

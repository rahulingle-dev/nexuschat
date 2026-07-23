using System;
using System.Collections.Generic;
using NexusChat.Domain.Enums;

namespace NexusChat.Application.DTOs
{
    public class ChatDto
    {
        public Guid Id { get; set; }
        public ChatType Type { get; set; }
        public string? Name { get; set; }
        public string? ImageUrl { get; set; }
        public DateTimeOffset LastMessageAt { get; set; }
        public bool IsFavourite { get; set; }
        public bool IsPinned { get; set; }
        public bool IsArchived { get; set; }
        public int UnreadCount { get; set; }
        public MessageDto? LastMessage { get; set; }
        public List<UserDto> Members { get; set; } = new List<UserDto>();
    }

    public class MessageDto
    {
        public Guid Id { get; set; }
        public Guid ChatId { get; set; }
        public Guid SenderId { get; set; }
        public string SenderUsername { get; set; } = string.Empty;
        public string SenderFullName { get; set; } = string.Empty;
        public string? SenderAvatarUrl { get; set; }
        public string? Content { get; set; }
        public MessageType MessageType { get; set; }
        public string? FileUrl { get; set; }
        public string? FileName { get; set; }
        public long? FileSize { get; set; }
        public DateTimeOffset SentAt { get; set; }
        public DateTimeOffset? DeliveredAt { get; set; }
        public DateTimeOffset? ReadAt { get; set; }
        public bool IsForwarded { get; set; }
        public Guid? ForwardedFromMessageId { get; set; }
    }
}

using NexusChat.Domain.Entities;

namespace NexusChat.Application.Common.Interfaces
{
    public interface IJwtTokenGenerator
    {
        string GenerateToken(User user);
    }
}

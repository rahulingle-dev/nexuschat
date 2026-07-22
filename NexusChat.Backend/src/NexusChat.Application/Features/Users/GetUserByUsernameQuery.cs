using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;

namespace NexusChat.Application.Features.Users
{
    public record GetUserByUsernameQuery(string Username) : IRequest<UserDto?>;

    public class GetUserByUsernameQueryHandler : IRequestHandler<GetUserByUsernameQuery, UserDto?>
    {
        private readonly IApplicationDbContext _context;

        public GetUserByUsernameQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<UserDto?> Handle(GetUserByUsernameQuery request, CancellationToken cancellationToken)
        {
            var cleanUsername = request.Username.Trim().ToLower().Replace("@", "");

            var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Username == cleanUsername, cancellationToken);
            if (user == null)
            {
                return null;
            }

            return new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                PhoneNumber = user.PhoneNumber,
                Bio = user.Bio,
                AvatarUrl = user.AvatarUrl,
                IsOnline = user.IsOnline,
                LastSeenAt = user.LastSeenAt
            };
        }
    }
}

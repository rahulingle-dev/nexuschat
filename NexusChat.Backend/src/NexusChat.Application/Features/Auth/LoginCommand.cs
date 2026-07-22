using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;

namespace NexusChat.Application.Features.Auth
{
    public class LoginCommand : IRequest<AuthResponseDto>
    {
        public string UsernameOrEmail { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly IJwtTokenGenerator _tokenGenerator;
        private readonly ISignalRNotifier _signalRNotifier;

        public LoginCommandHandler(IApplicationDbContext context, IJwtTokenGenerator tokenGenerator, ISignalRNotifier signalRNotifier)
        {
            _context = context;
            _tokenGenerator = tokenGenerator;
            _signalRNotifier = signalRNotifier;
        }

        public async Task<AuthResponseDto> Handle(LoginCommand request, CancellationToken cancellationToken)
        {
            var rawInput = request.UsernameOrEmail.Trim();
            var cleanUsername = rawInput.StartsWith("@") ? rawInput.Substring(1).ToLower() : rawInput.ToLower();
            var cleanEmail = rawInput.ToLower();

            var user = await _context.Users.FirstOrDefaultAsync(u =>
                u.Username.ToLower() == cleanUsername || u.Email.ToLower() == cleanEmail, cancellationToken);

            if (user == null)
            {
                throw new InvalidOperationException("Invalid username/email or password.");
            }

            var inputHash = HashPassword(request.Password);
            if (user.PasswordHash != inputHash)
            {
                throw new InvalidOperationException("Invalid username/email or password.");
            }

            user.IsOnline = true;
            user.LastSeenAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

            // Notify presence
            await _signalRNotifier.NotifyUserPresenceAsync(user.Id, true);

            var token = _tokenGenerator.GenerateToken(user);
            var userDto = new UserDto
            {
                Id = user.Id,
                Username = user.Username,
                Email = user.Email,
                FullName = user.FullName,
                Bio = user.Bio,
                AvatarUrl = user.AvatarUrl,
                IsOnline = user.IsOnline,
                LastSeenAt = user.LastSeenAt
            };

            return new AuthResponseDto
            {
                Token = token,
                User = userDto
            };
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }
    }
}

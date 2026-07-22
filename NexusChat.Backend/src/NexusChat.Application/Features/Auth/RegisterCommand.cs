using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;
using NexusChat.Domain.Entities;

namespace NexusChat.Application.Features.Auth
{
    public class RegisterCommand : IRequest<AuthResponseDto>
    {
        public string Username { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
        public string? Bio { get; set; }
    }

    public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponseDto>
    {
        private readonly IApplicationDbContext _context;
        private readonly IJwtTokenGenerator _tokenGenerator;

        public RegisterCommandHandler(IApplicationDbContext context, IJwtTokenGenerator tokenGenerator)
        {
            _context = context;
            _tokenGenerator = tokenGenerator;
        }

        public async Task<AuthResponseDto> Handle(RegisterCommand request, CancellationToken cancellationToken)
        {
            var formattedUsername = request.Username.Trim().ToLower().Replace("@", "");
            var formattedEmail = request.Email.Trim().ToLower();

            var usernameExists = await _context.Users.AnyAsync(u => u.Username == formattedUsername, cancellationToken);
            if (usernameExists)
            {
                throw new InvalidOperationException($"Username '@{formattedUsername}' is already taken.");
            }

            var emailExists = await _context.Users.AnyAsync(u => u.Email == formattedEmail, cancellationToken);
            if (emailExists)
            {
                throw new InvalidOperationException($"Email '{formattedEmail}' is already registered.");
            }

            var validOtp = await _context.OtpVerifications.FirstOrDefaultAsync(o =>
                o.Email == formattedEmail &&
                o.OtpCode == request.OtpCode &&
                o.Purpose == "Register" &&
                !o.IsUsed &&
                o.ExpiresAt > DateTimeOffset.UtcNow, cancellationToken);

            if (validOtp == null)
            {
                throw new InvalidOperationException("Invalid or expired OTP code.");
            }

            validOtp.IsUsed = true;

            var user = new User
            {
                Username = formattedUsername,
                Email = formattedEmail,
                FullName = request.FullName.Trim(),
                PasswordHash = HashPassword(request.Password),
                Bio = request.Bio ?? "Hey there! I am using NexusChat.",
                IsEmailVerified = true,
                IsOnline = true,
                LastSeenAt = DateTimeOffset.UtcNow
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

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

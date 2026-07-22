using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;

namespace NexusChat.Application.Features.Auth
{
    public class ResetPasswordCommand : IRequest<bool>
    {
        public string Email { get; set; } = string.Empty;
        public string OtpCode { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    public class ResetPasswordCommandHandler : IRequestHandler<ResetPasswordCommand, bool>
    {
        private readonly IApplicationDbContext _context;

        public ResetPasswordCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<bool> Handle(ResetPasswordCommand request, CancellationToken cancellationToken)
        {
            var formattedEmail = request.Email.Trim().ToLower();

            var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == formattedEmail, cancellationToken);
            if (user == null)
            {
                throw new InvalidOperationException("No user found with this email address.");
            }

            var validOtp = await _context.OtpVerifications.FirstOrDefaultAsync(o =>
                o.Email == formattedEmail &&
                o.OtpCode == request.OtpCode &&
                o.Purpose == "ForgotPassword" &&
                !o.IsUsed &&
                o.ExpiresAt > DateTimeOffset.UtcNow, cancellationToken);

            if (validOtp == null)
            {
                throw new InvalidOperationException("Invalid or expired OTP code.");
            }

            validOtp.IsUsed = true;
            user.PasswordHash = HashPassword(request.NewPassword);
            user.UpdatedAt = DateTimeOffset.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        private static string HashPassword(string password)
        {
            using var sha256 = SHA256.Create();
            var bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
            return Convert.ToBase64String(bytes);
        }
    }
}

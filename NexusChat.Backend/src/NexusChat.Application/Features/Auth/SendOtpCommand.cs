using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Domain.Entities;

namespace NexusChat.Application.Features.Auth
{
    public class SendOtpCommand : IRequest<bool>
    {
        public string Email { get; set; } = string.Empty;
        public string Purpose { get; set; } = "Register";
    }

    public class SendOtpCommandHandler : IRequestHandler<SendOtpCommand, bool>
    {
        private readonly IApplicationDbContext _context;
        private readonly IEmailService _emailService;

        public SendOtpCommandHandler(IApplicationDbContext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        public async Task<bool> Handle(SendOtpCommand request, CancellationToken cancellationToken)
        {
            var random = new Random();
            var otpCode = random.Next(100000, 999999).ToString();

            var otpEntity = new OtpVerification
            {
                Email = request.Email.ToLower().Trim(),
                OtpCode = otpCode,
                Purpose = request.Purpose,
                ExpiresAt = DateTimeOffset.UtcNow.AddMinutes(10),
                IsUsed = false
            };

            _context.OtpVerifications.Add(otpEntity);
            await _context.SaveChangesAsync(cancellationToken);

            await _emailService.SendOtpEmailAsync(request.Email, otpCode, request.Purpose);
            return true;
        }
    }
}

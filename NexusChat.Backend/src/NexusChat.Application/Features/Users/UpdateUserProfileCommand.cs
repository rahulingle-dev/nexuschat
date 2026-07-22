using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;

namespace NexusChat.Application.Features.Users
{
    public record UpdateUserProfileCommand(
        Guid UserId,
        string FullName,
        string? Bio,
        string? AvatarUrl
    ) : IRequest<UserDto>;

    public class UpdateUserProfileCommandHandler : IRequestHandler<UpdateUserProfileCommand, UserDto>
    {
        private readonly IApplicationDbContext _context;

        public UpdateUserProfileCommandHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<UserDto> Handle(UpdateUserProfileCommand request, CancellationToken cancellationToken)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == request.UserId, cancellationToken);
            if (user == null)
            {
                throw new InvalidOperationException("User not found.");
            }

            if (string.IsNullOrWhiteSpace(request.FullName))
            {
                throw new InvalidOperationException("Full Name cannot be empty.");
            }

            user.FullName = request.FullName.Trim();
            user.Bio = request.Bio?.Trim();
            
            if (request.AvatarUrl != null)
            {
                user.AvatarUrl = string.IsNullOrWhiteSpace(request.AvatarUrl) ? null : request.AvatarUrl.Trim();
            }

            user.UpdatedAt = DateTimeOffset.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);

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

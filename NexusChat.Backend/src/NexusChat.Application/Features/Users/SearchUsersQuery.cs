using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Application.DTOs;

namespace NexusChat.Application.Features.Users
{
    public record SearchUsersQuery(string SearchQuery) : IRequest<List<UserDto>>;

    public class SearchUsersQueryHandler : IRequestHandler<SearchUsersQuery, List<UserDto>>
    {
        private readonly IApplicationDbContext _context;

        public SearchUsersQueryHandler(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<List<UserDto>> Handle(SearchUsersQuery request, CancellationToken cancellationToken)
        {
            if (string.IsNullOrWhiteSpace(request.SearchQuery))
            {
                return new List<UserDto>();
            }

            var query = request.SearchQuery.Trim().ToLower().Replace("@", "");

            var users = await _context.Users
                .AsNoTracking()
                .Where(u => u.Username.Contains(query) || u.FullName.ToLower().Contains(query) || u.Email.ToLower().Contains(query))
                .Take(20)
                .Select(u => new UserDto
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    FullName = u.FullName,
                    Bio = u.Bio,
                    AvatarUrl = u.AvatarUrl,
                    IsOnline = u.IsOnline,
                    LastSeenAt = u.LastSeenAt
                })
                .ToListAsync(cancellationToken);

            return users;
        }
    }
}

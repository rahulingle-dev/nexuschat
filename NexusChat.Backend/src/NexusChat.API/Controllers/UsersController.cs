using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using NexusChat.Application.Features.Users;

namespace NexusChat.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UsersController : ControllerBase
    {
        private readonly IMediator _mediator;

        public UsersController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("lookup/{username}")]
        public async Task<IActionResult> LookupUser(string username)
        {
            var user = await _mediator.Send(new GetUserByUsernameQuery(username));
            if (user == null)
            {
                return NotFound(new { message = $"User '@{username.Replace("@", "")}' not found." });
            }
            return Ok(user);
        }

        [HttpGet("search")]
        public async Task<IActionResult> SearchUsers([FromQuery] string query)
        {
            var users = await _mediator.Send(new SearchUsersQuery(query));
            return Ok(users);
        }

        [HttpPut("profile/{userId}")]
        public async Task<IActionResult> UpdateProfile([FromRoute] Guid userId, [FromBody] UpdateUserProfileRequest request)
        {
            try
            {
                var user = await _mediator.Send(new UpdateUserProfileCommand(userId, request.FullName, request.Bio, request.AvatarUrl));
                return Ok(user);
            }
            catch (System.InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public record UpdateUserProfileRequest(string FullName, string? Bio, string? AvatarUrl);
}

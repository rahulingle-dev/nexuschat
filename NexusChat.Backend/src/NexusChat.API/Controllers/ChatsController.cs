using System;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using NexusChat.Application.Features.Chats;

namespace NexusChat.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ChatsController : ControllerBase
    {
        private readonly IMediator _mediator;

        public ChatsController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet]
        public async Task<IActionResult> GetUserChats([FromQuery] Guid userId, [FromQuery] string filter = "All")
        {
            var chats = await _mediator.Send(new GetUserChatsQuery(userId, filter));
            return Ok(chats);
        }

        [HttpPost("direct")]
        public async Task<IActionResult> CreateDirectChat([FromBody] CreateDirectChatCommand command)
        {
            var chat = await _mediator.Send(command);
            return Ok(chat);
        }

        [HttpPost("group")]
        public async Task<IActionResult> CreateGroupChat([FromBody] CreateGroupChatCommand command)
        {
            try
            {
                var chat = await _mediator.Send(command);
                return Ok(chat);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPut("group/{chatId}/name")]
        public async Task<IActionResult> UpdateGroupName([FromRoute] Guid chatId, [FromBody] UpdateGroupNameRequest request)
        {
            try
            {
                var chat = await _mediator.Send(new UpdateGroupNameCommand(chatId, request.Name));
                return Ok(chat);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("group/{chatId}/members")]
        public async Task<IActionResult> AddGroupMember([FromRoute] Guid chatId, [FromBody] GroupMemberRequest request)
        {
            try
            {
                var user = await _mediator.Send(new AddGroupMemberCommand(chatId, request.UserId));
                return Ok(user);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("group/{chatId}/members/{userId}")]
        public async Task<IActionResult> RemoveGroupMember([FromRoute] Guid chatId, [FromRoute] Guid userId)
        {
            try
            {
                var result = await _mediator.Send(new RemoveGroupMemberCommand(chatId, userId));
                return Ok(new { success = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("group/{chatId}")]
        public async Task<IActionResult> DeleteGroup([FromRoute] Guid chatId)
        {
            try
            {
                var result = await _mediator.Send(new DeleteGroupCommand(chatId));
                return Ok(new { success = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("toggle-flag")]
        public async Task<IActionResult> ToggleChatFlag([FromBody] ToggleChatFlagsCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(new { success = result });
        }

        [HttpDelete("{chatId:guid}/clear")]
        public async Task<IActionResult> ClearChat(Guid chatId, [FromQuery] Guid userId)
        {
            try
            {
                var result = await _mediator.Send(new ClearChatCommand(chatId, userId));
                return Ok(new { success = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }

    public record UpdateGroupNameRequest(string Name);
    public record GroupMemberRequest(Guid UserId);
}

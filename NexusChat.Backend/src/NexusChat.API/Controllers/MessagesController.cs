using System;
using System.IO;
using System.Threading.Tasks;
using MediatR;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using NexusChat.Application.Features.Messages;
using NexusChat.Domain.Enums;

namespace NexusChat.API.Controllers
{
    public class UploadAttachmentModel
    {
        public IFormFile File { get; set; } = null!;
    }

    [ApiController]
    [Route("api/[controller]")]
    public class MessagesController : ControllerBase
    {
        private readonly IMediator _mediator;

        public MessagesController(IMediator mediator)
        {
            _mediator = mediator;
        }

        [HttpGet("{chatId:guid}")]
        public async Task<IActionResult> GetChatMessages(Guid chatId, [FromQuery] Guid? userId, [FromQuery] int skip = 0, [FromQuery] int take = 50)
        {
            var messages = await _mediator.Send(new GetChatMessagesQuery(chatId, userId, skip, take));
            return Ok(messages);
        }

        [HttpPost]
        public async Task<IActionResult> SendMessage([FromBody] SendMessageCommand command)
        {
            var message = await _mediator.Send(command);
            return Ok(message);
        }

        [HttpPost("mark-read")]
        public async Task<IActionResult> MarkAsRead([FromBody] MarkAsReadCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(new { success = result });
        }

        [HttpPost("reaction")]
        public async Task<IActionResult> AddReaction([FromBody] AddReactionCommand command)
        {
            var result = await _mediator.Send(command);
            return Ok(new { success = result });
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadAttachment([FromForm] UploadAttachmentModel model)
        {
            var file = model?.File;
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { message = "No file was uploaded." });
            }

            var uploadsFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var fileName = $"{Guid.NewGuid()}_{Path.GetFileName(file.FileName)}";
            var filePath = Path.Combine(uploadsFolder, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            var fileUrl = $"/uploads/{fileName}";
            var ext = Path.GetExtension(file.FileName).ToLower();

            var messageType = MessageType.File;
            if (ext == ".jpg" || ext == ".png" || ext == ".jpeg" || ext == ".webp")
            {
                messageType = MessageType.Image;
            }
            else if (ext == ".mp3" || ext == ".wav" || ext == ".m4a")
            {
                messageType = MessageType.Audio;
            }
            else if (ext == ".mp4" || ext == ".mov")
            {
                messageType = MessageType.Video;
            }

            return Ok(new
            {
                fileUrl,
                fileName = file.FileName,
                fileSize = file.Length,
                messageType
            });
        }

        [HttpDelete("{messageId:guid}")]
        public async Task<IActionResult> DeleteMessage(Guid messageId, [FromQuery] Guid userId, [FromQuery] bool deleteForEveryone = false)
        {
            try
            {
                var result = await _mediator.Send(new DeleteMessagesCommand(new List<Guid> { messageId }, userId, deleteForEveryone));
                return Ok(new { success = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("delete-multiple")]
        public async Task<IActionResult> DeleteMultipleMessages([FromBody] DeleteMessagesCommand command)
        {
            try
            {
                var result = await _mediator.Send(command);
                return Ok(new { success = result });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpPost("forward")]
        public async Task<IActionResult> ForwardMessages([FromBody] ForwardMessagesCommand command)
        {
            try
            {
                var messages = await _mediator.Send(command);
                return Ok(messages);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}

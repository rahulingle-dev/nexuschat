using System.Threading.Tasks;

namespace NexusChat.Application.Common.Interfaces
{
    public interface IEmailService
    {
        Task SendOtpEmailAsync(string email, string otpCode, string purpose);
    }
}

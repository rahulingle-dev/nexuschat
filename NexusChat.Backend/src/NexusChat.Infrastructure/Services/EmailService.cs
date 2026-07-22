using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using NexusChat.Application.Common.Interfaces;

namespace NexusChat.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        private readonly IConfiguration _configuration;

        public EmailService(IConfiguration configuration)
        {
            _configuration = configuration;
        }

        public async Task SendOtpEmailAsync(string email, string otpCode, string purpose)
        {
            var host = _configuration["Smtp:Host"];
            var portStr = _configuration["Smtp:Port"];
            var enableSsl = bool.Parse(_configuration["Smtp:EnableSsl"] ?? "true");
            var username = _configuration["Smtp:Username"];
            var rawPassword = _configuration["Smtp:Password"];
            var senderEmail = _configuration["Smtp:SenderEmail"] ?? "no-reply@nexuschat.com";
            var senderName = _configuration["Smtp:SenderName"] ?? "NexusChat Security";

            int port = int.TryParse(portStr, out var p) ? p : 587;

            // Strip spaces from Gmail App Password if present (e.g., "abcd efgh ijkl mnop" -> "abcdefghijklmnop")
            var password = rawPassword?.Replace(" ", "").Trim();

            // Fallback logging for local development when SMTP credentials are not yet configured
            if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(username) || username.Contains("YOUR_SMTP"))
            {
                Console.WriteLine($"=================================================");
                Console.WriteLine($"[SMTP Simulation] Target Email: {email}");
                Console.WriteLine($"[SMTP Simulation] Purpose: {purpose}");
                Console.WriteLine($"[SMTP Simulation] OTP CODE: {otpCode}");
                Console.WriteLine($"=================================================");
                return;
            }

            try
            {
                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = enableSsl
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(senderEmail, senderName),
                    Subject = $"[NexusChat] Your Verification Code: {otpCode}",
                    Body = $@"
                        <div style='font-family: Arial, sans-serif; background-color: #0b141a; padding: 24px; color: #e9edef; border-radius: 12px; max-width: 500px;'>
                            <h2 style='color: #00a884; margin-bottom: 8px;'>NexusChat Security Verification</h2>
                            <p style='font-size: 14px; color: #8696a0;'>Your single-use verification code for <strong>{purpose}</strong> is:</p>
                            <div style='font-size: 32px; font-weight: bold; color: #00a884; letter-spacing: 8px; background-color: #111b21; padding: 16px; text-align: center; border-radius: 8px; margin: 16px 0; border: 1px solid #00a884;'>
                                {otpCode}
                            </div>
                            <p style='font-size: 12px; color: #667781;'>This code is valid for 10 minutes. If you did not request this code, please ignore this message.</p>
                        </div>
                    ",
                    IsBodyHtml = true
                };

                mailMessage.To.Add(email);

                await client.SendMailAsync(mailMessage);
                Console.WriteLine($"[SMTP Success] Verification OTP email ({otpCode}) sent successfully to {email}.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[SMTP Error] Failed to send email to {email}: {ex.Message}");
                throw;
            }
        }
    }
}

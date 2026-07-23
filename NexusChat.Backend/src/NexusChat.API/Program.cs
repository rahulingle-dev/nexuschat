using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NexusChat.Application.Common.Interfaces;
using NexusChat.Infrastructure.Identity;
using NexusChat.Infrastructure.Persistence;
using NexusChat.Infrastructure.RealTime;
using NexusChat.Infrastructure.Services;

var builder = WebApplication.CreateBuilder(args);

// 1. Add SQL Server DbContext
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Server=localhost;Database=NexusChatDb;Trusted_Connection=True;TrustServerCertificate=True;";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(connectionString));

builder.Services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

// 2. Add MediatR
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(NexusChat.Application.Features.Auth.RegisterCommand).Assembly));

// 3. Add Custom Services
builder.Services.AddScoped<IJwtTokenGenerator, JwtTokenGenerator>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<ISignalRNotifier, SignalRNotifier>();

// 4. Add SignalR
builder.Services.AddSignalR();
builder.Services.AddSingleton<Microsoft.AspNetCore.SignalR.IUserIdProvider, NexusChat.Infrastructure.RealTime.CustomUserIdProvider>();

// 5. Add Authentication & JWT
var secretKey = builder.Configuration["Jwt:Secret"] ?? "NexusChat_Super_Secret_JWT_Signing_Key_2026_Enterprise_Grade!";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false;
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ValidateIssuer = false,
        ValidateAudience = false
    };
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.Request.Path;
            if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
});

// 6. Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("CorsPolicy", policy =>
    {
        policy.AllowAnyHeader()
              .AllowAnyMethod()
              .SetIsOriginAllowed(_ => true)
              .AllowCredentials();
    });
});

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure HTTP request pipeline & Swagger UI
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "NexusChat API v1");
});

app.UseCors("CorsPolicy");
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");
app.MapHub<CallHub>("/hubs/call");

// Ensure Database Created & Migrated on Startup
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    dbContext.Database.EnsureCreated();

    if (!dbContext.Users.Any())
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var passwordHash = Convert.ToBase64String(sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes("Admin@123")));

        var seedUsers = new System.Collections.Generic.List<NexusChat.Domain.Entities.User>
        {
            new() { Username = "johndoe", Email = "john.doe@example.com", FullName = "John Doe", PasswordHash = passwordHash, Bio = "Hey there! I am John.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddMinutes(-30) },
            new() { Username = "janesmith", Email = "jane.smith@example.com", FullName = "Jane Smith", PasswordHash = passwordHash, Bio = "Designing is my passion.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddHours(-2) },
            new() { Username = "michaelj", Email = "michael.johnson@example.com", FullName = "Michael Johnson", PasswordHash = passwordHash, Bio = "Developer & tech enthusiast.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddMinutes(-5) },
            new() { Username = "emilydavis", Email = "emily.davis@example.com", FullName = "Emily Davis", PasswordHash = passwordHash, Bio = "Always learning.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddDays(-1) },
            new() { Username = "davidbrown", Email = "david.brown@example.com", FullName = "David Brown", PasswordHash = passwordHash, Bio = "Let's connect!", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddHours(-4) },
            new() { Username = "sarahwilson", Email = "sarah.wilson@example.com", FullName = "Sarah Wilson", PasswordHash = passwordHash, Bio = "Nature lover.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddMinutes(-45) },
            new() { Username = "jamestaylor", Email = "james.taylor@example.com", FullName = "James Taylor", PasswordHash = passwordHash, Bio = "Sports fan.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddHours(-1) },
            new() { Username = "amandathomas", Email = "amanda.thomas@example.com", FullName = "Amanda Thomas", PasswordHash = passwordHash, Bio = "Coffee is life.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddDays(-2) },
            new() { Username = "robertjackson", Email = "robert.jackson@example.com", FullName = "Robert Jackson", PasswordHash = passwordHash, Bio = "Traveler.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddMinutes(-15) },
            new() { Username = "jessicawhite", Email = "jessica.white@example.com", FullName = "Jessica White", PasswordHash = passwordHash, Bio = "Foodie.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddHours(-5) },
            new() { Username = "williamharris", Email = "william.harris@example.com", FullName = "William Harris", PasswordHash = passwordHash, Bio = "Coding all day.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddMinutes(-10) },
            new() { Username = "oliviamartin", Email = "olivia.martin@example.com", FullName = "Olivia Martin", PasswordHash = passwordHash, Bio = "Reading books.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddHours(-3) },
            new() { Username = "josephgarcia", Email = "joseph.garcia@example.com", FullName = "Joseph Garcia", PasswordHash = passwordHash, Bio = "Gamer.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddMinutes(-50) },
            new() { Username = "sophiamartinez", Email = "sophia.martinez@example.com", FullName = "Sophia Martinez", PasswordHash = passwordHash, Bio = "Music is my escape.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddDays(-3) },
            new() { Username = "thomasrobinson", Email = "thomas.robinson@example.com", FullName = "Thomas Robinson", PasswordHash = passwordHash, Bio = "Photographer.", IsEmailVerified = true, IsOnline = false, LastSeenAt = DateTimeOffset.UtcNow.AddHours(-6) }
        };

        dbContext.Users.AddRange(seedUsers);
        dbContext.SaveChanges();
    }
}

app.Run();

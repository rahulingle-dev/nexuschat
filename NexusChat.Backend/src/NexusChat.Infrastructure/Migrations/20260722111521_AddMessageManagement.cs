using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace NexusChat.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMessageManagement : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "ForwardedFromMessageId",
                table: "Messages",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsForwarded",
                table: "Messages",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ClearedAt",
                table: "ChatMembers",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "UserDeletedMessages",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    MessageId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UserId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_UserDeletedMessages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_UserDeletedMessages_Messages_MessageId",
                        column: x => x.MessageId,
                        principalTable: "Messages",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_UserDeletedMessages_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_UserDeletedMessages_MessageId",
                table: "UserDeletedMessages",
                column: "MessageId");

            migrationBuilder.CreateIndex(
                name: "IX_UserDeletedMessages_UserId_MessageId",
                table: "UserDeletedMessages",
                columns: new[] { "UserId", "MessageId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "UserDeletedMessages");

            migrationBuilder.DropColumn(
                name: "ForwardedFromMessageId",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "IsForwarded",
                table: "Messages");

            migrationBuilder.DropColumn(
                name: "ClearedAt",
                table: "ChatMembers");
        }
    }
}

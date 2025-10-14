using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Tbm.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddDisplayOrderToTemplateItems : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "DisplayOrder",
                table: "TemplateItems",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DisplayOrder",
                table: "TemplateItems");
        }
    }
}

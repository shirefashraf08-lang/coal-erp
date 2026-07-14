using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CoalErp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class DeliveryStopItemQtyDelivered : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "QuantityDelivered",
                table: "DeliveryStopItems",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "QuantityOrdered",
                table: "DeliveryStopItems",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "DeliveryStopItems",
                type: "TEXT",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "QuantityDelivered",
                table: "DeliveryStopItems");

            migrationBuilder.DropColumn(
                name: "QuantityOrdered",
                table: "DeliveryStopItems");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "DeliveryStopItems");
        }
    }
}

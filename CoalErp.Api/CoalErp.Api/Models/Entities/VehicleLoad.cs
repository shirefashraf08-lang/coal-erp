namespace CoalErp.Api.Models.Entities;

public class VehicleLoad
{
    public int Id { get; set; }
    public string DriverId { get; set; } = string.Empty;
    public AppUser? Driver { get; set; }
    public int ProductId { get; set; }
    public Product? Product { get; set; }
    public DateTime LoadDate { get; set; } = DateTime.UtcNow.Date;
    public decimal QuantityLoaded { get; set; }
    public string Unit { get; set; } = "ton";
    public string? Notes { get; set; }
    public string CreatedById { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
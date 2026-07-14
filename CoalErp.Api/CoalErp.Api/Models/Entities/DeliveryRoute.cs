namespace CoalErp.Api.Models.Entities;

public class DeliveryRoute
{
    public int Id { get; set; }
    public DateTime RouteDate { get; set; } = DateTime.UtcNow.Date;
    public string DriverId { get; set; } = string.Empty;
    public AppUser Driver { get; set; } = null!;
    public string? VehiclePlate { get; set; }
    public string Status { get; set; } = "Active";  // Active | Completed
    public decimal TotalCollected { get; set; } = 0;
    public string? Notes { get; set; }

    // Navigation
    public ICollection<DeliveryStop> Stops { get; set; } = [];
}

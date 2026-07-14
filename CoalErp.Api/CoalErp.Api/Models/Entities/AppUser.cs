using Microsoft.AspNetCore.Identity;

namespace CoalErp.Api.Models.Entities;

public class AppUser : IdentityUser
{
    public string FullName { get; set; } = string.Empty;
    public string Role { get; set; } = "Driver"; // Admin | Accountant | Warehouse | Driver
    public DateTime HireDate { get; set; } = DateTime.UtcNow;
    public bool IsActive { get; set; } = true;
    public string? VehiclePlate { get; set; }

    // Navigation
    public ICollection<DeliveryRoute> DeliveryRoutes { get; set; } = [];
    public ICollection<TreasuryTransaction> TreasuryTransactions { get; set; } = [];
}

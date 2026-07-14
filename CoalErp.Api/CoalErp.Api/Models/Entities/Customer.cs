namespace CoalErp.Api.Models.Entities;

public class Customer
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? Latitude { get; set; }
    public string? Longitude { get; set; }
    public string PaymentType { get; set; } = "Cash";   // Cash | Credit
    public decimal CreditLimit { get; set; } = 0;
    public decimal OpeningBalance { get; set; } = 0;    // Balance at setup time
    public decimal CurrentBalance { get; set; } = 0;    // Positive = owes us
    public bool IsActive { get; set; } = true;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<Invoice> Invoices { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
    public ICollection<DeliveryStop> DeliveryStops { get; set; } = [];
}

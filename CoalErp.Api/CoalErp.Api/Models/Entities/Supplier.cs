namespace CoalErp.Api.Models.Entities;

public class Supplier
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public string? ContactPerson { get; set; }
    public decimal CurrentBalance { get; set; } = 0;   // Positive = we owe them
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<PurchaseInvoice> PurchaseInvoices { get; set; } = [];
}

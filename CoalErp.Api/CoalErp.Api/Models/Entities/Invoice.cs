namespace CoalErp.Api.Models.Entities;

public class Invoice
{
    public int Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;  // INV-2024
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public string? CreatedById { get; set; }
    public AppUser? CreatedBy { get; set; }
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public decimal SubTotal { get; set; }
    public decimal Discount { get; set; } = 0;
    public decimal TotalAmount { get; set; }
    public decimal PaidAmount { get; set; } = 0;
    public decimal RemainingAmount => TotalAmount - PaidAmount;
    public string Status { get; set; } = "Pending";   // Pending | Partial | Paid | Cancelled
    public string PaymentType { get; set; } = "Cash"; // Cash | Credit
    public string? Notes { get; set; }

    // Navigation
    public ICollection<InvoiceItem> Items { get; set; } = [];
    public ICollection<Payment> Payments { get; set; } = [];
}

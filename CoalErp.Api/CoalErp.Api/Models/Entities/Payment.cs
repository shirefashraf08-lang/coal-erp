namespace CoalErp.Api.Models.Entities;

public class Payment
{
    public int Id { get; set; }
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public int? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public decimal Amount { get; set; }
    public string Method { get; set; } = "Cash";    // Cash | Bank | Cheque
    public DateTime PaymentDate { get; set; } = DateTime.UtcNow;
    public string? ReceivedById { get; set; }
    public AppUser? ReceivedBy { get; set; }
    public string? Notes { get; set; }
    public string? Reference { get; set; }
}

namespace CoalErp.Api.Models.Entities;

public class TreasuryTransaction
{
    public int Id { get; set; }
    public string Type { get; set; } = "Income";  // Income | Expense
    public decimal Amount { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Method { get; set; } = "Cash";  // Cash | Bank
    public DateTime TransactionDate { get; set; } = DateTime.UtcNow;
    public string? CreatedById { get; set; }
    public AppUser? CreatedBy { get; set; }
    public string? Reference { get; set; }        // Invoice number, PO number, etc.
    public int? InvoiceId { get; set; }
    public int? PaymentId { get; set; }
    public int? PurchaseInvoiceId { get; set; }
}

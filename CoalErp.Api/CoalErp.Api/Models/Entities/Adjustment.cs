namespace CoalErp.Api.Models.Entities;

/// <summary>قيود التسويات — تعديل رصيد عميل أو مورد بدون فاتورة</summary>
public class Adjustment
{
    public int Id { get; set; }
    public string Type { get; set; } = "CustomerDebit"; 
    // CustomerDebit | CustomerCredit | SupplierDebit | SupplierCredit | OpeningBalance

    public int? CustomerId { get; set; }
    public Customer? Customer { get; set; }

    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }

    public decimal Amount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public string? Reference { get; set; }
    public DateTime AdjustmentDate { get; set; } = DateTime.UtcNow;
    public string? CreatedById { get; set; }
    public AppUser? CreatedBy { get; set; }
    public string? Notes { get; set; }
}

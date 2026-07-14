namespace CoalErp.Api.Models.Entities;

public class InventoryMovement
{
    public int Id { get; set; }
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public string Type { get; set; } = "In";    // In | Out
    public string Reason { get; set; } = string.Empty; // Production | Sale | Purchase | Return | Damaged | Transfer
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "Ton";
    public string Warehouse { get; set; } = "Main";
    public DateTime MovementDate { get; set; } = DateTime.UtcNow;
    public string? CreatedById { get; set; }
    public AppUser? CreatedBy { get; set; }
    public int? InvoiceId { get; set; }         // linked to sale invoice if applicable
    public string? Notes { get; set; }
}

namespace CoalErp.Api.Models.Entities;

public class Product
{
    public int Id { get; set; }
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;  // Lump | Natural | Briquettes
    public string Unit { get; set; } = "Ton";             // Ton | Kg | Bag
    public decimal WholesalePrice { get; set; }
    public decimal RetailPrice { get; set; }
    public decimal CurrentStock { get; set; }
    public decimal MinimumStock { get; set; }
    public string? ImageUrl { get; set; }    // URL or base64 thumbnail
    public string? Barcode { get; set; }
    public string? Notes { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<InventoryMovement> InventoryMovements { get; set; } = [];
    public ICollection<InvoiceItem> InvoiceItems { get; set; } = [];
}

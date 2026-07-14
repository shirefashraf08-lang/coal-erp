namespace CoalErp.Api.Models.Entities;

public class InvoiceItem
{
    public int Id { get; set; }
    public int InvoiceId { get; set; }
    public Invoice Invoice { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "Ton";
    public decimal UnitPrice { get; set; }
    public decimal Discount { get; set; } = 0;   // percentage 0-100
    public decimal TotalPrice => Quantity * UnitPrice * (1 - Discount / 100m);
}

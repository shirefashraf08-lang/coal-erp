namespace CoalErp.Api.Models.Entities;

public class DeliveryStop
{
    public int Id { get; set; }
    public int DeliveryRouteId { get; set; }
    public DeliveryRoute DeliveryRoute { get; set; } = null!;
    public int CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public int? InvoiceId { get; set; }
    public Invoice? Invoice { get; set; }
    public int SortOrder { get; set; }
    public string Status { get; set; } = "Pending";  // Pending | Delivered | Failed
    public decimal AmountDue { get; set; } = 0;
    public decimal AmountCollected { get; set; } = 0;
    public DateTime? ArrivalTime { get; set; }
    public string? Note { get; set; }

    // Items to deliver
    public ICollection<DeliveryStopItem> Items { get; set; } = [];
}

namespace CoalErp.Api.Models.Entities;

public class DeliveryStopItem
{
    public int Id { get; set; }
    public int DeliveryStopId { get; set; }
    public DeliveryStop DeliveryStop { get; set; } = null!;
    public int ProductId { get; set; }
    public Product Product { get; set; } = null!;
    public decimal QuantityOrdered { get; set; }     // الكمية المطلوبة
    public decimal QuantityDelivered { get; set; }   // الكمية الفعلية المُسلَّمة
    public decimal UnitPrice { get; set; } = 0;
    public string Unit { get; set; } = "Ton";

    // للتوافق مع الكود القديم
    public decimal Quantity { get => QuantityOrdered; set => QuantityOrdered = value; }
}

namespace CoalErp.Api.Models.DTOs;

public record DeliveryRouteDto(
    int Id,
    DateTime RouteDate,
    string DriverId,
    string DriverName,
    string? VehiclePlate,
    string Status,
    int TotalStops,
    int DeliveredStops,
    int PendingStops,
    decimal TotalCollected
);

public record DeliveryStopDto(
    int Id,
    int DeliveryRouteId,
    int CustomerId,
    string CustomerName,
    string CustomerAddress,
    string CustomerPhone,
    int? InvoiceId,
    string? InvoiceNumber,
    int SortOrder,
    string Status,
    decimal AmountDue,
    decimal AmountCollected,
    DateTime? ArrivalTime,
    string? Note,
    List<DeliveryStopItemDto> Items
);

public record DeliveryStopItemDto(
    int ProductId,
    string ProductName,
    decimal Quantity,
    string Unit
);

public record UpdateDeliveryStopRequest(
    string Status,          // Delivered | Failed
    decimal AmountCollected,
    string? Note
);

public record CreateDeliveryRouteRequest(
    DateTime RouteDate,
    string DriverId,
    string? VehiclePlate,
    List<CreateDeliveryStopRequest> Stops
);

public record CreateDeliveryStopRequest(
    int CustomerId,
    int? InvoiceId,
    int SortOrder,
    decimal AmountDue,
    List<DeliveryStopItemDto> Items
);

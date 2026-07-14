namespace CoalErp.Api.Models.DTOs;

public record InvoiceDto(
    int Id,
    string InvoiceNumber,
    int CustomerId,
    string CustomerName,
    DateTime InvoiceDate,
    DateTime? DueDate,
    decimal SubTotal,
    decimal Discount,
    decimal TotalAmount,
    decimal PaidAmount,
    decimal RemainingAmount,
    string Status,
    string PaymentType,
    string? Notes,
    List<InvoiceItemDto> Items
);

public record InvoiceItemDto(
    int ProductId,
    string ProductName,
    decimal Quantity,
    string Unit,
    decimal UnitPrice,
    decimal TotalPrice
);

public record CreateInvoiceRequest(
    string? InvoiceNumber,
    int CustomerId,
    DateTime? InvoiceDate,
    DateTime? DueDate,
    decimal Discount,
    decimal PaidAmount,
    string PaymentType,
    string? Notes,
    List<CreateInvoiceItemRequest> Items
);

public record CreateInvoiceItemRequest(
    int ProductId,
    decimal Quantity,
    string Unit,
    decimal UnitPrice,
    decimal Discount = 0
);

public record PaymentDto(
    int Id,
    int CustomerId,
    string CustomerName,
    int? InvoiceId,
    string? InvoiceNumber,
    decimal Amount,
    string Method,
    DateTime PaymentDate,
    string? Notes,
    string? Reference
);

public record CreatePaymentRequest(
    int CustomerId,
    int? InvoiceId,
    decimal Amount,
    string Method,
    string? Notes,
    string? Reference
);

namespace CoalErp.Api.Models.DTOs;

public record CustomerDto(
    int Id,
    string Name,
    string Phone,
    string Address,
    string PaymentType,
    decimal CreditLimit,
    decimal OpeningBalance,
    decimal CurrentBalance,
    bool IsActive,
    string? Notes,
    DateTime CreatedAt
);

public record CreateCustomerRequest(
    string Name,
    string Phone,
    string Address,
    string PaymentType,
    decimal CreditLimit,
    decimal OpeningBalance,
    string? Notes
);

public record UpdateCustomerRequest(
    string? Name,
    string? Phone,
    string? Address,
    string? PaymentType,
    decimal? CreditLimit,
    bool? IsActive,
    string? Notes
);

public record CustomerStatementDto(
    CustomerDto Customer,
    List<InvoiceDto> Invoices,
    List<PaymentDto> Payments,
    decimal TotalInvoiced,
    decimal TotalPaid,
    decimal Balance
);

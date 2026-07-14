namespace CoalErp.Api.Models.DTOs;

public record AdjustmentDto(
    int Id,
    string Type,
    int? CustomerId,
    string? CustomerName,
    int? SupplierId,
    string? SupplierName,
    decimal Amount,
    string Reason,
    string? Reference,
    DateTime AdjustmentDate,
    string? Notes
);

public record CreateAdjustmentRequest(
    string Type,           // CustomerDebit | CustomerCredit | SupplierDebit | SupplierCredit | OpeningBalance
    int? CustomerId,
    int? SupplierId,
    decimal Amount,
    string Reason,
    string? Reference,
    DateTime? AdjustmentDate,
    string? Notes
);

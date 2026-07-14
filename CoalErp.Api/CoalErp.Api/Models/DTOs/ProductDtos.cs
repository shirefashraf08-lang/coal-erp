namespace CoalErp.Api.Models.DTOs;

public record ProductDto(
    int Id,
    string NameAr,
    string NameEn,
    string Category,
    string Unit,
    decimal WholesalePrice,
    decimal RetailPrice,
    decimal CurrentStock,
    decimal MinimumStock,
    string? ImageUrl,
    string? Barcode,
    string? Notes,
    bool IsActive,
    bool IsLowStock,
    DateTime CreatedAt
);

public record CreateProductRequest(
    string NameAr,
    string NameEn,
    string Category,
    string Unit,
    decimal WholesalePrice,
    decimal RetailPrice,
    decimal MinimumStock,
    decimal OpeningStock,
    string? ImageUrl,
    string? Barcode,
    string? Notes
);

public record UpdateProductRequest(
    string? NameAr,
    string? NameEn,
    string? Category,
    string? Unit,
    decimal? WholesalePrice,
    decimal? RetailPrice,
    decimal? MinimumStock,
    string? ImageUrl,
    string? Barcode,
    string? Notes,
    bool? IsActive
);

public record InventoryMovementDto(
    int Id,
    int ProductId,
    string ProductName,
    string Type,
    string Reason,
    decimal Quantity,
    string Unit,
    string Warehouse,
    DateTime MovementDate,
    string? Notes
);

public record CreateInventoryMovementRequest(
    int ProductId,
    string Type,
    string Reason,
    decimal Quantity,
    string Unit,
    string Warehouse,
    string? Notes
);

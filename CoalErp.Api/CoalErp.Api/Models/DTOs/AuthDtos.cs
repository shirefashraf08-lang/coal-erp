namespace CoalErp.Api.Models.DTOs;

public record LoginRequest(string Username, string Password);

public record LoginResponse(
    string Token,
    string UserId,
    string FullName,
    string Role,
    DateTime Expires
);

public record RegisterRequest(
    string Username,
    string FullName,
    string Password,
    string Role,
    string? VehiclePlate
);

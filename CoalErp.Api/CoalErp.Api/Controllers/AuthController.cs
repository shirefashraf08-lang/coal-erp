using CoalErp.Api.Models.DTOs;
using CoalErp.Api.Models.Entities;
using CoalErp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;

namespace CoalErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly UserManager<AppUser> _userManager;
    private readonly JwtService _jwt;

    public AuthController(UserManager<AppUser> userManager, JwtService jwt)
    {
        _userManager = userManager;
        _jwt = jwt;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest request)
    {
        var user = await _userManager.FindByNameAsync(request.Username);
        if (user == null || !user.IsActive)
            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });

        if (!await _userManager.CheckPasswordAsync(user, request.Password))
            return Unauthorized(new { message = "اسم المستخدم أو كلمة المرور غير صحيحة" });

        var token = _jwt.GenerateToken(user);
        return Ok(new LoginResponse(
            Token: token,
            UserId: user.Id,
            FullName: user.FullName,
            Role: user.Role,
            Expires: DateTime.UtcNow.AddDays(7)
        ));
    }

    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request)
    {
        var user = new AppUser
        {
            UserName = request.Username,
            FullName = request.FullName,
            Role = request.Role,
            VehiclePlate = request.VehiclePlate,
            IsActive = true,
        };

        var result = await _userManager.CreateAsync(user, request.Password);
        if (!result.Succeeded)
            return BadRequest(result.Errors);

        var token = _jwt.GenerateToken(user);
        return Ok(new LoginResponse(
            Token: token,
            UserId: user.Id,
            FullName: user.FullName,
            Role: user.Role,
            Expires: DateTime.UtcNow.AddDays(7)
        ));
    }

    [HttpGet("drivers")]
    [Authorize(Roles = "Admin,Accountant")]
    public IActionResult GetDrivers()
    {
        var drivers = _userManager.Users
            .Where(u => u.Role == "Driver" && u.IsActive)
            .Select(u => new { u.Id, u.FullName, u.VehiclePlate, u.UserName })
            .ToList();
        return Ok(drivers);
    }

    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public IActionResult GetUsers()
    {
        var users = _userManager.Users
            .OrderBy(u => u.Role)
            .Select(u => new {
                u.Id, u.FullName, u.UserName, u.Role,
                u.VehiclePlate, u.IsActive, u.HireDate
            })
            .ToList();
        return Ok(users);
    }

    [HttpPatch("users/{id}/role")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateRole(string id, [FromBody] UpdateRoleRequest request)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user == null) return NotFound();

        user.Role = request.Role;
        if (!string.IsNullOrEmpty(request.VehiclePlate))
            user.VehiclePlate = request.VehiclePlate;

        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded) return BadRequest(result.Errors);

        return Ok(new { message = "تم تحديث الدور", user.Id, user.FullName, user.Role });
    }
}

public record UpdateRoleRequest(string Role, string? VehiclePlate);

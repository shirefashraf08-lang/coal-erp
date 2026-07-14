using System.Security.Claims;
using CoalErp.Api.Data;
using CoalErp.Api.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Controllers;

[ApiController]
[Route("api/vehicle-loads")]
[Authorize]
public class VehicleLoadsController : ControllerBase
{
    private readonly AppDbContext _db;
    public VehicleLoadsController(AppDbContext db) => _db = db;

    // GET api/vehicle-loads/today  -- للسائق
    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role   = User.FindFirstValue("role");
        var today  = DateTime.UtcNow.Date;

        var query = _db.VehicleLoads
            .Include(v => v.Product)
            .Include(v => v.Driver)
            .Where(v => v.LoadDate.Date == today);

        if (role == "Driver") query = query.Where(v => v.DriverId == userId);

        var loads = await query.OrderBy(v => v.ProductId).ToListAsync();

        // حساب المُسلَّم من رحلات اليوم
        var routes = await _db.DeliveryRoutes
            .Include(r => r.Stops).ThenInclude(s => s.Items)
            .Where(r => r.RouteDate.Date == today && (role != "Driver" || r.DriverId == userId))
            .ToListAsync();

        var deliveredQtyByProduct = routes
            .SelectMany(r => r.Stops.Where(s => s.Status == "Delivered").SelectMany(s => s.Items))
            .GroupBy(i => i.ProductId)
            .ToDictionary(g => g.Key, g => g.Sum(x => x.QuantityDelivered));

        var collectedToday = routes
            .SelectMany(r => r.Stops.Where(s => s.Status == "Delivered"))
            .Sum(s => s.AmountCollected);

        return Ok(new
        {
            Loads = loads.Select(v => new
            {
                v.Id, v.ProductId,
                ProductName = v.Product?.NameAr ?? "",
                v.Unit,
                v.QuantityLoaded,
                QuantityDelivered = deliveredQtyByProduct.TryGetValue(v.ProductId, out var d) ? d : 0,
                QuantityRemaining = v.QuantityLoaded - (deliveredQtyByProduct.TryGetValue(v.ProductId, out var d2) ? d2 : 0),
                DriverName = v.Driver?.FullName ?? "",
                v.Notes,
            }),
            CollectedToday = collectedToday,
        });
    }

    // POST api/vehicle-loads  -- أدمن يحمّل البضاعة
    [HttpPost]
    [Authorize(Roles = "Admin,Warehouse")]
    public async Task<IActionResult> Create([FromBody] CreateVehicleLoadRequest req)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        // امسح التحميل القديم لنفس الصنف في نفس اليوم للسائق
        var existing = await _db.VehicleLoads
            .Where(v => v.DriverId == req.DriverId && v.ProductId == req.ProductId && v.LoadDate.Date == req.LoadDate.Date)
            .FirstOrDefaultAsync();

        if (existing != null)
        {
            existing.QuantityLoaded = req.QuantityLoaded;
            existing.Unit = req.Unit;
            existing.Notes = req.Notes;
        }
        else
        {
            _db.VehicleLoads.Add(new VehicleLoad
            {
                DriverId = req.DriverId,
                ProductId = req.ProductId,
                LoadDate = req.LoadDate.Date,
                QuantityLoaded = req.QuantityLoaded,
                Unit = req.Unit,
                Notes = req.Notes,
                CreatedById = userId ?? "",
            });
        }

        await _db.SaveChangesAsync();
        return Ok(new { message = "تم تسجيل التحميل" });
    }

    // DELETE api/vehicle-loads/{id}
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,Warehouse")]
    public async Task<IActionResult> Delete(int id)
    {
        var load = await _db.VehicleLoads.FindAsync(id);
        if (load == null) return NotFound();
        _db.VehicleLoads.Remove(load);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // GET api/vehicle-loads -- للأدمن: كل التحميلات
    [HttpGet]
    [Authorize(Roles = "Admin,Warehouse,Accountant")]
    public async Task<IActionResult> GetAll([FromQuery] DateTime? date, [FromQuery] string? driverId)
    {
        var d = date?.Date ?? DateTime.UtcNow.Date;
        var query = _db.VehicleLoads
            .Include(v => v.Product).Include(v => v.Driver)
            .Where(v => v.LoadDate.Date == d);
        if (!string.IsNullOrEmpty(driverId)) query = query.Where(v => v.DriverId == driverId);

        var loads = await query.ToListAsync();
        return Ok(loads.Select(v => new
        {
            v.Id, v.ProductId,
            ProductName = v.Product?.NameAr ?? "",
            v.Unit, v.QuantityLoaded,
            DriverId = v.DriverId,
            DriverName = v.Driver?.FullName ?? "",
            v.Notes, v.LoadDate,
        }));
    }
}

public record CreateVehicleLoadRequest(
    string DriverId,
    int ProductId,
    decimal QuantityLoaded,
    string Unit,
    DateTime LoadDate,
    string? Notes
);
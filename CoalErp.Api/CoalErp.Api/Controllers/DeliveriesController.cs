using System.Security.Claims;
using CoalErp.Api.Data;
using CoalErp.Api.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DeliveriesController : ControllerBase
{
    private readonly AppDbContext _db;
    public DeliveriesController(AppDbContext db) => _db = db;

    // ── محطات المندوب اليوم (للـ driver screen) ──────────────────────────────
    [HttpGet("my-stops")]
    public async Task<IActionResult> GetMyStops()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role   = User.FindFirstValue("role");
        var today  = DateTime.UtcNow.Date;

        var query = _db.DeliveryRoutes
            .Include(r => r.Driver)
            .Include(r => r.Stops).ThenInclude(s => s.Customer)
            .Include(r => r.Stops).ThenInclude(s => s.Items).ThenInclude(i => i.Product)
            .Where(r => r.RouteDate.Date == today);

        if (role == "Driver")
            query = query.Where(r => r.DriverId == userId);

        var routes = await query.OrderByDescending(r => r.Id).ToListAsync();
        var stops  = routes.SelectMany(r => r.Stops.OrderBy(s => s.SortOrder), (r, s) => MapStop(r, s));
        return Ok(stops);
    }

    // ── تسليم محطة (driver) ─────────────────────────────────────────────────
    [HttpPatch("stops/{stopId}/deliver")]
    [Authorize(Roles = "Driver,Admin")]
    public async Task<IActionResult> DeliverStop(int stopId, [FromBody] DeliverStopRequest req)
    {
        var stop = await _db.DeliveryStops
            .Include(s => s.DeliveryRoute)
            .Include(s => s.Customer)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(s => s.Id == stopId);
        if (stop == null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role   = User.FindFirstValue("role");
        if (role == "Driver" && stop.DeliveryRoute.DriverId != userId) return Forbid();

        stop.Status          = "Delivered";
        stop.AmountCollected = req.CollectedAmount;
        stop.ArrivalTime     = DateTime.UtcNow;

        foreach (var di in req.Items ?? new())
        {
            var item = stop.Items.FirstOrDefault(i => i.ProductId == di.ProductId);
            if (item == null) continue;
            item.QuantityDelivered = di.QuantityDelivered;
            if (item.Product != null && di.QuantityDelivered > 0)
            {
                item.Product.CurrentStock -= di.QuantityDelivered;
                _db.InventoryMovements.Add(new InventoryMovement
                {
                    ProductId = item.ProductId, Type = "Out", Reason = "Delivery",
                    Quantity = di.QuantityDelivered, Unit = item.Unit, Warehouse = "Main", CreatedById = userId,
                });
            }
        }

        if (stop.Customer != null && req.CollectedAmount > 0)
        {
            stop.Customer.CurrentBalance -= req.CollectedAmount;
            _db.TreasuryTransactions.Add(new TreasuryTransaction
            {
                Type = "Income", Amount = req.CollectedAmount,
                Description = $"تحصيل توصيل — {stop.Customer.Name}", Method = "Cash", CreatedById = userId,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(MapStop(stop.DeliveryRoute, stop));
    }

    // ── فشل محطة ────────────────────────────────────────────────────────────
    [HttpPatch("stops/{stopId}/fail")]
    [Authorize(Roles = "Driver,Admin")]
    public async Task<IActionResult> FailStop(int stopId)
    {
        var stop = await _db.DeliveryStops
            .Include(s => s.DeliveryRoute)
            .FirstOrDefaultAsync(s => s.Id == stopId);
        if (stop == null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role   = User.FindFirstValue("role");
        if (role == "Driver" && stop.DeliveryRoute.DriverId != userId) return Forbid();

        stop.Status = "Failed";
        await _db.SaveChangesAsync();
        return Ok();
    }

    // ── جلب رحلات اليوم ──────────────────────────────────────────────────────
    [HttpGet("today")]
    public async Task<IActionResult> GetTodayRoute()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role   = User.FindFirstValue("role");
        var today  = DateTime.UtcNow.Date;

        var query = _db.DeliveryRoutes
            .Include(r => r.Driver)
            .Include(r => r.Stops).ThenInclude(s => s.Customer)
            .Include(r => r.Stops).ThenInclude(s => s.Items).ThenInclude(i => i.Product)
            .Where(r => r.RouteDate.Date == today);

        if (role == "Driver")
            query = query.Where(r => r.DriverId == userId);

        var routes = await query.OrderByDescending(r => r.Id).ToListAsync();
        if (!routes.Any()) return Ok(new List<object>());

        return Ok(routes.SelectMany(r => r.Stops.OrderBy(s => s.SortOrder), (r, s) => MapStop(r, s)));
    }

    // ── ملخص رحلة السائق (header card) ─────────────────────────────────────
    [HttpGet("summary")]
    public async Task<IActionResult> GetSummary()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role   = User.FindFirstValue("role");
        var today  = DateTime.UtcNow.Date;

        var query = _db.DeliveryRoutes
            .Include(r => r.Driver)
            .Include(r => r.Stops).ThenInclude(s => s.Customer)
            .Include(r => r.Stops).ThenInclude(s => s.Items).ThenInclude(i => i.Product)
            .Where(r => r.RouteDate.Date == today);

        if (role == "Driver")
            query = query.Where(r => r.DriverId == userId);

        var routes = await query.ToListAsync();

        var stops    = routes.SelectMany(r => r.Stops).ToList();
        var allItems = stops.SelectMany(s => s.Items).ToList();

        // الكميات المحملة لكل صنف
        var loaded = allItems
            .GroupBy(i => new { i.ProductId, i.Product?.NameAr, i.Unit })
            .Select(g => new { g.Key.ProductId, ProductName = g.Key.NameAr ?? "", g.Key.Unit, Ordered = g.Sum(x => x.QuantityOrdered) })
            .ToList();

        // الكميات المُسلَّمة فعلياً
        var delivered = allItems
            .Where(i => i.DeliveryStop?.Status == "Delivered")
            .GroupBy(i => new { i.ProductId, i.Product?.NameAr, i.Unit })
            .Select(g => new { g.Key.ProductId, ProductName = g.Key.NameAr ?? "", g.Key.Unit, Delivered = g.Sum(x => x.QuantityDelivered) })
            .ToList();

        return Ok(new
        {
            TotalStops      = stops.Count,
            DeliveredStops  = stops.Count(s => s.Status == "Delivered"),
            PendingStops    = stops.Count(s => s.Status == "Pending"),
            FailedStops     = stops.Count(s => s.Status == "Failed"),
            TotalDue        = stops.Sum(s => s.AmountDue),
            TotalCollected  = stops.Where(s => s.Status == "Delivered").Sum(s => s.AmountCollected),
            LoadedItems     = loaded,
            DeliveredItems  = delivered,
            Routes          = routes.Select(r => new { r.Id, r.Status, DriverName = r.Driver?.FullName, r.VehiclePlate }),
        });
    }

    // ── تحديث محطة: تسليم فعلي بكمية + تحصيل ────────────────────────────────
    [HttpPatch("stops/{stopId}")]
    [Authorize(Roles = "Driver,Admin")]
    public async Task<IActionResult> UpdateStop(int stopId, [FromBody] UpdateStopRequest request)
    {
        var stop = await _db.DeliveryStops
            .Include(s => s.DeliveryRoute)
            .Include(s => s.Customer)
            .Include(s => s.Items).ThenInclude(i => i.Product)
            .FirstOrDefaultAsync(s => s.Id == stopId);

        if (stop == null) return NotFound();

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        var role   = User.FindFirstValue("role");
        if (role == "Driver" && stop.DeliveryRoute.DriverId != userId) return Forbid();

        var prevStatus = stop.Status;
        stop.Status          = request.Status;
        stop.AmountCollected = request.AmountCollected;
        stop.Note            = request.Notes;
        stop.ArrivalTime     = DateTime.UtcNow;

        if (request.Status == "Delivered" && prevStatus != "Delivered")
        {
            // تحديث الكميات الفعلية المُسلَّمة
            if (request.DeliveredItems != null)
            {
                foreach (var di in request.DeliveredItems)
                {
                    var item = stop.Items.FirstOrDefault(i => i.Id == di.ItemId);
                    if (item == null) continue;
                    item.QuantityDelivered = di.QuantityDelivered;

                    // خصم من المخزون فقط الكمية الفعلية
                    var product = item.Product;
                    if (product != null && di.QuantityDelivered > 0)
                    {
                        product.CurrentStock -= di.QuantityDelivered;

                        _db.InventoryMovements.Add(new InventoryMovement
                        {
                            ProductId   = item.ProductId,
                            Type        = "Out",
                            Reason      = "Delivery",
                            Quantity    = di.QuantityDelivered,
                            Unit        = item.Unit,
                            Warehouse   = "Main",
                            CreatedById = userId,
                        });
                    }
                }
            }
            else
            {
                // إذا لم يُرسَل تفصيل — نستخدم الكمية الكاملة المطلوبة
                foreach (var item in stop.Items)
                {
                    item.QuantityDelivered = item.QuantityOrdered;
                    if (item.Product != null)
                    {
                        item.Product.CurrentStock -= item.QuantityOrdered;
                        _db.InventoryMovements.Add(new InventoryMovement
                        {
                            ProductId   = item.ProductId,
                            Type        = "Out",
                            Reason      = "Delivery",
                            Quantity    = item.QuantityOrdered,
                            Unit        = item.Unit,
                            Warehouse   = "Main",
                            CreatedById = userId,
                        });
                    }
                }
            }

            // تحديث رصيد العميل وتسجيل الدفع
            if (stop.Customer != null)
            {
                var totalDelivered = stop.Items.Sum(i => i.QuantityDelivered * i.UnitPrice);
                var amountDue      = totalDelivered > 0 ? totalDelivered : stop.AmountDue;

                // المبلغ المدفوع يُخفِّض الرصيد
                if (request.AmountCollected > 0)
                {
                    stop.Customer.CurrentBalance -= request.AmountCollected;

                    // سند قبض في الخزينة
                    _db.TreasuryTransactions.Add(new TreasuryTransaction
                    {
                        Type        = "Income",
                        Amount      = request.AmountCollected,
                        Description = $"تحصيل توصيل — {stop.Customer.Name}",
                        Method      = "Cash",
                        CreatedById = userId,
                    });
                }

                // ما لم يُدفَع يُضاف للرصيد المديون
                var unpaid = amountDue - request.AmountCollected;
                if (unpaid > 0)
                    stop.Customer.CurrentBalance += unpaid;
            }
        }

        // إجمالي محصّل على الرحلة
        stop.DeliveryRoute.TotalCollected = await _db.DeliveryStops
            .Where(s => s.DeliveryRouteId == stop.DeliveryRouteId && s.Status == "Delivered")
            .SumAsync(s => s.AmountCollected) + (request.Status == "Delivered" ? request.AmountCollected : 0);

        await _db.SaveChangesAsync();
        return Ok(MapStop(stop.DeliveryRoute, stop));
    }

    // ── إنشاء رحلة توصيل ─────────────────────────────────────────────────────
    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> CreateRoute([FromBody] CreateRouteRequest request)
    {
        var route = new DeliveryRoute
        {
            RouteDate    = request.RouteDate.Date,
            DriverId     = request.DriverId,
            VehiclePlate = request.VehiclePlate,
            Notes        = request.Notes,
            Status       = "Active",
        };

        foreach (var (stopReq, idx) in request.Stops.Select((s, i) => (s, i)))
        {
            var stop = new DeliveryStop
            {
                CustomerId = stopReq.CustomerId,
                InvoiceId  = stopReq.InvoiceId,
                SortOrder  = idx + 1,
                AmountDue  = stopReq.AmountDue,
                Status     = "Pending",
                Items      = stopReq.Items.Select(i => new DeliveryStopItem
                {
                    ProductId         = i.ProductId,
                    QuantityOrdered   = i.Quantity,
                    QuantityDelivered = 0,
                    UnitPrice         = i.UnitPrice,
                    Unit              = i.Unit,
                }).ToList(),
            };
            route.Stops.Add(stop);
        }

        _db.DeliveryRoutes.Add(route);
        await _db.SaveChangesAsync();

        // نحمّل الـ navigation properties
        await _db.Entry(route).Reference(r => r.Driver).LoadAsync();

        return Ok(new { route.Id, message = "تم إنشاء الرحلة" });
    }

    // ── جلب كل الرحلات (للأدمن) ─────────────────────────────────────────────
    [HttpGet]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> GetAll([FromQuery] DateTime? date, [FromQuery] string? driverId)
    {
        var query = _db.DeliveryRoutes
            .Include(r => r.Driver)
            .Include(r => r.Stops).ThenInclude(s => s.Customer)
            .Include(r => r.Stops).ThenInclude(s => s.Items).ThenInclude(i => i.Product)
            .AsQueryable();

        if (date.HasValue)    query = query.Where(r => r.RouteDate.Date == date.Value.Date);
        if (!string.IsNullOrEmpty(driverId)) query = query.Where(r => r.DriverId == driverId);

        var routes = await query.OrderByDescending(r => r.RouteDate).ToListAsync();

        return Ok(routes.Select(r => new
        {
            r.Id, r.RouteDate, r.Status, r.VehiclePlate,
            r.TotalCollected,
            DriverName   = r.Driver?.FullName ?? "",
            DriverId     = r.DriverId,
            TotalStops   = r.Stops.Count,
            Delivered    = r.Stops.Count(s => s.Status == "Delivered"),
            Pending      = r.Stops.Count(s => s.Status == "Pending"),
            TotalDue     = r.Stops.Sum(s => s.AmountDue),
            Stops        = r.Stops.OrderBy(s => s.SortOrder).Select(s => MapStop(r, s)),
        }));
    }

    // ── حذف رحلة ─────────────────────────────────────────────────────────────
    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var route = await _db.DeliveryRoutes.FindAsync(id);
        if (route == null) return NotFound();
        _db.DeliveryRoutes.Remove(route);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static object MapStop(DeliveryRoute r, DeliveryStop s) => new
    {
        s.Id,
        RouteId       = r.Id,
        DriverId      = r.DriverId,
        VehiclePlate  = r.VehiclePlate,
        s.CustomerId,
        CustomerName    = s.Customer?.Name ?? "",
        CustomerPhone   = s.Customer?.Phone ?? "",
        CustomerAddress = s.Customer?.Address ?? "",
        CustomerLat     = s.Customer?.Latitude,
        CustomerLng     = s.Customer?.Longitude,
        s.InvoiceId,
        s.SortOrder,
        s.Status,
        s.AmountDue,
        s.AmountCollected,
        s.ArrivalTime,
        s.Note,
        Items = (s.Items == null ? Enumerable.Empty<object>() : s.Items.Select(i => (object)new
        {
            i.Id,
            i.ProductId,
            ProductName   = i.Product?.NameEn ?? "",
            ProductNameAr = i.Product?.NameAr ?? "",
            i.Unit,
            i.UnitPrice,
            QuantityOrdered   = i.QuantityOrdered,
            QuantityDelivered = i.QuantityDelivered,
        })).ToList(),
    };
}

// ── DTOs ─────────────────────────────────────────────────────────────────────
public record UpdateStopRequest(
    string Status,
    decimal AmountCollected,
    string? Notes,
    List<DeliveredItemRequest>? DeliveredItems
);

public record DeliveredItemRequest(int ItemId, decimal QuantityDelivered);

public record DeliverStopRequest(decimal CollectedAmount, List<DeliverItemDto>? Items);
public record DeliverItemDto(int ProductId, decimal QuantityDelivered);

public record CreateRouteRequest(
    DateTime RouteDate,
    string DriverId,
    string? VehiclePlate,
    string? Notes,
    List<CreateStopRequest> Stops
);

public record CreateStopRequest(
    int CustomerId,
    int? InvoiceId,
    decimal AmountDue,
    List<CreateStopItemRequest> Items
);

public record CreateStopItemRequest(
    int ProductId,
    decimal Quantity,
    decimal UnitPrice,
    string Unit
);

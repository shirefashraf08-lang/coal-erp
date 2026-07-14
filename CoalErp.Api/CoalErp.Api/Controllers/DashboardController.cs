using CoalErp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var today = DateTime.UtcNow.Date;
        var monthStart = new DateTime(today.Year, today.Month, 1);

        var todaySales = await _db.Invoices
            .Where(i => i.InvoiceDate >= today && i.Status != "Cancelled")
            .SumAsync(i => i.TotalAmount);

        var monthSales = await _db.Invoices
            .Where(i => i.InvoiceDate >= monthStart && i.Status != "Cancelled")
            .SumAsync(i => i.TotalAmount);

        var totalDebt = await _db.Customers
            .Where(c => c.CurrentBalance > 0 && c.IsActive)
            .SumAsync(c => c.CurrentBalance);

        var customerCount = await _db.Customers.CountAsync(c => c.IsActive);

        var todayDeliveries = await _db.DeliveryStops
            .Include(s => s.DeliveryRoute)
            .CountAsync(s => s.DeliveryRoute.RouteDate == today);

        var completedDeliveries = await _db.DeliveryStops
            .Include(s => s.DeliveryRoute)
            .CountAsync(s => s.DeliveryRoute.RouteDate == today && s.Status == "Delivered");

        var lowStockProducts = await _db.Products
            .CountAsync(p => p.IsActive && p.CurrentStock <= p.MinimumStock);

        var treasuryBalance = await _db.TreasuryTransactions
            .Where(t => t.Method == "Cash")
            .SumAsync(t => t.Type == "Income" ? t.Amount : -t.Amount);

        return Ok(new
        {
            TodaySales = todaySales,
            MonthSales = monthSales,
            TotalDebt = totalDebt,
            CustomerCount = customerCount,
            TodayDeliveries = todayDeliveries,
            CompletedDeliveries = completedDeliveries,
            LowStockProducts = lowStockProducts,
            CashBalance = treasuryBalance,
        });
    }

    [HttpGet("recent-invoices")]
    public async Task<IActionResult> GetRecentInvoices()
    {
        var invoices = await _db.Invoices
            .Include(i => i.Customer)
            .OrderByDescending(i => i.InvoiceDate)
            .Take(10)
            .Select(i => new
            {
                i.Id,
                i.InvoiceNumber,
                CustomerName = i.Customer.Name,
                i.TotalAmount,
                i.Status,
                i.PaymentType,
                i.InvoiceDate,
            })
            .ToListAsync();

        return Ok(invoices);
    }

    [HttpGet("top-customers")]
    public async Task<IActionResult> GetTopCustomers()
    {
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        var top = await _db.Invoices
            .Where(i => i.InvoiceDate >= monthStart && i.Status != "Cancelled")
            .GroupBy(i => new { i.CustomerId, i.Customer.Name })
            .Select(g => new
            {
                CustomerId = g.Key.CustomerId,
                CustomerName = g.Key.Name,
                TotalAmount = g.Sum(i => i.TotalAmount),
                OrderCount = g.Count(),
            })
            .OrderByDescending(x => x.TotalAmount)
            .Take(5)
            .ToListAsync();

        return Ok(top);
    }

    [HttpGet("sales-chart")]
    public async Task<IActionResult> GetSalesChart()
    {
        var last30Days = DateTime.UtcNow.Date.AddDays(-30);

        var daily = await _db.Invoices
            .Where(i => i.InvoiceDate >= last30Days && i.Status != "Cancelled")
            .GroupBy(i => i.InvoiceDate.Date)
            .Select(g => new { Date = g.Key, Total = g.Sum(i => i.TotalAmount) })
            .OrderBy(x => x.Date)
            .ToListAsync();

        return Ok(daily);
    }
}

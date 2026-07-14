using CoalErp.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Accountant")]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ReportsController(AppDbContext db) => _db = db;

    [HttpGet("sales")]
    public async Task<IActionResult> SalesReport(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? paymentType)
    {
        var start = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var end   = to   ?? DateTime.UtcNow.Date.AddDays(1);

        var query = _db.Invoices
            .Include(i => i.Customer)
            .Where(i => i.InvoiceDate >= start && i.InvoiceDate < end && i.Status != "Cancelled");

        if (!string.IsNullOrEmpty(paymentType))
            query = query.Where(i => i.PaymentType == paymentType);

        var invoices = await query.ToListAsync();

        return Ok(new
        {
            TotalSales    = invoices.Sum(i => i.TotalAmount),
            TotalPaid     = invoices.Sum(i => i.PaidAmount),
            TotalPending  = invoices.Where(i => i.Status != "Paid").Sum(i => i.TotalAmount - i.PaidAmount),
            InvoiceCount  = invoices.Count,
            CashSales     = invoices.Where(i => i.PaymentType == "Cash").Sum(i => i.TotalAmount),
            CreditSales   = invoices.Where(i => i.PaymentType == "Credit").Sum(i => i.TotalAmount),
            Invoices      = invoices.Select(i => new
            {
                i.Id, i.InvoiceNumber,
                CustomerName = i.Customer.Name,
                i.TotalAmount, i.PaidAmount,
                RemainingAmount = i.TotalAmount - i.PaidAmount,
                i.Status, i.PaymentType, i.InvoiceDate
            })
        });
    }

    [HttpGet("debt")]
    public async Task<IActionResult> DebtReport()
    {
        var debtors = await _db.Customers
            .Where(c => c.CurrentBalance > 0 && c.IsActive)
            .OrderByDescending(c => c.CurrentBalance)
            .Select(c => new
            {
                c.Id, c.Name, c.Phone, c.Address,
                c.CurrentBalance, c.PaymentType,
                c.CreditLimit,
                OverLimit = c.CurrentBalance > c.CreditLimit,
            })
            .ToListAsync();

        return Ok(new
        {
            TotalDebt = debtors.Sum(d => d.CurrentBalance),
            DebtorCount = debtors.Count,
            Debtors = debtors
        });
    }

    [HttpGet("inventory")]
    public async Task<IActionResult> InventoryReport()
    {
        var products = await _db.Products
            .Where(p => p.IsActive)
            .ToListAsync();

        var movements = await _db.InventoryMovements
            .Include(m => m.Product)
            .Where(m => m.MovementDate >= DateTime.UtcNow.AddDays(-30))
            .GroupBy(m => new { m.ProductId, m.Type })
            .Select(g => new { g.Key.ProductId, g.Key.Type, Total = g.Sum(m => m.Quantity) })
            .ToListAsync();

        return Ok(new
        {
            TotalProducts = products.Count,
            LowStockCount = products.Count(p => p.CurrentStock <= p.MinimumStock),
            StockValue    = products.Sum(p => p.CurrentStock * p.WholesalePrice),
            Products = products.Select(p => new
            {
                p.Id, p.NameAr, p.Category, p.Unit,
                p.CurrentStock, p.MinimumStock,
                IsLowStock = p.CurrentStock <= p.MinimumStock,
                StockValue = p.CurrentStock * p.WholesalePrice,
                InLast30 = movements.FirstOrDefault(m => m.ProductId == p.Id && m.Type == "In")?.Total ?? 0,
                OutLast30 = movements.FirstOrDefault(m => m.ProductId == p.Id && m.Type == "Out")?.Total ?? 0,
            })
        });
    }

    [HttpGet("treasury")]
    public async Task<IActionResult> TreasuryReport(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var start = from ?? DateTime.UtcNow.Date.AddDays(-30);
        var end   = to   ?? DateTime.UtcNow.Date.AddDays(1);

        var txs = await _db.TreasuryTransactions
            .Where(t => t.TransactionDate >= start && t.TransactionDate < end)
            .ToListAsync();

        return Ok(new
        {
            TotalIncome  = txs.Where(t => t.Type == "Income").Sum(t => t.Amount),
            TotalExpense = txs.Where(t => t.Type == "Expense").Sum(t => t.Amount),
            NetProfit    = txs.Where(t => t.Type == "Income").Sum(t => t.Amount)
                         - txs.Where(t => t.Type == "Expense").Sum(t => t.Amount),
            CashBalance  = txs.Where(t => t.Method == "Cash")
                             .Sum(t => t.Type == "Income" ? t.Amount : -t.Amount),
            BankBalance  = txs.Where(t => t.Method == "Bank")
                             .Sum(t => t.Type == "Income" ? t.Amount : -t.Amount),
            Transactions = txs.OrderByDescending(t => t.TransactionDate)
                              .Select(t => new { t.Id, t.Type, t.Amount, t.Description, t.Method, t.TransactionDate, t.Reference })
        });
    }
}

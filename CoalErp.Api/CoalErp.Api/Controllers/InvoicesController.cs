using System.Security.Claims;
using CoalErp.Api.Data;
using CoalErp.Api.Models.DTOs;
using CoalErp.Api.Models.Entities;
using CoalErp.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly InvoiceService _invoiceService;

    public InvoicesController(AppDbContext db, InvoiceService invoiceService)
    {
        _db = db;
        _invoiceService = invoiceService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? status,
        [FromQuery] int? customerId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query = _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Items).ThenInclude(it => it.Product)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(i => i.Status == status);

        if (customerId.HasValue)
            query = query.Where(i => i.CustomerId == customerId.Value);

        if (from.HasValue)
            query = query.Where(i => i.InvoiceDate >= from.Value);

        if (to.HasValue)
            query = query.Where(i => i.InvoiceDate <= to.Value);

        var invoices = await query.OrderByDescending(i => i.InvoiceDate).ToListAsync();
        return Ok(invoices.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var invoice = await _db.Invoices
            .Include(i => i.Customer)
            .Include(i => i.Items).ThenInclude(it => it.Product)
            .FirstOrDefaultAsync(i => i.Id == id);

        if (invoice == null) return NotFound();
        return Ok(MapToDto(invoice));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        var invoice = await _invoiceService.CreateInvoiceAsync(request, userId);
        return CreatedAtAction(nameof(GetById), new { id = invoice.Id }, invoice);
    }

    [HttpPost("{id}/payments")]
    [Authorize(Roles = "Admin,Accountant,Driver")]
    public async Task<IActionResult> AddPayment(int id, [FromBody] CreatePaymentRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
        await _invoiceService.RecordPaymentAsync(request with { InvoiceId = id }, userId);
        return Ok(new { message = "تم تسجيل الدفعة بنجاح" });
    }

    [HttpGet("debt-report")]
    public async Task<IActionResult> GetDebtReport()
    {
        var debtors = await _db.Customers
            .Where(c => c.CurrentBalance > 0 && c.IsActive)
            .OrderByDescending(c => c.CurrentBalance)
            .ToListAsync();

        return Ok(debtors.Select(c => new
        {
            CustomerId = c.Id,
            CustomerName = c.Name,
            Phone = c.Phone,
            Balance = c.CurrentBalance,
            PaymentType = c.PaymentType,
        }));
    }

    private static object MapToDto(Invoice i) => new
    {
        i.Id,
        i.InvoiceNumber,
        i.CustomerId,
        CustomerName  = i.Customer?.Name ?? "",
        CustomerPhone = i.Customer?.Phone ?? "",
        InvoiceDate   = i.InvoiceDate,
        DueDate       = i.DueDate,
        i.SubTotal,
        i.Discount,
        i.TotalAmount,
        i.PaidAmount,
        Remaining    = i.TotalAmount - i.PaidAmount,
        i.Status,
        i.PaymentType,
        i.Notes,
        Items = (i.Items == null ? Enumerable.Empty<object>() : i.Items.Select(it => (object)new
        {
            it.ProductId,
            ProductName   = it.Product?.NameEn ?? "",
            ProductNameAr = it.Product?.NameAr ?? "",
            it.Quantity,
            it.Unit,
            it.UnitPrice,
            TotalPrice = it.Quantity * it.UnitPrice * (1 - (it.Discount / 100m)),
            it.Discount,
        })).ToList(),
    };
}

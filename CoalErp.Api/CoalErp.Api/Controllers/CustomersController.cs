using CoalErp.Api.Data;
using CoalErp.Api.Models.DTOs;
using CoalErp.Api.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class CustomersController : ControllerBase
{
    private readonly AppDbContext _db;

    public CustomersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? search,
        [FromQuery] string? type,
        [FromQuery] bool? isActive)
    {
        var query = _db.Customers.AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.Name.Contains(search) || c.Phone.Contains(search));

        if (!string.IsNullOrWhiteSpace(type))
            query = query.Where(c => c.PaymentType == type);

        if (isActive.HasValue)
            query = query.Where(c => c.IsActive == isActive.Value);

        var customers = await query.OrderBy(c => c.Name).ToListAsync();
        return Ok(customers.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer == null) return NotFound();
        return Ok(MapToDto(customer));
    }

    [HttpGet("{id}/statement")]
    public async Task<IActionResult> GetStatement(int id)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer == null) return NotFound();

        var invoices = await _db.Invoices
            .Include(i => i.Items).ThenInclude(it => it.Product)
            .Where(i => i.CustomerId == id)
            .OrderByDescending(i => i.InvoiceDate)
            .ToListAsync();

        var payments = await _db.Payments
            .Where(p => p.CustomerId == id)
            .OrderByDescending(p => p.PaymentDate)
            .ToListAsync();

        return Ok(new CustomerStatementDto(
            Customer: MapToDto(customer),
            Invoices: invoices.Select(MapInvoiceToDto).ToList(),
            Payments: payments.Select(MapPaymentToDto).ToList(),
            TotalInvoiced: invoices.Sum(i => i.TotalAmount),
            TotalPaid: payments.Sum(p => p.Amount),
            Balance: customer.CurrentBalance
        ));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Create([FromBody] CreateCustomerRequest request)
    {
        var customer = new Customer
        {
            Name           = request.Name,
            Phone          = request.Phone,
            Address        = request.Address,
            PaymentType    = request.PaymentType,
            CreditLimit    = request.CreditLimit,
            OpeningBalance = request.OpeningBalance,
            CurrentBalance = request.OpeningBalance,  // start with opening balance
            Notes          = request.Notes,
        };
        _db.Customers.Add(customer);

        // Record opening balance as an adjustment
        if (request.OpeningBalance != 0)
        {
            await _db.SaveChangesAsync();
            _db.Adjustments.Add(new Models.Entities.Adjustment
            {
                Type           = "OpeningBalance",
                CustomerId     = customer.Id,
                Amount         = Math.Abs(request.OpeningBalance),
                Reason         = "رصيد افتتاحي",
                AdjustmentDate = DateTime.UtcNow,
            });
        }

        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = customer.Id }, MapToDto(customer));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Accountant")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateCustomerRequest request)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer == null) return NotFound();

        if (request.Name != null) customer.Name = request.Name;
        if (request.Phone != null) customer.Phone = request.Phone;
        if (request.Address != null) customer.Address = request.Address;
        if (request.PaymentType != null) customer.PaymentType = request.PaymentType;
        if (request.CreditLimit.HasValue) customer.CreditLimit = request.CreditLimit.Value;
        if (request.IsActive.HasValue) customer.IsActive = request.IsActive.Value;
        if (request.Notes != null) customer.Notes = request.Notes;

        await _db.SaveChangesAsync();
        return Ok(MapToDto(customer));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var customer = await _db.Customers.FindAsync(id);
        if (customer == null) return NotFound();
        customer.IsActive = false;  // Soft delete
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static CustomerDto MapToDto(Customer c) => new(
        c.Id, c.Name, c.Phone, c.Address, c.PaymentType,
        c.CreditLimit, c.OpeningBalance, c.CurrentBalance, c.IsActive, c.Notes, c.CreatedAt
    );

    private static InvoiceDto MapInvoiceToDto(Invoice i) => new(
        i.Id, i.InvoiceNumber, i.CustomerId, "", i.InvoiceDate, i.DueDate,
        i.SubTotal, i.Discount, i.TotalAmount, i.PaidAmount, i.TotalAmount - i.PaidAmount,
        i.Status, i.PaymentType, i.Notes,
        i.Items?.Select(it => new InvoiceItemDto(
            it.ProductId, it.Product?.NameAr ?? "", it.Quantity, it.Unit, it.UnitPrice, it.Quantity * it.UnitPrice
        )).ToList() ?? []
    );

    private static PaymentDto MapPaymentToDto(Payment p) => new(
        p.Id, p.CustomerId, "", p.InvoiceId, null, p.Amount, p.Method, p.PaymentDate, p.Notes, p.Reference
    );
}

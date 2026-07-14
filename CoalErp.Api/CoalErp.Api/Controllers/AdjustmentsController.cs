using System.Security.Claims;
using CoalErp.Api.Data;
using CoalErp.Api.Models.DTOs;
using CoalErp.Api.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Accountant")]
public class AdjustmentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdjustmentsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? type,
        [FromQuery] int? customerId,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query = _db.Adjustments
            .Include(a => a.Customer)
            .Include(a => a.Supplier)
            .AsQueryable();

        if (!string.IsNullOrEmpty(type)) query = query.Where(a => a.Type == type);
        if (customerId.HasValue)         query = query.Where(a => a.CustomerId == customerId.Value);
        if (from.HasValue)               query = query.Where(a => a.AdjustmentDate >= from.Value);
        if (to.HasValue)                 query = query.Where(a => a.AdjustmentDate <= to.Value);

        var list = await query.OrderByDescending(a => a.AdjustmentDate).ToListAsync();
        return Ok(list.Select(MapToDto));
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateAdjustmentRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var adj = new Adjustment
        {
            Type           = request.Type,
            CustomerId     = request.CustomerId,
            SupplierId     = request.SupplierId,
            Amount         = request.Amount,
            Reason         = request.Reason,
            Reference      = request.Reference,
            AdjustmentDate = request.AdjustmentDate ?? DateTime.UtcNow,
            CreatedById    = userId,
            Notes          = request.Notes,
        };

        _db.Adjustments.Add(adj);

        // Update customer balance
        if (request.CustomerId.HasValue)
        {
            var customer = await _db.Customers.FindAsync(request.CustomerId.Value);
            if (customer != null)
            {
                customer.CurrentBalance += request.Type switch
                {
                    "CustomerDebit"    =>  request.Amount,   // customer owes more
                    "CustomerCredit"   => -request.Amount,   // customer paid / credit
                    "OpeningBalance"   =>  request.Amount,
                    _                  =>  0m,
                };
            }
        }

        // Update supplier balance
        if (request.SupplierId.HasValue)
        {
            var supplier = await _db.Suppliers.FindAsync(request.SupplierId.Value);
            if (supplier != null)
            {
                supplier.CurrentBalance += request.Type switch
                {
                    "SupplierDebit"  => -request.Amount,  // we paid them
                    "SupplierCredit" =>  request.Amount,  // we owe more
                    _                =>  0m,
                };
            }
        }

        // Treasury entry for money movements
        if (request.Type is "CustomerCredit" or "SupplierDebit")
        {
            _db.TreasuryTransactions.Add(new TreasuryTransaction
            {
                Type        = request.Type == "CustomerCredit" ? "Income" : "Expense",
                Amount      = request.Amount,
                Description = $"تسوية — {request.Reason}",
                Method      = "Cash",
                CreatedById = userId,
                Reference   = request.Reference,
            });
        }

        await _db.SaveChangesAsync();
        return Ok(MapToDto(adj));
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var adj = await _db.Adjustments
            .Include(a => a.Customer)
            .Include(a => a.Supplier)
            .FirstOrDefaultAsync(a => a.Id == id);

        if (adj == null) return NotFound();

        // Reverse the balance change
        if (adj.Customer != null)
        {
            adj.Customer.CurrentBalance -= adj.Type switch
            {
                "CustomerDebit"  =>  adj.Amount,
                "CustomerCredit" => -adj.Amount,
                "OpeningBalance" =>  adj.Amount,
                _                =>  0m,
            };
        }

        _db.Adjustments.Remove(adj);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static AdjustmentDto MapToDto(Adjustment a) => new(
        a.Id, a.Type,
        a.CustomerId, a.Customer?.Name,
        a.SupplierId, a.Supplier?.Name,
        a.Amount, a.Reason, a.Reference,
        a.AdjustmentDate, a.Notes
    );
}

using CoalErp.Api.Data;
using CoalErp.Api.Models.Entities;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin,Accountant")]
public class TreasuryController : ControllerBase
{
    private readonly AppDbContext _db;

    public TreasuryController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? type)
    {
        var query = _db.TreasuryTransactions.AsQueryable();

        if (from.HasValue) query = query.Where(t => t.TransactionDate >= from.Value);
        if (to.HasValue)   query = query.Where(t => t.TransactionDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(type)) query = query.Where(t => t.Type == type);

        var transactions = await query.OrderByDescending(t => t.TransactionDate).ToListAsync();

        var totalIncome  = transactions.Where(t => t.Type == "Income").Sum(t => t.Amount);
        var totalExpense = transactions.Where(t => t.Type == "Expense").Sum(t => t.Amount);

        return Ok(new
        {
            Transactions = transactions.Select(t => new
            {
                t.Id, t.Type, t.Amount, t.Description, t.Method,
                t.TransactionDate, t.Reference
            }),
            TotalIncome  = totalIncome,
            TotalExpense = totalExpense,
            NetBalance   = totalIncome - totalExpense,
        });
    }

    [HttpPost]
    public async Task<IActionResult> AddTransaction([FromBody] TreasuryTransactionRequest request)
    {
        var tx = new TreasuryTransaction
        {
            Type        = request.Type,
            Amount      = request.Amount,
            Description = request.Description,
            Method      = request.Method,
            Reference   = request.Reference,
        };
        _db.TreasuryTransactions.Add(tx);
        await _db.SaveChangesAsync();
        return Ok(tx);
    }
}

public record TreasuryTransactionRequest(
    string Type,
    decimal Amount,
    string Description,
    string Method,
    string? Reference
);

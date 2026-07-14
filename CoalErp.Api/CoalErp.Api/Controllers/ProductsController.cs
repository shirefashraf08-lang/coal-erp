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
public class ProductsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProductsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] bool? lowStock)
    {
        var query = _db.Products.Where(p => p.IsActive).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(p => p.NameAr.Contains(search) || p.NameEn.Contains(search) || p.Category.Contains(search));

        if (lowStock == true)
            query = query.Where(p => p.CurrentStock <= p.MinimumStock);

        var products = await query.ToListAsync();
        return Ok(products.Select(MapToDto));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var p = await _db.Products.FindAsync(id);
        if (p == null) return NotFound();
        return Ok(MapToDto(p));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Warehouse")]
    public async Task<IActionResult> Create([FromBody] CreateProductRequest request)
    {
        var product = new Product
        {
            NameAr         = request.NameAr,
            NameEn         = request.NameEn,
            Category       = request.Category,
            Unit           = request.Unit,
            WholesalePrice = request.WholesalePrice,
            RetailPrice    = request.RetailPrice,
            MinimumStock   = request.MinimumStock,
            CurrentStock   = request.OpeningStock,
            ImageUrl       = request.ImageUrl,
            Barcode        = request.Barcode,
            Notes          = request.Notes,
        };
        _db.Products.Add(product);

        // Record opening stock as inventory movement
        if (request.OpeningStock > 0)
        {
            _db.InventoryMovements.Add(new Models.Entities.InventoryMovement
            {
                ProductId = 0, // will be set after SaveChanges
                Type      = "In",
                Reason    = "Opening",
                Quantity  = request.OpeningStock,
                Unit      = request.Unit,
                Warehouse = "Main",
            });
        }

        await _db.SaveChangesAsync();

        // Fix movement product id
        if (request.OpeningStock > 0)
        {
            var mv = await _db.InventoryMovements
                .OrderByDescending(m => m.Id).FirstOrDefaultAsync();
            if (mv != null) { mv.ProductId = product.Id; await _db.SaveChangesAsync(); }
        }

        return CreatedAtAction(nameof(GetById), new { id = product.Id }, MapToDto(product));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,Warehouse")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateProductRequest request)
    {
        var p = await _db.Products.FindAsync(id);
        if (p == null) return NotFound();

        if (request.NameAr != null)           p.NameAr         = request.NameAr;
        if (request.NameEn != null)           p.NameEn         = request.NameEn;
        if (request.Category != null)         p.Category       = request.Category;
        if (request.Unit != null)             p.Unit           = request.Unit;
        if (request.WholesalePrice.HasValue)  p.WholesalePrice = request.WholesalePrice.Value;
        if (request.RetailPrice.HasValue)     p.RetailPrice    = request.RetailPrice.Value;
        if (request.MinimumStock.HasValue)    p.MinimumStock   = request.MinimumStock.Value;
        if (request.ImageUrl != null)         p.ImageUrl       = request.ImageUrl;
        if (request.Barcode != null)          p.Barcode        = request.Barcode;
        if (request.Notes != null)            p.Notes          = request.Notes;
        if (request.IsActive.HasValue)        p.IsActive       = request.IsActive.Value;

        await _db.SaveChangesAsync();
        return Ok(MapToDto(p));
    }

    [HttpGet("movements")]
    public async Task<IActionResult> GetAllMovements(
        [FromQuery] int? productId,
        [FromQuery] string? type,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to)
    {
        var query = _db.InventoryMovements
            .Include(m => m.Product)
            .AsQueryable();

        if (productId.HasValue) query = query.Where(m => m.ProductId == productId.Value);
        if (!string.IsNullOrEmpty(type)) query = query.Where(m => m.Type == type);
        if (from.HasValue) query = query.Where(m => m.MovementDate >= from.Value);
        if (to.HasValue)   query = query.Where(m => m.MovementDate <= to.Value);

        var movements = await query.OrderByDescending(m => m.MovementDate).ToListAsync();
        return Ok(movements.Select(m => new
        {
            m.Id, m.ProductId,
            ProductName   = m.Product?.NameEn ?? "",
            ProductNameAr = m.Product?.NameAr ?? "",
            m.Type, m.Reason, m.Quantity, m.Unit, m.Warehouse, m.MovementDate, m.Notes
        }));
    }

    [HttpGet("{id}/movements")]
    public async Task<IActionResult> GetMovements(int id)
    {
        var movements = await _db.InventoryMovements
            .Where(m => m.ProductId == id)
            .Include(m => m.Product)
            .OrderByDescending(m => m.MovementDate)
            .ToListAsync();

        return Ok(movements.Select(m => new InventoryMovementDto(
            m.Id, m.ProductId, m.Product.NameAr, m.Type, m.Reason,
            m.Quantity, m.Unit, m.Warehouse, m.MovementDate, m.Notes
        )));
    }

    [HttpPost("movements")]
    [Authorize(Roles = "Admin,Warehouse")]
    public async Task<IActionResult> AddMovement(
        [FromBody] CreateInventoryMovementRequest request,
        [FromServices] IHttpContextAccessor httpContext)
    {
        var product = await _db.Products.FindAsync(request.ProductId);
        if (product == null) return NotFound("Product not found");

        var movement = new InventoryMovement
        {
            ProductId = request.ProductId,
            Type = request.Type,
            Reason = request.Reason,
            Quantity = request.Quantity,
            Unit = request.Unit,
            Warehouse = request.Warehouse,
            Notes = request.Notes,
            CreatedById = httpContext.HttpContext?.User.FindFirst("sub")?.Value,
        };
        _db.InventoryMovements.Add(movement);

        // Update stock
        product.CurrentStock += request.Type == "In" ? request.Quantity : -request.Quantity;

        await _db.SaveChangesAsync();
        return Ok(new InventoryMovementDto(
            movement.Id, movement.ProductId, product.NameAr, movement.Type, movement.Reason,
            movement.Quantity, movement.Unit, movement.Warehouse, movement.MovementDate, movement.Notes
        ));
    }

    private static ProductDto MapToDto(Product p) => new(
        p.Id, p.NameAr, p.NameEn, p.Category, p.Unit,
        p.WholesalePrice, p.RetailPrice, p.CurrentStock, p.MinimumStock,
        p.ImageUrl, p.Barcode, p.Notes,
        p.IsActive, p.CurrentStock <= p.MinimumStock, p.CreatedAt
    );
}

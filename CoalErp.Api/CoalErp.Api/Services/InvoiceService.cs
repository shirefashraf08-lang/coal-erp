using CoalErp.Api.Data;
using CoalErp.Api.Models.DTOs;
using CoalErp.Api.Models.Entities;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Services;

public class InvoiceService
{
    private readonly AppDbContext _db;

    public InvoiceService(AppDbContext db) => _db = db;

    public async Task<string> GenerateInvoiceNumberAsync()
    {
        var lastInvoice = await _db.Invoices
            .OrderByDescending(x => x.Id)
            .FirstOrDefaultAsync();

        int next = lastInvoice is null ? 1 : lastInvoice.Id + 1;
        return $"INV-{next:D4}";
    }

    public async Task<Invoice> CreateInvoiceAsync(CreateInvoiceRequest request, string createdById)
    {
        decimal subTotal = 0;
        var items = new List<InvoiceItem>();

        foreach (var item in request.Items)
        {
            var product = await _db.Products.FindAsync(item.ProductId)
                ?? throw new KeyNotFoundException($"Product {item.ProductId} not found");

            var lineTotal = item.Quantity * item.UnitPrice * (1 - item.Discount / 100m);
            var invoiceItem = new InvoiceItem
            {
                ProductId = item.ProductId,
                Quantity  = item.Quantity,
                Unit      = item.Unit,
                UnitPrice = item.UnitPrice,
                Discount  = item.Discount,
            };
            items.Add(invoiceItem);
            subTotal += lineTotal;

            // Deduct from stock
            product.CurrentStock -= item.Quantity;
            _db.InventoryMovements.Add(new InventoryMovement
            {
                ProductId   = item.ProductId,
                Type        = "Out",
                Reason      = "Sale",
                Quantity    = item.Quantity,
                Unit        = item.Unit,
                Warehouse   = "Main",
                CreatedById = createdById,
            });
        }

        var total    = subTotal - request.Discount;
        var paid     = request.PaidAmount > 0 ? Math.Min(request.PaidAmount, total) : 0;
        if (request.PaymentType == "Cash") paid = total;   // cash = fully paid

        var invoice = new Invoice
        {
            InvoiceNumber = !string.IsNullOrWhiteSpace(request.InvoiceNumber)
                                ? request.InvoiceNumber
                                : await GenerateInvoiceNumberAsync(),
            CustomerId  = request.CustomerId,
            CreatedById = createdById,
            InvoiceDate = request.InvoiceDate ?? DateTime.UtcNow,
            DueDate     = request.DueDate,
            SubTotal    = subTotal,
            Discount    = request.Discount,
            TotalAmount = total,
            PaidAmount  = paid,
            Status      = paid >= total ? "Paid" : paid > 0 ? "Partial" : "Pending",
            PaymentType = request.PaymentType,
            Notes       = request.Notes,
            Items       = items,
        };

        _db.Invoices.Add(invoice);

        // Update customer balance
        var customer = await _db.Customers.FindAsync(request.CustomerId);
        if (customer != null)
            customer.CurrentBalance += total - paid;  // only unpaid part increases balance

        await _db.SaveChangesAsync();

        // Treasury for paid portion
        if (paid > 0)
        {
            _db.TreasuryTransactions.Add(new TreasuryTransaction
            {
                Type        = "Income",
                Amount      = paid,
                Description = $"فاتورة {invoice.InvoiceNumber}",
                Method      = "Cash",
                CreatedById = createdById,
                InvoiceId   = invoice.Id,
            });
            await _db.SaveChangesAsync();
        }

        return invoice;
    }

    public async Task RecordPaymentAsync(CreatePaymentRequest request, string receivedById)
    {
        var payment = new Payment
        {
            CustomerId = request.CustomerId,
            InvoiceId = request.InvoiceId,
            Amount = request.Amount,
            Method = request.Method,
            PaymentDate = DateTime.UtcNow,
            ReceivedById = receivedById,
            Notes = request.Notes,
            Reference = request.Reference,
        };
        _db.Payments.Add(payment);

        // Update invoice
        if (request.InvoiceId.HasValue)
        {
            var invoice = await _db.Invoices.FindAsync(request.InvoiceId.Value);
            if (invoice != null)
            {
                invoice.PaidAmount += request.Amount;
                invoice.Status = invoice.PaidAmount >= invoice.TotalAmount ? "Paid"
                    : invoice.PaidAmount > 0 ? "Partial"
                    : "Pending";
            }
        }

        // Update customer balance
        var customer = await _db.Customers.FindAsync(request.CustomerId);
        if (customer != null)
            customer.CurrentBalance -= request.Amount;

        // Treasury
        _db.TreasuryTransactions.Add(new TreasuryTransaction
        {
            Type = "Income",
            Amount = request.Amount,
            Description = $"تحصيل من العميل",
            Method = request.Method,
            CreatedById = receivedById,
            PaymentId = payment.Id,
        });

        await _db.SaveChangesAsync();
    }
}

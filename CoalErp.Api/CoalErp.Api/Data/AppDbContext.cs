using CoalErp.Api.Models.Entities;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace CoalErp.Api.Data;

public class AppDbContext : IdentityDbContext<AppUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Product> Products => Set<Product>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Supplier> Suppliers => Set<Supplier>();
    public DbSet<Invoice> Invoices => Set<Invoice>();
    public DbSet<InvoiceItem> InvoiceItems => Set<InvoiceItem>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<PurchaseInvoice> PurchaseInvoices => Set<PurchaseInvoice>();
    public DbSet<InventoryMovement> InventoryMovements => Set<InventoryMovement>();
    public DbSet<TreasuryTransaction> TreasuryTransactions => Set<TreasuryTransaction>();
    public DbSet<DeliveryRoute> DeliveryRoutes => Set<DeliveryRoute>();
    public DbSet<DeliveryStop> DeliveryStops => Set<DeliveryStop>();
    public DbSet<DeliveryStopItem> DeliveryStopItems => Set<DeliveryStopItem>();
    public DbSet<Adjustment> Adjustments => Set<Adjustment>();
    public DbSet<VehicleLoad> VehicleLoads => Set<VehicleLoad>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        // Precision for monetary values
        builder.Entity<Invoice>(e =>
        {
            e.Property(x => x.SubTotal).HasPrecision(18, 3);
            e.Property(x => x.Discount).HasPrecision(18, 3);
            e.Property(x => x.TotalAmount).HasPrecision(18, 3);
            e.Property(x => x.PaidAmount).HasPrecision(18, 3);
            e.Ignore(x => x.RemainingAmount); // computed, not stored
        });

        builder.Entity<InvoiceItem>(e =>
        {
            e.Property(x => x.Quantity).HasPrecision(18, 3);
            e.Property(x => x.UnitPrice).HasPrecision(18, 3);
            e.Ignore(x => x.TotalPrice); // computed
        });

        builder.Entity<Product>(e =>
        {
            e.Property(x => x.WholesalePrice).HasPrecision(18, 3);
            e.Property(x => x.RetailPrice).HasPrecision(18, 3);
            e.Property(x => x.CurrentStock).HasPrecision(18, 3);
            e.Property(x => x.MinimumStock).HasPrecision(18, 3);
        });

        builder.Entity<Customer>(e =>
        {
            e.Property(x => x.CreditLimit).HasPrecision(18, 3);
            e.Property(x => x.CurrentBalance).HasPrecision(18, 3);
        });

        builder.Entity<Payment>(e =>
        {
            e.Property(x => x.Amount).HasPrecision(18, 3);
        });

        builder.Entity<TreasuryTransaction>(e =>
        {
            e.Property(x => x.Amount).HasPrecision(18, 3);
        });

        builder.Entity<InventoryMovement>(e =>
        {
            e.Property(x => x.Quantity).HasPrecision(18, 3);
        });

        builder.Entity<PurchaseInvoice>(e =>
        {
            e.Property(x => x.TotalAmount).HasPrecision(18, 3);
            e.Property(x => x.PaidAmount).HasPrecision(18, 3);
            e.Ignore(x => x.RemainingAmount);
        });

        builder.Entity<DeliveryStop>(e =>
        {
            e.Property(x => x.AmountDue).HasPrecision(18, 3);
            e.Property(x => x.AmountCollected).HasPrecision(18, 3);
        });

        builder.Entity<DeliveryStopItem>(e =>
        {
            e.Property(x => x.Quantity).HasPrecision(18, 3);
        });

        // Auto-number invoices
        builder.Entity<Invoice>()
            .HasIndex(x => x.InvoiceNumber)
            .IsUnique();

        // Prevent cascade delete loops
        builder.Entity<Payment>()
            .HasOne(x => x.Invoice)
            .WithMany(x => x.Payments)
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}

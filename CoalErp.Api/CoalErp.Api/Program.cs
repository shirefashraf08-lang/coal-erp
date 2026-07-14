using System.Text;
using CoalErp.Api.Data;
using CoalErp.Api.Models.Entities;
using CoalErp.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    WebRootPath = "wwwroot/browser"   // Angular 17+ outputs to browser subfolder
});

// ── Database ──────────────────────────────────────────────────────────────
// PostgreSQL in production (Render/Supabase), SQLite in development
var dbUrl = Environment.GetEnvironmentVariable("DATABASE_URL")
         ?? builder.Configuration.GetConnectionString("Default");

builder.Services.AddDbContext<AppDbContext>(opt =>
{
    if (!string.IsNullOrEmpty(dbUrl) &&
        (dbUrl.StartsWith("postgresql://") || dbUrl.StartsWith("postgres://")))
    {
        opt.UseNpgsql(dbUrl);
    }
    else
    {
        opt.UseSqlite(dbUrl ?? "Data Source=coalerp.db");
    }
});

// ── Identity ──────────────────────────────────────────────────────────────
builder.Services.AddIdentity<AppUser, IdentityRole>(opt =>
{
    opt.Password.RequiredLength = 6;
    opt.Password.RequireDigit = false;
    opt.Password.RequireNonAlphanumeric = false;
    opt.Password.RequireUppercase = false;
})
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// ── JWT ───────────────────────────────────────────────────────────────────
var jwtKey = builder.Configuration["Jwt:Key"]
    ?? throw new InvalidOperationException("JWT Key is missing in configuration");

builder.Services.AddAuthentication(opt =>
{
    opt.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    opt.DefaultChallengeScheme    = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(opt =>
{
    opt.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer           = true,
        ValidateAudience         = true,
        ValidateLifetime         = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer              = builder.Configuration["Jwt:Issuer"],
        ValidAudience            = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
    };
});

builder.Services.AddAuthorization();

// ── Services ──────────────────────────────────────────────────────────────
builder.Services.AddScoped<JwtService>();
builder.Services.AddScoped<InvoiceService>();
builder.Services.AddHttpContextAccessor();

// ── Controllers ───────────────────────────────────────────────────────────
builder.Services.AddControllers();

// ── CORS ──────────────────────────────────────────────────────────────────
builder.Services.AddCors(opt =>
{
    opt.AddPolicy("Angular", policy => policy
        .AllowAnyOrigin()
        .AllowAnyHeader()
        .AllowAnyMethod());
});

// ── Swagger ───────────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Coal Factory ERP API",
        Version = "v1",
        Description = "نظام إدارة مصنع الفحم - API"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "أدخل: Bearer {token}",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            []
        }
    });
});

var app = builder.Build();

// ── Middleware ────────────────────────────────────────────────────────────
// Always show Swagger and seed in dev+prod for demo purposes
if (true || app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Coal ERP API v1"));

    // Seed initial admin user
    using var scope = app.Services.CreateScope();
    await SeedAsync(scope.ServiceProvider);
}

app.UseCors("Angular");

// ── Serve Angular SPA ─────────────────────────────────────────────────────
app.UseDefaultFiles();   // serves index.html for /
app.UseStaticFiles();    // serves wwwroot/*

app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

// SPA fallback: any non-API route → index.html
app.MapFallbackToFile("index.html");

app.Run();

// ── Seeder ────────────────────────────────────────────────────────────────
static async Task SeedAsync(IServiceProvider services)
{
    var db = services.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();

    var userManager = services.GetRequiredService<UserManager<AppUser>>();

    if (await userManager.FindByNameAsync("admin") == null)
    {
        var admin = new AppUser
        {
            UserName = "admin",
            FullName = "مدير النظام",
            Role = "Admin",
            IsActive = true,
            Email = "admin@coalerp.local",
            EmailConfirmed = true,
        };
        await userManager.CreateAsync(admin, "Admin@1234");

        var driver = new AppUser
        {
            UserName = "driver1",
            FullName = "أحمد السائق",
            Role = "Driver",
            IsActive = true,
            VehiclePlate = "ABC-1234",
            Email = "driver@coalerp.local",
            EmailConfirmed = true,
        };
        await userManager.CreateAsync(driver, "Driver@1234");
    }

}

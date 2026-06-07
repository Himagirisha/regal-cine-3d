using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using RegalCine.Api.Data;
using RegalCine.Api.Models;
using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

// ── Port binding — respect Render/Railway PORT env var, fall back to 8080 ───
var port = Environment.GetEnvironmentVariable("PORT") ?? "8080";
builder.WebHost.UseUrls($"http://0.0.0.0:{port}");

// ── Connection string: DATABASE_URL env var (Render/Railway) wins over appsettings
var rawConn = Environment.GetEnvironmentVariable("DATABASE_URL")
           ?? builder.Configuration.GetConnectionString("DefaultConnection")!;

// Convert postgres:// URI → Npgsql format when running on Render/Railway
if (rawConn.StartsWith("postgres://") || rawConn.StartsWith("postgresql://"))
{
    var uri     = new Uri(rawConn);
    var userInfo = uri.UserInfo.Split(':', 2);
    rawConn = $"Host={uri.Host};Port={uri.Port};Database={uri.AbsolutePath.TrimStart('/')};" +
              $"Username={userInfo[0]};Password={userInfo[1]};SSL Mode=Require;Trust Server Certificate=true";
}

// ── PostgreSQL ───────────────────────────────────────────────────────────────
builder.Services.AddDbContext<CineDbContext>(opt => opt.UseNpgsql(rawConn));

// ── JWT secret: JWT_SECRET env var wins over appsettings ────────────────────
var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET")
             ?? builder.Configuration["Jwt:Secret"]
             ?? throw new InvalidOperationException("JWT secret is not configured.");

var jwtKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret));

// ── JWT Authentication ───────────────────────────────────────────────────────
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer           = true,
            ValidateAudience         = true,
            ValidateLifetime         = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer              = "regal-cine-api",
            ValidAudience            = "regal-cine-client",
            IssuerSigningKey         = jwtKey,
            ClockSkew                = TimeSpan.FromMinutes(1),
        };
    });

builder.Services.AddAuthorization();

// ── CORS ─────────────────────────────────────────────────────────────────────
// AllowAnyOrigin() is incompatible with credentialed requests (Authorization header).
// Enumerate allowed origins explicitly so both guest and authenticated calls work.
var allowedOrigins = (Environment.GetEnvironmentVariable("ALLOWED_ORIGINS") ?? "")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
    {
        var origins = new[]
        {
            "https://himagirisha.github.io",
            "http://localhost:5173",
            "http://localhost:4173",
        }.Concat(allowedOrigins).Distinct().ToArray();

        policy.WithOrigins(origins)
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    }));

// ── Swagger with Bearer auth support ─────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "The Regal Cine API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name        = "Authorization",
        Type        = SecuritySchemeType.Http,
        Scheme      = "Bearer",
        BearerFormat = "JWT",
        In          = ParameterLocation.Header,
        Description = "Paste your JWT token here (without the 'Bearer ' prefix).",
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });
});

var app = builder.Build();

// ── Auto-create tables on startup (no EF migrations needed) ─────────────────
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<CineDbContext>();
    db.Database.EnsureCreated();
}

// CORS must be the first middleware so preflight OPTIONS requests get
// the Access-Control-Allow-* headers before any other middleware fires.
app.UseCors();

app.UseSwagger();
app.UseSwaggerUI(c =>
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Regal Cine API v1"));

app.UseAuthentication();
app.UseAuthorization();

// ── Time slot catalogue ──────────────────────────────────────────────────────
string[] AllSlots =
[
    "12:00 PM - 03:00 PM",
    "04:00 PM - 07:00 PM",
    "08:00 PM - 11:00 PM",
];

// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ENDPOINTS   /api/auth
// ═══════════════════════════════════════════════════════════════════════════════

var auth = app.MapGroup("/api/auth").WithTags("Auth");

// POST /api/auth/register ─────────────────────────────────────────────────────
auth.MapPost("/register", async (RegisterRequest req, CineDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
        return Results.BadRequest(new { error = "Username and password are required." });

    if (req.Password.Length < 8)
        return Results.BadRequest(new { error = "Password must be at least 8 characters." });

    bool taken = await db.Users.AnyAsync(u => u.Username == req.Username);
    if (taken)
        return Results.Conflict(new { error = "That username is already taken." });

    var user = new User
    {
        Username     = req.Username.Trim(),
        PasswordHash = HashPassword(req.Password),
        Role         = "Customer",
        CreatedAt    = DateTime.UtcNow,
    };

    db.Users.Add(user);
    await db.SaveChangesAsync();

    return Results.Created($"/api/auth/{user.Id}", new
    {
        user.Id,
        user.Username,
        user.Role,
        user.CreatedAt,
    });
})
.WithName("Register")
.WithSummary("Register a new customer account")
.AllowAnonymous();

// POST /api/auth/login ────────────────────────────────────────────────────────
auth.MapPost("/login", async (LoginRequest req, CineDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.Username) || string.IsNullOrWhiteSpace(req.Password))
        return Results.BadRequest(new { error = "Username and password are required." });

    var user = await db.Users.FirstOrDefaultAsync(u => u.Username == req.Username);

    // Use constant-time comparison to prevent user enumeration timing attacks
    if (user is null || !VerifyPassword(req.Password, user.PasswordHash))
        return Results.Unauthorized();

    var token   = GenerateJwt(user, jwtSecret);
    var expires = DateTime.UtcNow.AddHours(8);

    return Results.Ok(new
    {
        token,
        expiresAt = expires,
        user = new { user.Id, user.Username, user.Role },
    });
})
.WithName("Login")
.WithSummary("Authenticate and receive a signed JWT token")
.AllowAnonymous();

// ═══════════════════════════════════════════════════════════════════════════════
// BOOKING ENDPOINTS   /api/bookings
// ═══════════════════════════════════════════════════════════════════════════════

var bookings = app.MapGroup("/api/bookings").WithTags("Bookings");

// GET /api/bookings — Admin only ──────────────────────────────────────────────
bookings.MapGet("/", async (CineDbContext db) =>
    Results.Ok(await db.Bookings.ToListAsync()))
    .RequireAuthorization(policy => policy.RequireRole("Admin"))
    .WithName("GetAllBookings")
    .WithSummary("[Admin] Returns all reservations in the system");

// GET /api/bookings/my-reservations — any authenticated user ──────────────────
bookings.MapGet("/my-reservations", async (HttpContext ctx, CineDbContext db) =>
{
    var userIdClaim = ctx.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
    if (!Guid.TryParse(userIdClaim, out var userId))
        return Results.Unauthorized();

    var list = await db.Bookings
        .Where(b => b.UserId == userId)
        .ToListAsync();

    return Results.Ok(list);
})
.RequireAuthorization()
.WithName("GetMyReservations")
.WithSummary("Returns the authenticated user's own reservations");

// GET /api/bookings/available-slots?date=YYYY-MM-DD — public ──────────────────
bookings.MapGet("/available-slots", async (string date, CineDbContext db) =>
{
    if (!DateOnly.TryParseExact(date, "yyyy-MM-dd", CultureInfo.InvariantCulture,
            DateTimeStyles.None, out var parsedDate))
    {
        return Results.BadRequest(new { error = "Invalid date. Expected YYYY-MM-DD." });
    }

    var booked = (await db.Bookings
        .Where(b => b.Date == parsedDate)
        .Select(b => b.TimeSlot)
        .ToListAsync())
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    return Results.Ok(new
    {
        date,
        availableSlots = AllSlots.Where(s => !booked.Contains(s)).ToArray(),
    });
})
.AllowAnonymous()
.WithName("GetAvailableSlots")
.WithSummary("Returns open time slots for a given date");

// POST /api/bookings — open; links to user account if JWT is present ───────────
bookings.MapPost("/", async (CreateBookingRequest req, HttpContext ctx, CineDbContext db) =>
{
    if (string.IsNullOrWhiteSpace(req.GuestName)       ||
        string.IsNullOrWhiteSpace(req.ContactNumber)   ||
        string.IsNullOrWhiteSpace(req.CelebrationType) ||
        string.IsNullOrWhiteSpace(req.TimeSlot)        ||
        req.TotalGuests <= 0)
    {
        return Results.BadRequest(new
        {
            error = "All fields are required and TotalGuests must be a positive number."
        });
    }

    bool conflict = await db.Bookings
        .AnyAsync(b => b.Date == req.Date && b.TimeSlot == req.TimeSlot);

    if (conflict)
        return Results.Conflict(new
        {
            error = $"The slot '{req.TimeSlot}' on {req.Date:yyyy-MM-dd} is already reserved."
        });

    // Associate with authenticated user if a valid token was supplied
    Guid? userId = null;
    if (Guid.TryParse(ctx.User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var parsedId))
        userId = parsedId;

    var booking = new Booking
    {
        UserId          = userId,
        GuestName       = req.GuestName.Trim(),
        ContactNumber   = req.ContactNumber.Trim(),
        CelebrationType = req.CelebrationType.Trim(),
        Date            = req.Date,
        TimeSlot        = req.TimeSlot.Trim(),
        TotalGuests     = req.TotalGuests,
    };

    db.Bookings.Add(booking);
    await db.SaveChangesAsync();

    return Results.Created($"/api/bookings/{booking.Id}", booking);
})
.AllowAnonymous()
.WithName("CreateBooking")
.WithSummary("Create a reservation (guest or authenticated). Rejects duplicate date+slot.");

app.Run();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

static string HashPassword(string password)
{
    var salt = RandomNumberGenerator.GetBytes(16);
    using var pbkdf2 = new Rfc2898DeriveBytes(
        password, salt, iterations: 350_000, HashAlgorithmName.SHA256);
    var hash     = pbkdf2.GetBytes(32);
    var combined = new byte[48];
    Buffer.BlockCopy(salt, 0, combined, 0,  16);
    Buffer.BlockCopy(hash, 0, combined, 16, 32);
    return Convert.ToBase64String(combined);
}

static bool VerifyPassword(string password, string storedHash)
{
    byte[] combined;
    try { combined = Convert.FromBase64String(storedHash); }
    catch { return false; }
    if (combined.Length != 48) return false;

    var salt = combined[..16];
    var key  = combined[16..];
    using var pbkdf2 = new Rfc2898DeriveBytes(
        password, salt, iterations: 350_000, HashAlgorithmName.SHA256);
    return CryptographicOperations.FixedTimeEquals(pbkdf2.GetBytes(32), key);
}

static string GenerateJwt(User user, string secret)
{
    var key   = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
    var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
    var claims = new[]
    {
        new Claim(JwtRegisteredClaimNames.Sub,        user.Id.ToString()),
        new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
        new Claim(ClaimTypes.Role,                    user.Role),
        new Claim(JwtRegisteredClaimNames.Jti,        Guid.NewGuid().ToString()),
    };
    var token = new JwtSecurityToken(
        issuer:             "regal-cine-api",
        audience:           "regal-cine-client",
        claims:             claims,
        expires:            DateTime.UtcNow.AddHours(8),
        signingCredentials: creds);
    return new JwtSecurityTokenHandler().WriteToken(token);
}

// ─── DTOs ────────────────────────────────────────────────────────────────────
record RegisterRequest(string Username, string Password);
record LoginRequest(string Username, string Password);
record CreateBookingRequest(
    string   GuestName,
    string   ContactNumber,
    string   CelebrationType,
    DateOnly Date,
    string   TimeSlot,
    int      TotalGuests
);

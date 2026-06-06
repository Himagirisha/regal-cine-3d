using Microsoft.EntityFrameworkCore;
using RegalCine.Api.Data;
using RegalCine.Api.Models;
using System.Globalization;

var builder = WebApplication.CreateBuilder(args);

// ── Bind to 0.0.0.0:8080 for containerised environments ─────────────────────
builder.WebHost.UseUrls("http://0.0.0.0:8080");

// ── CORS — allow all origins so the GitHub Pages frontend can call the API ──
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod()));

// ── EF Core — InMemory database (zero-config, perfect for free-tier hosting) ─
builder.Services.AddDbContext<CineDbContext>(opt =>
    opt.UseInMemoryDatabase("CineDb"));

// ── Swagger / OpenAPI ────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
    c.SwaggerDoc("v1", new() { Title = "The Regal Cine API", Version = "v1" }));

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI(c =>
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Regal Cine API v1"));

app.UseCors();

// ── Cinema suite time-slot catalogue ─────────────────────────────────────────
string[] AllSlots =
[
    "12:00 PM - 03:00 PM",
    "04:00 PM - 07:00 PM",
    "08:00 PM - 11:00 PM",
];

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings — return every reservation
// ─────────────────────────────────────────────────────────────────────────────
app.MapGet("/api/bookings", async (CineDbContext db) =>
    Results.Ok(await db.Bookings.ToListAsync()))
    .WithName("GetAllBookings")
    .WithSummary("Returns all existing reservations")
    .Produces<List<Booking>>();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings — validate, conflict-check, then persist
// ─────────────────────────────────────────────────────────────────────────────
app.MapPost("/api/bookings", async (CreateBookingRequest req, CineDbContext db) =>
{
    // ── Field validation ─────────────────────────────────────────────────────
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

    // ── Conflict prevention: same date + same time slot ──────────────────────
    bool conflict = await db.Bookings
        .AnyAsync(b => b.Date == req.Date && b.TimeSlot == req.TimeSlot);

    if (conflict)
        return Results.Conflict(new
        {
            error = $"The slot '{req.TimeSlot}' on {req.Date:yyyy-MM-dd} is already reserved. " +
                    "Please select a different slot."
        });

    var booking = new Booking
    {
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
.WithName("CreateBooking")
.WithSummary("Creates a reservation — rejects if the date + slot combination is already taken")
.Produces<Booking>(StatusCodes.Status201Created)
.ProducesProblem(StatusCodes.Status400BadRequest)
.ProducesProblem(StatusCodes.Status409Conflict);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/bookings/available-slots?date=YYYY-MM-DD
// ─────────────────────────────────────────────────────────────────────────────
app.MapGet("/api/bookings/available-slots", async (string date, CineDbContext db) =>
{
    if (!DateOnly.TryParseExact(
            date, "yyyy-MM-dd",
            CultureInfo.InvariantCulture,
            DateTimeStyles.None,
            out var parsedDate))
    {
        return Results.BadRequest(new
        {
            error = "Invalid date format. Expected YYYY-MM-DD (e.g. 2025-12-31)."
        });
    }

    var booked = (await db.Bookings
        .Where(b => b.Date == parsedDate)
        .Select(b => b.TimeSlot)
        .ToListAsync())
        .ToHashSet(StringComparer.OrdinalIgnoreCase);

    var available = AllSlots.Where(s => !booked.Contains(s)).ToArray();

    return Results.Ok(new { date, availableSlots = available });
})
.WithName("GetAvailableSlots")
.WithSummary("Returns time slots still open for a given date")
.Produces<object>();

app.Run();

// ─── Request DTO ─────────────────────────────────────────────────────────────
record CreateBookingRequest(
    string   GuestName,
    string   ContactNumber,
    string   CelebrationType,
    DateOnly Date,
    string   TimeSlot,
    int      TotalGuests
);

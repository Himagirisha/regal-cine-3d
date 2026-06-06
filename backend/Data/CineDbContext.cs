using Microsoft.EntityFrameworkCore;
using RegalCine.Api.Models;

namespace RegalCine.Api.Data;

/// <summary>EF Core DbContext backed by the InMemory provider.</summary>
public sealed class CineDbContext(DbContextOptions<CineDbContext> options)
    : DbContext(options)
{
    public DbSet<Booking> Bookings => Set<Booking>();
}

using Microsoft.EntityFrameworkCore;
using RegalCine.Api.Models;

namespace RegalCine.Api.Data;

public sealed class CineDbContext(DbContextOptions<CineDbContext> options)
    : DbContext(options)
{
    public DbSet<Booking> Bookings => Set<Booking>();
    public DbSet<User>    Users    => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>()
            .HasIndex(u => u.Username)
            .IsUnique();

        // Store DateOnly as a plain date column in PostgreSQL
        modelBuilder.Entity<Booking>()
            .Property(b => b.Date)
            .HasColumnType("date");
    }
}

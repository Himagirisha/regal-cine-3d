namespace RegalCine.Api.Models;

public sealed class Booking
{
    public int      Id              { get; set; }
    public Guid?    UserId          { get; set; }   // null for guest bookings
    public string   GuestName       { get; set; } = string.Empty;
    public string   ContactNumber   { get; set; } = string.Empty;
    public string   CelebrationType { get; set; } = string.Empty;
    public DateOnly Date            { get; set; }
    public string   TimeSlot        { get; set; } = string.Empty;
    public int      TotalGuests     { get; set; }
}

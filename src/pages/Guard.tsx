import { useState } from 'react';
import { ScanLine, ShieldCheck, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { validateBooking, type Booking } from '@/lib/bookingStore';

type Result = null | { valid: true; booking: Booking } | { valid: false };

export default function Guard() {
  const [bookingId, setBookingId] = useState('');
  const [result, setResult] = useState<Result>(null);

  function handleValidate() {
    if (!bookingId.trim()) return;
    const res = validateBooking(bookingId.trim().toUpperCase());
    setResult(res.valid && res.booking ? { valid: true, booking: res.booking } : { valid: false });
  }

  function handleReset() {
    setBookingId('');
    setResult(null);
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-md">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Security Guard Portal</h1>
        <p className="text-muted-foreground text-sm mt-1">Validate booking QR codes</p>
      </div>

      {!result && (
        <div className="bg-card rounded-xl shadow-card p-6 space-y-4">
          <div className="bg-accent rounded-lg p-8 flex flex-col items-center gap-3">
            <ScanLine className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">Camera scanning is unavailable in this environment. Enter the Booking ID manually below.</p>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Enter Booking ID"
              value={bookingId}
              onChange={e => setBookingId(e.target.value.toUpperCase())}
              className="text-center font-mono text-lg tracking-wider"
              maxLength={8}
              onKeyDown={e => e.key === 'Enter' && handleValidate()}
            />
            <Button className="w-full" onClick={handleValidate} disabled={!bookingId.trim()}>
              Validate Booking
            </Button>
          </div>
        </div>
      )}

      {result && !result.valid && (
        <div className="bg-destructive/5 border-2 border-destructive rounded-xl p-8 text-center space-y-3">
          <ShieldX className="h-16 w-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold text-destructive">INVALID / NOT FOUND</h2>
          <p className="text-muted-foreground text-sm">This booking ID is not valid, has been cancelled, or the event date has passed.</p>
          <Button variant="outline" onClick={handleReset} className="mt-4">Scan Another</Button>
        </div>
      )}

      {result && result.valid && (
        <div className="bg-success/5 border-2 border-success rounded-xl p-8 text-center space-y-3">
          <ShieldCheck className="h-16 w-16 text-success mx-auto" />
          <h2 className="text-2xl font-bold text-success">VALID BOOKING</h2>
          <div className="bg-card rounded-lg p-4 text-sm text-left space-y-1 mt-2">
            <p><span className="text-muted-foreground">Booking ID:</span> <span className="font-mono font-bold">{result.booking.id}</span></p>
            <p><span className="text-muted-foreground">Flat:</span> {result.booking.flatNumber}</p>
            <p><span className="text-muted-foreground">Name:</span> {result.booking.name}</p>
            <p><span className="text-muted-foreground">Date:</span> {new Date(result.booking.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
            <p><span className="text-muted-foreground">Event:</span> {result.booking.eventType}</p>
          </div>
          <Button variant="outline" onClick={handleReset} className="mt-4">Scan Another</Button>
        </div>
      )}
    </div>
  );
}

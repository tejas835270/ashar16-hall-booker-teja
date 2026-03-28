import { useState, useEffect, useMemo } from 'react';
import { ScanLine, ShieldCheck, ShieldX, ShieldAlert, LogOut, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { validateBooking, fetchBookings, HALL_LABELS, formatHour, getSlotTimes, fetchSettings, type Booking, type HallSettings } from '@/lib/bookingStore';
import { isGuard, logout } from '@/lib/authStore';
import LoginForm from '@/components/LoginForm';
import { useSearchParams } from 'react-router-dom';

type Result = null | { valid: true; booking: Booking; isUpcoming?: boolean } | { valid: false };

export default function Guard() {
  const [authed, setAuthed] = useState(isGuard());
  const [bookingId, setBookingId] = useState('');
  const [result, setResult] = useState<Result>(null);
  const [scannedIds, setScannedIds] = useState<string[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<HallSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [searchParams] = useSearchParams();

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!authed) return;
    async function load() {
      setLoading(true);
      const [b, s] = await Promise.all([fetchBookings(), fetchSettings()]);
      setAllBookings(b.filter(bk => bk.status === 'confirmed'));
      setSettings(s);
      setLoading(false);
    }
    load();
  }, [authed]);

  // Auto-verify from QR code URL parameter
  useEffect(() => {
    const verifyId = searchParams.get('verify');
    if (verifyId && authed && !loading) {
      setBookingId(verifyId.toUpperCase());
      handleValidateId(verifyId.toUpperCase());
    }
  }, [searchParams, authed, loading]);

  if (!authed) {
    return <LoginForm expectedRole="guard" onSuccess={() => setAuthed(true)} />;
  }

  async function handleValidateId(id: string) {
    if (!id.trim()) return;
    setValidating(true);
    const res = await validateBooking(id.trim().toUpperCase());
    if (res.valid && res.booking) {
      setResult({ valid: true, booking: res.booking, isUpcoming: res.isUpcoming });
      setScannedIds(prev => prev.includes(id) ? prev : [id, ...prev]);
    } else {
      setResult({ valid: false });
    }
    setValidating(false);
  }

  async function handleValidate() {
    await handleValidateId(bookingId);
  }

  function handleReset() { setBookingId(''); setResult(null); }
  function handleLogout() { logout(); setAuthed(false); }

  const slotLabel = (b: Booking) => {
    if (b.timeSlot === 'custom') return `${formatHour(b.customStartHour!)} – ${formatHour(b.customEndHour!)}`;
    const slots = getSlotTimes(settings || undefined);
    return slots[b.timeSlot as keyof typeof slots]?.label || b.timeSlot;
  };

  const getBookingStatus = (b: Booking): 'valid' | 'upcoming' => {
    return b.date === todayStr ? 'valid' : 'upcoming';
  };

  if (loading) return <div className="container mx-auto px-4 py-6 max-w-lg text-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Guard Portal</h1>
          <p className="text-muted-foreground text-sm">Validate booking QR codes</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-1.5" /> Logout
        </Button>
      </div>

      {!result && (
        <div className="bg-card rounded-xl shadow-card p-6 space-y-4">
          <div className="bg-accent rounded-lg p-8 flex flex-col items-center gap-3">
            <ScanLine className="h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">Enter the Booking ID manually below.</p>
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
            <Button className="w-full" onClick={handleValidate} disabled={!bookingId.trim() || validating}>
              {validating ? 'Validating...' : 'Validate Booking'}
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

      {result && result.valid && result.isUpcoming && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-400 dark:border-amber-700 rounded-xl p-8 text-center space-y-3">
          <ShieldAlert className="h-16 w-16 text-amber-600 mx-auto" />
          <h2 className="text-2xl font-bold text-amber-600">UPCOMING BOOKING</h2>
          <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">This booking is for a future date. Entry is not permitted today.</p>
          <div className="bg-card rounded-lg p-4 text-sm text-left space-y-1 mt-2">
            <p><span className="text-muted-foreground">Booking ID:</span> <span className="font-mono font-bold">{result.booking.id}</span></p>
            <p><span className="text-muted-foreground">Flat:</span> {result.booking.flatNumber}</p>
            <p><span className="text-muted-foreground">Name:</span> {result.booking.name}</p>
            <p><span className="text-muted-foreground">Date:</span> {new Date(result.booking.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
            <p><span className="text-muted-foreground">Hall:</span> {HALL_LABELS[result.booking.hall] || '—'}</p>
            <p><span className="text-muted-foreground">Slot:</span> {slotLabel(result.booking)}</p>
          </div>
          <Button variant="outline" onClick={handleReset} className="mt-4">Scan Another</Button>
        </div>
      )}

      {result && result.valid && !result.isUpcoming && (
        <div className="bg-success/5 border-2 border-success rounded-xl p-8 text-center space-y-3">
          <ShieldCheck className="h-16 w-16 text-success mx-auto" />
          <h2 className="text-2xl font-bold text-success">VALID BOOKING</h2>
          <div className="bg-card rounded-lg p-4 text-sm text-left space-y-1 mt-2">
            <p><span className="text-muted-foreground">Booking ID:</span> <span className="font-mono font-bold">{result.booking.id}</span></p>
            <p><span className="text-muted-foreground">Flat:</span> {result.booking.flatNumber}</p>
            <p><span className="text-muted-foreground">Name:</span> {result.booking.name}</p>
            <p><span className="text-muted-foreground">Phone:</span> {result.booking.phone || '—'}</p>
            <p><span className="text-muted-foreground">Hall:</span> {HALL_LABELS[result.booking.hall] || '—'}</p>
            <p><span className="text-muted-foreground">Slot:</span> {slotLabel(result.booking)}</p>
            <p><span className="text-muted-foreground">Date:</span> {new Date(result.booking.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</p>
            <p><span className="text-muted-foreground">Event:</span> {result.booking.eventType}</p>
            <p><span className="text-muted-foreground">Attendees:</span> {result.booking.memberCount}</p>
          </div>
          <Button variant="outline" onClick={handleReset} className="mt-4">Scan Another</Button>
        </div>
      )}

      {/* Today's & Upcoming Bookings */}
      <div className="mt-8 space-y-4">
        <h2 className="text-lg font-semibold">Today's & Upcoming Bookings</h2>
        {allBookings.filter(b => b.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).length === 0 ? (
          <p className="text-muted-foreground text-sm">No upcoming bookings</p>
        ) : (
          <div className="space-y-2">
            {allBookings
              .filter(b => b.date >= todayStr)
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(b => {
                const status = getBookingStatus(b);
                const scanned = scannedIds.includes(b.id);
                return (
                  <div
                    key={b.id}
                    className={`rounded-xl p-4 border text-sm ${
                      status === 'valid'
                        ? 'bg-success/5 border-success/30'
                        : 'bg-amber-50 border-amber-300 dark:bg-amber-950/20 dark:border-amber-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold">{b.id}</span>
                      <div className="flex items-center gap-2">
                        {scanned && <Badge variant="outline" className="text-xs">Scanned</Badge>}
                        <Badge variant={status === 'valid' ? 'default' : 'secondary'} className={`text-xs ${status === 'upcoming' ? 'bg-amber-500 text-white hover:bg-amber-600' : ''}`}>
                          {status === 'valid' ? '✓ Valid Today' : <><Clock className="h-3 w-3 mr-1 inline" />Upcoming</>}
                        </Badge>
                      </div>
                    </div>
                    <div className="text-muted-foreground space-y-0.5">
                      <p>{b.name} • Flat {b.flatNumber}</p>
                      <p>{new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })} • {HALL_LABELS[b.hall]} • {slotLabel(b)}</p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

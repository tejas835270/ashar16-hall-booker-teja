import { useState, useMemo } from 'react';
import { Trash2, IndianRupee, CalendarDays, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getBookings, cancelBooking, HALL_LABELS, SLOT_TIMES, formatHour, type Booking } from '@/lib/bookingStore';
import { Badge } from '@/components/ui/badge';

export default function Admin() {
  const [refreshKey, setRefreshKey] = useState(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bookings = useMemo(() => getBookings(), [refreshKey]);

  const activeBookings = bookings.filter(b => b.status === 'confirmed');
  const totalRevenue = activeBookings.reduce((s, b) => s + b.total, 0);
  const upcomingCount = activeBookings.filter(b => new Date(b.date) >= new Date(new Date().toDateString())).length;

  function handleCancel(id: string) {
    if (confirm('Cancel this booking and process refund?')) {
      cancelBooking(id);
      setRefreshKey(k => k + 1);
    }
  }

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const slotLabel = (b: Booking) => {
    if (b.timeSlot === 'custom') return `${formatHour(b.customStartHour!)}–${formatHour(b.customEndHour!)}`;
    return SLOT_TIMES[b.timeSlot as keyof typeof SLOT_TIMES]?.label?.replace(/\s*\(.*\)/, '') || b.timeSlot;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><CalendarDays className="h-5 w-5 text-primary" /></div>
          <div><p className="text-sm text-muted-foreground">Upcoming</p><p className="text-xl font-bold">{upcomingCount}</p></div>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-success" /></div>
          <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
        </div>
        <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><Ban className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-sm text-muted-foreground">Cancelled</p><p className="text-xl font-bold">{bookings.filter(b => b.status === 'cancelled').length}</p></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-accent/50">
                <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Flat</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Name</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Hall</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Slot</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {bookings.length === 0 && (
                <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No bookings yet</td></tr>
              )}
              {bookings.map(b => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-accent/30 transition-colors">
                  <td className="p-3 font-mono font-medium">{b.id}</td>
                  <td className="p-3">{formatDate(b.date)}</td>
                  <td className="p-3">{b.flatNumber}</td>
                  <td className="p-3 hidden sm:table-cell">{b.name}</td>
                  <td className="p-3 hidden md:table-cell">{HALL_LABELS[b.hall] || '—'}</td>
                  <td className="p-3">{slotLabel(b)}</td>
                  <td className="p-3 text-right">₹{b.total.toLocaleString('en-IN')}</td>
                  <td className="p-3 text-center">
                    <Badge variant={b.status === 'confirmed' ? 'default' : 'destructive'} className="text-xs">
                      {b.status === 'confirmed' ? 'Active' : 'Cancelled'}
                    </Badge>
                  </td>
                  <td className="p-3">
                    {b.status === 'confirmed' && (
                      <Button variant="ghost" size="icon" onClick={() => handleCancel(b.id)} title="Cancel & Refund">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

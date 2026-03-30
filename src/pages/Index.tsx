import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchActiveBookings, fetchSettings, getCachedSettings, formatHour, getSlotTimes,
  HALL_LABELS, type Booking, type HallSettings
} from '@/lib/bookingStore';
import BookingModal from '@/components/BookingModal';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function SlotDetails({ date, settings, bookings, onBook, onClose }: { date: string; settings: HallSettings; bookings: Booking[]; onBook: () => void; onClose: () => void }) {
  const slotTimes = getSlotTimes(settings);
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' });

  const bookedRanges = bookings.filter(b => b.date === date).map(b => {
    if (b.timeSlot === 'custom') return { start: b.customStartHour!, end: b.customEndHour!, hall: b.hall, booking: b };
    const st = slotTimes[b.timeSlot as keyof typeof slotTimes];
    return { start: st.start, end: st.end, hall: b.hall, booking: b };
  });

  return (
    <div className="bg-card rounded-xl shadow-card p-4 mt-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Info className="h-4 w-4 text-primary" />
          {formattedDate} — Slot Details
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      {bookedRanges.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-medium text-muted-foreground">Booked Slots:</p>
          {bookedRanges.map((r, i) => (
            <div key={i} className="flex items-center gap-2 bg-destructive/5 border border-destructive/20 rounded-lg px-3 py-2">
              <div className="w-2 h-2 rounded-full bg-destructive shrink-0" />
              <div className="flex-1 text-xs">
                <span className="font-medium text-foreground">{formatHour(r.start)} – {formatHour(r.end)}</span>
                <span className="text-muted-foreground ml-2">• {HALL_LABELS[r.hall]}</span>
              </div>
              <span className="text-xs text-muted-foreground">{r.booking.name}</span>
            </div>
          ))}
        </div>
      )}

      {(() => {
        const open = slotTimes.full.start;
        const close = slotTimes.full.end;
        const halls: ('b-wing' | 'c-wing')[] = ['b-wing', 'c-wing'];
        const freeSlots: { hall: string; start: number; end: number }[] = [];
        halls.forEach(hall => {
          const hallBookings = bookedRanges
            .filter(r => r.hall === hall || r.hall === 'both')
            .sort((a, b) => a.start - b.start);
          let cursor = open;
          hallBookings.forEach(b => {
            if (b.start > cursor) freeSlots.push({ hall: HALL_LABELS[hall], start: cursor, end: b.start });
            cursor = Math.max(cursor, b.end);
          });
          if (cursor < close) freeSlots.push({ hall: HALL_LABELS[hall], start: cursor, end: close });
        });
        if (freeSlots.length === 0) return null;
        return (
          <div className="space-y-2 mb-3">
            <p className="text-xs font-medium text-muted-foreground">Available Windows:</p>
            {freeSlots.map((s, i) => (
              <div key={i} className="flex items-center gap-2 bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                <div className="w-2 h-2 rounded-full bg-success shrink-0" />
                <div className="flex-1 text-xs">
                  <span className="font-medium text-foreground">{formatHour(s.start)} – {formatHour(s.end)}</span>
                  <span className="text-muted-foreground ml-2">• {s.hall}</span>
                </div>
              </div>
            ))}
          </div>
        );
      })()}

      <Button size="sm" className="w-full" onClick={onBook}>Book This Date</Button>
    </div>
  );
}

export default function Index() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [previewDate, setPreviewDate] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeBookings, setActiveBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<HallSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, bookings] = await Promise.all([fetchSettings(), fetchActiveBookings()]);
      setSettings(s);
      setActiveBookings(bookings);
      setLoading(false);
    }
    load();
  }, [refreshKey]);

  const bookedDates = useMemo(() => {
    const map: Record<string, string[]> = {};
    activeBookings.forEach(b => {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b.timeSlot);
    });
    return map;
  }, [activeBookings]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  function navigate(dir: number) {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
    setPreviewDate(null);
  }

  function dateStr(day: number) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function getStatus(day: number) {
    const ds = dateStr(day);
    const past = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (past) return 'past';
    // Check if fully booked
    const dayBookings = activeBookings.filter(b => b.date === ds);
    const fullBoth = dayBookings.some(b => b.timeSlot === 'full' && b.hall === 'both');
    if (fullBoth) return 'booked';
    const fullB = dayBookings.some(b => b.timeSlot === 'full' && (b.hall === 'b-wing' || b.hall === 'both'));
    const fullC = dayBookings.some(b => b.timeSlot === 'full' && (b.hall === 'c-wing' || b.hall === 'both'));
    if (fullB && fullC) return 'booked';
    if (dayBookings.length > 0) return 'partial';
    return 'available';
  }

  function handleDayClick(day: number) {
    const status = getStatus(day);
    if (status === 'past' || status === 'booked') return;
    const ds = dateStr(day);
    if (status === 'partial') {
      setPreviewDate(prev => prev === ds ? null : ds);
    } else {
      setPreviewDate(null);
      setSelectedDate(ds);
    }
  }

  if (loading || !settings) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-3xl text-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ashar 16 CHSL – Hall Booking</h1>
        <p className="text-muted-foreground text-sm mt-1">Select an available date to book the community hall</p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-5 w-5" /></Button>
          <h2 className="text-lg font-semibold">{MONTH_NAMES[month]} {year}</h2>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const status = getStatus(day);
            const isToday = dateStr(day) === todayStr;
            const isPreview = previewDate === dateStr(day);
            return (
              <button
                key={day}
                disabled={status === 'past' || status === 'booked'}
                onClick={() => handleDayClick(day)}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all ${
                  status === 'past' ? 'text-muted-foreground/40 cursor-default' :
                  status === 'booked' ? 'bg-destructive/10 text-destructive cursor-not-allowed' :
                  status === 'partial' ? 'bg-warning/10 text-warning hover:shadow-card-hover cursor-pointer' :
                  'bg-success/10 text-success hover:shadow-card-hover cursor-pointer'
                } ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''} ${isPreview ? 'ring-2 ring-warning ring-offset-1' : ''}`}
              >
                <span>{day}</span>
                {status === 'available' && <CheckCircle2 className="h-3 w-3 mt-0.5 opacity-60" />}
                {status === 'partial' && <Clock className="h-3 w-3 mt-0.5 opacity-60" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground justify-center">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/20" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/20" /> Partial (tap to see slots)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20" /> Booked</span>
        </div>
      </div>

      {previewDate && (
        <SlotDetails
          date={previewDate}
          settings={settings}
          bookings={activeBookings}
          onBook={() => { setSelectedDate(previewDate); setPreviewDate(null); }}
          onClose={() => setPreviewDate(null)}
        />
      )}

      {selectedDate && (
        <BookingModal
          date={selectedDate}
          onClose={() => setSelectedDate(null)}
          onBooked={() => { setSelectedDate(null); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}

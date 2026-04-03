import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock, X, Info, Pencil, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  fetchActiveBookings, fetchSettings, saveSettings, formatHour, getSlotTimes,
  HALL_LABELS, type Booking, type HallSettings
} from '@/lib/bookingStore';
import { isAdmin } from '@/lib/authStore';
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
    <div className="bg-card rounded-xl shadow-card border border-border/50 p-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <Info className="h-4 w-4 text-primary" />
          {formattedDate} — Slot Details
        </h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {bookedRanges.length > 0 && (
        <div className="space-y-2 mb-3">
          <p className="text-xs font-medium text-muted-foreground">Booked Slots:</p>
          {bookedRanges.map((r, i) => (
            <div key={i} className="flex items-center gap-2 bg-destructive/5 border border-destructive/15 rounded-lg px-3 py-2">
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
              <div key={i} className="flex items-center gap-2 bg-success/5 border border-success/15 rounded-lg px-3 py-2">
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

      <Button size="sm" className="w-full rounded-lg" onClick={onBook}>Book This Date</Button>
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

  // Inline editing for society name
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const admin = isAdmin();

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

  async function handleSaveName() {
    if (!settings || !nameInput.trim()) return;
    const updated = { ...settings, societyName: nameInput.trim() };
    await saveSettings(updated);
    setSettings(updated);
    setEditingName(false);
  }

  if (loading || !settings) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-3xl text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 bg-muted rounded-lg mx-auto" />
          <div className="h-4 w-64 bg-muted rounded mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Hero Header */}
      <div className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-3 animate-in fade-in slide-in-from-bottom-1 duration-500">
          Community Hall Booking
        </p>

        {editingName ? (
          <div className="flex items-center justify-center gap-2 animate-in fade-in duration-200">
            <Input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              className="max-w-xs text-center text-2xl font-extrabold h-12"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false); }}
            />
            <Button size="icon" variant="ghost" onClick={handleSaveName} className="text-success hover:text-success">
              <Check className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => setEditingName(false)} className="text-muted-foreground">
              <X className="h-5 w-5" />
            </Button>
          </div>
        ) : (
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight animate-in fade-in slide-in-from-bottom-2 duration-500 delay-100 inline-flex items-center gap-2">
            {settings.societyName}
            {admin && (
              <button
                onClick={() => { setNameInput(settings.societyName); setEditingName(true); }}
                className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-primary/5"
                title="Edit society name"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}
          </h1>
        )}

        <p className="text-muted-foreground text-sm mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
          Select an available date to book the community hall
        </p>
      </div>

      <div className="bg-card rounded-2xl shadow-card border border-border/40 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-3 duration-500 delay-300">
        <div className="flex items-center justify-between mb-5">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-lg hover:bg-accent transition-all">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-lg font-bold tracking-tight text-foreground">{MONTH_NAMES[month]} {year}</h2>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)} className="rounded-lg hover:bg-accent transition-all">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1.5">{d}</div>
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
                className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-semibold transition-all duration-200 ${
                  status === 'past' ? 'opacity-40 grayscale cursor-default bg-muted text-muted-foreground' :
                  status === 'booked' ? 'bg-[hsl(0,72%,50%)] text-white cursor-not-allowed' :
                  status === 'partial' ? 'bg-[hsl(30,95%,50%)] text-white hover:bg-[hsl(30,95%,45%)] hover:shadow-sm cursor-pointer' :
                  'bg-[hsl(142,55%,42%)] text-white hover:bg-[hsl(142,55%,37%)] hover:shadow-sm cursor-pointer'
                } ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''} ${isPreview ? 'ring-2 ring-warning ring-offset-2 ring-offset-background scale-105' : ''}`}
              >
                <span>{day}</span>
                {status === 'available' && <CheckCircle2 className="h-3 w-3 mt-0.5 opacity-80" />}
                {status === 'partial' && <Clock className="h-3 w-3 mt-0.5 opacity-80" />}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-5 mt-5 text-xs text-muted-foreground justify-center font-medium">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[hsl(142,60%,35%)]" /> Available</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[hsl(38,80%,45%)]" /> Partial</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[hsl(0,65%,40%)]" /> Booked</span>
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

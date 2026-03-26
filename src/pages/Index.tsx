import { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getActiveBookings, isDateAvailable, seedDummyData } from '@/lib/bookingStore';
import BookingModal from '@/components/BookingModal';

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function Index() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => { seedDummyData(); }, []);

  const bookedDates = useMemo(() => {
    const active = getActiveBookings();
    const map: Record<string, string[]> = {};
    active.forEach(b => {
      if (!map[b.date]) map[b.date] = [];
      map[b.date].push(b.timeSlot);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, refreshKey]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  function navigate(dir: number) {
    let m = month + dir, y = year;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMonth(m); setYear(y);
  }

  function dateStr(day: number) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  function getStatus(day: number) {
    const ds = dateStr(day);
    const past = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (past) return 'past';
    const slots = bookedDates[ds];
    if (!slots) return 'available';
    if (slots.includes('full')) return 'booked';
    return 'partial';
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-foreground">Community Hall Booking</h1>
        <p className="text-muted-foreground text-sm mt-1">Select an available date to book the hall</p>
      </div>

      <div className="bg-card rounded-xl shadow-card p-4 sm:p-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="h-5 w-5" /></Button>
          <h2 className="text-lg font-semibold">{MONTH_NAMES[month]} {year}</h2>
          <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="h-5 w-5" /></Button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const status = getStatus(day);
            const isToday = dateStr(day) === todayStr;
            return (
              <button
                key={day}
                disabled={status === 'past' || status === 'booked'}
                onClick={() => { if (status !== 'past' && status !== 'booked') setSelectedDate(dateStr(day)); }}
                className={`relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all ${
                  status === 'past' ? 'text-muted-foreground/40 cursor-default' :
                  status === 'booked' ? 'bg-destructive/10 text-destructive cursor-not-allowed' :
                  status === 'partial' ? 'bg-warning/10 text-warning hover:shadow-card-hover cursor-pointer' :
                  'bg-success/10 text-success hover:shadow-card-hover cursor-pointer'
                } ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}`}
              >
                <span>{day}</span>
                {status === 'available' && <CheckCircle2 className="h-3 w-3 mt-0.5 opacity-60" />}
                {status === 'partial' && <Clock className="h-3 w-3 mt-0.5 opacity-60" />}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground justify-center">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-success/20" /> Available</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-warning/20" /> Partial</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/20" /> Booked</span>
        </div>
      </div>

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

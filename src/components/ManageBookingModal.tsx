import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon, Loader2, Search, X, Ban, CalendarClock, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  findBooking, cancelBooking, isSlotAvailable, updateBooking, getRent,
  fetchSettings, HALL_LABELS, type Booking, type HallSettings,
} from '@/lib/bookingStore';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface Props {
  onClose: () => void;
  onChanged: () => void;
}

export default function ManageBookingModal({ onClose, onChanged }: Props) {
  const [bookingId, setBookingId] = useState('');
  const [flatNumber, setFlatNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [settings, setSettings] = useState<HallSettings | null>(null);

  const [newDate, setNewDate] = useState<Date | undefined>();
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [priceDifference, setPriceDifference] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function handleLookup() {
    if (!bookingId.trim() || !flatNumber.trim()) {
      toast.error('Please enter both Booking ID and Flat Number');
      return;
    }
    setSearching(true);
    const b = await findBooking(bookingId.trim().toUpperCase());
    if (!b || b.flatNumber.toLowerCase() !== flatNumber.trim().toLowerCase()) {
      toast.error('No booking found matching those details');
      setBooking(null);
    } else if (b.status === 'cancelled') {
      toast.error('This booking has already been cancelled');
      setBooking(null);
    } else {
      const s = await fetchSettings();
      setSettings(s);
      setBooking(b);
      setNewDate(undefined);
      setAvailable(null);
      setPriceDifference(false);
    }
    setSearching(false);
  }

  async function handleCheckNewDate(d: Date | undefined) {
    setNewDate(d);
    setAvailable(null);
    setPriceDifference(false);
    if (!d || !booking) return;
    setChecking(true);
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const ok = booking.timeSlot === 'custom'
      ? await isSlotAvailable(ds, booking.hall, 'custom', booking.customStartHour, booking.customEndHour, booking.id)
      : await isSlotAvailable(ds, booking.hall, booking.timeSlot, undefined, undefined, booking.id);
    setAvailable(ok);
    // Inform users that any pricing-tier change should be coordinated with Management
    if (ok && booking.userType !== 'society') {
      setPriceDifference(true);
    }
    setChecking(false);
  }

  async function handleCancel() {
    if (!booking) return;
    setUpdating(true);
    const ok = await cancelBooking(booking.id);
    if (ok) {
      toast.success('Booking cancelled. The slot is now available.');
      onChanged();
      onClose();
    } else {
      toast.error('Failed to cancel booking');
    }
    setUpdating(false);
    setConfirmCancel(false);
  }

  async function handleChangeDate() {
    if (!booking || !newDate || !available) return;
    setUpdating(true);
    const ds = `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}-${String(newDate.getDate()).padStart(2, '0')}`;
    const ok = await updateBooking(booking.id, { date: ds });
    if (ok) {
      toast.success('Booking date updated');
      onChanged();
      onClose();
    } else {
      toast.error('Failed to update booking');
    }
    setUpdating(false);
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-border/40" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="font-semibold text-lg">Manage Your Booking</h2>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {!booking && (
              <>
                <p className="text-sm text-muted-foreground">Enter your Booking ID and Flat Number to manage your booking.</p>
                <div className="space-y-1.5">
                  <Label>Booking ID *</Label>
                  <Input value={bookingId} onChange={e => setBookingId(e.target.value.toUpperCase())} placeholder="e.g. ABCD1234" maxLength={8} className="font-mono" />
                </div>
                <div className="space-y-1.5">
                  <Label>Flat Number *</Label>
                  <Input value={flatNumber} onChange={e => setFlatNumber(e.target.value)} placeholder="e.g. A-101" maxLength={10} />
                </div>
                <Button className="w-full rounded-lg min-h-[44px]" onClick={handleLookup} disabled={searching}>
                  {searching ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Searching...</> : <><Search className="h-4 w-4 mr-1.5" />Find Booking</>}
                </Button>
              </>
            )}

            {booking && (
              <>
                <div className="bg-accent/60 rounded-lg p-3 text-sm space-y-1 border border-border/30">
                  <p><span className="text-muted-foreground">ID:</span> <span className="font-mono font-bold">{booking.id}</span></p>
                  <p><span className="text-muted-foreground">Name:</span> {booking.name}</p>
                  <p><span className="text-muted-foreground">Date:</span> {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  <p><span className="text-muted-foreground">Hall:</span> {HALL_LABELS[booking.hall]}</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5"><CalendarClock className="h-4 w-4" /> Change Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal min-h-[44px]", !newDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {newDate ? format(newDate, 'PPP') : 'Pick a new date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newDate}
                        onSelect={handleCheckNewDate}
                        disabled={(d) => d < new Date(new Date().toDateString())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  {checking && <p className="text-xs text-muted-foreground">Checking availability...</p>}
                  {available === false && <p className="text-xs text-destructive font-medium">This date is not available for your hall and slot.</p>}
                  {available === true && (
                    <p className="text-xs text-success font-medium">✓ Date is available.</p>
                  )}
                  {priceDifference && (
                    <div className="flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
                      <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">Price difference may apply. Please coordinate with Management.</p>
                    </div>
                  )}
                  <Button
                    className="w-full rounded-lg min-h-[44px]"
                    onClick={handleChangeDate}
                    disabled={!newDate || !available || updating}
                  >
                    {updating ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Updating...</> : 'Confirm New Date'}
                  </Button>
                </div>

                <div className="border-t pt-3">
                  <Button variant="destructive" className="w-full rounded-lg min-h-[44px]" onClick={() => setConfirmCancel(true)} disabled={updating}>
                    <Ban className="h-4 w-4 mr-1.5" /> Cancel Booking
                  </Button>
                </div>

                <Button variant="outline" size="sm" className="w-full" onClick={() => { setBooking(null); setBookingId(''); setFlatNumber(''); }}>
                  Look up another booking
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Booking <strong>{booking?.id}</strong> for {booking?.name} (Flat {booking?.flatNumber}) will be marked as cancelled and the slot will be released. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Booking</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
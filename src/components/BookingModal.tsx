import { useState, useMemo } from 'react';
import { X, CreditCard, CheckCircle, Loader2, ExternalLink, Download } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  createBooking, getRent, getSlotTimes, getDynamicDeposit,
  getConflictingSlots, isSlotAvailable, formatHour, HALL_LABELS,
  type Booking, type HallOption, type UserType, type TimeSlot
} from '@/lib/bookingStore';
import { getSettings } from '@/lib/settingsStore';
import { downloadBookingPDF } from '@/lib/pdfReceipt';

type Step = 'form' | 'payment' | 'confirmation';

interface Props {
  date: string;
  onClose: () => void;
  onBooked: () => void;
}

export default function BookingModal({ date, onClose, onBooked }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [flatNumber, setFlatNumber] = useState('');
  const [name, setName] = useState('');
  const [eventType, setEventType] = useState('');
  const [memberCount, setMemberCount] = useState('');
  const [hall, setHall] = useState<HallOption>('b-wing');
  const [userType, setUserType] = useState<UserType>('resident');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>('full');
  const [customStart, setCustomStart] = useState(8);
  const [customEnd, setCustomEnd] = useState(14);
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [showTerms, setShowTerms] = useState(false);

  const settings = getSettings();
  const slotTimes = getSlotTimes();
  const dynamicDeposit = getDynamicDeposit();
  const dynamicPricing = settings.pricing;

  const conflicts = useMemo(() => getConflictingSlots(date, hall), [date, hall]);

  const rent = getRent(userType, timeSlot);
  const deposit = dynamicDeposit;

  const CUSTOM_HOURS = Array.from({ length: settings.hallCloseTime - settings.hallOpenTime + 1 }, (_, i) => i + settings.hallOpenTime);

  const customDuration = customEnd - customStart;
  const customValid = timeSlot !== 'custom' || (customDuration >= 1 && customDuration <= settings.maxCustomHours && customStart >= settings.hallOpenTime && customEnd <= settings.hallCloseTime && customEnd > customStart);

  const slotAvailable = useMemo(() => {
    if (timeSlot === 'custom') return isSlotAvailable(date, hall, 'custom', customStart, customEnd) && customValid;
    return isSlotAvailable(date, hall, timeSlot);
  }, [date, hall, timeSlot, customStart, customEnd, customValid]);

  const formValid = flatNumber.trim() && name.trim() && eventType.trim() && parseInt(memberCount) > 0 && agreed && slotAvailable && customValid;

  function handleSubmitForm() {
    if (!formValid) return;
    setStep('payment');
  }

  function handlePay() {
    setPaying(true);
    setTimeout(() => {
      const b = createBooking({
        flatNumber: flatNumber.trim(),
        name: name.trim(),
        eventType: eventType.trim(),
        date,
        timeSlot,
        ...(timeSlot === 'custom' ? { customStartHour: customStart, customEndHour: customEnd } : {}),
        hall,
        userType,
        memberCount: parseInt(memberCount),
        rent,
        deposit,
      });
      setBooking(b);
      setPaying(false);
      setStep('confirmation');
    }, 1500);
  }

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const slotLabel = (s: TimeSlot) => {
    if (s === 'custom') return `Custom (${formatHour(customStart)} – ${formatHour(customEnd)})`;
    return slotTimes[s].label;
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="font-semibold text-lg">
              {step === 'form' && 'Book Community Hall'}
              {step === 'payment' && 'Payment'}
              {step === 'confirmation' && 'Booking Confirmed!'}
            </h2>
            <button onClick={step === 'confirmation' ? onBooked : onClose} className="text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5">
            {/* FORM STEP */}
            {step === 'form' && (
              <div className="space-y-4">
                <div className="bg-accent rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">Selected Date</p>
                  <p className="font-semibold text-foreground">{formattedDate}</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="flat">Flat Number</Label>
                  <Input id="flat" placeholder="e.g. A-101" value={flatNumber} onChange={e => setFlatNumber(e.target.value)} maxLength={10} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} maxLength={50} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="event">Event Type</Label>
                  <Input id="event" placeholder="e.g. Birthday Party" value={eventType} onChange={e => setEventType(e.target.value)} maxLength={40} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="members">Member Count (Attendees)</Label>
                  <Input id="members" type="number" placeholder="e.g. 25" value={memberCount} onChange={e => setMemberCount(e.target.value)} min={1} max={500} />
                </div>

                {/* User Type */}
                <div className="space-y-1.5">
                  <Label>User Type</Label>
                  <Select value={userType} onValueChange={v => setUserType(v as UserType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resident">Resident (Full ₹{dynamicPricing.resident.full.toLocaleString('en-IN')} / Half ₹{dynamicPricing.resident.half.toLocaleString('en-IN')})</SelectItem>
                      <SelectItem value="tenant">Tenant (Full ₹{dynamicPricing.tenant.full.toLocaleString('en-IN')} / Half ₹{dynamicPricing.tenant.half.toLocaleString('en-IN')})</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Hall Selection */}
                <div className="space-y-1.5">
                  <Label>Hall Selection</Label>
                  <Select value={hall} onValueChange={v => setHall(v as HallOption)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.entries(HALL_LABELS) as [HallOption, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Time Slot */}
                <div className="space-y-1.5">
                  <Label>Time Slot</Label>
                  <Select value={timeSlot} onValueChange={v => setTimeSlot(v as TimeSlot)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">{slotTimes.full.label} — ₹{getRent(userType, 'full').toLocaleString('en-IN')}</SelectItem>
                      <SelectItem value="half-slot1">{slotTimes['half-slot1'].label} — ₹{getRent(userType, 'half-slot1').toLocaleString('en-IN')}</SelectItem>
                      <SelectItem value="half-slot2">{slotTimes['half-slot2'].label} — ₹{getRent(userType, 'half-slot2').toLocaleString('en-IN')}</SelectItem>
                      <SelectItem value="custom">Custom (Max {settings.maxCustomHours} hrs) — ₹{getRent(userType, 'custom').toLocaleString('en-IN')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom time pickers */}
                {timeSlot === 'custom' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Start Time</Label>
                      <Select value={String(customStart)} onValueChange={v => setCustomStart(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CUSTOM_HOURS.filter(h => h <= settings.hallCloseTime - 1).map(h => (
                            <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>End Time</Label>
                      <Select value={String(customEnd)} onValueChange={v => setCustomEnd(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {CUSTOM_HOURS.filter(h => h > customStart && h <= settings.hallCloseTime && h - customStart <= settings.maxCustomHours).map(h => (
                            <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!customValid && <p className="col-span-2 text-xs text-destructive">Custom booking must be 1–{settings.maxCustomHours} hours within {formatHour(settings.hallOpenTime)} – {formatHour(settings.hallCloseTime)}.</p>}
                  </div>
                )}

                {/* Existing bookings on this date/hall */}
                {conflicts.length > 0 && (
                  <div className="bg-warning/10 border border-warning/30 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-warning">Existing bookings on this date:</p>
                    {conflicts.map(c => {
                      const st = getSlotTimes();
                      return (
                        <p key={c.id} className="text-xs text-muted-foreground">
                          {HALL_LABELS[c.hall]} — {c.timeSlot === 'custom' ? `${formatHour(c.customStartHour!)} – ${formatHour(c.customEndHour!)}` : st[c.timeSlot as keyof typeof st]?.label || c.timeSlot}
                        </p>
                      );
                    })}
                  </div>
                )}

                {!slotAvailable && (
                  <p className="text-sm text-destructive font-medium">This time slot conflicts with an existing booking. Please choose another.</p>
                )}

                {/* Terms */}
                <div className="flex items-start gap-2 pt-1">
                  <Checkbox id="terms" checked={agreed} onCheckedChange={v => setAgreed(!!v)} />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                    I agree to the society's{' '}
                    <button type="button" className="underline text-primary inline-flex items-center gap-0.5" onClick={() => setShowTerms(true)}>
                      Rules & Regulations <ExternalLink className="h-3 w-3 inline" />
                    </button>
                  </label>
                </div>

                <Button className="w-full" disabled={!formValid} onClick={handleSubmitForm}>
                  Proceed to Payment
                </Button>
              </div>
            )}

            {/* PAYMENT STEP */}
            {step === 'payment' && (
              <div className="space-y-4">
                <div className="bg-accent rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Hall</span><span className="font-medium">{HALL_LABELS[hall]}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Slot</span><span className="font-medium">{slotLabel(timeSlot)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">User Type</span><span className="font-medium capitalize">{userType}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Hall Rent</span><span className="font-medium">₹{rent.toLocaleString('en-IN')}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Security Deposit</span><span className="font-medium">₹{deposit.toLocaleString('en-IN')}</span></div>
                  <div className="border-t pt-2 flex justify-between font-semibold"><span>Total</span><span>₹{(rent + deposit).toLocaleString('en-IN')}</span></div>
                </div>

                <div className="bg-accent rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" /> Payment Details (Mock)</p>
                  <Input placeholder="Card Number" disabled />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="MM/YY" disabled />
                    <Input placeholder="CVC" disabled />
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>Back</Button>
                  <Button className="flex-1" onClick={handlePay} disabled={paying}>
                    {paying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : `Pay ₹${(rent + deposit).toLocaleString('en-IN')}`}
                  </Button>
                </div>
              </div>
            )}

            {/* CONFIRMATION STEP */}
            {step === 'confirmation' && booking && (
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-success" />
                  </div>
                </div>
                <div>
                  <p className="font-semibold text-lg">Booking Confirmed!</p>
                  <p className="text-muted-foreground text-sm">Your booking ID: <span className="font-mono font-bold text-foreground">{booking.id}</span></p>
                </div>

                <div className="bg-accent rounded-lg p-4 inline-block mx-auto">
                  <QRCode value={booking.id} size={160} />
                </div>

                <div className="bg-accent rounded-lg p-3 text-sm text-left space-y-1">
                  <p><span className="text-muted-foreground">Date:</span> {formattedDate}</p>
                  <p><span className="text-muted-foreground">Hall:</span> {HALL_LABELS[booking.hall]}</p>
                  <p><span className="text-muted-foreground">Flat:</span> {booking.flatNumber}</p>
                  <p><span className="text-muted-foreground">Name:</span> {booking.name}</p>
                  <p><span className="text-muted-foreground">Event:</span> {booking.eventType}</p>
                  <p><span className="text-muted-foreground">Attendees:</span> {booking.memberCount}</p>
                  <p><span className="text-muted-foreground">Amount Paid:</span> ₹{booking.total.toLocaleString('en-IN')}</p>
                </div>

                <p className="text-xs text-muted-foreground">Show this QR code to the security guard on the day of your event.</p>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => downloadBookingPDF(booking)}>
                    <Download className="h-4 w-4 mr-1.5" /> Download PDF
                  </Button>
                  <Button className="flex-1" onClick={onBooked}>Done</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Terms & Conditions Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rules & Regulations – Ashar 16 CHSL</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3">
            {settings.rules.map((rule, i) => (
              <p key={i}>{i + 1}. {rule}</p>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

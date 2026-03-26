import { useState } from 'react';
import { X, CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createBooking, type Booking } from '@/lib/bookingStore';

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
  const [timeSlot, setTimeSlot] = useState<'full' | 'half-morning' | 'half-evening'>('full');
  const [agreed, setAgreed] = useState(false);
  const [paying, setPaying] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);

  const rent = timeSlot === 'full' ? 100 : 60;
  const deposit = 50;

  const formValid = flatNumber.trim() && name.trim() && eventType.trim() && agreed;

  function handleSubmitForm() {
    if (!formValid) return;
    setStep('payment');
  }

  function handlePay() {
    setPaying(true);
    setTimeout(() => {
      const b = createBooking({ flatNumber: flatNumber.trim(), name: name.trim(), eventType: eventType.trim(), date, timeSlot, rent, deposit });
      setBooking(b);
      setPaying(false);
      setStep('confirmation');
    }, 1500);
  }

  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
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
                <Label>Time Slot</Label>
                <Select value={timeSlot} onValueChange={v => setTimeSlot(v as typeof timeSlot)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Full Day — $100</SelectItem>
                    <SelectItem value="half-morning">Half Day (Morning) — $60</SelectItem>
                    <SelectItem value="half-evening">Half Day (Evening) — $60</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-start gap-2 pt-1">
                <Checkbox id="terms" checked={agreed} onCheckedChange={v => setAgreed(!!v)} />
                <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                  I agree to the society's terms & conditions for community hall usage
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
              <div className="bg-accent rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Hall Rent</span><span className="font-medium">${rent}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Security Deposit</span><span className="font-medium">${deposit}</span></div>
                <div className="border-t pt-2 flex justify-between font-semibold"><span>Total</span><span>${rent + deposit}</span></div>
              </div>

              <div className="bg-accent rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium flex items-center gap-2"><CreditCard className="h-4 w-4" /> Card Details (Mock)</p>
                <Input placeholder="4242 4242 4242 4242" disabled />
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="MM/YY" disabled />
                  <Input placeholder="CVC" disabled />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep('form')}>Back</Button>
                <Button className="flex-1" onClick={handlePay} disabled={paying}>
                  {paying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : `Pay $${rent + deposit}`}
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
                <p><span className="text-muted-foreground">Flat:</span> {booking.flatNumber}</p>
                <p><span className="text-muted-foreground">Name:</span> {booking.name}</p>
                <p><span className="text-muted-foreground">Event:</span> {booking.eventType}</p>
                <p><span className="text-muted-foreground">Amount Paid:</span> ${booking.total}</p>
              </div>

              <p className="text-xs text-muted-foreground">Show this QR code to the security guard on the day of your event.</p>

              <Button className="w-full" onClick={onBooked}>Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

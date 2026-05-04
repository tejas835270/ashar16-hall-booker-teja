import { useState, useMemo, useRef, useEffect } from 'react';
import { X, CreditCard, CheckCircle, Loader2, ExternalLink, Download, Send, FileText, Upload, Image, Info, HelpCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  createBooking, getRent, getSlotTimes, getDynamicDeposit,
  fetchBookingsForDate, isSlotAvailable, formatHour, HALL_LABELS,
  fetchSettings, uploadFile,
  type Booking, type HallOption, type UserType, type TimeSlot, type HallSettings
} from '@/lib/bookingStore';
import { downloadBookingPDF } from '@/lib/pdfReceipt';
import { toast } from 'sonner';

type Step = 'form' | 'payment' | 'confirmation';

interface Props {
  date: string;
  onClose: () => void;
  onBooked: () => void;
}

function buildManagementMessage(booking: Booking, settings: HallSettings): string {
  const societyName = settings.societyName || 'Ashar 16 CHSL';
  const formattedDate = new Date(booking.date + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const slotTimes = getSlotTimes(settings);
  const slotLabel = booking.timeSlot === 'custom'
    ? `Custom (${formatHour(booking.customStartHour!)} – ${formatHour(booking.customEndHour!)})`
    : slotTimes[booking.timeSlot as keyof typeof slotTimes]?.label || booking.timeSlot;

  return [
    `🏢 *${societyName} – Booking Confirmation*`,
    ``,
    `📋 Booking ID: *${booking.id}*`,
    `📅 Date: ${formattedDate}`,
    `🏛️ Hall: ${HALL_LABELS[booking.hall]}`,
    `⏰ Slot: ${slotLabel}`,
    `🏠 Flat: ${booking.flatNumber}`,
    `👤 Name: ${booking.name}`,
    `📱 Phone: ${booking.phone || '—'}`,
    `🎉 Event: ${booking.eventType}`,
    `👥 Attendees: ${booking.memberCount}`,
    ``,
    `✅ Status: CONFIRMED`,
    `💰 Amount Paid: ₹${booking.total.toLocaleString('en-IN')}`,
  ].join('\n');
}

// buildGuardMessage removed — no longer needed

export default function BookingModal({ date, onClose, onBooked }: Props) {
  const [step, setStep] = useState<Step>('form');
  const [flatNumber, setFlatNumber] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
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
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<HallSettings | null>(null);
  const [conflicts, setConflicts] = useState<Booking[]>([]);
  const [slotAvailableState, setSlotAvailableState] = useState(true);

  // Custom field values
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSettings().then(setSettings);
    fetchBookingsForDate(date).then(setConflicts);
  }, [date]);

  useEffect(() => {
    async function check() {
      if (!settings) return;
      const available = timeSlot === 'custom'
        ? await isSlotAvailable(date, hall, 'custom', customStart, customEnd)
        : await isSlotAvailable(date, hall, timeSlot);
      setSlotAvailableState(available);
    }
    check();
  }, [date, hall, timeSlot, customStart, customEnd, settings]);

  if (!settings) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl shadow-xl p-8 text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-sm text-muted-foreground mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  const slotTimes = getSlotTimes(settings);
  const dynamicDeposit = getDynamicDeposit(settings);
  const rent = getRent(userType, timeSlot, settings, hall);
  const deposit = dynamicDeposit;

  const CUSTOM_HOURS = Array.from({ length: settings.hallCloseTime - settings.hallOpenTime + 1 }, (_, i) => i + settings.hallOpenTime);
  const customDuration = customEnd - customStart;
  const customValid = timeSlot !== 'custom' || (customDuration >= 1 && customDuration <= settings.maxCustomHours && customStart >= settings.hallOpenTime && customEnd <= settings.hallCloseTime && customEnd > customStart);

  const phoneValid = /^\d{10}$/.test(phone.trim());
  const memberCountNum = parseInt(memberCount) || 0;
  const needsBothHalls = memberCountNum > 80 && hall !== 'both';

  // Check required custom fields
  const customFieldsValid = settings.customFields.every(f => {
    if (!f.required) return true;
    const val = customFieldValues[f.id];
    return val && val.trim().length > 0;
  });

  const formValid = flatNumber.trim() && name.trim() && phoneValid && eventType.trim() && memberCountNum > 0 && agreed && slotAvailableState && customValid && !needsBothHalls && customFieldsValid;

  function handleSubmitForm() {
    if (!formValid) return;
    setStep('payment');
  }

  function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handlePay() {
    if (!screenshotFile) { toast.error('Please upload payment screenshot to proceed'); return; }
    setPaying(true);
    try {
      const url = await uploadFile(screenshotFile, 'payment-screenshots');
      const b = await createBooking({
        flatNumber: flatNumber.trim(),
        name: name.trim(),
        phone: phone.trim(),
        eventType: eventType.trim(),
        date,
        timeSlot,
        ...(timeSlot === 'custom' ? { customStartHour: customStart, customEndHour: customEnd } : {}),
        hall,
        userType,
        memberCount: parseInt(memberCount),
        rent,
        deposit,
        bookingType: 'online',
        paymentScreenshotUrl: url || undefined,
        customData: Object.keys(customFieldValues).length > 0 ? customFieldValues : undefined,
      });
      setBooking(b);
      setStep('confirmation');
      // Fire confetti
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      setTimeout(() => confetti({ particleCount: 80, spread: 100, origin: { y: 0.5 } }), 300);
    } catch (err) {
      toast.error('Failed to create booking');
    } finally {
      setPaying(false);
    }
  }

  function handleShareWhatsAppManagement() {
    if (!booking || !settings) return;
    const msg = buildManagementMessage(booking, settings);
    const phone = settings.managementWhatsapp || '';
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
  }

  function handleCopyToClipboard() {
    if (!booking || !settings) return;
    navigator.clipboard.writeText(buildManagementMessage(booking, settings).replace(/\*/g, '')).then(() => {
      toast.success('Booking details copied to clipboard!');
    });
  }

  function handleViewRulesPdf() {
    if (settings?.rulesPdfUrl) {
      window.open(settings.rulesPdfUrl, '_blank');
    }
  }

  const societyName = settings.societyName || 'Ashar 16 CHSL';
  const formattedDate = new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const slotLabel = (s: TimeSlot) => {
    if (s === 'custom') return `Custom (${formatHour(customStart)} – ${formatHour(customEnd)})`;
    return slotTimes[s].label;
  };

  const showQr = settings.paymentMode === 'qr' || settings.paymentMode === 'both';
  const verificationUrl = booking ? `${window.location.origin}/guard?verify=${booking.id}` : '';

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4" onClick={onClose}>
        <div className="bg-card rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-border/40" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b border-border/50">
            <h2 className="font-semibold text-lg">
              {step === 'form' && 'Book Community Hall'}
              {step === 'payment' && 'Payment'}
              {step === 'confirmation' && 'Booking Confirmed!'}
            </h2>
            <button onClick={step === 'confirmation' ? onBooked : onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5">
            {step === 'form' && (
              <div className="space-y-4">
                <div className="bg-accent/60 rounded-lg p-3 text-center border border-border/30">
                  <p className="text-xs text-muted-foreground">Selected Date</p>
                  <p className="font-semibold text-foreground">{formattedDate}</p>
                </div>

                <div className="space-y-1.5"><Label htmlFor="flat">Flat Number *</Label><Input id="flat" placeholder="e.g. A-101" value={flatNumber} onChange={e => setFlatNumber(e.target.value)} maxLength={10} /></div>
                <div className="space-y-1.5"><Label htmlFor="name">Full Name *</Label><Input id="name" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} maxLength={50} /></div>
                <div className="space-y-1.5"><Label htmlFor="phone">Phone Number * <span className="text-xs text-muted-foreground">(10 digits)</span></Label><Input id="phone" placeholder="e.g. 9876543210" value={phone} onChange={e => { const v = e.target.value.replace(/\D/g, '').slice(0, 10); setPhone(v); }} type="tel" maxLength={10} />{phone.length > 0 && !(/^\d{10}$/.test(phone)) && <p className="text-xs text-destructive">Phone number must be exactly 10 digits.</p>}</div>
                <div className="space-y-1.5"><Label htmlFor="event">Event Type *</Label><Input id="event" placeholder="e.g. Birthday Party" value={eventType} onChange={e => setEventType(e.target.value)} maxLength={40} /></div>
                <div className="space-y-1.5">
                  <Label htmlFor="members">Member Count *</Label>
                  <Input id="members" type="number" placeholder="e.g. 25" value={memberCount} onChange={e => setMemberCount(e.target.value)} min={1} max={500} />
                  <div className="flex items-start gap-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 px-3 py-2">
                    <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">Note: For more than 80 members, booking of 2 halls is mandatory.</p>
                  </div>
                  {needsBothHalls && (
                    <p className="text-xs text-destructive font-semibold">⚠ Please select "Both (B &amp; C Wing)" to proceed.</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>User Type</Label>
                  <Select value={userType} onValueChange={v => setUserType(v as UserType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="resident">Resident (Full ₹{settings.pricing.resident.full.toLocaleString('en-IN')} / Half ₹{settings.pricing.resident.half.toLocaleString('en-IN')})</SelectItem>
                      <SelectItem value="tenant">Tenant (Full ₹{settings.pricing.tenant.full.toLocaleString('en-IN')} / Half ₹{settings.pricing.tenant.half.toLocaleString('en-IN')})</SelectItem>
                      <SelectItem value="society">Society Event (No Charge)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                <div className="space-y-1.5">
                  <Label>Time Slot</Label>
                  <Select value={timeSlot} onValueChange={v => setTimeSlot(v as TimeSlot)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full">{slotTimes.full.label} — ₹{getRent(userType, 'full', settings, hall).toLocaleString('en-IN')}</SelectItem>
                      <SelectItem value="half-slot1">{slotTimes['half-slot1'].label} — ₹{getRent(userType, 'half-slot1', settings, hall).toLocaleString('en-IN')}</SelectItem>
                      <SelectItem value="half-slot2">{slotTimes['half-slot2'].label} — ₹{getRent(userType, 'half-slot2', settings, hall).toLocaleString('en-IN')}</SelectItem>
                      <SelectItem value="custom">Custom (Max {settings.maxCustomHours} hrs) — ₹{getRent(userType, 'custom', settings, hall).toLocaleString('en-IN')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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
                    {!customValid && <p className="col-span-2 text-xs text-destructive">Custom booking must be 1–{settings.maxCustomHours} hours.</p>}
                  </div>
                )}

                {/* Dynamic Custom Fields */}
                {settings.customFields.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-border/30">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Additional Information</p>
                    {settings.customFields.map(field => (
                      <div key={field.id} className="space-y-1.5">
                        <Label>{field.label} {field.required && '*'}</Label>
                        {field.type === 'text' && (
                          <Input
                            placeholder={field.placeholder || ''}
                            value={customFieldValues[field.id] || ''}
                            onChange={e => setCustomFieldValues({ ...customFieldValues, [field.id]: e.target.value })}
                          />
                        )}
                        {field.type === 'select' && (
                          <Select
                            value={customFieldValues[field.id] || ''}
                            onValueChange={v => setCustomFieldValues({ ...customFieldValues, [field.id]: v })}
                          >
                            <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select...'} /></SelectTrigger>
                            <SelectContent>
                              {(field.options || []).map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {field.type === 'checkbox' && (
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={customFieldValues[field.id] === 'Yes'}
                              onCheckedChange={v => setCustomFieldValues({ ...customFieldValues, [field.id]: v ? 'Yes' : 'No' })}
                            />
                            <span className="text-sm text-muted-foreground">{field.placeholder || field.label}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {conflicts.length > 0 && (
                  <div className="bg-warning/8 border border-warning/20 rounded-lg p-3 space-y-1">
                    <p className="text-xs font-medium text-warning">Existing bookings on this date:</p>
                    {conflicts.map(c => (
                      <p key={c.id} className="text-xs text-muted-foreground">
                        {HALL_LABELS[c.hall]} — {c.timeSlot === 'custom' ? `${formatHour(c.customStartHour!)} – ${formatHour(c.customEndHour!)}` : slotTimes[c.timeSlot as keyof typeof slotTimes]?.label || c.timeSlot}
                      </p>
                    ))}
                  </div>
                )}

                {!slotAvailableState && <p className="text-sm text-destructive font-medium">This time slot conflicts with an existing booking.</p>}

                <div className="flex items-start gap-2 pt-1">
                  <Checkbox id="terms" checked={agreed} onCheckedChange={v => setAgreed(!!v)} />
                  <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
                    I agree to the society's{' '}
                    <button type="button" className="underline text-primary inline-flex items-center gap-0.5" onClick={() => setShowTerms(true)}>
                      Rules & Regulations <ExternalLink className="h-3 w-3 inline" />
                    </button>
                  </label>
                </div>

                <Button className="w-full rounded-lg" disabled={!formValid} onClick={handleSubmitForm}>Proceed to Payment</Button>
              </div>
            )}

            {step === 'payment' && (
              <div className="space-y-4">
                <div className="bg-accent/60 rounded-lg p-4 space-y-2 text-sm border border-border/30">
                  <div className="flex justify-between"><span className="text-muted-foreground">Hall</span><span className="font-medium">{HALL_LABELS[hall]}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Slot</span><span className="font-medium">{slotLabel(timeSlot)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Hall Rent</span><span className="font-medium">₹{rent.toLocaleString('en-IN')}</span></div>
                  <div className="border-t border-border/50 pt-2 flex justify-between font-semibold"><span>Total Payable (Online)</span><span>₹{rent.toLocaleString('en-IN')}</span></div>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">📝 Security Deposit: ₹{deposit.toLocaleString('en-IN')}</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">To be paid via cheque made out to: <strong>"{settings.chequePayeeName || 'Ashar 16 Co. Op. Societies Association Ltd'}"</strong></p>
                </div>

                {showQr && (
                  <div className="bg-accent/60 rounded-lg p-4 space-y-3 text-center border border-border/30">
                    <p className="text-sm font-medium flex items-center justify-center gap-2"><CreditCard className="h-4 w-4" /> Scan QR to Pay</p>
                    {settings.paymentQrUrl ? (
                      <img src={settings.paymentQrUrl} alt="Payment QR" className="mx-auto max-w-[200px] rounded-lg" />
                    ) : settings.upiId ? (
                      <div className="bg-white p-3 rounded-lg inline-block">
                        <QRCode value={`upi://pay?pa=${settings.upiId}&am=${rent}&cu=INR`} size={180} />
                      </div>
                    ) : (
                      <div className="bg-white p-3 rounded-lg inline-block">
                        <QRCode value={`upi://pay?am=${rent}&cu=INR`} size={180} />
                      </div>
                    )}
                    {settings.upiId && <p className="text-xs text-muted-foreground">UPI: {settings.upiId}</p>}
                  </div>
                )}

                <div className="bg-accent/60 rounded-lg p-4 space-y-3 border border-border/30">
                  <p className="text-sm font-medium flex items-center gap-2"><Image className="h-4 w-4" /> Upload Payment Screenshot *</p>
                  {screenshotPreview ? (
                    <div className="relative">
                      <img src={screenshotPreview} alt="Payment screenshot" className="w-full max-h-40 object-contain rounded-lg" />
                      <button onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }} className="absolute top-1 right-1 bg-card rounded-full p-1 shadow">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button variant="outline" className="w-full rounded-lg" onClick={() => screenshotInputRef.current?.click()}>
                      <Upload className="h-4 w-4 mr-1.5" /> Choose Image
                    </Button>
                  )}
                  <input ref={screenshotInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-lg" onClick={() => setStep('form')}>Back</Button>
                  <Button className="flex-1 rounded-lg" onClick={handlePay} disabled={paying || !screenshotFile}>
                    {paying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : `Confirm ₹${rent.toLocaleString('en-IN')}`}
                  </Button>
                </div>
              </div>
            )}

            {step === 'confirmation' && booking && (
              <div className="text-center space-y-4 animate-in fade-in zoom-in-95 duration-500">
                <div className="flex justify-center">
                  <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center animate-in zoom-in duration-500">
                    <CheckCircle className="h-10 w-10 text-success" />
                  </div>
                </div>
                <div>
                  <p className="font-bold text-xl text-foreground">Success! 🎉</p>
                  <p className="text-muted-foreground text-sm mt-1">Your booking is recorded. Please download your receipt and send it to Management.</p>
                  <p className="text-muted-foreground text-xs mt-1">Booking ID: <span className="font-mono font-bold text-primary text-base">{booking.id}</span></p>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-left">
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">📝 Security Deposit Reminder</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Please submit your Security Deposit cheque of <strong>₹{booking.deposit.toLocaleString('en-IN')}</strong> to the society office, made out to <strong>"{settings.chequePayeeName || 'Ashar 16 Co. Op. Societies Association Ltd'}"</strong>.</p>
                </div>

                <div className="bg-accent/60 rounded-lg p-3 text-sm text-left space-y-1 border border-border/30">
                  <p><span className="text-muted-foreground">Date:</span> {formattedDate}</p>
                  <p><span className="text-muted-foreground">Hall:</span> {HALL_LABELS[booking.hall]}</p>
                  <p><span className="text-muted-foreground">Flat:</span> {booking.flatNumber}</p>
                  <p><span className="text-muted-foreground">Name:</span> {booking.name}</p>
                  <p><span className="text-muted-foreground">Phone:</span> {booking.phone || '—'}</p>
                  <p><span className="text-muted-foreground">Event:</span> {booking.eventType}</p>
                  <p><span className="text-muted-foreground">Attendees:</span> {booking.memberCount}</p>
                  <p><span className="text-muted-foreground">Amount Paid:</span> ₹{booking.total.toLocaleString('en-IN')}</p>
                  {booking.customData && settings.customFields.map(f => {
                    const val = booking.customData?.[f.id];
                    if (!val) return null;
                    return <p key={f.id}><span className="text-muted-foreground">{f.label}:</span> {val}</p>;
                  })}
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-left">
                  <p className="text-xs text-primary font-semibold">🛡️ Show the QR code in your downloaded receipt to the guard on the day of the event.</p>
                </div>

                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3 text-left">
                  <p className="text-xs text-destructive font-bold">⚠️ MANDATORY: Send the Booking receipt to Management for confirmation.</p>
                </div>

                <div className="space-y-2">
                  <Button variant="outline" className="w-full rounded-lg" onClick={() => downloadBookingPDF(booking, verificationUrl)}>
                    <Download className="h-4 w-4 mr-1.5" /> Download Receipt
                  </Button>
                  <Button variant="secondary" className="w-full rounded-lg" onClick={handleShareWhatsAppManagement}>
                    <Send className="h-4 w-4 mr-1.5" /> Send to Management via WhatsApp
                  </Button>
                </div>

                <div className="bg-muted/60 border border-border/40 rounded-lg p-3 text-left space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">📌 How to share your receipt</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Click <strong>"Download Receipt"</strong> to save your PDF.</li>
                    <li>Click <strong>"Send to Management"</strong> to open WhatsApp.</li>
                    <li>Attach the downloaded PDF to the message and hit send!</li>
                  </ol>
                </div>

                <Button variant="outline" size="sm" className="w-full rounded-lg" onClick={handleCopyToClipboard}>
                  <Send className="h-4 w-4 mr-1.5" /> Copy Details
                </Button>
                <Button className="w-full rounded-lg" onClick={onBooked}>Done</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rules & Regulations – {societyName}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground space-y-3">
            {settings.rules.map((rule, i) => (
              <p key={i}>{i + 1}. {rule}</p>
            ))}
            {settings.rulesPdfUrl && (
              <div className="pt-3 border-t">
                <Button variant="outline" size="sm" onClick={handleViewRulesPdf}>
                  <FileText className="h-4 w-4 mr-1.5" /> Download Detailed Rules PDF
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useState, useMemo, useRef } from 'react';
import { Trash2, IndianRupee, CalendarDays, Ban, Settings, LogOut, Plus, Pencil, Camera, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import {
  getBookings, cancelBooking, HALL_LABELS, formatHour, getSlotTimes,
  createBooking, updateBooking, getRent, getDynamicDeposit, isSlotAvailable,
  type Booking, type HallOption, type UserType, type TimeSlot
} from '@/lib/bookingStore';
import { getSettings } from '@/lib/settingsStore';
import { getAuth, isAdmin, logout } from '@/lib/authStore';
import AdminSettings from '@/components/AdminSettings';
import LoginForm from '@/components/LoginForm';
import { toast } from 'sonner';

type Tab = 'bookings' | 'settings';

export default function Admin() {
  const [authed, setAuthed] = useState(isAdmin());
  const [tab, setTab] = useState<Tab>('bookings');
  const [refreshKey, setRefreshKey] = useState(0);
  const bookings = useMemo(() => getBookings(), [refreshKey]);

  // Modal states
  const [showManualModal, setShowManualModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);
  const [penaltyBooking, setPenaltyBooking] = useState<Booking | null>(null);

  if (!authed) {
    return <LoginForm expectedRole="admin" onSuccess={() => setAuthed(true)} />;
  }

  const activeBookings = bookings.filter(b => b.status === 'confirmed');
  const totalRevenue = activeBookings.reduce((s, b) => s + b.total, 0);
  const totalPenalties = bookings.reduce((s, b) => s + (b.penaltyAmount || 0), 0);
  const upcomingCount = activeBookings.filter(b => new Date(b.date) >= new Date(new Date().toDateString())).length;

  function handleCancel(id: string) {
    if (confirm('Cancel this booking and process refund?')) {
      cancelBooking(id);
      setRefreshKey(k => k + 1);
    }
  }

  function handleLogout() {
    logout();
    setAuthed(false);
  }

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const slotLabel = (b: Booking) => {
    if (b.timeSlot === 'custom') return `${formatHour(b.customStartHour!)}–${formatHour(b.customEndHour!)}`;
    const slots = getSlotTimes();
    return slots[b.timeSlot as keyof typeof slots]?.label?.replace(/\s*\(.*\)/, '') || b.timeSlot;
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-accent rounded-lg p-1">
            <button
              onClick={() => setTab('bookings')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'bookings' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <CalendarDays className="h-4 w-4 inline mr-1.5" />Bookings
            </button>
            <button
              onClick={() => setTab('settings')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'settings' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <Settings className="h-4 w-4 inline mr-1.5" />Settings
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1.5" /> Logout
          </Button>
        </div>
      </div>

      {tab === 'settings' && <AdminSettings />}

      {tab === 'bookings' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><CalendarDays className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm text-muted-foreground">Upcoming</p><p className="text-xl font-bold">{upcomingCount}</p></div>
            </div>
            <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-success" /></div>
              <div><p className="text-sm text-muted-foreground">Total Revenue</p><p className="text-xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
            </div>
            <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-sm text-muted-foreground">Total Penalties</p><p className="text-xl font-bold">₹{totalPenalties.toLocaleString('en-IN')}</p></div>
            </div>
            <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center"><Ban className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-sm text-muted-foreground">Cancelled</p><p className="text-xl font-bold">{bookings.filter(b => b.status === 'cancelled').length}</p></div>
            </div>
          </div>

          {/* Manual Booking Button */}
          <div className="flex justify-end mb-4">
            <Button onClick={() => { setEditingBooking(null); setShowManualModal(true); }}>
              <Plus className="h-4 w-4 mr-1.5" /> Manual Booking
            </Button>
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
                    <th className="text-right p-3 font-medium text-muted-foreground">Penalty</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    <th className="p-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 && (
                    <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">No bookings yet</td></tr>
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
                      <td className="p-3 text-right">
                        {b.penaltyAmount ? (
                          <span className="text-amber-600 font-medium">₹{b.penaltyAmount.toLocaleString('en-IN')}</span>
                        ) : '—'}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={b.status === 'confirmed' ? 'default' : 'destructive'} className="text-xs">
                          {b.status === 'confirmed' ? 'Active' : 'Cancelled'}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          {b.paymentScreenshot && (
                            <Button variant="ghost" size="icon" onClick={() => setViewScreenshot(b.paymentScreenshot!)} title="View Payment Screenshot">
                              <Camera className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {b.status === 'confirmed' && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => { setEditingBooking(b); setShowManualModal(true); }} title="Edit Booking">
                                <Pencil className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setPenaltyBooking(b)} title="Add Penalty">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleCancel(b.id)} title="Cancel & Refund">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Manual/Edit Booking Modal */}
      {showManualModal && (
        <ManualBookingModal
          existingBooking={editingBooking}
          onClose={() => { setShowManualModal(false); setEditingBooking(null); }}
          onSaved={() => { setShowManualModal(false); setEditingBooking(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {/* Payment Screenshot Viewer */}
      <Dialog open={!!viewScreenshot} onOpenChange={() => setViewScreenshot(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Payment Screenshot</DialogTitle></DialogHeader>
          {viewScreenshot && <img src={viewScreenshot} alt="Payment screenshot" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Penalty Modal */}
      {penaltyBooking && (
        <PenaltyModal
          booking={penaltyBooking}
          onClose={() => setPenaltyBooking(null)}
          onSaved={() => { setPenaltyBooking(null); setRefreshKey(k => k + 1); }}
        />
      )}
    </div>
  );
}

// --- Manual / Edit Booking Modal ---
function ManualBookingModal({ existingBooking, onClose, onSaved }: { existingBooking: Booking | null; onClose: () => void; onSaved: () => void }) {
  const settings = getSettings();
  const isEdit = !!existingBooking;

  const [flatNumber, setFlatNumber] = useState(existingBooking?.flatNumber || '');
  const [name, setName] = useState(existingBooking?.name || '');
  const [phone, setPhone] = useState(existingBooking?.phone || '');
  const [eventType, setEventType] = useState(existingBooking?.eventType || '');
  const [memberCount, setMemberCount] = useState(String(existingBooking?.memberCount || ''));
  const [hall, setHall] = useState<HallOption>(existingBooking?.hall || 'b-wing');
  const [userType, setUserType] = useState<UserType>(existingBooking?.userType || 'resident');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(existingBooking?.timeSlot || 'full');
  const [customStart, setCustomStart] = useState(existingBooking?.customStartHour || 8);
  const [customEnd, setCustomEnd] = useState(existingBooking?.customEndHour || 14);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    existingBooking ? new Date(existingBooking.date + 'T00:00:00') : new Date()
  );

  const dateStr = selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '';

  const slotTimes = getSlotTimes();
  const rent = getRent(userType, timeSlot);
  const deposit = getDynamicDeposit();

  const CUSTOM_HOURS = Array.from({ length: settings.hallCloseTime - settings.hallOpenTime + 1 }, (_, i) => i + settings.hallOpenTime);

  const available = useMemo(() => {
    if (!dateStr) return true;
    if (timeSlot === 'custom') return isSlotAvailable(dateStr, hall, 'custom', customStart, customEnd, isEdit ? existingBooking!.id : undefined);
    return isSlotAvailable(dateStr, hall, timeSlot, undefined, undefined, isEdit ? existingBooking!.id : undefined);
  }, [dateStr, hall, timeSlot, customStart, customEnd, isEdit, existingBooking]);

  const formValid = flatNumber.trim() && name.trim() && phone.trim() && eventType.trim() && parseInt(memberCount) > 0 && available && dateStr;

  function handleSave() {
    if (!formValid) return;
    const data = {
      flatNumber: flatNumber.trim(),
      name: name.trim(),
      phone: phone.trim(),
      eventType: eventType.trim(),
      date: dateStr,
      timeSlot,
      ...(timeSlot === 'custom' ? { customStartHour: customStart, customEndHour: customEnd } : {}),
      hall,
      userType,
      memberCount: parseInt(memberCount),
      rent,
      deposit,
    };

    if (isEdit) {
      updateBooking(existingBooking!.id, data);
      toast.success('Booking updated');
    } else {
      createBooking(data);
      toast.success('Manual booking created');
    }
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Booking' : 'Manual Booking'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {/* Date Picker */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Flat Number *</Label>
            <Input value={flatNumber} onChange={e => setFlatNumber(e.target.value)} placeholder="e.g. A-101" />
          </div>
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" />
          </div>
          <div className="space-y-1.5">
            <Label>Phone Number *</Label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" type="tel" maxLength={15} />
          </div>
          <div className="space-y-1.5">
            <Label>Event Type *</Label>
            <Input value={eventType} onChange={e => setEventType(e.target.value)} placeholder="e.g. Birthday" />
          </div>
          <div className="space-y-1.5">
            <Label>Member Count *</Label>
            <Input type="number" value={memberCount} onChange={e => setMemberCount(e.target.value)} min={1} />
          </div>
          <div className="space-y-1.5">
            <Label>User Type</Label>
            <Select value={userType} onValueChange={v => setUserType(v as UserType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="resident">Resident</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Hall</Label>
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
                <SelectItem value="full">{slotTimes.full.label}</SelectItem>
                <SelectItem value="half-slot1">{slotTimes['half-slot1'].label}</SelectItem>
                <SelectItem value="half-slot2">{slotTimes['half-slot2'].label}</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timeSlot === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
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
                <Label>End</Label>
                <Select value={String(customEnd)} onValueChange={v => setCustomEnd(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOM_HOURS.filter(h => h > customStart && h <= settings.hallCloseTime && h - customStart <= settings.maxCustomHours).map(h => (
                      <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {!available && <p className="text-sm text-destructive font-medium">Slot conflicts with an existing booking.</p>}

          <div className="bg-accent rounded-lg p-3 text-sm">
            <div className="flex justify-between"><span>Rent</span><span>₹{rent.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Deposit</span><span>₹{deposit.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between font-semibold border-t mt-1 pt-1"><span>Total</span><span>₹{(rent + deposit).toLocaleString('en-IN')}</span></div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={!formValid} onClick={handleSave}>
              {isEdit ? 'Update Booking' : 'Create Booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Penalty Modal ---
function PenaltyModal({ booking, onClose, onSaved }: { booking: Booking; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(booking.penaltyAmount || ''));
  const [reason, setReason] = useState(booking.penaltyReason || '');

  function handleSave() {
    updateBooking(booking.id, {
      penaltyAmount: parseInt(amount) || 0,
      penaltyReason: reason.trim(),
    });
    toast.success('Penalty updated');
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Penalty — {booking.id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Penalty Amount (₹)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0} />
          </div>
          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Property damage" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave}>Save Penalty</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

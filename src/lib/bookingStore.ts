import { v4 as uuidv4 } from 'uuid';

export type HallOption = 'b-wing' | 'c-wing' | 'both';
export type UserType = 'resident' | 'tenant';
export type TimeSlot = 'full' | 'half-slot1' | 'half-slot2' | 'custom';

export interface Booking {
  id: string;
  flatNumber: string;
  name: string;
  eventType: string;
  date: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  customStartHour?: number; // 8-16 for custom slots
  customEndHour?: number;   // 10-22 for custom slots
  hall: HallOption;
  userType: UserType;
  memberCount: number;
  rent: number;
  deposit: number;
  total: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

export const SLOT_TIMES: Record<Exclude<TimeSlot, 'custom'>, { start: number; end: number; label: string }> = {
  'full': { start: 8, end: 22, label: 'Full Day (8:00 AM – 10:00 PM)' },
  'half-slot1': { start: 8, end: 14, label: 'Half Day Slot 1 (8:00 AM – 2:00 PM)' },
  'half-slot2': { start: 16, end: 22, label: 'Half Day Slot 2 (4:00 PM – 10:00 PM)' },
};

export const HALL_LABELS: Record<HallOption, string> = {
  'b-wing': 'B-Wing Hall',
  'c-wing': 'C-Wing Hall',
  'both': 'Both (B & C Wing)',
};

export const PRICING: Record<UserType, { full: number; half: number }> = {
  resident: { full: 7000, half: 4000 },
  tenant: { full: 8000, half: 5000 },
};

export function getRent(userType: UserType, timeSlot: TimeSlot): number {
  const p = PRICING[userType];
  return timeSlot === 'full' ? p.full : p.half;
}

export const DEPOSIT = 2000;

const STORAGE_KEY = 'community_hall_bookings';

function loadBookings(): Booking[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveBookings(bookings: Booking[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

export function getBookings(): Booking[] {
  return loadBookings();
}

export function getActiveBookings(): Booking[] {
  return loadBookings().filter(b => b.status === 'confirmed');
}

export function getBookingsForDate(date: string, hall?: HallOption): Booking[] {
  return getActiveBookings().filter(b => {
    if (b.date !== date) return false;
    if (hall && hall !== 'both' && b.hall !== 'both' && b.hall !== hall) return false;
    return true;
  });
}

function getSlotRange(b: Booking): { start: number; end: number } {
  if (b.timeSlot === 'custom') return { start: b.customStartHour || 8, end: b.customEndHour || 14 };
  return SLOT_TIMES[b.timeSlot];
}

export function getConflictingSlots(date: string, hall: HallOption): Booking[] {
  const active = getActiveBookings().filter(b => b.date === date);
  return active.filter(b => {
    if (hall === 'both') return true;
    if (b.hall === 'both') return true;
    return b.hall === hall;
  });
}

export function isSlotAvailable(date: string, hall: HallOption, timeSlot: TimeSlot, customStart?: number, customEnd?: number): boolean {
  const conflicts = getConflictingSlots(date, hall);
  const newRange = timeSlot === 'custom'
    ? { start: customStart || 8, end: customEnd || 14 }
    : SLOT_TIMES[timeSlot];

  return !conflicts.some(b => {
    const existing = getSlotRange(b);
    return newRange.start < existing.end && newRange.end > existing.start;
  });
}

export function isDateAvailable(date: string): boolean {
  const active = getActiveBookings().filter(b => b.date === date);
  // If any full-day booking exists for both halls, fully booked
  const fullBoth = active.some(b => b.timeSlot === 'full' && b.hall === 'both');
  if (fullBoth) return false;
  // Check if both individual halls are fully booked for full day
  const fullB = active.some(b => b.timeSlot === 'full' && (b.hall === 'b-wing' || b.hall === 'both'));
  const fullC = active.some(b => b.timeSlot === 'full' && (b.hall === 'c-wing' || b.hall === 'both'));
  if (fullB && fullC) return false;
  return true;
}

export function createBooking(data: Omit<Booking, 'id' | 'total' | 'status' | 'createdAt'>): Booking {
  const booking: Booking = {
    ...data,
    id: uuidv4().slice(0, 8).toUpperCase(),
    total: data.rent + data.deposit,
    status: 'confirmed',
    createdAt: new Date().toISOString(),
  };
  const bookings = loadBookings();
  bookings.push(booking);
  saveBookings(bookings);
  return booking;
}

export function cancelBooking(id: string): boolean {
  const bookings = loadBookings();
  const idx = bookings.findIndex(b => b.id === id);
  if (idx === -1) return false;
  bookings[idx].status = 'cancelled';
  saveBookings(bookings);
  return true;
}

export function findBooking(id: string): Booking | undefined {
  return loadBookings().find(b => b.id === id);
}

export function validateBooking(id: string): { valid: boolean; booking?: Booking } {
  const booking = findBooking(id);
  if (!booking || booking.status === 'cancelled') return { valid: false };
  const bookingDate = new Date(booking.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) return { valid: false };
  return { valid: true, booking };
}

export function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

// Seed some dummy bookings
export function seedDummyData() {
  if (loadBookings().length > 0) return;
  const today = new Date();
  const dummies = [
    { flatNumber: 'A-101', name: 'Raj Sharma', eventType: 'Birthday Party', daysOffset: 3, timeSlot: 'full' as const, hall: 'b-wing' as const, userType: 'resident' as const, memberCount: 30 },
    { flatNumber: 'B-204', name: 'Priya Patel', eventType: 'Anniversary', daysOffset: 7, timeSlot: 'half-slot1' as const, hall: 'c-wing' as const, userType: 'tenant' as const, memberCount: 20 },
    { flatNumber: 'C-302', name: 'Amit Singh', eventType: 'Meeting', daysOffset: 12, timeSlot: 'full' as const, hall: 'both' as const, userType: 'resident' as const, memberCount: 50 },
    { flatNumber: 'A-405', name: 'Sneha Gupta', eventType: 'Pooja', daysOffset: 18, timeSlot: 'full' as const, hall: 'b-wing' as const, userType: 'resident' as const, memberCount: 40 },
  ];
  dummies.forEach(d => {
    const date = new Date(today);
    date.setDate(date.getDate() + d.daysOffset);
    createBooking({
      flatNumber: d.flatNumber,
      name: d.name,
      eventType: d.eventType,
      date: date.toISOString().split('T')[0],
      timeSlot: d.timeSlot,
      hall: d.hall,
      userType: d.userType,
      memberCount: d.memberCount,
      rent: getRent(d.userType, d.timeSlot),
      deposit: DEPOSIT,
    });
  });
}

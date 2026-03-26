import { v4 as uuidv4 } from 'uuid';

export interface Booking {
  id: string;
  flatNumber: string;
  name: string;
  eventType: string;
  date: string; // YYYY-MM-DD
  timeSlot: 'full' | 'half-morning' | 'half-evening';
  rent: number;
  deposit: number;
  total: number;
  status: 'confirmed' | 'cancelled';
  createdAt: string;
}

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

export function getBookedDates(): string[] {
  return getActiveBookings()
    .filter(b => b.timeSlot === 'full')
    .map(b => b.date);
}

export function isDateAvailable(date: string): boolean {
  const active = getActiveBookings().filter(b => b.date === date);
  return !active.some(b => b.timeSlot === 'full') && active.length < 2;
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

// Seed some dummy bookings
export function seedDummyData() {
  if (loadBookings().length > 0) return;
  const today = new Date();
  const dummies = [
    { flatNumber: 'A-101', name: 'Raj Sharma', eventType: 'Birthday Party', daysOffset: 3, timeSlot: 'full' as const },
    { flatNumber: 'B-204', name: 'Priya Patel', eventType: 'Anniversary', daysOffset: 7, timeSlot: 'half-morning' as const },
    { flatNumber: 'C-302', name: 'Amit Singh', eventType: 'Meeting', daysOffset: 12, timeSlot: 'full' as const },
    { flatNumber: 'A-405', name: 'Sneha Gupta', eventType: 'Pooja', daysOffset: 18, timeSlot: 'full' as const },
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
      rent: 100,
      deposit: 50,
    });
  });
}

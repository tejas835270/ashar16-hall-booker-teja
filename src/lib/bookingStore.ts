import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

export type HallOption = 'b-wing' | 'c-wing' | 'both';
export type UserType = 'resident' | 'tenant';
export type TimeSlot = 'full' | 'half-slot1' | 'half-slot2' | 'custom';
export type BookingType = 'online' | 'manual';

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'select' | 'checkbox';
  placeholder?: string;
  required: boolean;
  options?: string[]; // for select type
}

export interface Booking {
  id: string;
  flatNumber: string;
  name: string;
  phone?: string;
  eventType: string;
  date: string;
  timeSlot: TimeSlot;
  customStartHour?: number;
  customEndHour?: number;
  hall: HallOption;
  userType: UserType;
  memberCount: number;
  rent: number;
  deposit: number;
  total: number;
  status: 'confirmed' | 'cancelled';
  bookingType: BookingType;
  createdAt: string;
  paymentScreenshotUrl?: string;
  penaltyAmount?: number;
  penaltyReason?: string;
  customData?: Record<string, string>;
}

function rowToBooking(row: any): Booking {
  return {
    id: row.id,
    flatNumber: row.flat_number,
    name: row.name,
    phone: row.phone || undefined,
    eventType: row.event_type,
    date: row.date,
    timeSlot: row.time_slot as TimeSlot,
    customStartHour: row.custom_start_hour ?? undefined,
    customEndHour: row.custom_end_hour ?? undefined,
    hall: row.hall as HallOption,
    userType: row.user_type as UserType,
    memberCount: row.member_count,
    rent: row.rent,
    deposit: row.deposit,
    total: row.total,
    status: row.status as 'confirmed' | 'cancelled',
    bookingType: (row.booking_type || 'online') as BookingType,
    createdAt: row.created_at,
    paymentScreenshotUrl: row.payment_screenshot_url || undefined,
    penaltyAmount: row.penalty_amount ?? undefined,
    penaltyReason: row.penalty_reason || undefined,
    customData: row.custom_data || undefined,
  };
}

let cachedSettings: HallSettings | null = null;

export interface HallSettings {
  societyName: string;
  rules: string[];
  rulesPdfUrl?: string;
  rulesPdfName?: string;
  hallOpenTime: number;
  hallCloseTime: number;
  maxCustomHours: number;
  pricing: {
    resident: { full: number; half: number };
    tenant: { full: number; half: number };
  };
  deposit: number;
  halls: { key: string; label: string }[];
  paymentMode: 'qr' | 'manual' | 'both';
  upiId?: string;
  paymentQrUrl?: string;
  penaltyNotice?: string;
  chequePayeeName?: string;
  customFields: CustomField[];
}

const DEFAULT_SETTINGS: HallSettings = {
  societyName: 'Ashar 16 CHSL',
  rules: [],
  hallOpenTime: 8,
  hallCloseTime: 22,
  maxCustomHours: 6,
  pricing: {
    resident: { full: 4000, half: 2500 },
    tenant: { full: 5000, half: 3000 },
  },
  deposit: 2000,
  halls: [
    { key: 'b-wing', label: 'B-Wing Hall' },
    { key: 'c-wing', label: 'C-Wing Hall' },
    { key: 'both', label: 'Both (B & C Wing)' },
  ],
  paymentMode: 'both',
  upiId: '',
  customFields: [],
};

function rowToSettings(row: any): HallSettings {
  return {
    societyName: row.society_name || 'Ashar 16 CHSL',
    rules: Array.isArray(row.rules) ? row.rules : [],
    rulesPdfUrl: row.rules_pdf_url || undefined,
    rulesPdfName: row.rules_pdf_name || undefined,
    hallOpenTime: row.hall_open_time,
    hallCloseTime: row.hall_close_time,
    maxCustomHours: row.max_custom_hours,
    pricing: typeof row.pricing === 'object' ? row.pricing as any : DEFAULT_SETTINGS.pricing,
    deposit: row.deposit,
    halls: Array.isArray(row.halls) ? row.halls as any : DEFAULT_SETTINGS.halls,
    paymentMode: (row.payment_mode || 'both') as HallSettings['paymentMode'],
    upiId: row.upi_id || undefined,
    paymentQrUrl: row.payment_qr_url || undefined,
    penaltyNotice: row.penalty_notice || undefined,
    chequePayeeName: row.cheque_payee_name || 'Ashar 16 Co. Op. Societies Association Ltd',
    customFields: Array.isArray(row.custom_fields) ? row.custom_fields : [],
  };
}

export async function fetchSettings(): Promise<HallSettings> {
  const { data, error } = await supabase.from('settings').select('*').eq('id', 1).single();
  if (error || !data) return DEFAULT_SETTINGS;
  const s = rowToSettings(data);
  cachedSettings = s;
  return s;
}

export function getCachedSettings(): HallSettings {
  return cachedSettings || DEFAULT_SETTINGS;
}

export async function saveSettings(settings: HallSettings): Promise<void> {
  await supabase.from('settings').update({
    society_name: settings.societyName,
    rules: settings.rules as any,
    rules_pdf_url: settings.rulesPdfUrl || null,
    rules_pdf_name: settings.rulesPdfName || null,
    hall_open_time: settings.hallOpenTime,
    hall_close_time: settings.hallCloseTime,
    max_custom_hours: settings.maxCustomHours,
    pricing: settings.pricing as any,
    deposit: settings.deposit,
    halls: settings.halls as any,
    payment_mode: settings.paymentMode,
    upi_id: settings.upiId || null,
    payment_qr_url: settings.paymentQrUrl || null,
    penalty_notice: settings.penaltyNotice || null,
    cheque_payee_name: settings.chequePayeeName || 'Ashar 16 Co. Op. Societies Association Ltd',
    custom_fields: settings.customFields as any,
    updated_at: new Date().toISOString(),
  }).eq('id', 1);
  cachedSettings = settings;
}

// ---- SLOT/HALL HELPERS ----
export function getSlotTimes(s?: HallSettings) {
  const settings = s || getCachedSettings();
  return {
    'full': { start: settings.hallOpenTime, end: settings.hallCloseTime, label: `Full Day (${formatHour(settings.hallOpenTime)} – ${formatHour(settings.hallCloseTime)})` },
    'half-slot1': { start: settings.hallOpenTime, end: settings.hallOpenTime + Math.floor((settings.hallCloseTime - settings.hallOpenTime) / 2), label: `Half Day Slot 1 (${formatHour(settings.hallOpenTime)} – ${formatHour(settings.hallOpenTime + Math.floor((settings.hallCloseTime - settings.hallOpenTime) / 2))})` },
    'half-slot2': { start: settings.hallCloseTime - Math.floor((settings.hallCloseTime - settings.hallOpenTime) / 2), end: settings.hallCloseTime, label: `Half Day Slot 2 (${formatHour(settings.hallCloseTime - Math.floor((settings.hallCloseTime - settings.hallOpenTime) / 2))} – ${formatHour(settings.hallCloseTime)})` },
  } as const;
}

export function getHallLabels(s?: HallSettings): Record<string, string> {
  const settings = s || getCachedSettings();
  const labels: Record<string, string> = {};
  settings.halls.forEach(h => { labels[h.key] = h.label; });
  return labels;
}

export const HALL_LABELS: Record<HallOption, string> = {
  'b-wing': 'B-Wing Hall',
  'c-wing': 'C-Wing Hall',
  'both': 'Both (B & C Wing)',
};

export function getRent(userType: UserType, timeSlot: TimeSlot, s?: HallSettings, hall?: HallOption): number {
  const settings = s || getCachedSettings();
  const p = settings.pricing[userType];
  const base = timeSlot === 'full' ? p.full : p.half;
  return hall === 'both' ? base * 2 : base;
}

export function getDynamicDeposit(s?: HallSettings): number {
  return (s || getCachedSettings()).deposit;
}

// ---- BOOKINGS ----
export async function fetchBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from('bookings').select('*').order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map(rowToBooking);
}

export async function fetchActiveBookings(): Promise<Booking[]> {
  const { data, error } = await supabase.from('bookings').select('*').eq('status', 'confirmed').order('date', { ascending: true });
  if (error || !data) return [];
  return data.map(rowToBooking);
}

export async function fetchBookingsForDate(date: string): Promise<Booking[]> {
  const { data, error } = await supabase.from('bookings').select('*').eq('date', date).eq('status', 'confirmed');
  if (error || !data) return [];
  return data.map(rowToBooking);
}

function getSlotRange(b: Booking): { start: number; end: number } {
  if (b.timeSlot === 'custom') return { start: b.customStartHour || 8, end: b.customEndHour || 14 };
  const slots = getSlotTimes();
  const s = slots[b.timeSlot as keyof typeof slots];
  return s || { start: 8, end: 22 };
}

export async function isSlotAvailable(date: string, hall: HallOption, timeSlot: TimeSlot, customStart?: number, customEnd?: number, excludeId?: string): Promise<boolean> {
  const bookings = await fetchBookingsForDate(date);
  const conflicts = bookings.filter(b => {
    if (excludeId && b.id === excludeId) return false;
    if (hall === 'both') return true;
    if (b.hall === 'both') return true;
    return b.hall === hall;
  });

  const slots = getSlotTimes();
  const newRange = timeSlot === 'custom'
    ? { start: customStart || 8, end: customEnd || 14 }
    : slots[timeSlot];

  return !conflicts.some(b => {
    const existing = getSlotRange(b);
    return newRange.start < existing.end && newRange.end > existing.start;
  });
}

export async function isDateAvailable(date: string): Promise<boolean> {
  const active = await fetchBookingsForDate(date);
  const fullBoth = active.some(b => b.timeSlot === 'full' && b.hall === 'both');
  if (fullBoth) return false;
  const fullB = active.some(b => b.timeSlot === 'full' && (b.hall === 'b-wing' || b.hall === 'both'));
  const fullC = active.some(b => b.timeSlot === 'full' && (b.hall === 'c-wing' || b.hall === 'both'));
  if (fullB && fullC) return false;
  return true;
}

export async function createBooking(data: Omit<Booking, 'id' | 'total' | 'status' | 'createdAt'>): Promise<Booking> {
  const id = uuidv4().slice(0, 8).toUpperCase();
  const total = data.rent;
  const now = new Date().toISOString();

  const row = {
    id,
    flat_number: data.flatNumber,
    name: data.name,
    phone: data.phone || null,
    event_type: data.eventType,
    date: data.date,
    time_slot: data.timeSlot,
    custom_start_hour: data.customStartHour ?? null,
    custom_end_hour: data.customEndHour ?? null,
    hall: data.hall,
    user_type: data.userType,
    member_count: data.memberCount,
    rent: data.rent,
    deposit: data.deposit,
    total,
    status: 'confirmed',
    booking_type: data.bookingType || 'online',
    payment_screenshot_url: data.paymentScreenshotUrl || null,
    penalty_amount: 0,
    penalty_reason: null,
    custom_data: data.customData || {},
    created_at: now,
  };

  const { error } = await supabase.from('bookings').insert(row);
  if (error) throw error;

  return {
    ...data,
    id,
    total,
    status: 'confirmed',
    bookingType: data.bookingType || 'online',
    createdAt: now,
  };
}

export async function updateBooking(id: string, updates: Partial<Booking>): Promise<boolean> {
  const dbUpdates: any = {};
  if (updates.flatNumber !== undefined) dbUpdates.flat_number = updates.flatNumber;
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
  if (updates.eventType !== undefined) dbUpdates.event_type = updates.eventType;
  if (updates.date !== undefined) dbUpdates.date = updates.date;
  if (updates.timeSlot !== undefined) dbUpdates.time_slot = updates.timeSlot;
  if (updates.customStartHour !== undefined) dbUpdates.custom_start_hour = updates.customStartHour;
  if (updates.customEndHour !== undefined) dbUpdates.custom_end_hour = updates.customEndHour;
  if (updates.hall !== undefined) dbUpdates.hall = updates.hall;
  if (updates.userType !== undefined) dbUpdates.user_type = updates.userType;
  if (updates.memberCount !== undefined) dbUpdates.member_count = updates.memberCount;
  if (updates.rent !== undefined) dbUpdates.rent = updates.rent;
  if (updates.deposit !== undefined) dbUpdates.deposit = updates.deposit;
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.bookingType !== undefined) dbUpdates.booking_type = updates.bookingType;
  if (updates.paymentScreenshotUrl !== undefined) dbUpdates.payment_screenshot_url = updates.paymentScreenshotUrl;
  if (updates.penaltyAmount !== undefined) dbUpdates.penalty_amount = updates.penaltyAmount;
  if (updates.penaltyReason !== undefined) dbUpdates.penalty_reason = updates.penaltyReason;
  if (updates.customData !== undefined) dbUpdates.custom_data = updates.customData;

  if (updates.rent !== undefined || updates.deposit !== undefined) {
    const { data: current } = await supabase.from('bookings').select('rent, deposit').eq('id', id).single();
    if (current) {
      dbUpdates.total = (updates.rent ?? current.rent) + (updates.deposit ?? current.deposit);
    }
  }

  const { error } = await supabase.from('bookings').update(dbUpdates).eq('id', id);
  return !error;
}

export async function cancelBooking(id: string): Promise<boolean> {
  const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
  return !error;
}

export async function deleteBooking(id: string): Promise<boolean> {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  return !error;
}

export async function findBooking(id: string): Promise<Booking | undefined> {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
  if (error || !data) return undefined;
  return rowToBooking(data);
}

export async function validateBooking(id: string): Promise<{ valid: boolean; booking?: Booking; isUpcoming?: boolean }> {
  const booking = await findBooking(id);
  if (!booking || booking.status === 'cancelled') return { valid: false };
  const bookingDate = new Date(booking.date + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (bookingDate < today) return { valid: false };
  const isUpcoming = bookingDate > today;
  return { valid: true, booking, isUpcoming };
}

// ---- FILE UPLOAD ----
export async function uploadFile(file: File, folder: string): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const fileName = `${folder}/${uuidv4()}.${ext}`;
  const { error } = await supabase.storage.from('uploads').upload(fileName, file);
  if (error) return null;
  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return data.publicUrl;
}

export async function uploadBase64File(base64: string, folder: string, ext: string): Promise<string | null> {
  const response = await fetch(base64);
  const blob = await response.blob();
  const fileName = `${folder}/${uuidv4()}.${ext}`;
  const { error } = await supabase.storage.from('uploads').upload(fileName, blob);
  if (error) return null;
  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return data.publicUrl;
}

export function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

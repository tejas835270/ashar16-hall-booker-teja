const SETTINGS_KEY = 'community_hall_settings';

export interface HallSettings {
  rules: string[];
  hallOpenTime: number; // hour 0-23
  hallCloseTime: number;
  maxCustomHours: number;
  pricing: {
    resident: { full: number; half: number };
    tenant: { full: number; half: number };
  };
  deposit: number;
  halls: { key: string; label: string }[];
}

const DEFAULT_SETTINGS: HallSettings = {
  rules: [
    'The community hall must be vacated by 10:00 PM sharp. Any extension requires prior written approval from the committee.',
    'The person booking the hall is responsible for any damages to property. The security deposit will be forfeited in case of damages.',
    'Loud music/DJ is not permitted after 10:00 PM as per local municipal guidelines.',
    'Decorations must not damage walls, ceilings, or fixtures. Use of nails, screws, or adhesive tape on walls is prohibited.',
    'The hall must be left in a clean condition. The booking party is responsible for cleanup or must arrange for professional cleaning.',
    'Outside caterers are permitted but must follow the society\'s hygiene standards. Cooking inside the hall is not allowed.',
    'Parking for guests must be arranged within the designated visitor parking area only. Blocking resident parking is not permitted.',
    'Alcohol consumption is permitted only for private events and must comply with all local laws and regulations.',
    'The society committee reserves the right to cancel any booking with prior notice in case of emergency maintenance or society events.',
    'All bookings are non-transferable. The registered flat member must be present during the event.',
  ],
  hallOpenTime: 8,
  hallCloseTime: 22,
  maxCustomHours: 6,
  pricing: {
    resident: { full: 7000, half: 4000 },
    tenant: { full: 8000, half: 5000 },
  },
  deposit: 2000,
  halls: [
    { key: 'b-wing', label: 'B-Wing Hall' },
    { key: 'c-wing', label: 'C-Wing Hall' },
    { key: 'both', label: 'Both (B & C Wing)' },
  ],
};

export function getSettings(): HallSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: HallSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function getDefaultSettings(): HallSettings {
  return DEFAULT_SETTINGS;
}

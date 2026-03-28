// Settings are now managed in bookingStore.ts
// This file is kept for backward compatibility but re-exports from bookingStore
export type { HallSettings } from './bookingStore';
export { fetchSettings as getSettings, saveSettings, getCachedSettings as getDefaultSettings } from './bookingStore';

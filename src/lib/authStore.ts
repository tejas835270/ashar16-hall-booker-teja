import { supabase } from '@/integrations/supabase/client';

const AUTH_KEY = 'community_hall_auth';

export type Role = 'admin' | 'guard' | null;

interface AuthState {
  role: Role;
  username: string;
}

// Fetch credentials from DB
async function fetchCredentials(): Promise<{ admin: { username: string; password: string }; guard: { username: string; password: string } }> {
  const { data } = await supabase.from('credentials').select('*');
  const defaults = {
    admin: { username: 'Ashar16', password: 'admin123' },
    guard: { username: 'Ashar_Guard', password: 'guard123' },
  };
  if (!data) return defaults;
  for (const row of data) {
    if (row.role === 'admin') defaults.admin = { username: row.username, password: row.password };
    if (row.role === 'guard') defaults.guard = { username: row.username, password: row.password };
  }
  return defaults;
}

export async function loginAsync(username: string, password: string): Promise<Role> {
  const creds = await fetchCredentials();
  if (username === creds.admin.username && password === creds.admin.password) {
    const state: AuthState = { role: 'admin', username };
    localStorage.setItem(AUTH_KEY, JSON.stringify(state));
    return 'admin';
  }
  if (username === creds.guard.username && password === creds.guard.password) {
    const state: AuthState = { role: 'guard', username };
    localStorage.setItem(AUTH_KEY, JSON.stringify(state));
    return 'guard';
  }
  return null;
}

export function getAuth(): AuthState {
  try {
    const data = localStorage.getItem(AUTH_KEY);
    if (data) return JSON.parse(data);
  } catch {}
  return { role: null, username: '' };
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
}

export function isAdmin(): boolean {
  return getAuth().role === 'admin';
}

export function isGuard(): boolean {
  return getAuth().role === 'guard';
}

// Password management (admin only)
export async function changePassword(targetRole: 'admin' | 'guard', newPassword: string, reason: string): Promise<boolean> {
  const auth = getAuth();
  if (auth.role !== 'admin') return false;

  const { error } = await supabase.from('credentials').update({ password: newPassword, updated_at: new Date().toISOString() }).eq('role', targetRole);
  if (error) return false;

  // Get target username
  const { data: cred } = await supabase.from('credentials').select('username').eq('role', targetRole).single();

  await supabase.from('password_change_logs').insert({
    changed_by: auth.username,
    target_role: targetRole,
    target_username: cred?.username || targetRole,
    reason,
  });

  return true;
}

export interface PasswordChangeLog {
  id: string;
  changedBy: string;
  targetRole: string;
  targetUsername: string;
  reason: string;
  changedAt: string;
}

export async function fetchPasswordChangeLogs(): Promise<PasswordChangeLog[]> {
  const { data } = await supabase.from('password_change_logs').select('*').order('changed_at', { ascending: false });
  if (!data) return [];
  return data.map((r: any) => ({
    id: r.id,
    changedBy: r.changed_by,
    targetRole: r.target_role,
    targetUsername: r.target_username,
    reason: r.reason,
    changedAt: r.changed_at,
  }));
}

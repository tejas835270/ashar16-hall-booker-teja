const AUTH_KEY = 'community_hall_auth';

export type Role = 'admin' | 'guard' | null;

interface AuthState {
  role: Role;
  username: string;
}

const CREDENTIALS = {
  admin: { username: 'Ashar16', password: 'admin123' },
  guard: { username: 'Ashar_Guard', password: 'guard123' },
};

export function login(username: string, password: string): Role {
  if (username === CREDENTIALS.admin.username && password === CREDENTIALS.admin.password) {
    const state: AuthState = { role: 'admin', username };
    localStorage.setItem(AUTH_KEY, JSON.stringify(state));
    return 'admin';
  }
  if (username === CREDENTIALS.guard.username && password === CREDENTIALS.guard.password) {
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

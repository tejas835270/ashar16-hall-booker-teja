import { Link, useLocation } from 'react-router-dom';
import { Calendar, Shield, LayoutDashboard, Building2, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchSettings, type HallSettings } from '@/lib/bookingStore';

const navItems = [
  { to: '/', label: 'Book Hall', icon: Calendar },
  { to: '/guard', label: 'Guard', icon: Shield },
  { to: '/admin', label: 'Admin', icon: LayoutDashboard },
];

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  return [dark, () => setDark(d => !d)] as const;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const [dark, toggleDark] = useDarkMode();
  const [societyName, setSocietyName] = useState('Ashar 16 CHSL');

  const [bgImageUrl, setBgImageUrl] = useState<string | undefined>();

  useEffect(() => {
    fetchSettings().then(s => {
      setSocietyName(s.societyName || 'Ashar 16 CHSL');
      setBgImageUrl(s.backgroundImageUrl);
    });
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-page-gradient relative">
      {bgImageUrl && (
        <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgImageUrl})`, filter: 'blur(12px)', transform: 'scale(1.05)' }}
          />
          <div className="absolute inset-0 bg-background/70" />
        </div>
      )}
      <header className="gradient-hero sticky top-0 z-50 border-b border-white/5">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-primary-foreground">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Building2 className="h-4.5 w-4.5" />
            </div>
            <span className="font-bold text-lg hidden sm:inline tracking-tight">{societyName}</span>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="flex gap-0.5">
              {navItems.map(item => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      active
                        ? 'bg-white/15 text-primary-foreground shadow-sm'
                        : 'text-primary-foreground/60 hover:text-primary-foreground hover:bg-white/8'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </Link>
                );
              })}
            </nav>
            <button
              onClick={toggleDark}
              className="ml-1.5 p-2 rounded-lg text-primary-foreground/60 hover:text-primary-foreground hover:bg-white/8 transition-all duration-200"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 relative z-10">{children}</main>
    </div>
  );
}

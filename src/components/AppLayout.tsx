import { Link, useLocation } from 'react-router-dom';
import { Calendar, Shield, LayoutDashboard, Building2, Moon, Sun } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="gradient-hero sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary-foreground">
            <Building2 className="h-6 w-6" />
            <span className="font-bold text-lg hidden sm:inline">Ashar 16 CHSL</span>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="flex gap-1">
              {navItems.map(item => {
                const active = pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? 'bg-primary-foreground/20 text-primary-foreground'
                        : 'text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10'
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
              className="ml-2 p-2 rounded-lg text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors"
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

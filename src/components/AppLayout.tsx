import { Link, useLocation } from 'react-router-dom';
import { Calendar, Shield, LayoutDashboard, Building2 } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Book Hall', icon: Calendar },
  { to: '/guard', label: 'Guard', icon: Shield },
  { to: '/admin', label: 'Admin', icon: LayoutDashboard },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="gradient-hero sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-primary-foreground">
            <Building2 className="h-6 w-6" />
            <span className="font-bold text-lg hidden sm:inline">Ashar 16 CHSL</span>
          </Link>
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
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

import { useState } from 'react';
import { Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, type Role } from '@/lib/authStore';
import { toast } from 'sonner';

interface Props {
  expectedRole: 'admin' | 'guard';
  onSuccess: (role: Role) => void;
}

export default function LoginForm({ expectedRole, onSuccess }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const role = login(username, password);
    if (role === expectedRole) {
      onSuccess(role);
      toast.success(`Logged in as ${expectedRole}`);
    } else {
      toast.error('Invalid credentials');
    }
  }

  const title = expectedRole === 'admin' ? 'Admin Login' : 'Guard Login';
  const subtitle = expectedRole === 'admin'
    ? 'Access the admin dashboard to manage bookings and settings'
    : 'Access the guard portal to validate bookings';

  return (
    <div className="container mx-auto px-4 py-12 max-w-sm">
      <div className="bg-card rounded-xl shadow-card p-6 space-y-6">
        <div className="text-center space-y-1">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold">{title}</h1>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="username"
                placeholder="Enter username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={!username || !password}>
            Sign In
          </Button>
        </form>
      </div>
    </div>
  );
}

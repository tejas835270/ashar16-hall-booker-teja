import { useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type Booking, HALL_LABELS } from '@/lib/bookingStore';

const COLORS = [
  'hsl(220, 70%, 50%)',
  'hsl(142, 71%, 45%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 60%, 50%)',
  'hsl(0, 72%, 51%)',
];

interface Props {
  bookings: Booking[];
}

export default function AnalyticsDashboard({ bookings }: Props) {
  const activeBookings = useMemo(() => bookings.filter(b => b.status === 'confirmed'), [bookings]);
  const revenueBookings = useMemo(() => activeBookings.filter(b => b.userType !== 'society'), [activeBookings]);

  // --- Booking Trends (last 6 months) ---
  const bookingTrends = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      });
    }
    return months.map(m => {
      const count = activeBookings.filter(b => b.date.startsWith(m.key)).length;
      const cancelled = bookings.filter(b => b.status === 'cancelled' && b.date.startsWith(m.key)).length;
      return { name: m.label, bookings: count, cancelled };
    });
  }, [bookings, activeBookings]);

  // --- Revenue Over Time (last 6 months) ---
  const revenueTrends = useMemo(() => {
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      });
    }
    return months.map(m => {
      const revenue = revenueBookings
        .filter(b => b.date.startsWith(m.key))
        .reduce((sum, b) => sum + b.total, 0);
      const penalties = bookings
        .filter(b => b.date.startsWith(m.key))
        .reduce((sum, b) => sum + (b.penaltyAmount || 0), 0);
      return { name: m.label, revenue, penalties };
    });
  }, [bookings, activeBookings]);

  // --- Hall Utilization ---
  const hallUtilization = useMemo(() => {
    const counts: Record<string, number> = {};
    activeBookings.forEach(b => {
      const label = HALL_LABELS[b.hall] || b.hall;
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [activeBookings]);

  // --- Event Type Distribution ---
  const eventDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    activeBookings.forEach(b => {
      counts[b.eventType] = (counts[b.eventType] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [activeBookings]);

  const totalRevenue = revenueBookings.reduce((s, b) => s + b.total, 0);
  const avgBookingValue = revenueBookings.length ? Math.round(totalRevenue / revenueBookings.length) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Bookings</p>
            <p className="text-2xl font-bold">{activeBookings.length}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Total Revenue</p>
            <p className="text-2xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Avg. Booking Value</p>
            <p className="text-2xl font-bold">₹{avgBookingValue.toLocaleString('en-IN')}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium">Cancellations</p>
            <p className="text-2xl font-bold">{bookings.filter(b => b.status === 'cancelled').length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Trends */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Booking Trends (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={bookingTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="bookings" fill="hsl(220, 70%, 50%)" radius={[4, 4, 0, 0]} name="Confirmed" />
                  <Bar dataKey="cancelled" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Cancelled" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Revenue Over Time */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue Over Time (6 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, undefined]}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(142, 71%, 45%)" strokeWidth={2} dot={{ r: 4 }} name="Revenue" />
                  <Line type="monotone" dataKey="penalties" stroke="hsl(38, 92%, 50%)" strokeWidth={2} dot={{ r: 4 }} name="Penalties" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hall Utilization */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hall Utilization</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {hallUtilization.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={hallUtilization}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {hallUtilization.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Event Type Distribution */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Event Types</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {eventDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={eventDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" width={100} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(280, 60%, 50%)" radius={[0, 4, 4, 0]} name="Bookings" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No data</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

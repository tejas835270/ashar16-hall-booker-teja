import { useState, useMemo, useRef, useEffect } from 'react';
import { Trash2, IndianRupee, CalendarDays, Ban, Settings, LogOut, Plus, Pencil, Camera, AlertTriangle, Search, ArrowUpDown, Eye, Monitor, Globe, X, Upload, Download, FileUp, BarChart3, FileDown, Info, KeyRound, ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  fetchBookings, cancelBooking, HALL_LABELS, formatHour, getSlotTimes,
  createBooking, updateBooking, getRent, getDynamicDeposit, isSlotAvailable,
  fetchSettings, uploadFile, deleteBooking,
  type Booking, type HallOption, type UserType, type TimeSlot, type HallSettings
} from '@/lib/bookingStore';
import { getAuth, isAdmin, isSuperAdmin, isViewerAdmin, logout, changePassword, fetchPasswordChangeLogs, type PasswordChangeLog } from '@/lib/authStore';
import AdminSettings from '@/components/AdminSettings';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import LoginForm from '@/components/LoginForm';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

type Tab = 'bookings' | 'analytics' | 'settings' | 'security';
type SortDir = 'asc' | 'desc';

function getBookingTimeStatus(b: Booking): 'past' | 'current' | 'upcoming' {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const bDate = new Date(b.date + 'T00:00:00');
  if (bDate < today) return 'past';
  if (bDate.getTime() === today.getTime()) return 'current';
  return 'upcoming';
}

// --- MANDATORY IMPORT FIELDS ---
const MANDATORY_IMPORT_FIELDS = ['Name', 'Flat', 'Date', 'Event', 'Phone', 'Hall', 'Members', 'Rent', 'Deposit'];

export default function Admin() {
  const [authed, setAuthed] = useState(isAdmin());
  const [viewerOnly, setViewerOnly] = useState(isViewerAdmin());
  const [tab, setTab] = useState<Tab>('bookings');
  const [refreshKey, setRefreshKey] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [settings, setSettings] = useState<HallSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [showManualModal, setShowManualModal] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [viewScreenshot, setViewScreenshot] = useState<string | null>(null);
  const [penaltyBooking, setPenaltyBooking] = useState<Booking | null>(null);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<Booking | null>(null);

  // Import modal
  const [showImportModal, setShowImportModal] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const importFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authed) return;
    async function load() {
      setLoading(true);
      const [b, s] = await Promise.all([fetchBookings(), fetchSettings()]);
      setBookings(b);
      setSettings(s);
      setLoading(false);
    }
    load();
  }, [authed, refreshKey]);

  const filteredBookings = useMemo(() => {
    let filtered = bookings;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(b =>
        b.id.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.flatNumber.toLowerCase().includes(q)
      );
    }
    filtered.sort((a, b) => sortDir === 'asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));
    return filtered;
  }, [bookings, searchQuery, sortDir]);

  if (!authed) {
    return <LoginForm expectedRole="admin" onSuccess={(role) => { setAuthed(true); setViewerOnly(role === 'viewer_admin'); }} />;
  }

  const activeBookings = bookings.filter(b => b.status === 'confirmed');
  const totalRevenue = activeBookings.reduce((s, b) => s + b.total, 0);
  const totalPenalties = bookings.reduce((s, b) => s + (b.penaltyAmount || 0), 0);
  const upcomingCount = activeBookings.filter(b => new Date(b.date) >= new Date(new Date().toDateString())).length;

  async function handleCancel(id: string) {
    await cancelBooking(id);
    toast.success('Booking marked as cancelled');
    setRefreshKey(k => k + 1);
  }

  async function handleDelete(id: string) {
    const ok = await deleteBooking(id);
    if (ok) {
      toast.success('Booking permanently deleted');
      setRefreshKey(k => k + 1);
    } else {
      toast.error('Failed to delete booking');
    }
    setDeleteTarget(null);
  }

  function handleLogout() { logout(); setAuthed(false); }

  function formatDate(d: string) {
    return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const slotLabel = (b: Booking) => {
    if (b.timeSlot === 'custom') return `${formatHour(b.customStartHour!)}–${formatHour(b.customEndHour!)}`;
    const slots = getSlotTimes(settings || undefined);
    return slots[b.timeSlot as keyof typeof slots]?.label?.replace(/\s*\(.*\)/, '') || b.timeSlot;
  };

  const getStatusBadge = (b: Booking) => {
    if (b.status === 'cancelled') return <Badge variant="destructive" className="text-xs">Cancelled</Badge>;
    const ts = getBookingTimeStatus(b);
    if (ts === 'past') return <Badge variant="secondary" className="text-xs opacity-60">Past</Badge>;
    if (ts === 'current') return <Badge className="text-xs bg-success text-success-foreground">Active Today</Badge>;
    return <Badge className="text-xs bg-primary text-primary-foreground">Upcoming</Badge>;
  };

  const getTypeBadge = (b: Booking) => {
    if (b.bookingType === 'manual') return <Badge variant="outline" className="text-xs border-amber-400 text-amber-600"><Monitor className="h-3 w-3 mr-0.5" />Manual</Badge>;
    return <Badge variant="outline" className="text-xs border-primary/40 text-primary"><Globe className="h-3 w-3 mr-0.5" />Online</Badge>;
  };

  const getRowClass = (b: Booking) => {
    if (b.status === 'cancelled') return 'opacity-50 line-through';
    const ts = getBookingTimeStatus(b);
    if (ts === 'past') return 'opacity-40';
    if (ts === 'current') return 'bg-success/5';
    return '';
  };

  // --- Export to Excel ---
  function handleExport() {
    const rows = bookings.map(b => ({
      'Booking ID': b.id,
      'Name': b.name,
      'Flat': b.flatNumber,
      'Phone': b.phone || '',
      'Event': b.eventType,
      'Date': b.date,
      'Hall': HALL_LABELS[b.hall] || b.hall,
      'Time Slot': slotLabel(b),
      'User Type': b.userType,
      'Members': b.memberCount,
      'Rent': b.rent,
      'Deposit': b.deposit,
      'Total': b.total,
      'Penalty': b.penaltyAmount || 0,
      'Penalty Reason': b.penaltyReason || '',
      'Status': b.status,
      'Type': b.bookingType,
      'Created': b.createdAt,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bookings');
    XLSX.writeFile(wb, `bookings_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Bookings exported to Excel');
  }

  // --- Generate sample Excel for import ---
  function handleDownloadSample() {
    const sampleRows = [
      {
        'Name': 'John Doe',
        'Flat': 'A-101',
        'Date': '2026-04-15',
        'Event': 'Birthday',
        'Phone': '9876543210',
        'Hall': 'B-Wing Hall',
        'Members': 50,
        'Rent': 4000,
        'Deposit': 2000,
      },
      {
        'Name': 'Jane Smith',
        'Flat': 'B-205',
        'Date': '2026-04-20',
        'Event': 'Anniversary',
        'Phone': '9123456789',
        'Hall': 'C-Wing Hall',
        'Members': 30,
        'Rent': 5000,
        'Deposit': 2000,
      },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleRows);

    // Add a note row
    const noteRow = MANDATORY_IMPORT_FIELDS.length + 2;
    XLSX.utils.sheet_add_aoa(ws, [['⚠️ ALL fields above are MANDATORY. Do not rename columns. Save file as bookings_import_sample.xlsx']], { origin: `A${sampleRows.length + 3}` });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sample');
    XLSX.writeFile(wb, 'bookings_import_sample.xlsx');
    toast.success('Sample file downloaded');
  }

  // --- Import from Excel (strict validation) ---
  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportErrors([]);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(ws);
      if (rows.length === 0) { toast.error('No data found in file'); return; }

      // Check mandatory columns
      const headers = Object.keys(rows[0]);
      const missingCols = MANDATORY_IMPORT_FIELDS.filter(f => {
        return !headers.some(h => h.toLowerCase() === f.toLowerCase());
      });

      if (missingCols.length > 0) {
        const errors = [`Missing mandatory columns: ${missingCols.join(', ')}`];
        errors.push('Please download the sample file and use the exact column names.');
        setImportErrors(errors);
        toast.error(`Missing columns: ${missingCols.join(', ')}`);
        return;
      }

      // Check every row for empty mandatory values
      const rowErrors: string[] = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const emptyFields: string[] = [];
        for (const field of MANDATORY_IMPORT_FIELDS) {
          const key = headers.find(h => h.toLowerCase() === field.toLowerCase()) || field;
          const val = row[key];
          if (val === undefined || val === null || String(val).trim() === '') {
            emptyFields.push(field);
          }
        }
        if (emptyFields.length > 0) {
          rowErrors.push(`Row ${i + 2}: Missing ${emptyFields.join(', ')}`);
        }
      }

      if (rowErrors.length > 0) {
        setImportErrors(rowErrors);
        toast.error(`${rowErrors.length} row(s) have missing data`);
        return;
      }

      // All valid - import
      let imported = 0;
      for (const row of rows) {
        const name = String(row['Name'] || row['name'] || '');
        const flat = String(row['Flat'] || row['flat_number'] || '');
        const date = String(row['Date'] || row['date'] || '');
        const event = String(row['Event'] || row['event_type'] || 'General');
        const phone = String(row['Phone'] || row['phone'] || '');

        let hall: HallOption = 'b-wing';
        const hallStr = String(row['Hall'] || row['hall'] || '').toLowerCase();
        if (hallStr.includes('both')) hall = 'both';
        else if (hallStr.includes('c')) hall = 'c-wing';

        const members = parseInt(row['Members'] || row['member_count'] || '10') || 10;
        const rent = parseInt(row['Rent'] || row['rent'] || '0') || 0;
        const deposit = parseInt(row['Deposit'] || row['deposit'] || '0') || 0;

        try {
          await createBooking({
            flatNumber: flat,
            name,
            phone,
            eventType: event,
            date,
            timeSlot: 'full',
            hall,
            userType: 'resident',
            memberCount: members,
            rent,
            deposit,
            bookingType: 'manual',
          });
          imported++;
        } catch {}
      }
      toast.success(`Successfully imported ${imported} bookings`);
      setShowImportModal(false);
      setImportErrors([]);
      setRefreshKey(k => k + 1);
    } catch (err) {
      toast.error('Failed to read Excel file');
    }
    e.target.value = '';
  }

  if (loading) return <div className="container mx-auto px-4 py-6 max-w-5xl text-center"><p className="text-muted-foreground">Loading...</p></div>;

  return (
    <div className="container mx-auto px-4 py-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          {viewerOnly && <Badge variant="secondary" className="text-xs">Read-Only</Badge>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 bg-accent rounded-lg p-1 flex-wrap">
            <button onClick={() => setTab('bookings')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'bookings' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <CalendarDays className="h-4 w-4 inline mr-1.5" />Bookings
            </button>
            <button onClick={() => setTab('analytics')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'analytics' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              <BarChart3 className="h-4 w-4 inline mr-1.5" />Analytics
            </button>
            {!viewerOnly && (
              <>
                <button onClick={() => setTab('security')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'security' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  <KeyRound className="h-4 w-4 inline mr-1.5" />Security
                </button>
                <button onClick={() => setTab('settings')} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === 'settings' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                  <Settings className="h-4 w-4 inline mr-1.5" />Settings
                </button>
              </>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-1.5" /> Logout</Button>
        </div>
      </div>

      {tab === 'settings' && settings && <AdminSettings initialSettings={settings} onSaved={() => setRefreshKey(k => k + 1)} />}

      {tab === 'analytics' && <AnalyticsDashboard bookings={bookings} />}

      {tab === 'security' && <SecurityTab />}

      {tab === 'bookings' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3 border border-border/50 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center"><CalendarDays className="h-5 w-5 text-primary" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">Upcoming</p><p className="text-xl font-bold">{upcomingCount}</p></div>
            </div>
            <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3 border border-border/50 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-success/20 to-success/5 flex items-center justify-center"><IndianRupee className="h-5 w-5 text-success" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">Total Revenue</p><p className="text-xl font-bold">₹{totalRevenue.toLocaleString('en-IN')}</p></div>
            </div>
            <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3 border border-border/50 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-200/40 to-amber-100/20 dark:from-amber-800/30 dark:to-amber-900/10 flex items-center justify-center"><AlertTriangle className="h-5 w-5 text-amber-600" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">Total Penalties</p><p className="text-xl font-bold">₹{totalPenalties.toLocaleString('en-IN')}</p></div>
            </div>
            <div className="bg-card rounded-xl shadow-card p-4 flex items-center gap-3 border border-border/50 hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center"><Ban className="h-5 w-5 text-destructive" /></div>
              <div><p className="text-xs text-muted-foreground font-medium">Cancelled</p><p className="text-xl font-bold">{bookings.filter(b => b.status === 'cancelled').length}</p></div>
            </div>
          </div>

          {/* Search, Sort, Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by ID, Name, or Flat..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}>
              <ArrowUpDown className="h-4 w-4 mr-1.5" /> Date {sortDir === 'asc' ? '↑' : '↓'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-1.5" /> Export
            </Button>
            {!viewerOnly && (
              <>
                <Button variant="outline" size="sm" onClick={() => { setShowImportModal(true); setImportErrors([]); }}>
                  <FileUp className="h-4 w-4 mr-1.5" /> Import
                </Button>
                <input ref={importFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleImportFile} />
                <Button onClick={() => { setEditingBooking(null); setShowManualModal(true); }}>
                  <Plus className="h-4 w-4 mr-1.5" /> Manual Booking
                </Button>
              </>
            )}
          </div>

          {/* Table */}
          <div className="bg-card rounded-xl shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-accent/50">
                    <th className="text-left p-3 font-medium text-muted-foreground">ID</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Flat</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden sm:table-cell">Name</th>
                    <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Hall</th>
                    <th className="text-left p-3 font-medium text-muted-foreground">Slot</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Amount</th>
                    <th className="text-right p-3 font-medium text-muted-foreground">Penalty</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-center p-3 font-medium text-muted-foreground">Type</th>
                    {!viewerOnly && <th className="p-3 font-medium text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.length === 0 && (
                    <tr><td colSpan={11} className="p-8 text-center text-muted-foreground">No bookings found</td></tr>
                  )}
                  {filteredBookings.map(b => (
                    <tr key={b.id} className={`border-b last:border-0 hover:bg-accent/30 transition-colors ${getRowClass(b)}`}>
                      <td className="p-3">
                        <button onClick={() => setDetailBooking(b)} className="font-mono font-medium text-primary hover:underline cursor-pointer">
                          {b.id}
                        </button>
                      </td>
                      <td className="p-3">{formatDate(b.date)}</td>
                      <td className="p-3">{b.flatNumber}</td>
                      <td className="p-3 hidden sm:table-cell">{b.name}</td>
                      <td className="p-3 hidden md:table-cell">{HALL_LABELS[b.hall] || '—'}</td>
                      <td className="p-3">{slotLabel(b)}</td>
                      <td className="p-3 text-right">₹{b.total.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-right">
                        {b.penaltyAmount ? <span className="text-amber-600 font-medium">₹{b.penaltyAmount.toLocaleString('en-IN')}</span> : '—'}
                      </td>
                      <td className="p-3 text-center">{getStatusBadge(b)}</td>
                      <td className="p-3 text-center">{getTypeBadge(b)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setDetailBooking(b)} title="View Details">
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          {b.paymentScreenshotUrl && (
                            <Button variant="ghost" size="icon" onClick={() => setViewScreenshot(b.paymentScreenshotUrl!)} title="View Payment">
                              <Camera className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          {b.status === 'confirmed' && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => { setEditingBooking(b); setShowManualModal(true); }} title="Edit">
                                <Pencil className="h-4 w-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setPenaltyBooking(b)} title="Penalty">
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleCancel(b.id)} title="Mark Cancelled">
                                <Ban className="h-4 w-4 text-amber-500" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(b)} title="Delete Permanently">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Manual/Edit Booking Modal */}
      {showManualModal && settings && (
        <ManualBookingModal
          existingBooking={editingBooking}
          settings={settings}
          onClose={() => { setShowManualModal(false); setEditingBooking(null); }}
          onSaved={() => { setShowManualModal(false); setEditingBooking(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {/* Payment Screenshot Viewer */}
      <Dialog open={!!viewScreenshot} onOpenChange={() => setViewScreenshot(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Payment Screenshot</DialogTitle></DialogHeader>
          {viewScreenshot && <img src={viewScreenshot} alt="Payment screenshot" className="w-full rounded-lg" />}
        </DialogContent>
      </Dialog>

      {/* Detail View Modal */}
      {detailBooking && (
        <BookingDetailModal booking={detailBooking} settings={settings} onClose={() => setDetailBooking(null)} />
      )}

      {/* Penalty Modal */}
      {penaltyBooking && (
        <PenaltyModal
          booking={penaltyBooking}
          onClose={() => setPenaltyBooking(null)}
          onSaved={() => { setPenaltyBooking(null); setRefreshKey(k => k + 1); }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove booking <strong>{deleteTarget?.id}</strong> ({deleteTarget?.name} — Flat {deleteTarget?.flatNumber}) from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Guidance Modal */}
      <Dialog open={showImportModal} onOpenChange={v => { setShowImportModal(v); if (!v) setImportErrors([]); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="h-5 w-5 text-primary" />
              Import Bookings from Excel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1.5">⚠️ ALL Fields Are Mandatory</p>
                  <p className="text-xs text-muted-foreground mb-2">Your Excel file <strong>must</strong> contain <strong>all</strong> these columns with data in every row:</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-1.5 pl-6">
                {MANDATORY_IMPORT_FIELDS.map(f => (
                  <div key={f} className="flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-1.5 py-0.5 rounded">{f}</span>
                    <span className="text-destructive font-medium">*</span>
                  </div>
                ))}
              </div>
            </div>

            {importErrors.length > 0 && (
              <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 space-y-2 max-h-48 overflow-y-auto">
                <p className="text-sm font-semibold text-destructive flex items-center gap-1.5">
                  <X className="h-4 w-4" /> Validation Errors
                </p>
                {importErrors.map((err, i) => (
                  <p key={i} className="text-xs text-destructive/80 font-mono">{err}</p>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Download the sample file below, fill in your data using the <strong>exact same column names</strong>, and upload it back.
            </p>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={handleDownloadSample}>
                <FileDown className="h-4 w-4 mr-1.5" /> Download Sample
              </Button>
              <Button className="flex-1" onClick={() => importFileRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1.5" /> Upload File
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Security Tab: Password Management & Audit Logs ---
function SecurityTab() {
  const [targetRole, setTargetRole] = useState<'admin' | 'guard'>('guard');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [logs, setLogs] = useState<PasswordChangeLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  useEffect(() => {
    fetchPasswordChangeLogs().then(l => { setLogs(l); setLoadingLogs(false); });
  }, []);

  async function handleChangePassword() {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (!reason.trim()) {
      toast.error('Reason for password change is mandatory');
      return;
    }
    setShowConfirm(true);
  }

  async function confirmChange() {
    setSaving(true);
    setShowConfirm(false);
    const ok = await changePassword(targetRole, newPassword, reason.trim());
    if (ok) {
      toast.success(`${targetRole === 'admin' ? 'Admin' : 'Guard'} password changed successfully`);
      setNewPassword('');
      setConfirmPassword('');
      setReason('');
      const updatedLogs = await fetchPasswordChangeLogs();
      setLogs(updatedLogs);
    } else {
      toast.error('Failed to change password');
    }
    setSaving(false);
  }

  return (
    <div className="space-y-6">
      {/* Password Change Form */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-primary" />
          Change Password
        </h2>
        <div className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <Label>Change Password For</Label>
            <Select value={targetRole} onValueChange={v => setTargetRole(v as 'admin' | 'guard')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="guard">Guard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>New Password *</Label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimum 6 characters" />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm Password *</Label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-destructive">Passwords do not match</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Reason for Change * <span className="text-destructive">(mandatory)</span></Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Periodic security rotation, Guard request, etc." rows={2} />
          </div>
          <Button
            onClick={handleChangePassword}
            disabled={!newPassword || !confirmPassword || !reason.trim() || newPassword !== confirmPassword || saving}
          >
            {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" />Saving...</> : 'Change Password'}
          </Button>
        </div>
      </div>

      {/* Password Change Confirmation */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Password Change</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to change the <strong>{targetRole}</strong> password.<br />
              <strong>Reason:</strong> {reason}<br /><br />
              Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange}>Confirm Change</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Audit Logs */}
      <div className="bg-card rounded-xl shadow-card border border-border/50 p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          Password Change Logs
        </h2>
        {loadingLogs ? (
          <p className="text-muted-foreground text-sm">Loading logs...</p>
        ) : logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No password changes recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-accent/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Date & Time</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Changed By</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Target</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Username</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Reason</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-accent/30">
                    <td className="p-3 text-xs font-mono">{new Date(log.changedAt).toLocaleString('en-IN')}</td>
                    <td className="p-3 font-medium">{log.changedBy}</td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs capitalize">{log.targetRole}</Badge>
                    </td>
                    <td className="p-3">{log.targetUsername}</td>
                    <td className="p-3 text-muted-foreground max-w-xs truncate">{log.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Booking Detail Modal ---
function BookingDetailModal({ booking: b, settings, onClose }: { booking: Booking; settings: HallSettings | null; onClose: () => void }) {
  const slotLabel = () => {
    if (b.timeSlot === 'custom') return `${formatHour(b.customStartHour!)} – ${formatHour(b.customEndHour!)}`;
    const slots = getSlotTimes(settings || undefined);
    return slots[b.timeSlot as keyof typeof slots]?.label || b.timeSlot;
  };
  const formattedDate = new Date(b.date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Booking Details — {b.id}</DialogTitle></DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Booking ID</span><p className="font-mono font-bold">{b.id}</p></div>
            <div><span className="text-muted-foreground">Status</span><p className="font-medium capitalize">{b.status}</p></div>
            <div><span className="text-muted-foreground">Type</span><p className="font-medium capitalize">{b.bookingType}</p></div>
            <div><span className="text-muted-foreground">Date</span><p className="font-medium">{formattedDate}</p></div>
            <div><span className="text-muted-foreground">Hall</span><p className="font-medium">{HALL_LABELS[b.hall]}</p></div>
            <div><span className="text-muted-foreground">Time Slot</span><p className="font-medium">{slotLabel()}</p></div>
            <div><span className="text-muted-foreground">Flat</span><p className="font-medium">{b.flatNumber}</p></div>
            <div><span className="text-muted-foreground">Name</span><p className="font-medium">{b.name}</p></div>
            <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{b.phone || '—'}</p></div>
            <div><span className="text-muted-foreground">Event</span><p className="font-medium">{b.eventType}</p></div>
            <div><span className="text-muted-foreground">Attendees</span><p className="font-medium">{b.memberCount}</p></div>
            <div><span className="text-muted-foreground">User Type</span><p className="font-medium capitalize">{b.userType}</p></div>
          </div>
          <div className="border-t pt-3 space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">Hall Rent</span><span>₹{b.rent.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Deposit</span><span>₹{b.deposit.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between font-semibold border-t pt-1"><span>Total</span><span>₹{b.total.toLocaleString('en-IN')}</span></div>
            {!!b.penaltyAmount && (
              <div className="flex justify-between text-amber-600"><span>Penalty</span><span>₹{b.penaltyAmount.toLocaleString('en-IN')}</span></div>
            )}
            {b.penaltyReason && <p className="text-xs text-muted-foreground">Reason: {b.penaltyReason}</p>}
          </div>
          {b.paymentScreenshotUrl && (
            <div className="border-t pt-3">
              <p className="text-muted-foreground text-xs mb-2">Payment Screenshot:</p>
              <img src={b.paymentScreenshotUrl} alt="Payment" className="w-full max-h-48 object-contain rounded-lg" />
            </div>
          )}
          <p className="text-xs text-muted-foreground">Created: {new Date(b.createdAt).toLocaleString('en-IN')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Manual / Edit Booking Modal ---
function ManualBookingModal({ existingBooking, settings, onClose, onSaved }: { existingBooking: Booking | null; settings: HallSettings; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!existingBooking;

  const [flatNumber, setFlatNumber] = useState(existingBooking?.flatNumber || '');
  const [name, setName] = useState(existingBooking?.name || '');
  const [phone, setPhone] = useState(existingBooking?.phone || '');
  const [eventType, setEventType] = useState(existingBooking?.eventType || '');
  const [memberCount, setMemberCount] = useState(String(existingBooking?.memberCount || ''));
  const [hall, setHall] = useState<HallOption>(existingBooking?.hall || 'b-wing');
  const [userType, setUserType] = useState<UserType>(existingBooking?.userType || 'resident');
  const [timeSlot, setTimeSlot] = useState<TimeSlot>(existingBooking?.timeSlot || 'full');
  const [customStart, setCustomStart] = useState(existingBooking?.customStartHour || 8);
  const [customEnd, setCustomEnd] = useState(existingBooking?.customEndHour || 14);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    existingBooking ? new Date(existingBooking.date + 'T00:00:00') : new Date()
  );
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(existingBooking?.paymentScreenshotUrl || null);
  const [saving, setSaving] = useState(false);
  const [available, setAvailable] = useState(true);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const dateStr = selectedDate ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}` : '';

  const slotTimes = getSlotTimes(settings);
  const rent = getRent(userType, timeSlot, settings, hall);
  const deposit = getDynamicDeposit(settings);

  const CUSTOM_HOURS = Array.from({ length: settings.hallCloseTime - settings.hallOpenTime + 1 }, (_, i) => i + settings.hallOpenTime);

  useEffect(() => {
    async function check() {
      if (!dateStr) { setAvailable(true); return; }
      const result = timeSlot === 'custom'
        ? await isSlotAvailable(dateStr, hall, 'custom', customStart, customEnd, isEdit ? existingBooking!.id : undefined)
        : await isSlotAvailable(dateStr, hall, timeSlot, undefined, undefined, isEdit ? existingBooking!.id : undefined);
      setAvailable(result);
    }
    check();
  }, [dateStr, hall, timeSlot, customStart, customEnd, isEdit, existingBooking]);

  const formValid = flatNumber.trim() && name.trim() && phone.trim() && eventType.trim() && parseInt(memberCount) > 0 && available && dateStr;

  function handleScreenshotUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    setScreenshotFile(file);
    const reader = new FileReader();
    reader.onload = () => setScreenshotPreview(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  async function handleSave() {
    if (!formValid) return;
    setSaving(true);
    try {
      let screenshotUrl = existingBooking?.paymentScreenshotUrl;
      if (screenshotFile) {
        screenshotUrl = await uploadFile(screenshotFile, 'payment-screenshots') || undefined;
      }

      const data = {
        flatNumber: flatNumber.trim(),
        name: name.trim(),
        phone: phone.trim(),
        eventType: eventType.trim(),
        date: dateStr,
        timeSlot,
        ...(timeSlot === 'custom' ? { customStartHour: customStart, customEndHour: customEnd } : {}),
        hall,
        userType,
        memberCount: parseInt(memberCount),
        rent,
        deposit,
        paymentScreenshotUrl: screenshotUrl,
      };

      if (isEdit) {
        await updateBooking(existingBooking!.id, data);
        toast.success('Booking updated');
      } else {
        await createBooking({ ...data, bookingType: 'manual' });
        toast.success('Manual booking created');
      }
      onSaved();
    } catch (err) {
      toast.error('Failed to save booking');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Booking' : 'Manual Booking'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5"><Label>Flat Number *</Label><Input value={flatNumber} onChange={e => setFlatNumber(e.target.value)} placeholder="e.g. A-101" /></div>
          <div className="space-y-1.5"><Label>Full Name *</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Name" /></div>
          <div className="space-y-1.5"><Label>Phone Number *</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 9876543210" type="tel" maxLength={15} /></div>
          <div className="space-y-1.5"><Label>Event Type *</Label><Input value={eventType} onChange={e => setEventType(e.target.value)} placeholder="e.g. Birthday" /></div>
          <div className="space-y-1.5"><Label>Member Count *</Label><Input type="number" value={memberCount} onChange={e => setMemberCount(e.target.value)} min={1} /></div>

          <div className="space-y-1.5">
            <Label>User Type</Label>
            <Select value={userType} onValueChange={v => setUserType(v as UserType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="resident">Resident</SelectItem>
                <SelectItem value="tenant">Tenant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Hall</Label>
            <Select value={hall} onValueChange={v => setHall(v as HallOption)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.entries(HALL_LABELS) as [HallOption, string][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Time Slot</Label>
            <Select value={timeSlot} onValueChange={v => setTimeSlot(v as TimeSlot)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="full">{slotTimes.full.label}</SelectItem>
                <SelectItem value="half-slot1">{slotTimes['half-slot1'].label}</SelectItem>
                <SelectItem value="half-slot2">{slotTimes['half-slot2'].label}</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timeSlot === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start</Label>
                <Select value={String(customStart)} onValueChange={v => setCustomStart(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOM_HOURS.filter(h => h <= settings.hallCloseTime - 1).map(h => (
                      <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>End</Label>
                <Select value={String(customEnd)} onValueChange={v => setCustomEnd(Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CUSTOM_HOURS.filter(h => h > customStart && h <= settings.hallCloseTime && h - customStart <= settings.maxCustomHours).map(h => (
                      <SelectItem key={h} value={String(h)}>{formatHour(h)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Optional payment screenshot */}
          <div className="space-y-1.5">
            <Label>Payment Screenshot (optional)</Label>
            {screenshotPreview ? (
              <div className="relative">
                <img src={screenshotPreview} alt="Screenshot" className="w-full max-h-32 object-contain rounded-lg" />
                <button onClick={() => { setScreenshotFile(null); setScreenshotPreview(null); }} className="absolute top-1 right-1 bg-card rounded-full p-1 shadow">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => screenshotInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-1.5" /> Upload
              </Button>
            )}
            <input ref={screenshotInputRef} type="file" accept="image/*" className="hidden" onChange={handleScreenshotUpload} />
          </div>

          {!available && <p className="text-sm text-destructive font-medium">Slot conflicts with an existing booking.</p>}

          <div className="bg-accent rounded-lg p-3 text-sm">
            <div className="flex justify-between"><span>Rent</span><span>₹{rent.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between"><span>Deposit</span><span>₹{deposit.toLocaleString('en-IN')}</span></div>
            <div className="flex justify-between font-semibold border-t mt-1 pt-1"><span>Total</span><span>₹{(rent + deposit).toLocaleString('en-IN')}</span></div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={!formValid || saving} onClick={handleSave}>
              {saving ? 'Saving...' : isEdit ? 'Update Booking' : 'Create Booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Penalty Modal ---
function PenaltyModal({ booking, onClose, onSaved }: { booking: Booking; onClose: () => void; onSaved: () => void }) {
  const [amount, setAmount] = useState(String(booking.penaltyAmount || ''));
  const [reason, setReason] = useState(booking.penaltyReason || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateBooking(booking.id, {
      penaltyAmount: parseInt(amount) || 0,
      penaltyReason: reason.trim(),
    });
    toast.success('Penalty updated');
    setSaving(false);
    onSaved();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Penalty — {booking.id}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            <p><strong>{booking.name}</strong> • Flat {booking.flatNumber} • {new Date(booking.date + 'T00:00:00').toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Penalty Amount (₹)</Label>
            <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} min={0} placeholder="e.g. 500" />
          </div>
          <div className="space-y-1.5">
            <Label>Reason / Message</Label>
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Late vacating — hall not cleared by 10 PM. ₹500 penalty applied per society rules." rows={3} />
            <p className="text-xs text-muted-foreground">This message will be stored against the booking record.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={saving} onClick={handleSave}>{saving ? 'Saving...' : 'Save Penalty'}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

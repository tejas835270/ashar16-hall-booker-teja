import { useState, useRef } from 'react';
import { Save, Plus, Trash2, RotateCcw, Upload, FileText, X, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveSettings, uploadFile, type HallSettings } from '@/lib/bookingStore';
import { toast } from 'sonner';

const DEFAULT_RULES = [
  'The community hall must be vacated by 10:00 PM sharp.',
  'The person booking the hall is responsible for any damages.',
  'Loud music/DJ is not permitted after 10:00 PM.',
  'Decorations must not damage walls, ceilings, or fixtures.',
  'The hall must be left in a clean condition.',
  'Outside caterers are permitted but must follow hygiene standards.',
  'Parking for guests must be in designated visitor parking only.',
  'Alcohol consumption is permitted only for private events.',
  'The committee reserves the right to cancel with prior notice.',
  'All bookings are non-transferable.',
];

interface Props {
  initialSettings: HallSettings;
  onSaved: () => void;
}

export default function AdminSettings({ initialSettings, onSaved }: Props) {
  const [settings, setSettings] = useState<HallSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    setSaving(true);
    await saveSettings(settings);
    toast.success('Settings saved successfully!');
    setSaving(false);
    onSaved();
  }

  function handleReset() {
    const defaults: HallSettings = {
      rules: DEFAULT_RULES,
      hallOpenTime: 8,
      hallCloseTime: 22,
      maxCustomHours: 6,
      pricing: { resident: { full: 7000, half: 4000 }, tenant: { full: 8000, half: 5000 } },
      deposit: 2000,
      halls: [
        { key: 'b-wing', label: 'B-Wing Hall' },
        { key: 'c-wing', label: 'C-Wing Hall' },
        { key: 'both', label: 'Both (B & C Wing)' },
      ],
      paymentMode: 'both',
      upiId: '',
    };
    setSettings(defaults);
  }

  function updateRule(index: number, value: string) {
    const rules = [...settings.rules];
    rules[index] = value;
    setSettings({ ...settings, rules });
  }
  function addRule() { setSettings({ ...settings, rules: [...settings.rules, ''] }); }
  function removeRule(index: number) { setSettings({ ...settings, rules: settings.rules.filter((_, i) => i !== index) }); }

  function updatePricing(userType: 'resident' | 'tenant', field: 'full' | 'half', value: number) {
    setSettings({
      ...settings,
      pricing: { ...settings.pricing, [userType]: { ...settings.pricing[userType], [field]: value } },
    });
  }

  async function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Please upload a PDF file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('PDF must be under 10 MB'); return; }
    const url = await uploadFile(file, 'rules-pdf');
    if (url) {
      setSettings({ ...settings, rulesPdfUrl: url, rulesPdfName: file.name });
      toast.success(`Uploaded: ${file.name}`);
    } else {
      toast.error('Failed to upload PDF');
    }
    e.target.value = '';
  }

  async function handleQrUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    const url = await uploadFile(file, 'payment-qr');
    if (url) {
      setSettings({ ...settings, paymentQrUrl: url });
      toast.success('QR code uploaded');
    } else {
      toast.error('Failed to upload QR');
    }
    e.target.value = '';
  }

  return (
    <div className="space-y-6">
      {/* Penalty Notice */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <h3 className="font-semibold text-base mb-4">Penalty Notice</h3>
        <div className="space-y-1.5">
          <Label>Display a penalty/notice message to residents</Label>
          <Textarea
            placeholder="e.g. ⚠️ Late vacating will attract a penalty of ₹500 per hour."
            value={settings.penaltyNotice || ''}
            onChange={e => setSettings({ ...settings, penaltyNotice: e.target.value })}
            rows={2}
          />
          <p className="text-xs text-muted-foreground">This message appears on the booking page for all users.</p>
        </div>
      </div>

      {/* Payment Settings */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <h3 className="font-semibold text-base mb-4">Payment Settings</h3>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Payment Mode</Label>
            <Select value={settings.paymentMode} onValueChange={v => setSettings({ ...settings, paymentMode: v as HallSettings['paymentMode'] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="qr">QR Code Only</SelectItem>
                <SelectItem value="manual">Manual / Screenshot Only</SelectItem>
                <SelectItem value="both">Both (QR + Screenshot)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>UPI ID</Label>
            <Input placeholder="e.g. society@upi" value={settings.upiId || ''} onChange={e => setSettings({ ...settings, upiId: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Custom Payment QR Code (optional)</Label>
            {settings.paymentQrUrl ? (
              <div className="flex items-center gap-3 bg-accent rounded-lg p-3">
                <img src={settings.paymentQrUrl} alt="QR" className="h-16 w-16 rounded object-contain" />
                <div className="flex-1"><p className="text-sm font-medium">Custom QR uploaded</p></div>
                <Button variant="ghost" size="icon" onClick={() => setSettings({ ...settings, paymentQrUrl: undefined })}>
                  <X className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={() => qrInputRef.current?.click()}>
                <Image className="h-4 w-4 mr-1.5" /> Upload QR Image
              </Button>
            )}
            <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
          </div>
        </div>
      </div>

      {/* Hall Timings */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <h3 className="font-semibold text-base mb-4">Hall Timings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Opening Hour</Label>
            <Input type="number" min={0} max={20} value={settings.hallOpenTime} onChange={e => setSettings({ ...settings, hallOpenTime: Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground">Currently: {formatH(settings.hallOpenTime)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Closing Hour</Label>
            <Input type="number" min={settings.hallOpenTime + 1} max={24} value={settings.hallCloseTime} onChange={e => setSettings({ ...settings, hallCloseTime: Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground">Currently: {formatH(settings.hallCloseTime)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Max Custom Hours</Label>
            <Input type="number" min={1} max={14} value={settings.maxCustomHours} onChange={e => setSettings({ ...settings, maxCustomHours: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <h3 className="font-semibold text-base mb-4">Pricing (₹)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {(['resident', 'tenant'] as const).map(userType => (
            <div key={userType} className="space-y-3">
              <p className="font-medium capitalize text-sm">{userType}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label className="text-xs">Full Day</Label><Input type="number" value={settings.pricing[userType].full} onChange={e => updatePricing(userType, 'full', Number(e.target.value))} /></div>
                <div className="space-y-1"><Label className="text-xs">Half Day</Label><Input type="number" value={settings.pricing[userType].half} onChange={e => updatePricing(userType, 'half', Number(e.target.value))} /></div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 max-w-xs">
          <Label>Security Deposit (₹)</Label>
          <Input type="number" value={settings.deposit} onChange={e => setSettings({ ...settings, deposit: Number(e.target.value) })} />
        </div>
      </div>

      {/* Rules & Regulations */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">Rules & Regulations</h3>
          <Button size="sm" variant="outline" onClick={addRule}><Plus className="h-4 w-4 mr-1" /> Add Rule</Button>
        </div>
        <div className="space-y-3">
          {settings.rules.map((rule, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-xs text-muted-foreground font-mono mt-2.5 w-6 shrink-0">{i + 1}.</span>
              <Textarea value={rule} onChange={e => updateRule(i, e.target.value)} rows={2} className="flex-1 text-sm" />
              <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => removeRule(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-5 pt-4 border-t">
          <Label className="text-sm font-medium">Detailed Rules PDF (optional)</Label>
          <p className="text-xs text-muted-foreground mb-3">Upload a PDF for residents to download.</p>
          {settings.rulesPdfUrl ? (
            <div className="flex items-center gap-3 bg-accent rounded-lg p-3">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{settings.rulesPdfName || 'rules.pdf'}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSettings({ ...settings, rulesPdfUrl: undefined, rulesPdfName: undefined })}>
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1.5" /> Upload PDF
            </Button>
          )}
          <input ref={fileInputRef} type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleReset}><RotateCcw className="h-4 w-4 mr-1.5" /> Reset to Defaults</Button>
        <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving...' : 'Save Settings'}</Button>
      </div>
    </div>
  );
}

function formatH(h: number): string {
  if (h === 0 || h === 24) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

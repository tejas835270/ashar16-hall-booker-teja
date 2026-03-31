import { useState, useRef } from 'react';
import { Save, Plus, Trash2, RotateCcw, Upload, FileText, X, Image, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { saveSettings, uploadFile, type HallSettings, type CustomField } from '@/lib/bookingStore';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

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
      societyName: 'Ashar 16 CHSL',
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
      customFields: [],
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

  // Custom fields CRUD
  function addCustomField() {
    const newField: CustomField = {
      id: uuidv4().slice(0, 8),
      label: '',
      type: 'text',
      placeholder: '',
      required: false,
      options: [],
    };
    setSettings({ ...settings, customFields: [...settings.customFields, newField] });
  }

  function updateCustomField(id: string, updates: Partial<CustomField>) {
    setSettings({
      ...settings,
      customFields: settings.customFields.map(f => f.id === id ? { ...f, ...updates } : f),
    });
  }

  function removeCustomField(id: string) {
    setSettings({ ...settings, customFields: settings.customFields.filter(f => f.id !== id) });
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

  const sectionClass = "bg-card rounded-xl shadow-card border border-border/40 p-5";

  return (
    <div className="space-y-5">
      {/* Society Name */}
      <div className={sectionClass}>
        <h3 className="font-semibold text-base mb-4">Society Name</h3>
        <div className="space-y-1.5">
          <Label>Display name used everywhere (heading, PDFs, receipts)</Label>
          <Input
            placeholder="e.g. Ashar 16 CHSL"
            value={settings.societyName}
            onChange={e => setSettings({ ...settings, societyName: e.target.value })}
          />
        </div>
      </div>

      {/* Cheque Payee Name */}
      <div className={sectionClass}>
        <h3 className="font-semibold text-base mb-4">Cheque Payee Name</h3>
        <div className="space-y-1.5">
          <Label>Payee name shown to residents for security deposit cheques</Label>
          <Input
            placeholder="e.g. Ashar 16 Co. Op. Societies Association Ltd"
            value={settings.chequePayeeName || ''}
            onChange={e => setSettings({ ...settings, chequePayeeName: e.target.value })}
          />
        </div>
      </div>

      {/* Custom Form Fields Builder */}
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-base">Custom Booking Fields</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Add extra fields to the booking form for residents</p>
          </div>
          <Button size="sm" variant="outline" onClick={addCustomField} className="rounded-lg">
            <Plus className="h-4 w-4 mr-1" /> Add Field
          </Button>
        </div>
        {settings.customFields.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6 bg-accent/50 rounded-lg">
            No custom fields yet. Click "Add Field" to create one.
          </p>
        )}
        <div className="space-y-3">
          {settings.customFields.map((field, idx) => (
            <div key={field.id} className="bg-accent/50 rounded-lg p-4 space-y-3 border border-border/30">
              <div className="flex items-center gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                <span className="text-xs font-mono text-muted-foreground shrink-0">#{idx + 1}</span>
                <div className="flex-1" />
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeCustomField(field.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Field Label *</Label>
                  <Input
                    value={field.label}
                    onChange={e => updateCustomField(field.id, { label: e.target.value })}
                    placeholder="e.g. Catering Required"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Field Type</Label>
                  <Select value={field.type} onValueChange={v => updateCustomField(field.id, { type: v as CustomField['type'] })}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Input</SelectItem>
                      <SelectItem value="select">Dropdown</SelectItem>
                      <SelectItem value="checkbox">Checkbox</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {field.type !== 'checkbox' && (
                <div className="space-y-1">
                  <Label className="text-xs">Placeholder</Label>
                  <Input
                    value={field.placeholder || ''}
                    onChange={e => updateCustomField(field.id, { placeholder: e.target.value })}
                    placeholder="e.g. Enter details..."
                    className="h-9 text-sm"
                  />
                </div>
              )}
              {field.type === 'select' && (
                <div className="space-y-1">
                  <Label className="text-xs">Options (comma-separated)</Label>
                  <Input
                    value={(field.options || []).join(', ')}
                    onChange={e => updateCustomField(field.id, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                    placeholder="e.g. Yes, No, Maybe"
                    className="h-9 text-sm"
                  />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={field.required}
                  onCheckedChange={v => updateCustomField(field.id, { required: !!v })}
                  id={`req-${field.id}`}
                />
                <label htmlFor={`req-${field.id}`} className="text-xs text-muted-foreground cursor-pointer">Required field</label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment Settings */}
      <div className={sectionClass}>
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
      <div className={sectionClass}>
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
      <div className={sectionClass}>
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
      <div className={sectionClass}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">Rules & Regulations</h3>
          <Button size="sm" variant="outline" onClick={addRule} className="rounded-lg"><Plus className="h-4 w-4 mr-1" /> Add Rule</Button>
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
        <Button variant="outline" onClick={handleReset} className="rounded-lg"><RotateCcw className="h-4 w-4 mr-1.5" /> Reset to Defaults</Button>
        <Button onClick={handleSave} disabled={saving} className="rounded-lg"><Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving...' : 'Save Settings'}</Button>
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

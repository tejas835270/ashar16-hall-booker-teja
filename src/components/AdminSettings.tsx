import { useState, useRef } from 'react';
import { Save, Plus, Trash2, RotateCcw, Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getSettings, saveSettings, getDefaultSettings, type HallSettings } from '@/lib/settingsStore';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState<HallSettings>(getSettings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSave() {
    saveSettings(settings);
    toast.success('Settings saved successfully!');
  }

  function handleReset() {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    saveSettings(defaults);
    toast.info('Settings reset to defaults');
  }

  function updateRule(index: number, value: string) {
    const rules = [...settings.rules];
    rules[index] = value;
    setSettings({ ...settings, rules });
  }

  function addRule() {
    setSettings({ ...settings, rules: [...settings.rules, ''] });
  }

  function removeRule(index: number) {
    setSettings({ ...settings, rules: settings.rules.filter((_, i) => i !== index) });
  }

  function updatePricing(userType: 'resident' | 'tenant', field: 'full' | 'half', value: number) {
    setSettings({
      ...settings,
      pricing: {
        ...settings.pricing,
        [userType]: { ...settings.pricing[userType], [field]: value },
      },
    });
  }

  function handlePdfUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('PDF must be under 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSettings({ ...settings, rulesPdfDataUrl: dataUrl, rulesPdfName: file.name });
      toast.success(`Uploaded: ${file.name}`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function removePdf() {
    setSettings({ ...settings, rulesPdfDataUrl: undefined, rulesPdfName: undefined });
  }

  return (
    <div className="space-y-6">
      {/* Hall Timings */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <h3 className="font-semibold text-base mb-4">Hall Timings</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Opening Hour</Label>
            <Input
              type="number"
              min={0} max={20}
              value={settings.hallOpenTime}
              onChange={e => setSettings({ ...settings, hallOpenTime: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Currently: {formatH(settings.hallOpenTime)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Closing Hour</Label>
            <Input
              type="number"
              min={settings.hallOpenTime + 1} max={24}
              value={settings.hallCloseTime}
              onChange={e => setSettings({ ...settings, hallCloseTime: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">Currently: {formatH(settings.hallCloseTime)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Max Custom Hours</Label>
            <Input
              type="number"
              min={1} max={14}
              value={settings.maxCustomHours}
              onChange={e => setSettings({ ...settings, maxCustomHours: Number(e.target.value) })}
            />
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
                <div className="space-y-1">
                  <Label className="text-xs">Full Day</Label>
                  <Input
                    type="number"
                    value={settings.pricing[userType].full}
                    onChange={e => updatePricing(userType, 'full', Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Half Day</Label>
                  <Input
                    type="number"
                    value={settings.pricing[userType].half}
                    onChange={e => updatePricing(userType, 'half', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1.5 max-w-xs">
          <Label>Security Deposit (₹)</Label>
          <Input
            type="number"
            value={settings.deposit}
            onChange={e => setSettings({ ...settings, deposit: Number(e.target.value) })}
          />
        </div>
      </div>

      {/* Rules & Regulations */}
      <div className="bg-card rounded-xl shadow-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-base">Rules & Regulations</h3>
          <Button size="sm" variant="outline" onClick={addRule}>
            <Plus className="h-4 w-4 mr-1" /> Add Rule
          </Button>
        </div>
        <div className="space-y-3">
          {settings.rules.map((rule, i) => (
            <div key={i} className="flex gap-2 items-start">
              <span className="text-xs text-muted-foreground font-mono mt-2.5 w-6 shrink-0">{i + 1}.</span>
              <Textarea
                value={rule}
                onChange={e => updateRule(i, e.target.value)}
                rows={2}
                className="flex-1 text-sm"
              />
              <Button variant="ghost" size="icon" className="shrink-0 mt-0.5" onClick={() => removeRule(i)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>

        {/* PDF Upload */}
        <div className="mt-5 pt-4 border-t">
          <Label className="text-sm font-medium">Detailed Rules PDF (optional)</Label>
          <p className="text-xs text-muted-foreground mb-3">Upload a PDF document with detailed rules & regulations for residents to download.</p>
          
          {settings.rulesPdfDataUrl ? (
            <div className="flex items-center gap-3 bg-accent rounded-lg p-3">
              <FileText className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{settings.rulesPdfName || 'rules.pdf'}</p>
                <p className="text-xs text-muted-foreground">PDF attached</p>
              </div>
              <Button variant="ghost" size="icon" onClick={removePdf}>
                <X className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1.5" /> Upload PDF
            </Button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handlePdfUpload}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1.5" /> Reset to Defaults
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Settings
        </Button>
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

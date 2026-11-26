import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { WebsiteNotConfigured } from '../../components/admin/WebsiteNotConfigured';
import { useToast } from '../../context/ToastContext';
import {
  getWebsiteSettings, saveWebsiteSettings, WebsiteNotConfiguredError, niceDate, niceDateTime, todayIST,
} from '../../services/websiteAdminService';
import { Save, Loader2, X, AlertTriangle } from 'lucide-react';

// Half-hour steps, same as the website's settings validation.
const TIMES = Array.from({ length: 48 }, (_, i) => `${String(Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'}`);
const label12 = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

const inputClass = 'w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 text-sm focus:border-amber-600 focus:bg-white focus:outline-none';
const labelClass = 'block text-[11px] uppercase tracking-[0.2em] text-slate-600 mb-1.5';

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-4 h-4 accent-slate-950" />
      <span>
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      </span>
    </label>
  );
}

function Section({ title, children }) {
  return (
    <section className="bg-paper border border-slate-200 p-5 sm:p-6">
      <h2 className="text-xl font-display mb-4">{title}</h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function AdminWebsiteSettings() {
  const { showToast } = useToast();
  const [s, setS] = useState(null);
  const [meta, setMeta] = useState({ saved: true, updatedAt: null, updatedBy: null });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notConfigured, setNotConfigured] = useState(null);
  const [newClosed, setNewClosed] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getWebsiteSettings();
        setS(data.settings);
        setMeta({ saved: data.saved, updatedAt: data.updatedAt, updatedBy: data.updatedBy });
      } catch (err) {
        if (err instanceof WebsiteNotConfiguredError) setNotConfigured(err.message);
        else showToast(err.message, 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, [showToast]);

  const set = (key, value) => setS((prev) => ({ ...prev, [key]: value }));

  const addClosed = () => {
    if (!newClosed) return;
    if (newClosed < todayIST()) return showToast('Pick today or a future date', 'warning');
    if (!s.closedDates.includes(newClosed)) set('closedDates', [...s.closedDates, newClosed].sort());
    setNewClosed('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!meta.saved && !window.confirm(
      "The website has never saved its settings, so the values here are defaults and may not match the website's own .env (tables, PS5 consoles, timing, WhatsApp).\n\nCheck every field, then save?"
    )) return;
    setSaving(true);
    try {
      const data = await saveWebsiteSettings({
        ...s,
        ps5Consoles: Number(s.ps5Consoles),
        tableCount: Number(s.tableCount),
        tableDuration: Number(s.tableDuration),
        daysAhead: Number(s.daysAhead),
      });
      setS(data.settings);
      setMeta({ saved: true, updatedAt: data.updatedAt, updatedBy: data.updatedBy });
      showToast('Website settings saved. The website picks them up within a minute.', 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-16">
      <Navbar />
      <AdminHeader title="Website Settings" subtitle="Booking switches, opening hours, capacity, closed days and the announcement banner on the Junio 8 website." />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {notConfigured ? (
          <WebsiteNotConfigured message={notConfigured} />
        ) : loading || !s ? (
          <LoadingSpinner text="Loading website settings..." className="py-16" />
        ) : (
          <form onSubmit={handleSave} className="space-y-5">
            {!meta.saved && (
              <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 text-sm flex gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>The website hasn't saved settings yet, so these are default values. Check them carefully before saving.</span>
              </div>
            )}

            <Section title="Online booking">
              <Toggle checked={s.bookingEnabled} onChange={(v) => set('bookingEnabled', v)} label="Accept bookings on the website" hint="Turn off to pause all online bookings." />
              <Toggle checked={s.tablesEnabled} onChange={(v) => set('tablesEnabled', v)} label="Table reservations" />
              <Toggle checked={s.ps5Enabled} onChange={(v) => set('ps5Enabled', v)} label="PS5 slot bookings" />
            </Section>

            <Section title="Contact & hours">
              <div>
                <label className={labelClass}>WhatsApp number (with country code)</label>
                <input value={s.whatsappNumber} onChange={(e) => set('whatsappNumber', e.target.value)} placeholder="919876543210" inputMode="numeric" className={inputClass} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Opens</label>
                  <select value={s.openTime} onChange={(e) => set('openTime', e.target.value)} className={inputClass}>
                    {TIMES.map((t) => <option key={t} value={t}>{label12(t)}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Closes</label>
                  <select value={s.closeTime} onChange={(e) => set('closeTime', e.target.value)} className={inputClass}>
                    {TIMES.map((t) => <option key={t} value={t}>{label12(t)}</option>)}
                  </select>
                </div>
              </div>
            </Section>

            <Section title="Capacity">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Tables that can be booked at once</label>
                  <input type="number" min={1} max={200} value={s.tableCount} onChange={(e) => set('tableCount', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>PS5 consoles</label>
                  <input type="number" min={1} max={50} value={s.ps5Consoles} onChange={(e) => set('ps5Consoles', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Table booking length (minutes)</label>
                  <input type="number" min={30} max={360} step={30} value={s.tableDuration} onChange={(e) => set('tableDuration', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Days ahead people can book</label>
                  <input type="number" min={1} max={180} value={s.daysAhead} onChange={(e) => set('daysAhead', e.target.value)} className={inputClass} />
                </div>
              </div>
            </Section>

            <Section title="Closed dates">
              <div className="flex gap-2">
                <input type="date" min={todayIST()} value={newClosed} onChange={(e) => setNewClosed(e.target.value)} className={inputClass} />
                <button type="button" onClick={addClosed} className="px-4 border border-slate-950 hover:bg-slate-950 hover:text-slate-50 text-xs uppercase tracking-[0.2em]">Add</button>
              </div>
              {s.closedDates.length === 0 ? (
                <p className="text-sm text-slate-500">No closed dates.</p>
              ) : (
                <ul className="flex flex-wrap gap-2">
                  {s.closedDates.map((d) => (
                    <li key={d} className="inline-flex items-center gap-1 pl-3 pr-1 py-1 bg-slate-100 text-sm">
                      {niceDate(d)}
                      <button type="button" onClick={() => set('closedDates', s.closedDates.filter((x) => x !== d))} className="p-1 hover:text-rose-600" aria-label={`Remove ${d}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Announcement banner">
              <Toggle
                checked={s.announcement.enabled}
                onChange={(v) => set('announcement', { ...s.announcement, enabled: v })}
                label="Show a banner at the top of the website"
              />
              <div>
                <input
                  value={s.announcement.text}
                  maxLength={160}
                  onChange={(e) => set('announcement', { ...s.announcement, text: e.target.value })}
                  placeholder="e.g. Closed on Diwali. Happy holidays!"
                  className={inputClass}
                />
                <p className="text-xs text-slate-500 mt-1">{s.announcement.text.length}/160</p>
              </div>
            </Section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {meta.updatedAt ? `Last saved ${niceDateTime(meta.updatedAt)}${meta.updatedBy ? ` by ${meta.updatedBy}` : ''}` : ''}
              </p>
              <button type="submit" disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-slate-950 hover:bg-brand-600 text-slate-50 text-[11px] uppercase tracking-[0.25em] disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save website settings'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

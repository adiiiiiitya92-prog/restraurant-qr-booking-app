import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { WebsiteNotConfigured } from '../../components/admin/WebsiteNotConfigured';
import { useToast } from '../../context/ToastContext';
import {
  listWebsiteBookings, updateWebsiteBooking, WebsiteNotConfiguredError,
  STATUS_LABEL, STATUS_STYLE, fmt12, niceDate, niceDateTime, durationLabel, todayIST, addDaysISO,
  whatsappLink, bookingConfirmMessage, bookingCancelMessage,
} from '../../services/websiteAdminService';
import { RefreshCw, Search, Phone, MessageCircle, StickyNote, Gamepad2, Armchair } from 'lucide-react';

const REFRESH_MS = 60_000;
const inputClass = 'px-3 py-2 border border-slate-200 bg-paper text-sm focus:border-amber-600 focus:outline-none';

function ActionButton({ children, onClick, tone = 'plain', disabled }) {
  const tones = {
    ok: 'bg-slate-950 text-slate-50 hover:bg-brand-600 border-slate-950',
    bad: 'border-rose-200 text-rose-700 hover:bg-rose-50',
    plain: 'border-slate-200 hover:border-slate-950',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`px-3 py-1.5 border text-xs transition-colors disabled:opacity-50 ${tones[tone]}`}>
      {children}
    </button>
  );
}

export function AdminBookings() {
  const { showToast } = useToast();
  const [from, setFrom] = useState(todayIST());
  const [to, setTo] = useState(addDaysISO(todayIST(), 7));
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(null);
  const [busyRef, setBusyRef] = useState(null);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      try {
        const data = await listWebsiteBookings({ from, to, type, status });
        setBookings(data.bookings || []);
        setNotConfigured(null);
      } catch (err) {
        if (err instanceof WebsiteNotConfiguredError) setNotConfigured(err.message);
        else if (!quiet) showToast(err.message, 'error');
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [from, to, type, status, showToast]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load({ quiet: true }), REFRESH_MS); // new website bookings show up on their own
    return () => clearInterval(t);
  }, [load]);

  const update = async (b, changes, successMsg) => {
    setBusyRef(b.ref);
    try {
      const { booking } = await updateWebsiteBooking(b.ref, changes);
      setBookings((list) => list.map((x) => (x.ref === b.ref ? { ...x, ...booking } : x)));
      showToast(successMsg, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusyRef(null);
    }
  };

  const setStatusFor = (b, next) => {
    if (next === 'cancelled' && !window.confirm(`Cancel ${b.name}'s booking (${b.ref})? The slot will open up again.`)) return;
    update(b, { status: next }, `Booking ${STATUS_LABEL[next].toLowerCase()}`);
  };

  const editNote = (b) => {
    const note = window.prompt('Private note for this booking (only admins see it):', b.adminNote || '');
    if (note === null) return;
    update(b, { adminNote: note }, 'Note saved');
  };

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return bookings;
    return bookings.filter((b) => [b.name, b.phone, b.ref, b.notes, b.adminNote].join(' ').toLowerCase().includes(q));
  }, [bookings, search]);

  // Group by date for an easy day-by-day view
  const byDate = useMemo(() => {
    const map = new Map();
    for (const b of visible) map.set(b.date, [...(map.get(b.date) || []), b]);
    return [...map.entries()];
  }, [visible]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-16">
      <Navbar />
      <AdminHeader
        title="Website Bookings"
        subtitle="Table and PS5 bookings made on the Junio 8 website. Updates here show on the website's admin too."
        action={
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2.5 border border-slate-950 hover:bg-slate-950 hover:text-slate-50 text-[11px] uppercase tracking-[0.2em] transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {notConfigured ? (
          <WebsiteNotConfigured message={notConfigured} />
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs text-slate-600">From<br /><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} /></label>
              <label className="text-xs text-slate-600">To<br /><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={inputClass} /></label>
              <label className="text-xs text-slate-600">Type<br />
                <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
                  <option value="">All</option><option value="table">Table</option><option value="ps5">PS5</option>
                </select>
              </label>
              <label className="text-xs text-slate-600">Status<br />
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
                  <option value="">All</option>
                  {['pending', 'confirmed', 'completed', 'no_show', 'cancelled'].map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </label>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, booking ID…" className={`${inputClass} w-full pl-9`} />
              </div>
            </div>

            {loading ? (
              <LoadingSpinner text="Loading website bookings..." className="py-16" />
            ) : byDate.length === 0 ? (
              <div className="bg-paper border border-slate-200 p-10 text-center text-sm text-slate-600">No bookings in this range.</div>
            ) : (
              byDate.map(([date, list]) => (
                <section key={date}>
                  <h2 className="text-xl font-display mb-2">
                    {niceDate(date)} {date === todayIST() && <span className="text-[10px] uppercase tracking-[0.25em] text-brand-600 ml-2">Today</span>}
                    <span className="text-xs text-slate-500 font-sans ml-2">{list.length} booking{list.length === 1 ? '' : 's'}</span>
                  </h2>
                  <ul className="bg-paper border border-slate-200 divide-y divide-slate-200">
                    {list.map((b) => {
                      const busy = busyRef === b.ref;
                      const details = b.type === 'table'
                        ? [`${b.guests} guests`, b.occasion, durationLabel(b.duration)]
                        : [`${b.players} players`, durationLabel(b.duration), b.game];
                      const msg = b.status === 'cancelled' ? bookingCancelMessage(b) : bookingConfirmMessage(b);
                      return (
                        <li key={b.ref} className={`p-4 flex flex-col md:flex-row gap-4 ${b.status === 'cancelled' || b.status === 'no_show' ? 'opacity-60' : ''}`}>
                          <div className="md:w-28 shrink-0">
                            <div className="text-lg font-display leading-none">{fmt12(b.start)}</div>
                            <div className="text-xs text-slate-500">until {fmt12(b.end)}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{b.name}</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] bg-slate-950 text-slate-50">
                                {b.type === 'ps5' ? <Gamepad2 className="w-3 h-3" /> : <Armchair className="w-3 h-3" />}
                                {b.type === 'ps5' ? 'PS5' : 'Table'}
                              </span>
                              <span className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] border ${STATUS_STYLE[b.status] || ''}`}>{STATUS_LABEL[b.status] || b.status}</span>
                            </div>
                            <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-3">
                              <span>📞 {b.phone}</span>
                              {details.filter(Boolean).map((d) => <span key={d}>{d}</span>)}
                            </div>
                            {b.notes && <p className="text-sm mt-1 bg-slate-50 px-2 py-1">“{b.notes}”</p>}
                            {b.adminNote && <p className="text-xs mt-1 text-amber-800">Note: {b.adminNote}</p>}
                            <p className="text-[11px] text-slate-500 mt-1">
                              {b.ref} · booked {niceDateTime(b.createdAt)}{b.updatedBy ? ` · updated by ${b.updatedBy}` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2 md:justify-end md:max-w-xs">
                            {b.status === 'pending' && <ActionButton tone="ok" disabled={busy} onClick={() => setStatusFor(b, 'confirmed')}>✓ Confirm</ActionButton>}
                            {b.status === 'confirmed' && <ActionButton tone="ok" disabled={busy} onClick={() => setStatusFor(b, 'completed')}>Done</ActionButton>}
                            {b.status === 'confirmed' && <ActionButton disabled={busy} onClick={() => setStatusFor(b, 'no_show')}>No-show</ActionButton>}
                            {(b.status === 'pending' || b.status === 'confirmed') && <ActionButton tone="bad" disabled={busy} onClick={() => setStatusFor(b, 'cancelled')}>Cancel</ActionButton>}
                            {['cancelled', 'no_show', 'completed'].includes(b.status) && <ActionButton disabled={busy} onClick={() => setStatusFor(b, 'pending')}>Reopen</ActionButton>}
                            <a href={whatsappLink(b.phone, msg)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs">
                              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                            <a href={`tel:+91${b.phone}`} className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-950 text-xs">
                              <Phone className="w-3.5 h-3.5" /> Call
                            </a>
                            <ActionButton disabled={busy} onClick={() => editNote(b)}><StickyNote className="w-3.5 h-3.5 inline mr-1" />Note</ActionButton>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            )}
          </>
        )}
      </main>
    </div>
  );
}

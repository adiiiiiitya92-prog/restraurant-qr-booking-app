import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { WebsiteNotConfigured } from '../../components/admin/WebsiteNotConfigured';
import { useToast } from '../../context/ToastContext';
import {
  listWebsiteEnquiries, updateWebsiteEnquiry, WebsiteNotConfiguredError,
  STATUS_LABEL, STATUS_STYLE, niceDateTime, whatsappLink,
} from '../../services/websiteAdminService';
import { RefreshCw, Search, Phone, MessageCircle, StickyNote } from 'lucide-react';

const REFRESH_MS = 60_000;
const FILTERS = [
  { id: '', label: 'All' },
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'closed', label: 'Closed' },
];

function ActionButton({ children, onClick, tone = 'plain', disabled }) {
  const tones = {
    ok: 'bg-slate-950 text-slate-50 hover:bg-brand-600 border-slate-950',
    plain: 'border-slate-200 hover:border-slate-950',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`px-3 py-1.5 border text-xs transition-colors disabled:opacity-50 ${tones[tone]}`}>
      {children}
    </button>
  );
}

export function AdminEnquiries() {
  const { showToast } = useToast();
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notConfigured, setNotConfigured] = useState(null);
  const [busyId, setBusyId] = useState(null);

  // Always load everything; filter in the browser so the counts on the tabs stay right.
  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLoading(true);
      try {
        const data = await listWebsiteEnquiries('');
        setEnquiries(data.enquiries || []);
        setNotConfigured(null);
      } catch (err) {
        if (err instanceof WebsiteNotConfiguredError) setNotConfigured(err.message);
        else if (!quiet) showToast(err.message, 'error');
      } finally {
        if (!quiet) setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    load();
    const t = setInterval(() => load({ quiet: true }), REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const update = async (x, changes, successMsg) => {
    setBusyId(x.id);
    try {
      const { enquiry } = await updateWebsiteEnquiry(x.id, changes);
      setEnquiries((list) => list.map((e) => (e.id === x.id ? { ...e, ...enquiry } : e)));
      showToast(successMsg, 'success');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setBusyId(null);
    }
  };

  const editNote = (x) => {
    const note = window.prompt('Private note (only admins see it):', x.adminNote || '');
    if (note === null) return;
    update(x, { adminNote: note }, 'Note saved');
  };

  const counts = useMemo(() => {
    const c = { '': enquiries.length, new: 0, contacted: 0, closed: 0 };
    enquiries.forEach((e) => { c[e.status] = (c[e.status] || 0) + 1; });
    return c;
  }, [enquiries]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enquiries.filter(
      (x) => (!filter || x.status === filter) && (!q || [x.name, x.phone, x.message, x.topic, x.adminNote].join(' ').toLowerCase().includes(q))
    );
  }, [enquiries, filter, search]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-16">
      <Navbar />
      <AdminHeader
        title="Website Enquiries"
        subtitle="Messages from the “Get in touch” form on the Junio 8 website."
        action={
          <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2.5 border border-slate-950 hover:bg-slate-950 hover:text-slate-50 text-[11px] uppercase tracking-[0.2em] transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {notConfigured ? (
          <WebsiteNotConfigured message={notConfigured} />
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex border border-slate-200 bg-paper">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFilter(f.id)}
                    className={`px-4 py-2 text-xs transition-colors ${filter === f.id ? 'bg-slate-950 text-slate-50' : 'hover:bg-slate-100'}`}
                  >
                    {f.label} <span className="opacity-60">({counts[f.id] || 0})</span>
                  </button>
                ))}
              </div>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, phone, message…" className="w-full pl-9 px-3 py-2 border border-slate-200 bg-paper text-sm focus:border-amber-600 focus:outline-none" />
              </div>
            </div>

            {loading ? (
              <LoadingSpinner text="Loading enquiries..." className="py-16" />
            ) : visible.length === 0 ? (
              <div className="bg-paper border border-slate-200 p-10 text-center text-sm text-slate-600">No enquiries here.</div>
            ) : (
              <ul className="bg-paper border border-slate-200 divide-y divide-slate-200">
                {visible.map((x) => {
                  const busy = busyId === x.id;
                  return (
                    <li key={x.id} className={`p-4 flex flex-col md:flex-row gap-4 ${x.status === 'closed' ? 'opacity-60' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{x.name}</span>
                          <span className="px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] bg-slate-100 text-slate-700">{x.topic}</span>
                          <span className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] border ${STATUS_STYLE[x.status] || ''}`}>{STATUS_LABEL[x.status] || x.status}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">📞 {x.phone}</p>
                        <p className="text-sm mt-2 whitespace-pre-line">{x.message}</p>
                        {x.adminNote && <p className="text-xs mt-1 text-amber-800">Note: {x.adminNote}</p>}
                        <p className="text-[11px] text-slate-500 mt-1">
                          {niceDateTime(x.createdAt)}{x.updatedBy ? ` · updated by ${x.updatedBy}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2 md:justify-end md:max-w-xs md:self-start">
                        {x.status === 'new' && <ActionButton tone="ok" disabled={busy} onClick={() => update(x, { status: 'contacted' }, 'Marked contacted')}>✓ Contacted</ActionButton>}
                        {x.status !== 'closed' && <ActionButton disabled={busy} onClick={() => update(x, { status: 'closed' }, 'Marked closed')}>Close</ActionButton>}
                        {x.status === 'closed' && <ActionButton disabled={busy} onClick={() => update(x, { status: 'new' }, 'Reopened')}>Reopen</ActionButton>}
                        <a
                          href={whatsappLink(x.phone, `Hi ${x.name}, thanks for getting in touch with Junio 8 Café about "${x.topic}". `)}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 text-xs"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                        <a href={`tel:+91${x.phone}`} className="inline-flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-slate-950 text-xs">
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                        <ActionButton disabled={busy} onClick={() => editNote(x)}><StickyNote className="w-3.5 h-3.5 inline mr-1" />Note</ActionButton>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

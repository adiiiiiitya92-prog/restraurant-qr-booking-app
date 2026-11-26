import React, { useEffect, useState } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeStaff,
  createStaff,
  updateStaff,
  setStaffPassword,
  setStaffBlocked,
} from '../../services/staffService';
import { UserPlus, Pencil, KeyRound, Ban, CheckCircle2, Eye, EyeOff, Users, Loader2 } from 'lucide-react';

const MIN_PASSWORD = 8;

const inputClass =
  'w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 text-slate-950 text-sm focus:border-amber-600 focus:bg-white focus:outline-none placeholder:text-slate-400';
const labelClass = 'block text-[11px] uppercase tracking-[0.2em] text-slate-600 mb-1.5';
const primaryBtn =
  'w-full flex items-center justify-center gap-2 py-3 bg-slate-950 hover:bg-brand-600 text-slate-50 text-[11px] uppercase tracking-[0.25em] transition-colors disabled:opacity-50';

function PasswordInput({ value, onChange, autoFocus = false }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        minLength={MIN_PASSWORD}
        required
        autoFocus={autoFocus}
        autoComplete="new-password"
        placeholder={`At least ${MIN_PASSWORD} characters`}
        className={`${inputClass} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-950"
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

function RoleSelect({ value, onChange, disabled = false }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={inputClass}>
      <option value="kitchen">Kitchen / Waiter</option>
      <option value="admin">Admin (full access)</option>
    </select>
  );
}

export function AdminStaff() {
  const { showToast } = useToast();
  const { currentUser, isFirebaseConfigured } = useAuth();
  const myUid = currentUser?.uid;

  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // modal: null | { type: 'create' } | { type: 'edit' | 'password' | 'block', member }
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'kitchen' });

  useEffect(() => {
    const unsub = subscribeStaff(
      (list) => {
        setStaff(list);
        setLoading(false);
      },
      () => {
        showToast('Could not load staff list. Check the Firestore rules are published.', 'error');
        setLoading(false);
      }
    );
    return () => unsub();
  }, [showToast]);

  const openCreate = () => {
    setForm({ name: '', email: '', password: '', role: 'kitchen' });
    setModal({ type: 'create' });
  };
  const openEdit = (member) => {
    setForm({ name: member.name || '', email: member.email || '', password: '', role: member.role || 'kitchen' });
    setModal({ type: 'edit', member });
  };
  const openPassword = (member) => {
    setForm((f) => ({ ...f, password: '' }));
    setModal({ type: 'password', member });
  };
  const openBlock = (member) => setModal({ type: 'block', member });
  const close = () => !busy && setModal(null);

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      showToast(successMsg, 'success');
      setModal(null);
    } catch (err) {
      showToast(err.message || 'Something went wrong', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    run(
      () => createStaff({ name: form.name, email: form.email, password: form.password, role: form.role }),
      `${form.name} can now sign in`
    );
  };

  const handleEdit = (e) => {
    e.preventDefault();
    run(() => updateStaff(modal.member.uid, { name: form.name, email: form.email, role: form.role }), 'Details saved');
  };

  const handlePassword = (e) => {
    e.preventDefault();
    run(() => setStaffPassword(modal.member.uid, form.password), 'Password changed');
  };

  const handleBlockToggle = () => {
    const member = modal.member;
    const block = member.active !== false;
    run(
      () => setStaffBlocked(member.uid, block),
      block ? `${member.name} is blocked and signed out` : `${member.name} can sign in again`
    );
  };

  const busyLabel = (
    <>
      <Loader2 className="w-4 h-4 animate-spin" />
      <span>Saving...</span>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-16">
      <Navbar />

      <AdminHeader
        title="Staff"
        subtitle="Create logins for kitchen and waiter staff, edit their details, change passwords or block access."
        action={
          isFirebaseConfigured && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-3 bg-slate-950 hover:bg-brand-600 text-slate-50 text-[11px] uppercase tracking-[0.25em] transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Staff</span>
            </button>
          )
        }
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isFirebaseConfigured ? (
          <div className="bg-paper border border-slate-200 p-10 text-center">
            <Users className="w-10 h-10 text-amber-600 mx-auto mb-3" />
            <h2 className="text-2xl font-display mb-2">Needs the live database</h2>
            <p className="text-sm text-slate-600">Staff logins can only be managed when Firebase is connected.</p>
          </div>
        ) : loading ? (
          <LoadingSpinner text="Loading staff..." className="py-20" />
        ) : staff.length === 0 ? (
          <div className="bg-paper border border-slate-200 p-10 text-center">
            <Users className="w-10 h-10 text-amber-600 mx-auto mb-3" />
            <h2 className="text-2xl font-display mb-2">No staff yet</h2>
            <p className="text-sm text-slate-600 mb-6">Add your kitchen and waiter team so they can open the kitchen display.</p>
            <button onClick={openCreate} className="px-6 py-3 bg-slate-950 hover:bg-brand-600 text-slate-50 text-[11px] uppercase tracking-[0.25em]">
              Add first staff member
            </button>
          </div>
        ) : (
          <ul className="bg-paper border border-slate-200 divide-y divide-slate-200">
            {staff.map((m) => {
              const blocked = m.active === false;
              const isMe = m.uid === myUid;
              return (
                <li key={m.uid} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div
                      className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-lg font-display ${
                        blocked ? 'bg-slate-200 text-slate-500' : 'bg-slate-950 text-slate-50'
                      }`}
                    >
                      {(m.name || m.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`font-medium ${blocked ? 'text-slate-500 line-through' : ''}`}>{m.name || 'Unnamed'}</span>
                        {isMe && <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">(you)</span>}
                        <span
                          className={`px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] ${
                            m.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {m.role === 'admin' ? 'Admin' : 'Kitchen'}
                        </span>
                        {blocked && (
                          <span className="px-2 py-0.5 text-[10px] uppercase tracking-[0.2em] bg-rose-50 text-rose-700 border border-rose-200">
                            Blocked
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 truncate">{m.email}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button
                      onClick={() => openEdit(m)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-950 text-xs transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => openPassword(m)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:border-slate-950 text-xs transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Password
                    </button>
                    {!isMe && (
                      <button
                        onClick={() => openBlock(m)}
                        className={`flex items-center gap-1.5 px-3 py-2 border text-xs transition-colors ${
                          blocked
                            ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                            : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                        }`}
                      >
                        {blocked ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                        {blocked ? 'Unblock' : 'Block'}
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>

      {/* Create */}
      <Modal isOpen={modal?.type === 'create'} onClose={close} title="Add staff member">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={60} autoFocus className={inputClass} placeholder="e.g. Ravi" />
          </div>
          <div>
            <label className={labelClass}>Email (used to sign in)</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required autoComplete="off" className={inputClass} placeholder="ravi@example.com" />
          </div>
          <div>
            <label className={labelClass}>Password</label>
            <PasswordInput value={form.password} onChange={(password) => setForm({ ...form, password })} />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} />
          </div>
          <p className="text-xs text-slate-500">Share the email and password with them in person. They can sign in at /login right away.</p>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? busyLabel : <><UserPlus className="w-4 h-4" /><span>Create login</span></>}
          </button>
        </form>
      </Modal>

      {/* Edit */}
      <Modal isOpen={modal?.type === 'edit'} onClose={close} title={`Edit ${modal?.member?.name || 'staff'}`}>
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={60} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email (used to sign in)</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Role</label>
            <RoleSelect value={form.role} onChange={(role) => setForm({ ...form, role })} disabled={modal?.member?.uid === myUid} />
            {modal?.member?.uid === myUid && <p className="text-xs text-slate-500 mt-1">You cannot change your own role.</p>}
          </div>
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? busyLabel : <span>Save changes</span>}
          </button>
        </form>
      </Modal>

      {/* Password */}
      <Modal isOpen={modal?.type === 'password'} onClose={close} title={`New password for ${modal?.member?.name || 'staff'}`}>
        <form onSubmit={handlePassword} className="space-y-4">
          <div>
            <label className={labelClass}>New password</label>
            <PasswordInput value={form.password} onChange={(password) => setForm({ ...form, password })} autoFocus />
          </div>
          {modal?.member?.uid !== myUid && (
            <p className="text-xs text-slate-500">They will be signed out on all devices and must use the new password.</p>
          )}
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? busyLabel : <><KeyRound className="w-4 h-4" /><span>Change password</span></>}
          </button>
        </form>
      </Modal>

      {/* Block / unblock */}
      <Modal
        isOpen={modal?.type === 'block'}
        onClose={close}
        title={modal?.member?.active === false ? `Unblock ${modal?.member?.name}?` : `Block ${modal?.member?.name}?`}
      >
        <div className="space-y-5">
          <p className="text-sm text-slate-600">
            {modal?.member?.active === false
              ? 'They will be able to sign in again with their current password.'
              : 'They will be signed out and cannot sign in or see orders until you unblock them. Nothing is deleted.'}
          </p>
          <div className="flex gap-3">
            <button onClick={close} disabled={busy} className="flex-1 py-3 border border-slate-300 text-[11px] uppercase tracking-[0.25em] hover:border-slate-950">
              Cancel
            </button>
            <button
              onClick={handleBlockToggle}
              disabled={busy}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-white text-[11px] uppercase tracking-[0.25em] disabled:opacity-50 ${
                modal?.member?.active === false ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
              }`}
            >
              {busy ? busyLabel : modal?.member?.active === false ? 'Unblock' : 'Block'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

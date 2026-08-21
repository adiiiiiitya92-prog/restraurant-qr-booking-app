import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Bell, Droplets, Utensils, Receipt, Sparkles, Send } from 'lucide-react';
import { createWaiterCall } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';

const QUICK_OPTIONS = [
  { id: 'water', label: 'Water Refill', icon: Droplets, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/50' },
  { id: 'cutlery', label: 'Cutlery & Napkins', icon: Utensils, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/50' },
  { id: 'bill', label: 'Request Bill / Check', icon: Receipt, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50' },
  { id: 'clean', label: 'Clean Table', icon: Sparkles, color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/50' },
];

export function CallWaiterModal({ isOpen, onClose, tableId, tableNumber }) {
  const { showToast } = useToast();
  const [selectedOption, setSelectedOption] = useState('water');
  const [customNote, setCustomNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!tableId) return;

    setSubmitting(true);
    try {
      const selectedObj = QUICK_OPTIONS.find((o) => o.id === selectedOption);
      const reasonText = customNote.trim()
        ? `${selectedObj ? selectedObj.label + ': ' : ''}${customNote.trim()}`
        : selectedObj?.label || 'Assistance requested';

      await createWaiterCall(tableId, tableNumber, reasonText);
      showToast(`🔔 Waiter notified for Table #${tableNumber}! Staff will assist you shortly.`, 'success');
      setCustomNote('');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Could not notify waiter. Please inform a server.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Call Waiter - Table #${tableNumber || '?'}`}>
      <div className="space-y-4">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Select what you need and our service staff will be at your table right away.
        </p>

        {/* Quick Options Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = selectedOption === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedOption(opt.id)}
                className={`p-3 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/50 dark:bg-brand-950/40 ring-2 ring-brand-500/20'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                }`}
              >
                <div className={`p-2 rounded-lg ${opt.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-snug">
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Optional Custom Note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Additional Request (Optional)
          </label>
          <input
            type="text"
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            placeholder="e.g. Extra spicy sauce, ice bucket, high chair..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all"
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-sm shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
        >
          <Bell className="w-4 h-4" />
          <span>{submitting ? 'Notifying Staff...' : 'Send Request to Waiter'}</span>
        </button>
      </div>
    </Modal>
  );
}

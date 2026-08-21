import React from 'react';
import { Bell, Check, Clock } from 'lucide-react';
import { resolveWaiterCall } from '../../services/firestoreService';
import { formatTime } from '../../utils/formatters';

export function WaiterCallBanner({ calls = [] }) {
  if (!calls || calls.length === 0) return null;

  return (
    <div className="bg-amber-500 text-slate-950 p-3 rounded-2xl shadow-lg border border-amber-400 mb-6 animate-pulse-subtle">
      <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-amber-600/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-slate-950 text-amber-400 rounded-lg">
            <Bell className="w-4 h-4 animate-bounce-subtle" />
          </div>
          <span className="font-extrabold text-sm uppercase tracking-wide">
            Active Waiter Calls ({calls.length})
          </span>
        </div>
        <span className="text-xs font-semibold">Table Assistance Required</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {calls.map((call) => (
          <div
            key={call.id}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3 rounded-xl shadow-xs border border-amber-200 dark:border-slate-800 flex items-center justify-between gap-3"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 text-xs font-extrabold rounded-md">
                  Table #{call.tableNumber || '?'}
                </span>
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(call.createdAt)}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-900 dark:text-white mt-1 leading-snug">
                {call.reason || 'Assistance needed'}
              </p>
            </div>

            <button
              onClick={() => resolveWaiterCall(call.id)}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-lg transition-all shadow-xs shrink-0"
              title="Mark Attended"
            >
              <Check className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

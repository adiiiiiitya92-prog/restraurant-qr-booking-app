import React, { useState, useEffect } from 'react';
import {
  Clock,
  Printer,
  ChevronRight,
  CheckCircle2,
  ChefHat,
  Sparkles,
  AlertTriangle,
  FileText,
  Loader2,
  UtensilsCrossed,
  MoreVertical,
} from 'lucide-react';
import { DietaryBadge, StatusBadge } from '../common/Badge';
import { formatTime, getElapsedMinutes, formatOrderNumber } from '../../utils/formatters';
import { updateOrderStatus } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';

export function KitchenOrderCard({ order, onPrint }) {
  const { showToast } = useToast();
  const [elapsed, setElapsed] = useState(() => getElapsedMinutes(order.createdAt));
  const [updating, setUpdating] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Update elapsed minutes every 30 seconds
  useEffect(() => {
    setElapsed(getElapsedMinutes(order.createdAt));
    const interval = setInterval(() => {
      setElapsed(getElapsedMinutes(order.createdAt));
    }, 30000);
    return () => clearInterval(interval);
  }, [order.createdAt]);

  const handleStatusChange = async (nextStatus) => {
    if (updating || order.status === nextStatus) return;
    setUpdating(true);
    setShowStatusMenu(false);
    try {
      await updateOrderStatus(order.id, nextStatus);
      showToast(`Order #${order.orderNumber || order.id} moved to "${nextStatus}"`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  // Determine urgency background by elapsed time
  let timerBadgeColor = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300';
  let cardBorderColor = 'border-slate-200 dark:border-slate-800';

  if (elapsed >= 20) {
    timerBadgeColor = 'bg-rose-500 text-white animate-pulse';
    cardBorderColor = 'border-rose-500 ring-2 ring-rose-500/20';
  } else if (elapsed >= 10) {
    timerBadgeColor = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300';
    cardBorderColor = 'border-amber-400';
  }

  const orderNumDisplay = order.orderNumber || formatOrderNumber(order.tableNumber, order.id);

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-2xl border shadow-sm flex flex-col justify-between overflow-hidden transition-all relative ${cardBorderColor}`}
    >
      {/* Header Bar */}
      <div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-extrabold text-base rounded-xl font-display shadow-xs">
              Table #{order.tableNumber || '?'}
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block font-mono">
                {orderNumDisplay}
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatTime(order.createdAt)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-extrabold flex items-center gap-1 shadow-xs ${timerBadgeColor}`}
            >
              {elapsed >= 20 && <AlertTriangle className="w-3 h-3" />}
              {elapsed}m ago
            </span>
          </div>
        </div>

        {/* Current Stage Indicator Banner */}
        <div className="px-4 py-2 bg-slate-100/70 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Stage:</span>
            <StatusBadge status={order.status} />
          </div>

          {/* Quick status dropdown for Kitchen & Waiter */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              title="Change Status"
              className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showStatusMenu && (
              <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-1 z-30 text-xs divide-y divide-slate-100 dark:divide-slate-700">
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Set Status
                </div>
                {['pending', 'preparing', 'ready', 'served', 'cancelled'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(st)}
                    className={`w-full text-left px-3 py-2 text-xs font-semibold capitalize flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-700/60 ${
                      order.status === st
                        ? 'text-brand-600 dark:text-brand-400 font-bold bg-brand-50/50 dark:bg-brand-950/30'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <span>{st === 'ready' ? 'Ready to Serve' : st}</span>
                    {order.status === st && <CheckCircle2 className="w-3.5 h-3.5 text-brand-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Items List */}
        <div className="p-4 divide-y divide-slate-100 dark:divide-slate-800">
          {order.items?.map((item, idx) => (
            <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-3">
              <span className="shrink-0 w-8 h-8 rounded-lg bg-brand-500 text-white font-extrabold text-sm flex items-center justify-center shadow-xs">
                {item.qty}x
              </span>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <DietaryBadge isVeg={item.isVeg} />
                  <span className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {item.name}
                  </span>
                </div>

                {item.notes && (
                  <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-[11px] font-bold text-amber-800 dark:text-amber-300">
                    <FileText className="w-3 h-3 text-amber-500 shrink-0" />
                    <span>Note: {item.notes}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {order.customerNotes && (
          <div className="mx-4 mb-3 p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-bold text-slate-700 dark:text-slate-300">Order Note: </span>
            <span className="text-slate-600 dark:text-slate-400">{order.customerNotes}</span>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="p-4 pt-3 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <button
          onClick={() => onPrint(order)}
          title="Print KOT Receipt"
          className="p-2.5 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors shadow-xs shrink-0"
        >
          <Printer className="w-4 h-4" />
        </button>

        {order.status === 'pending' && (
          <button
            onClick={() => handleStatusChange('preparing')}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <ChefHat className="w-4 h-4" />
                <span>Start Preparing</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        {order.status === 'preparing' && (
          <button
            onClick={() => handleStatusChange('ready')}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-500/25 transition-all disabled:opacity-50"
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Mark Ready to Serve</span>
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        )}

        {order.status === 'ready' && (
          <button
            onClick={() => handleStatusChange('served')}
            disabled={updating}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-purple-500/25 transition-all disabled:opacity-50"
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <UtensilsCrossed className="w-4 h-4" />
                <span>Waiter: Mark Served</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              </>
            )}
          </button>
        )}

        {order.status === 'served' && (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Delivered & Served</span>
          </div>
        )}
      </div>
    </div>
  );
}

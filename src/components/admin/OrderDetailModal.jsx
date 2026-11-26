import React, { useState } from 'react';
import { formatMobile } from '../../utils/phone';
import { Modal } from '../common/Modal';
import { StatusBadge, DietaryBadge } from '../common/Badge';
import { formatCurrency, formatDateTime, formatOrderNumber } from '../../utils/formatters';
import { updateOrderStatus } from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';

export function OrderDetailModal({ isOpen, onClose, order }) {
  const { showToast } = useToast();
  const [updating, setUpdating] = useState(false);

  if (!order) return null;

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    try {
      await updateOrderStatus(order.id, newStatus);
      showToast(`Order status updated to ${newStatus}`, 'success');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const orderNumDisplay = order.orderNumber || formatOrderNumber(order.tableNumber, order.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Order Details - ${orderNumDisplay}`} maxWidth="max-w-xl">
      <div className="space-y-4">
        {/* Top Info Banner */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-500 block">Table Location</span>
            <span className="text-sm font-extrabold text-slate-900 dark:text-white font-display">
              Table #{order.tableNumber || '?'}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-500 block">Guest Mobile</span>
            {order.customerPhone ? (
              <a href={`tel:+91${order.customerPhone}`} className="text-sm font-bold text-brand-600 hover:underline">
                {formatMobile(order.customerPhone)}
              </a>
            ) : (
              <span className="text-xs text-slate-400">Not given</span>
            )}
            {order.customerPhone && (
              <span className="block text-[10px] text-slate-400">{order.phoneVerified ? 'Verified' : 'Not verified'}</span>
            )}
          </div>

          <div>
            <span className="text-xs text-slate-500 block">Order Placed</span>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {formatDateTime(order.createdAt)}
            </span>
          </div>

          <div>
            <span className="text-xs text-slate-500 block mb-0.5">Current Status</span>
            <StatusBadge status={order.status} />
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 border-b border-slate-200 dark:border-slate-700 font-bold">
              <tr>
                <th className="p-3">Item</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-right">Price</th>
                <th className="p-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {order.items?.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-white">
                      <DietaryBadge isVeg={item.isVeg} />
                      <span>{item.name}</span>
                    </div>
                    {item.notes && (
                      <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                        Note: {item.notes}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-center font-extrabold text-slate-800 dark:text-slate-200">
                    {item.qty}
                  </td>
                  <td className="p-3 text-right text-slate-600 dark:text-slate-400">
                    {formatCurrency(item.price)}
                  </td>
                  <td className="p-3 text-right font-bold text-slate-900 dark:text-white">
                    {formatCurrency(item.price * item.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Customer Special Instruction */}
        {order.customerNotes && (
          <div className="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs">
            <span className="font-bold text-amber-800 dark:text-amber-300">Customer Note: </span>
            <span className="text-amber-900 dark:text-amber-200">{order.customerNotes}</span>
          </div>
        )}

        {/* Bill Summary */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(order.subtotal || order.totalAmount)}</span>
          </div>
          {order.taxAmount > 0 && (
            <div className="flex justify-between text-slate-500">
              <span>Taxes & GST</span>
              <span>{formatCurrency(order.taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-700">
            <span>Grand Total</span>
            <span className="text-brand-600 dark:text-brand-400">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Manual Status Override Control */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
            Update Order Status
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['pending', 'preparing', 'ready', 'served'].map((st) => (
              <button
                key={st}
                type="button"
                disabled={updating || order.status === st}
                onClick={() => handleStatusChange(st)}
                className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  order.status === st
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { OrderTimeline } from '../../components/customer/OrderTimeline';
import { CallWaiterModal } from '../../components/customer/CallWaiterModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { DietaryBadge, StatusBadge } from '../../components/common/Badge';
import { subscribeOrder } from '../../services/firestoreService';
import { formatCurrency, formatDateTime, formatOrderNumber } from '../../utils/formatters';
import {
  Sparkles,
  Bell,
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertCircle,
  Receipt,
  ChefHat,
} from 'lucide-react';

export function OrderStatusPage() {
  const { tableId, orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);

  useEffect(() => {
    if (!orderId) return;

    const unsubscribe = subscribeOrder(orderId, (orderData) => {
      setOrder(orderData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar tableId={tableId} />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner text="Connecting to live kitchen order feed..." />
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar tableId={tableId} />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-xl">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold font-display text-slate-900 dark:text-white mb-2">
              Order Not Found
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              We could not find an order with reference "{orderId}".
            </p>
            <Link
              to={`/order/${tableId}`}
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Back to Table Menu</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const orderNumDisplay = order.orderNumber || formatOrderNumber(order.tableNumber, order.id);

  // Status banner styling & messages
  const statusInfo = {
    pending: {
      headline: 'Order Received by Kitchen ⏱️',
      subtext: 'Your order has reached the kitchen and is queued for preparation.',
      gradient: 'from-slate-900 via-slate-800 to-amber-950',
    },
    preparing: {
      headline: 'Chefs are Cooking Your Order 👨‍🍳',
      subtext: 'Your dishes are being prepared fresh by our kitchen team.',
      gradient: 'from-slate-900 via-blue-950 to-slate-900',
    },
    ready: {
      headline: 'Order is Ready to Serve! 🚀',
      subtext: `Plated and hot! Our waiter is delivering to Table #${order.tableNumber || '?'} right now.`,
      gradient: 'from-slate-900 via-emerald-950 to-slate-900',
    },
    served: {
      headline: 'Enjoy Your Delicious Meal! 🍽️',
      subtext: `Your order has been served at Table #${order.tableNumber || '?'}. Bon Appétit!`,
      gradient: 'from-slate-900 via-purple-950 to-slate-900',
    },
    cancelled: {
      headline: 'Order Cancelled ❌',
      subtext: 'This order was cancelled. Please call a waiter for assistance.',
      gradient: 'from-slate-900 via-rose-950 to-slate-900',
    },
  };

  const currentInfo = statusInfo[order.status?.toLowerCase()] || statusInfo.pending;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-900 dark:text-white">
      <Navbar tableId={tableId} tableNumber={order.tableNumber} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        
        {/* Top Live Status Card */}
        <div className={`bg-gradient-to-br ${currentInfo.gradient} rounded-3xl p-6 text-white shadow-xl border border-white/10 transition-all`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-brand-500/30 border border-brand-400/40 text-brand-300 font-extrabold text-xs rounded-full">
                Table #{order.tableNumber || '?'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {orderNumDisplay}
              </span>
            </div>

            <span className="text-xs text-slate-300 font-medium">
              {formatDateTime(order.createdAt)}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold font-display leading-tight mb-2">
            {currentInfo.headline}
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed max-w-lg">
            {currentInfo.subtext}
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setIsWaiterModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold border border-white/20 backdrop-blur-md transition-all"
            >
              <Bell className="w-4 h-4 text-amber-400 animate-bounce-subtle" />
              <span>Call Waiter</span>
            </button>

            <Link
              to={`/order/${tableId || order.tableId}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs font-bold shadow-md shadow-brand-500/25 transition-all"
            >
              <UtensilsCrossed className="w-4 h-4" />
              <span>Order More Dishes</span>
            </Link>
          </div>
        </div>

        {/* Live Timeline Tracker */}
        <OrderTimeline status={order.status} />

        {/* Order Receipt Details */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
            <Receipt className="w-5 h-5 text-brand-500" />
            <h3 className="font-bold text-base font-display text-slate-900 dark:text-white">
              Ordered Items Summary
            </h3>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-3 flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {item.qty}x
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900 dark:text-white">
                      <DietaryBadge isVeg={item.isVeg} />
                      <span>{item.name}</span>
                    </div>
                    {item.notes && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 italic block mt-0.5">
                        Note: {item.notes}
                      </span>
                    )}
                  </div>
                </div>

                <span className="font-bold text-xs text-slate-900 dark:text-white">
                  {formatCurrency(item.price * item.qty)}
                </span>
              </div>
            ))}
          </div>

          {order.customerNotes && (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl text-xs text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-slate-900 dark:text-white">Special Request: </span>
              {order.customerNotes}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{formatCurrency(order.subtotal || order.totalAmount)}</span>
            </div>
            {order.taxAmount > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>GST & Taxes</span>
                <span>{formatCurrency(order.taxAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-extrabold text-slate-900 dark:text-white pt-2 border-t border-slate-100 dark:border-slate-800 font-display">
              <span>Total Paid / Payable</span>
              <span className="text-brand-600 dark:text-brand-400">
                {formatCurrency(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Call Waiter Modal */}
      <CallWaiterModal
        isOpen={isWaiterModalOpen}
        onClose={() => setIsWaiterModalOpen(false)}
        tableId={order.tableId || tableId}
        tableNumber={order.tableNumber}
      />
    </div>
  );
}

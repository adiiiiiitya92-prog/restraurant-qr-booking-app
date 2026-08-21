import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { DietaryBadge } from '../../components/common/Badge';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { formatCurrency } from '../../utils/formatters';
import { createOrder } from '../../services/firestoreService';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  FileText,
  ShoppingBag,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export function CartPage() {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    cartItems,
    tableInfo,
    updateQuantity,
    updateItemNotes,
    removeItem,
    clearCart,
    subtotal,
    taxPercent,
    taxAmount,
    grandTotal,
    totalItems,
  } = useCart();

  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rateLimitCooldown, setRateLimitCooldown] = useState(false);

  const handlePlaceOrder = async () => {
    if (cartItems.length === 0 || isSubmitting || rateLimitCooldown) return;

    setIsSubmitting(true);
    setRateLimitCooldown(true);

    try {
      const orderPayload = {
        tableId: tableId || tableInfo.tableId || 'table_01',
        tableNumber: tableInfo.tableNumber || 1,
        items: cartItems.map((i) => ({
          itemId: i.itemId,
          name: i.name,
          price: i.price,
          qty: i.qty,
          notes: i.notes || '',
          isVeg: i.isVeg ?? true,
        })),
        subtotal,
        taxPercent,
        taxAmount,
        totalAmount: grandTotal,
        customerNotes: customerNotes.trim(),
      };

      const orderId = await createOrder(orderPayload);

      // Trigger festive celebratory confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#f97316', '#ea580c', '#eab308', '#22c55e'],
        });
      } catch (e) {
        // confetti fallback
      }

      showToast('🎉 Order placed successfully! Sending to the kitchen...', 'success');
      clearCart();

      // Redirect to live order tracker
      navigate(`/order/${tableId || 'table_01'}/status/${orderId}`, { replace: true });
    } catch (err) {
      console.error('Order creation error:', err);
      showToast('Could not place order. Please try again or inform staff.', 'error');
      setIsSubmitting(false);
    } finally {
      // 5-second rate limiting cooldown to prevent duplicate clicks
      setTimeout(() => {
        setRateLimitCooldown(false);
      }, 5000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-900 dark:text-white">
      <Navbar tableId={tableId} tableNumber={tableInfo.tableNumber} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        
        {/* Back Link & Header */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to={`/order/${tableId}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Menu</span>
          </Link>

          <span className="text-xs font-extrabold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-3 py-1 rounded-full border border-brand-200 dark:border-brand-800">
            Table #{tableInfo.tableNumber || '?'}
          </span>
        </div>

        {cartItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-display mb-2">
              Your Cart is Empty
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              You haven't added any delicious dishes yet. Scan our menu and satisfy your cravings!
            </p>
            <Link
              to={`/order/${tableId}`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all"
            >
              <Sparkles className="w-4 h-4" />
              <span>Browse Menu</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* Cart Items List */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
              <div className="flex items-center justify-between pb-4">
                <h2 className="text-lg font-extrabold font-display text-slate-900 dark:text-white">
                  Order Summary ({totalItems} items)
                </h2>
                <button
                  onClick={clearCart}
                  className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
                >
                  Clear All
                </button>
              </div>

              {cartItems.map((item) => (
                <div key={item.itemId} className="py-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <DietaryBadge isVeg={item.isVeg} className="mt-1" />
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white font-display">
                          {item.name}
                        </h4>
                        <span className="text-xs font-extrabold text-brand-600 dark:text-brand-400">
                          {formatCurrency(item.price)}
                        </span>
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                      <button
                        onClick={() => updateQuantity(item.itemId, -1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-colors shadow-xs"
                      >
                        {item.qty === 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                      </button>
                      <span className="w-5 text-center font-extrabold text-xs text-slate-900 dark:text-white">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.itemId, 1)}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Special Cooking Note for Item */}
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItemNotes(item.itemId, e.target.value)}
                      placeholder="Add cooking note (e.g. Less spicy, no onions, extra dressing)"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 text-xs focus:ring-1 focus:ring-brand-500 focus:outline-none placeholder:text-slate-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Overall Order Notes */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                Special Instructions for the Kitchen (Optional)
              </label>
              <textarea
                rows="2"
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                placeholder="e.g. Please bring appetizers first, all food at once, celebrating anniversary..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
              />
            </div>

            {/* Bill Breakdown */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm space-y-3">
              <h3 className="text-sm font-extrabold font-display text-slate-900 dark:text-white">
                Payment Breakdown
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Restaurant GST / Taxes ({taxPercent}%)</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-slate-900 dark:text-white pt-3 border-t border-slate-100 dark:border-slate-800 font-display">
                  <span>Total Payable</span>
                  <span className="text-brand-600 dark:text-brand-400">{formatCurrency(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isSubmitting || rateLimitCooldown}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-700 hover:to-amber-600 active:scale-[0.99] text-white font-extrabold text-base shadow-xl shadow-brand-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {isSubmitting
                  ? 'Placing Order...'
                  : rateLimitCooldown
                  ? 'Please wait...'
                  : `Confirm & Place Order (${formatCurrency(grandTotal)})`}
              </span>
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

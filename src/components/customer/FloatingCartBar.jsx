import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/formatters';

export function FloatingCartBar({ tableId }) {
  const { totalItems, grandTotal } = useCart();
  const navigate = useNavigate();

  if (totalItems === 0) return null;

  return (
    <div className="fixed bottom-3 sm:bottom-5 inset-x-3 sm:inset-x-4 max-w-lg mx-auto z-40 animate-slide-up transform-gpu">
      <button
        onClick={() => navigate(`/order/${tableId}/cart`)}
        className="w-full bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-700 hover:to-amber-600 active:scale-[0.98] text-white p-3.5 sm:p-4 rounded-2xl shadow-xl shadow-brand-500/30 flex items-center justify-between transition-all border border-white/25"
      >
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center font-bold text-sm sm:text-base">
            <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="text-left">
            <div className="text-[11px] sm:text-xs font-medium text-amber-100">
              {totalItems} {totalItems === 1 ? 'dish' : 'dishes'} selected
            </div>
            <div className="text-sm sm:text-base font-extrabold font-display leading-tight">
              {formatCurrency(grandTotal)}{' '}
              <span className="text-[10px] sm:text-xs font-normal text-amber-200">(incl. tax)</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 font-bold text-xs sm:text-sm bg-white/20 hover:bg-white/30 backdrop-blur-sm px-3 sm:px-4 py-2 rounded-xl transition-colors">
          <span>View Cart</span>
          <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </div>
      </button>
    </div>
  );
}

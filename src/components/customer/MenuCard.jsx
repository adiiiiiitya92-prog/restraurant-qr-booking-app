import React, { useState, memo } from 'react';
import { Plus, Minus, Flame, Clock } from 'lucide-react';
import { DietaryBadge } from '../common/Badge';
import { formatCurrency } from '../../utils/formatters';
import { useCart } from '../../context/CartContext';
import { optimizedImageUrl } from '../../services/cloudinary';

function MenuCardComponent({ item }) {
  const { addItem, updateQuantity, getItemQuantity } = useCart();
  const quantity = getItemQuantity(item.id);
  const [imgError, setImgError] = useState(false);

  const handleAdd = () => {
    addItem(item, 1);
  };

  const handleIncrement = () => {
    updateQuantity(item.id, 1);
  };

  const handleDecrement = () => {
    updateQuantity(item.id, -1);
  };

  return (
    <div
      className={`group relative bg-white dark:bg-slate-900 rounded-2xl border transition-all duration-200 overflow-hidden flex flex-col justify-between ${
        item.isAvailable === false
          ? 'opacity-60 border-slate-200 dark:border-slate-800'
          : 'border-slate-200/80 dark:border-slate-800 hover:border-brand-500/40 hover:shadow-md'
      }`}
    >
      {/* Top Media & Tags */}
      <div>
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          <img
            src={
              imgError || !item.imageUrl
                ? 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                : optimizedImageUrl(item.imageUrl, 600)
            }
            alt={item.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 will-change-transform"
            loading="lazy"
            decoding="async"
          />

          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-2 py-0.5 rounded-lg shadow-xs">
            <DietaryBadge isVeg={item.isVeg} />
            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              {item.isVeg ? 'Veg' : 'Non-Veg'}
            </span>
          </div>

          {item.prepTime && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-2 py-0.5 rounded-md text-[10px] font-medium">
              <Clock className="w-3 h-3 text-amber-400" />
              <span>{item.prepTime}</span>
            </div>
          )}

          {item.isAvailable === false && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] flex items-center justify-center">
              <span className="px-3 py-1 bg-rose-600 text-white text-xs font-extrabold uppercase tracking-wider rounded-full shadow-lg">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-3.5 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-slate-900 dark:text-white font-display text-sm sm:text-base leading-snug">
              {item.name}
            </h3>
            {item.spicyLevel > 0 && (
              <div className="flex items-center text-rose-500 shrink-0" title={`Spicy Level: ${item.spicyLevel}`}>
                {Array.from({ length: Math.min(item.spicyLevel, 3) }).map((_, i) => (
                  <Flame key={i} className="w-3.5 h-3.5 fill-rose-500" />
                ))}
              </div>
            )}
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-2">
            {item.description}
          </p>
        </div>
      </div>

      {/* Price & Quantity Controls */}
      <div className="p-3.5 sm:p-4 pt-0 flex items-center justify-between mt-auto">
        <div>
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium block">Price</span>
          <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-display">
            {formatCurrency(item.price)}
          </span>
        </div>

        {item.isAvailable !== false && (
          <div>
            {quantity === 0 ? (
              <button
                onClick={handleAdd}
                className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ADD</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-brand-50 dark:bg-brand-950/60 border border-brand-300 dark:border-brand-800 rounded-xl p-1 shadow-xs">
                <button
                  onClick={handleDecrement}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors shadow-xs"
                >
                  <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
                <span className="w-4 sm:w-5 text-center font-extrabold text-xs sm:text-sm text-brand-700 dark:text-brand-300">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrement}
                  className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 flex items-center justify-center hover:bg-brand-500 hover:text-white transition-colors shadow-xs"
                >
                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const MenuCard = memo(MenuCardComponent);

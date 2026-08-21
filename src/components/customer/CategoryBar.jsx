import React from 'react';

export function CategoryBar({
  categories,
  selectedCategory,
  onSelectCategory,
  vegFilter,
  onToggleVegFilter,
}) {
  return (
    <div className="sticky top-16 z-30 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur-md py-3 border-b border-slate-200/80 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          
          {/* Scrollable Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => onSelectCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-200 shadow-xs ${
                    isSelected
                      ? 'bg-brand-500 text-white shadow-md shadow-brand-500/25 scale-[1.02]'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          {/* Veg Only Quick Switcher */}
          <div className="shrink-0 flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={() => onToggleVegFilter(!vegFilter)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                vegFilter
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/25'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${vegFilter ? 'bg-white' : 'bg-emerald-500'}`} />
              <span>Veg Only</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

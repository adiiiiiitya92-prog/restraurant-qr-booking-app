import React from 'react';

export function StatCard({ title, value, icon: Icon, color = 'brand', subtext = null }) {
  const colorMap = {
    brand: 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border-brand-500/20',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  };

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </p>
        <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white font-display mt-1">
          {value}
        </h3>
        {subtext && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{subtext}</p>
        )}
      </div>

      <div className={`p-3 rounded-xl border ${colorMap[color] || colorMap.brand}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}

import React from 'react';

export function StatusBadge({ status, className = '' }) {
  const normalized = (status || 'pending').toLowerCase();

  switch (normalized) {
    case 'pending':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          Pending
        </span>
      );
    case 'preparing':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></span>
          Preparing
        </span>
      );
    case 'ready':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          Ready to Serve
        </span>
      );
    case 'served':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
          Served
        </span>
      );
    case 'cancelled':
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800 ${className}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          Cancelled
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 ${className}`}>
          {status}
        </span>
      );
  }
}

export function DietaryBadge({ isVeg, className = '' }) {
  if (isVeg) {
    return (
      <span
        title="Vegetarian"
        className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border border-emerald-600 p-0.5 ${className}`}
      >
        <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
      </span>
    );
  }
  return (
    <span
      title="Non-Vegetarian"
      className={`inline-flex items-center justify-center w-4 h-4 rounded-sm border border-rose-600 p-0.5 ${className}`}
    >
      <span className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-rose-600"></span>
    </span>
  );
}

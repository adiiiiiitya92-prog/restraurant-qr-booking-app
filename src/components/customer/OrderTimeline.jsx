import React from 'react';
import { Check, Clock, ChefHat, Sparkles, CheckCircle2, XCircle } from 'lucide-react';

const STEPS = [
  { id: 'pending', label: 'Order Received', desc: 'Sent to the kitchen queue', icon: Clock },
  { id: 'preparing', label: 'In the Kitchen', desc: 'Chefs are cooking your meal', icon: ChefHat },
  { id: 'ready', label: 'Ready to Serve', desc: 'Plated & heading to your table', icon: Sparkles },
  { id: 'served', label: 'Served', desc: 'Enjoy your meal!', icon: CheckCircle2 },
];

export function OrderTimeline({ status }) {
  const normalized = (status || 'pending').toLowerCase();
  
  if (normalized === 'cancelled') {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-rose-200 dark:border-rose-900/60 p-5 shadow-sm">
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <XCircle className="w-6 h-6 shrink-0" />
          <div>
            <h4 className="text-sm font-bold font-display">Order Cancelled</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              This order was cancelled. Please speak with your waiter or manager.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getStepIndex = (st) => {
    switch (st) {
      case 'pending':
        return 0;
      case 'preparing':
        return 1;
      case 'ready':
        return 2;
      case 'served':
        return 3;
      default:
        return 0;
    }
  };

  const currentIndex = getStepIndex(normalized);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6">
        Live Preparation Status
      </h4>

      <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isDone = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isFuture = idx > currentIndex;

          let circleClass = 'bg-slate-100 text-slate-400 border-slate-300 dark:bg-slate-800 dark:text-slate-600 dark:border-slate-700';
          if (isDone) {
            circleClass = 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20';
          } else if (isCurrent) {
            circleClass = 'bg-brand-500 text-white border-brand-500 ring-4 ring-brand-500/20 shadow-md shadow-brand-500/30 animate-pulse-subtle';
          }

          return (
            <div key={step.id} className="relative flex items-start gap-4 group">
              {/* Step indicator dot */}
              <div
                className={`absolute -left-6 top-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${circleClass}`}
              >
                {isDone ? <Check className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
              </div>

              {/* Step content */}
              <div className="min-w-0">
                <p
                  className={`text-sm font-bold leading-none mb-1 ${
                    isCurrent
                      ? 'text-brand-600 dark:text-brand-400 font-display'
                      : isDone
                      ? 'text-slate-800 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {step.label}
                  {isCurrent && (
                    <span className="inline-block ml-2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-brand-300 rounded-full">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

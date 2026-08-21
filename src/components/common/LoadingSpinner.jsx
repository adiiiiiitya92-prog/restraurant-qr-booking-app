import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ text = 'Loading...', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      <Loader2 className="w-8 h-8 text-brand-500 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-500">{text}</p>
    </div>
  );
}

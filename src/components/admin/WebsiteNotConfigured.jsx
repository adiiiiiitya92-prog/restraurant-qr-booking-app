import React from 'react';
import { Globe } from 'lucide-react';

// Shown on the website pages until the website's Firebase keys are added.
export function WebsiteNotConfigured({ message }) {
  return (
    <div className="bg-paper border border-slate-200 p-8 max-w-2xl mx-auto">
      <Globe className="w-10 h-10 text-amber-600 mb-3" />
      <h2 className="text-2xl font-display mb-2">Connect the Junio 8 website</h2>
      <p className="text-sm text-slate-600 mb-4">
        To see website bookings, enquiries and settings here, add the website's Firebase service account to this app.
        Copy these three values from the website's <code className="font-mono">.env</code> (D:\junio8foxwebsite\.env):
      </p>
      <pre className="bg-slate-950 text-slate-50 text-xs p-4 overflow-x-auto mb-4">{`WEBSITE_FIREBASE_PROJECT_ID=   ← website's FIREBASE_PROJECT_ID
WEBSITE_FIREBASE_CLIENT_EMAIL= ← website's FIREBASE_CLIENT_EMAIL
WEBSITE_FIREBASE_PRIVATE_KEY=  ← website's FIREBASE_PRIVATE_KEY (keep the quotes)`}</pre>
      <p className="text-sm text-slate-600">
        Put them in this app's <code className="font-mono">.env</code> (then restart <code className="font-mono">npm run dev</code>) and in
        Vercel → Project → Settings → Environment Variables (then redeploy).
      </p>
      {message && <p className="text-xs text-slate-500 mt-4">Server said: {message}</p>}
    </div>
  );
}

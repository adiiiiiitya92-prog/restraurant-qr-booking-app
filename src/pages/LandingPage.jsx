import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { subscribeTables } from '../services/firestoreService';
import {
  ChefHat,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { BRAND } from '../config/brand';

export function LandingPage() {
  const [tables, setTables] = useState([]);
  const restaurantName = BRAND.name;

  useEffect(() => {
    const unsubscribe = subscribeTables(setTables);
    return () => unsubscribe();
  }, []);

  // Staff see a "Customer Menu" shortcut to the first table. Guests can't list
  // tables (that would reveal every QR link), so for them the button is hidden.
  const currentTableObj = tables[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 selection:bg-brand-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-14 pb-20 px-4 sm:px-6 lg:px-8 bg-slate-300">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <img
            src="/brand/junio8-wordmark.webp"
            alt={restaurantName}
            width="1428"
            height="485"
            className="mx-auto mb-10 w-64 sm:w-96 h-auto"
          />

          <div className="inline-flex items-center gap-2 text-amber-800 text-[11px] uppercase tracking-[0.35em] mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>QR Table Ordering &amp; Kitchen Display</span>
          </div>

          <h1 className="text-5xl sm:text-7xl font-display leading-[1.02] max-w-4xl mx-auto">
            Scan. Order. <em className="italic text-amber-800">Sip.</em>
          </h1>

          <p className="mt-5 text-base sm:text-lg font-light text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Guests scan the QR on their table, browse the menu and order without an app or a login. The kitchen and counter see every order instantly.
          </p>

          {/* Quick Demo Action Buttons */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            {currentTableObj && (
              <Link
                to={`/order/${currentTableObj.id}`}
                className="flex items-center gap-2 px-6 py-4 bg-slate-950 hover:bg-brand-600 active:scale-95 text-slate-50 text-[11px] uppercase tracking-[0.25em] transition-colors"
              >
                <Smartphone className="w-4 h-4" />
                <span>Customer Menu · Table {currentTableObj.tableNumber}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}

            <Link
              to="/kitchen"
              className="flex items-center gap-2 px-6 py-4 border border-slate-950 hover:bg-slate-950 hover:text-slate-50 text-slate-950 text-[11px] uppercase tracking-[0.25em] transition-colors"
            >
              <ChefHat className="w-4 h-4" />
              <span>Kitchen Display</span>
            </Link>

            <Link
              to="/admin"
              className="flex items-center gap-2 px-6 py-4 border border-slate-950 hover:bg-slate-950 hover:text-slate-50 text-slate-950 text-[11px] uppercase tracking-[0.25em] transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 bg-slate-950 text-slate-50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-50/10">
          <div className="bg-slate-950 p-7">
            <div className="w-12 h-12 rounded-full border border-slate-50/15 text-brand-400 flex items-center justify-center mb-5">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-display mb-2">No login for guests</h3>
            <p className="text-sm font-light text-slate-50/70 leading-relaxed">
              Guests scan and see the menu by category, add notes for the kitchen and send their order straight to the queue.
            </p>
          </div>

          <div className="bg-slate-950 p-7">
            <div className="w-12 h-12 rounded-full border border-slate-50/15 text-brand-400 flex items-center justify-center mb-5">
              <ChefHat className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-display mb-2">Live kitchen display</h3>
            <p className="text-sm font-light text-slate-50/70 leading-relaxed">
              Orders appear instantly with a chime, preparation timers, item notes and KOT slip printing.
            </p>
          </div>

          <div className="bg-slate-950 p-7">
            <div className="w-12 h-12 rounded-full border border-slate-50/15 text-brand-400 flex items-center justify-center mb-5">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-2xl font-display mb-2">Runs on Firebase</h3>
            <p className="text-sm font-light text-slate-50/70 leading-relaxed">
              No server to look after. Works as an installable app and keeps the menu cached for patchy Wi-Fi.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 flex flex-col items-center gap-5 text-center">
        <img src="/brand/junio8-wordmark.webp" alt="" width="1428" height="485" className="w-48 h-auto" />
        <p className="text-xs tracking-[0.2em] text-slate-500">© {new Date().getFullYear()} {restaurantName}</p>
      </footer>
    </div>
  );
}

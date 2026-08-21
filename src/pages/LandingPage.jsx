import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/common/Navbar';
import { QRCodeCanvas } from 'qrcode.react';
import { subscribeTables, seedFirestoreDatabase } from '../services/firestoreService';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  QrCode,
  UtensilsCrossed,
  ChefHat,
  ShieldCheck,
  Smartphone,
  Sparkles,
  ArrowRight,
  Flame,
  CheckCircle2,
  Zap,
} from 'lucide-react';

export function LandingPage() {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState('table_01');
  const [seeding, setSeeding] = useState(false);
  const { showToast } = useToast();
  const { isFirebaseConfigured } = useAuth();
  const navigate = useNavigate();

  const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'Gourmet Bistro & Bar';

  useEffect(() => {
    const unsubscribe = subscribeTables((data) => {
      setTables(data);
      if (data.length > 0 && !data.some((t) => t.id === selectedTable)) {
        setSelectedTable(data[0].id);
      }
    });
    return () => unsubscribe();
  }, [selectedTable]);

  const handleSeedData = async () => {
    setSeeding(true);
    try {
      const res = await seedFirestoreDatabase();
      showToast('✨ Initial sample menu dishes & tables loaded!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Could not load sample data', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const currentTableObj = tables.find((t) => t.id === selectedTable) || tables[0];
  const orderUrl = `${window.location.origin}/order/${currentTableObj?.id || 'table_01'}`;

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-brand-500 selection:text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4 sm:px-6 lg:px-8">
        
        {/* Background decorative gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-brand-500/15 via-amber-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto text-center relative z-10">
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-extrabold uppercase tracking-wider mb-6 animate-pulse-subtle">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>Serverless QR Code Table Ordering & Kitchen Display</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold font-display tracking-tight leading-tight max-w-4xl mx-auto">
            Scan. Order. Eat. <br />
            <span className="bg-gradient-to-r from-brand-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Real-Time Restaurant Experience
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Contactless dining made effortless. Customers scan table QR codes to browse the menu and order without downloading an app or logging in. Kitchen and admin staff receive orders instantly.
          </p>

          {/* Quick Demo Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`/order/${currentTableObj?.id || 'table_01'}`}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-amber-500 hover:from-brand-600 hover:to-amber-600 active:scale-95 text-white font-extrabold text-sm shadow-xl shadow-brand-500/25 transition-all"
            >
              <Smartphone className="w-4 h-4" />
              <span>Simulate Customer Order (Table #{currentTableObj?.tableNumber || 1})</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/kitchen"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 font-bold text-sm transition-all"
            >
              <ChefHat className="w-4 h-4" />
              <span>Open Kitchen Live KDS</span>
            </Link>

            <Link
              to="/admin"
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm transition-all"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Dashboard</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive QR Simulation Section */}
      <section className="py-12 bg-slate-900/60 border-y border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-extrabold font-display">
              Interactive Table QR Scanner Simulation
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Select any table below to generate its live QR code and simulate a guest sitting at that table.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            
            {/* Table Selection List */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Available Tables ({tables.length})
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tables.map((t) => {
                  const isSelected = selectedTable === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTable(t.id)}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-brand-950 to-slate-900 border-brand-500 ring-2 ring-brand-500/20'
                          : 'bg-slate-900/90 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-sm font-display ${
                            isSelected ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          #{t.tableNumber}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-white">{t.name || `Table ${t.tableNumber}`}</h4>
                          <span className="text-[11px] text-slate-400">
                            {t.capacity || 4} Guests • {t.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-brand-500 text-white">
                            Selected
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live QR Preview Box */}
            <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-center shadow-xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 text-brand-400 text-xs font-bold mb-4">
                <QrCode className="w-3.5 h-3.5" />
                <span>Table #{currentTableObj?.tableNumber || 1} QR Code</span>
              </div>

              <div className="p-4 bg-white rounded-2xl inline-block shadow-lg my-2">
                <QRCodeCanvas
                  value={orderUrl}
                  size={160}
                  level="H"
                  includeMargin={true}
                />
              </div>

              <p className="text-xs font-mono text-slate-400 mt-3 truncate">
                {orderUrl}
              </p>

              <Link
                to={`/order/${currentTableObj?.id || 'table_01'}`}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-md transition-all"
              >
                <span>Launch Table #{currentTableObj?.tableNumber} Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights Grid */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mb-4">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base font-display text-white mb-2">
              Zero Login for Customers
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Customers scan and immediately view categorized dishes, customize spice levels and cooking notes, and place orders directly into the kitchen queue.
            </p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4">
              <ChefHat className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base font-display text-white mb-2">
              Live Kitchen Display (KDS)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Real-time Firestore sync with audible chime notifications, elapsed preparation timers, item-level notes, and thermal KOT receipt printing.
            </p>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base font-display text-white mb-2">
              Serverless & Netlify Ready
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              100% client + Firebase architecture with strict Firestore Security Rules, PWA offline caching, and static single-page application deployment.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 px-4 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} {restaurantName}. Serverless QR Table Ordering System.</p>
      </footer>
    </div>
  );
}

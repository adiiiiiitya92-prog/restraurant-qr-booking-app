import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { KitchenOrderCard } from '../../components/kitchen/KitchenOrderCard';
import { WaiterCallBanner } from '../../components/kitchen/WaiterCallBanner';
import { KOTPrintSlip } from '../../components/kitchen/KOTPrintSlip';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { subscribeAllOrders, subscribeActiveWaiterCalls } from '../../services/firestoreService';
import { useSoundAlert } from '../../hooks/useSoundAlert';
import { useToast } from '../../context/ToastContext';
import {
  ChefHat,
  Volume2,
  VolumeX,
  Sparkles,
  Flame,
  CheckCircle2,
  Clock,
  Filter,
  UtensilsCrossed,
  BellRing,
} from 'lucide-react';

export function KitchenDashboard() {
  const { showToast } = useToast();
  const { playNewOrderChime, playWaiterCallChime } = useSoundAlert();

  const [allOrders, setAllOrders] = useState([]);
  const [waiterCalls, setWaiterCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'pending' | 'preparing' | 'ready' | 'served' | 'all'
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [printOrder, setPrintOrder] = useState(null);

  // Track previous order counts to trigger sound chimes
  const prevOrderCountRef = useRef(0);
  const prevReadyCountRef = useRef(0);
  const prevCallCountRef = useRef(0);

  // 1. Subscribe to All Orders in Real-Time
  useEffect(() => {
    const unsubscribe = subscribeAllOrders((ordersData) => {
      const activeCount = ordersData.filter((o) =>
        ['pending', 'preparing', 'ready'].includes((o.status || '').toLowerCase())
      ).length;
      const readyCount = ordersData.filter((o) => (o.status || '').toLowerCase() === 'ready').length;

      // Play chime when new order arrives
      if (activeCount > prevOrderCountRef.current && prevOrderCountRef.current !== 0) {
        if (soundEnabled) {
          playNewOrderChime();
        }
        showToast('🔔 New kitchen order arrived!', 'info');
      }

      // Play chime when order becomes ready for waiter
      if (readyCount > prevReadyCountRef.current && prevReadyCountRef.current !== 0) {
        if (soundEnabled) {
          playWaiterCallChime();
        }
        showToast('🍽️ Food is ready for table pickup!', 'success');
      }

      prevOrderCountRef.current = activeCount;
      prevReadyCountRef.current = readyCount;
      setAllOrders(ordersData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [soundEnabled, playNewOrderChime, playWaiterCallChime, showToast]);

  // 2. Subscribe to Waiter Calls
  useEffect(() => {
    const unsubscribe = subscribeActiveWaiterCalls((calls) => {
      if (calls.length > prevCallCountRef.current && prevCallCountRef.current !== 0) {
        if (soundEnabled) {
          playWaiterCallChime();
        }
        showToast('🔔 Waiter assistance requested at a table!', 'warning');
      }
      prevCallCountRef.current = calls.length;
      setWaiterCalls(calls);
    });

    return () => unsubscribe();
  }, [soundEnabled, playWaiterCallChime, showToast]);

  const handlePrintKOT = (order) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Filtered orders list
  const filteredOrders = allOrders.filter((o) => {
    const st = (o.status || '').toLowerCase();
    if (statusFilter === 'active') return ['pending', 'preparing', 'ready'].includes(st);
    if (statusFilter === 'all') return true;
    return st === statusFilter;
  });

  const pendingCount = allOrders.filter((o) => (o.status || '').toLowerCase() === 'pending').length;
  const preparingCount = allOrders.filter((o) => (o.status || '').toLowerCase() === 'preparing').length;
  const readyCount = allOrders.filter((o) => (o.status || '').toLowerCase() === 'ready').length;
  const servedCount = allOrders.filter((o) => (o.status || '').toLowerCase() === 'served').length;
  const activeCount = pendingCount + preparingCount + readyCount;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950 pb-20 selection:bg-brand-500 selection:text-white">
      <Navbar />

      {/* Hidden print area for 80mm thermal receipt KOT */}
      <KOTPrintSlip order={printOrder} />

      {/* Top KDS Control Bar */}
      <div className="bg-paper border-b border-slate-200 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-950 text-brand-400 flex items-center justify-center">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-display text-slate-950">
                  Kitchen Live Display (KDS) & Waiter Station
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                  LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-slate-600">
                {activeCount} active {activeCount === 1 ? 'order' : 'orders'} in kitchen • {readyCount} ready for waiter delivery
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center bg-slate-100 p-1 border border-slate-200 text-xs font-medium gap-1">
              <button
                onClick={() => setStatusFilter('active')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'active'
                    ? 'bg-slate-950 text-slate-50 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('pending')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'pending'
                    ? 'bg-slate-950 text-slate-50 shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setStatusFilter('preparing')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'preparing'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Cooking ({preparingCount})
              </button>
              <button
                onClick={() => setStatusFilter('ready')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'ready'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-emerald-700 hover:text-emerald-900'
                }`}
              >
                Ready to Serve ({readyCount})
              </button>
              <button
                onClick={() => setStatusFilter('served')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'served'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                Served ({servedCount})
              </button>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              title={soundEnabled ? 'Mute Kitchen Alerts' : 'Unmute Kitchen Alerts'}
              className={`p-2.5 rounded-xl border transition-colors ${
                soundEnabled
                  ? 'bg-slate-950 border-slate-950 text-brand-400 hover:bg-slate-800'
                  : 'bg-paper border-slate-200 text-slate-500 hover:bg-slate-100'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Active Waiter Calls Alert */}
        <WaiterCallBanner calls={waiterCalls} />

        {/* Ready to Serve Alert Callout for Waiters */}
        {readyCount > 0 && statusFilter !== 'ready' && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <UtensilsCrossed className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-sm text-emerald-900">
                  {readyCount} {readyCount === 1 ? 'Order' : 'Orders'} Ready to Serve!
                </span>
                <span className="text-xs text-emerald-700 block">
                  Food is plated & ready for waiter delivery to tables.
                </span>
              </div>
            </div>
            <button
              onClick={() => setStatusFilter('ready')}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
            >
              View Ready Orders
            </button>
          </div>
        )}

        {loading ? (
          <LoadingSpinner text="Connecting to live kitchen feed..." className="py-24" />
        ) : filteredOrders.length === 0 ? (
          <div className="bg-paper border border-slate-200 p-16 text-center max-w-xl mx-auto mt-8">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-3xl font-display text-slate-950 mb-2">
              {statusFilter === 'ready'
                ? 'No Orders Waiting for Waiter'
                : statusFilter === 'served'
                ? 'No Completed Orders Yet'
                : 'All Orders Clear!'}
            </h2>
            <p className="text-sm font-light text-slate-600 leading-relaxed max-w-sm mx-auto">
              {statusFilter === 'active' || statusFilter === 'all'
                ? 'There are no active orders in the kitchen right now. As soon as a customer orders from their table, it will chime and appear here instantly.'
                : `No orders currently matching the "${statusFilter}" filter.`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredOrders.map((order) => (
              <KitchenOrderCard key={order.id} order={order} onPrint={handlePrintKOT} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

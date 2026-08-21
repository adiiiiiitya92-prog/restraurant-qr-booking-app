import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { StatCard } from '../../components/admin/StatCard';
import { StatusBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { subscribeAllOrders, subscribeTables, subscribeMenuItems } from '../../services/firestoreService';
import { formatCurrency, formatDateTime, formatOrderNumber } from '../../utils/formatters';
import {
  ShoppingBag,
  TrendingUp,
  QrCode,
  UtensilsCrossed,
  ChefHat,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export function AdminDashboard() {
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubOrders = subscribeAllOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    const unsubTables = subscribeTables((data) => setTables(data));
    const unsubMenu = subscribeMenuItems((data) => setMenuItems(data));

    return () => {
      try { unsubOrders?.(); } catch {}
      try { unsubTables?.(); } catch {}
      try { unsubMenu?.(); } catch {}
    };
  }, []);

  // Compute Metrics
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0);
    const activeTablesCount = tables.filter((t) => t.isActive).length;
    const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    // Popular Items calculation
    const itemCounts = {};
    orders.forEach((o) => {
      o.items?.forEach((item) => {
        itemCounts[item.name] = (itemCounts[item.name] || 0) + (item.qty || 1);
      });
    });

    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalOrders,
      totalRevenue,
      activeTablesCount,
      avgOrderValue,
      popularItems,
    };
  }, [orders, tables]);

  const recentOrders = orders.slice(0, 6);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-900 dark:text-white">
      <Navbar />

      <AdminHeader
        title="Restaurant Analytics & Overview"
        subtitle="Real-time performance summary, revenue metrics, and active orders"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                try {
                  const res = await seedFirestoreDatabase();
                  showToast(`✨ Successfully seeded ${res.items || 12} menu items and ${res.tables || 6} tables to Firestore!`, 'success');
                } catch (err) {
                  console.error(err);
                  showToast(`Firestore write failed: ${err.message || 'Permission denied. Check Firebase Console Rules.'}`, 'error');
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-brand-500/30 bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/60 text-brand-700 dark:text-brand-300 font-bold text-xs transition-all shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-brand-500" />
              <span>Sync Sample Menu to Firestore</span>
            </button>

            <Link
              to="/kitchen"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs shadow-md shadow-amber-500/20 transition-all"
            >
              <ChefHat className="w-4 h-4" />
              <span>Open Kitchen Live KDS</span>
            </Link>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        {loading ? (
          <LoadingSpinner text="Computing restaurant metrics..." className="py-20" />
        ) : (
          <>
            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard
                title="Total Revenue"
                value={formatCurrency(metrics.totalRevenue)}
                icon={TrendingUp}
                color="emerald"
                subtext="Gross sales generated"
              />
              <StatCard
                title="Total Orders Placed"
                value={metrics.totalOrders}
                icon={ShoppingBag}
                color="brand"
                subtext="Across all tables"
              />
              <StatCard
                title="Active Tables"
                value={`${metrics.activeTablesCount} / ${tables.length}`}
                icon={QrCode}
                color="blue"
                subtext="Ready for QR ordering"
              />
              <StatCard
                title="Avg. Order Value"
                value={formatCurrency(metrics.avgOrderValue)}
                icon={Sparkles}
                color="purple"
                subtext="Per table ticket"
              />
            </div>

            {/* Two Column Layout: Recent Orders & Top Selling Items */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Recent Orders Stream (2 cols) */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                  <div>
                    <h3 className="text-base font-extrabold font-display text-slate-900 dark:text-white">
                      Recent Orders
                    </h3>
                    <p className="text-xs text-slate-500">Live order feed from table QR codes</p>
                  </div>

                  <Link
                    to="/admin/orders"
                    className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
                  >
                    <span>View All Orders</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {recentOrders.length === 0 ? (
                  <div className="text-center py-12 text-slate-400 text-xs">
                    No orders placed yet. Place a test order from any table!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {recentOrders.map((order) => (
                      <div
                        key={order.id}
                        className="py-3.5 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-extrabold text-xs flex items-center justify-center font-display shrink-0">
                            T#{order.tableNumber || '?'}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-xs text-slate-900 dark:text-white">
                                {order.orderNumber || formatOrderNumber(order.tableNumber, order.id)}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                ({order.items?.length || 0} items)
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {formatDateTime(order.createdAt)}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white font-display">
                            {formatCurrency(order.totalAmount)}
                          </span>
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Popular Items (1 col) */}
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-4">
                    <h3 className="text-base font-extrabold font-display text-slate-900 dark:text-white">
                      Top Selling Dishes
                    </h3>
                    <UtensilsCrossed className="w-4 h-4 text-brand-500" />
                  </div>

                  {metrics.popularItems.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Popular dishes will rank here as customers order.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {metrics.popularItems.map((item, idx) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-brand-500/10 text-brand-600 font-extrabold text-xs flex items-center justify-center">
                              #{idx + 1}
                            </span>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                              {item.name}
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                            {item.count} sold
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    to="/admin/menu"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold transition-all"
                  >
                    <span>Manage Full Menu ({menuItems.length} items)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

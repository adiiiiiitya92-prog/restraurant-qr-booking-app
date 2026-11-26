import React, { useState, useEffect } from 'react';
import { formatMobile } from '../../utils/phone';
import { Navbar } from '../../components/common/Navbar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { OrderDetailModal } from '../../components/admin/OrderDetailModal';
import { StatusBadge, DietaryBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { subscribeAllOrders, updateOrderStatus } from '../../services/firestoreService';
import { formatCurrency, formatDateTime, formatOrderNumber } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import {
  Search,
  Filter,
  Eye,
  ListOrdered,
  Calendar,
  Clock,
  QrCode,
  CheckCircle2,
} from 'lucide-react';

export function AdminOrders() {
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTable, setSelectedTable] = useState('all');
  const [activeModalOrder, setActiveModalOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeAllOrders((data) => {
      setOrders(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleQuickStatusChange = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
      showToast(`Order status updated to "${newStatus}"`, 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to update status', 'error');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Get unique tables from orders for table filter
  const tableNumbers = Array.from(
    new Set(orders.map((o) => o.tableNumber).filter(Boolean))
  ).sort((a, b) => a - b);

  // Filtered list
  const filteredOrders = orders.filter((order) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesTable =
      selectedTable === 'all' || String(order.tableNumber) === String(selectedTable);
    const orderNum = order.orderNumber || formatOrderNumber(order.tableNumber, order.id);
    const matchesSearch =
      !searchQuery.trim() ||
      orderNum.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customerPhone && searchQuery.replace(/\D/g, '').length >= 3 && order.customerPhone.includes(searchQuery.replace(/\D/g, ''))) ||
      order.items?.some((item) => item.name?.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesTable && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-900 dark:text-white">
      <Navbar />

      <AdminHeader
        title="Live Orders & History"
        subtitle="Track real-time table orders, update fulfillment statuses, and review order receipts"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, mobile number or item..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="all">All Statuses ({orders.length})</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready to Serve</option>
              <option value="served">Served</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Table Filter */}
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="all">All Tables</option>
              {tableNumbers.map((num) => (
                <option key={num} value={num}>
                  Table #{num}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Orders Table */}
        {loading ? (
          <LoadingSpinner text="Retrieving orders..." className="py-20" />
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto">
            <ListOrdered className="w-12 h-12 text-brand-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-1">
              No Orders Found
            </h3>
            <p className="text-xs text-slate-500">
              No orders match the selected filters or search keyword.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-4">Order Reference</th>
                    <th className="p-4">Table</th>
                    <th className="p-4">Items Summary</th>
                    <th className="p-4">Time</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status & Action</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOrders.map((order) => {
                    const orderNumDisplay =
                      order.orderNumber || formatOrderNumber(order.tableNumber, order.id);
                    return (
                      <tr
                        key={order.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="p-4">
                          <span className="font-extrabold font-mono text-slate-900 dark:text-white">
                            {orderNumDisplay}
                          </span>
                        </td>

                        <td className="p-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200">
                            <QrCode className="w-3 h-3 text-brand-500" />
                            Table #{order.tableNumber || '?'}
                          </span>
                          {order.customerPhone && (
                            <a href={`tel:+91${order.customerPhone}`} className="block mt-1 text-[11px] text-slate-500 hover:text-brand-600">
                              📞 {formatMobile(order.customerPhone)}
                            </a>
                          )}
                        </td>

                        <td className="p-4">
                          <div className="space-y-0.5 max-w-xs">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-1.5 truncate">
                                <span className="font-extrabold text-brand-600 dark:text-brand-400">
                                  {item.qty}x
                                </span>
                                <span className="text-slate-800 dark:text-slate-200 truncate">
                                  {item.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="p-4 text-slate-500 dark:text-slate-400">
                          {formatDateTime(order.createdAt)}
                        </td>

                        <td className="p-4 font-extrabold text-slate-900 dark:text-white font-display">
                          {formatCurrency(order.totalAmount)}
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <select
                              value={order.status || 'pending'}
                              disabled={updatingOrderId === order.id}
                              onChange={(e) => handleQuickStatusChange(order.id, e.target.value)}
                              className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-brand-500 focus:outline-none capitalize disabled:opacity-50"
                            >
                              <option value="pending">Pending</option>
                              <option value="preparing">Preparing</option>
                              <option value="ready">Ready to Serve</option>
                              <option value="served">Served</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          <button
                            onClick={() => setActiveModalOrder(order)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-xs transition-colors shadow-xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Order Details Modal */}
      <OrderDetailModal
        isOpen={Boolean(activeModalOrder)}
        onClose={() => setActiveModalOrder(null)}
        order={activeModalOrder}
      />
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { TableQRCard } from '../../components/admin/TableQRCard';
import { Modal } from '../../components/common/Modal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  subscribeTables,
  addTable,
  updateTable,
  deleteTable,
} from '../../services/firestoreService';
import { useToast } from '../../context/ToastContext';
import { Plus, Printer, QrCode, Sparkles } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';

export function AdminTables() {
  const { showToast } = useToast();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Table Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [newCapacity, setNewCapacity] = useState(4);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeTables((data) => {
      setTables(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenAddModal = () => {
    // Auto-calculate next table number
    const maxNum = tables.reduce((max, t) => Math.max(max, Number(t.tableNumber) || 0), 0);
    const nextNum = maxNum + 1;
    setNewTableNumber(nextNum);
    setNewTableName(`Table ${nextNum}`);
    setNewCapacity(4);
    setIsAddModalOpen(true);
  };

  const handleAddTableSubmit = async (e) => {
    e.preventDefault();
    if (!newTableNumber) return;

    setSaving(true);
    try {
      const num = Number(newTableNumber);
      const customId = `table_${String(num).padStart(2, '0')}`;

      // Check if table number already exists
      if (tables.some((t) => Number(t.tableNumber) === num)) {
        showToast(`Table #${num} already exists! Please choose another number.`, 'warning');
        setSaving(false);
        return;
      }

      await addTable({
        id: customId,
        tableNumber: num,
        name: newTableName || `Table ${num}`,
        capacity: Number(newCapacity) || 4,
        isActive: true,
      });

      showToast(`Table #${num} created successfully!`, 'success');
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to create table', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (table) => {
    try {
      await updateTable(table.id, { isActive: !table.isActive });
      showToast(
        `Table #${table.tableNumber} is now ${!table.isActive ? 'Active' : 'Inactive'}`,
        'info'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to update table status', 'error');
    }
  };

  const handleDelete = async (tableId) => {
    if (window.confirm('Are you sure you want to remove this table and its QR code?')) {
      try {
        await deleteTable(tableId);
        showToast('Table deleted successfully', 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to delete table', 'error');
      }
    }
  };

  const handlePrintAllStandees = () => {
    window.print();
  };

  const restaurantName = import.meta.env.VITE_RESTAURANT_NAME || 'Gourmet Bistro';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-900 dark:text-white">
      <Navbar />

      {/* Printable Sheet for all Table QR Standees */}
      <div id="kot-print-area" className="hidden print:block text-black bg-white p-4">
        <h1 className="text-center font-bold text-xl uppercase mb-6">{restaurantName} - Table QR Codes</h1>
        <div className="grid grid-cols-2 gap-8">
          {tables.map((t) => (
            <div key={t.id} className="border-2 border-black p-4 text-center rounded-xl">
              <h2 className="font-extrabold text-lg">TABLE #{t.tableNumber}</h2>
              <p className="text-xs mb-3">{t.name}</p>
              <div className="flex justify-center my-2">
                <QRCodeCanvas
                  value={`${window.location.origin}/order/${t.id}`}
                  size={150}
                  level="H"
                  includeMargin={true}
                />
              </div>
              <p className="text-xs font-bold mt-2">Scan with Phone Camera to View Menu & Order</p>
            </div>
          ))}
        </div>
      </div>

      <AdminHeader
        title="Table & QR Code Management"
        subtitle="Generate, preview, and download unique table QR codes for contactless ordering"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintAllStandees}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print All Standees</span>
            </button>

            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Table</span>
            </button>
          </div>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <LoadingSpinner text="Loading tables & QR codes..." className="py-20" />
        ) : tables.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto">
            <QrCode className="w-12 h-12 text-brand-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-1">
              No Tables Configured
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              Add your first dining table to generate unique QR codes.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="px-5 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-sm hover:bg-brand-600"
            >
              Add First Table
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tables.map((table) => (
              <TableQRCard
                key={table.id}
                table={table}
                onToggleActive={handleToggleActive}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Table Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New Dining Table"
      >
        <form onSubmit={handleAddTableSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Table Number *
            </label>
            <input
              type="number"
              min="1"
              required
              value={newTableNumber}
              onChange={(e) => {
                setNewTableNumber(e.target.value);
                setNewTableName(`Table ${e.target.value}`);
              }}
              placeholder="e.g. 7"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Table Label / Section Name
            </label>
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="e.g. Table 7 (Patio Section)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Seating Capacity (Guests)
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={newCapacity}
              onChange={(e) => setNewCapacity(e.target.value)}
              placeholder="4"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
            >
              {saving ? 'Creating Table...' : 'Generate Table & QR'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

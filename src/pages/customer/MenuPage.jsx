import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Navbar } from '../../components/common/Navbar';
import { CategoryBar } from '../../components/customer/CategoryBar';
import { MenuCard } from '../../components/customer/MenuCard';
import { FloatingCartBar } from '../../components/customer/FloatingCartBar';
import { CallWaiterModal } from '../../components/customer/CallWaiterModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { subscribeMenuItems, getTableById } from '../../services/firestoreService';
import { buildCategoryList, normalizeCategoryName } from '../../utils/categories';
import { useCart } from '../../context/CartContext';
import { Search, Bell, AlertCircle, Sparkles, QrCode } from 'lucide-react';

export function MenuPage() {
  const { tableId } = useParams();
  const { tableInfo, setTable } = useCart();

  const [table, setTableData] = useState(() => {
    if (tableInfo.tableId === tableId && tableInfo.tableNumber) {
      return { id: tableInfo.tableId, tableNumber: tableInfo.tableNumber, isActive: true };
    }
    return null;
  });
  const [tableLoading, setTableLoading] = useState(() => !table);
  const [tableError, setTableError] = useState(null);

  const [menuItems, setMenuItems] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isWaiterModalOpen, setIsWaiterModalOpen] = useState(false);

  // 1. Fetch & Validate Table
  useEffect(() => {
    let isMounted = true;

    async function loadTable() {
      try {
        const found = await getTableById(tableId);
        if (!isMounted) return;

        if (!found) {
          setTableError('This QR code is not valid any more. Please ask the staff for help.');
        } else if (found.isActive === false) {
          setTableError(`Table #${found.tableNumber} is currently marked inactive by restaurant staff.`);
        } else {
          setTableData(found);
          setTable(found.id, found.tableNumber);
          setTableError(null);
        }
      } catch (err) {
        console.error('Table fetch error:', err);
        setTableError('Could not verify table. Please scan again.');
      } finally {
        if (isMounted) setTableLoading(false);
      }
    }

    if (tableId) {
      loadTable();
    }
    return () => {
      isMounted = false;
    };
  }, [tableId, setTable]);

  // 2. Real-time menu subscription
  useEffect(() => {
    let isMounted = true;
    const unsubscribe = subscribeMenuItems((items) => {
      if (!isMounted) return;
      setMenuItems(items);
      setLoadingMenu(false);
    });
    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, []);

  // Only categories that actually have dishes, so guests never see empty tabs.
  const categories = useMemo(() => ['All', ...buildCategoryList(menuItems)], [menuItems]);

  // If the selected category disappears (its last dish was removed), go back to All.
  useEffect(() => {
    if (!categories.includes(selectedCategory)) setSelectedCategory('All');
  }, [categories, selectedCategory]);

  // Filtered menu items memoized to prevent re-filtering on unrelated state changes
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cat = selectedCategory.toLowerCase();

    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategory === 'All' || normalizeCategoryName(item.category).toLowerCase() === cat;
      const matchesVeg = !vegOnly || item.isVeg === true;
      const matchesSearch =
        !q ||
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      return matchesCategory && matchesVeg && matchesSearch;
    });
  }, [menuItems, selectedCategory, vegOnly, searchQuery]);

  if (tableLoading && !table) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner text="Connecting to your table..." />
        </div>
      </div>
    );
  }

  if (tableError && !table) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 text-center shadow-xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white font-display mb-2">
              Invalid Table
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">{tableError}</p>
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                className="w-full py-3 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm transition-all"
              >
                Choose a Demo Table
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-28 text-slate-900 dark:text-white antialiased">
      <Navbar tableId={table?.id} tableNumber={table?.tableNumber} />

      {/* Hero / Table Welcome Banner */}
      <div className="bg-slate-300 text-slate-950 py-7 sm:py-10 px-4 sm:px-6 lg:px-8 border-b border-slate-950/10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-amber-800 mb-3">
              <QrCode className="w-3.5 h-3.5" />
              <span>Table {String(table?.tableNumber || 1).padStart(2, '0')}</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-display leading-[1.05]">
              Sip, snack &amp; <em className="italic text-amber-800">stay a while.</em>
            </h1>
            <p className="text-sm sm:text-base text-slate-600 mt-3 max-w-xl font-light">
              Browse the menu, add notes for the kitchen and order right from your table.
            </p>
          </div>

          <button
            onClick={() => setIsWaiterModalOpen(true)}
            className="self-start md:self-auto flex items-center gap-2 px-5 py-3 bg-slate-950 hover:bg-brand-600 active:scale-95 text-slate-50 text-[11px] uppercase tracking-[0.25em] transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span>Call Waiter</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pizza, pasta, cocktails, desserts..."
            className="w-full pl-10 pr-12 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm shadow-xs focus:ring-2 focus:ring-brand-500 focus:outline-none transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 px-1 py-0.5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Category Pills & Veg Filter */}
      <CategoryBar
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        vegFilter={vegOnly}
        onToggleVegFilter={setVegOnly}
      />

      {/* Menu Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {loadingMenu && menuItems.length === 0 ? (
          <LoadingSpinner text="Loading delicious menu..." />
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-12 px-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 mt-2">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 dark:bg-brand-950/60 text-brand-500 flex items-center justify-center mx-auto mb-3">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 dark:text-slate-200 font-display">
              No matching dishes found
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search query or category filter.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('All');
                setVegOnly(false);
                setSearchQuery('');
              }}
              className="mt-4 px-4 py-2 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-sm hover:bg-brand-600"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-6">
            {filteredItems.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      <FloatingCartBar tableId={table?.id} />

      {/* Call Waiter Modal */}
      <CallWaiterModal
        isOpen={isWaiterModalOpen}
        onClose={() => setIsWaiterModalOpen(false)}
        tableId={table?.id}
        tableNumber={table?.tableNumber}
      />
    </div>
  );
}

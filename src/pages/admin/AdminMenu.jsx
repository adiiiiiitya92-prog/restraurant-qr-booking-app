import React, { useState, useEffect } from 'react';
import { Navbar } from '../../components/common/Navbar';
import { AdminHeader } from '../../components/admin/AdminHeader';
import { MenuItemModal } from '../../components/admin/MenuItemModal';
import { DietaryBadge } from '../../components/common/Badge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  subscribeMenuItems,
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
} from '../../services/firestoreService';
import { INITIAL_CATEGORIES } from '../../services/seedData';
import { formatCurrency } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Power,
  Flame,
  Clock,
  UtensilsCrossed,
} from 'lucide-react';

export function AdminMenu() {
  const { showToast } = useToast();
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [vegOnly, setVegOnly] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useEffect(() => {
    const unsubscribe = subscribeMenuItems((data) => {
      setMenuItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveItem = async (formData) => {
    try {
      if (editingItem) {
        await updateMenuItem(editingItem.id, formData);
        showToast(`Updated "${formData.name}" in Firestore successfully!`, 'success');
      } else {
        await addMenuItem(formData);
        showToast(`Added "${formData.name}" to Firestore successfully!`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast(`Firestore save error: ${err.message || 'Permission denied. Check Firebase Rules.'}`, 'error');
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      await updateMenuItem(item.id, { isAvailable: !item.isAvailable });
      showToast(
        `"${item.name}" is now ${!item.isAvailable ? 'In Stock' : 'Marked Out of Stock'}`,
        'info'
      );
    } catch (err) {
      console.error(err);
      showToast('Failed to update availability', 'error');
    }
  };

  const handleDelete = async (item) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      try {
        await deleteMenuItem(item.id);
        showToast(`Deleted "${item.name}" from menu`, 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to delete item', 'error');
      }
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category?.toLowerCase() === selectedCategory.toLowerCase();
    const matchesVeg = !vegOnly || item.isVeg === true;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesVeg && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20 text-slate-900 dark:text-white">
      <Navbar />

      <AdminHeader
        title="Menu Item Management"
        subtitle="Add dishes, update prices, toggle availability, and organize categories"
        action={
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Menu Item</span>
          </button>
        }
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Filters & Search Row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dish by name or description..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs shadow-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {INITIAL_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                }`}
              >
                {cat}
              </button>
            ))}

            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap border transition-all ${
                vegOnly
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${vegOnly ? 'bg-white' : 'bg-emerald-500'}`} />
              <span>Veg Only</span>
            </button>
          </div>
        </div>

        {/* Menu Items Table / Grid */}
        {loading ? (
          <LoadingSpinner text="Loading menu items..." className="py-20" />
        ) : filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto">
            <UtensilsCrossed className="w-12 h-12 text-brand-500 mx-auto mb-3" />
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white mb-1">
              No Dishes Found
            </h3>
            <p className="text-xs text-slate-500 mb-6">
              No menu items match your search or filter criteria.
            </p>
            <button
              onClick={handleOpenAdd}
              className="px-5 py-2.5 rounded-xl bg-brand-500 text-white font-bold text-xs shadow-sm hover:bg-brand-600"
            >
              Add New Dish
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`bg-white dark:bg-slate-900 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group ${
                  item.isAvailable === false
                    ? 'opacity-60 border-slate-200 dark:border-slate-800'
                    : 'border-slate-200/80 dark:border-slate-800 hover:border-brand-500/30 shadow-sm'
                }`}
              >
                <div>
                  {/* Item Image */}
                  <div className="relative aspect-[16/10] w-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img
                      src={
                        item.imageUrl ||
                        'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-lg">
                      <DietaryBadge isVeg={item.isVeg} />
                      <span className="text-[10px] font-bold uppercase tracking-wide">
                        {item.category}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleAvailability(item)}
                      title={item.isAvailable !== false ? 'In Stock (Click to mark Sold Out)' : 'Sold Out (Click to activate)'}
                      className={`absolute top-2.5 right-2.5 px-2 py-1 rounded-lg text-[10px] font-extrabold flex items-center gap-1 backdrop-blur-md shadow-xs ${
                        item.isAvailable !== false
                          ? 'bg-emerald-500/90 text-white'
                          : 'bg-rose-600/90 text-white'
                      }`}
                    >
                      <Power className="w-3 h-3" />
                      <span>{item.isAvailable !== false ? 'In Stock' : 'Sold Out'}</span>
                    </button>
                  </div>

                  {/* Item Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-bold text-slate-900 dark:text-white font-display text-sm">
                        {item.name}
                      </h4>
                      {item.spicyLevel > 0 && (
                        <div className="flex items-center text-rose-500 shrink-0">
                          {Array.from({ length: Math.min(item.spicyLevel, 3) }).map((_, i) => (
                            <Flame key={i} className="w-3 h-3 fill-rose-500" />
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-2">
                      {item.description}
                    </p>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="font-extrabold text-slate-900 dark:text-white font-display text-sm">
                        {formatCurrency(item.price)}
                      </span>
                      {item.prepTime && (
                        <span className="text-[11px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.prepTime}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Edit & Delete Action Footer */}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleOpenEdit(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add / Edit Item Modal */}
      <MenuItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        item={editingItem}
        onSave={handleSaveItem}
      />
    </div>
  );
}

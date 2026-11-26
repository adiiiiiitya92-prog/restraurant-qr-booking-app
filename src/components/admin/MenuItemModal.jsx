import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal';
import { DEFAULT_CATEGORIES, MAX_CATEGORY_LENGTH, normalizeCategoryName, findCategory } from '../../utils/categories';
import { isFirebaseConfigured } from '../../services/firebase';
import { uploadMenuImage } from '../../services/cloudinary';
import { Upload, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const NEW_CATEGORY = '__new__';

export function MenuItemModal({ isOpen, onClose, item, onSave, categories = DEFAULT_CATEGORIES }) {
  const { showToast } = useToast();
  const defaultCategory = categories[0] || 'Main Course';
  // When the admin picks "+ New category", they type the name here.
  const [newCategory, setNewCategory] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    category: defaultCategory,
    price: '',
    description: '',
    prepTime: '15 mins',
    isVeg: true,
    isAvailable: true,
    spicyLevel: 0,
    imageUrl: '',
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        category: normalizeCategoryName(item.category) || defaultCategory,
        price: item.price || '',
        description: item.description || '',
        prepTime: item.prepTime || '15 mins',
        isVeg: item.isVeg ?? true,
        isAvailable: item.isAvailable ?? true,
        spicyLevel: item.spicyLevel || 0,
        imageUrl: item.imageUrl || '',
      });
    } else {
      setFormData({
        name: '',
        category: defaultCategory,
        price: '',
        description: '',
        prepTime: '15 mins',
        isVeg: true,
        isAvailable: true,
        spicyLevel: 0,
        imageUrl: '',
      });
    }
    setNewCategory('');
  }, [item, isOpen]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again
    if (!file) return;

    if (isFirebaseConfigured) {
      setUploading(true);
      try {
        const url = await uploadMenuImage(file);
        setFormData((prev) => ({ ...prev, imageUrl: url }));
        showToast('Photo uploaded', 'success');
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Could not upload the photo. You can paste an image URL instead.', 'error');
      } finally {
        setUploading(false);
      }
      return;
    }

    // Local demo mode: preview only
    const reader = new FileReader();
    reader.onload = () => {
      setFormData((prev) => ({ ...prev, imageUrl: reader.result }));
      showToast('Image loaded for preview', 'info');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) {
      showToast('Please provide a name and price', 'warning');
      return;
    }

    let category = formData.category;
    if (category === NEW_CATEGORY) {
      category = normalizeCategoryName(newCategory);
      if (!category) {
        showToast('Please type a name for the new category', 'warning');
        return;
      }
      // "beverages" typed again should join the existing "Beverages", not make a twin.
      category = findCategory(categoryOptions, category) || category;
    }

    setSaving(true);
    try {
      await onSave({
        ...formData,
        category,
        price: Number(formData.price),
        spicyLevel: Number(formData.spicyLevel),
      });
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Failed to save menu item', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Existing categories, plus this item's own one if it isn't in the list yet.
  const categoryOptions =
    formData.category && formData.category !== NEW_CATEGORY && !findCategory(categories, formData.category)
      ? [...categories, formData.category]
      : categories;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={item ? 'Edit Menu Item' : 'Add New Menu Item'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Dish Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Truffle Alfredo Pasta"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              {categoryOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value={NEW_CATEGORY}>+ New category…</option>
            </select>
            {formData.category === NEW_CATEGORY && (
              <input
                type="text"
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                maxLength={MAX_CATEGORY_LENGTH}
                placeholder="e.g. Cold Coffee, Maggi, Shakes"
                className="mt-2 w-full px-3.5 py-2 border border-amber-600 bg-white text-slate-900 text-xs focus:outline-none"
              />
            )}
          </div>
        </div>

        {/* Price & Prep Time & Spicy Level */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Price (₹) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              placeholder="e.g. 450"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Prep Time
            </label>
            <input
              type="text"
              value={formData.prepTime}
              onChange={(e) => setFormData({ ...formData, prepTime: e.target.value })}
              placeholder="e.g. 15 mins"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Spiciness (0-3)
            </label>
            <select
              value={formData.spicyLevel}
              onChange={(e) => setFormData({ ...formData, spicyLevel: Number(e.target.value) })}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            >
              <option value="0">Mild / None (0)</option>
              <option value="1">Medium (1)</option>
              <option value="2">Spicy (2)</option>
              <option value="3">Extra Hot (3)</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Description
          </label>
          <textarea
            rows="2"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Fresh organic ingredients, herbs, spices..."
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
          />
        </div>

        {/* Image URL & File Upload */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Dish Image URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              placeholder="https://images.unsplash.com/..."
              className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-brand-500 focus:outline-none"
            />
            <label className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 cursor-pointer text-xs font-bold transition-colors">
              <Upload className="w-3.5 h-3.5" />
              <span>{uploading ? 'Uploading...' : 'Upload'}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Toggles: Veg & Availability */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isVeg}
              onChange={(e) => setFormData({ ...formData, isVeg: e.target.checked })}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Vegetarian Dish
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              In Stock / Available
            </span>
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || uploading}
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-xs shadow-md shadow-brand-500/25 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : item ? 'Update Item' : 'Add Item to Menu'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

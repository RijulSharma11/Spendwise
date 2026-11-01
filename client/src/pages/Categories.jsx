import { useState, useEffect } from 'react';
import { categoriesAPI } from '../lib/api';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import {
  Tag,
  PlusCircle,
  Trash2,
  Loader2,
  Utensils,
  Home,
  Zap,
  Film,
  Plane,
  ShoppingBag,
  HeartPulse,
  GraduationCap,
  Briefcase,
  Laptop,
  TrendingUp,
  Wallet,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Available icons mapping
const ICON_MAP = {
  tag: Tag,
  utensils: Utensils,
  home: Home,
  zap: Zap,
  film: Film,
  plane: Plane,
  'shopping-bag': ShoppingBag,
  'heart-pulse': HeartPulse,
  'graduation-cap': GraduationCap,
  briefcase: Briefcase,
  laptop: Laptop,
  'trending-up': TrendingUp,
  wallet: Wallet,
};

const COLOR_PRESETS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#64748B', // Slate
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Category Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('EXPENSE');
  const [color, setColor] = useState('#3B82F6');
  const [icon, setIcon] = useState('tag');
  const [submitting, setSubmitting] = useState(false);

  // Delete modal state
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await categoriesAPI.getAll();
      const list = res.data?.data?.categories || res.data?.categories || res.data?.data || res.data || [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories', err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    setSubmitting(true);
    try {
      await categoriesAPI.create({
        name: name.trim(),
        type,
        color,
        icon,
      });
      toast.success('Category created successfully!');
      setName('');
      setColor('#3B82F6');
      setIcon('tag');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create category');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await categoriesAPI.delete(deletingId);
      toast.success('Category deleted');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete category');
    } finally {
      setDeleteLoading(false);
    }
  };

  const expenseCategories = categories.filter((c) => (c.type || '').toUpperCase() === 'EXPENSE');
  const incomeCategories = categories.filter((c) => (c.type || '').toUpperCase() === 'INCOME');

  const renderIcon = (iconName, className) => {
    const IconComponent = ICON_MAP[iconName] || Tag;
    return <IconComponent className={className} />;
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Categories</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Organize your cash flow with standard system and personalized custom categories
        </p>
      </div>

      {/* Add Custom Category Form */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Create Custom Category</h2>
        </div>

        <form onSubmit={handleCreateCategory} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Gym & Fitness, Pets, SaaS"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="EXPENSE">Expense Category</option>
                <option value="INCOME">Income Category</option>
              </select>
            </div>

            {/* Icon Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-1">
                Icon
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500 capitalize"
              >
                {Object.keys(ICON_MAP).map((k) => (
                  <option key={k} value={k}>
                    {k.replace('-', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Button */}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                <span>Add Category</span>
              </button>
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase mb-2">
              Color Palette
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {COLOR_PRESETS.map((preset) => (
                <button
                  type="button"
                  key={preset}
                  onClick={() => setColor(preset)}
                  className={`w-7 h-7 rounded-full transition-transform cursor-pointer ${
                    color === preset ? 'scale-125 ring-2 ring-offset-2 ring-blue-500' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: preset }}
                />
              ))}
              <div className="flex items-center gap-1.5 ml-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                />
                <span className="text-xs font-mono text-slate-500 uppercase">{color}</span>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading categories...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Expense Categories Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500" />
                Expense Categories ({expenseCategories.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {expenseCategories.map((c) => {
                const isCustom = Boolean(c.userId);
                return (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/80 flex items-center justify-between group hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: c.color || '#EF4444' }}
                      >
                        {renderIcon(c.icon, 'w-5 h-5')}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">
                          {c.name}
                        </p>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          {isCustom ? (
                            <span className="text-blue-500 font-medium">Custom</span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-slate-400" /> System
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {isCustom && (
                      <button
                        onClick={() => {
                          setDeletingId(c.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete custom category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Income Categories Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500" />
                Income Categories ({incomeCategories.length})
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {incomeCategories.map((c) => {
                const isCustom = Boolean(c.userId);
                return (
                  <div
                    key={c.id}
                    className="bg-white dark:bg-slate-800 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-700/80 flex items-center justify-between group hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: c.color || '#10B981' }}
                      >
                        {renderIcon(c.icon, 'w-5 h-5')}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">
                          {c.name}
                        </p>
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          {isCustom ? (
                            <span className="text-blue-500 font-medium">Custom</span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5">
                              <ShieldCheck className="w-3 h-3 text-slate-400" /> System
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {isCustom && (
                      <button
                        onClick={() => {
                          setDeletingId(c.id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Delete custom category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        message="Are you sure you want to delete this custom category?"
      />
    </div>
  );
}

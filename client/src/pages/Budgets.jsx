import { useState, useEffect } from 'react';
import { budgetsAPI, categoriesAPI } from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import {
  Wallet,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Loader2,
  Calendar,
  X,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Budgets() {
  const { formatCurrency } = useCurrency();
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Default to current month "YYYY-MM"
  const currentDate = new Date();
  const currentMonthYear = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState(currentMonthYear);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Form state
  const [form, setForm] = useState({
    categoryId: '',
    monthlyCap: '',
    monthYear: currentMonthYear,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [selectedMonth]);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      const list = res.data?.data?.categories || res.data?.categories || res.data?.data || res.data || [];
      // Only expense categories can have budgets
      setCategories(list.filter((c) => (c.type || '').toUpperCase() === 'EXPENSE'));
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchBudgets = async () => {
    setLoading(true);
    try {
      const res = await budgetsAPI.getAll(selectedMonth);
      const list = res.data?.data?.budgets || res.data?.budgets || res.data?.data || res.data || [];
      setBudgets(list);
    } catch (err) {
      console.error('Failed to load budgets', err);
      toast.error('Failed to load budgets');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = (presetCategory = null) => {
    setForm({
      categoryId: presetCategory?.id || '',
      monthlyCap: presetCategory?.monthlyCap || '',
      monthYear: selectedMonth,
    });
    setIsModalOpen(true);
  };

  const handleSubmitBudget = async (e) => {
    e.preventDefault();
    if (!form.categoryId) {
      toast.error('Please choose a category');
      return;
    }
    if (!form.monthlyCap || Number(form.monthlyCap) <= 0) {
      toast.error('Budget limit must be greater than zero');
      return;
    }
    setModalLoading(true);
    try {
      await budgetsAPI.create({
        categoryId: form.categoryId,
        monthlyCap: Number(form.monthlyCap),
        monthYear: form.monthYear,
      });
      toast.success('Budget saved successfully!');
      setIsModalOpen(false);
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save budget');
    } finally {
      setModalLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await budgetsAPI.delete(deletingId);
      toast.success('Budget removed');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      fetchBudgets();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete budget');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Aggregated totals
  const totalBudgetCap = budgets.reduce((acc, b) => acc + (b.monthlyCap || 0), 0);
  const totalBudgetSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
  const overallPercentage = totalBudgetCap > 0 ? Math.round((totalBudgetSpent / totalBudgetCap) * 100) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Budgets & Limits</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Set monthly spending caps per category with real-time visual alerts
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none cursor-pointer"
            />
          </div>
          <button
            onClick={() => handleOpenAddModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Set New Budget</span>
          </button>
        </div>
      </div>

      {/* Monthly Overview Card */}
      {budgets.length > 0 && (
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                Month of {selectedMonth}
              </span>
              <h2 className="text-xl font-bold mt-2">Overall Budget Status</h2>
              <p className="text-sm text-blue-100 mt-1">
                You have allocated a total of {formatCurrency(totalBudgetCap)} across {budgets.length} categories
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs text-blue-200 uppercase tracking-wider">Total Spent</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBudgetSpent)}</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="text-right">
                <p className="text-xs text-blue-200 uppercase tracking-wider">Total Cap</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBudgetCap)}</p>
              </div>
              <div className="h-10 w-px bg-white/20" />
              <div className="text-right">
                <p className="text-xs text-blue-200 uppercase tracking-wider">Spent %</p>
                <p className="text-2xl font-bold">{overallPercentage}%</p>
              </div>
            </div>
          </div>
          <div className="mt-4 w-full h-2.5 bg-white/20 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                overallPercentage > 90 ? 'bg-rose-400' : overallPercentage > 70 ? 'bg-amber-300' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(overallPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Budgets Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Loading budgets...</p>
        </div>
      ) : budgets.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {budgets.map((b) => {
            const spent = b.spent || 0;
            const cap = b.monthlyCap || 1;
            const percentage = Math.round((spent / cap) * 100);
            const remaining = cap - spent;
            const isExceeded = spent >= cap;
            const isWarning = percentage >= 85 && !isExceeded;

            const barColor =
              percentage >= 90
                ? 'bg-rose-500'
                : percentage >= 70
                ? 'bg-amber-500'
                : 'bg-emerald-500';

            const badgeStyle =
              percentage >= 90
                ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-400'
                : percentage >= 70
                ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900 dark:text-amber-400'
                : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-400';

            return (
              <div
                key={b.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border transition-shadow hover:shadow-md flex flex-col justify-between ${
                  isExceeded
                    ? 'border-rose-300 dark:border-rose-900/80 ring-1 ring-rose-300 dark:ring-rose-900/50'
                    : isWarning
                    ? 'border-amber-300 dark:border-amber-900/80'
                    : 'border-slate-200 dark:border-slate-700/80'
                }`}
              >
                <div>
                  {/* Category & Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: b.category?.color || '#3B82F6' }}
                      />
                      <span className="font-bold text-slate-800 dark:text-white">
                        {b.category?.name || 'Category'}
                      </span>
                    </div>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${badgeStyle}`}>
                      {percentage}%
                    </span>
                  </div>

                  {/* Warning / Alert Notice */}
                  {isExceeded ? (
                    <div className="mb-3 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                      <span>Over budget by {formatCurrency(spent - cap)}!</span>
                    </div>
                  ) : isWarning ? (
                    <div className="mb-3 px-3 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                      <span>Approaching limit ({percentage}% spent)</span>
                    </div>
                  ) : (
                    <div className="mb-3 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                      <span>On track ({formatCurrency(remaining)} left)</span>
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="space-y-1.5 mb-4">
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>Spent: <strong>{formatCurrency(spent)}</strong></span>
                      <span>Limit: <strong>{formatCurrency(cap)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                  <button
                    onClick={() => handleOpenAddModal({ id: b.categoryId, monthlyCap: b.monthlyCap })}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    Adjust Limit
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(b.id);
                      setIsDeleteModalOpen(true);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                    title="Delete Budget"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-700/80">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-3 text-blue-500">
            <Wallet className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
            No budgets configured for {selectedMonth}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
            Setting monthly budgets helps you prevent overspending and hit your savings goals.
          </p>
          <button
            onClick={() => handleOpenAddModal()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            Set Your First Budget
          </button>
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Set Monthly Budget Cap
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBudget} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select an expense category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Monthly Cap Amount
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={form.monthlyCap}
                  onChange={(e) => setForm({ ...form, monthlyCap: e.target.value })}
                  placeholder="e.g. 15000"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Month
                </label>
                <input
                  type="month"
                  value={form.monthYear}
                  onChange={(e) => setForm({ ...form, monthYear: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors cursor-pointer"
                >
                  {modalLoading ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
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
        message="Are you sure you want to remove this category budget cap?"
      />
    </div>
  );
}

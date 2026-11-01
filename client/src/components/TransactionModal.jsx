import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { categoriesAPI } from '../lib/api';
import toast from 'react-hot-toast';

export default function TransactionModal({ isOpen, onClose, onSave, transaction }) {
  const isEdit = Boolean(transaction);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    type: 'EXPENSE',
    amount: '',
    category: '',
    date: new Date().toISOString().split('T')[0],
    paymentMode: 'UPI',
    description: '',
  });

  useEffect(() => {
    if (isOpen) {
      categoriesAPI.getAll().then((res) => {
        const catList = res.data?.data?.categories || res.data?.categories || res.data?.data || res.data || [];
        setCategories(catList);
      }).catch(err => {
        console.error('Failed to load categories', err);
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (transaction) {
      setForm({
        type: (transaction.type || 'EXPENSE').toUpperCase(),
        amount: transaction.amount || '',
        category: transaction.categoryId || transaction.category?.id || transaction.category?._id || '',
        date: transaction.date
          ? new Date(transaction.date).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        paymentMode: transaction.paymentMode || 'UPI',
        description: transaction.description || '',
      });
    } else {
      setForm({
        type: 'EXPENSE',
        amount: '',
        category: '',
        date: new Date().toISOString().split('T')[0],
        paymentMode: 'UPI',
        description: '',
      });
    }
  }, [transaction, isOpen]);

  const filteredCategories = categories.filter(
    (c) => (c.type || '').toUpperCase() === form.type
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error('Amount must be greater than 0');
      return;
    }
    if (!form.category) {
      toast.error('Please select a category');
      return;
    }
    setLoading(true);
    try {
      await onSave({
        type: form.type,
        amount: Number(form.amount),
        categoryId: form.category,
        date: form.date,
        paymentMode: form.paymentMode,
        description: form.description,
      });
      toast.success(isEdit ? 'Transaction updated successfully!' : 'Transaction added successfully!');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            {isEdit ? 'Edit Transaction' : 'Add Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Type
            </label>
            <div className="flex rounded-lg overflow-hidden border border-slate-200 dark:border-slate-600">
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'INCOME', category: '' })}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.type === 'INCOME'
                    ? 'bg-green-500 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, type: 'EXPENSE', category: '' })}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  form.type === 'EXPENSE'
                    ? 'bg-red-500 text-white'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-600'
                }`}
              >
                Expense
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Amount
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              placeholder="0.00"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Select a category</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id || cat._id} value={cat.id || cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Date
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Payment Mode
            </label>
            <select
              value={form.paymentMode}
              onChange={(e) => setForm({ ...form, paymentMode: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="UPI">UPI</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="NET_BANKING">Net Banking</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Add a note (e.g. Grocery shopping, Electricity bill)..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-medium rounded-lg transition-colors cursor-pointer"
          >
            {loading ? 'Saving...' : isEdit ? 'Update Transaction' : 'Add Transaction'}
          </button>
        </form>
      </div>
    </div>
  );
}

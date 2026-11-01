import { useState, useEffect } from 'react';
import { transactionsAPI, categoriesAPI, exportCSVAPI } from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import TransactionModal from '../components/TransactionModal';
import DeleteConfirmModal from '../components/DeleteConfirmModal';
import { downloadCSV } from '../utils/exportCSV';
import {
  PlusCircle,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckSquare,
  Square,
  FileText,
  Calendar,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Transactions() {
  const { formatCurrency } = useCurrency();
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters & Sorting state
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [category, setCategory] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [order, setOrder] = useState('desc');

  // Batch Selection state
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Receipt Preview state
  const [previewReceipt, setPreviewReceipt] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
    // Clear selection on page/filter change
    setSelectedIds([]);
  }, [page, limit, type, category, startDate, endDate, sortBy, order]);

  const fetchCategories = async () => {
    try {
      const res = await categoriesAPI.getAll();
      const list = res.data?.data?.categories || res.data?.categories || res.data?.data || res.data || [];
      setCategories(list);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        sortBy,
        order,
      };
      if (search.trim()) params.search = search.trim();
      if (type) params.type = type;
      if (category) params.category = category;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await transactionsAPI.getAll(params);
      const data = res.data?.data || res.data || {};
      setTransactions(data.transactions || []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch transactions', err);
      toast.error('Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };

  // Quick Preset Filters
  const applyPreset = (preset) => {
    const now = new Date();
    setPage(1);
    if (preset === 'today') {
      const todayStr = now.toISOString().split('T')[0];
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      setStartDate(weekAgo.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(lastDay.toISOString().split('T')[0]);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleSaveTransaction = async (formData) => {
    if (editingTransaction) {
      await transactionsAPI.update(editingTransaction.id, formData);
    } else {
      await transactionsAPI.create(formData);
    }
    fetchTransactions();
  };

  const openEditModal = (tx) => {
    setEditingTransaction(tx);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const openDeleteModal = (id) => {
    setDeletingId(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      await transactionsAPI.delete(deletingId);
      toast.success('Transaction deleted successfully');
      setIsDeleteModalOpen(false);
      setDeletingId(null);
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete transaction');
    } finally {
      setDeleteLoading(false);
    }
  };

  // Batch Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((tx) => tx.id));
    }
  };

  const toggleSelectOne = (id) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const confirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setBatchDeleting(true);
    try {
      await transactionsAPI.batchDelete(selectedIds);
      toast.success(`Deleted ${selectedIds.length} transactions!`);
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
      fetchTransactions();
    } catch (err) {
      toast.error('Failed to batch delete transactions');
    } finally {
      setBatchDeleting(false);
    }
  };

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (type) params.type = type;
      if (category) params.category = category;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      try {
        const response = await exportCSVAPI(params);
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `spendwise-report-${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        toast.success('Report exported successfully!');
      } catch (serverErr) {
        downloadCSV(transactions, formatCurrency);
        toast.success('Report exported successfully!');
      }
    } catch (err) {
      console.error('Export failed:', err);
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setType('');
    setCategory('');
    setStartDate('');
    setEndDate('');
    setSortBy('date');
    setOrder('desc');
    setPage(1);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Transactions</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Search, filter, batch manage, and export your entire financial history
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl shadow-sm transition-colors cursor-pointer text-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>
          )}
          <button
            onClick={handleExportCSV}
            disabled={exporting || transactions.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium rounded-xl shadow-sm transition-colors cursor-pointer text-sm"
            title="Download CSV report"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Export CSV</span>
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors cursor-pointer text-sm"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700/80 space-y-4">
        {/* Search row with quick presets */}
        <div className="flex flex-col md:flex-row items-center gap-3 justify-between">
          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search description (e.g. Netflix, Rent, BigBasket)..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 text-xs">
            <span className="text-slate-400 font-semibold uppercase text-[10px] mr-1">Presets:</span>
            <button
              onClick={() => applyPreset('month')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              This Month
            </button>
            <button
              onClick={() => applyPreset('week')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyPreset('today')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              Today
            </button>
            <button
              onClick={() => applyPreset('all')}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              All Time
            </button>
          </div>
        </div>

        {/* Filter dropdowns row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Type filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="INCOME">Income Only</option>
              <option value="EXPENSE">Expense Only</option>
            </select>
          </div>

          {/* Category filter */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">
              From Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">
              To Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase">
              Sort By
            </label>
            <div className="flex gap-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-700/60 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="date">Date</option>
                <option value="amount">Amount</option>
              </select>
              <button
                type="button"
                onClick={() => setOrder(order === 'asc' ? 'desc' : 'asc')}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-slate-600 dark:text-slate-200 cursor-pointer"
                title={`Sort ${order === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                <ArrowUpDown className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Active filters status / reset */}
        {(type || category || startDate || endDate || search) && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              Active filters applied • Found {totalCount} records
            </span>
            <button
              onClick={resetFilters}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700/80 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading transactions...</p>
          </div>
        ) : transactions.length > 0 ? (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-700/80">
                    <th className="py-3 px-4 w-10 text-center">
                      <button
                        onClick={toggleSelectAll}
                        className="text-slate-500 hover:text-blue-600 cursor-pointer"
                      >
                        {selectedIds.length === transactions.length && transactions.length > 0 ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400" />
                        )}
                      </button>
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Mode
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                      Amount
                    </th>
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                  {transactions.map((tx) => {
                    const isIncome = (tx.type || '').toUpperCase() === 'INCOME';
                    const isSelected = selectedIds.includes(tx.id);
                    return (
                      <tr
                        key={tx.id}
                        className={`hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors ${
                          isSelected ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => toggleSelectOne(tx.id)}
                            className="text-slate-500 hover:text-blue-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-blue-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 dark:text-slate-600" />
                            )}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isIncome
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                                : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                            }`}
                          >
                            {isIncome ? 'Income' : 'Expense'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-full"
                            style={{
                              backgroundColor: (tx.category?.color || '#3B82F6') + '20',
                              color: tx.category?.color || '#3B82F6',
                            }}
                          >
                            {tx.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-slate-800 dark:text-slate-200 max-w-xs truncate">
                          {tx.description || '—'}
                          {tx.receiptUrl && (
                            <button
                              onClick={() => setPreviewReceipt(tx.receiptUrl)}
                              className="ml-2 inline-flex items-center text-xs text-blue-500 hover:underline"
                              title="View receipt"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300 font-medium">
                            {tx.paymentMode}
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-4 text-sm font-bold text-right whitespace-nowrap ${
                            isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => openEditModal(tx)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 dark:hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                              title="Edit transaction"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(tx.id)}
                              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                              title="Delete transaction"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-100 dark:border-slate-700/80 gap-3">
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {transactions.length > 0 ? (page - 1) * limit + 1 : 0}
                </span>{' '}
                to{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {Math.min(page * limit, totalCount)}
                </span>{' '}
                of{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {totalCount}
                </span>{' '}
                transactions
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold px-2 text-slate-700 dark:text-slate-300">
                  Page {page} of {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto mb-3 text-slate-400">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-1">
              No transactions found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              {(type || category || startDate || endDate || search)
                ? 'Try adjusting your search criteria or resetting filters.'
                : 'No transactions yet. Click "Add Transaction" to start recording your spending and income!'}
            </p>
            {(type || category || startDate || endDate || search) ? (
              <button
                onClick={resetFilters}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            ) : (
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
              >
                Add Your First Transaction
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }}
        onSave={handleSaveTransaction}
        transaction={editingTransaction}
      />

      {/* Single Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeletingId(null);
        }}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        message="Are you sure you want to permanently delete this transaction? This action cannot be undone."
      />

      {/* Batch Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        onConfirm={confirmBatchDelete}
        loading={batchDeleting}
        message={`Are you sure you want to permanently delete all ${selectedIds.length} selected transactions?`}
      />

      {/* Receipt Preview Modal */}
      {previewReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60" onClick={() => setPreviewReceipt(null)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-700">
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Receipt Preview</h3>
              <button onClick={() => setPreviewReceipt(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center bg-slate-50 dark:bg-slate-900 rounded-xl p-4 max-h-96 overflow-auto">
              <img src={previewReceipt} alt="Transaction Receipt" className="max-w-full rounded-lg shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

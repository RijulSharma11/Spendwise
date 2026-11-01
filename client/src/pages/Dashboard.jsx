import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, budgetsAPI, transactionsAPI } from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import TransactionModal from '../components/TransactionModal';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Loader2,
  ArrowRight,
  AlertTriangle,
  PlusCircle,
  Tag,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Info,
  Flame,
  Target,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';

const PIE_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#6366F1', '#14B8A6',
];

export default function Dashboard() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [insights, setInsights] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    fetchDashboardData();

    // Listen for updates from other parts of the app
    const handleUpdate = () => fetchDashboardData();
    window.addEventListener('transaction-updated', handleUpdate);
    return () => window.removeEventListener('transaction-updated', handleUpdate);
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [summaryRes, categoryRes, monthlyRes, budgetRes, txRes, insightsRes] = await Promise.all([
        analyticsAPI.getSummary(),
        analyticsAPI.getCategoryBreakdown(),
        analyticsAPI.getMonthlyTrend(),
        budgetsAPI.getAll(),
        transactionsAPI.getAll({ limit: 5, sortBy: 'date', order: 'desc' }),
        analyticsAPI.getInsights().catch(() => ({ data: { data: null } })),
      ]);

      setSummary(summaryRes.data?.data || summaryRes.data || {});
      setCategoryData(categoryRes.data?.data?.breakdown || categoryRes.data?.breakdown || []);
      setMonthlyData(monthlyRes.data?.data?.months || monthlyRes.data?.months || []);
      setBudgets(budgetRes.data?.data?.budgets || budgetRes.data?.budgets || []);
      setRecentTransactions(txRes.data?.data?.transactions || txRes.data?.transactions || []);
      setInsights(insightsRes.data?.data || null);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (formData) => {
    await transactionsAPI.create(formData);
    await fetchDashboardData();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Loading your financial dashboard...</p>
      </div>
    );
  }

  const totalIncome = summary?.totalIncome ?? 0;
  const totalExpenses = summary?.totalExpense ?? summary?.totalExpenses ?? 0;
  const balance = summary?.balance ?? (totalIncome - totalExpenses);
  const savingsRate = summary?.savingsRate ?? (totalIncome > 0 ? (((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1) : 0);
  const trends = summary?.trends || {};

  // Target Monthly Budget
  const targetMonthlyBudget = user?.monthlyBudget || 50000;
  const targetBudgetPct = Math.round((totalExpenses / targetMonthlyBudget) * 100);

  const summaryCards = [
    {
      label: 'Net Balance',
      value: formatCurrency(balance),
      icon: Wallet,
      trend: trends.balance,
      color: 'blue',
      bgColor: 'bg-blue-50 dark:bg-blue-500/10',
      iconColor: 'text-blue-500',
    },
    {
      label: 'Monthly Income',
      value: formatCurrency(totalIncome),
      icon: TrendingUp,
      trend: trends.income,
      color: 'green',
      bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-500',
    },
    {
      label: 'Monthly Expenses',
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      trend: trends.expense,
      color: 'red',
      bgColor: 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: 'text-rose-500',
    },
    {
      label: 'Savings Rate',
      value: `${savingsRate}%`,
      icon: PiggyBank,
      trend: trends.savingsRate,
      color: 'purple',
      bgColor: 'bg-purple-50 dark:bg-purple-500/10',
      iconColor: 'text-purple-500',
    },
  ];

  // Check critical budgets (>85%)
  const criticalBudgets = budgets.filter((b) => {
    const cap = b.monthlyCap || 1;
    const spent = b.spent || 0;
    return (spent / cap) >= 0.85;
  });

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white dark:bg-slate-800 px-4 py-3 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
        <p className="text-sm font-semibold text-slate-800 dark:text-white mb-2">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} className="text-xs font-medium flex items-center justify-between gap-4" style={{ color: entry.color }}>
            <span>{entry.name}:</span>
            <span className="font-semibold">{formatCurrency(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span>Welcome back, {user?.name?.split(' ')[0] || 'Friend'}!</span>
            <span className="text-xl">👋</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Here's what is happening with your money this month
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/reports"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition-colors"
          >
            Full Reports
          </Link>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl shadow-sm transition-colors cursor-pointer text-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Critical Budget Alert Banner */}
      {criticalBudgets.length > 0 && (
        <div className="space-y-2">
          {criticalBudgets.map((b) => {
            const cap = b.monthlyCap || 1;
            const spent = b.spent || 0;
            const pct = Math.round((spent / cap) * 100);
            const isExceeded = pct >= 100;
            return (
              <div
                key={b.id}
                className={`p-4 rounded-xl border flex items-center gap-3 ${
                  isExceeded
                    ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-300'
                    : 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-300'
                }`}
              >
                <AlertTriangle className={`w-5 h-5 shrink-0 ${isExceeded ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}`} />
                <div className="flex-1 text-sm font-medium">
                  {isExceeded ? (
                    <span>
                      <strong>Warning:</strong> Budget exceeded for <strong>{b.category?.name}</strong>! Spent {formatCurrency(spent)} of {formatCurrency(cap)} limit ({pct}%).
                    </span>
                  ) : (
                    <span>
                      <strong>Notice:</strong> You've used {pct}% of your <strong>{b.category?.name}</strong> budget ({formatCurrency(spent)} / {formatCurrency(cap)}).
                    </span>
                  )}
                </div>
                <Link
                  to="/budgets"
                  className="text-xs font-semibold underline shrink-0 hover:opacity-80"
                >
                  Adjust Budget
                </Link>
              </div>
            );
          })}
        </div>
      )}

      {/* Smart Financial Insights & Health Engine */}
      {insights && (
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-900/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            {/* Health Score Gauge */}
            <div className="flex items-center gap-5">
              <div className="relative w-20 h-20 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex flex-col items-center justify-center shrink-0">
                <span className="text-3xl font-extrabold text-white tracking-tight">
                  {insights.score}
                </span>
                <span className="text-[10px] uppercase font-bold text-indigo-300 tracking-wider">
                  / 100
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {insights.grade}
                  </span>
                  <span className="text-xs text-indigo-300">Financial Health Index</span>
                </div>
                <h3 className="text-lg font-bold text-white mt-1">Smart Cash Flow Insights</h3>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Avg spending: <strong className="text-white">{formatCurrency(insights.dailyAverage)}/day</strong> • Projected Month-End: <strong className="text-white">{formatCurrency(insights.projectedMonthEndSpend)}</strong>
                </p>
              </div>
            </div>

            {/* Quick Stats Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {insights.topCategory && (
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                  <p className="text-[11px] text-indigo-200 uppercase font-medium">Top Category</p>
                  <p className="text-sm font-bold text-white truncate mt-0.5">
                    {insights.topCategory.name}
                  </p>
                  <p className="text-[11px] text-emerald-300">
                    {insights.topCategory.percentOfTotal}% of expenses
                  </p>
                </div>
              )}
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10">
                <p className="text-[11px] text-indigo-200 uppercase font-medium">Savings Rate</p>
                <p className="text-sm font-bold text-white mt-0.5">{insights.savingsRate}%</p>
                <p className="text-[11px] text-emerald-300">
                  {insights.savingsRate >= 30 ? 'Strong savings' : 'Needs attention'}
                </p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 col-span-2 sm:col-span-1">
                <p className="text-[11px] text-indigo-200 uppercase font-medium">Budget Status</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {insights.exceededBudgetCount === 0 ? 'All Safe' : `${insights.exceededBudgetCount} Breached`}
                </p>
                <p className="text-[11px] text-indigo-300">
                  {insights.exceededBudgetCount === 0 ? 'Within all limits' : 'Review budgets'}
                </p>
              </div>
            </div>
          </div>

          {/* Actionable Recommendations */}
          {insights.tips && insights.tips.length > 0 && (
            <div className="mt-5 pt-4 border-t border-indigo-900/60 grid grid-cols-1 md:grid-cols-2 gap-3">
              {insights.tips.slice(0, 2).map((tip, idx) => (
                <div
                  key={idx}
                  className="bg-indigo-950/40 rounded-xl p-3 border border-indigo-800/40 flex items-start gap-2.5 text-xs"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-semibold">{tip.title}</strong>
                    <span className="text-indigo-200 mt-0.5 block leading-relaxed">{tip.message}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700/80 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${card.bgColor}`}>
                  <Icon className={`w-5 h-5 ${card.iconColor}`} />
                </div>
                {card.trend !== undefined && card.trend !== null && card.trend !== 0 && (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      card.trend > 0
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400'
                    }`}
                  >
                    {card.trend > 0 ? '+' : ''}
                    {card.trend}% vs last mo
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {card.label}
              </p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Target Monthly Budget Status Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Monthly Target Budget Cap
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                You have spent {formatCurrency(totalExpenses)} of your overall {formatCurrency(targetMonthlyBudget)} monthly goal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                targetBudgetPct > 100
                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-400'
                  : targetBudgetPct > 80
                  ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400'
              }`}
            >
              {targetBudgetPct}% Spent
            </span>
            <Link
              to="/settings"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Adjust Goal
            </Link>
          </div>
        </div>

        <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              targetBudgetPct > 90 ? 'bg-rose-500' : targetBudgetPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(targetBudgetPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart: Expenses by Category */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Expenses by Category
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Current month distribution</p>
            </div>
            <Tag className="w-5 h-5 text-slate-400" />
          </div>

          {categoryData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="categoryName"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.categoryColor || PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white">
                            {d.categoryName}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {formatCurrency(d.total)} ({d.percentage}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
              <Tag className="w-8 h-8 opacity-40" />
              <p className="text-sm">No expenses recorded this month yet</p>
            </div>
          )}
        </div>

        {/* Bar Chart: 6-Month Income vs. Expense Trend */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                6-Month Cash Flow Trend
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Income vs. Expense comparison</p>
            </div>
            <Calendar className="w-5 h-5 text-slate-400" />
          </div>

          {monthlyData.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={{ stroke: '#cbd5e1' }}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend
                    formatter={(value) => (
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {value}
                      </span>
                    )}
                  />
                  <Bar dataKey="income" name="Income" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" name="Expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 gap-2">
              <Calendar className="w-8 h-8 opacity-40" />
              <p className="text-sm">No monthly trend data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Budget Progress Bars */}
      {budgets.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                Monthly Category Budgets
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visual progress: Green &lt; 70%, Amber 70–90%, Red &gt; 90%
              </p>
            </div>
            <Link
              to="/budgets"
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              Manage Budgets <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {budgets.map((budget) => {
              const spent = budget.spent || 0;
              const limit = budget.monthlyCap || 1;
              const percentage = Math.round((spent / limit) * 100);
              const barColor =
                percentage > 90
                  ? 'bg-rose-500'
                  : percentage > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500';

              const badgeColor =
                percentage > 90
                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900 dark:text-rose-400'
                  : percentage > 70
                  ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-400'
                  : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-400';

              return (
                <div
                  key={budget.id}
                  className="p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/50 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {budget.category?.name || 'Category'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${badgeColor}`}>
                      {percentage}%
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Spent: <strong>{formatCurrency(spent)}</strong></span>
                    <span>Limit: <strong>{formatCurrency(limit)}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Transactions List */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white">
              Recent Transactions
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Latest activity on your account</p>
          </div>
          <Link
            to="/transactions"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            View All Transactions <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700/80">
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Mode
                  </th>
                  <th className="py-2.5 px-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {recentTransactions.map((tx) => {
                  const isIncome = (tx.type || '').toUpperCase() === 'INCOME';
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="py-3 px-3 text-xs text-slate-600 dark:text-slate-400">
                        {new Date(tx.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3">
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
                      <td className="py-3 px-3 text-sm text-slate-700 dark:text-slate-200">
                        {tx.description || '—'}
                      </td>
                      <td className="py-3 px-3 text-xs text-slate-500 dark:text-slate-400">
                        {tx.paymentMode}
                      </td>
                      <td
                        className={`py-3 px-3 text-sm font-semibold text-right ${
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500">
            <p>No transactions yet. Click "Add Transaction" to create your first record!</p>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleCreateTransaction}
      />
    </div>
  );
}

import { useState, useEffect } from 'react';
import { analyticsAPI } from '../lib/api';
import { useCurrency } from '../context/CurrencyContext';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  Printer,
  Calendar,
  CreditCard,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Loader2,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

const PAYMENT_COLORS = {
  UPI: '#3B82F6',
  CARD: '#8B5CF6',
  'Credit Card': '#8B5CF6',
  CASH: '#10B981',
  Cash: '#10B981',
  NET_BANKING: '#F59E0B',
  'Bank Transfer': '#F59E0B',
  Other: '#64748B',
};

const PIE_FALLBACK_COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#06B6D4'];

export default function Reports() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [period, setPeriod] = useState('6m');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchReports();
  }, [period]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getReports(period);
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-80 gap-3">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 text-sm">Aggregating financial reports...</p>
      </div>
    );
  }

  const totalIncome = data?.totalIncome || 0;
  const totalExpense = data?.totalExpense || 0;
  const netSavings = data?.netSavings || 0;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  const paymentBreakdown = data?.paymentBreakdown || [];
  const dayOfWeekData = data?.dayOfWeekData || [];
  const dailyTimeline = data?.dailyTimeline || [];
  const topLargest = data?.topLargest || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto print:p-0 print:m-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <span>Financial Reports & Analytics</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Deep insights into payment modes, day-of-week habits, and cash flow trends
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period selector */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
            {[
              { id: '1m', label: '1M' },
              { id: '3m', label: '3M' },
              { id: '6m', label: '6M' },
              { id: '1y', label: '1Y' },
              { id: 'all', label: 'All' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  period === p.id
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-medium rounded-xl shadow-sm text-sm transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Statement</span>
          </button>
        </div>
      </div>

      {/* Print Statement Header (Only visible when printing) */}
      <div className="hidden print:block border-b pb-4 mb-6">
        <h1 className="text-2xl font-bold text-black">SpendWise Financial Statement</h1>
        <p className="text-sm text-gray-600">
          Account Holder: {user?.name} ({user?.email}) • Generated: {new Date().toLocaleDateString()}
        </p>
      </div>

      {/* Period Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700/80">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Inflow
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalIncome)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700/80">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Outflow
          </p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalExpense)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700/80">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Net Savings
          </p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">
            {formatCurrency(netSavings)}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-700/80">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Savings Ratio
          </p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">
            {savingsRate}%
          </p>
        </div>
      </div>

      {/* Daily Cash Flow Area Chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
          Daily Cash Flow Timeline
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Day-by-day fluctuation of income deposits vs expense outflows
        </p>

        {dailyTimeline.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTimeline}>
                <defs>
                  <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => {
                    const d = new Date(val);
                    return `${d.getDate()}/${d.getMonth() + 1}`;
                  }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <p className="font-semibold text-slate-800 dark:text-white mb-1">{label}</p>
                        {payload.map((p, i) => (
                          <p key={i} style={{ color: p.color }}>
                            {p.name}: {formatCurrency(p.value)}
                          </p>
                        ))}
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Income"
                  stroke="#10B981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#incomeGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expense"
                  stroke="#EF4444"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#expenseGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-center text-slate-400 py-12">No timeline data available for this range</p>
        )}
      </div>

      {/* Two Column Layout: Payment Modes Donut + Day of Week Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Modes Donut Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
            Expenses by Payment Method
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Which instruments (UPI, Cards, Cash, Net Banking) you use most
          </p>

          {paymentBreakdown.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="mode"
                  >
                    {paymentBreakdown.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PAYMENT_COLORS[entry.mode] || PIE_FALLBACK_COLORS[index % PIE_FALLBACK_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                          <p className="font-semibold text-slate-800 dark:text-white">{d.mode}</p>
                          <p className="text-slate-500 dark:text-slate-400">
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
            <p className="text-center text-slate-400 py-12">No payment mode records</p>
          )}
        </div>

        {/* Day of the Week Habits Bar Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80 flex flex-col">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
            Day-of-Week Spending Distribution
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Identify which days of the week experience peak outflows
          </p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dayOfWeekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickFormatter={(val) => val.slice(0, 3)}
                />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-white dark:bg-slate-800 px-3 py-2 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 text-xs">
                        <p className="font-semibold text-slate-800 dark:text-white mb-1">{label}</p>
                        <p className="text-rose-600 font-semibold">{formatCurrency(payload[0].value)}</p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="amount" name="Spent" fill="#6366F1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top 5 Largest Outlays in Selected Period */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700/80">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
          Top Largest Expenses ({period.toUpperCase()})
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          The single largest expenditures recorded during this period
        </p>

        {topLargest.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700 text-xs text-slate-400 uppercase">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 text-sm">
                {topLargest.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30">
                    <td className="py-3 px-3 text-xs text-slate-500">
                      {new Date(tx.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className="text-xs font-semibold px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: (tx.color || '#3B82F6') + '20',
                          color: tx.color || '#3B82F6',
                        }}
                      >
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-800 dark:text-slate-200 font-medium">
                      {tx.description}
                    </td>
                    <td className="py-3 px-3 text-xs text-slate-500">{tx.paymentMode}</td>
                    <td className="py-3 px-3 text-right font-bold text-rose-600 dark:text-rose-400">
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-center text-slate-400 py-6">No expenses found</p>
        )}
      </div>
    </div>
  );
}

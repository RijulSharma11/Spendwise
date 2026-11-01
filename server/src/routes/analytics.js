import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes are protected
router.use(authenticate);

// GET /api/analytics/summary
router.get('/summary', async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const currentMonthStart = new Date(currentYear, currentMonth, 1);
    const currentMonthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const prevMonthStart = new Date(currentYear, currentMonth - 1, 1);
    const prevMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

    const [currentIncome, currentExpense, prevIncome, prevExpense] = await Promise.all([
      prisma.transaction.aggregate({
        where: {
          userId: req.user.id,
          type: 'INCOME',
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId: req.user.id,
          type: 'EXPENSE',
          date: { gte: currentMonthStart, lte: currentMonthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId: req.user.id,
          type: 'INCOME',
          date: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          userId: req.user.id,
          type: 'EXPENSE',
          date: { gte: prevMonthStart, lte: prevMonthEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    const totalIncome = currentIncome._sum.amount || 0;
    const totalExpense = currentExpense._sum.amount || 0;
    const balance = totalIncome - totalExpense;
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;

    const prevTotalIncome = prevIncome._sum.amount || 0;
    const prevTotalExpense = prevExpense._sum.amount || 0;
    const prevBalance = prevTotalIncome - prevTotalExpense;
    const prevSavingsRate = prevTotalIncome > 0 ? ((prevTotalIncome - prevTotalExpense) / prevTotalIncome) * 100 : 0;

    const incomeTrend = prevTotalIncome > 0 ? ((totalIncome - prevTotalIncome) / prevTotalIncome) * 100 : 0;
    const expenseTrend = prevTotalExpense > 0 ? ((totalExpense - prevTotalExpense) / prevTotalExpense) * 100 : 0;
    const balanceTrend = prevBalance !== 0 ? ((balance - prevBalance) / Math.abs(prevBalance)) * 100 : 0;
    const savingsRateTrend = prevSavingsRate !== 0 ? savingsRate - prevSavingsRate : 0;

    return res.json({
      success: true,
      data: {
        totalIncome,
        totalExpense,
        balance,
        savingsRate: Math.round(savingsRate * 100) / 100,
        trends: {
          income: Math.round(incomeTrend * 10) / 10,
          expense: Math.round(expenseTrend * 10) / 10,
          balance: Math.round(balanceTrend * 10) / 10,
          savingsRate: Math.round(savingsRateTrend * 10) / 10,
        },
      },
    });
  } catch (error) {
    console.error('Summary error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch summary.' });
  }
});

// GET /api/analytics/category-breakdown
router.get('/category-breakdown', async (req, res) => {
  try {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const expenses = await prisma.transaction.findMany({
      where: {
        userId: req.user.id,
        type: 'EXPENSE',
        date: { gte: monthStart, lte: monthEnd },
      },
      include: { category: true },
    });

    const categoryMap = {};
    let grandTotal = 0;

    for (const tx of expenses) {
      const catId = tx.categoryId;
      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          categoryName: tx.category.name,
          categoryColor: tx.category.color,
          categoryIcon: tx.category.icon,
          total: 0,
        };
      }
      categoryMap[catId].total += tx.amount;
      grandTotal += tx.amount;
    }

    const breakdown = Object.values(categoryMap).map((cat) => ({
      ...cat,
      total: Math.round(cat.total * 100) / 100,
      percentage: grandTotal > 0 ? Math.round((cat.total / grandTotal) * 10000) / 100 : 0,
    }));

    breakdown.sort((a, b) => b.total - a.total);

    return res.json({ success: true, data: { breakdown, grandTotal } });
  } catch (error) {
    console.error('Category breakdown error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch category breakdown.' });
  }
});

// GET /api/analytics/monthly-trend
router.get('/monthly-trend', async (req, res) => {
  try {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

      const monthLabel = date.toLocaleString('en-US', { month: 'short', year: 'numeric' });

      const [income, expense] = await Promise.all([
        prisma.transaction.aggregate({
          where: {
            userId: req.user.id,
            type: 'INCOME',
            date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        prisma.transaction.aggregate({
          where: {
            userId: req.user.id,
            type: 'EXPENSE',
            date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
      ]);

      months.push({
        month: monthLabel,
        income: income._sum.amount || 0,
        expense: expense._sum.amount || 0,
      });
    }

    return res.json({ success: true, data: { months } });
  } catch (error) {
    console.error('Monthly trend error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch monthly trend.' });
  }
});

// GET /api/analytics/insights (Smart AI & Financial Health Engine)
router.get('/insights', async (req, res) => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const dayOfMonth = now.getDate();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const monthStart = new Date(currentYear, currentMonth, 1);
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const [user, monthExpenses, monthIncomes, budgets] = await Promise.all([
      prisma.user.findUnique({ where: { id: req.user.id } }),
      prisma.transaction.findMany({
        where: {
          userId: req.user.id,
          type: 'EXPENSE',
          date: { gte: monthStart, lte: monthEnd },
        },
        include: { category: true },
        orderBy: { amount: 'desc' },
      }),
      prisma.transaction.aggregate({
        where: {
          userId: req.user.id,
          type: 'INCOME',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      prisma.budget.findMany({
        where: {
          userId: req.user.id,
          monthYear: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`,
        },
        include: { category: true },
      }),
    ]);

    const totalIncome = monthIncomes._sum.amount || 0;
    const totalExpense = monthExpenses.reduce((acc, tx) => acc + tx.amount, 0);
    const savingsRate = totalIncome > 0 ? Math.max(0, ((totalIncome - totalExpense) / totalIncome) * 100) : 0;

    // Daily spending run-rate
    const dailyAverage = dayOfMonth > 0 ? totalExpense / dayOfMonth : 0;
    const projectedMonthEndSpend = Math.round(dailyAverage * totalDaysInMonth);

    // Compute Health Score (0 - 100)
    let score = 50; // Base baseline

    // Factor 1: Savings Rate (+/- 25 pts)
    if (savingsRate >= 50) score += 25;
    else if (savingsRate >= 30) score += 18;
    else if (savingsRate >= 15) score += 10;
    else if (savingsRate > 0) score += 2;
    else score -= 15;

    // Factor 2: Budget Adherence (+/- 15 pts)
    let exceededBudgetCount = 0;
    for (const b of budgets) {
      const spentOnCat = monthExpenses
        .filter((tx) => tx.categoryId === b.categoryId)
        .reduce((sum, tx) => sum + tx.amount, 0);
      if (spentOnCat > b.monthlyCap) {
        exceededBudgetCount++;
      }
    }
    if (budgets.length > 0) {
      if (exceededBudgetCount === 0) score += 15;
      else score -= exceededBudgetCount * 8;
    }

    // Factor 3: Cash flow positive vs negative (+/- 10 pts)
    if (totalIncome > totalExpense) score += 10;
    else if (totalExpense > totalIncome) score -= 15;

    score = Math.max(10, Math.min(98, Math.round(score)));

    let grade = 'Fair';
    if (score >= 85) grade = 'Excellent';
    else if (score >= 70) grade = 'Very Good';
    else if (score >= 50) grade = 'Moderate';
    else grade = 'Needs Improvement';

    // Top Category
    const catTotals = {};
    for (const tx of monthExpenses) {
      catTotals[tx.category.name] = (catTotals[tx.category.name] || 0) + tx.amount;
    }
    let topCategory = null;
    let maxSpend = 0;
    for (const [catName, amt] of Object.entries(catTotals)) {
      if (amt > maxSpend) {
        maxSpend = amt;
        topCategory = { name: catName, amount: amt, percentOfTotal: totalExpense > 0 ? Math.round((amt / totalExpense) * 100) : 0 };
      }
    }

    // Top 3 Largest Expenses
    const topExpenses = monthExpenses.slice(0, 3).map((tx) => ({
      id: tx.id,
      description: tx.description || tx.category.name,
      categoryName: tx.category.name,
      amount: tx.amount,
      date: tx.date,
    }));

    // Recommendations Engine
    const tips = [];
    if (savingsRate >= 40) {
      tips.push({
        type: 'success',
        title: 'Outstanding Savings Rate',
        message: `You're currently saving ${Math.round(savingsRate)}% of your income. Consider allocating surplus to high-yield savings or mutual funds.`,
      });
    } else if (savingsRate < 10 && totalIncome > 0) {
      tips.push({
        type: 'warning',
        title: 'Low Monthly Savings Rate',
        message: 'Your savings rate is below the recommended 20% mark. Review non-essential shopping or entertainment outlays.',
      });
    }

    if (topCategory && topCategory.percentOfTotal > 40) {
      tips.push({
        type: 'info',
        title: `High Concentration in ${topCategory.name}`,
        message: `${topCategory.name} accounts for ${topCategory.percentOfTotal}% of all expenses this month. Check if recurring charges can be optimized.`,
      });
    }

    if (exceededBudgetCount > 0) {
      tips.push({
        type: 'danger',
        title: `${exceededBudgetCount} Category Budgets Exceeded`,
        message: `You have surpassed spending limits in ${exceededBudgetCount} categories this month. Check your Budgets tab.`,
      });
    } else if (budgets.length > 0) {
      tips.push({
        type: 'success',
        title: 'All Budgets Maintained',
        message: 'All your category budget limits are currently well within their thresholds!',
      });
    }

    if (user?.monthlyBudget && totalExpense > user.monthlyBudget) {
      tips.push({
        type: 'danger',
        title: 'Overall Target Budget Breached',
        message: `Total spending (${totalExpense.toFixed(0)}) has crossed your target cap of ${user.monthlyBudget}.`,
      });
    }

    return res.json({
      success: true,
      data: {
        score,
        grade,
        dailyAverage: Math.round(dailyAverage),
        projectedMonthEndSpend,
        topCategory,
        topExpenses,
        savingsRate: Math.round(savingsRate),
        exceededBudgetCount,
        tips,
      },
    });
  } catch (error) {
    console.error('Insights error:', error);
    return res.status(500).json({ success: false, error: 'Failed to calculate insights.' });
  }
});

// GET /api/analytics/reports (Deep Financial Analytics)
router.get('/reports', async (req, res) => {
  try {
    const { period = '6m' } = req.query; // '1m', '3m', '6m', '1y', 'all'
    const now = new Date();
    let startDate = new Date();

    if (period === '1m') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === '3m') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (period === '6m') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    } else if (period === '1y') {
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    } else {
      startDate = new Date(2020, 0, 1);
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        userId: req.user.id,
        date: { gte: startDate },
      },
      include: { category: true },
      orderBy: { date: 'asc' },
    });

    // 1. Payment Mode breakdown
    const paymentModes = {};
    let totalExpenseAmount = 0;
    let totalIncomeAmount = 0;

    // 2. Day of Week breakdown (Sunday = 0 to Saturday = 6)
    const dayOfWeekNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeekTotals = [0, 0, 0, 0, 0, 0, 0];

    // 3. Daily timeline
    const dailyMap = {};

    for (const tx of transactions) {
      const isExpense = tx.type === 'EXPENSE';
      if (isExpense) {
        totalExpenseAmount += tx.amount;
        const mode = tx.paymentMode || 'Other';
        paymentModes[mode] = (paymentModes[mode] || 0) + tx.amount;

        const dayIdx = new Date(tx.date).getDay();
        dayOfWeekTotals[dayIdx] += tx.amount;
      } else {
        totalIncomeAmount += tx.amount;
      }

      const dateStr = new Date(tx.date).toISOString().split('T')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, income: 0, expense: 0 };
      }
      if (isExpense) dailyMap[dateStr].expense += tx.amount;
      else dailyMap[dateStr].income += tx.amount;
    }

    const paymentBreakdown = Object.entries(paymentModes).map(([mode, total]) => ({
      mode,
      total: Math.round(total),
      percentage: totalExpenseAmount > 0 ? Math.round((total / totalExpenseAmount) * 100) : 0,
    }));

    const dayOfWeekData = dayOfWeekNames.map((day, idx) => ({
      day,
      amount: Math.round(dayOfWeekTotals[idx]),
    }));

    const dailyTimeline = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    // Top 5 all-time largest expenses in this period
    const topLargest = transactions
      .filter((tx) => tx.type === 'EXPENSE')
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((tx) => ({
        id: tx.id,
        description: tx.description || tx.category.name,
        category: tx.category.name,
        color: tx.category.color,
        amount: tx.amount,
        paymentMode: tx.paymentMode,
        date: tx.date,
      }));

    return res.json({
      success: true,
      data: {
        totalIncome: totalIncomeAmount,
        totalExpense: totalExpenseAmount,
        netSavings: totalIncomeAmount - totalExpenseAmount,
        paymentBreakdown,
        dayOfWeekData,
        dailyTimeline,
        topLargest,
      },
    });
  } catch (error) {
    console.error('Reports error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch financial reports.' });
  }
});

export default router;

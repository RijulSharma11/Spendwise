import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes are protected
router.use(authenticate);

// GET /api/budgets
router.get('/', async (req, res) => {
  try {
    const { monthYear } = req.query;

    const where = { userId: req.user.id };
    if (monthYear) {
      where.monthYear = monthYear;
    }

    const budgets = await prisma.budget.findMany({
      where,
      include: { category: true },
    });

    // Calculate actual spent for each budget
    const budgetsWithSpent = await Promise.all(
      budgets.map(async (budget) => {
        // Parse monthYear (e.g., "2026-11") to get date range
        const [year, month] = budget.monthYear.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0, 23, 59, 59, 999);

        const spent = await prisma.transaction.aggregate({
          where: {
            userId: req.user.id,
            categoryId: budget.categoryId,
            type: 'EXPENSE',
            date: { gte: start, lte: end },
          },
          _sum: { amount: true },
        });

        return {
          ...budget,
          spent: spent._sum.amount || 0,
        };
      })
    );

    return res.json({ success: true, data: { budgets: budgetsWithSpent } });
  } catch (error) {
    console.error('Get budgets error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch budgets.' });
  }
});

// POST /api/budgets
router.post('/', async (req, res) => {
  try {
    const { categoryId, monthlyCap, monthYear } = req.body;

    if (!categoryId || monthlyCap === undefined || !monthYear) {
      return res.status(400).json({ success: false, error: 'categoryId, monthlyCap, and monthYear are required.' });
    }

    // Upsert: find existing budget for this user + category + month
    const existing = await prisma.budget.findFirst({
      where: {
        userId: req.user.id,
        categoryId,
        monthYear,
      },
    });

    let budget;
    if (existing) {
      budget = await prisma.budget.update({
        where: { id: existing.id },
        data: { monthlyCap: parseFloat(monthlyCap) },
        include: { category: true },
      });
    } else {
      budget = await prisma.budget.create({
        data: {
          userId: req.user.id,
          categoryId,
          monthlyCap: parseFloat(monthlyCap),
          monthYear,
        },
        include: { category: true },
      });
    }

    return res.status(existing ? 200 : 201).json({ success: true, data: { budget } });
  } catch (error) {
    console.error('Create/update budget error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create/update budget.' });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.budget.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Budget not found.' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this budget.' });
    }

    await prisma.budget.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Budget deleted successfully.' } });
  } catch (error) {
    console.error('Delete budget error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete budget.' });
  }
});

export default router;

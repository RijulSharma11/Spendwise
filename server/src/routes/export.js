import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes are protected
router.use(authenticate);

// GET /api/export/csv
router.get('/csv', async (req, res) => {
  try {
    const { startDate, endDate, category, type, search } = req.query;

    // Build where clause (same filtering as transactions list)
    const where = { userId: req.user.id };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.categoryId = category;
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    if (search) {
      where.description = { contains: search };
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    // Build CSV
    const headers = ['Date', 'Type', 'Category', 'Amount', 'Payment Mode', 'Description'];
    const rows = transactions.map((tx) => {
      const date = new Date(tx.date).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const description = tx.description ? `"${tx.description.replace(/"/g, '""')}"` : '';
      return [date, tx.type, tx.category.name, tx.amount, tx.paymentMode, description].join(',');
    });

    const csv = [headers.join(','), ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="spendwise-transactions.csv"');

    return res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    return res.status(500).json({ success: false, error: 'Failed to export transactions.' });
  }
});

export default router;

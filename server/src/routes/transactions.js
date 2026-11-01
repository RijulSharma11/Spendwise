import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes are protected
router.use(authenticate);

// GET /api/transactions
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      startDate,
      endDate,
      category,
      type,
      search,
      sortBy = 'date',
      order = 'desc',
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
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
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.date.lte = end;
      }
    }

    if (search) {
      where.description = { contains: search };
    }

    // Build orderBy
    const orderBy = {};
    orderBy[sortBy === 'amount' ? 'amount' : 'date'] = order === 'asc' ? 'asc' : 'desc';

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.transaction.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        transactions,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch transactions.' });
  }
});

// POST /api/transactions
router.post('/', async (req, res) => {
  try {
    const { categoryId, amount, type, paymentMode, description, date, receiptUrl } = req.body;

    if (!categoryId || amount === undefined || !type) {
      return res.status(400).json({ success: false, error: 'categoryId, amount, and type are required.' });
    }

    const transaction = await prisma.transaction.create({
      data: {
        userId: req.user.id,
        categoryId,
        amount: parseFloat(amount),
        type,
        paymentMode: paymentMode || 'UPI',
        description: description || null,
        receiptUrl: receiptUrl || null,
        date: date ? new Date(date) : new Date(),
      },
      include: { category: true },
    });

    return res.status(201).json({ success: true, data: { transaction } });
  } catch (error) {
    console.error('Create transaction error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create transaction.' });
  }
});

// POST /api/transactions/batch-delete
router.post('/batch-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids array is required.' });
    }

    const deleted = await prisma.transaction.deleteMany({
      where: {
        id: { in: ids },
        userId: req.user.id, // Only delete current user's records
      },
    });

    return res.json({ success: true, data: { count: deleted.count } });
  } catch (error) {
    console.error('Batch delete error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete selected transactions.' });
  }
});

// PUT /api/transactions/:id
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this transaction.' });
    }

    const { categoryId, amount, type, paymentMode, description, date, receiptUrl } = req.body;

    const updateData = {};
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (type !== undefined) updateData.type = type;
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (description !== undefined) updateData.description = description;
    if (receiptUrl !== undefined) updateData.receiptUrl = receiptUrl;
    if (date !== undefined) updateData.date = new Date(date);

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    return res.json({ success: true, data: { transaction } });
  } catch (error) {
    console.error('Update transaction error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update transaction.' });
  }
});

// DELETE /api/transactions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.transaction.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }
    if (existing.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this transaction.' });
    }

    await prisma.transaction.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Transaction deleted successfully.' } });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete transaction.' });
  }
});

export default router;

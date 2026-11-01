import { Router } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// All routes are protected
router.use(authenticate);

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: null },
          { userId: req.user.id },
        ],
      },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });

    return res.json({ success: true, data: { categories } });
  } catch (error) {
    console.error('Get categories error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch categories.' });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  try {
    const { name, type, color, icon } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, error: 'Name and type are required.' });
    }

    if (!['INCOME', 'EXPENSE'].includes(type)) {
      return res.status(400).json({ success: false, error: 'Type must be INCOME or EXPENSE.' });
    }

    const category = await prisma.category.create({
      data: {
        userId: req.user.id,
        name,
        type,
        color: color || '#3B82F6',
        icon: icon || 'tag',
      },
    });

    return res.status(201).json({ success: true, data: { category } });
  } catch (error) {
    console.error('Create category error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create category.' });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      return res.status(404).json({ success: false, error: 'Category not found.' });
    }

    // Can only delete custom categories (userId is not null and matches)
    if (category.userId === null) {
      return res.status(403).json({ success: false, error: 'Cannot delete system categories.' });
    }
    if (category.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Not authorized to delete this category.' });
    }

    await prisma.category.delete({ where: { id } });

    return res.json({ success: true, data: { message: 'Category deleted successfully.' } });
  } catch (error) {
    console.error('Delete category error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete category.' });
  }
});

export default router;

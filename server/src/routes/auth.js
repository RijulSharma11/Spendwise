import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Helper to generate JWT and set cookie
function sendTokenResponse(res, user, statusCode = 200) {
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  const { password, ...userData } = user;

  return res.status(statusCode).json({
    success: true,
    data: {
      token,
      user: userData,
    },
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, currency, monthlyBudget } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email and password are required.' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'Email already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        currency: currency || 'INR',
        monthlyBudget: monthlyBudget ? parseFloat(monthlyBudget) : 50000,
      },
    });

    return sendTokenResponse(res, user, 201);
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ success: false, error: 'Failed to register user.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    return sendTokenResponse(res, user);
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, error: 'Failed to login.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        monthlyBudget: true,
        createdAt: true,
      },
    });
    return res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Get me error:', error);
    return res.status(500).json({ success: false, error: 'Failed to get user info.' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, currency, monthlyBudget } = req.body;
    const updateData = {};
    if (name) updateData.name = name.trim();
    if (currency) updateData.currency = currency;
    if (monthlyBudget !== undefined) updateData.monthlyBudget = parseFloat(monthlyBudget);

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        currency: true,
        monthlyBudget: true,
        createdAt: true,
      },
    });

    return res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update profile.' });
  }
});

// PUT /api/auth/password
router.put('/password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current and new passwords are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashedPassword },
    });

    return res.json({ success: true, data: { message: 'Password updated successfully.' } });
  } catch (error) {
    console.error('Update password error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
});

// POST /api/auth/seed-demo
// Pre-loads realistic transactions & budgets for the authenticated user with 1-click!
router.post('/seed-demo', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch system categories
    const categories = await prisma.category.findMany({
      where: { userId: null },
    });

    const catMap = {};
    categories.forEach((c) => {
      catMap[c.name] = c.id;
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    const monthYear = `${currentYear}-${currentMonth}`;

    // Sample budgets
    const budgetCaps = [
      { name: 'Food', cap: 12000 },
      { name: 'Rent', cap: 20000 },
      { name: 'Entertainment', cap: 4000 },
      { name: 'Utilities', cap: 5000 },
      { name: 'Shopping', cap: 8000 },
    ];

    for (const b of budgetCaps) {
      if (catMap[b.name]) {
        await prisma.budget.upsert({
          where: {
            id: `${userId}-${catMap[b.name]}-${monthYear}`,
          },
          update: { monthlyCap: b.cap },
          create: {
            id: `${userId}-${catMap[b.name]}-${monthYear}`,
            userId,
            categoryId: catMap[b.name],
            monthlyCap: b.cap,
            monthYear,
          },
        });
      }
    }

    // Helper for dates
    const makeDate = (daysAgo) => {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      return d;
    };

    const demoTransactions = [
      // Current Month
      { name: 'Salary', amount: 80000, type: 'INCOME', mode: 'Bank Transfer', desc: 'Monthly Salary Credit', daysAgo: 1 },
      { name: 'Rent', amount: 18000, type: 'EXPENSE', mode: 'Bank Transfer', desc: 'Monthly Apartment Rent', daysAgo: 2 },
      { name: 'Food', amount: 3200, type: 'EXPENSE', mode: 'UPI', desc: 'Supermarket Grocery Haul', daysAgo: 3 },
      { name: 'Freelance', amount: 20000, type: 'INCOME', mode: 'UPI', desc: 'Client Website Design Milestone', daysAgo: 5 },
      { name: 'Utilities', amount: 2400, type: 'EXPENSE', mode: 'UPI', desc: 'Electricity & High-speed Wifi', daysAgo: 6 },
      { name: 'Food', amount: 1250, type: 'EXPENSE', mode: 'UPI', desc: 'Weekend Family Dinner', daysAgo: 8 },
      { name: 'Entertainment', amount: 799, type: 'EXPENSE', mode: 'Credit Card', desc: 'Netflix & Prime Subscriptions', daysAgo: 10 },
      { name: 'Shopping', amount: 4500, type: 'EXPENSE', mode: 'Credit Card', desc: 'Winter Apparel on Sale', daysAgo: 12 },
      { name: 'Food', amount: 480, type: 'EXPENSE', mode: 'UPI', desc: 'Starbucks Coffee & Snacks', daysAgo: 14 },
      { name: 'Travel', amount: 1200, type: 'EXPENSE', mode: 'UPI', desc: 'Uber Rides to Tech Meetup', daysAgo: 15 },
      // Previous Month
      { name: 'Salary', amount: 80000, type: 'INCOME', mode: 'Bank Transfer', desc: 'Monthly Salary Credit', daysAgo: 32 },
      { name: 'Investment', amount: 6500, type: 'INCOME', mode: 'Bank Transfer', desc: 'Quarterly Mutual Fund Dividend', daysAgo: 35 },
      { name: 'Rent', amount: 18000, type: 'EXPENSE', mode: 'Bank Transfer', desc: 'Monthly Apartment Rent', daysAgo: 33 },
      { name: 'Food', amount: 4500, type: 'EXPENSE', mode: 'UPI', desc: 'Monthly Groceries at Nature Basket', daysAgo: 38 },
      { name: 'Travel', amount: 8500, type: 'EXPENSE', mode: 'Credit Card', desc: 'Weekend Hill-station Trip', daysAgo: 42 },
      { name: 'Shopping', amount: 6200, type: 'EXPENSE', mode: 'Credit Card', desc: 'Noise-Cancelling Headphones', daysAgo: 45 },
      { name: 'Healthcare', amount: 2500, type: 'EXPENSE', mode: 'UPI', desc: 'Dentist Checkup & Vitamins', daysAgo: 50 },
      // 2 Months Ago
      { name: 'Salary', amount: 80000, type: 'INCOME', mode: 'Bank Transfer', desc: 'Monthly Salary Credit', daysAgo: 62 },
      { name: 'Freelance', amount: 15000, type: 'INCOME', mode: 'UPI', desc: 'API Integration Consulting', daysAgo: 65 },
      { name: 'Rent', amount: 18000, type: 'EXPENSE', mode: 'Bank Transfer', desc: 'Monthly Apartment Rent', daysAgo: 63 },
      { name: 'Food', amount: 3900, type: 'EXPENSE', mode: 'UPI', desc: 'Weekly Grocery Stores', daysAgo: 68 },
      { name: 'Utilities', amount: 2100, type: 'EXPENSE', mode: 'UPI', desc: 'Water and Electricity Bill', daysAgo: 70 },
      { name: 'Entertainment', amount: 1500, type: 'EXPENSE', mode: 'UPI', desc: 'IMAX Cinema Movie Night', daysAgo: 75 },
    ];

    for (const tx of demoTransactions) {
      if (catMap[tx.name]) {
        await prisma.transaction.create({
          data: {
            userId,
            categoryId: catMap[tx.name],
            amount: tx.amount,
            type: tx.type,
            paymentMode: tx.mode,
            description: tx.desc,
            date: makeDate(tx.daysAgo),
          },
        });
      }
    }

    return res.json({
      success: true,
      data: { message: `Successfully seeded ${demoTransactions.length} sample transactions and ${budgetCaps.length} budgets!` },
    });
  } catch (error) {
    console.error('Seed demo data error:', error);
    return res.status(500).json({ success: false, error: 'Failed to seed sample data.' });
  }
});

// DELETE /api/auth/reset-data
router.delete('/reset-data', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.budget.deleteMany({ where: { userId } });
    return res.json({ success: true, data: { message: 'All personal transactions and budgets cleared.' } });
  } catch (error) {
    console.error('Reset data error:', error);
    return res.status(500).json({ success: false, error: 'Failed to reset personal data.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  return res.json({ success: true, data: { message: 'Logged out successfully.' } });
});

export default router;

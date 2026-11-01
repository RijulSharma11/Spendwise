import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Clean existing data
  await prisma.transaction.deleteMany();
  await prisma.budget.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create demo user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const demoUser = await prisma.user.create({
    data: {
      id: uuidv4(),
      name: 'Demo User',
      email: 'demo@spendwise.com',
      password: hashedPassword,
      currency: 'INR',
      monthlyBudget: 50000,
    },
  });
  console.log('Created demo user:', demoUser.email);

  // Create default categories (system-wide, userId=null)
  const expenseCategories = [
    { name: 'Food', type: 'EXPENSE', color: '#EF4444', icon: 'utensils' },
    { name: 'Rent', type: 'EXPENSE', color: '#8B5CF6', icon: 'home' },
    { name: 'Utilities', type: 'EXPENSE', color: '#F59E0B', icon: 'zap' },
    { name: 'Entertainment', type: 'EXPENSE', color: '#EC4899', icon: 'film' },
    { name: 'Travel', type: 'EXPENSE', color: '#06B6D4', icon: 'plane' },
    { name: 'Shopping', type: 'EXPENSE', color: '#10B981', icon: 'shopping-bag' },
    { name: 'Healthcare', type: 'EXPENSE', color: '#6366F1', icon: 'heart-pulse' },
    { name: 'Education', type: 'EXPENSE', color: '#F97316', icon: 'graduation-cap' },
  ];

  const incomeCategories = [
    { name: 'Salary', type: 'INCOME', color: '#22C55E', icon: 'briefcase' },
    { name: 'Freelance', type: 'INCOME', color: '#3B82F6', icon: 'laptop' },
    { name: 'Investment', type: 'INCOME', color: '#A855F7', icon: 'trending-up' },
    { name: 'Other', type: 'INCOME', color: '#64748B', icon: 'wallet' },
  ];

  const allCategoryDefs = [...expenseCategories, ...incomeCategories];
  const categoryMap = {};

  for (const catDef of allCategoryDefs) {
    const cat = await prisma.category.create({
      data: {
        id: uuidv4(),
        userId: null,
        ...catDef,
      },
    });
    categoryMap[cat.name] = cat.id;
  }
  console.log('Created', allCategoryDefs.length, 'default categories');

  // Helper to create a date in the past
  const now = new Date();
  function monthsAgo(months, day = 15) {
    const d = new Date(now.getFullYear(), now.getMonth() - months, day);
    return d;
  }

  // Create 30+ realistic sample transactions spanning the last 6 months
  const transactions = [
    // ---- Current month (0 months ago) ----
    { categoryId: categoryMap['Salary'], amount: 85000, type: 'INCOME', paymentMode: 'Bank Transfer', description: 'Monthly salary - November', date: monthsAgo(0, 1) },
    { categoryId: categoryMap['Freelance'], amount: 15000, type: 'INCOME', paymentMode: 'UPI', description: 'Website redesign project', date: monthsAgo(0, 10) },
    { categoryId: categoryMap['Food'], amount: 2450, type: 'EXPENSE', paymentMode: 'UPI', description: 'Grocery shopping at BigBasket', date: monthsAgo(0, 3) },
    { categoryId: categoryMap['Food'], amount: 850, type: 'EXPENSE', paymentMode: 'UPI', description: 'Dinner at Barbeque Nation', date: monthsAgo(0, 8) },
    { categoryId: categoryMap['Rent'], amount: 18000, type: 'EXPENSE', paymentMode: 'Bank Transfer', description: 'Monthly rent payment', date: monthsAgo(0, 1) },
    { categoryId: categoryMap['Entertainment'], amount: 199, type: 'EXPENSE', paymentMode: 'Credit Card', description: 'Netflix subscription', date: monthsAgo(0, 5) },
    { categoryId: categoryMap['Utilities'], amount: 2100, type: 'EXPENSE', paymentMode: 'UPI', description: 'Electricity bill - October', date: monthsAgo(0, 7) },
    { categoryId: categoryMap['Shopping'], amount: 3500, type: 'EXPENSE', paymentMode: 'Credit Card', description: 'New running shoes on Amazon', date: monthsAgo(0, 12) },

    // ---- 1 month ago ----
    { categoryId: categoryMap['Salary'], amount: 85000, type: 'INCOME', paymentMode: 'Bank Transfer', description: 'Monthly salary - October', date: monthsAgo(1, 1) },
    { categoryId: categoryMap['Investment'], amount: 5000, type: 'INCOME', paymentMode: 'Bank Transfer', description: 'Mutual fund dividend', date: monthsAgo(1, 20) },
    { categoryId: categoryMap['Food'], amount: 3200, type: 'EXPENSE', paymentMode: 'UPI', description: 'Weekly groceries at D-Mart', date: monthsAgo(1, 5) },
    { categoryId: categoryMap['Food'], amount: 1200, type: 'EXPENSE', paymentMode: 'UPI', description: 'Zomato food orders', date: monthsAgo(1, 15) },
    { categoryId: categoryMap['Rent'], amount: 18000, type: 'EXPENSE', paymentMode: 'Bank Transfer', description: 'Monthly rent payment', date: monthsAgo(1, 1) },
    { categoryId: categoryMap['Utilities'], amount: 1800, type: 'EXPENSE', paymentMode: 'UPI', description: 'Electricity bill - September', date: monthsAgo(1, 8) },
    { categoryId: categoryMap['Travel'], amount: 4500, type: 'EXPENSE', paymentMode: 'Credit Card', description: 'Weekend trip to Lonavala', date: monthsAgo(1, 18) },
    { categoryId: categoryMap['Entertainment'], amount: 500, type: 'EXPENSE', paymentMode: 'UPI', description: 'Movie tickets - Pushpa 2', date: monthsAgo(1, 22) },
    { categoryId: categoryMap['Healthcare'], amount: 1500, type: 'EXPENSE', paymentMode: 'UPI', description: 'Doctor consultation fee', date: monthsAgo(1, 12) },

    // ---- 2 months ago ----
    { categoryId: categoryMap['Salary'], amount: 85000, type: 'INCOME', paymentMode: 'Bank Transfer', description: 'Monthly salary - September', date: monthsAgo(2, 1) },
    { categoryId: categoryMap['Freelance'], amount: 25000, type: 'INCOME', paymentMode: 'UPI', description: 'Mobile app development project', date: monthsAgo(2, 15) },
    { categoryId: categoryMap['Food'], amount: 2800, type: 'EXPENSE', paymentMode: 'UPI', description: 'Grocery shopping at Reliance Fresh', date: monthsAgo(2, 4) },
    { categoryId: categoryMap['Rent'], amount: 18000, type: 'EXPENSE', paymentMode: 'Bank Transfer', description: 'Monthly rent payment', date: monthsAgo(2, 1) },
    { categoryId: categoryMap['Shopping'], amount: 12000, type: 'EXPENSE', paymentMode: 'Credit Card', description: 'Diwali shopping - clothes and gifts', date: monthsAgo(2, 20) },
    { categoryId: categoryMap['Utilities'], amount: 2500, type: 'EXPENSE', paymentMode: 'UPI', description: 'Electricity + Internet bill', date: monthsAgo(2, 10) },
    { categoryId: categoryMap['Education'], amount: 5000, type: 'EXPENSE', paymentMode: 'Credit Card', description: 'Udemy course - React advanced', date: monthsAgo(2, 12) },

    // ---- 3 months ago ----
    { categoryId: categoryMap['Salary'], amount: 80000, type: 'INCOME', paymentMode: 'Bank Transfer', description: 'Monthly salary - August', date: monthsAgo(3, 1) },
    { categoryId: categoryMap['Food'], amount: 3500, type: 'EXPENSE', paymentMode: 'UPI', description: 'Monthly groceries at BigBasket', date: monthsAgo(3, 6) },
    { categoryId: categoryMap['Rent'], amount: 18000, type: 'EXPENSE', paymentMode: 'Bank Transfer', description: 'Monthly rent payment', date: monthsAgo(3, 1) },
    { categoryId: categoryMap['Travel'], amount: 15000, type: 'EXPENSE', paymentMode: 'Credit Card', description: 'Flight to Goa - vacation', date: monthsAgo(3, 15) },
    { categoryId: categoryMap['Entertainment'], amount: 299, type: 'EXPENSE', paymentMode: 'Credit Card', description: 'Spotify premium subscription', date: monthsAgo(3, 3) },
    { categoryId: categoryMap['Healthcare'], amount: 3000, type: 'EXPENSE', paymentMode: 'UPI', description: 'Annual health checkup', date: monthsAgo(3, 20) },

    // ---- 4 months ago ----
    { categoryId: categoryMap['Salary'], amount: 80000, type: 'INCOME', paymentMode: 'Bank Transfer', description: 'Monthly salary - July', date: monthsAgo(4, 1) },
    { categoryId: categoryMap['Other'], amount: 10000, type: 'INCOME', paymentMode: 'UPI', description: 'Sold old laptop on OLX', date: monthsAgo(4, 12) },
    { categoryId: categoryMap['Food'], amount: 2600, type: 'EXPENSE', paymentMode: 'UPI', description: 'Swiggy orders - whole month', date: monthsAgo(4, 25) },
    { categoryId: categoryMap['Rent'], amount: 18000, type: 'EXPENSE', paymentMode: 'Bank Transfer', description: 'Monthly rent payment', date: monthsAgo(4, 1) },
    { categoryId: categoryMap['Utilities'], amount: 1900, type: 'EXPENSE', paymentMode: 'UPI', description: 'Electricity bill - June', date: monthsAgo(4, 9) },
    { categoryId: categoryMap['Shopping'], amount: 7500, type: 'EXPENSE', paymentMode: 'Credit Card', description: 'Amazon Prime Day sale haul', date: monthsAgo(4, 20) },

    // ---- 5 months ago ----
    { categoryId: categoryMap['Salary'], amount: 80000, type: 'INCOME', paymentMode: 'Bank Transfer', description: 'Monthly salary - June', date: monthsAgo(5, 1) },
    { categoryId: categoryMap['Investment'], amount: 8000, type: 'INCOME', paymentMode: 'Bank Transfer', description: 'Stock dividend payout', date: monthsAgo(5, 18) },
    { categoryId: categoryMap['Food'], amount: 4200, type: 'EXPENSE', paymentMode: 'UPI', description: 'Birthday party dinner', date: monthsAgo(5, 14) },
    { categoryId: categoryMap['Rent'], amount: 18000, type: 'EXPENSE', paymentMode: 'Bank Transfer', description: 'Monthly rent payment', date: monthsAgo(5, 1) },
    { categoryId: categoryMap['Entertainment'], amount: 1500, type: 'EXPENSE', paymentMode: 'Credit Card', description: 'BookMyShow - concert tickets', date: monthsAgo(5, 22) },
    { categoryId: categoryMap['Education'], amount: 2500, type: 'EXPENSE', paymentMode: 'UPI', description: 'Coursera subscription', date: monthsAgo(5, 8) },
    { categoryId: categoryMap['Utilities'], amount: 2200, type: 'EXPENSE', paymentMode: 'UPI', description: 'Gas + electricity bill', date: monthsAgo(5, 10) },
  ];

  for (const tx of transactions) {
    await prisma.transaction.create({
      data: {
        id: uuidv4(),
        userId: demoUser.id,
        ...tx,
      },
    });
  }
  console.log('Created', transactions.length, 'sample transactions');

  // Create sample budgets for the current month
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const budgetDefs = [
    { categoryName: 'Food', monthlyCap: 15000 },
    { categoryName: 'Rent', monthlyCap: 20000 },
    { categoryName: 'Entertainment', monthlyCap: 5000 },
    { categoryName: 'Travel', monthlyCap: 10000 },
    { categoryName: 'Shopping', monthlyCap: 8000 },
  ];

  for (const b of budgetDefs) {
    await prisma.budget.create({
      data: {
        id: uuidv4(),
        userId: demoUser.id,
        categoryId: categoryMap[b.categoryName],
        monthlyCap: b.monthlyCap,
        monthYear: currentMonthYear,
      },
    });
  }
  console.log('Created', budgetDefs.length, 'sample budgets for', currentMonthYear);

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import express from 'express';
import { db } from '../models/index.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// GET /api/dashboard
router.get('/', authenticateToken, async (req, res) => {
  try {
    const invoices = await (req.db ? req.db.invoices.find() : db.invoices.find({ workspace_id: req.workspace_id }));
    const customerCount = await (req.db ? req.db.customers.count() : db.customers.count({ workspace_id: req.workspace_id }));
    const catalogCount = await (req.db ? req.db.catalog.count() : db.catalog.count({ workspace_id: req.workspace_id }));

    let totalRevenue = 0;
    let totalOutstanding = 0;
    let totalTaxCollected = 0;
    let totalCgstCollected = 0;
    let totalSgstCollected = 0;
    let totalIgstCollected = 0;

    const statusCounts = {
      Draft: 0,
      Sent: 0,
      Paid: 0,
      Partial: 0,
      Overdue: 0,
      Cancelled: 0
    };

    const todayStr = new Date().toISOString().split('T')[0];

    // Compute monthly trend for the last 6 months
    const monthMap = {};
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
      monthMap[key] = { month: label, revenue: 0, tax: 0, count: 0 };
      months.push(key);
    }

    invoices.forEach(inv => {
      // Overdue check
      let currentStatus = inv.status;
      if ((currentStatus === 'Sent' || currentStatus === 'Partial' || currentStatus === 'Draft') && inv.dueDate < todayStr) {
        currentStatus = 'Overdue';
      }

      if (statusCounts[currentStatus] !== undefined) {
        statusCounts[currentStatus]++;
      } else {
        statusCounts[currentStatus] = 1;
      }

      const grandTotal = Number(inv.grandTotal) || 0;
      const amountPaid = Number(inv.paymentDetails?.amountPaid) || (currentStatus === 'Paid' ? grandTotal : 0);

      if (currentStatus === 'Paid' || currentStatus === 'Partial') {
        totalRevenue += amountPaid;
      }

      if (currentStatus !== 'Paid' && currentStatus !== 'Cancelled') {
        const remaining = grandTotal - amountPaid;
        if (remaining > 0) totalOutstanding += remaining;
      }

      // Tax collected proportional to paid or total
      const taxRateRatio = grandTotal > 0 ? (amountPaid / grandTotal) : 0;
      if (currentStatus === 'Paid') {
        totalTaxCollected += Number(inv.totalTaxAmount) || 0;
        totalCgstCollected += Number(inv.totalCgstAmount) || 0;
        totalSgstCollected += Number(inv.totalSgstAmount) || 0;
        totalIgstCollected += Number(inv.totalIgstAmount) || 0;
      } else if (currentStatus === 'Partial') {
        totalTaxCollected += (Number(inv.totalTaxAmount) || 0) * taxRateRatio;
        totalCgstCollected += (Number(inv.totalCgstAmount) || 0) * taxRateRatio;
        totalSgstCollected += (Number(inv.totalSgstAmount) || 0) * taxRateRatio;
        totalIgstCollected += (Number(inv.totalIgstAmount) || 0) * taxRateRatio;
      }

      // Group by month
      if (inv.invoiceDate) {
        const mKey = inv.invoiceDate.substring(0, 7);
        if (monthMap[mKey]) {
          monthMap[mKey].revenue += (currentStatus === 'Paid' ? grandTotal : amountPaid);
          monthMap[mKey].tax += (Number(inv.totalTaxAmount) || 0);
          monthMap[mKey].count += 1;
        }
      }
    });

    // Sort recent invoices by date descending
    const sortedInvoices = [...invoices].sort((a, b) => {
      const dateA = new Date(a.invoiceDate || 0).getTime();
      const dateB = new Date(b.invoiceDate || 0).getTime();
      return dateB - dateA;
    });

    const recentInvoices = sortedInvoices.slice(0, 6);

    res.json({
      success: true,
      metrics: {
        totalRevenue: Math.round(totalRevenue * 100) / 100,
        totalOutstanding: Math.round(totalOutstanding * 100) / 100,
        totalTaxCollected: Math.round(totalTaxCollected * 100) / 100,
        taxBreakup: {
          cgst: Math.round(totalCgstCollected * 100) / 100,
          sgst: Math.round(totalSgstCollected * 100) / 100,
          igst: Math.round(totalIgstCollected * 100) / 100
        },
        totalInvoices: invoices.length,
        statusCounts,
        customerCount,
        catalogCount
      },
      monthlyTrends: months.map(m => monthMap[m]),
      recentInvoices
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import express from 'express';
import { db } from '../models/index.js';
import { authenticateToken } from './auth.js';
import { validateGSTIN } from '../utils/gstUtils.js';

const router = express.Router();

// GET /api/customers
router.get('/', authenticateToken, async (req, res) => {
  try {
    const customers = await db.customers.find();
    res.json({ success: true, customers });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/customers/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const customer = await db.customers.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, customer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/customers
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, companyName, gstin, email, phone, billingAddress, shippingAddress, notes } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Customer name and email are required.' });
    }

    // Validate GSTIN if provided
    let isB2B = false;
    if (gstin && gstin.trim()) {
      const stateCode = billingAddress?.stateCode;
      const gstinVal = validateGSTIN(gstin, stateCode);
      if (!gstinVal.valid) {
        return res.status(400).json({ success: false, message: gstinVal.error });
      }
      isB2B = true;
    }

    const newCustomer = await db.customers.create({
      name,
      companyName: companyName || '',
      gstin: gstin ? gstin.trim().toUpperCase() : '',
      isB2B,
      email: email.trim().toLowerCase(),
      phone: phone || '',
      billingAddress: billingAddress || {},
      shippingAddress: shippingAddress || {},
      notes: notes || ''
    });

    res.status(201).json({ success: true, customer: newCustomer });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/customers/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;

    if (updates.gstin && updates.gstin.trim()) {
      const stateCode = updates.billingAddress?.stateCode;
      const gstinVal = validateGSTIN(updates.gstin, stateCode);
      if (!gstinVal.valid) {
        return res.status(400).json({ success: false, message: gstinVal.error });
      }
      updates.gstin = updates.gstin.trim().toUpperCase();
      updates.isB2B = true;
    } else if (updates.gstin === '') {
      updates.isB2B = false;
    }

    const updated = await db.customers.update(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, customer: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await db.customers.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }
    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

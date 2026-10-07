import express from 'express';
import { db } from '../models/index.js';
import { authenticateToken } from './auth.js';
import { validateHsnSac } from '../utils/gstUtils.js';

const router = express.Router();

// GET /api/catalog
router.get('/', authenticateToken, async (req, res) => {
  try {
    const items = await (req.db ? req.db.catalog.find() : db.catalog.find({ workspace_id: req.workspace_id }));
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/catalog/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const item = await (req.db ? req.db.catalog.findById(req.params.id) : db.catalog.findById(req.params.id, req.workspace_id));
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, item });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/catalog
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, type, hsnSacCode, unitPrice, unit, defaultGstRate } = req.body;

    if (!name || unitPrice === undefined || !hsnSacCode) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, Unit Price, and HSN/SAC code are required.' 
      });
    }

    // Validate HSN/SAC code
    const hsnVal = validateHsnSac(hsnSacCode, type || 'SERVICES');
    if (!hsnVal.valid) {
      return res.status(400).json({ success: false, message: hsnVal.error });
    }

    const itemData = {
      name,
      description: description || '',
      type: type || 'SERVICES',
      hsnSacCode: hsnVal.code,
      unitPrice: Number(unitPrice),
      unit: unit || (type === 'SERVICES' ? 'HRS' : 'NOS'),
      defaultGstRate: Number(defaultGstRate) || 18,
      isActive: true,
      workspace_id: req.workspace_id
    };

    const newItem = await (req.db ? req.db.catalog.create(itemData) : db.catalog.create(itemData));

    res.status(201).json({ success: true, item: newItem });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/catalog/:id
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;

    if (updates.hsnSacCode) {
      const hsnVal = validateHsnSac(updates.hsnSacCode, updates.type || 'SERVICES');
      if (!hsnVal.valid) {
        return res.status(400).json({ success: false, message: hsnVal.error });
      }
      updates.hsnSacCode = hsnVal.code;
    }

    if (updates.unitPrice !== undefined) updates.unitPrice = Number(updates.unitPrice);
    if (updates.defaultGstRate !== undefined) updates.defaultGstRate = Number(updates.defaultGstRate);

    const updated = await (req.db ? req.db.catalog.update(req.params.id, updates) : db.catalog.update(req.params.id, updates, req.workspace_id));
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, item: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/catalog/:id
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const deleted = await (req.db ? req.db.catalog.delete(req.params.id) : db.catalog.delete(req.params.id, req.workspace_id));
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.json({ success: true, message: 'Item deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import express from 'express';
import { db } from '../models/index.js';
import { authenticateToken } from './auth.js';
import { validateGSTIN, GST_STATES } from '../utils/gstUtils.js';

const router = express.Router();

// GET /api/business
router.get('/', authenticateToken, async (req, res) => {
  try {
    const profile = await db.business.getProfile();
    res.json({ success: true, business: profile, states: GST_STATES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/business
router.put('/', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;

    // Validate GSTIN if provided
    if (updates.gstin) {
      const gstinVal = validateGSTIN(updates.gstin, updates.stateCode);
      if (!gstinVal.valid) {
        return res.status(400).json({ success: false, message: gstinVal.error });
      }
      // Auto-extract PAN from GSTIN (chars 3 to 12)
      if (!updates.pan) {
        updates.pan = gstinVal.pan;
      }
    }

    const updated = await db.business.updateProfile(updates);
    res.json({ success: true, business: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

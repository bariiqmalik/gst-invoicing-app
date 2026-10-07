import express from 'express';
import { db } from '../models/index.js';
import { authenticateToken } from './auth.js';
import { validateGSTIN, GST_STATES } from '../utils/gstUtils.js';

const router = express.Router();

// GET /api/business
router.get('/', authenticateToken, async (req, res) => {
  try {
    const profile = await (req.db ? req.db.business.getProfile() : db.business.getProfile(req.workspace_id));
    res.json({ success: true, business: profile, states: GST_STATES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/business
router.put('/', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;

    // Strict Indian GST Compliance Validation
    if (updates.gstin && updates.gstin.trim()) {
      const strippedGstin = updates.gstin.trim().replace(/[\s-]/g, '').toUpperCase();

      if (strippedGstin.length !== 15) {
        return res.status(400).json({
          success: false,
          message: `GSTIN must be exactly 15 characters (currently ${strippedGstin.length}). Example: 27AABCV1234F1Z8`
        });
      }

      const gstinStateCode = strippedGstin.substring(0, 2);
      const targetStateCode = updates.stateCode ? String(updates.stateCode).padStart(2, '0') : null;

      // Strict State Code Match Check
      if (targetStateCode && gstinStateCode !== targetStateCode) {
        const gstinState = GST_STATES.find(s => s.code === gstinStateCode)?.name || gstinStateCode;
        const selectedState = GST_STATES.find(s => s.code === targetStateCode)?.name || targetStateCode;
        return res.status(400).json({
          success: false,
          message: `GSTIN State Code Mismatch: GSTIN starts with '${gstinStateCode}' (${gstinState}), which does not match registered state '${targetStateCode}' (${selectedState}). The first 2 digits of your 15-digit GSTIN must exactly match the registered state code.`
        });
      }

      const gstinVal = validateGSTIN(strippedGstin, targetStateCode);
      if (!gstinVal.valid) {
        return res.status(400).json({ success: false, message: gstinVal.error });
      }

      // Auto-extract PAN from GSTIN (chars 3 to 12)
      updates.pan = gstinVal.pan;
      updates.gstin = strippedGstin;
      updates.stateCode = gstinVal.stateCode;
      updates.state = gstinVal.stateName;
    } else if (updates.stateCode) {
      // Sync state name if only stateCode is changed
      const st = GST_STATES.find(s => s.code === String(updates.stateCode).padStart(2, '0'));
      if (st) {
        updates.stateCode = st.code;
        updates.state = st.name;
      }
    }

    const updated = await (req.db ? req.db.business.updateProfile(updates) : db.business.updateProfile(updates, req.workspace_id));
    res.json({ success: true, business: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

import express from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../models/index.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';
import { validateGSTIN, GST_STATES } from '../utils/gstUtils.js';

const router = express.Router();

// GET /api/workspaces (List all workspaces user has access to)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const allWorkspaces = await db.workspaces.find();
    const userWorkspaces = allWorkspaces.filter(ws => 
      String(ws.owner_id) === String(req.userId) || 
      String(ws.id) === String(req.workspace_id)
    );

    res.json({
      success: true,
      workspaces: userWorkspaces.length > 0 ? userWorkspaces : allWorkspaces,
      activeWorkspaceId: req.workspace_id
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/workspaces/current (Get active workspace details)
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const workspace = await req.db.workspaces.get();
    if (!workspace) {
      return res.status(404).json({ success: false, message: 'Active workspace not found' });
    }
    res.json({ success: true, workspace, states: GST_STATES });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/workspaces (Create a new workspace under current user)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, gstin, address, phone, email, state, stateCode } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Workspace name is required.' });
    }

    let pan = '';
    let cleanGstin = '';
    if (gstin && gstin.trim()) {
      const gstinVal = validateGSTIN(gstin.trim(), stateCode || null);
      if (!gstinVal.valid) {
        return res.status(400).json({ success: false, message: gstinVal.error });
      }
      pan = gstinVal.pan;
      cleanGstin = gstin.trim().toUpperCase();
    }

    const newWorkspace = await db.workspaces.create({
      name: name.trim(),
      legalName: name.trim(),
      tradeName: name.trim(),
      gstin: cleanGstin,
      pan: pan,
      address: address || (state ? `${state}` : ''),
      phone: phone || '',
      email: email || '',
      owner_id: req.userId,
      state: state || 'Maharashtra',
      stateCode: stateCode || '27',
      invoicePrefix: 'INV-2024-',
      nextInvoiceNumber: 101,
      created_at: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      workspace: newWorkspace,
      message: `Workspace "${newWorkspace.name}" created successfully!`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/workspaces/current (Update active workspace details)
router.put('/current', authenticateToken, async (req, res) => {
  try {
    const updates = req.body;

    if (updates.gstin && updates.gstin.trim()) {
      const stripped = updates.gstin.trim().replace(/[\s-]/g, '').toUpperCase();
      if (stripped.length !== 15) {
        return res.status(400).json({
          success: false,
          message: `GSTIN must be exactly 15 characters (currently ${stripped.length}).`
        });
      }
      const gstinVal = validateGSTIN(stripped, updates.stateCode || null);
      if (!gstinVal.valid) {
        return res.status(400).json({ success: false, message: gstinVal.error });
      }
      updates.gstin = stripped;
      updates.pan = gstinVal.pan;
      updates.stateCode = gstinVal.stateCode;
      updates.state = gstinVal.stateName;
    }

    if (updates.name && !updates.legalName) {
      updates.legalName = updates.name;
    } else if (updates.legalName && !updates.name) {
      updates.name = updates.legalName;
    }

    const updated = await req.db.workspaces.update(updates);
    res.json({ success: true, workspace: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/workspaces/switch (Switch active workspace & re-issue JWT)
router.post('/switch', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'workspaceId is required' });
    }

    const targetWorkspace = await db.workspaces.findById(workspaceId);
    if (!targetWorkspace) {
      return res.status(404).json({ success: false, message: 'Workspace not found' });
    }

    const user = await db.users.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update active workspace on user record
    await db.users.update(user.id, { workspace_id: targetWorkspace.id });

    // Issue refreshed token with new workspace_id
    const newToken = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        workspace_id: String(targetWorkspace.id),
        role: user.role || 'owner',
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token: newToken,
      workspace: targetWorkspace,
      message: `Active workspace switched to "${targetWorkspace.name}"`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

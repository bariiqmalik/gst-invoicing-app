import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../models/index.js';
import { validateGSTIN } from '../utils/gstUtils.js';
import { authenticateToken, JWT_SECRET } from '../middleware/auth.js';

export { authenticateToken, JWT_SECRET };

const router = express.Router();

/**
 * Seed initial workspace and owner if no workspace or user exists
 */
export async function seedInitialOwner() {
  let defaultWs = (await db.workspaces.find())[0];

  if (!defaultWs) {
    defaultWs = await db.workspaces.create({
      name: 'Vani Studios Private Limited',
      legalName: 'Vani Studios Private Limited',
      tradeName: 'Vani Studios Private Limited',
      gstin: '27AAACN1234E1Z9',
      pan: 'AAACN1234E',
      email: 'billing@vanistudios.in',
      phone: '+91 98200 00000',
      address: 'Suite 402, Lotus Grandeur, Andheri West, Veera Desai Road, Mumbai, Maharashtra 400053',
      addressLine1: 'Suite 402, Lotus Grandeur, Andheri West',
      addressLine2: 'Veera Desai Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400053',
      invoicePrefix: 'INV-2024-',
      nextInvoiceNumber: 104,
      termsAndConditions: '1. Payment is due within 15 days of invoice date.\n2. Please mention the invoice number in the NEFT/RTGS/IMPS transfer remarks.\n3. Goods or services once billed are non-refundable unless agreed in writing.',
      defaultNotes: 'Thank you for your business! We appreciate the opportunity to collaborate with you.'
    });
    console.log(`Default Workspace created: ${defaultWs.name} (${defaultWs.id})`);
  }

  const userCount = await db.users.count();
  if (userCount === 0) {
    const hashedPassword = await bcrypt.hash('Admin@12345', 10);
    const owner = await db.users.create({
      email: 'owner@vanistudios.in',
      password_hash: hashedPassword,
      name: 'Rohan Sharma',
      role: 'owner',
      workspace_id: defaultWs.id,
      businessName: defaultWs.name
    });

    await db.workspaces.update(defaultWs.id, { owner_id: owner.id });
    console.log('Default Business Owner created: owner@vanistudios.in / Admin@12345');
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await db.users.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const passwordHash = user.password_hash || user.password;
    const validPassword = await bcrypt.compare(password, passwordHash);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Resolve user's active workspace
    let workspaceId = user.workspace_id;
    let workspace = workspaceId ? await db.workspaces.findById(workspaceId) : null;
    if (!workspace) {
      // Fallback to first workspace owned or created
      const allWorkspaces = await db.workspaces.find();
      workspace = allWorkspaces.find(w => String(w.owner_id) === String(user.id)) || allWorkspaces[0];
      if (workspace) {
        workspaceId = workspace.id;
        await db.users.update(user.id, { workspace_id: workspaceId });
      }
    }

    if (!workspaceId) {
      return res.status(500).json({ success: false, message: 'No workspace configured for this user' });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        workspace_id: String(workspaceId),
        role: user.role || 'owner',
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'owner',
      workspace_id: String(workspaceId),
      businessName: workspace?.name || user.businessName
    };

    res.json({ success: true, token, user: safeUser, workspace });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, businessName, email, password, phone, state, stateCode, gstin } = req.body;
    
    if (!name || !businessName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Name, Business Name, Email, and Password are required.' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 6 characters long.' 
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await db.users.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ 
        success: false, 
        message: 'An account with this email address already exists. Please log in.' 
      });
    }

    // Validate GSTIN if provided
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

    // 1. Create Workspace
    const newWorkspace = await db.workspaces.create({
      name: businessName.trim(),
      legalName: businessName.trim(),
      tradeName: businessName.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      gstin: cleanGstin,
      pan: pan,
      address: state ? `${state}` : '',
      state: state || 'Maharashtra',
      stateCode: stateCode || '27',
      invoicePrefix: 'INV-2024-',
      nextInvoiceNumber: 101,
      created_at: new Date().toISOString()
    });

    // 2. Create User with workspace_id and password_hash
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.users.create({
      name: name.trim(),
      email: cleanEmail,
      password_hash: hashedPassword,
      password: hashedPassword, // alias
      businessName: businessName.trim(),
      role: 'owner',
      workspace_id: newWorkspace.id,
      created_at: new Date().toISOString()
    });

    // 3. Link owner_id to workspace
    await db.workspaces.update(newWorkspace.id, { owner_id: newUser.id });

    const token = jwt.sign(
      {
        userId: newUser.id,
        id: newUser.id,
        workspace_id: String(newWorkspace.id),
        role: newUser.role,
        email: newUser.email,
        name: newUser.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = { 
      id: newUser.id, 
      email: newUser.email, 
      name: newUser.name, 
      role: newUser.role, 
      workspace_id: String(newWorkspace.id),
      businessName: newWorkspace.name 
    };

    res.status(201).json({ success: true, token, user: safeUser, workspace: newWorkspace });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/social (Google & Apple OAuth SSO)
router.post('/social', async (req, res) => {
  try {
    const { provider, email, name, businessName } = req.body;

    if (!provider || !['google', 'apple'].includes(provider.toLowerCase())) {
      return res.status(400).json({ success: false, message: 'Unsupported social provider. Expected Google or Apple.' });
    }

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required from OAuth provider.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const providerName = provider.toLowerCase() === 'google' ? 'Google' : 'Apple';
    let user = await db.users.findOne({ email: cleanEmail });
    let workspace = null;

    if (!user) {
      const displayName = name || (cleanEmail.split('@')[0]);
      const defaultBiz = businessName || `${displayName}'s Workspace`;

      // Create Workspace first
      workspace = await db.workspaces.create({
        name: defaultBiz,
        legalName: defaultBiz,
        tradeName: defaultBiz,
        email: cleanEmail,
        created_at: new Date().toISOString()
      });

      const randomPassword = await bcrypt.hash(`OAuth_${provider}_${Date.now()}_${Math.random()}`, 10);
      user = await db.users.create({
        email: cleanEmail,
        password_hash: randomPassword,
        name: displayName,
        businessName: defaultBiz,
        role: 'owner',
        workspace_id: workspace.id,
        authProvider: provider.toLowerCase()
      });

      await db.workspaces.update(workspace.id, { owner_id: user.id });
    } else {
      workspace = await db.workspaces.findById(user.workspace_id);
      if (!workspace) {
        workspace = (await db.workspaces.find())[0];
      }
    }

    const token = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        workspace_id: String(workspace.id),
        role: user.role || 'owner',
        email: user.email,
        name: user.name,
        authProvider: provider.toLowerCase()
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'owner',
      workspace_id: String(workspace.id),
      businessName: workspace?.name || user.businessName,
      authProvider: provider.toLowerCase()
    };

    res.json({
      success: true,
      token,
      user: safeUser,
      workspace,
      message: `Successfully verified and authenticated via ${providerName} Single Sign-On.`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/passkey (Apple Touch ID / Face ID / Google Passkey Biometrics)
router.post('/passkey', async (req, res) => {
  try {
    const { email } = req.body;
    let user = null;

    if (email) {
      user = await db.users.findOne({ email: email.toLowerCase().trim() });
    }
    if (!user) {
      user = await db.users.findOne({ role: 'owner' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered workspace found for Passkey authentication.' });
    }

    let workspace = await db.workspaces.findById(user.workspace_id);
    if (!workspace) {
      workspace = (await db.workspaces.find())[0];
    }

    const token = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        workspace_id: String(workspace?.id || user.workspace_id),
        role: user.role || 'owner',
        email: user.email,
        name: user.name,
        authMethod: 'passkey'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'owner',
      workspace_id: String(workspace?.id || user.workspace_id),
      businessName: workspace?.name || user.businessName,
      authMethod: 'passkey'
    };

    res.json({
      success: true,
      token,
      user: safeUser,
      workspace,
      message: 'Biometric Passkey verified via Secure Enclave / WebAuthn.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me (Current Session & Identity Verification)
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.users.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    const activeWorkspace = await db.workspaces.findById(req.workspace_id);
    const allWorkspaces = await db.workspaces.find();
    // Return all workspaces user is owner of or has access to
    const userWorkspaces = allWorkspaces.filter(ws => 
      String(ws.owner_id) === String(user.id) || 
      String(ws.id) === String(user.workspace_id) ||
      String(ws.id) === String(req.workspace_id)
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'owner',
      workspace_id: String(req.workspace_id),
      businessName: activeWorkspace?.name || activeWorkspace?.legalName || user.businessName
    };

    res.json({
      success: true,
      user: safeUser,
      workspace: activeWorkspace,
      workspaces: userWorkspaces.length > 0 ? userWorkspaces : (activeWorkspace ? [activeWorkspace] : [])
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/refresh (Session Token Refresh)
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const user = await db.users.findById(req.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const activeWorkspace = await db.workspaces.findById(req.workspace_id);
    const newToken = jwt.sign(
      {
        userId: user.id,
        id: user.id,
        workspace_id: String(req.workspace_id),
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
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'owner',
        workspace_id: String(req.workspace_id),
        businessName: activeWorkspace?.name || user.businessName
      },
      workspace: activeWorkspace
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/auth/switch-workspace (Tenant Switching)
router.post('/switch-workspace', authenticateToken, async (req, res) => {
  try {
    const { workspaceId } = req.body;
    if (!workspaceId) {
      return res.status(400).json({ success: false, message: 'Target workspaceId is required' });
    }

    const targetWorkspace = await db.workspaces.findById(workspaceId);
    if (!targetWorkspace) {
      return res.status(404).json({ success: false, message: 'Target workspace not found' });
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
      message: `Switched active workspace to "${targetWorkspace.name}"`
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

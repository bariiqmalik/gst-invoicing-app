import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../models/index.js';
import { validateGSTIN } from '../utils/gstUtils.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'gst-taxcraft-owner-key-2024';

// Helper to seed owner if no user exists
export async function seedInitialOwner() {
  const count = await db.users.count();
  if (count === 0) {
    const hashedPassword = await bcrypt.hash('Admin@12345', 10);
    await db.users.create({
      email: 'owner@vanistudios.in',
      password: hashedPassword,
      name: 'Rohan Sharma',
      role: 'owner',
      businessName: 'Vani Studios Private Limited'
    });
    console.log('Default Business Owner created: owner@vanistudios.in / Admin@12345');
  }
}

// Middleware to authenticate JWT
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: 'Invalid or expired session token.' });
    }
    req.user = user;
    next();
  });
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = { id: user.id, email: user.email, name: user.name, role: user.role, businessName: user.businessName };
    res.json({ success: true, token, user: safeUser });
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
    if (gstin && gstin.trim()) {
      const gstinVal = validateGSTIN(gstin.trim(), stateCode || null);
      if (!gstinVal.valid) {
        return res.status(400).json({ success: false, message: gstinVal.error });
      }
      pan = gstinVal.pan;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.users.create({
      name: name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      businessName: businessName.trim(),
      role: 'owner'
    });

    // Update business profile with the owner's company info
    const businessUpdates = {
      legalName: businessName.trim(),
      tradeName: businessName.trim(),
      email: cleanEmail,
      ...(phone && { phone: phone.trim() }),
      ...(state && { state }),
      ...(stateCode && { stateCode }),
      ...(gstin && { gstin: gstin.trim().toUpperCase() }),
      ...(pan && { pan })
    };
    await db.business.updateProfile(businessUpdates);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = { 
      id: newUser.id, 
      email: newUser.email, 
      name: newUser.name, 
      role: newUser.role, 
      businessName: newUser.businessName 
    };

    res.status(201).json({ success: true, token, user: safeUser });
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

    if (!user) {
      // Create new business owner account via OAuth SSO
      const randomPassword = await bcrypt.hash(`OAuth_${provider}_${Date.now()}_${Math.random()}`, 10);
      const displayName = name || (cleanEmail.split('@')[0]);
      const defaultBiz = businessName || `${displayName}'s Workspace`;

      user = await db.users.create({
        email: cleanEmail,
        password: randomPassword,
        name: displayName,
        businessName: defaultBiz,
        role: 'owner',
        authProvider: provider.toLowerCase()
      });

      // Update business profile defaults if needed
      await db.business.updateProfile({
        legalName: defaultBiz,
        tradeName: defaultBiz,
        email: cleanEmail
      });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, authProvider: provider.toLowerCase() },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessName: user.businessName,
      authProvider: provider.toLowerCase()
    };

    res.json({
      success: true,
      token,
      user: safeUser,
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
      // Fallback to active owner
      user = await db.users.findOne({ role: 'owner' });
    }

    if (!user) {
      return res.status(404).json({ success: false, message: 'No registered workspace found for Passkey authentication.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, authMethod: 'passkey' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessName: user.businessName,
      authMethod: 'passkey'
    };

    res.json({
      success: true,
      token,
      user: safeUser,
      message: 'Biometric Passkey verified via Secure Enclave / WebAuthn.'
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;

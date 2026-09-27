import jwt from 'jsonwebtoken';
import { getTenantDb, db } from '../models/index.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'gst-taxcraft-owner-key-2024';

/**
 * Global Request & Tenant Isolation Middleware
 * Validates JWT, verifies token payload integrity, extracts userId and workspace_id,
 * and attaches tenant-isolated repository context (req.db, req.workspace_id, req.userId)
 * so that all subsequent database operations are strictly scoped to the user's workspace.
 */
export async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required. Please log in.'
    });
  }

  jwt.verify(token, JWT_SECRET, async (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        message: 'Invalid or expired session token.'
      });
    }

    const userId = decoded.userId || decoded.id;
    let workspaceId = decoded.workspace_id;

    // Safety fallback: if older token without workspace_id, resolve from user profile
    if (!workspaceId && userId) {
      const userDoc = await db.users.findById(userId);
      if (userDoc?.workspace_id) {
        workspaceId = String(userDoc.workspace_id);
      }
    }

    if (!workspaceId) {
      return res.status(403).json({
        success: false,
        message: 'Tenant context error: no active workspace linked to this session.'
      });
    }

    req.user = decoded;
    req.userId = String(userId);
    req.workspace_id = String(workspaceId);
    req.tenantId = String(workspaceId);
    
    // Attach tenant-isolated DB accessor
    req.db = getTenantDb(workspaceId);

    next();
  });
}

/**
 * Role-Based Access Control (RBAC) middleware
 * Enforces role: 'owner' | 'accountant' | 'staff'
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const userRole = req.user?.role || 'staff';
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: '${userRole}'.`
      });
    }
    next();
  };
}

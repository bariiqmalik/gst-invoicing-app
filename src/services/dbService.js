/**
 * dbService.js — Unified database layer with Supabase + Express REST fallback
 *
 * Architecture:
 *   - Primary: Supabase PostgREST client (when VITE_SUPABASE_URL and key are configured).
 *   - Fallback: Built-in Express backend (api.js -> /api/*) runs on Vercel serverless
 *     and local Node dev server.
 *   - If Supabase client is null (e.g. env vars not set in Vercel) or if Supabase tables
 *     do not exist (PGRST205), operations seamlessly execute via the Express API.
 *   - This prevents runtime errors like "Cannot read properties of null (reading 'from')".
 *
 * Error contract:
 *   Every function returns { data, error } where error is null on success.
 *   Callers should check `if (error) { ... }`.
 */

import { supabase } from '../lib/supabaseClient.js';
import { api } from './api.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Checks if a Supabase error indicates the table does not exist or relation is missing.
 */
function isTableMissingOrSupabaseError(error) {
  if (!error) return false;
  const msg = String(error.message || '').toLowerCase();
  const code = String(error.code || '');
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes('schema cache') ||
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('failed to fetch')
  );
}

/**
 * Wraps a Supabase query promise and normalises errors safely.
 */
async function run(queryPromise) {
  try {
    const { data, error } = await queryPromise;
    if (error) {
      console.warn('[dbService] Supabase query notice:', error.message, error.details ?? '');
    }
    return { data, error };
  } catch (err) {
    console.warn('[dbService] Supabase operation threw:', err.message);
    return { data: null, error: err };
  }
}

/** Returns a stable workspace key from localStorage (set after login via api.js) */
function getWorkspaceId() {
  return localStorage.getItem('billgst_workspace_id') || null;
}

/** Persist the workspace_id so every subsequent call is scoped */
export function setWorkspaceId(id) {
  if (id) localStorage.setItem('billgst_workspace_id', String(id));
  else localStorage.removeItem('billgst_workspace_id');
}

// ─────────────────────────────────────────────────────────────
// BUSINESS PROFILE
// ─────────────────────────────────────────────────────────────

export const businessService = {
  /**
   * Fetch the business profile for the current workspace.
   * Returns a single object (or null if not found).
   */
  async getProfile() {
    if (supabase) {
      try {
        const workspaceId = getWorkspaceId();
        let query = supabase
          .from('business_profiles')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1);

        if (workspaceId) query = query.eq('workspace_id', workspaceId);

        const { data, error } = await run(query.maybeSingle());
        if (!error) {
          return { data: data ? normaliseBusinessRow(data) : null, error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase getProfile failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase getProfile threw, fallback to REST API:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.getBusiness();
      return { data: res.business ? normaliseBusinessRow(res.business) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Upsert the business profile.
   * If a row exists for this workspace it is updated; otherwise inserted.
   */
  async updateProfile(profileData) {
    if (supabase) {
      try {
        const workspaceId = getWorkspaceId();
        const row = toBusinessRow(profileData, workspaceId);

        let existingId = profileData.id || null;
        if (!existingId && workspaceId) {
          const { data: existing } = await run(
            supabase.from('business_profiles')
              .select('id')
              .eq('workspace_id', workspaceId)
              .maybeSingle()
          );
          existingId = existing?.id || null;
        }

        let result;
        if (existingId) {
          result = await run(
            supabase.from('business_profiles')
              .update({ ...row, updated_at: new Date().toISOString() })
              .eq('id', existingId)
              .select()
              .single()
          );
        } else {
          result = await run(
            supabase.from('business_profiles')
              .insert([{ ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
              .select()
              .single()
          );
        }

        if (!result.error) {
          return { data: result.data ? normaliseBusinessRow(result.data) : null, error: null };
        }
        if (!isTableMissingOrSupabaseError(result.error)) {
          console.warn('[dbService] Supabase updateProfile failed, using REST API:', result.error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase updateProfile threw, fallback to REST API:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.updateBusiness(profileData);
      return { data: res.business ? normaliseBusinessRow(res.business) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  }
};

// ─────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────

export const customersService = {
  /** Fetch all customers for the current workspace, newest first. */
  async getCustomers() {
    if (supabase) {
      try {
        const workspaceId = getWorkspaceId();
        let q = supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (workspaceId) q = q.eq('workspace_id', workspaceId);
        const { data, error } = await run(q);
        if (!error) {
          return { data: data ? data.map(normaliseCustomerRow) : [], error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase getCustomers failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase getCustomers threw, fallback to REST API:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.getCustomers();
      const list = res.customers || [];
      return { data: list.map(normaliseCustomerRow), error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  /** Fetch a single customer by id. */
  async getCustomerById(id) {
    if (supabase) {
      try {
        const { data, error } = await run(
          supabase.from('customers').select('*').eq('id', id).maybeSingle()
        );
        if (!error) {
          return { data: data ? normaliseCustomerRow(data) : null, error: null };
        }
      } catch (e) {
        console.warn('[dbService] Supabase getCustomerById threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.getCustomer(id);
      return { data: res.customer ? normaliseCustomerRow(res.customer) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /** Insert a new customer row. */
  async addCustomer(customerData) {
    if (supabase) {
      try {
        const workspaceId = getWorkspaceId();
        const row = toCustomerRow(customerData, workspaceId);
        const now = new Date().toISOString();
        const { data, error } = await run(
          supabase.from('customers')
            .insert([{ ...row, created_at: now, updated_at: now }])
            .select()
            .single()
        );
        if (!error) {
          return { data: data ? normaliseCustomerRow(data) : null, error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase addCustomer failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase addCustomer threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.createCustomer(customerData);
      return { data: res.customer ? normaliseCustomerRow(res.customer) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /** Update an existing customer row. */
  async updateCustomer(id, customerData) {
    if (supabase) {
      try {
        const row = toCustomerRow(customerData);
        const { data, error } = await run(
          supabase.from('customers')
            .update({ ...row, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()
        );
        if (!error) {
          return { data: data ? normaliseCustomerRow(data) : null, error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase updateCustomer failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase updateCustomer threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.updateCustomer(id, customerData);
      return { data: res.customer ? normaliseCustomerRow(res.customer) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /** Hard-delete a customer row. */
  async deleteCustomer(id) {
    if (supabase) {
      try {
        const { error } = await run(
          supabase.from('customers').delete().eq('id', id)
        );
        if (!error) return { error: null };
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase deleteCustomer failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase deleteCustomer threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      await api.deleteCustomer(id);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }
};

// ─────────────────────────────────────────────────────────────
// CATALOG / PRODUCTS
// ─────────────────────────────────────────────────────────────

export const catalogService = {
  /** Fetch all active catalog items for the workspace. */
  async getProducts() {
    if (supabase) {
      try {
        const workspaceId = getWorkspaceId();
        let q = supabase.from('catalog_items').select('*').order('name', { ascending: true });
        if (workspaceId) q = q.eq('workspace_id', workspaceId);
        const { data, error } = await run(q);
        if (!error) {
          return { data: data ? data.map(normaliseCatalogRow) : [], error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase getProducts failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase getProducts threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.getCatalog();
      const list = res.items || [];
      return { data: list.map(normaliseCatalogRow), error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  /** Insert a new catalog item. */
  async addProduct(itemData) {
    if (supabase) {
      try {
        const workspaceId = getWorkspaceId();
        const row = toCatalogRow(itemData, workspaceId);
        const now = new Date().toISOString();
        const { data, error } = await run(
          supabase.from('catalog_items')
            .insert([{ ...row, created_at: now, updated_at: now }])
            .select()
            .single()
        );
        if (!error) {
          return { data: data ? normaliseCatalogRow(data) : null, error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase addProduct failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase addProduct threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.createCatalogItem(itemData);
      return { data: res.item ? normaliseCatalogRow(res.item) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /** Update an existing catalog item. */
  async updateProduct(id, itemData) {
    if (supabase) {
      try {
        const row = toCatalogRow(itemData);
        const { data, error } = await run(
          supabase.from('catalog_items')
            .update({ ...row, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single()
        );
        if (!error) {
          return { data: data ? normaliseCatalogRow(data) : null, error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase updateProduct failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase updateProduct threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.updateCatalogItem(id, itemData);
      return { data: res.item ? normaliseCatalogRow(res.item) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /** Hard-delete a catalog item. */
  async deleteProduct(id) {
    if (supabase) {
      try {
        const { error } = await run(
          supabase.from('catalog_items').delete().eq('id', id)
        );
        if (!error) return { error: null };
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase deleteProduct failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase deleteProduct threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      await api.deleteCatalogItem(id);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }
};

// ─────────────────────────────────────────────────────────────
// INVOICES
// ─────────────────────────────────────────────────────────────

export const invoicesService = {
  /**
   * Fetch invoices with optional filters.
   * @param {{ search?: string, status?: string, startDate?: string, endDate?: string }} params
   */
  async getInvoices(params = {}) {
    if (supabase) {
      try {
        const workspaceId = getWorkspaceId();
        let q = supabase.from('invoices').select('*').order('created_at', { ascending: false });

        if (workspaceId) q = q.eq('workspace_id', workspaceId);

        if (params.status && params.status !== 'All') {
          q = q.ilike('status', params.status);
        }
        if (params.startDate) {
          q = q.gte('invoice_date', params.startDate);
        }
        if (params.endDate) {
          q = q.lte('invoice_date', params.endDate);
        }
        if (params.search && params.search.trim()) {
          const s = params.search.trim();
          q = q.or(`invoice_number.ilike.%${s}%,customer_details->>name.ilike.%${s}%,customer_details->>gstin.ilike.%${s}%`);
        }

        const { data, error } = await run(q);
        if (!error) {
          return { data: data ? data.map(normaliseInvoiceRow) : [], error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase getInvoices failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase getInvoices threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.getInvoices(params);
      const list = res.invoices || [];
      return { data: list.map(normaliseInvoiceRow), error: null };
    } catch (err) {
      return { data: [], error: err };
    }
  },

  /** Fetch a single invoice by id. */
  async getInvoiceById(id) {
    if (supabase) {
      try {
        const { data, error } = await run(
          supabase.from('invoices').select('*').eq('id', id).maybeSingle()
        );
        if (!error) {
          return { data: data ? normaliseInvoiceRow(data) : null, error: null };
        }
      } catch (e) {
        console.warn('[dbService] Supabase getInvoiceById threw, fallback:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.getInvoice(id);
      return { data: res.invoice ? normaliseInvoiceRow(res.invoice) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Create a new invoice.
   * Accepts the full computed payload from InvoiceEditorModal.
   */
  async createInvoice(invoiceData) {
    if (supabase) {
      try {
        const workspaceId = getWorkspaceId();
        const row = toInvoiceRow(invoiceData, workspaceId);
        const now = new Date().toISOString();
        const { data, error } = await run(
          supabase.from('invoices')
            .insert([{ ...row, created_at: now, updated_at: now }])
            .select()
            .single()
        );
        if (!error) {
          return { data: data ? normaliseInvoiceRow(data) : null, error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase createInvoice failed, using REST API fallback:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase createInvoice threw, fallback to REST API:', e.message);
      }
    }

    // Express REST API fallback
    try {
      const res = await api.createInvoice(invoiceData);
      return { data: res.invoice ? normaliseInvoiceRow(res.invoice) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /**
   * Update invoice status and optional payment details.
   * @param {string} id
   * @param {{ status: string, paymentDetails?: object, emailDelivery?: object }} updates
   */
  async updateInvoiceStatus(id, updates) {
    if (supabase) {
      try {
        const patch = {
          status: updates.status,
          updated_at: new Date().toISOString()
        };
        if (updates.paymentDetails) {
          patch.payment_details = updates.paymentDetails;
        }
        if (updates.emailDelivery) {
          patch.email_delivery = updates.emailDelivery;
        }
        const { data, error } = await run(
          supabase.from('invoices').update(patch).eq('id', id).select().single()
        );
        if (!error) {
          return { data: data ? normaliseInvoiceRow(data) : null, error: null };
        }
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase updateInvoiceStatus failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase updateInvoiceStatus threw, fallback to REST API:', e.message);
      }
    }

    // Express REST API fallback
    try {
      let res;
      if (updates.paymentDetails) {
        res = await api.recordPayment(id, updates.paymentDetails);
      } else {
        res = await api.updateInvoice(id, updates);
      }
      return { data: res.invoice ? normaliseInvoiceRow(res.invoice) : null, error: null };
    } catch (err) {
      return { data: null, error: err };
    }
  },

  /** Hard-delete an invoice row. */
  async deleteInvoice(id) {
    if (supabase) {
      try {
        const { error } = await run(
          supabase.from('invoices').delete().eq('id', id)
        );
        if (!error) return { error: null };
        if (!isTableMissingOrSupabaseError(error)) {
          console.warn('[dbService] Supabase deleteInvoice failed, using REST API:', error);
        }
      } catch (e) {
        console.warn('[dbService] Supabase deleteInvoice threw, fallback to REST API:', e.message);
      }
    }

    // Express REST API fallback
    try {
      await api.deleteInvoice(id);
      return { error: null };
    } catch (err) {
      return { error: err };
    }
  }
};

// ─────────────────────────────────────────────────────────────
// Row mappers — snake_case DB ↔ camelCase UI
// ─────────────────────────────────────────────────────────────

function normaliseBusinessRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id || row.workspaceId,
    legalName: row.legal_name || row.legalName || '',
    tradeName: row.trade_name || row.tradeName || '',
    gstin: row.gstin || '',
    pan: row.pan || '',
    addressLine1: row.address_line1 || row.addressLine1 || '',
    addressLine2: row.address_line2 || row.addressLine2 || '',
    city: row.city || '',
    state: row.state || 'Maharashtra',
    stateCode: row.state_code || row.stateCode || '27',
    pincode: row.pincode || '',
    phone: row.phone || '',
    email: row.email || '',
    logoUrl: row.logo_url || row.logoUrl || '',
    bankDetails: row.bank_details || row.bankDetails || {
      bankName: '', accountHolder: '', accountNumber: '',
      ifscCode: '', branch: '', upiId: ''
    },
    invoicePrefix: row.invoice_prefix || row.invoicePrefix || 'INV-',
    nextInvoiceNumber: Number(row.next_invoice_number ?? row.nextInvoiceNumber) || 101,
    termsAndConditions: row.terms_and_conditions || row.termsAndConditions || '',
    defaultNotes: row.default_notes || row.defaultNotes || '',
    resendApiKey: row.resend_api_key || row.resendApiKey || '',
    resendFromEmail: row.resend_from_email || row.resendFromEmail || '',
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

function toBusinessRow(p, workspaceId) {
  const row = {};
  if (workspaceId) row.workspace_id = workspaceId;
  if (p.legalName !== undefined) row.legal_name = p.legalName;
  if (p.tradeName !== undefined) row.trade_name = p.tradeName;
  if (p.gstin !== undefined) row.gstin = p.gstin;
  if (p.pan !== undefined) row.pan = p.pan;
  if (p.addressLine1 !== undefined) row.address_line1 = p.addressLine1;
  if (p.addressLine2 !== undefined) row.address_line2 = p.addressLine2;
  if (p.city !== undefined) row.city = p.city;
  if (p.state !== undefined) row.state = p.state;
  if (p.stateCode !== undefined) row.state_code = p.stateCode;
  if (p.pincode !== undefined) row.pincode = p.pincode;
  if (p.phone !== undefined) row.phone = p.phone;
  if (p.email !== undefined) row.email = p.email;
  if (p.logoUrl !== undefined) row.logo_url = p.logoUrl;
  if (p.bankDetails !== undefined) row.bank_details = p.bankDetails;
  if (p.invoicePrefix !== undefined) row.invoice_prefix = p.invoicePrefix;
  if (p.nextInvoiceNumber !== undefined) row.next_invoice_number = p.nextInvoiceNumber;
  if (p.termsAndConditions !== undefined) row.terms_and_conditions = p.termsAndConditions;
  if (p.defaultNotes !== undefined) row.default_notes = p.defaultNotes;
  if (p.resendApiKey !== undefined) row.resend_api_key = p.resendApiKey;
  if (p.resendFromEmail !== undefined) row.resend_from_email = p.resendFromEmail;
  return row;
}

function normaliseCustomerRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id || row.workspaceId,
    name: row.name || '',
    companyName: row.company_name || row.companyName || '',
    gstin: row.gstin || '',
    isB2B: row.is_b2b !== undefined ? row.is_b2b : Boolean(row.isB2B),
    email: row.email || '',
    phone: row.phone || '',
    billingAddress: row.billing_address || row.billingAddress || { street: '', city: '', state: 'Maharashtra', stateCode: '27', pincode: '' },
    shippingAddress: row.shipping_address || row.shippingAddress || {},
    notes: row.notes || '',
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

function toCustomerRow(c, workspaceId) {
  const row = {};
  if (workspaceId) row.workspace_id = workspaceId;
  if (c.name !== undefined) row.name = c.name;
  if (c.companyName !== undefined) row.company_name = c.companyName;
  if (c.gstin !== undefined) row.gstin = c.gstin ? c.gstin.trim().toUpperCase() : '';
  if (c.isB2B !== undefined) row.is_b2b = c.isB2B;
  else if (c.gstin) row.is_b2b = Boolean(c.gstin.trim());
  if (c.email !== undefined) row.email = c.email;
  if (c.phone !== undefined) row.phone = c.phone;
  if (c.billingAddress !== undefined) row.billing_address = c.billingAddress;
  if (c.shippingAddress !== undefined) row.shipping_address = c.shippingAddress;
  if (c.notes !== undefined) row.notes = c.notes;
  return row;
}

function normaliseCatalogRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id || row.workspaceId,
    name: row.name || '',
    description: row.description || '',
    type: row.type || 'SERVICES',
    hsnSacCode: row.hsn_sac_code || row.hsnSacCode || '',
    unitPrice: Number(row.unit_price ?? row.unitPrice) || 0,
    unit: row.unit || 'NOS',
    defaultGstRate: Number(row.default_gst_rate ?? row.defaultGstRate) || 18,
    isActive: (row.is_active !== undefined ? row.is_active : row.isActive) !== false,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

function toCatalogRow(item, workspaceId) {
  const row = {};
  if (workspaceId) row.workspace_id = workspaceId;
  if (item.name !== undefined) row.name = item.name;
  if (item.description !== undefined) row.description = item.description;
  if (item.type !== undefined) row.type = item.type;
  if (item.hsnSacCode !== undefined) row.hsn_sac_code = item.hsnSacCode;
  if (item.unitPrice !== undefined) row.unit_price = Number(item.unitPrice);
  if (item.unit !== undefined) row.unit = item.unit;
  if (item.defaultGstRate !== undefined) row.default_gst_rate = Number(item.defaultGstRate);
  if (item.isActive !== undefined) row.is_active = item.isActive;
  return row;
}

function normaliseInvoiceRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id || row.workspaceId,
    invoiceNumber: row.invoice_number || row.invoiceNumber || '',
    invoiceDate: row.invoice_date || row.invoiceDate || '',
    dueDate: row.due_date || row.dueDate || '',
    customerId: row.customer_id || row.customerId || null,
    customerDetails: row.customer_details || row.customerDetails || {},
    placeOfSupply: row.place_of_supply || row.placeOfSupply || '',
    placeOfSupplyStateCode: row.place_of_supply_state_code || row.placeOfSupplyStateCode || '',
    isInterState: row.is_inter_state !== undefined ? row.is_inter_state : (row.isInterState || false),
    reverseCharge: row.reverse_charge !== undefined ? row.reverse_charge : (row.reverseCharge || false),
    items: row.items || [],
    notes: row.notes || '',
    termsAndConditions: row.terms_and_conditions || row.termsAndConditions || '',
    // GST computed totals
    totalTaxableAmount: Number(row.total_taxable_amount ?? row.totalTaxableAmount) || 0,
    totalCgstAmount: Number(row.total_cgst_amount ?? row.totalCgstAmount) || 0,
    totalSgstAmount: Number(row.total_sgst_amount ?? row.totalSgstAmount) || 0,
    totalIgstAmount: Number(row.total_igst_amount ?? row.totalIgstAmount) || 0,
    totalTaxAmount: Number(row.total_tax_amount ?? row.totalTaxAmount) || 0,
    roundOff: Number(row.round_off ?? row.roundOff) || 0,
    grandTotal: Number(row.grand_total ?? row.grandTotal) || 0,
    totalInWords: row.total_in_words || row.totalInWords || '',
    status: row.status || 'Draft',
    paymentDetails: row.payment_details || row.paymentDetails || null,
    emailDelivery: row.email_delivery || row.emailDelivery || null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

function toInvoiceRow(inv, workspaceId) {
  const row = {};
  if (workspaceId) row.workspace_id = workspaceId;
  if (inv.invoiceNumber !== undefined) row.invoice_number = inv.invoiceNumber;
  if (inv.invoiceDate !== undefined) row.invoice_date = inv.invoiceDate;
  if (inv.dueDate !== undefined) row.due_date = inv.dueDate;
  if (inv.customerId !== undefined) row.customer_id = inv.customerId;
  if (inv.customerDetails !== undefined) row.customer_details = inv.customerDetails;
  if (inv.placeOfSupply !== undefined) row.place_of_supply = inv.placeOfSupply;
  if (inv.placeOfSupplyStateCode !== undefined) row.place_of_supply_state_code = inv.placeOfSupplyStateCode;
  if (inv.isInterState !== undefined) row.is_inter_state = inv.isInterState;
  if (inv.reverseCharge !== undefined) row.reverse_charge = inv.reverseCharge;
  if (inv.items !== undefined) row.items = inv.items;
  if (inv.notes !== undefined) row.notes = inv.notes;
  if (inv.termsAndConditions !== undefined) row.terms_and_conditions = inv.termsAndConditions;
  if (inv.totalTaxableAmount !== undefined) row.total_taxable_amount = inv.totalTaxableAmount;
  if (inv.totalCgstAmount !== undefined) row.total_cgst_amount = inv.totalCgstAmount;
  if (inv.totalSgstAmount !== undefined) row.total_sgst_amount = inv.totalSgstAmount;
  if (inv.totalIgstAmount !== undefined) row.total_igst_amount = inv.totalIgstAmount;
  if (inv.totalTaxAmount !== undefined) row.total_tax_amount = inv.totalTaxAmount;
  if (inv.roundOff !== undefined) row.round_off = inv.roundOff;
  if (inv.grandTotal !== undefined) row.grand_total = inv.grandTotal;
  if (inv.totalInWords !== undefined) row.total_in_words = inv.totalInWords;
  if (inv.status !== undefined) row.status = inv.status;
  if (inv.paymentDetails !== undefined) row.payment_details = inv.paymentDetails;
  if (inv.emailDelivery !== undefined) row.email_delivery = inv.emailDelivery;
  return row;
}

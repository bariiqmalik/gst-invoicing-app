/**
 * dbService.js — Unified Supabase database layer
 *
 * Architecture:
 *   All CRUD goes through this module → Supabase PostgREST API.
 *   The existing Express backend (api.js → /api/*) is kept intact as
 *   a parallel path for auth, email, and dashboard analytics.
 *   UI views call dbService directly for data persistence.
 *
 * Supabase table names mirror the existing data model:
 *   business_profiles, customers, catalog_items, invoices
 *
 * Error contract:
 *   Every function returns { data, error } where error is null on success.
 *   Callers should check `if (error) { ... }`.
 */

import { supabase } from '../lib/supabaseClient.js';

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Wraps a Supabase query and normalises the error shape.
 * @param {Promise} queryPromise
 */
async function run(queryPromise) {
  const { data, error } = await queryPromise;
  if (error) {
    console.error('[dbService] Supabase error:', error.message, error.details ?? '');
  }
  return { data, error };
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
// Table: business_profiles
// Columns: id, workspace_id, legal_name, trade_name, gstin, pan,
//          address_line1, address_line2, city, state, state_code, pincode,
//          phone, email, logo_url, bank_details (jsonb),
//          invoice_prefix, next_invoice_number,
//          terms_and_conditions, default_notes,
//          resend_api_key, resend_from_email,
//          created_at, updated_at
// ─────────────────────────────────────────────────────────────

export const businessService = {
  /**
   * Fetch the business profile for the current workspace.
   * Returns a single object (or null if not found).
   */
  async getProfile() {
    const workspaceId = getWorkspaceId();
    const query = supabase
      .from('business_profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (workspaceId) query.eq('workspace_id', workspaceId);

    const { data, error } = await run(query.maybeSingle());
    return { data: data ? normaliseBusinessRow(data) : null, error };
  },

  /**
   * Upsert the business profile.
   * If a row exists for this workspace it is updated; otherwise inserted.
   */
  async updateProfile(profileData) {
    const workspaceId = getWorkspaceId();
    const row = toBusinessRow(profileData, workspaceId);

    // Try to find existing row first
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

    return { data: result.data ? normaliseBusinessRow(result.data) : null, error: result.error };
  }
};

// ─────────────────────────────────────────────────────────────
// CUSTOMERS
// Table: customers
// Columns: id, workspace_id, name, company_name, gstin, is_b2b,
//          email, phone, billing_address (jsonb), shipping_address (jsonb),
//          notes, created_at, updated_at
// ─────────────────────────────────────────────────────────────

export const customersService = {
  /** Fetch all customers for the current workspace, newest first. */
  async getCustomers() {
    const workspaceId = getWorkspaceId();
    let q = supabase.from('customers').select('*').order('created_at', { ascending: false });
    if (workspaceId) q = q.eq('workspace_id', workspaceId);
    const { data, error } = await run(q);
    return { data: data ? data.map(normaliseCustomerRow) : [], error };
  },

  /** Fetch a single customer by id. */
  async getCustomerById(id) {
    const { data, error } = await run(
      supabase.from('customers').select('*').eq('id', id).maybeSingle()
    );
    return { data: data ? normaliseCustomerRow(data) : null, error };
  },

  /** Insert a new customer row. */
  async addCustomer(customerData) {
    const workspaceId = getWorkspaceId();
    const row = toCustomerRow(customerData, workspaceId);
    const now = new Date().toISOString();
    const { data, error } = await run(
      supabase.from('customers')
        .insert([{ ...row, created_at: now, updated_at: now }])
        .select()
        .single()
    );
    return { data: data ? normaliseCustomerRow(data) : null, error };
  },

  /** Update an existing customer row. */
  async updateCustomer(id, customerData) {
    const row = toCustomerRow(customerData);
    const { data, error } = await run(
      supabase.from('customers')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
    return { data: data ? normaliseCustomerRow(data) : null, error };
  },

  /** Hard-delete a customer row. */
  async deleteCustomer(id) {
    const { error } = await run(
      supabase.from('customers').delete().eq('id', id)
    );
    return { error };
  }
};

// ─────────────────────────────────────────────────────────────
// CATALOG / PRODUCTS
// Table: catalog_items
// Columns: id, workspace_id, name, description, type,
//          hsn_sac_code, unit_price, unit, default_gst_rate,
//          is_active, created_at, updated_at
// ─────────────────────────────────────────────────────────────

export const catalogService = {
  /** Fetch all active catalog items for the workspace. */
  async getProducts() {
    const workspaceId = getWorkspaceId();
    let q = supabase.from('catalog_items').select('*').order('name', { ascending: true });
    if (workspaceId) q = q.eq('workspace_id', workspaceId);
    const { data, error } = await run(q);
    return { data: data ? data.map(normaliseCatalogRow) : [], error };
  },

  /** Insert a new catalog item. */
  async addProduct(itemData) {
    const workspaceId = getWorkspaceId();
    const row = toCatalogRow(itemData, workspaceId);
    const now = new Date().toISOString();
    const { data, error } = await run(
      supabase.from('catalog_items')
        .insert([{ ...row, created_at: now, updated_at: now }])
        .select()
        .single()
    );
    return { data: data ? normaliseCatalogRow(data) : null, error };
  },

  /** Update an existing catalog item. */
  async updateProduct(id, itemData) {
    const row = toCatalogRow(itemData);
    const { data, error } = await run(
      supabase.from('catalog_items')
        .update({ ...row, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
    );
    return { data: data ? normaliseCatalogRow(data) : null, error };
  },

  /** Hard-delete a catalog item. */
  async deleteProduct(id) {
    const { error } = await run(
      supabase.from('catalog_items').delete().eq('id', id)
    );
    return { error };
  }
};

// ─────────────────────────────────────────────────────────────
// INVOICES
// Table: invoices
// Columns: id, workspace_id, invoice_number, invoice_date, due_date,
//          customer_id, customer_details (jsonb),
//          place_of_supply, place_of_supply_state_code,
//          is_inter_state, reverse_charge,
//          items (jsonb array), notes, terms_and_conditions,
//          total_taxable_amount, total_cgst_amount, total_sgst_amount,
//          total_igst_amount, total_tax_amount, round_off, grand_total,
//          total_in_words, status,
//          payment_details (jsonb), email_delivery (jsonb),
//          created_at, updated_at
// ─────────────────────────────────────────────────────────────

export const invoicesService = {
  /**
   * Fetch invoices with optional filters.
   * @param {{ search?: string, status?: string, startDate?: string, endDate?: string }} params
   */
  async getInvoices(params = {}) {
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
    // Text search across invoice_number and customer name (stored in jsonb)
    if (params.search && params.search.trim()) {
      const s = params.search.trim();
      q = q.or(`invoice_number.ilike.%${s}%,customer_details->>name.ilike.%${s}%,customer_details->>gstin.ilike.%${s}%`);
    }

    const { data, error } = await run(q);
    return { data: data ? data.map(normaliseInvoiceRow) : [], error };
  },

  /** Fetch a single invoice by id. */
  async getInvoiceById(id) {
    const { data, error } = await run(
      supabase.from('invoices').select('*').eq('id', id).maybeSingle()
    );
    return { data: data ? normaliseInvoiceRow(data) : null, error };
  },

  /**
   * Create a new invoice.
   * Accepts the full computed payload from InvoiceEditorModal (items
   * already contain taxableAmount, cgstAmount, etc.)
   */
  async createInvoice(invoiceData) {
    const workspaceId = getWorkspaceId();
    const row = toInvoiceRow(invoiceData, workspaceId);
    const now = new Date().toISOString();
    const { data, error } = await run(
      supabase.from('invoices')
        .insert([{ ...row, created_at: now, updated_at: now }])
        .select()
        .single()
    );
    return { data: data ? normaliseInvoiceRow(data) : null, error };
  },

  /**
   * Update invoice status and optional payment details.
   * @param {string} id
   * @param {{ status: string, paymentDetails?: object }} updates
   */
  async updateInvoiceStatus(id, updates) {
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
    return { data: data ? normaliseInvoiceRow(data) : null, error };
  },

  /** Hard-delete an invoice row. */
  async deleteInvoice(id) {
    const { error } = await run(
      supabase.from('invoices').delete().eq('id', id)
    );
    return { error };
  }
};

// ─────────────────────────────────────────────────────────────
// Row mappers — snake_case DB ↔ camelCase UI
// ─────────────────────────────────────────────────────────────

function normaliseBusinessRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    legalName: row.legal_name || '',
    tradeName: row.trade_name || '',
    gstin: row.gstin || '',
    pan: row.pan || '',
    addressLine1: row.address_line1 || '',
    addressLine2: row.address_line2 || '',
    city: row.city || '',
    state: row.state || 'Maharashtra',
    stateCode: row.state_code || '27',
    pincode: row.pincode || '',
    phone: row.phone || '',
    email: row.email || '',
    logoUrl: row.logo_url || '',
    bankDetails: row.bank_details || {
      bankName: '', accountHolder: '', accountNumber: '',
      ifscCode: '', branch: '', upiId: ''
    },
    invoicePrefix: row.invoice_prefix || 'INV-',
    nextInvoiceNumber: row.next_invoice_number || 101,
    termsAndConditions: row.terms_and_conditions || '',
    defaultNotes: row.default_notes || '',
    resendApiKey: row.resend_api_key || '',
    resendFromEmail: row.resend_from_email || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
    workspaceId: row.workspace_id,
    name: row.name || '',
    companyName: row.company_name || '',
    gstin: row.gstin || '',
    isB2B: row.is_b2b || false,
    email: row.email || '',
    phone: row.phone || '',
    billingAddress: row.billing_address || { street: '', city: '', state: 'Maharashtra', stateCode: '27', pincode: '' },
    shippingAddress: row.shipping_address || {},
    notes: row.notes || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
    workspaceId: row.workspace_id,
    name: row.name || '',
    description: row.description || '',
    type: row.type || 'SERVICES',
    hsnSacCode: row.hsn_sac_code || '',
    unitPrice: Number(row.unit_price) || 0,
    unit: row.unit || 'NOS',
    defaultGstRate: Number(row.default_gst_rate) || 18,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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
    workspaceId: row.workspace_id,
    invoiceNumber: row.invoice_number || '',
    invoiceDate: row.invoice_date || '',
    dueDate: row.due_date || '',
    customerId: row.customer_id || null,
    customerDetails: row.customer_details || {},
    placeOfSupply: row.place_of_supply || '',
    placeOfSupplyStateCode: row.place_of_supply_state_code || '',
    isInterState: row.is_inter_state || false,
    reverseCharge: row.reverse_charge || false,
    items: row.items || [],
    notes: row.notes || '',
    termsAndConditions: row.terms_and_conditions || '',
    // GST computed totals
    totalTaxableAmount: Number(row.total_taxable_amount) || 0,
    totalCgstAmount: Number(row.total_cgst_amount) || 0,
    totalSgstAmount: Number(row.total_sgst_amount) || 0,
    totalIgstAmount: Number(row.total_igst_amount) || 0,
    totalTaxAmount: Number(row.total_tax_amount) || 0,
    roundOff: Number(row.round_off) || 0,
    grandTotal: Number(row.grand_total) || 0,
    totalInWords: row.total_in_words || '',
    status: row.status || 'Draft',
    paymentDetails: row.payment_details || null,
    emailDelivery: row.email_delivery || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
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

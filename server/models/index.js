import mongoose from 'mongoose';
import { isMongoConnected, fileStores, sanitizeDocument } from '../db.js';

// Common transform for clean JSON serialization
const toJSONPlugin = (schema) => {
  schema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id ? ret._id.toString() : ret.id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  });
};

/* ------------------- WORKSPACE SCHEMA ------------------- */
const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  gstin: { type: String, default: '', trim: true, uppercase: true },
  address: { type: mongoose.Schema.Types.Mixed, default: '' },
  phone: { type: String, default: '', trim: true },
  email: { type: String, default: '', trim: true, lowercase: true },
  owner_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  created_at: { type: Date, default: Date.now },
  // Extended Business Profile fields for GST invoicing
  legalName: { type: String, default: '' },
  tradeName: { type: String, default: '' },
  pan: { type: String, default: '', uppercase: true },
  addressLine1: { type: String, default: '' },
  addressLine2: { type: String, default: '' },
  city: { type: String, default: '' },
  state: { type: String, default: 'Maharashtra' },
  stateCode: { type: String, default: '27' },
  pincode: { type: String, default: '' },
  logoUrl: { type: String, default: '' },
  bankDetails: {
    bankName: { type: String, default: 'HDFC Bank Ltd' },
    accountHolder: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    branch: { type: String, default: '' },
    upiId: { type: String, default: '' }
  },
  invoicePrefix: { type: String, default: 'INV-2024-' },
  nextInvoiceNumber: { type: Number, default: 101 },
  termsAndConditions: { 
    type: String, 
    default: '1. Payment is due within 15 days of invoice date.\n2. Please mention the invoice number in the NEFT/RTGS/IMPS transfer remarks.\n3. Goods or services once billed are non-refundable unless agreed in writing.' 
  },
  defaultNotes: { 
    type: String, 
    default: 'Thank you for your business! We appreciate the opportunity to collaborate with you.' 
  },
  resendApiKey: { type: String, default: '' },
  resendFromEmail: { type: String, default: 'invoicing@updates.resend.dev' },
  updated_at: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
workspaceSchema.index({ owner_id: 1 });
toJSONPlugin(workspaceSchema);
export const WorkspaceModel = mongoose.models.Workspace || mongoose.model('Workspace', workspaceSchema);

/* ------------------- USER SCHEMA ------------------- */
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['owner', 'accountant', 'staff'], default: 'owner' },
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true },
  businessName: { type: String, default: '' },
  authProvider: { type: String, default: 'local' },
  authMethod: { type: String, default: 'password' },
  created_at: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ workspace_id: 1 });
toJSONPlugin(userSchema);
export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

/* ------------------- CUSTOMER SCHEMA ------------------- */
const customerSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true },
  companyName: { type: String, default: '' },
  gstin: { type: String, default: '' },
  isB2B: { type: Boolean, default: false },
  email: { type: String, required: true },
  phone: { type: String, default: '' },
  billingAddress: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: 'Maharashtra' },
    stateCode: { type: String, default: '27' },
    pincode: { type: String, default: '' }
  },
  shippingAddress: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    pincode: { type: String, default: '' }
  },
  notes: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
customerSchema.index({ workspace_id: 1, email: 1 });
customerSchema.index({ workspace_id: 1, gstin: 1 });
customerSchema.index({ workspace_id: 1, created_at: -1 });
toJSONPlugin(customerSchema);
export const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

/* ------------------- CATALOG ITEM SCHEMA ------------------- */
const catalogItemSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['GOODS', 'SERVICES'], default: 'SERVICES' },
  hsnSacCode: { type: String, required: true },
  unitPrice: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'NOS' },
  defaultGstRate: { type: Number, required: true, default: 18 },
  isActive: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
catalogItemSchema.index({ workspace_id: 1, name: 1 });
catalogItemSchema.index({ workspace_id: 1, hsnSacCode: 1 });
toJSONPlugin(catalogItemSchema);
export const CatalogItemModel = mongoose.models.CatalogItem || mongoose.model('CatalogItem', catalogItemSchema);

/* ------------------- INVOICE SCHEMA ------------------- */
const invoiceItemSchema = new mongoose.Schema({
  catalogItemId: { type: String, default: null },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['GOODS', 'SERVICES'], default: 'SERVICES' },
  hsnSac: { type: String, required: true },
  qty: { type: Number, required: true, default: 1 },
  unit: { type: String, default: 'NOS' },
  unitPrice: { type: Number, required: true, default: 0 },
  discountPercent: { type: Number, default: 0 },
  discountAmount: { type: Number, default: 0 },
  taxableAmount: { type: Number, required: true, default: 0 },
  gstRate: { type: Number, required: true, default: 18 },
  cgstRate: { type: Number, default: 0 },
  cgstAmount: { type: Number, default: 0 },
  sgstRate: { type: Number, default: 0 },
  sgstAmount: { type: Number, default: 0 },
  igstRate: { type: Number, default: 0 },
  igstAmount: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true, default: 0 }
}, { _id: false });

const invoiceSchema = new mongoose.Schema({
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace', required: true, index: true },
  invoice_number: { type: String, trim: true },
  invoiceNumber: { type: String, required: true, trim: true },
  invoiceDate: { type: String, required: true },
  dueDate: { type: String, required: true },
  customerId: { type: String, default: null },
  customer: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    gstin: { type: String, default: '' }
  },
  customerDetails: {
    name: { type: String, required: true },
    companyName: { type: String, default: '' },
    gstin: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    state: { type: String, default: '' },
    stateCode: { type: String, default: '' },
    pincode: { type: String, default: '' }
  },
  placeOfSupply: { type: String, required: true },
  placeOfSupplyStateCode: { type: String, required: true },
  isInterState: { type: Boolean, default: false },
  reverseCharge: { type: Boolean, default: false },
  items: [invoiceItemSchema],
  totalTaxableAmount: { type: Number, required: true, default: 0 },
  totalCgstAmount: { type: Number, default: 0 },
  totalSgstAmount: { type: Number, default: 0 },
  totalIgstAmount: { type: Number, default: 0 },
  totalTaxAmount: { type: Number, required: true, default: 0 },
  grandTotal: { type: Number, required: true, default: 0 },
  totalInWords: { type: String, default: '' },
  notes: { type: String, default: '' },
  termsAndConditions: { type: String, default: '' },
  status: { 
    type: String, 
    enum: ['Draft', 'Sent', 'Paid', 'Partial', 'Overdue', 'Cancelled'], 
    default: 'Draft' 
  },
  paymentDetails: {
    amountPaid: { type: Number, default: 0 },
    paymentDate: { type: String, default: '' },
    paymentMethod: { type: String, default: '' },
    paymentReference: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  emailDelivery: {
    sent: { type: Boolean, default: false },
    sentAt: { type: String, default: null },
    recipient: { type: String, default: '' },
    messageId: { type: String, default: '' }
  },
  created_at: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Sync aliases before validation and saving
invoiceSchema.pre('validate', function(next) {
  if (!this.invoice_number && this.invoiceNumber) {
    this.invoice_number = this.invoiceNumber;
  } else if (!this.invoiceNumber && this.invoice_number) {
    this.invoiceNumber = this.invoice_number;
  }
  if (!this.created_at && this.createdAt) {
    this.created_at = this.createdAt;
  } else if (!this.createdAt && this.created_at) {
    this.createdAt = this.created_at;
  }
  if (!this.customer) this.customer = {};
  if (this.customerDetails) {
    if (!this.customer.gstin && this.customerDetails.gstin) {
      this.customer.gstin = this.customerDetails.gstin;
    }
    if (!this.customer.name && this.customerDetails.name) {
      this.customer.name = this.customerDetails.name;
    }
    if (!this.customer.email && this.customerDetails.email) {
      this.customer.email = this.customerDetails.email;
    }
  }
  next();
});

// MANDATORY COMPOUND INDEXES AS PER SPECIFICATION
invoiceSchema.index({ workspace_id: 1, invoice_number: 1 }, { unique: true });
invoiceSchema.index({ workspace_id: 1, invoiceNumber: 1 }, { unique: true });
invoiceSchema.index({ workspace_id: 1, created_at: -1 });
invoiceSchema.index({ workspace_id: 1, createdAt: -1 });
invoiceSchema.index({ workspace_id: 1, 'customer.gstin': 1 });
invoiceSchema.index({ workspace_id: 1, 'customerDetails.gstin': 1 });

toJSONPlugin(invoiceSchema);
export const InvoiceModel = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

/* ------------------- UNIFIED REPOSITORY WRAPPER ------------------- */
export const db = {
  workspaces: {
    async find(query = {}) {
      if (isMongoConnected()) {
        const docs = await WorkspaceModel.find(query).sort({ created_at: -1 });
        return sanitizeDocument(docs);
      }
      return fileStores.workspaces.find(query);
    },
    async findOne(query = {}) {
      if (isMongoConnected()) {
        const doc = await WorkspaceModel.findOne(query);
        return sanitizeDocument(doc);
      }
      return fileStores.workspaces.findOne(query);
    },
    async findById(id) {
      if (isMongoConnected()) {
        const doc = await WorkspaceModel.findById(id);
        return sanitizeDocument(doc);
      }
      return fileStores.workspaces.findById(id);
    },
    async create(data) {
      const payload = {
        ...data,
        legalName: data.legalName || data.name,
        tradeName: data.tradeName || data.name,
        created_at: data.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      if (isMongoConnected()) {
        const doc = await WorkspaceModel.create(payload);
        return sanitizeDocument(doc);
      }
      return fileStores.workspaces.create(payload);
    },
    async update(id, updates) {
      const payload = { ...updates, updated_at: new Date().toISOString(), updatedAt: new Date().toISOString() };
      if (isMongoConnected()) {
        const doc = await WorkspaceModel.findByIdAndUpdate(id, payload, { new: true });
        return sanitizeDocument(doc);
      }
      return fileStores.workspaces.findByIdAndUpdate(id, payload);
    },
    async delete(id) {
      if (isMongoConnected()) {
        const doc = await WorkspaceModel.findByIdAndDelete(id);
        return sanitizeDocument(doc);
      }
      return fileStores.workspaces.findByIdAndDelete(id);
    },
    async count(query = {}) {
      if (isMongoConnected()) return await WorkspaceModel.countDocuments(query);
      return fileStores.workspaces.countDocuments(query);
    }
  },

  users: {
    async find(query = {}) {
      if (isMongoConnected()) {
        const docs = await UserModel.find(query);
        return sanitizeDocument(docs);
      }
      return fileStores.users.find(query);
    },
    async findOne(query = {}) {
      if (isMongoConnected()) {
        const doc = await UserModel.findOne(query);
        return sanitizeDocument(doc);
      }
      return fileStores.users.findOne(query);
    },
    async findById(id) {
      if (isMongoConnected()) {
        const doc = await UserModel.findById(id);
        return sanitizeDocument(doc);
      }
      return fileStores.users.findById(id);
    },
    async create(data) {
      const payload = {
        ...data,
        password_hash: data.password_hash || data.password,
        created_at: data.created_at || new Date().toISOString(),
        createdAt: data.createdAt || new Date().toISOString()
      };
      if (isMongoConnected()) {
        const doc = await UserModel.create(payload);
        return sanitizeDocument(doc);
      }
      return fileStores.users.create(payload);
    },
    async update(id, updates) {
      if (isMongoConnected()) {
        const doc = await UserModel.findByIdAndUpdate(id, updates, { new: true });
        return sanitizeDocument(doc);
      }
      return fileStores.users.findByIdAndUpdate(id, updates);
    },
    async count(query = {}) {
      if (isMongoConnected()) return await UserModel.countDocuments(query);
      return fileStores.users.countDocuments(query);
    }
  },

  business: {
    // Returns active workspace business profile
    async getProfile(workspace_id = null) {
      let ws = null;
      if (workspace_id) {
        ws = await db.workspaces.findById(workspace_id);
      } else {
        const all = await db.workspaces.find();
        ws = all[0] || null;
      }

      if (!ws) {
        // Fallback create default workspace profile
        ws = await db.workspaces.create({
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
          nextInvoiceNumber: 104
        });
      }
      return sanitizeDocument(ws);
    },
    async updateProfile(updates, workspace_id = null) {
      let targetId = workspace_id;
      if (!targetId) {
        const current = await this.getProfile();
        targetId = current?.id;
      }
      if (updates.legalName && !updates.name) {
        updates.name = updates.legalName;
      }
      return db.workspaces.update(targetId, updates);
    }
  },

  customers: {
    async find(query = {}) {
      if (isMongoConnected()) {
        const docs = await CustomerModel.find(query).sort({ created_at: -1, createdAt: -1 });
        return sanitizeDocument(docs);
      }
      return fileStores.customers.find(query);
    },
    async findById(id, workspace_id = null) {
      if (isMongoConnected()) {
        const q = workspace_id ? { _id: id, workspace_id } : { _id: id };
        const doc = await CustomerModel.findOne(q);
        return sanitizeDocument(doc);
      }
      return fileStores.customers.findById(id, workspace_id);
    },
    async create(data) {
      if (isMongoConnected()) {
        const doc = await CustomerModel.create(data);
        return sanitizeDocument(doc);
      }
      return fileStores.customers.create(data);
    },
    async update(id, data, workspace_id = null) {
      if (isMongoConnected()) {
        const q = workspace_id ? { _id: id, workspace_id } : { _id: id };
        const doc = await CustomerModel.findOneAndUpdate(q, data, { new: true });
        return sanitizeDocument(doc);
      }
      return fileStores.customers.findByIdAndUpdate(id, data, workspace_id);
    },
    async delete(id, workspace_id = null) {
      if (isMongoConnected()) {
        const q = workspace_id ? { _id: id, workspace_id } : { _id: id };
        const doc = await CustomerModel.findOneAndDelete(q);
        return sanitizeDocument(doc);
      }
      return fileStores.customers.findByIdAndDelete(id, workspace_id);
    },
    async count(query = {}) {
      if (isMongoConnected()) return await CustomerModel.countDocuments(query);
      return fileStores.customers.countDocuments(query);
    }
  },

  catalog: {
    async find(query = {}) {
      if (isMongoConnected()) {
        const docs = await CatalogItemModel.find(query).sort({ created_at: -1, createdAt: -1 });
        return sanitizeDocument(docs);
      }
      return fileStores.catalog.find(query);
    },
    async findById(id, workspace_id = null) {
      if (isMongoConnected()) {
        const q = workspace_id ? { _id: id, workspace_id } : { _id: id };
        const doc = await CatalogItemModel.findOne(q);
        return sanitizeDocument(doc);
      }
      return fileStores.catalog.findById(id, workspace_id);
    },
    async create(data) {
      if (isMongoConnected()) {
        const doc = await CatalogItemModel.create(data);
        return sanitizeDocument(doc);
      }
      return fileStores.catalog.create(data);
    },
    async update(id, data, workspace_id = null) {
      if (isMongoConnected()) {
        const q = workspace_id ? { _id: id, workspace_id } : { _id: id };
        const doc = await CatalogItemModel.findOneAndUpdate(q, data, { new: true });
        return sanitizeDocument(doc);
      }
      return fileStores.catalog.findByIdAndUpdate(id, data, workspace_id);
    },
    async delete(id, workspace_id = null) {
      if (isMongoConnected()) {
        const q = workspace_id ? { _id: id, workspace_id } : { _id: id };
        const doc = await CatalogItemModel.findOneAndDelete(q);
        return sanitizeDocument(doc);
      }
      return fileStores.catalog.findByIdAndDelete(id, workspace_id);
    },
    async count(query = {}) {
      if (isMongoConnected()) return await CatalogItemModel.countDocuments(query);
      return fileStores.catalog.countDocuments(query);
    }
  },

  invoices: {
    async find(query = {}) {
      if (isMongoConnected()) {
        const docs = await InvoiceModel.find(query).sort({ created_at: -1, createdAt: -1 });
        return sanitizeDocument(docs);
      }
      return fileStores.invoices.find(query);
    },
    async findById(id, workspace_id = null) {
      if (isMongoConnected()) {
        const q = workspace_id ? { _id: id, workspace_id } : { _id: id };
        const doc = await InvoiceModel.findOne(q);
        return sanitizeDocument(doc);
      }
      return fileStores.invoices.findById(id, workspace_id);
    },
    async create(data) {
      const payload = {
        ...data,
        invoice_number: data.invoice_number || data.invoiceNumber,
        invoiceNumber: data.invoiceNumber || data.invoice_number,
        created_at: data.created_at || data.createdAt || new Date().toISOString(),
        createdAt: data.createdAt || data.created_at || new Date().toISOString(),
        customer: {
          gstin: data.customer?.gstin || data.customerDetails?.gstin || '',
          name: data.customer?.name || data.customerDetails?.name || '',
          email: data.customer?.email || data.customerDetails?.email || ''
        }
      };
      if (isMongoConnected()) {
        const doc = await InvoiceModel.create(payload);
        return sanitizeDocument(doc);
      }
      return fileStores.invoices.create(payload);
    },
    async update(id, data, workspace_id = null) {
      const payload = {
        ...data,
        ...(data.invoiceNumber && { invoice_number: data.invoiceNumber, invoiceNumber: data.invoiceNumber }),
        ...(data.customerDetails && {
          customer: {
            gstin: data.customerDetails.gstin || '',
            name: data.customerDetails.name || '',
            email: data.customerDetails.email || ''
          }
        })
      };
      if (isMongoConnected()) {
        const q = workspace_id ? { _id: id, workspace_id } : { _id: id };
        const doc = await InvoiceModel.findOneAndUpdate(q, payload, { new: true });
        return sanitizeDocument(doc);
      }
      return fileStores.invoices.findByIdAndUpdate(id, payload, workspace_id);
    },
    async delete(id, workspace_id = null) {
      if (isMongoConnected()) {
        const q = workspace_id ? { _id: id, workspace_id } : { _id: id };
        const doc = await InvoiceModel.findOneAndDelete(q);
        return sanitizeDocument(doc);
      }
      return fileStores.invoices.findByIdAndDelete(id, workspace_id);
    },
    async count(query = {}) {
      if (isMongoConnected()) return await InvoiceModel.countDocuments(query);
      return fileStores.invoices.countDocuments(query);
    }
  }
};

/* ------------------- TENANT-SCOPED DB REPOSITORY ------------------- */
/**
 * Returns a strictly isolated repository wrapper where every find, create,
 * update, delete, and count strictly forces { workspace_id: tenantWorkspaceId }.
 * Guarantees zero cross-tenant data leakage.
 */
export function getTenantDb(workspaceId) {
  if (!workspaceId) {
    throw new Error('Tenant Context Error: workspace_id is required for request isolation');
  }
  const wid = String(workspaceId);

  return {
    workspaceId: wid,
    
    workspaces: {
      async get() {
        return db.workspaces.findById(wid);
      },
      async update(updates) {
        return db.workspaces.update(wid, updates);
      }
    },

    business: {
      async getProfile() {
        return db.business.getProfile(wid);
      },
      async updateProfile(updates) {
        return db.business.updateProfile(updates, wid);
      }
    },

    customers: {
      async find(query = {}) {
        return db.customers.find({ ...query, workspace_id: wid });
      },
      async findById(id) {
        return db.customers.findById(id, wid);
      },
      async create(data) {
        return db.customers.create({ ...data, workspace_id: wid });
      },
      async update(id, data) {
        return db.customers.update(id, data, wid);
      },
      async delete(id) {
        return db.customers.delete(id, wid);
      },
      async count(query = {}) {
        return db.customers.count({ ...query, workspace_id: wid });
      }
    },

    catalog: {
      async find(query = {}) {
        return db.catalog.find({ ...query, workspace_id: wid });
      },
      async findById(id) {
        return db.catalog.findById(id, wid);
      },
      async create(data) {
        return db.catalog.create({ ...data, workspace_id: wid });
      },
      async update(id, data) {
        return db.catalog.update(id, data, wid);
      },
      async delete(id) {
        return db.catalog.delete(id, wid);
      },
      async count(query = {}) {
        return db.catalog.count({ ...query, workspace_id: wid });
      }
    },

    invoices: {
      async find(query = {}) {
        return db.invoices.find({ ...query, workspace_id: wid });
      },
      async findById(id) {
        return db.invoices.findById(id, wid);
      },
      async create(data) {
        return db.invoices.create({ ...data, workspace_id: wid });
      },
      async update(id, data) {
        return db.invoices.update(id, data, wid);
      },
      async delete(id) {
        return db.invoices.delete(id, wid);
      },
      async count(query = {}) {
        return db.invoices.count({ ...query, workspace_id: wid });
      }
    }
  };
}

db.forTenant = getTenantDb;

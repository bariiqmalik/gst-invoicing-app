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

/* ------------------- USER SCHEMA ------------------- */
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'owner' },
  businessName: { type: String, default: 'My Business' },
  createdAt: { type: Date, default: Date.now }
});
toJSONPlugin(userSchema);
export const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

/* ------------------- BUSINESS PROFILE SCHEMA ------------------- */
const businessSchema = new mongoose.Schema({
  legalName: { type: String, required: true, default: 'Vani Studios Private Limited' },
  tradeName: { type: String, default: 'Vani Digital & Creative Labs' },
  gstin: { type: String, default: '27AABCV1234F1Z8' },
  pan: { type: String, default: 'AABCV1234F' },
  email: { type: String, default: 'billing@vanistudios.in' },
  phone: { type: String, default: '+91 98201 12345' },
  addressLine1: { type: String, default: 'Suite 402, Lotus Grandeur, Andheri West' },
  addressLine2: { type: String, default: 'Veera Desai Road' },
  city: { type: String, default: 'Mumbai' },
  state: { type: String, default: 'Maharashtra' },
  stateCode: { type: String, default: '27' },
  pincode: { type: String, default: '400053' },
  logoUrl: { type: String, default: '' },
  bankDetails: {
    bankName: { type: String, default: 'HDFC Bank Ltd' },
    accountHolder: { type: String, default: 'Vani Studios Private Limited' },
    accountNumber: { type: String, default: '50200049281729' },
    ifscCode: { type: String, default: 'HDFC0001042' },
    branch: { type: String, default: 'Andheri West Branch, Mumbai' },
    upiId: { type: String, default: 'vanistudios@okhdfcbank' }
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
toJSONPlugin(businessSchema);
export const BusinessModel = mongoose.models.Business || mongoose.model('Business', businessSchema);

/* ------------------- CUSTOMER SCHEMA ------------------- */
const customerSchema = new mongoose.Schema({
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
toJSONPlugin(customerSchema);
export const CustomerModel = mongoose.models.Customer || mongoose.model('Customer', customerSchema);

/* ------------------- CATALOG ITEM SCHEMA ------------------- */
const catalogItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['GOODS', 'SERVICES'], default: 'SERVICES' },
  hsnSacCode: { type: String, required: true },
  unitPrice: { type: Number, required: true, default: 0 },
  unit: { type: String, default: 'NOS' }, // NOS, HRS, PCS, MTR, DAYS, MONTHS
  defaultGstRate: { type: Number, required: true, default: 18 }, // 0, 5, 12, 18, 28
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
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
  invoiceNumber: { type: String, required: true, unique: true },
  invoiceDate: { type: String, required: true },
  dueDate: { type: String, required: true },
  customerId: { type: String, default: null },
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
    paymentMethod: { type: String, default: '' }, // NEFT/RTGS, UPI, Cheque, Cash
    paymentReference: { type: String, default: '' },
    notes: { type: String, default: '' }
  },
  emailDelivery: {
    sent: { type: Boolean, default: false },
    sentAt: { type: String, default: null },
    recipient: { type: String, default: '' },
    messageId: { type: String, default: '' }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
toJSONPlugin(invoiceSchema);
export const InvoiceModel = mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);

/* ------------------- UNIFIED REPOSITORY WRAPPER ------------------- */
// Unified repository that delegates to Mongoose or FileStore, with guaranteed clean JSON serialization
export const db = {
  users: {
    async findOne(query) {
      if (isMongoConnected()) {
        const doc = await UserModel.findOne(query);
        return sanitizeDocument(doc);
      }
      return fileStores.users.findOne(query);
    },
    async create(data) {
      if (isMongoConnected()) {
        const doc = await UserModel.create(data);
        return sanitizeDocument(doc);
      }
      return fileStores.users.create(data);
    },
    async count() {
      if (isMongoConnected()) return await UserModel.countDocuments();
      return fileStores.users.countDocuments();
    }
  },

  business: {
    async getProfile() {
      if (isMongoConnected()) {
        let doc = await BusinessModel.findOne();
        if (!doc) {
          doc = await BusinessModel.create({});
        }
        return sanitizeDocument(doc);
      }
      let doc = fileStores.business.read()[0];
      if (!doc) {
        doc = fileStores.business.create({
          legalName: 'Vani Studios Private Limited',
          tradeName: 'Vani Digital & Creative Labs',
          gstin: '27AABCV1234F1Z8',
          pan: 'AABCV1234F',
          email: 'billing@vanistudios.in',
          phone: '+91 98201 12345',
          addressLine1: 'Suite 402, Lotus Grandeur, Andheri West',
          addressLine2: 'Veera Desai Road',
          city: 'Mumbai',
          state: 'Maharashtra',
          stateCode: '27',
          pincode: '400053',
          logoUrl: '',
          bankDetails: {
            bankName: 'HDFC Bank Ltd',
            accountHolder: 'Vani Studios Private Limited',
            accountNumber: '50200049281729',
            ifscCode: 'HDFC0001042',
            branch: 'Andheri West Branch, Mumbai',
            upiId: 'vanistudios@okhdfcbank'
          },
          invoicePrefix: 'INV-2024-',
          nextInvoiceNumber: 101,
          termsAndConditions: '1. Payment is due within 15 days of invoice date.\n2. Please mention the invoice number in the NEFT/RTGS/IMPS transfer remarks.\n3. Goods or services once billed are non-refundable unless agreed in writing.',
          defaultNotes: 'Thank you for your business! We appreciate the opportunity to collaborate with you.',
          resendApiKey: '',
          resendFromEmail: 'invoicing@updates.resend.dev'
        });
      }
      return sanitizeDocument(doc);
    },
    async updateProfile(updates) {
      if (isMongoConnected()) {
        let doc = await BusinessModel.findOne();
        if (!doc) {
          doc = await BusinessModel.create(updates);
        } else {
          Object.assign(doc, updates, { updatedAt: new Date() });
          await doc.save();
        }
        return sanitizeDocument(doc);
      }
      let docs = fileStores.business.read();
      if (!docs.length) {
        return fileStores.business.create(updates);
      }
      return fileStores.business.findByIdAndUpdate(docs[0].id, updates);
    }
  },

  customers: {
    async find(query = {}) {
      if (isMongoConnected()) {
        const docs = await CustomerModel.find(query).sort({ createdAt: -1 });
        return sanitizeDocument(docs);
      }
      return fileStores.customers.find(query);
    },
    async findById(id) {
      if (isMongoConnected()) {
        const doc = await CustomerModel.findById(id);
        return sanitizeDocument(doc);
      }
      return fileStores.customers.findById(id);
    },
    async create(data) {
      if (isMongoConnected()) {
        const doc = await CustomerModel.create(data);
        return sanitizeDocument(doc);
      }
      return fileStores.customers.create(data);
    },
    async update(id, data) {
      if (isMongoConnected()) {
        const doc = await CustomerModel.findByIdAndUpdate(id, data, { new: true });
        return sanitizeDocument(doc);
      }
      return fileStores.customers.findByIdAndUpdate(id, data);
    },
    async delete(id) {
      if (isMongoConnected()) {
        const doc = await CustomerModel.findByIdAndDelete(id);
        return sanitizeDocument(doc);
      }
      return fileStores.customers.findByIdAndDelete(id);
    },
    async count() {
      if (isMongoConnected()) return await CustomerModel.countDocuments();
      return fileStores.customers.countDocuments();
    }
  },

  catalog: {
    async find(query = {}) {
      if (isMongoConnected()) {
        const docs = await CatalogItemModel.find(query).sort({ createdAt: -1 });
        return sanitizeDocument(docs);
      }
      return fileStores.catalog.find(query);
    },
    async findById(id) {
      if (isMongoConnected()) {
        const doc = await CatalogItemModel.findById(id);
        return sanitizeDocument(doc);
      }
      return fileStores.catalog.findById(id);
    },
    async create(data) {
      if (isMongoConnected()) {
        const doc = await CatalogItemModel.create(data);
        return sanitizeDocument(doc);
      }
      return fileStores.catalog.create(data);
    },
    async update(id, data) {
      if (isMongoConnected()) {
        const doc = await CatalogItemModel.findByIdAndUpdate(id, data, { new: true });
        return sanitizeDocument(doc);
      }
      return fileStores.catalog.findByIdAndUpdate(id, data);
    },
    async delete(id) {
      if (isMongoConnected()) {
        const doc = await CatalogItemModel.findByIdAndDelete(id);
        return sanitizeDocument(doc);
      }
      return fileStores.catalog.findByIdAndDelete(id);
    },
    async count() {
      if (isMongoConnected()) return await CatalogItemModel.countDocuments();
      return fileStores.catalog.countDocuments();
    }
  },

  invoices: {
    async find(query = {}) {
      if (isMongoConnected()) {
        const docs = await InvoiceModel.find(query).sort({ createdAt: -1 });
        return sanitizeDocument(docs);
      }
      return fileStores.invoices.find(query);
    },
    async findById(id) {
      if (isMongoConnected()) {
        const doc = await InvoiceModel.findById(id);
        return sanitizeDocument(doc);
      }
      return fileStores.invoices.findById(id);
    },
    async create(data) {
      if (isMongoConnected()) {
        const doc = await InvoiceModel.create(data);
        return sanitizeDocument(doc);
      }
      return fileStores.invoices.create(data);
    },
    async update(id, data) {
      if (isMongoConnected()) {
        const doc = await InvoiceModel.findByIdAndUpdate(id, data, { new: true });
        return sanitizeDocument(doc);
      }
      return fileStores.invoices.findByIdAndUpdate(id, data);
    },
    async delete(id) {
      if (isMongoConnected()) {
        const doc = await InvoiceModel.findByIdAndDelete(id);
        return sanitizeDocument(doc);
      }
      return fileStores.invoices.findByIdAndDelete(id);
    },
    async count(query = {}) {
      if (isMongoConnected()) return await InvoiceModel.countDocuments(query);
      return fileStores.invoices.countDocuments(query);
    }
  }
};

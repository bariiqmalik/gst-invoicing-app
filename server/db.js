import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let isUsingRealMongo = false;

// Global helper to clean objects for API response (strips _id, __v, converts to clean id)
export function sanitizeDocument(doc) {
  if (!doc) return null;
  if (Array.isArray(doc)) {
    return doc.map(sanitizeDocument);
  }
  let obj = doc;
  if (typeof doc.toObject === 'function') {
    obj = doc.toObject();
  } else if (typeof doc.toJSON === 'function') {
    obj = doc.toJSON();
  } else {
    obj = { ...doc };
  }

  if (obj._id) {
    obj.id = obj._id.toString();
    delete obj._id;
  }
  delete obj.__v;
  return obj;
}

// File-backed persistent fallback store
class FileStore {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.filePath = path.join(DATA_DIR, `${collectionName}.json`);
    this.init();
  }

  init() {
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
    }
  }

  read() {
    try {
      if (!fs.existsSync(this.filePath)) return [];
      const data = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(data || '[]');
    } catch (err) {
      console.error(`Error reading ${this.collectionName}:`, err);
      return [];
    }
  }

  write(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch (err) {
      console.error(`Error writing ${this.collectionName}:`, err);
    }
  }

  find(query = {}) {
    const items = this.read();
    return items.filter(item => {
      for (const [k, v] of Object.entries(query)) {
        if (item[k] !== v) return false;
      }
      return true;
    }).map(sanitizeDocument);
  }

  findOne(query = {}) {
    const items = this.read();
    const item = items.find(i => {
      for (const [k, v] of Object.entries(query)) {
        if (i[k] !== v) return false;
      }
      return true;
    });
    return item ? sanitizeDocument(item) : null;
  }

  findById(id) {
    const items = this.read();
    const item = items.find(i => (i.id === id || i._id === id));
    return item ? sanitizeDocument(item) : null;
  }

  create(doc) {
    const items = this.read();
    const newDoc = {
      ...doc,
      id: doc.id || ('id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)),
      createdAt: doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.unshift(newDoc);
    this.write(items);
    return sanitizeDocument(newDoc);
  }

  findByIdAndUpdate(id, updates) {
    const items = this.read();
    const idx = items.findIndex(i => (i.id === id || i._id === id));
    if (idx === -1) return null;
    const updated = {
      ...items[idx],
      ...updates,
      id: items[idx].id || id,
      updatedAt: new Date().toISOString()
    };
    items[idx] = updated;
    this.write(items);
    return sanitizeDocument(updated);
  }

  findByIdAndDelete(id) {
    let items = this.read();
    const item = items.find(i => (i.id === id || i._id === id));
    if (!item) return null;
    items = items.filter(i => (i.id !== id && i._id !== id));
    this.write(items);
    return sanitizeDocument(item);
  }

  countDocuments(query = {}) {
    return this.find(query).length;
  }
}

export const fileStores = {
  users: new FileStore('users'),
  business: new FileStore('business'),
  customers: new FileStore('customers'),
  catalog: new FileStore('catalog'),
  invoices: new FileStore('invoices')
};

export async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gst_invoicing';
  try {
    // Attempt Mongoose connection with 2.5s timeout
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2500 });
    isUsingRealMongo = true;
    console.log('Connected to MongoDB successfully at', uri);
  } catch {
    console.log('Notice: MongoDB server not running locally. Using persistent JSON database in server/data/');
    isUsingRealMongo = false;
  }
}

export function isMongoConnected() {
  return isUsingRealMongo;
}

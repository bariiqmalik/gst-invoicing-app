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
    this.memoryData = null;
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.filePath)) {
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2));
      }
    } catch {
      // Ignore write errors during initialization in read-only environments
    }
  }

  read() {
    if (this.memoryData) return this.memoryData;

    // Check if a mutated copy was written to /tmp in serverless
    try {
      const tmpPath = path.join('/tmp', 'gst_data', `${this.collectionName}.json`);
      if (fs.existsSync(tmpPath)) {
        const data = fs.readFileSync(tmpPath, 'utf-8');
        this.memoryData = JSON.parse(data || '[]');
        return this.memoryData;
      }
    } catch {
      // Ignore
    }

    try {
      if (!fs.existsSync(this.filePath)) return [];
      const data = fs.readFileSync(this.filePath, 'utf-8');
      this.memoryData = JSON.parse(data || '[]');
      return this.memoryData;
    } catch (err) {
      console.error(`Error reading ${this.collectionName}:`, err);
      return [];
    }
  }

  write(data) {
    this.memoryData = data;
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2));
    } catch {
      // If filesystem is read-only (such as Vercel serverless), write to /tmp
      try {
        const tmpDir = path.join('/tmp', 'gst_data');
        if (!fs.existsSync(tmpDir)) {
          fs.mkdirSync(tmpDir, { recursive: true });
        }
        fs.writeFileSync(path.join(tmpDir, `${this.collectionName}.json`), JSON.stringify(data, null, 2));
      } catch (tmpErr) {
        console.warn(`Write fallback to /tmp failed for ${this.collectionName}:`, tmpErr.message);
      }
    }
  }

  find(query = {}) {
    const items = this.read();
    return items.filter(item => {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        const itemVal = item[k];
        if (itemVal !== v && String(itemVal) !== String(v)) {
          return false;
        }
      }
      return true;
    }).map(sanitizeDocument);
  }

  findOne(query = {}) {
    const items = this.read();
    const item = items.find(i => {
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null) continue;
        const itemVal = i[k];
        if (itemVal !== v && String(itemVal) !== String(v)) {
          return false;
        }
      }
      return true;
    });
    return item ? sanitizeDocument(item) : null;
  }

  findById(id, workspace_id = null) {
    const items = this.read();
    const item = items.find(i => {
      const idMatch = (i.id === id || i._id === id || String(i.id) === String(id) || String(i._id) === String(id));
      if (!idMatch) return false;
      if (workspace_id && i.workspace_id && String(i.workspace_id) !== String(workspace_id)) {
        return false;
      }
      return true;
    });
    return item ? sanitizeDocument(item) : null;
  }

  create(doc) {
    const items = this.read();
    const newDoc = {
      ...doc,
      id: doc.id || ('id_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5)),
      createdAt: doc.createdAt || doc.created_at || new Date().toISOString(),
      created_at: doc.created_at || doc.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    items.unshift(newDoc);
    this.write(items);
    return sanitizeDocument(newDoc);
  }

  findByIdAndUpdate(id, updates, workspace_id = null) {
    const items = this.read();
    const idx = items.findIndex(i => {
      const idMatch = (i.id === id || i._id === id || String(i.id) === String(id) || String(i._id) === String(id));
      if (!idMatch) return false;
      if (workspace_id && i.workspace_id && String(i.workspace_id) !== String(workspace_id)) {
        return false;
      }
      return true;
    });
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

  findByIdAndDelete(id, workspace_id = null) {
    let items = this.read();
    const item = items.find(i => {
      const idMatch = (i.id === id || i._id === id || String(i.id) === String(id) || String(i._id) === String(id));
      if (!idMatch) return false;
      if (workspace_id && i.workspace_id && String(i.workspace_id) !== String(workspace_id)) {
        return false;
      }
      return true;
    });
    if (!item) return null;
    items = items.filter(i => (i.id !== item.id && i._id !== item.id));
    this.write(items);
    return sanitizeDocument(item);
  }

  countDocuments(query = {}) {
    return this.find(query).length;
  }
}

export const fileStores = {
  workspaces: new FileStore('workspaces'),
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

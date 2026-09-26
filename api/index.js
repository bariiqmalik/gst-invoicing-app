import app from '../server/app.js';
import { connectDB } from '../server/db.js';
import { seedSampleData } from '../server/seedData.js';

let isInitialized = false;

export default async function handler(req, res) {
  if (!isInitialized) {
    try {
      await connectDB();
      await seedSampleData();
      isInitialized = true;
    } catch (err) {
      console.error('Vercel serverless init error:', err);
    }
  }
  return app(req, res);
}

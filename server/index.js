import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './db.js';
import { seedSampleData } from './seedData.js';

import authRoutes from './routes/auth.js';
import businessRoutes from './routes/business.js';
import customerRoutes from './routes/customers.js';
import catalogRoutes from './routes/catalog.js';
import invoiceRoutes from './routes/invoices.js';
import emailRoutes from './routes/email.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'GST Invoicing and Billing System',
    region: 'IN'
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/invoices', emailRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/dashboard', dashboardRoutes);

// 404 JSON Handler for unmatched /api routes
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Endpoint not found: ${req.method} ${req.originalUrl}` });
});

// Error Handling Middleware
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

async function startServer() {
  await connectDB();
  await seedSampleData();

  app.listen(PORT, () => {
    console.log(`GST Invoicing API Server running on http://localhost:${PORT}`);
  });
}

startServer();

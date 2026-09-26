import app from './app.js';
import { connectDB } from './db.js';
import { seedSampleData } from './seedData.js';

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();
  await seedSampleData();

  app.listen(PORT, () => {
    console.log(`GST Invoicing API Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from 'express';
import cors from 'cors';
import userRoutes from '../routes/userRoutes.js';
import transactionRoutes from '../routes/transactionRoutes.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not set');
console.log('Starting backend...');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://wealth-pro.vercel.app'],
  credentials: true
}));
app.use(express.json());

console.log('Attempting MongoDB connection...');
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 10000
})
  .then(() => {
    console.log('MongoDB Connected Successfully');
  })
  .catch(err => {
    console.error('MongoDB Connection Error:', err.message, err.stack);
  });

// Health check endpoint to verify MongoDB connection
app.get('/health', async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
    res.json({ status: 'Backend running', mongoDB: dbStatus });
  } catch (err) {
    console.error('Health check error:', err.message);
    res.status(500).json({ status: 'Error', message: err.message });
  }
});

console.log('Mounting routes...');
try {
  app.use('/users', userRoutes);
  app.use('/transactions', transactionRoutes);
  console.log('Routes mounted successfully: /users, /transactions');
} catch (err) {
  console.error('Error mounting routes:', err.message, err.stack);
}

app.get('/', (req, res) => {
  console.log('Handling GET / request');
  res.json({ message: 'Backend is running' });
});

app.use((req, res) => {
  console.log(`404 Error: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'The page could not be found', error: 'NOT_FOUND' });
});

export default app;
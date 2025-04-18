import express from 'express';
import cors from 'cors';
import userRoutes from '../routes/userRoutes.js';
import transactionRoutes from '../routes/transactionRoutes.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'https://wealth-pro.vercel.app'],
  credentials: true
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB Error:', err));

console.log('Mounting routes...');
app.use('/users', userRoutes);
app.use('/transactions', transactionRoutes);
console.log('Routes mounted: /users, /transactions');

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running' });
});

app.use((req, res) => {
  console.log(`404: ${req.method} ${req.url}`);
  res.status(404).json({ message: 'The page could not be found', error: 'NOT_FOUND' });
});

export default app;
import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['deposit', 'withdraw'], required: true },
  amount: { type: Number, required: true },
  txid: { type: String },
  address: { type: String },
  planName: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' },
  date: { type: Date, default: Date.now }
});

export default mongoose.model('Transaction', transactionSchema);
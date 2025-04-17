import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  plan: { type: String, default: null },
  referredBy: { type: String, default: null },
  invitationCode: { type: String, unique: true },
  lastTaskDate: { type: Date },
  completedTasks: [{ plan: String, amount: Number, date: Date }],
  todayEarning: { amount: Number, date: String },
});

export default mongoose.model('User', userSchema);
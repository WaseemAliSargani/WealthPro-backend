import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance: { type: Number, default: 0 },
  plan: { type: String, enum: ["Silver", "Golden", "Diamond", null], default: null },
  lastTaskDate: { type: Date },
  completedTasks: [{ plan: String, amount: Number, date: Date }],
  todayEarning: { amount: Number, date: String },
  invitationCode: { type: String, unique: true }, // Unique referral code
  referredBy: { type: String, default: null } // Referrer's email
});

export default mongoose.model("User", userSchema);
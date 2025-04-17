// Backend/routes/userRoutes.js
import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Generate a unique alphanumeric invitation code (e.g., INVL8C6ZERP)
const generateInvitationCode = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "INV";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const authMiddleware = async (req, res, next) => {
  console.log("Auth middleware - Headers:", req.headers);
  const { email, password } = req.headers;
  if (!email || !password) return res.status(401).json({ message: "Email and password required" });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });
    const bcrypt = (await import("bcryptjs")).default;
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid password" });
    }
    req.userId = user._id.toString();
    next();
  } catch (error) {
    console.error("Auth error:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("email balance plan lastTaskDate completedTasks todayEarning invitationCode");
    if (!user) return res.status(404).json({ message: "User not found" });
    console.log("Returning user data:", user);
    res.json(user);
  } catch (error) {
    console.error("Get user error:", error.stack);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/signup", async (req, res) => {
  const { email, password, ref } = req.body;
  try {
    const bcrypt = (await import("bcryptjs")).default;
    const hashedPassword = await bcrypt.hash(password, 10);

    // Handle referral
    let referredBy = null;
    if (ref) {
      const referrer = await User.findOne({ invitationCode: ref });
      if (referrer) {
        referredBy = referrer.email;
        referrer.balance = (referrer.balance || 0) + 5;
        await referrer.save();
        console.log(`Bonus awarded to ${referrer.email} for inviting ${email}`);
      }
    }

    // Generate unique invitationCode
    let invitationCode;
    let isUnique = false;
    while (!isUnique) {
      invitationCode = generateInvitationCode();
      const existing = await User.findOne({ invitationCode });
      if (!existing) isUnique = true;
    }

    const user = new User({
      email,
      password: hashedPassword,
      referredBy,
      invitationCode,
      balance: 0,
      plan: null,
    });
    await user.save();
    res.json({ message: "User created", email, invitationCode });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "User not found" });
    const bcrypt = (await import("bcryptjs")).default;
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid password" });
    }
    res.json({ email: user.email, plan: user.plan, balance: user.balance, invitationCode: user.invitationCode });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/task", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.plan) return res.status(400).json({ message: "No plan activated" });

    const today = new Date().toDateString();
    if (user.lastTaskDate && new Date(user.lastTaskDate).toDateString() === today) {
      return res.status(400).json({ message: "Task already completed today" });
    }

    const earnings = { Silver: 1, Golden: 2, Diamond: 3.5 }[user.plan];
    if (!earnings) return res.status(400).json({ message: "Invalid plan" });

    user.balance = (user.balance || 0) + earnings;
    user.lastTaskDate = new Date();
    user.completedTasks = user.completedTasks || [];
    user.completedTasks.push({ plan: user.plan, amount: earnings, date: new Date() });
    user.todayEarning = { amount: earnings, date: today };
    await user.save();

    console.log("Task completed for user:", user.email, "Earnings:", earnings);
    res.json({ balance: user.balance, plan: user.plan, todayEarning: user.todayEarning, completedTasks: user.completedTasks });
  } catch (error) {
    console.error("Task error:", error.stack);
    res.status(500).json({ message: "Server error in task", error: error.message });
  }
});

export default router;
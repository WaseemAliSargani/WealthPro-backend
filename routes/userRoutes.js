import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// Generate a unique alphanumeric invitation code
const generateInvitationCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'INV';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Authentication middleware
const authMiddleware = async (req, res, next) => {
  const { email, password } = req.headers;
  if (!email || !password) {
    return res.status(401).json({ message: 'Email and password required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    req.userId = user._id.toString();
    next();
  } catch (error) {
    console.error('Auth error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all users
router.get('/', async (req, res) => {
  try {
    const users = await User.find().select('email balance plan invitationCode');
    res.json(users);
  } catch (error) {
    console.error('Get users error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('email balance plan lastTaskDate completedTasks todayEarning invitationCode');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, ref } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
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
    res.status(201).json({ message: 'User created', email, invitationCode });
  } catch (error) {
    console.error('Signup error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid password' });
    }
    res.json({ email: user.email, plan: user.plan, balance: user.balance, invitationCode: user.invitationCode });
  } catch (error) {
    console.error('Login error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete daily task
router.post('/task', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.plan) {
      return res.status(400).json({ message: 'No plan activated' });
    }
    const today = new Date().toDateString();
    if (user.lastTaskDate && new Date(user.lastTaskDate).toDateString() === today) {
      return res.status(400).json({ message: 'Task already completed today' });
    }
    const earnings = { Silver: 1, Golden: 2, Diamond: 3.5 }[user.plan];
    if (!earnings) {
      return res.status(400).json({ message: 'Invalid plan' });
    }
    user.balance = (user.balance || 0) + earnings;
    user.lastTaskDate = new Date();
    user.completedTasks = user.completedTasks || [];
    user.completedTasks.push({ plan: user.plan, amount: earnings, date: new Date() });
    user.todayEarning = { amount: earnings, date: today };
    await user.save();
    res.json({ balance: user.balance, plan: user.plan, todayEarning: user.todayEarning, completedTasks: user.completedTasks });
  } catch (error) {
    console.error('Task error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
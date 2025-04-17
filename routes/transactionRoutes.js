import express from 'express';
import Transaction from '../models/Transaction.js';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

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
    req.userId = user._id;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Deposit Request
router.post('/deposit', authMiddleware, async (req, res) => {
  const { amount, txid, planName } = req.body;
  if (!amount || !txid) {
    return res.status(400).json({ message: 'Amount and TXID required' });
  }
  const validPlans = ['Silver', 'Golden', 'Diamond', null];
  if (planName && !validPlans.includes(planName)) {
    return res.status(400).json({ message: 'Invalid plan name' });
  }
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const transaction = new Transaction({
      userId: user._id,
      amount,
      type: 'deposit',
      status: 'pending',
      txid,
      planName,
    });
    await transaction.save();
    res.json({ message: 'Deposit recorded, awaiting approval', transaction });
  } catch (error) {
    console.error('Deposit error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Withdraw Request
router.post('/withdraw', authMiddleware, async (req, res) => {
  const { amount, address, password } = req.body;
  if (!amount || !address || !password) {
    return res.status(400).json({ message: 'Amount, address, and password required' });
  }
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid withdrawal password' });
    }
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount)) {
      return res.status(400).json({ message: 'Invalid withdrawal amount' });
    }
    if (withdrawalAmount < 30 || withdrawalAmount > 10000) {
      return res.status(400).json({ message: 'Withdrawal amount must be between 30 and 10,000 USDT' });
    }
    if (user.balance < withdrawalAmount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }
    const transaction = new Transaction({
      userId: user._id,
      amount: withdrawalAmount,
      type: 'withdraw',
      status: 'pending',
      address,
      network: 'BEP20-USDT',
    });
    await transaction.save();
    res.json({ message: 'Withdrawal requested, awaiting approval', transaction });
  } catch (error) {
    console.error('Withdraw error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get Transactions
router.get('/', authMiddleware, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.userId }).sort({ createdAt: -1 });
    res.json(transactions);
  } catch (error) {
    console.error('Get transactions error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update Transaction Status (Admin or Manual Update)
router.patch('/update-status/:transactionId', async (req, res) => {
  const { transactionId } = req.params;
  const { status } = req.body;
  const validStatuses = ['pending', 'approved', 'rejected'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    transaction.status = status;
    await transaction.save();
    if (status === 'approved' && transaction.type === 'deposit' && transaction.planName) {
      const user = await User.findById(transaction.userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      user.plan = transaction.planName;
      user.balance = (user.balance || 0) + transaction.amount;
      await user.save();
      console.log(`Plan ${transaction.planName} activated for user ${user.email}`);
    }
    res.json({ message: 'Transaction status updated', transaction });
  } catch (error) {
    console.error('Update transaction status error:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { db } = require('../firebase');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = z.object({
  username: z.string().trim().min(1).max(64),
  password: z.string().min(1).max(256),
});

router.post('/login', loginLimiter, async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid payload' });

  const { username, password } = parsed.data;
  const usersRef = db().ref('users');
  const snap = await usersRef.orderByChild('username').equalTo(username).once('value');
  const val = snap.val();
  if (!val) return res.status(401).json({ error: 'Invalid username or password' });

  const [id, user] = Object.entries(val)[0];
  const ok = await bcrypt.compare(password, user.passwordHash || '');
  if (!ok) return res.status(401).json({ error: 'Invalid username or password' });

  const token = jwt.sign(
    { sub: id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );

  res.json({
    token,
    user: { id, username: user.username, displayName: user.displayName || user.username },
  });
});

router.get('/me', requireAuth, async (req, res) => {
  const snap = await db().ref(`users/${req.user.id}`).once('value');
  const user = snap.val();
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({
    id: req.user.id,
    username: user.username,
    displayName: user.displayName || user.username,
  });
});

module.exports = router;

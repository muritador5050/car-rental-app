const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const { isAdmin } = require('../utils/middlewares');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  authenticateToken,
} = require('../utils/tokens');
const User = require('../models/user');

//RateLimit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per window
  message: 'Too many attempts from this IP, try again later',
});

// Register user
router.post(
  '/register',
  authLimiter,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('valid email is required'),
    body('password')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/)
      .withMessage(
        `Password must be at least 8 characters and contain at least one uppercase letter,
         one lowercase letter, one number, and one special character`
      ),
  ],

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });
    const { name, email, password, phone, address, driver_license_number } =
      req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email, and password are required' });
    }

    try {
      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser)
        return res.status(400).json({ message: 'Email already exists' });

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const userData = {
        name,
        email,
        password: hashedPassword,
        phone,
        address,
        driver_license_number,
      };

      const userId = await User.create(userData);

      res.status(201).json({
        message: 'User registered successfully',
        userId,
      });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);

// Register admin - protected route that requires admin privileges
router.post('/register-admin', authenticateToken, isAdmin, async (req, res) => {
  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: 'Name, email, and password are required' });
  }

  try {
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser)
      return res.status(400).json({ message: 'Email already exists' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user
    const userData = {
      name,
      email,
      password: hashedPassword,
    };

    const userId = await User.createAdmin(userData);

    res.status(201).json({
      message: 'Admin user registered successfully',
      userId,
    });
  } catch (err) {
    console.error('Admin registration error:', err);
    res.status(500).json({ message: 'Server error during admin registration' });
  }
});

// Login user
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;

  // Validate request body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Find user
    const user = await User.findByEmail(email);
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid credentials' });

    // Create tokens
    const accessToken = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);

    // Send refresh token as httpOnly cookie
    res.cookie('jid', refreshToken, {
      httpOnly: true,
      path: '/refresh_token',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // Send access token in response body
    res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Refresh token endpoint
router.post('/refresh_token', async (req, res) => {
  const token = req.cookies.jid;

  // Check if refresh token exists
  if (!token) return res.status(401).json({ ok: false, accessToken: '' });

  // Verify refresh token
  let payload = null;
  try {
    payload = verifyRefreshToken(token);
  } catch (err) {
    console.log(err);
    return res.status(401).json({
      ok: false,
      accessToken: '',
    });
  }

  // Token is valid, check if user exists
  try {
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({
        ok: false,
        accessToken: '',
      });
    }

    // Issue new refresh token (optional - for token rotation)
    const newRefreshToken = createRefreshToken(user.id);
    res.cookie('jid', newRefreshToken, {
      httpOnly: true,
      path: '/refresh_token',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    // Create new access token
    const accessToken = createAccessToken(user.id);

    // Send new access token
    return res.json({
      ok: true,
      accessToken,
    });
  } catch (err) {
    console.error('Refresh token error:', err);
    return res.status(500).json({
      ok: false,
      accessToken: '',
    });
  }
});

// Protected route
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const user = await User.getProfile(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'This is protected data!',
      user: user,
    });
  } catch (err) {
    console.error('Protected route error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Protected admin-only route
router.get('/admin', authenticateToken, isAdmin, async (req, res) => {
  try {
    const user = await User.getProfile(req.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      message: 'This is admin-only protected data!',
      user: user,
    });
  } catch (err) {
    console.error('Admin route error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('jid', { path: '/refresh_token' });
  res.json({ message: 'Logged out successfully' });
});

// 1. Forget password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findByEmail(email);
  if (!user)
    return res.status(404).json({ message: 'No user with this email' });

  const token = crypto.randomBytes(32).toString('hex');
  const expiry = new Date(Date.now() + 3600000); // 1 hour

  await User.forgetPassword({ token, expiry, email });

  res.json({ message: 'Reset link sent to email' });
});

//Reset password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;

  try {
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.resetPassword(token, hashed);

    if (!user)
      return res.status(400).json({ message: 'Invalid or expired token' });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

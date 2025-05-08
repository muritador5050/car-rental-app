const express = require('express');
const bcyrpt = require('bcryptjs');
const router = express.Router();
const {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
  authenticateToken,
} = require('../utils/tokens');

//Fake users
const users = [
  {
    id: 0,
    email: 'example@gmail.com',
    password: 'password',
  },
];

//Register user
router.post('/register', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required' });
  try {
    //User already exist
    // Find user
    const user = users.find((u) => u.email === email);
    if (user) return res.status(401).json({ message: 'Email already exist' });

    //hashpassword
    const hashpassword = await bcyrpt.hash(password, 10);
    users.push({
      id: users.length,
      email,
      password: hashpassword,
    });
    console.log(users);

    res.status(201).json({ message: 'Created a user successfuly' });
  } catch (err) {
    res.status(404).json(err.message);
  }
});

//Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  // Validate request body
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    //Check for credential
    // Find user
    const user = users.find((u) => u.email === email);
    if (!user) return res.status(401).json({ message: 'Invalid credential' });

    //Check for matching credential
    const isMatch = await bcyrpt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Incorrect credential' });

    // Create tokens
    const accessToken = createAccessToken(user.id);
    const refreshToken = createRefreshToken(user.id);

    // Send refresh token as httpOnly cookie (more secure)
    res.cookie('jid', refreshToken, {
      httpOnly: true,
      path: '/refresh_token',
    });

    // Send access token in response body
    res.json({
      accessToken,
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
});

// Refresh token endpoint - issues new access tokens
router.post('/refresh_token', (req, res) => {
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
  const user = users.find((u) => u.id === payload.userId);
  if (!user) {
    return res.status(401).json({
      ok: false,
      accessToken: '',
    });
  }

  // Issue new refresh token (optional - for token rotation)
  const newRefreshToken = createRefreshToken(user.id);
  res.cookie('jid', newRefreshToken, {
    ok: false,
    accessToken: '',
  });

  // Create new access token
  const accessToken = createAccessToken(user.id);

  // Send new access token
  return res.json({
    ok: true,
    accessToken,
    newRefreshToken,
  });
});

// Protected route example
router.get('/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is protected data!', userId: req.userId });
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.clearCookie('jid', { path: '/refresh_token' });
  res.json({ message: 'Logged out successfully' });
});
module.exports = router;

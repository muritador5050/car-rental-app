const jwt = require('jsonwebtoken');
const User = require('../models/user');
require('dotenv').config();

// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
  try {
    const isAdmin = await User.isAdmin(req.id);

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: 'Access denied. Admin privileges required.' });
    }
    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ message: 'Error checking admin status' });
  }
};

// Middleware to authenticate tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.id = payload.id;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = {
  isAdmin,
  authenticateToken,
};

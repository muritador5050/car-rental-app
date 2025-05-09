const User = require('../models/user');

// Middleware to check if the user is an admin
const isAdmin = async (req, res, next) => {
  try {
    const isAdmin = await User.isAdmin(req.userId);

    if (!isAdmin) {
      return res
        .status(403)
        .json({ message: 'Access denied. Admin privileges required.' });
    }

    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  isAdmin,
};

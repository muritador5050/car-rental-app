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
    // Attach user admin status to request
    req.isAdmin = true;
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ message: 'Error checking admin status' });
  }
};

module.exports = {
  isAdmin,
};

require('dotenv/config');
const { sign, verify } = require('jsonwebtoken');

//CreateAccessToken
const createAccessToken = (userId) => {
  return sign(
    { id: userId.id, email: userId.email },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: '15m',
    }
  );
};

//CreateRefreshToken
const createRefreshToken = (userId) => {
  return sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: '7d',
  });
};

//VerifyRefreshToken
const verifyRefreshToken = (token) => {
  return verify(token, process.env.REFRESH_TOKEN_SECRET);
};

//AuthenticateToken middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      return res
        .status(403)
        .json({ message: 'Invalid or expired token' + err.message });
    }
    req.userId = user.userId;
    next();
  });
};

module.exports = {
  createAccessToken,
  createRefreshToken,
  authenticateToken,
  verifyRefreshToken,
};

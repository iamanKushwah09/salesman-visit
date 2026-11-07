const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token = null;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized: Token missing' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'salesman_field_suite_super_secret_jwt_key_2026');
    const user = await User.findById(decoded.id).populate('role').populate('salesmanProfile');

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'User not found or account deactivated' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Auth protect error:', err.message);
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

module.exports = { protect };


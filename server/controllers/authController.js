const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const Salesman = require('../models/Salesman');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'salesman_field_suite_super_secret_jwt_key_2026', {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .populate('role')
      .populate('salesmanProfile');

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account has been deactivated. Contact Admin.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user._id);

    // Extract role permissions
    const permissions = user.role ? user.role.permissions || [] : [];
    const isSuperAdmin = user.role?.slug === 'super_admin';

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role?.name || user.roleName || 'User',
        roleName: user.role?.name || user.roleName || 'User',
        roleSlug: user.role?.slug || user.roleSlug || '',
        isSuperAdmin,
        permissions: isSuperAdmin ? ['*'] : permissions,
        salesmanProfile: user.salesmanProfile || null,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error during login', error: err.message });
  }
};

// GET /api/auth/me
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('role')
      .populate('salesmanProfile');

    const permissions = user.role ? user.role.permissions || [] : [];
    const isSuperAdmin = user.role?.slug === 'super_admin';

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role?.name || user.roleName || 'User',
        roleName: user.role?.name || user.roleName || 'User',
        roleSlug: user.role?.slug || user.roleSlug || '',
        isSuperAdmin,
        permissions: isSuperAdmin ? ['*'] : permissions,
        salesmanProfile: user.salesmanProfile || null,
      },
    });
  } catch (err) {
    console.error('getMe error:', err);
    res.status(500).json({ success: false, message: 'Failed to retrieve profile' });
  }
};

// PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (password && password.trim().length >= 6) {
      user.password = password;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};


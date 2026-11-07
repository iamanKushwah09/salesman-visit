const User = require('../models/User');
const Role = require('../models/Role');
const Salesman = require('../models/Salesman');

// GET /api/users
exports.getAllUsers = async (req, res) => {
  try {
    const { search = '', role = '', status = '' } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) {
      query.role = role;
    }
    if (status) {
      query.isActive = status === 'active';
    }

    const users = await User.find(query)
      .populate('role', 'name slug permissions')
      .populate('salesmanProfile', 'salesmanCode territory phone vehicleType')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, users });
  } catch (err) {
    console.error('getAllUsers error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

// POST /api/users
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone = '', roleId, salesmanId = null } = req.body;

    if (!name || !email || !password || !roleId) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, password, and role are required',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(400).json({ success: false, message: 'Invalid role selected' });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone.trim(),
      role: role._id,
      roleName: role.name,
      roleSlug: role.slug,
      salesmanProfile: salesmanId || null,
      isActive: true,
    });

    await user.save();

    // If linked to a salesman, update salesman record with user link
    if (salesmanId) {
      await Salesman.findByIdAndUpdate(salesmanId, { user: user._id });
    }

    const populated = await User.findById(user._id)
      .populate('role', 'name slug permissions')
      .populate('salesmanProfile');

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: populated,
    });
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).json({ success: false, message: 'Failed to create user', error: err.message });
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res) => {
  try {
    const { name, email, password, phone, roleId, salesmanId, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name.trim();
    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
      user.email = email.toLowerCase().trim();
    }
    if (password && password.trim().length >= 6) {
      user.password = password;
    }
    if (phone !== undefined) user.phone = phone.trim();

    if (roleId) {
      const role = await Role.findById(roleId);
      if (role) {
        user.role = role._id;
        user.roleName = role.name;
        user.roleSlug = role.slug;
      }
    }

    if (salesmanId !== undefined) {
      user.salesmanProfile = salesmanId || null;
      if (salesmanId) {
        await Salesman.findByIdAndUpdate(salesmanId, { user: user._id });
      }
    }

    if (isActive !== undefined) {
      user.isActive = isActive;
    }

    await user.save();

    const updated = await User.findById(user._id)
      .populate('role', 'name slug permissions')
      .populate('salesmanProfile');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      user: updated,
    });
  } catch (err) {
    console.error('updateUser error:', err);
    res.status(500).json({ success: false, message: 'Failed to update user', error: err.message });
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    const user = await User.findById(req.params.id).populate('role');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role?.slug === 'super_admin') {
      const superAdminCount = await User.countDocuments({ roleSlug: 'super_admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({ success: false, message: 'Cannot delete the only Super Admin' });
      }
    }

    // Unlink salesman if attached
    if (user.salesmanProfile) {
      await Salesman.findByIdAndUpdate(user.salesmanProfile, { user: null });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'User deleted successfully' });
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};


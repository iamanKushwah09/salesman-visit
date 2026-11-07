const Role = require('../models/Role');
const User = require('../models/User');

// System-wide available permissions catalogue with clean English labels
const AVAILABLE_PERMISSIONS = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    category: 'Overview',
    description: 'View daily visits summary, collections total, and key metrics',
  },
  {
    key: 'live_tracking',
    label: 'Live Tracking',
    category: 'Field Operations',
    description: 'View real-time salesman locations, active routes, and movement on the map',
  },
  {
    key: 'routes',
    label: 'Routes',
    category: 'Field Operations',
    description: 'Create and assign daily routes with customer stops',
  },
  {
    key: 'visits',
    label: 'Visits',
    category: 'Field Operations',
    description: 'Record customer visits with check-in, remarks, and order details',
  },
  {
    key: 'parties',
    label: 'Parties / Customers',
    category: 'Master Data',
    description: 'Manage retail shops, addresses, and customer details',
  },
  {
    key: 'collections',
    label: 'Collections',
    category: 'Finance',
    description: 'Record payment receipts (Cash, UPI, Cheque) and view collection summaries',
  },
  {
    key: 'salesmen',
    label: 'Salesmen',
    category: 'Master Data',
    description: 'Manage field salesmen profiles, territories, and contact details',
  },
  {
    key: 'users',
    label: 'Users',
    category: 'Administration',
    description: 'Manage user accounts, passwords, and assigned roles',
  },
  {
    key: 'roles',
    label: 'Roles & Permissions',
    category: 'Administration',
    description: 'Create custom roles and configure screen access permissions',
  },
];

// GET /api/roles/available-permissions
exports.getAvailablePermissions = async (req, res) => {
  res.status(200).json({
    success: true,
    permissions: AVAILABLE_PERMISSIONS,
  });
};

// GET /api/roles
exports.getAllRoles = async (req, res) => {
  try {
    const roles = await Role.find().sort({ createdAt: -1 });

    // Count users per role
    const rolesWithCounts = await Promise.all(
      roles.map(async (r) => {
        const count = await User.countDocuments({ role: r._id });
        return {
          ...r.toObject(),
          userCount: count,
        };
      })
    );

    res.status(200).json({
      success: true,
      roles: rolesWithCounts,
    });
  } catch (err) {
    console.error('getAllRoles error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
};

// GET /api/roles/:id
exports.getRoleById = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }
    res.status(200).json({ success: true, role });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch role' });
  }
};

// POST /api/roles
exports.createRole = async (req, res) => {
  try {
    const { name, description = '', permissions = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Role name is required' });
    }

    const trimmedName = name.trim();
    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '_');

    const existing = await Role.findOne({ $or: [{ name: trimmedName }, { slug }] });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Role with this name already exists' });
    }

    const newRole = await Role.create({
      name: trimmedName,
      slug,
      description,
      permissions: Array.isArray(permissions) ? permissions : [],
      isDefault: false,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      role: newRole,
    });
  } catch (err) {
    console.error('createRole error:', err);
    res.status(500).json({ success: false, message: 'Failed to create role', error: err.message });
  }
};

// PUT /api/roles/:id
exports.updateRole = async (req, res) => {
  try {
    const { name, description, permissions, isActive } = req.body;
    const role = await Role.findById(req.params.id);

    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    // Protect Super Admin from losing critical permissions
    if (role.slug === 'super_admin' && permissions && !permissions.includes('roles')) {
      return res.status(400).json({
        success: false,
        message: 'Super Admin must retain Role Management permission',
      });
    }

    if (name) {
      role.name = name.trim();
      role.slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
    }
    if (description !== undefined) role.description = description;
    if (Array.isArray(permissions)) role.permissions = permissions;
    if (isActive !== undefined) role.isActive = isActive;

    await role.save();

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      role,
    });
  } catch (err) {
    console.error('updateRole error:', err);
    res.status(500).json({ success: false, message: 'Failed to update role', error: err.message });
  }
};

// DELETE /api/roles/:id
exports.deleteRole = async (req, res) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, message: 'Role not found' });
    }

    if (role.slug === 'super_admin' || role.isDefault) {
      return res.status(400).json({ success: false, message: 'Default system roles cannot be deleted' });
    }

    const assignedUsers = await User.countDocuments({ role: role._id });
    if (assignedUsers > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete: ${assignedUsers} users are currently assigned to this role`,
      });
    }

    await Role.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Role deleted successfully' });
  } catch (err) {
    console.error('deleteRole error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete role' });
  }
};


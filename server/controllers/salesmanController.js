const Salesman = require('../models/Salesman');
const User = require('../models/User');
const Role = require('../models/Role');
const LocationCurrent = require('../models/LocationCurrent');
const { isSalesmanConnected } = require('../services/socketService');

// Generate Next Salesman Code (e.g. SM-101, SM-102...)
async function getNextSalesmanCode() {
  const last = await Salesman.findOne().sort({ createdAt: -1 });
  if (!last || !last.salesmanCode) return 'SM-101';
  const num = parseInt(last.salesmanCode.replace(/\D/g, ''), 10);
  return isNaN(num) ? 'SM-101' : `SM-${num + 1}`;
}

// Find or safely auto-create the Field Salesman Role
async function getFieldSalesmanRole() {
  let role = await Role.findOne({ slug: 'field_salesman' });
  if (!role) {
    role = await Role.findOne({ slug: 'salesman' });
  }
  if (!role) {
    role = await Role.findOne({ name: { $regex: /salesman/i } });
  }
  if (!role) {
    role = await Role.create({
      name: 'Field Salesman',
      slug: 'field_salesman',
      description: 'Executes assigned field routes, customer visits, check-ins, and collections',
      permissions: ['dashboard', 'routes', 'visits', 'parties', 'collections'],
      isDefault: false,
      isActive: true,
    });
  }
  return role;
}

// GET /api/salesmen
exports.getAllSalesmen = async (req, res) => {
  try {
    const { search = '', territory = '', status = '' } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { salesmanCode: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { territory: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (territory) query.territory = territory;
    if (status) query.isActive = status === 'active';

    const [salesmen, locations] = await Promise.all([
      Salesman.find(query)
        .populate('user', 'email isActive roleSlug lastLogin')
        .sort({ createdAt: -1 }),
      LocationCurrent.find({}),
    ]);

    const locMap = new Map();
    locations.forEach((l) => locMap.set(l.salesman.toString(), l));

    const enriched = salesmen.map((sm) => {
      const sid = sm._id.toString();
      const loc = locMap.get(sid);
      const isConnected = isSalesmanConnected(sid);
      const lastSeenTime = loc?.lastSeenAt ? new Date(loc.lastSeenAt).getTime() : 0;
      const ageSeconds = lastSeenTime ? (Date.now() - lastSeenTime) / 1000 : Infinity;
      const isOnline = isConnected && ageSeconds <= 40;
      const trackingStatus = isOnline ? 'live' : (ageSeconds <= 120 ? 'stale' : 'offline');

      const doc = sm.toObject();
      doc.isOnline = isOnline;
      doc.trackingStatus = trackingStatus;
      doc.lastSeenAt = loc?.lastSeenAt || null;
      doc.liveLocation = loc
        ? {
            latitude: loc.latitude,
            longitude: loc.longitude,
            speed: loc.speed || 0,
            address: loc.address || '',
            battery: loc.battery,
          }
        : null;
      return doc;
    });

    res.status(200).json({ success: true, salesmen: enriched });
  } catch (err) {
    console.error('getAllSalesmen error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch salesmen' });
  }
};

// GET /api/salesmen/:id
exports.getSalesmanById = async (req, res) => {
  try {
    const salesman = await Salesman.findById(req.params.id).populate('user', 'email isActive roleSlug lastLogin');
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }
    res.status(200).json({ success: true, salesman });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch salesman' });
  }
};

// POST /api/salesmen
// Creates Salesman Profile + User Login Account atomically in one step
exports.createSalesman = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      territory = 'General Market',
      vehicleType,
      vehicleNumber = '',
      monthlyTarget = 0,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Salesman Full Name is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email is required for creating salesman login account',
      });
    }
    if (!password || password.trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password is required and must be at least 6 characters long',
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check if email already registered in User collection
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: `A login account with email '${cleanEmail}' already exists. Please provide a different email.`,
      });
    }

    const salesmanRole = await getFieldSalesmanRole();
    const salesmanCode = await getNextSalesmanCode();

    // 1. Create Salesman Profile
    const salesman = new Salesman({
      salesmanCode,
      name: name.trim(),
      phone: phone.trim(),
      email: cleanEmail,
      territory: territory.trim() || 'General Market',
      vehicleType: vehicleType || 'Bike / Scooter',
      vehicleNumber: vehicleNumber.trim(),
      monthlyTarget: Number(monthlyTarget) || 0,
      isActive: true,
    });
    await salesman.save();

    // 2. Create User Account for direct login
    const user = new User({
      name: salesman.name,
      email: cleanEmail,
      password: password.trim(),
      phone: salesman.phone,
      role: salesmanRole._id,
      roleName: salesmanRole.name,
      roleSlug: salesmanRole.slug,
      salesmanProfile: salesman._id,
      isActive: true,
    });
    await user.save();

    // 3. Link User back to Salesman
    salesman.user = user._id;
    await salesman.save();

    // 4. Initialize LocationCurrent record so new salesman is tracked immediately
    await LocationCurrent.findOneAndUpdate(
      { salesman: salesman._id },
      {
        salesman: salesman._id,
        salesmanName: salesman.name,
        isOnline: false,
        trackingStatus: 'offline',
        lastSeenAt: null,
      },
      { upsert: true, new: true }
    );

    const populated = await Salesman.findById(salesman._id).populate('user', 'email isActive roleSlug lastLogin');

    res.status(201).json({
      success: true,
      message: 'Salesman and Login Account created successfully',
      salesman: populated,
    });
  } catch (err) {
    console.error('createSalesman error:', err);
    res.status(500).json({
      success: false,
      message: 'Failed to create salesman',
      error: err.message,
    });
  }
};

// PUT /api/salesmen/:id
// Updates Salesman Profile and synchronizes User credentials (including password update)
exports.updateSalesman = async (req, res) => {
  try {
    const {
      name,
      phone,
      email,
      password,
      territory,
      vehicleType,
      vehicleNumber,
      monthlyTarget,
      isActive,
    } = req.body;

    const salesman = await Salesman.findById(req.params.id);
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }

    const cleanEmail = email !== undefined ? email.trim().toLowerCase() : salesman.email;

    // Check if new email is in use by another user
    if (cleanEmail && cleanEmail !== salesman.email) {
      const existingUser = await User.findOne({ email: cleanEmail });
      if (existingUser && (!salesman.user || existingUser._id.toString() !== salesman.user.toString())) {
        return res.status(400).json({
          success: false,
          message: `Email '${cleanEmail}' is already registered to another user account`,
        });
      }
    }

    // Sync with linked User or create if missing
    if (salesman.user) {
      const user = await User.findById(salesman.user);
      if (user) {
        if (name) user.name = name.trim();
        if (phone) user.phone = phone.trim();
        if (cleanEmail) user.email = cleanEmail;
        if (isActive !== undefined) user.isActive = isActive;
        if (password && password.trim().length >= 6) {
          user.password = password.trim();
        }
        await user.save();
      }
    } else if (cleanEmail && password && password.trim().length >= 6) {
      // Legacy salesman without user account: Auto-create user account now!
      const salesmanRole = await getFieldSalesmanRole();
      const newUser = new User({
        name: name ? name.trim() : salesman.name,
        email: cleanEmail,
        password: password.trim(),
        phone: phone ? phone.trim() : salesman.phone,
        role: salesmanRole._id,
        roleName: salesmanRole.name,
        roleSlug: salesmanRole.slug,
        salesmanProfile: salesman._id,
        isActive: isActive !== undefined ? isActive : salesman.isActive,
      });
      await newUser.save();
      salesman.user = newUser._id;
    }

    if (name) salesman.name = name.trim();
    if (phone) salesman.phone = phone.trim();
    if (email !== undefined) salesman.email = cleanEmail;
    if (territory) salesman.territory = territory.trim();
    if (vehicleType) salesman.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) salesman.vehicleNumber = vehicleNumber.trim();
    if (monthlyTarget !== undefined) salesman.monthlyTarget = Number(monthlyTarget);
    if (isActive !== undefined) salesman.isActive = isActive;

    await salesman.save();

    const populated = await Salesman.findById(salesman._id).populate('user', 'email isActive roleSlug lastLogin');

    res.status(200).json({
      success: true,
      message: 'Salesman updated successfully',
      salesman: populated,
    });
  } catch (err) {
    console.error('updateSalesman error:', err);
    res.status(500).json({ success: false, message: 'Failed to update salesman', error: err.message });
  }
};

// DELETE /api/salesmen/:id
// Deletes Salesman and automatically removes linked login account and active live radar entry
exports.deleteSalesman = async (req, res) => {
  try {
    const salesman = await Salesman.findById(req.params.id);
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }

    // Delete linked User login account
    if (salesman.user) {
      await User.findByIdAndDelete(salesman.user);
    }

    // Remove active GPS radar tracker entry
    await LocationCurrent.deleteMany({ salesman: salesman._id });

    await Salesman.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Salesman and associated login account deleted successfully',
    });
  } catch (err) {
    console.error('deleteSalesman error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete salesman' });
  }
};

const Salesman = require('../models/Salesman');
const User = require('../models/User');

// Generate Next Salesman Code
async function getNextSalesmanCode() {
  const last = await Salesman.findOne().sort({ createdAt: -1 });
  if (!last || !last.salesmanCode) return 'SM-101';
  const num = parseInt(last.salesmanCode.replace(/\D/g, ''), 10);
  return isNaN(num) ? 'SM-101' : `SM-${num + 1}`;
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
      ];
    }
    if (territory) query.territory = territory;
    if (status) query.isActive = status === 'active';

    const salesmen = await Salesman.find(query).populate('user', 'email isActive roleSlug').sort({ createdAt: -1 });

    res.status(200).json({ success: true, salesmen });
  } catch (err) {
    console.error('getAllSalesmen error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch salesmen' });
  }
};

// GET /api/salesmen/:id
exports.getSalesmanById = async (req, res) => {
  try {
    const salesman = await Salesman.findById(req.params.id).populate('user', 'email isActive');
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }
    res.status(200).json({ success: true, salesman });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch salesman' });
  }
};

// POST /api/salesmen
exports.createSalesman = async (req, res) => {
  try {
    const { name, phone, email = '', territory = 'General Market', vehicleType, vehicleNumber = '', monthlyTarget = 0 } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const salesmanCode = await getNextSalesmanCode();

    const salesman = await Salesman.create({
      salesmanCode,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      territory: territory.trim(),
      vehicleType: vehicleType || 'Bike / Scooter',
      vehicleNumber: vehicleNumber.trim(),
      monthlyTarget: Number(monthlyTarget) || 0,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Salesman created successfully',
      salesman,
    });
  } catch (err) {
    console.error('createSalesman error:', err);
    res.status(500).json({ success: false, message: 'Failed to create salesman', error: err.message });
  }
};

// PUT /api/salesmen/:id
exports.updateSalesman = async (req, res) => {
  try {
    const { name, phone, email, territory, vehicleType, vehicleNumber, monthlyTarget, isActive } = req.body;
    const salesman = await Salesman.findById(req.params.id);

    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }

    if (name) salesman.name = name.trim();
    if (phone) salesman.phone = phone.trim();
    if (email !== undefined) salesman.email = email.trim().toLowerCase();
    if (territory) salesman.territory = territory.trim();
    if (vehicleType) salesman.vehicleType = vehicleType;
    if (vehicleNumber !== undefined) salesman.vehicleNumber = vehicleNumber.trim();
    if (monthlyTarget !== undefined) salesman.monthlyTarget = Number(monthlyTarget);
    if (isActive !== undefined) salesman.isActive = isActive;

    await salesman.save();

    res.status(200).json({
      success: true,
      message: 'Salesman updated successfully',
      salesman,
    });
  } catch (err) {
    console.error('updateSalesman error:', err);
    res.status(500).json({ success: false, message: 'Failed to update salesman' });
  }
};

// DELETE /api/salesmen/:id
exports.deleteSalesman = async (req, res) => {
  try {
    const salesman = await Salesman.findById(req.params.id);
    if (!salesman) {
      return res.status(404).json({ success: false, message: 'Salesman not found' });
    }

    // Unlink from User
    if (salesman.user) {
      await User.findByIdAndUpdate(salesman.user, { salesmanProfile: null });
    }

    await Salesman.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Salesman deleted successfully' });
  } catch (err) {
    console.error('deleteSalesman error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete salesman' });
  }
};


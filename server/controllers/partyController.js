const Party = require('../models/Party');
const Visit = require('../models/Visit');
const Collection = require('../models/Collection');

async function getNextPartyCode() {
  const last = await Party.findOne().sort({ createdAt: -1 });
  if (!last || !last.partyCode) return 'PTY-1001';
  const num = parseInt(last.partyCode.replace(/\D/g, ''), 10);
  return isNaN(num) ? 'PTY-1001' : `PTY-${num + 1}`;
}

// GET /api/parties
exports.getAllParties = async (req, res) => {
  try {
    const { search = '', city = '', salesman = '', status = '', page = 1, limit = 50 } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { shopName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { address: { $regex: search, $options: 'i' } },
        { partyCode: { $regex: search, $options: 'i' } },
      ];
    }
    if (city) query.city = { $regex: city, $options: 'i' };

    const isStaffAdmin =
      req.user?.roleSlug === 'super_admin' ||
      req.user?.role?.slug === 'super_admin' ||
      req.user?.roleSlug === 'area_sales_manager' ||
      req.user?.role?.slug === 'area_sales_manager' ||
      req.user?.role?.permissions?.includes('*');

    const isSalesman = !isStaffAdmin && !!req.user?.salesmanProfile;
    if (isSalesman) {
      // Salesman sees only his assigned customers
      query.assignedSalesman = req.user.salesmanProfile._id || req.user.salesmanProfile;
    } else if (salesman) {
      query.assignedSalesman = salesman;
    }

    if (status) query.isActive = status === 'active';

    const skip = (Number(page) - 1) * Number(limit);
    const [parties, total] = await Promise.all([
      Party.find(query).populate('assignedSalesman', 'name salesmanCode').sort({ name: 1 }).skip(skip).limit(Number(limit)),
      Party.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      parties,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('getAllParties error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch parties' });
  }
};

// GET /api/parties/:id
exports.getPartyById = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id).populate('assignedSalesman', 'name phone territory');
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    const [recentVisits, recentCollections] = await Promise.all([
      Visit.find({ party: party._id }).sort({ visitDate: -1 }).limit(10),
      Collection.find({ party: party._id }).sort({ date: -1 }).limit(10),
    ]);

    res.status(200).json({
      success: true,
      party,
      recentVisits,
      recentCollections,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch party' });
  }
};

// POST /api/parties
exports.createParty = async (req, res) => {
  try {
    const {
      name,
      shopName = '',
      ownerName = '',
      phone,
      email = '',
      gstNo = '',
      address,
      city = '',
      state = '',
      pincode = '',
      latitude = null,
      longitude = null,
      outstandingBalance = 0,
      creditLimit = 0,
      assignedSalesman = null,
    } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({ success: false, message: 'Party name, phone, and address are required' });
    }

    const partyCode = await getNextPartyCode();

    const party = await Party.create({
      partyCode,
      name: name.trim(),
      shopName: shopName.trim(),
      ownerName: ownerName.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      gstNo: gstNo.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      pincode: pincode.trim(),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      outstandingBalance: Number(outstandingBalance) || 0,
      creditLimit: Number(creditLimit) || 0,
      assignedSalesman: assignedSalesman || null,
      isActive: true,
    });

    res.status(201).json({
      success: true,
      message: 'Customer / Party registered successfully',
      party,
    });
  } catch (err) {
    console.error('createParty error:', err);
    res.status(500).json({ success: false, message: 'Failed to create party', error: err.message });
  }
};

// PUT /api/parties/:id
exports.updateParty = async (req, res) => {
  try {
    const party = await Party.findById(req.params.id);
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }

    const fields = [
      'name',
      'shopName',
      'ownerName',
      'phone',
      'email',
      'gstNo',
      'address',
      'city',
      'state',
      'pincode',
      'latitude',
      'longitude',
      'outstandingBalance',
      'creditLimit',
      'assignedSalesman',
      'isActive',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        if (f === 'latitude' || f === 'longitude') {
          party[f] = req.body[f] ? parseFloat(req.body[f]) : null;
        } else if (f === 'outstandingBalance' || f === 'creditLimit') {
          party[f] = Number(req.body[f]) || 0;
        } else {
          party[f] = req.body[f];
        }
      }
    });

    await party.save();

    res.status(200).json({
      success: true,
      message: 'Party updated successfully',
      party,
    });
  } catch (err) {
    console.error('updateParty error:', err);
    res.status(500).json({ success: false, message: 'Failed to update party' });
  }
};

// DELETE /api/parties/:id
exports.deleteParty = async (req, res) => {
  try {
    const party = await Party.findByIdAndDelete(req.params.id);
    if (!party) {
      return res.status(404).json({ success: false, message: 'Party not found' });
    }
    res.status(200).json({ success: true, message: 'Party deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete party' });
  }
};


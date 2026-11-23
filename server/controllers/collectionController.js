const Collection = require('../models/Collection');
const Party = require('../models/Party');
const Salesman = require('../models/Salesman');

async function getNextReceiptNo() {
  const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Collection.countDocuments();
  return `REC-${todayStr}-${count + 1}`;
}

// GET /api/collections
exports.getAllCollections = async (req, res) => {
  try {
    const { salesman = '', party = '', paymentMode = '', status = '', startDate = '', endDate = '', page = 1, limit = 50 } = req.query;

    const query = {};
    const isStaffAdmin =
      req.user?.roleSlug === 'super_admin' ||
      req.user?.role?.slug === 'super_admin' ||
      req.user?.roleSlug === 'area_sales_manager' ||
      req.user?.role?.slug === 'area_sales_manager' ||
      req.user?.role?.permissions?.includes('*');

    const isSalesman = !isStaffAdmin && !!req.user?.salesmanProfile;
    if (isSalesman) {
      // Salesman sees only his collections
      query.salesman = req.user.salesmanProfile._id || req.user.salesmanProfile;
    } else if (salesman) {
      query.salesman = salesman;
    }
    if (party) query.party = party;
    if (paymentMode) query.paymentMode = paymentMode;
    if (status) query.status = status;

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        query.date.$gte = s;
      }
      if (endDate) {
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        query.date.$lte = e;
      }
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [collections, total] = await Promise.all([
      Collection.find(query)
        .populate('salesman', 'name salesmanCode phone')
        .populate('party', 'name shopName address phone outstandingBalance')
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Collection.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      collections,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('getAllCollections error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch collections' });
  }
};

// POST /api/collections
exports.createCollection = async (req, res) => {
  try {
    const { salesmanId, partyId, amount, paymentMode = 'Cash', referenceNo = '', chequeDate = null, bankName = '', notes = '' } = req.body;

    if (!salesmanId || !partyId || !amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Salesman, Party, and valid Amount are required' });
    }

    const [sm, pty] = await Promise.all([Salesman.findById(salesmanId), Party.findById(partyId)]);
    if (!sm) return res.status(400).json({ success: false, message: 'Salesman not found' });
    if (!pty) return res.status(400).json({ success: false, message: 'Party not found' });

    const receiptNo = await getNextReceiptNo();
    const collectedAmount = Number(amount);

    const collection = await Collection.create({
      receiptNo,
      salesman: sm._id,
      salesmanName: sm.name,
      party: pty._id,
      partyName: pty.name,
      amount: collectedAmount,
      paymentMode,
      referenceNo: referenceNo.trim(),
      chequeDate: chequeDate ? new Date(chequeDate) : null,
      bankName: bankName.trim(),
      date: new Date(),
      notes: notes.trim(),
      status: paymentMode === 'Cheque' ? 'Received' : 'Cleared',
    });

    // Update Party outstanding balance
    pty.outstandingBalance = Math.max(0, (pty.outstandingBalance || 0) - collectedAmount);
    await pty.save();

    res.status(201).json({
      success: true,
      message: 'Payment collection receipt created',
      collection,
    });
  } catch (err) {
    console.error('createCollection error:', err);
    res.status(500).json({ success: false, message: 'Failed to record collection', error: err.message });
  }
};

// GET /api/collections/report
exports.getCollectionReport = async (req, res) => {
  try {
    const { salesman = '', startDate = '', endDate = '' } = req.query;

    const query = {};
    const isStaffAdmin =
      req.user?.roleSlug === 'super_admin' ||
      req.user?.role?.slug === 'super_admin' ||
      req.user?.roleSlug === 'area_sales_manager' ||
      req.user?.role?.slug === 'area_sales_manager' ||
      req.user?.role?.permissions?.includes('*');

    const isSalesman = !isStaffAdmin && !!req.user?.salesmanProfile;
    if (isSalesman) {
      // Salesman sees only his collections
      query.salesman = req.user.salesmanProfile._id || req.user.salesmanProfile;
    } else if (salesman) {
      query.salesman = salesman;
    }

    const s = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    s.setHours(0, 0, 0, 0);
    const e = endDate ? new Date(endDate) : new Date();
    e.setHours(23, 59, 59, 999);
    query.date = { $gte: s, $lte: e };

    const collections = await Collection.find(query).populate('salesman', 'name').populate('party', 'name');

    const totalAmount = collections.reduce((acc, c) => acc + (c.amount || 0), 0);
    const modeBreakdown = {
      Cash: 0,
      'UPI / QR': 0,
      Cheque: 0,
      'Bank Transfer': 0,
    };

    collections.forEach((c) => {
      const mode = c.paymentMode || 'Cash';
      modeBreakdown[mode] = (modeBreakdown[mode] || 0) + (c.amount || 0);
    });

    res.status(200).json({
      success: true,
      report: {
        totalAmount,
        totalReceipts: collections.length,
        modeBreakdown,
        period: { from: s, to: e },
      },
    });
  } catch (err) {
    console.error('getCollectionReport error:', err);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
};


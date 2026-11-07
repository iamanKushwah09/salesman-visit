const Visit = require('../models/Visit');
const Route = require('../models/Route');
const Party = require('../models/Party');
const Salesman = require('../models/Salesman');
const Collection = require('../models/Collection');

async function getNextVisitCode() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Visit.countDocuments();
  return `VST-${today}-${count + 1}`;
}

// GET /api/visits
exports.getAllVisits = async (req, res) => {
  try {
    const { salesman = '', party = '', route = '', status = '', purpose = '', date = '', page = 1, limit = 40 } = req.query;

    const query = {};
    if (salesman) query.salesman = salesman;
    if (party) query.party = party;
    if (route) query.route = route;
    if (status) query.status = status;
    if (purpose) query.purpose = purpose;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.visitDate = { $gte: start, $lte: end };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [visits, total] = await Promise.all([
      Visit.find(query)
        .populate('salesman', 'name salesmanCode phone territory')
        .populate('party', 'name shopName address phone latitude longitude outstandingBalance')
        .populate('route', 'routeCode')
        .sort({ visitDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Visit.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      visits,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('getAllVisits error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch visits' });
  }
};

// GET /api/visits/:id
exports.getVisitById = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id)
      .populate('salesman')
      .populate('party')
      .populate('route');

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }
    res.status(200).json({ success: true, visit });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch visit' });
  }
};

// POST /api/visits
exports.createVisit = async (req, res) => {
  try {
    const {
      salesmanId,
      partyId,
      routeId = null,
      visitDate,
      purpose = 'General Visit',
      notes = '',
      collectionAmount = 0,
      orderAmount = 0,
      checkIn = {},
      checkOut = {},
    } = req.body;

    if (!salesmanId || !partyId) {
      return res.status(400).json({ success: false, message: 'Salesman and Party are required' });
    }

    const [sm, pty] = await Promise.all([Salesman.findById(salesmanId), Party.findById(partyId)]);

    if (!sm) return res.status(400).json({ success: false, message: 'Salesman not found' });
    if (!pty) return res.status(400).json({ success: false, message: 'Party not found' });

    const visitCode = await getNextVisitCode();
    const collected = Number(collectionAmount) || 0;
    const ordered = Number(orderAmount) || 0;

    let duration = 0;
    if (checkIn.timestamp && checkOut.timestamp) {
      duration = Math.round((new Date(checkOut.timestamp) - new Date(checkIn.timestamp)) / 60000);
    }

    const visit = await Visit.create({
      visitCode,
      salesman: sm._id,
      salesmanName: sm.name,
      party: pty._id,
      partyName: pty.name,
      route: routeId || null,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      purpose,
      status: checkIn.timestamp && !checkOut.timestamp ? 'Checked In' : 'Completed',
      notes,
      checkIn,
      checkOut,
      durationMinutes: duration,
      collectionAmount: collected,
      orderAmount: ordered,
      createdBy: req.user?._id || null,
    });

    // If payment collected, create Collection record
    if (collected > 0) {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const collCount = await Collection.countDocuments();
      await Collection.create({
        receiptNo: `REC-${todayStr}-${collCount + 1}`,
        salesman: sm._id,
        salesmanName: sm.name,
        party: pty._id,
        partyName: pty.name,
        visit: visit._id,
        amount: collected,
        paymentMode: req.body.paymentMode || 'Cash',
        referenceNo: req.body.referenceNo || '',
        date: visit.visitDate,
        notes: `Collected during visit ${visit.visitCode}`,
      });

      // Update party outstanding
      pty.outstandingBalance = Math.max(0, (pty.outstandingBalance || 0) - collected);
      await pty.save();
    }

    // If linked to Route, mark party stop Completed
    if (routeId) {
      const route = await Route.findById(routeId);
      if (route) {
        const stopItem = route.parties.find((p) => p.party.toString() === pty._id.toString());
        if (stopItem) {
          stopItem.status = 'Completed';
          stopItem.collectionAmount = collected;
          stopItem.visit = visit._id;
        }
        route.totalVisitsCompleted = route.parties.filter((p) => p.status === 'Completed').length;
        route.totalCollection = route.parties.reduce((acc, p) => acc + (p.collectionAmount || 0), 0);
        if (route.totalVisitsCompleted >= route.totalVisitsPlanned) {
          route.status = 'Completed';
        } else {
          route.status = 'In Progress';
        }
        await route.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Field visit recorded successfully',
      visit,
    });
  } catch (err) {
    console.error('createVisit error:', err);
    res.status(500).json({ success: false, message: 'Failed to record visit', error: err.message });
  }
};

// PUT /api/visits/:id/check-in
exports.checkIn = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, address = '', photoUrl = '' } = req.body;
    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    visit.status = 'Checked In';
    visit.checkIn = {
      timestamp: new Date(),
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      address,
      photoUrl,
    };

    await visit.save();

    res.status(200).json({
      success: true,
      message: 'Checked in at customer location',
      visit,
    });
  } catch (err) {
    console.error('checkIn error:', err);
    res.status(500).json({ success: false, message: 'Failed to check in' });
  }
};

// PUT /api/visits/:id/check-out
exports.checkOut = async (req, res) => {
  try {
    const {
      latitude,
      longitude,
      accuracy,
      address = '',
      photoUrl = '',
      notes = '',
      collectionAmount = 0,
      orderAmount = 0,
      paymentMode = 'Cash',
      referenceNo = '',
    } = req.body;

    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    const checkOutTime = new Date();
    let duration = 0;
    if (visit.checkIn?.timestamp) {
      duration = Math.round((checkOutTime - new Date(visit.checkIn.timestamp)) / 60000);
    }

    const collected = Number(collectionAmount) || 0;
    const ordered = Number(orderAmount) || 0;

    visit.status = 'Completed';
    visit.checkOut = {
      timestamp: checkOutTime,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      accuracy: accuracy ? parseFloat(accuracy) : null,
      address,
      photoUrl,
    };
    visit.durationMinutes = duration;
    if (notes) visit.notes = notes;
    if (collected > 0) visit.collectionAmount = collected;
    if (ordered > 0) visit.orderAmount = ordered;

    await visit.save();

    // Create collection receipt if amount paid
    if (collected > 0) {
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const collCount = await Collection.countDocuments();
      await Collection.create({
        receiptNo: `REC-${todayStr}-${collCount + 1}`,
        salesman: visit.salesman,
        salesmanName: visit.salesmanName,
        party: visit.party,
        partyName: visit.partyName,
        visit: visit._id,
        amount: collected,
        paymentMode,
        referenceNo,
        date: checkOutTime,
        notes: `Collected on Checkout from ${visit.visitCode}`,
      });

      // Update party outstanding
      await Party.findByIdAndUpdate(visit.party, {
        $inc: { outstandingBalance: -collected },
      });
    }

    // Update Route if attached
    if (visit.route) {
      const route = await Route.findById(visit.route);
      if (route) {
        const stopItem = route.parties.find((p) => p.party.toString() === visit.party.toString());
        if (stopItem) {
          stopItem.status = 'Completed';
          stopItem.collectionAmount = collected;
          stopItem.visit = visit._id;
        }
        route.totalVisitsCompleted = route.parties.filter((p) => p.status === 'Completed').length;
        route.totalCollection = route.parties.reduce((acc, p) => acc + (p.collectionAmount || 0), 0);
        await route.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'Visit checked out and completed successfully',
      visit,
    });
  } catch (err) {
    console.error('checkOut error:', err);
    res.status(500).json({ success: false, message: 'Failed to check out' });
  }
};

// GET /api/visits/summary/today
exports.getTodaySummary = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const [todayVisits, todayCollections, totalSalesmen, totalParties] = await Promise.all([
      Visit.find({ visitDate: { $gte: startOfDay, $lte: endOfDay } }),
      Collection.find({ date: { $gte: startOfDay, $lte: endOfDay } }),
      Salesman.countDocuments({ isActive: true }),
      Party.countDocuments({ isActive: true }),
    ]);

    const completedVisits = todayVisits.filter((v) => v.status === 'Completed').length;
    const totalCollected = todayCollections.reduce((acc, c) => acc + (c.amount || 0), 0);
    const totalOrdered = todayVisits.reduce((acc, v) => acc + (v.orderAmount || 0), 0);

    res.status(200).json({
      success: true,
      summary: {
        totalVisitsToday: todayVisits.length,
        completedVisitsToday: completedVisits,
        totalCollectionToday: totalCollected,
        totalOrderValueToday: totalOrdered,
        totalActiveSalesmen: totalSalesmen,
        totalParties,
      },
    });
  } catch (err) {
    console.error('getTodaySummary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
};


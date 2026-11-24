const Visit = require('../models/Visit');
const Route = require('../models/Route');
const Party = require('../models/Party');
const Salesman = require('../models/Salesman');
const Collection = require('../models/Collection');
const LocationCurrent = require('../models/LocationCurrent');
const { isSalesmanConnected } = require('../services/socketService');

async function getNextVisitCode() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Visit.countDocuments();
  return `VST-${today}-${count + 1}`;
}

// GET /api/visits
exports.getAllVisits = async (req, res) => {
  try {
    const { salesman = '', party = '', route = '', status = '', purpose = '', date = '', page = 1, limit = 50 } = req.query;

    const query = {};
    const isStaffAdmin =
      req.user?.roleSlug === 'super_admin' ||
      req.user?.role?.slug === 'super_admin' ||
      req.user?.roleSlug === 'area_sales_manager' ||
      req.user?.role?.slug === 'area_sales_manager' ||
      req.user?.role?.permissions?.includes('*');

    const isSalesman = !isStaffAdmin && !!req.user?.salesmanProfile;
    if (isSalesman) {
      // STRICT PRIVACY: Force salesman filter to this salesman only
      query.salesman = req.user.salesmanProfile._id || req.user.salesmanProfile;
    } else if (salesman) {
      query.salesman = salesman;
    }
    if (party) query.party = party;
    if (route) query.route = route;
    if (status && status !== 'all') query.status = status;
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
        .populate('salesman', 'name salesmanCode phone territory vehicleType')
        .populate('party', 'name shopName address phone city latitude longitude outstandingBalance')
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
// Schedules a new visit in 'Scheduled' status (or records in-progress / completed visit)
exports.createVisit = async (req, res) => {
  try {
    const {
      salesmanId,
      partyId,
      routeId = null,
      visitDate,
      purpose = 'General Visit',
      notes = '',
      status,
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
    if (checkIn?.timestamp && checkOut?.timestamp) {
      duration = Math.round((new Date(checkOut.timestamp) - new Date(checkIn.timestamp)) / 60000);
    }

    // Determine initial status:
    // When scheduled, it must default to 'Scheduled'
    let initialStatus = 'Scheduled';
    if (status) {
      initialStatus = status;
    } else if (checkIn?.timestamp && checkOut?.timestamp) {
      initialStatus = 'Completed';
    } else if (checkIn?.timestamp) {
      initialStatus = 'Checked In';
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
      status: initialStatus,
      notes,
      checkIn: checkIn?.timestamp ? checkIn : undefined,
      checkOut: checkOut?.timestamp ? checkOut : undefined,
      durationMinutes: duration,
      collectionAmount: collected,
      orderAmount: ordered,
      createdBy: req.user?._id || null,
    });

    // If payment collected immediately (direct back-office recording)
    if (initialStatus === 'Completed' && collected > 0) {
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

    // If linked to Route, update stop status
    if (routeId) {
      const route = await Route.findById(routeId);
      if (route) {
        const stopItem = route.parties.find((p) => p.party.toString() === pty._id.toString());
        if (stopItem) {
          stopItem.status = initialStatus === 'Completed' ? 'Completed' : 'Pending';
          if (collected > 0) stopItem.collectionAmount = collected;
          stopItem.visit = visit._id;
        }
        route.totalVisitsCompleted = route.parties.filter((p) => p.status === 'Completed').length;
        route.totalCollection = route.parties.reduce((acc, p) => acc + (p.collectionAmount || 0), 0);
        if (route.totalVisitsCompleted >= route.totalVisitsPlanned) {
          route.status = 'Completed';
        } else if (route.totalVisitsCompleted > 0) {
          route.status = 'In Progress';
        }
        await route.save();
      }
    }

    const populated = await Visit.findById(visit._id)
      .populate('salesman', 'name salesmanCode phone territory vehicleType')
      .populate('party', 'name shopName address phone city latitude longitude outstandingBalance')
      .populate('route', 'routeCode');

    res.status(201).json({
      success: true,
      message: initialStatus === 'Scheduled' ? 'Visit scheduled successfully' : 'Field visit recorded successfully',
      visit: populated,
    });
  } catch (err) {
    console.error('createVisit error:', err);
    res.status(500).json({ success: false, message: 'Failed to record visit', error: err.message });
  }
};

// PUT /api/visits/:id/check-in
// Salesman Check-In (IN): records timestamp, GPS location, accuracy, address, and verification photo
exports.checkIn = async (req, res) => {
  try {
    const { latitude, longitude, accuracy, address = '', photoUrl = '', notes = '' } = req.body;
    const visit = await Visit.findById(req.params.id);

    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }

    if (visit.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Visit is already completed' });
    }

    visit.status = 'Checked In';
    visit.checkIn = {
      timestamp: new Date(),
      latitude: latitude != null && latitude !== '' ? parseFloat(latitude) : null,
      longitude: longitude != null && longitude !== '' ? parseFloat(longitude) : null,
      accuracy: accuracy != null && accuracy !== '' ? parseFloat(accuracy) : null,
      address: address || '',
      photoUrl: photoUrl || '',
    };

    if (notes) {
      visit.notes = visit.notes ? `${visit.notes}\n[Check-In]: ${notes}` : `[Check-In]: ${notes}`;
    }

    await visit.save();

    const populated = await Visit.findById(visit._id)
      .populate('salesman', 'name salesmanCode phone territory vehicleType')
      .populate('party', 'name shopName address phone city latitude longitude outstandingBalance')
      .populate('route', 'routeCode');

    res.status(200).json({
      success: true,
      message: 'Successfully checked in with location and photo proof',
      visit: populated,
    });
  } catch (err) {
    console.error('checkIn error:', err);
    res.status(500).json({ success: false, message: 'Failed to check in', error: err.message });
  }
};

// PUT /api/visits/:id/check-out
// Salesman Check-Out (OUT): records checkout time, GPS location, photo, order amount, collection & generates receipt
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
      duration = Math.max(1, Math.round((checkOutTime - new Date(visit.checkIn.timestamp)) / 60000));
    }

    const collected = Number(collectionAmount) || 0;
    const ordered = Number(orderAmount) || 0;

    visit.status = 'Completed';
    visit.checkOut = {
      timestamp: checkOutTime,
      latitude: latitude != null && latitude !== '' ? parseFloat(latitude) : null,
      longitude: longitude != null && longitude !== '' ? parseFloat(longitude) : null,
      accuracy: accuracy != null && accuracy !== '' ? parseFloat(accuracy) : null,
      address: address || '',
      photoUrl: photoUrl || '',
    };
    visit.durationMinutes = duration;
    if (notes) {
      visit.notes = visit.notes ? `${visit.notes}\n[Check-Out]: ${notes}` : `[Check-Out]: ${notes}`;
    }
    if (collected > 0) visit.collectionAmount = collected;
    if (ordered > 0) visit.orderAmount = ordered;

    await visit.save();

    // Create collection receipt if payment was collected
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
        notes: `Collected during Check-Out from visit ${visit.visitCode}`,
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
        if (route.totalVisitsCompleted >= route.totalVisitsPlanned) {
          route.status = 'Completed';
        } else {
          route.status = 'In Progress';
        }
        await route.save();
      }
    }

    const populated = await Visit.findById(visit._id)
      .populate('salesman', 'name salesmanCode phone territory vehicleType')
      .populate('party', 'name shopName address phone city latitude longitude outstandingBalance')
      .populate('route', 'routeCode');

    res.status(200).json({
      success: true,
      message: 'Visit checked out and completed successfully',
      visit: populated,
    });
  } catch (err) {
    console.error('checkOut error:', err);
    res.status(500).json({ success: false, message: 'Failed to check out', error: err.message });
  }
};

// DELETE /api/visits/:id
exports.deleteVisit = async (req, res) => {
  try {
    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }
    await Visit.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Visit deleted successfully' });
  } catch (err) {
    console.error('deleteVisit error:', err);
    res.status(500).json({ success: false, message: 'Failed to delete visit' });
  }
};

// PUT /api/visits/:id/cancel
exports.cancelVisit = async (req, res) => {
  try {
    const { reason = '' } = req.body;
    const visit = await Visit.findById(req.params.id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Visit not found' });
    }
    visit.status = 'Cancelled';
    if (reason) {
      visit.notes = visit.notes ? `${visit.notes}\n[Cancelled]: ${reason}` : `[Cancelled]: ${reason}`;
    }
    await visit.save();
    res.status(200).json({ success: true, message: 'Visit marked as cancelled', visit });
  } catch (err) {
    console.error('cancelVisit error:', err);
    res.status(500).json({ success: false, message: 'Failed to cancel visit' });
  }
};

// GET /api/visits/summary/today
exports.getTodaySummary = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const user = req.user;
    const isStaffAdmin =
      user?.roleSlug === 'super_admin' ||
      user?.role?.slug === 'super_admin' ||
      user?.roleSlug === 'area_sales_manager' ||
      user?.role?.slug === 'area_sales_manager' ||
      user?.role?.permissions?.includes('*');

    const isSalesman = !isStaffAdmin && !!user?.salesmanProfile;
    const salesmanId = isSalesman ? (user.salesmanProfile._id || user.salesmanProfile) : null;

    if (isSalesman && salesmanId) {
      const salesmanDoc = await Salesman.findById(salesmanId);

      const [todayVisits, todayCollections, monthCollections, assignedPartiesCount] = await Promise.all([
        Visit.find({ salesman: salesmanId, visitDate: { $gte: startOfDay, $lte: endOfDay } }),
        Collection.find({ salesman: salesmanId, date: { $gte: startOfDay, $lte: endOfDay } }),
        Collection.find({ salesman: salesmanId, date: { $gte: startOfMonth, $lte: endOfDay } }),
        Party.countDocuments({
          $or: [
            { assignedSalesman: salesmanId },
            { territory: salesmanDoc?.territory || '' },
          ],
          isActive: true,
        }),
      ]);

      const scheduledVisits = todayVisits.filter((v) => v.status === 'Scheduled').length;
      const checkedInVisits = todayVisits.filter((v) => v.status === 'Checked In').length;
      const completedVisits = todayVisits.filter((v) => v.status === 'Completed').length;
      const totalCollected = todayCollections.reduce((acc, c) => acc + (c.amount || 0), 0);
      const totalOrdered = todayVisits.reduce((acc, v) => acc + (v.orderAmount || 0), 0);
      const totalMonthCollected = monthCollections.reduce((acc, c) => acc + (c.amount || 0), 0);

      const monthlyTarget = salesmanDoc?.monthlyTarget || 0;
      const targetProgress =
        monthlyTarget > 0 ? Math.min(100, Math.round((totalMonthCollected / monthlyTarget) * 100)) : 0;

      return res.status(200).json({
        success: true,
        summary: {
          isSalesman: true,
          salesmanProfile: {
            _id: salesmanDoc?._id,
            name: salesmanDoc?.name,
            salesmanCode: salesmanDoc?.salesmanCode,
            territory: salesmanDoc?.territory,
            vehicleType: salesmanDoc?.vehicleType,
            vehicleNumber: salesmanDoc?.vehicleNumber,
            monthlyTarget,
          },
          totalVisitsToday: todayVisits.length,
          scheduledVisitsToday: scheduledVisits,
          checkedInVisitsToday: checkedInVisits,
          completedVisitsToday: completedVisits,
          totalCollectionToday: totalCollected,
          totalOrderValueToday: totalOrdered,
          totalMonthCollected,
          monthlyTarget,
          targetProgress,
          totalParties: assignedPartiesCount,
          totalActiveSalesmen: 1,
        },
      });
    }

    // Admin Company-wide Summary
    const [todayVisits, todayCollections, totalSalesmen, totalParties, monthCollections, liveLocations] = await Promise.all([
      Visit.find({ visitDate: { $gte: startOfDay, $lte: endOfDay } }),
      Collection.find({ date: { $gte: startOfDay, $lte: endOfDay } }),
      Salesman.countDocuments({ isActive: true }),
      Party.countDocuments({ isActive: true }),
      Collection.find({ date: { $gte: startOfMonth, $lte: endOfDay } }),
      LocationCurrent.find({ isOnline: true }),
    ]);

    const scheduledVisits = todayVisits.filter((v) => v.status === 'Scheduled').length;
    const checkedInVisits = todayVisits.filter((v) => v.status === 'Checked In').length;
    const completedVisits = todayVisits.filter((v) => v.status === 'Completed').length;
    const totalCollected = todayCollections.reduce((acc, c) => acc + (c.amount || 0), 0);
    const totalOrdered = todayVisits.reduce((acc, v) => acc + (v.orderAmount || 0), 0);
    const totalMonthCollected = monthCollections.reduce((acc, c) => acc + (c.amount || 0), 0);

    const activeThreshold = new Date(Date.now() - 40 * 1000); // 40 seconds (heartbeat is 15s)
    const currentlyOnlineCount = liveLocations.filter((l) => {
      const sid = l.salesman?.toString();
      return isSalesmanConnected(sid) && l.isOnline && l.lastSeenAt && new Date(l.lastSeenAt) >= activeThreshold;
    }).length;

    res.status(200).json({
      success: true,
      summary: {
        isSalesman: false,
        totalVisitsToday: todayVisits.length,
        scheduledVisitsToday: scheduledVisits,
        checkedInVisitsToday: checkedInVisits,
        completedVisitsToday: completedVisits,
        totalCollectionToday: totalCollected,
        totalOrderValueToday: totalOrdered,
        totalMonthCollected,
        totalActiveSalesmen: currentlyOnlineCount,
        totalSalesmenCount: totalSalesmen,
        totalParties,
      },
    });
  } catch (err) {
    console.error('getTodaySummary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
};

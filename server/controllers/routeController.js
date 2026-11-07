const Route = require('../models/Route');
const Salesman = require('../models/Salesman');
const Party = require('../models/Party');

async function getNextRouteCode() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const count = await Route.countDocuments();
  return `RT-${today}-${count + 1}`;
}

// GET /api/routes
exports.getAllRoutes = async (req, res) => {
  try {
    const { salesman = '', status = '', date = '', page = 1, limit = 30 } = req.query;

    const query = {};
    if (salesman) query.salesman = salesman;
    if (status) query.status = status;
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.routeDate = { $gte: start, $lte: end };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [routes, total] = await Promise.all([
      Route.find(query)
        .populate('salesman', 'name salesmanCode phone territory')
        .populate('parties.party', 'name shopName address phone latitude longitude outstandingBalance')
        .sort({ routeDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Route.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      routes,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (err) {
    console.error('getAllRoutes error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch routes' });
  }
};

// GET /api/routes/:id
exports.getRouteById = async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('salesman', 'name salesmanCode phone territory vehicleType')
      .populate('parties.party', 'name shopName address phone latitude longitude outstandingBalance')
      .populate('parties.visit');

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.status(200).json({ success: true, route });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch route' });
  }
};

// POST /api/routes
exports.createRoute = async (req, res) => {
  try {
    const { salesmanId, routeDate, parties = [], notes = '' } = req.body;

    if (!salesmanId) {
      return res.status(400).json({ success: false, message: 'Salesman is required' });
    }

    const sm = await Salesman.findById(salesmanId);
    if (!sm) {
      return res.status(400).json({ success: false, message: 'Salesman not found' });
    }

    const routeCode = await getNextRouteCode();

    // Map sequenced parties
    let mappedParties = [];
    if (Array.isArray(parties) && parties.length > 0) {
      const partyDocs = await Party.find({ _id: { $in: parties } }).select('name shopName address phone latitude longitude');
      const partyMap = new Map();
      partyDocs.forEach((p) => partyMap.set(p._id.toString(), p));

      mappedParties = parties.map((pid, idx) => {
        const pDoc = partyMap.get(pid.toString());
        return {
          party: pid,
          partyName: pDoc ? `${pDoc.name}${pDoc.shopName ? ' (' + pDoc.shopName + ')' : ''}` : 'Customer',
          sequence: idx + 1,
          status: 'Pending',
          collectionAmount: 0,
        };
      });
    }

    const newRoute = await Route.create({
      routeCode,
      salesman: sm._id,
      salesmanName: sm.name,
      routeDate: routeDate ? new Date(routeDate) : new Date(),
      status: 'Scheduled',
      notes,
      parties: mappedParties,
      totalVisitsPlanned: mappedParties.length,
      totalVisitsCompleted: 0,
      totalCollection: 0,
      createdBy: req.user?._id || null,
    });

    res.status(201).json({
      success: true,
      message: 'Field route created and scheduled successfully',
      route: newRoute,
    });
  } catch (err) {
    console.error('createRoute error:', err);
    res.status(500).json({ success: false, message: 'Failed to create route', error: err.message });
  }
};

// PUT /api/routes/:id
exports.updateRoute = async (req, res) => {
  try {
    const { status, notes, parties } = req.body;
    const route = await Route.findById(req.params.id);

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    if (status) route.status = status;
    if (notes !== undefined) route.notes = notes;

    if (Array.isArray(parties)) {
      route.parties = parties;
      route.totalVisitsPlanned = parties.length;
      route.totalVisitsCompleted = parties.filter((p) => p.status === 'Completed').length;
      route.totalCollection = parties.reduce((acc, p) => acc + (p.collectionAmount || 0), 0);
    }

    await route.save();

    res.status(200).json({
      success: true,
      message: 'Route updated successfully',
      route,
    });
  } catch (err) {
    console.error('updateRoute error:', err);
    res.status(500).json({ success: false, message: 'Failed to update route' });
  }
};

// DELETE /api/routes/:id
exports.deleteRoute = async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }
    res.status(200).json({ success: true, message: 'Route deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete route' });
  }
};


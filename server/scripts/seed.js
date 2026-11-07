const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Role = require('../models/Role');
const User = require('../models/User');
const Salesman = require('../models/Salesman');
const Party = require('../models/Party');
const Route = require('../models/Route');
const Visit = require('../models/Visit');
const Collection = require('../models/Collection');
const LocationCurrent = require('../models/LocationCurrent');
const LocationHistory = require('../models/LocationHistory');

const seedData = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/salesman_field_suite';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB:', mongoUri);

    // Clear existing collections
    await Promise.all([
      Role.deleteMany({}),
      User.deleteMany({}),
      Salesman.deleteMany({}),
      Party.deleteMany({}),
      Route.deleteMany({}),
      Visit.deleteMany({}),
      Collection.deleteMany({}),
      LocationCurrent.deleteMany({}),
      LocationHistory.deleteMany({}),
    ]);
    console.log('[Seed] Database cleaned.');

    // 1. Seed Roles
    const superAdminRole = await Role.create({
      name: 'Super Admin',
      slug: 'super_admin',
      description: 'Full unconstrained system administration and master control',
      permissions: ['*'],
      isDefault: true,
      isActive: true,
    });

    const managerRole = await Role.create({
      name: 'Area Sales Manager',
      slug: 'area_sales_manager',
      description: 'Manages field salesmen, route dispatch, collections, and radar monitoring',
      permissions: ['dashboard', 'live_tracking', 'routes', 'visits', 'parties', 'collections', 'salesmen'],
      isDefault: false,
      isActive: true,
    });

    const salesmanRole = await Role.create({
      name: 'Field Salesman',
      slug: 'field_salesman',
      description: 'Executes assigned field routes, customer visits, check-ins, and collections',
      permissions: ['dashboard', 'routes', 'visits', 'parties', 'collections'],
      isDefault: false,
      isActive: true,
    });

    console.log('[Seed] Roles created.');

    // 2. Seed Salesmen Profiles
    const sm1 = await Salesman.create({
      salesmanCode: 'SM-101',
      name: 'Rahul Sharma',
      email: 'rahul.sales@salesmanfield.com',
      phone: '+91 98765 43210',
      territory: 'Indore Central & Palasia',
      vehicleType: 'Bike / Scooter',
      vehicleNumber: 'MP 09 AB 4589',
      monthlyTarget: 180000,
      isActive: true,
    });

    const sm2 = await Salesman.create({
      salesmanCode: 'SM-102',
      name: 'Amit Verma',
      email: 'amit.sales@salesmanfield.com',
      phone: '+91 98234 56789',
      territory: 'Bhopal New Market',
      vehicleType: 'Bike / Scooter',
      vehicleNumber: 'MP 04 XY 7812',
      monthlyTarget: 140000,
      isActive: true,
    });

    console.log('[Seed] Salesmen profiles created.');

    // 3. Seed Users
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@gmail.com',
      password: 'Admin@123456',
      phone: '+91 99999 11111',
      role: superAdminRole._id,
      roleName: superAdminRole.name,
      roleSlug: 'super_admin',
      isActive: true,
    });

    const managerUser = await User.create({
      name: 'Vikas Dubey (Manager)',
      email: 'manager@salesmanfield.com',
      password: 'manager123',
      phone: '+91 99999 22222',
      role: managerRole._id,
      roleName: managerRole.name,
      roleSlug: 'area_sales_manager',
      isActive: true,
    });

    const salesmanUser = await User.create({
      name: 'Rahul Sharma (Field Salesman)',
      email: 'salesman1@salesmanfield.com',
      password: 'salesman123',
      phone: '+91 98765 43210',
      role: salesmanRole._id,
      roleName: salesmanRole.name,
      roleSlug: 'field_salesman',
      salesmanProfile: sm1._id,
      isActive: true,
    });

    sm1.user = salesmanUser._id;
    await sm1.save();

    console.log('[Seed] Users created:');
    console.log(' - Admin: admin@gmail.com / Admin@123456 (Role: Super Admin)');
    console.log(' - Manager: manager@salesmanfield.com / manager123 (Role: Area Sales Manager)');
    console.log(' - Salesman: salesman1@salesmanfield.com / salesman123 (Role: Field Salesman)');

    // 4. Seed Customers / Parties with realistic GPS coordinates
    const p1 = await Party.create({
      partyCode: 'PTY-1001',
      name: 'Janta Footwear & Retail',
      shopName: 'Janta Shoes',
      ownerName: 'Rameshwar Ji',
      phone: '+91 94250 11223',
      email: 'jantashoes@gmail.com',
      gstNo: '23AAAAA1234A1Z5',
      address: 'Shop No 14, Rajwada Main Market',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452001',
      latitude: 22.7196,
      longitude: 75.8577,
      outstandingBalance: 34500,
      creditLimit: 50000,
      assignedSalesman: sm1._id,
      isActive: true,
    });

    const p2 = await Party.create({
      partyCode: 'PTY-1002',
      name: 'Chhappan Retail Shoppers',
      shopName: 'Chhappan Mart',
      ownerName: 'Manish Patel',
      phone: '+91 94250 44556',
      email: 'chhappanmart@gmail.com',
      gstNo: '23BBBBB5678B1Z8',
      address: '56 Dukan Commercial Complex',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452002',
      latitude: 22.7244,
      longitude: 75.8839,
      outstandingBalance: 18200,
      creditLimit: 40000,
      assignedSalesman: sm1._id,
      isActive: true,
    });

    const p3 = await Party.create({
      partyCode: 'PTY-1003',
      name: 'Supertech Wholesale Traders',
      shopName: 'Supertech Agency',
      ownerName: 'Sunil Agrawal',
      phone: '+91 94250 77889',
      email: 'supertech.indore@gmail.com',
      gstNo: '23CCCCC9012C1Z2',
      address: 'Plot 4, Scheme 54, Vijay Nagar',
      city: 'Indore',
      state: 'Madhya Pradesh',
      pincode: '452010',
      latitude: 22.7533,
      longitude: 75.8937,
      outstandingBalance: 65000,
      creditLimit: 100000,
      assignedSalesman: sm1._id,
      isActive: true,
    });

    console.log('[Seed] Parties created with GPS coordinates.');

    // 5. Seed Route for Today
    const today = new Date();
    const route = await Route.create({
      routeCode: 'RT-2026-TODAY-01',
      salesman: sm1._id,
      salesmanName: sm1.name,
      routeDate: today,
      status: 'In Progress',
      notes: 'Morning commercial market coverage',
      parties: [
        {
          party: p1._id,
          partyName: p1.name,
          sequence: 1,
          status: 'Completed',
          collectionAmount: 15000,
        },
        {
          party: p2._id,
          partyName: p2.name,
          sequence: 2,
          status: 'Completed',
          collectionAmount: 8500,
        },
        {
          party: p3._id,
          partyName: p3.name,
          sequence: 3,
          status: 'Pending',
          collectionAmount: 0,
        },
      ],
      totalVisitsPlanned: 3,
      totalVisitsCompleted: 2,
      totalCollection: 23500,
      createdBy: adminUser._id,
    });

    // 6. Seed Visits
    const v1 = await Visit.create({
      visitCode: 'VST-2026-001',
      salesman: sm1._id,
      salesmanName: sm1.name,
      party: p1._id,
      partyName: p1.name,
      route: route._id,
      visitDate: today,
      purpose: 'Payment Collection',
      status: 'Completed',
      notes: 'Collected partial payment of ₹15,000 via UPI. Order discussion pending.',
      checkIn: {
        timestamp: new Date(today.getTime() - 120 * 60000),
        latitude: 22.7197,
        longitude: 75.8579,
        accuracy: 4,
        address: 'Rajwada Market, Indore',
      },
      checkOut: {
        timestamp: new Date(today.getTime() - 95 * 60000),
        latitude: 22.7196,
        longitude: 75.8577,
        accuracy: 3,
        address: 'Rajwada Market, Indore',
      },
      durationMinutes: 25,
      collectionAmount: 15000,
      orderAmount: 0,
      createdBy: adminUser._id,
    });

    const v2 = await Visit.create({
      visitCode: 'VST-2026-002',
      salesman: sm1._id,
      salesmanName: sm1.name,
      party: p2._id,
      partyName: p2.name,
      route: route._id,
      visitDate: today,
      purpose: 'Sales Order',
      status: 'Completed',
      notes: 'Took order for 40 units and collected ₹8,500 cash.',
      checkIn: {
        timestamp: new Date(today.getTime() - 70 * 60000),
        latitude: 22.7245,
        longitude: 75.8841,
        accuracy: 5,
        address: '56 Dukan, Indore',
      },
      checkOut: {
        timestamp: new Date(today.getTime() - 40 * 60000),
        latitude: 22.7244,
        longitude: 75.8839,
        accuracy: 4,
        address: '56 Dukan, Indore',
      },
      durationMinutes: 30,
      collectionAmount: 8500,
      orderAmount: 42000,
      createdBy: adminUser._id,
    });

    // 7. Seed Collections
    await Collection.create({
      receiptNo: 'REC-2026-001',
      salesman: sm1._id,
      salesmanName: sm1.name,
      party: p1._id,
      partyName: p1.name,
      visit: v1._id,
      amount: 15000,
      paymentMode: 'UPI / QR',
      referenceNo: 'UPI9834298102',
      date: new Date(today.getTime() - 95 * 60000),
      notes: 'Received via PhonePe merchant QR',
      status: 'Cleared',
    });

    await Collection.create({
      receiptNo: 'REC-2026-002',
      salesman: sm1._id,
      salesmanName: sm1.name,
      party: p2._id,
      partyName: p2.name,
      visit: v2._id,
      amount: 8500,
      paymentMode: 'Cash',
      referenceNo: 'CASH-RCPT-44',
      date: new Date(today.getTime() - 40 * 60000),
      notes: 'Cash received on site',
      status: 'Received',
    });

    // 8. Seed Live Location & History for Uber/Ola Live Radar demonstration
    await LocationCurrent.create({
      salesman: sm1._id,
      salesmanName: sm1.name,
      latitude: 22.7388,
      longitude: 75.8890,
      speed: 32,
      heading: 42,
      accuracy: 3,
      battery: 86,
      address: 'Near Industry House, A.B. Road, Indore',
      trackingStatus: 'live',
      lastSeenAt: new Date(),
      isOnline: true,
    });

    // Breadcrumb trail
    const breadcrumbs = [
      { lat: 22.7196, lng: 75.8577, speed: 0, heading: 0, time: 120 },
      { lat: 22.7215, lng: 75.8650, speed: 28, heading: 65, time: 90 },
      { lat: 22.7244, lng: 75.8839, speed: 0, heading: 70, time: 60 },
      { lat: 22.7310, lng: 75.8860, speed: 34, heading: 25, time: 20 },
      { lat: 22.7388, lng: 75.8890, speed: 32, heading: 42, time: 1 },
    ];

    for (const b of breadcrumbs) {
      await LocationHistory.create({
        salesman: sm1._id,
        latitude: b.lat,
        longitude: b.lng,
        speed: b.speed,
        heading: b.heading,
        accuracy: 4,
        battery: 86,
        address: 'En-route Indore Route',
        timestamp: new Date(today.getTime() - b.time * 60000),
      });
    }

    console.log('[Seed] Live Location & GPS history initialized.');
    console.log('=======================================================');
    console.log('✅ SEED COMPLETED SUCCESSFULLY!');
    console.log('=======================================================');
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]:', err);
    process.exit(1);
  }
};

seedData();


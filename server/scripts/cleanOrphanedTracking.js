const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const clean = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/salesman_field_suite';
    await mongoose.connect(mongoUri);
    console.log('[Cleanup] Connected to MongoDB');

    const Salesman = mongoose.model('Salesman', new mongoose.Schema({}, { strict: false }));
    const LocationCurrent = mongoose.model('LocationCurrent', new mongoose.Schema({}, { strict: false }));
    const LocationHistory = mongoose.model('LocationHistory', new mongoose.Schema({}, { strict: false }));

    const validSalesmen = await Salesman.find();
    const validIds = validSalesmen.map((s) => s._id);
    console.log('[Cleanup] Valid salesmen IDs in system:', validIds.map(String));

    const curDel = await LocationCurrent.deleteMany({ salesman: { $nin: validIds } });
    const histDel = await LocationHistory.deleteMany({ salesman: { $nin: validIds } });

    console.log('[Cleanup] Deleted orphaned LocationCurrent records:', curDel.deletedCount);
    console.log('[Cleanup] Deleted orphaned LocationHistory records:', histDel.deletedCount);

    process.exit(0);
  } catch (err) {
    console.error('[Cleanup Error]:', err);
    process.exit(1);
  }
};

clean();


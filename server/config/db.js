const mongoose = require('mongoose');

const connectDB = async (retries = 5, delayMs = 5000) => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/salesman_field_suite';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      console.error(`[Database Error - Attempt ${attempt}/${retries}]: ${err.message}`);
      if (attempt < retries) {
        console.log(`[Database] Retrying connection in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('[Database Fatal] Could not connect to MongoDB after maximum retries.');
        process.exit(1);
      }
    }
  }
};

module.exports = connectDB;

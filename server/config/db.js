const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async (retries = 3, delayMs = 3000) => {
  // If already connected or connecting, reuse existing connection (crucial for cloud/serverless/pooling)
  if (isConnected || mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/salesman_field_suite';

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
      });
      isConnected = true;
      console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
      return conn;
    } catch (err) {
      console.error(`[Database Error - Attempt ${attempt}/${retries}]: ${err.message}`);
      if (attempt < retries) {
        console.log(`[Database] Retrying connection in ${delayMs / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        console.error('[Database Fatal] Could not connect to MongoDB after maximum retries.');
        if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
          process.exit(1);
        }
        throw err;
      }
    }
  }
};

module.exports = connectDB;

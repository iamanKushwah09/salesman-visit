const mongoose = require('mongoose');

const locationCurrentSchema = new mongoose.Schema(
  {
    salesman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salesman',
      required: true,
      unique: true,
    },
    salesmanName: {
      type: String,
      default: '',
    },
    latitude: {
      type: Number,
      required: true,
    },
    longitude: {
      type: Number,
      required: true,
    },
    speed: {
      type: Number,
      default: 0,
    },
    heading: {
      type: Number,
      default: 0,
    },
    accuracy: {
      type: Number,
      default: 0,
    },
    battery: {
      type: Number,
      default: null,
    },
    address: {
      type: String,
      default: '',
    },
    trackingStatus: {
      type: String,
      enum: ['live', 'stale', 'offline'],
      default: 'offline',
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LocationCurrent', locationCurrentSchema);


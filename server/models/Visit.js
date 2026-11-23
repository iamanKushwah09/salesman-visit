const mongoose = require('mongoose');

const visitSchema = new mongoose.Schema(
  {
    visitCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    salesman: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Salesman',
      required: true,
    },
    salesmanName: {
      type: String,
      default: '',
    },
    party: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Party',
      required: true,
    },
    partyName: {
      type: String,
      default: '',
    },
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Route',
      default: null,
    },
    visitDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    purpose: {
      type: String,
      enum: [
        'Sales Order',
        'Payment Collection',
        'Stock Check',
        'Client Follow-up',
        'Complaint Resolution',
        'General Visit',
      ],
      default: 'General Visit',
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Checked In', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    notes: {
      type: String,
      default: '',
    },
    checkIn: {
      timestamp: { type: Date, default: null },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      address: { type: String, default: '' },
      photoUrl: { type: String, default: '' },
    },
    checkOut: {
      timestamp: { type: Date, default: null },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      accuracy: { type: Number, default: null },
      address: { type: String, default: '' },
      photoUrl: { type: String, default: '' },
    },
    durationMinutes: {
      type: Number,
      default: 0,
    },
    collectionAmount: {
      type: Number,
      default: 0,
    },
    orderAmount: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Visit', visitSchema);


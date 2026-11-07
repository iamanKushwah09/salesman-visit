const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema(
  {
    routeCode: {
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
    routeDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'In Progress', 'Completed', 'Cancelled'],
      default: 'Scheduled',
    },
    notes: {
      type: String,
      default: '',
    },
    parties: [
      {
        party: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Party',
          required: true,
        },
        partyName: {
          type: String,
          default: '',
        },
        sequence: {
          type: Number,
          default: 1,
        },
        status: {
          type: String,
          enum: ['Pending', 'Completed', 'Skipped'],
          default: 'Pending',
        },
        collectionAmount: {
          type: Number,
          default: 0,
        },
        visit: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Visit',
          default: null,
        },
      },
    ],
    totalVisitsPlanned: {
      type: Number,
      default: 0,
    },
    totalVisitsCompleted: {
      type: Number,
      default: 0,
    },
    totalCollection: {
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

module.exports = mongoose.model('Route', routeSchema);


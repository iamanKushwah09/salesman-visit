const mongoose = require('mongoose');

const salesmanSchema = new mongoose.Schema(
  {
    salesmanCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    territory: {
      type: String,
      default: 'General Market',
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: ['Bike / Scooter', 'Car', 'Public Transport', 'On Foot'],
      default: 'Bike / Scooter',
    },
    vehicleNumber: {
      type: String,
      default: '',
    },
    monthlyTarget: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Salesman', salesmanSchema);


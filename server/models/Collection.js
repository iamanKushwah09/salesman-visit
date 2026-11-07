const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    receiptNo: {
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
    visit: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Visit',
      default: null,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMode: {
      type: String,
      enum: ['Cash', 'UPI / QR', 'Cheque', 'Bank Transfer'],
      default: 'Cash',
    },
    referenceNo: {
      type: String,
      default: '',
      trim: true,
    },
    chequeDate: {
      type: Date,
      default: null,
    },
    bankName: {
      type: String,
      default: '',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    notes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['Received', 'Deposited', 'Cleared', 'Bounced'],
      default: 'Received',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Collection', collectionSchema);


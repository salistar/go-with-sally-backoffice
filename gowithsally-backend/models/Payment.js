// ============================================================
// 📄 Payment.js — GoWithSally
// LOG SUMMARY:
//   • console.log('Payment.js ▶ Module loaded')
//   • console.log('Payment.js ▶ Payment schema initialized')
// ============================================================

console.log('Payment.js ▶ Module loaded');

const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // ============================================================
  // RÉFÉRENCES
  // ============================================================
  rideId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ride',
    required: true,
    index: true,
  },

  passengerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },

  // ============================================================
  // MONTANT ET DEVISE
  // ============================================================
  amount: {
    type: Number,
    required: true,
    min: 0,
  },

  currency: {
    type: String,
    default: 'MAD',
    enum: ['MAD', 'EUR', 'USD'],
  },

  // ============================================================
  // MÉTHODE DE PAIEMENT
  // ============================================================
  method: {
    type: String,
    enum: ['cash', 'card', 'wallet', 'mobile_money'],
    required: true,
    index: true,
  },

  // ============================================================
  // STATUT
  // ============================================================
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending',
    index: true,
  },

  // ============================================================
  // RÉFÉRENCE TRANSACTION
  // ============================================================
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },

  // ============================================================
  // DÉTAILS CMI (si paiement par carte)
  // ============================================================
  cmiDetails: {
    orderId: String,
    clientIp: String,
    userAgent: String,
    successUrl: String,
    errorUrl: String,
    callbackUrl: String,
    cmiTransactionId: String,
    cmiMerchantId: String,
    cmiHashResult: String,
    responseCode: String,
    responseMessage: String,
    authCode: String,
    maskedCardNumber: String,
    cardBrand: String,
    processingDate: Date,
  },

  // ============================================================
  // DÉTAILS PORTEFEUILLE (si paiement par wallet)
  // ============================================================
  walletDetails: {
    walletId: mongoose.Schema.Types.ObjectId,
    previousBalance: Number,
    newBalance: Number,
  },

  // ============================================================
  // COMMISSION ET GAINS DU CONDUCTEUR
  // ============================================================
  commission: {
    total: Number,
    rate: Number,
  },

  driverEarnings: {
    total: Number,
  },

  // ============================================================
  // DÉTAILS DE PAIEMENT
  // ============================================================
  paymentDetails: {
    baseFare: Number,
    distanceFare: Number,
    timeFare: Number,
    surgeFare: Number,
    discount: Number,
    tax: Number,
  },

  // ============================================================
  // TENTATIVES ET ERREURS
  // ============================================================
  attempts: {
    type: Number,
    default: 0,
  },

  lastAttemptAt: Date,

  failureReason: String,

  // ============================================================
  // REMBOURSEMENT
  // ============================================================
  refund: {
    isRefunded: {
      type: Boolean,
      default: false,
    },
    amount: Number,
    reason: String,
    refundedAt: Date,
    refundTransactionId: String,
  },

  // ============================================================
  // MÉTADONNÉES
  // ============================================================
  metadata: {
    ipAddress: String,
    userAgent: String,
    deviceId: String,
    location: {
      latitude: Number,
      longitude: Number,
    },
  },

  // ============================================================
  // TIMESTAMPS
  // ============================================================
  initiatedAt: {
    type: Date,
    default: Date.now,
  },

  processedAt: Date,

  completedAt: Date,

}, {
  timestamps: true,
  indexes: [
    { rideId: 1, status: 1 },
    { passengerId: 1, createdAt: -1 },
    { driverId: 1, createdAt: -1 },
    { status: 1, createdAt: -1 },
    { method: 1, status: 1 },
    { transactionId: 1 },
  ],
});

// ============================================================
// MÉTHODES D'INSTANCE
// ============================================================

paymentSchema.methods.markAsProcessing = async function() {
  console.log('Payment.js ▶ markAsProcessing() called');
  this.status = 'processing';
  this.lastAttemptAt = new Date();
  this.attempts += 1;
  await this.save();
  return this;
};

paymentSchema.methods.markAsCompleted = async function(transactionId = null) {
  console.log('Payment.js ▶ markAsCompleted() called');
  this.status = 'completed';
  this.completedAt = new Date();
  this.processedAt = new Date();
  if (transactionId) {
    this.transactionId = transactionId;
  }
  await this.save();
  return this;
};

paymentSchema.methods.markAsFailed = async function(failureReason = '') {
  console.log('Payment.js ▶ markAsFailed() called');
  this.status = 'failed';
  this.failureReason = failureReason;
  this.lastAttemptAt = new Date();
  await this.save();
  return this;
};

paymentSchema.methods.refund = async function(refundReason = '') {
  console.log('Payment.js ▶ refund() called');
  if (this.status !== 'completed') {
    throw new Error('Can only refund completed payments');
  }

  this.refund = {
    isRefunded: true,
    amount: this.amount,
    reason: refundReason,
    refundedAt: new Date(),
  };

  this.status = 'refunded';
  await this.save();
  return this;
};

// ============================================================
// MÉTHODES STATIQUES
// ============================================================

paymentSchema.statics.createPayment = async function(paymentData) {
  console.log('Payment.js ▶ createPayment() called');
  const payment = new this(paymentData);
  await payment.save();
  return payment;
};

paymentSchema.statics.getByTransactionId = async function(transactionId) {
  console.log('Payment.js ▶ getByTransactionId() called');
  return this.findOne({ transactionId }).populate('rideId passengerId driverId');
};

paymentSchema.statics.getByRideId = async function(rideId) {
  console.log('Payment.js ▶ getByRideId() called');
  return this.findOne({ rideId }).populate('passengerId driverId');
};

paymentSchema.statics.getPassengerHistory = async function(passengerId, limit = 20) {
  console.log('Payment.js ▶ getPassengerHistory() called');
  return this.find({ passengerId, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(limit)
    .populate('rideId driverId');
};

paymentSchema.statics.getDriverHistory = async function(driverId, limit = 20) {
  console.log('Payment.js ▶ getDriverHistory() called');
  return this.find({ driverId, status: 'completed' })
    .sort({ completedAt: -1 })
    .limit(limit)
    .populate('rideId passengerId');
};

paymentSchema.statics.getStats = async function(filterOptions = {}) {
  console.log('Payment.js ▶ getStats() called');
  const matchStage = { status: 'completed' };

  if (filterOptions.startDate || filterOptions.endDate) {
    matchStage.completedAt = {};
    if (filterOptions.startDate) {
      matchStage.completedAt.$gte = new Date(filterOptions.startDate);
    }
    if (filterOptions.endDate) {
      matchStage.completedAt.$lte = new Date(filterOptions.endDate);
    }
  }

  if (filterOptions.method) {
    matchStage.method = filterOptions.method;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$amount' },
        totalTransactions: { $sum: 1 },
        avgAmount: { $avg: '$amount' },
        totalCommission: { $sum: '$commission.total' },
        totalDriverEarnings: { $sum: '$driverEarnings.total' },
      },
    },
  ]);
};

// ============================================================
// EXPORT
// ============================================================

const Payment = mongoose.model('Payment', paymentSchema);
console.log('Payment.js ▶ Payment schema initialized');

module.exports = Payment;

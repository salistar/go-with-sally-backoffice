// ============================================================
// 📄 Document.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('Document.js ▶ Module loaded')
//   • Document model: stores driver documents with validation/expiry
// ============================================================

console.log('📄 [Document.js] ▶ Module loaded');

const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────────────────────────────────────
    // REFERENCE
    // ─────────────────────────────────────────────────────────────────────────
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: [true, 'Driver ID is required'],
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // DOCUMENT DETAILS
    // ─────────────────────────────────────────────────────────────────────────
    documentType: {
      type: String,
      enum: [
        'national_id',
        'driver_license',
        'vehicle_registration',
        'vehicle_insurance',
        'criminal_record',
        'driving_record',
        'passport',
        'vehicle_inspection',
      ],
      required: [true, 'Document type is required'],
      index: true,
    },

    documentNumber: {
      type: String,
      trim: true,
    },

    issueDate: {
      type: Date,
    },

    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
      index: true,
    },

    issuingCountry: {
      type: String,
      default: 'MA', // Morocco
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FILE STORAGE
    // ─────────────────────────────────────────────────────────────────────────
    frontImageUrl: {
      type: String,
    },

    backImageUrl: {
      type: String,
    },

    documentUrl: {
      type: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // VERIFICATION STATUS
    // ─────────────────────────────────────────────────────────────────────────
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'expired', 'under_review'],
      default: 'pending',
      index: true,
    },

    verificationNotes: {
      type: String,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin user who verified
    },

    verifiedAt: {
      type: Date,
    },

    rejectionReason: {
      type: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // EXPIRY TRACKING
    // ─────────────────────────────────────────────────────────────────────────
    isExpired: {
      type: Boolean,
      default: false,
      index: true,
    },

    daysUntilExpiry: {
      type: Number,
    },

    expiryNotificationSent: {
      type: Boolean,
      default: false,
    },

    expiryNotificationSentAt: {
      type: Date,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // METADATA
    // ─────────────────────────────────────────────────────────────────────────
    fileSize: {
      type: Number, // in bytes
    },

    mimeType: {
      type: String,
    },

    uploadedFrom: {
      type: String,
      enum: ['web', 'mobile', 'admin'],
    },

    ipAddress: {
      type: String,
    },

    userAgent: {
      type: String,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // AUDIT FIELDS
    // ─────────────────────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
    },

    replacedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: 'documents',
  }
);

// ============================================================
// INDEXES
// ============================================================

documentSchema.index({ driverId: 1, documentType: 1 });
documentSchema.index({ expiryDate: 1, isExpired: 1 });
documentSchema.index({ verificationStatus: 1 });
documentSchema.index({ createdAt: -1 });

// ============================================================
// MIDDLEWARE
// ============================================================

// Update isExpired status before save
documentSchema.pre('save', function (next) {
  const now = new Date();
  this.isExpired = this.expiryDate <= now;

  if (this.expiryDate) {
    const msUntilExpiry = this.expiryDate.getTime() - now.getTime();
    this.daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));
  }

  next();
});

// ============================================================
// METHODS
// ============================================================

documentSchema.methods.isValid = function () {
  console.log('📄 [Document.js] ▶ isValid() called');
  return (
    this.verificationStatus === 'verified'
    && !this.isExpired
    && this.isActive
  );
};

documentSchema.methods.markAsExpired = function () {
  console.log('📄 [Document.js] ▶ markAsExpired() called');
  this.isExpired = true;
  this.verificationStatus = 'expired';
  return this.save();
};

documentSchema.methods.markForRenewal = function () {
  console.log('📄 [Document.js] ▶ markForRenewal() called');
  this.isActive = false;
  return this.save();
};

// ============================================================
// STATICS
// ============================================================

documentSchema.statics.findExpiringDocuments = function (daysUntilExpiry = 30) {
  console.log('📄 [Document.js] ▶ findExpiringDocuments() called');
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysUntilExpiry);

  return this.find({
    expiryDate: { $lte: futureDate, $gt: new Date() },
    isExpired: false,
    expiryNotificationSent: false,
  });
};

documentSchema.statics.findExpiredDocuments = function () {
  console.log('📄 [Document.js] ▶ findExpiredDocuments() called');
  return this.find({
    isExpired: true,
    verificationStatus: { $ne: 'expired' },
  });
};

const Document = mongoose.model('Document', documentSchema);

console.log('📄 [Document.js] ▶ Model compiled and exported');

module.exports = Document;

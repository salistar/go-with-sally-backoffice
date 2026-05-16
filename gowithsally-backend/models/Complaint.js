// ============================================================
// 📄 Complaint.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('Complaint.js ▶ Module loaded')
//   • Complaint model: user complaints and issue tracking
// ============================================================

console.log('📄 [Complaint.js] ▶ Module loaded');

const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema(
  {
    // ─────────────────────────────────────────────────────────────────────────
    // REFERENCE
    // ─────────────────────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    rideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ride',
      index: true,
    },

    againstUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // COMPLAINT DETAILS
    // ─────────────────────────────────────────────────────────────────────────
    category: {
      type: String,
      enum: [
        'safety',
        'driver_behavior',
        'vehicle_condition',
        'route_quality',
        'pricing',
        'payment_issue',
        'lost_item',
        'damage',
        'sexual_harassment',
        'discrimination',
        'fraud',
        'other',
      ],
      required: [true, 'Complaint category is required'],
      index: true,
    },

    subject: {
      type: String,
      required: [true, 'Subject is required'],
      maxlength: [200, 'Subject cannot exceed 200 characters'],
    },

    description: {
      type: String,
      required: [true, 'Description is required'],
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
      index: true,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // ATTACHMENTS
    // ─────────────────────────────────────────────────────────────────────────
    attachments: {
      type: [String], // URLs to images/documents
      default: [],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // STATUS & RESOLUTION
    // ─────────────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['open', 'in_review', 'investigating', 'resolved', 'closed', 'dismissed'],
      default: 'open',
      index: true,
    },

    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Admin assigned to handle
    },

    resolution: {
      type: String,
      maxlength: [1000, 'Resolution cannot exceed 1000 characters'],
    },

    resolutionDate: {
      type: Date,
    },

    resolutionType: {
      type: String,
      enum: [
        'refund',
        'credit',
        'driver_warning',
        'driver_suspension',
        'driver_deactivation',
        'user_warning',
        'user_suspension',
        'user_deactivation',
        'no_action',
      ],
    },

    // ─────────────────────────────────────────────────────────────────────────
    // COMMUNICATION
    // ─────────────────────────────────────────────────────────────────────────
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },

    internalNotes: [
      {
        author: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        content: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    customerResponse: {
      type: String,
      maxlength: [1000, 'Response cannot exceed 1000 characters'],
    },

    customerResponseDate: {
      type: Date,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // FOLLOW UP
    // ─────────────────────────────────────────────────────────────────────────
    followUpDate: {
      type: Date,
    },

    followUpRequired: {
      type: Boolean,
      default: false,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // METADATA
    // ─────────────────────────────────────────────────────────────────────────
    reportedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    resolvedAt: {
      type: Date,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: 'complaints',
  }
);

// ============================================================
// INDEXES
// ============================================================

complaintSchema.index({ userId: 1, createdAt: -1 });
complaintSchema.index({ status: 1, priority: 1 });
complaintSchema.index({ assignedTo: 1, status: 1 });
complaintSchema.index({ rideId: 1 });
complaintSchema.index({ category: 1, status: 1 });
complaintSchema.index({ severity: 1 });

// ============================================================
// MIDDLEWARE
// ============================================================

complaintSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

// ============================================================
// METHODS
// ============================================================

complaintSchema.methods.updateStatus = function (newStatus, notes = '') {
  console.log('📄 [Complaint.js] ▶ updateStatus() called');
  this.status = newStatus;
  if (notes) {
    this.internalNotes.push({
      author: null, // System update
      content: `Status changed to ${newStatus}: ${notes}`,
    });
  }
  return this.save();
};

complaintSchema.methods.resolve = function (resolution, resolutionType) {
  console.log('📄 [Complaint.js] ▶ resolve() called');
  this.status = 'resolved';
  this.resolution = resolution;
  this.resolutionType = resolutionType;
  this.resolvedAt = new Date();
  return this.save();
};

complaintSchema.methods.addInternalNote = function (author, content) {
  console.log('📄 [Complaint.js] ▶ addInternalNote() called');
  this.internalNotes.push({
    author,
    content,
    createdAt: new Date(),
  });
  return this.save();
};

complaintSchema.methods.addCustomerResponse = function (response) {
  console.log('📄 [Complaint.js] ▶ addCustomerResponse() called');
  this.customerResponse = response;
  this.customerResponseDate = new Date();
  return this.save();
};

// ============================================================
// STATICS
// ============================================================

complaintSchema.statics.getOpenComplaints = function () {
  console.log('📄 [Complaint.js] ▶ getOpenComplaints() called');
  return this.find({ status: { $in: ['open', 'in_review', 'investigating'] } })
    .sort({ priority: -1, createdAt: 1 });
};

complaintSchema.statics.getComplaintsBySeverity = function (severity) {
  console.log('📄 [Complaint.js] ▶ getComplaintsBySeverity() called');
  return this.find({ severity, status: { $ne: 'closed' } })
    .sort({ createdAt: -1 });
};

complaintSchema.statics.getAverageResolutionTime = function () {
  console.log('📄 [Complaint.js] ▶ getAverageResolutionTime() called');
  return this.aggregate([
    { $match: { resolvedAt: { $ne: null } } },
    {
      $project: {
        resolutionTime: {
          $subtract: ['$resolvedAt', '$createdAt'],
        },
      },
    },
    {
      $group: {
        _id: null,
        averageTime: { $avg: '$resolutionTime' },
        minTime: { $min: '$resolutionTime' },
        maxTime: { $max: '$resolutionTime' },
      },
    },
  ]);
};

const Complaint = mongoose.model('Complaint', complaintSchema);

console.log('📄 [Complaint.js] ▶ Model compiled and exported');

module.exports = Complaint;

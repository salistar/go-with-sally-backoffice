// ============================================================
// 📄 Consent.js — GoWithSally
// LOG SUMMARY:
//   • console.log('Consent.js ▶ Module loaded')
//   • console.log('Consent.js ▶ Consent schema initialized')
// ============================================================

console.log('Consent.js ▶ Module loaded');

const mongoose = require('mongoose');

const consentSchema = new mongoose.Schema({
  // ============================================================
  // UTILISATEUR
  // ============================================================
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true,
  },

  // ============================================================
  // CONSENTEMENTS
  // ============================================================
  consents: [
    {
      type: {
        type: String,
        enum: [
          'privacy_policy',
          'terms_of_service',
          'marketing_emails',
          'push_notifications',
          'location_tracking',
          'biometric_storage',
          'data_analytics',
          'third_party_sharing',
        ],
        required: true,
      },
      name: String,
      description: String,
      version: String, // Version de la politique/condition
      given: Boolean,
      givenAt: Date,
      revokedAt: Date,
      ipAddress: String,
      userAgent: String,
    },
  ],

  // ============================================================
  // AUDIT
  // ============================================================
  gdprOptIn: {
    type: Boolean,
    default: false,
    index: true,
  },

  cndpOptIn: {
    type: Boolean,
    default: false,
    index: true,
  },

  // ============================================================
  // TIMESTAMPS
  // ============================================================
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

}, {
  timestamps: true,
});

// ============================================================
// METHODS
// ============================================================

consentSchema.methods.giveConsent = async function(consentType, options = {}) {
  console.log('Consent.js ▶ giveConsent() called');

  const existingConsent = this.consents.find(c => c.type === consentType);

  if (existingConsent) {
    existingConsent.given = true;
    existingConsent.givenAt = new Date();
    existingConsent.ipAddress = options.ip;
    existingConsent.userAgent = options.userAgent;
  } else {
    this.consents.push({
      type: consentType,
      given: true,
      givenAt: new Date(),
      ipAddress: options.ip,
      userAgent: options.userAgent,
    });
  }

  await this.save();
  return this;
};

consentSchema.methods.revokeConsent = async function(consentType) {
  console.log('Consent.js ▶ revokeConsent() called');

  const consent = this.consents.find(c => c.type === consentType);

  if (consent) {
    consent.given = false;
    consent.revokedAt = new Date();
  }

  await this.save();
  return this;
};

consentSchema.methods.hasConsent = function(consentType) {
  console.log('Consent.js ▶ hasConsent() called');

  const consent = this.consents.find(c => c.type === consentType);
  return consent && consent.given && !consent.revokedAt;
};

// ============================================================
// STATICS
// ============================================================

consentSchema.statics.createConsent = async function(userId) {
  console.log('Consent.js ▶ createConsent() called');

  const consent = new this({
    userId,
    consents: [
      {
        type: 'privacy_policy',
        name: 'Privacy Policy',
        given: false,
      },
      {
        type: 'terms_of_service',
        name: 'Terms of Service',
        given: false,
      },
      {
        type: 'marketing_emails',
        name: 'Marketing Emails',
        given: false,
      },
      {
        type: 'push_notifications',
        name: 'Push Notifications',
        given: false,
      },
      {
        type: 'location_tracking',
        name: 'Location Tracking',
        given: false,
      },
      {
        type: 'biometric_storage',
        name: 'Biometric Data Storage',
        given: false,
      },
      {
        type: 'data_analytics',
        name: 'Data Analytics',
        given: false,
      },
      {
        type: 'third_party_sharing',
        name: 'Third Party Sharing',
        given: false,
      },
    ],
  });

  await consent.save();
  return consent;
};

// ============================================================
// EXPORT
// ============================================================

const Consent = mongoose.model('Consent', consentSchema);
console.log('Consent.js ▶ Consent schema initialized');

module.exports = Consent;

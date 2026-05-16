// ============================================================
// 📄 documentService.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('documentService.js ▶ Module loaded')
//   • console.log('documentService.js ▶ function() called')
// ============================================================

console.log('📄 [documentService.js] ▶ Module loaded');

const Document = require('../models/Document');
const Driver = require('../models/Driver');
const emailService = require('./emailService');

/**
 * Validate document expiry and send notifications
 */
const validateDocumentExpiry = async (document) => {
  console.log('📄 [documentService.js] ▶ validateDocumentExpiry() called');

  try {
    const now = new Date();
    const isExpired = document.expiryDate <= now;

    if (isExpired) {
      document.isExpired = true;
      document.verificationStatus = 'expired';
      await document.save();
      return { isValid: false, reason: 'Document expired' };
    }

    const daysUntilExpiry = Math.ceil(
      (document.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return { isValid: true, daysUntilExpiry };
  } catch (error) {
    console.error('documentService.js ▶ validateDocumentExpiry error:', error);
    throw error;
  }
};

/**
 * Send expiry notification to driver
 */
const sendExpiryNotification = async (document) => {
  console.log('📄 [documentService.js] ▶ sendExpiryNotification() called');

  try {
    const driver = await Driver.findById(document.driverId).populate('user');

    if (!driver || !driver.user) {
      console.error('Driver or user not found');
      return { success: false };
    }

    const documentTypeLabel = document.documentType.replace(/_/g, ' ').toUpperCase();

    const emailContent = {
      subject: `Document Expiry Notification - ${documentTypeLabel}`,
      to: driver.user.email,
      template: 'document-expiry',
      data: {
        firstName: driver.user.firstName,
        documentType: documentTypeLabel,
        expiryDate: document.expiryDate.toLocaleDateString('en-US'),
        daysUntilExpiry: document.daysUntilExpiry,
      },
    };

    await emailService.sendEmail(emailContent);

    document.expiryNotificationSent = true;
    document.expiryNotificationSentAt = new Date();
    await document.save();

    return { success: true };
  } catch (error) {
    console.error('documentService.js ▶ sendExpiryNotification error:', error);
    throw error;
  }
};

/**
 * Check and notify about expiring documents (called periodically)
 */
const checkAndNotifyExpiringDocuments = async (daysUntilExpiry = 30) => {
  console.log('📄 [documentService.js] ▶ checkAndNotifyExpiringDocuments() called');

  try {
    const expiringDocuments = await Document.findExpiringDocuments(daysUntilExpiry);

    console.log(`documentService.js ▶ Found ${expiringDocuments.length} expiring documents`);

    const results = [];

    for (const doc of expiringDocuments) {
      try {
        const result = await sendExpiryNotification(doc);
        results.push({ documentId: doc._id, success: result.success });
      } catch (error) {
        console.error(`documentService.js ▶ Error notifying document ${doc._id}:`, error);
        results.push({ documentId: doc._id, success: false, error: error.message });
      }
    }

    return results;
  } catch (error) {
    console.error('documentService.js ▶ checkAndNotifyExpiringDocuments error:', error);
    throw error;
  }
};

/**
 * Handle expired documents and update driver status
 */
const handleExpiredDocuments = async (driverId) => {
  console.log('📄 [documentService.js] ▶ handleExpiredDocuments() called');

  try {
    const driver = await Driver.findById(driverId);

    if (!driver) {
      throw new Error('Driver not found');
    }

    // Check if driver has expired documents
    const expiredDocs = await Document.find({
      driverId,
      isExpired: true,
      isActive: true,
    });

    if (expiredDocs.length > 0) {
      driver.status = 'pending_documents';
      driver.statusReason = 'One or more documents have expired';
      await driver.save();

      return { suspended: true, expiredDocuments: expiredDocs.length };
    }

    return { suspended: false };
  } catch (error) {
    console.error('documentService.js ▶ handleExpiredDocuments error:', error);
    throw error;
  }
};

/**
 * Get all required documents for a driver
 */
const getRequiredDocuments = async () => {
  console.log('📄 [documentService.js] ▶ getRequiredDocuments() called');

  return [
    { type: 'national_id', required: true, description: 'National ID or Passport' },
    { type: 'driver_license', required: true, description: 'Valid Driving License' },
    { type: 'vehicle_registration', required: true, description: 'Vehicle Registration' },
    { type: 'vehicle_insurance', required: true, description: 'Vehicle Insurance' },
    { type: 'vehicle_inspection', required: true, description: 'Vehicle Inspection Certificate' },
    { type: 'criminal_record', required: true, description: 'Clean Criminal Record' },
    { type: 'driving_record', required: true, description: 'Driving Record Extract' },
  ];
};

/**
 * Check if driver has all required documents and they're valid
 */
const validateDriverDocuments = async (driverId) => {
  console.log('📄 [documentService.js] ▶ validateDriverDocuments() called');

  try {
    const requiredDocs = await getRequiredDocuments();
    const submittedDocs = await Document.find({
      driverId,
      isActive: true,
    });

    const results = {
      complete: true,
      missing: [],
      invalid: [],
      documents: {},
    };

    // Check each required document type
    for (const required of requiredDocs) {
      const submitted = submittedDocs.find((d) => d.documentType === required.type);

      if (!submitted) {
        results.missing.push(required.type);
        results.complete = false;
        continue;
      }

      const validation = await validateDocumentExpiry(submitted);

      if (!validation.isValid || submitted.verificationStatus !== 'verified') {
        results.invalid.push({
          type: required.type,
          reason: submitted.rejectionReason || 'Not verified or expired',
        });
        results.complete = false;
      }

      results.documents[required.type] = {
        status: submitted.verificationStatus,
        isExpired: submitted.isExpired,
        expiryDate: submitted.expiryDate,
      };
    }

    return results;
  } catch (error) {
    console.error('documentService.js ▶ validateDriverDocuments error:', error);
    throw error;
  }
};

/**
 * Archive old document when new one is uploaded
 */
const archiveDocument = async (driverId, documentType) => {
  console.log('📄 [documentService.js] ▶ archiveDocument() called');

  try {
    const oldDocument = await Document.findOne({
      driverId,
      documentType,
      isActive: true,
    });

    if (oldDocument) {
      oldDocument.isActive = false;
      await oldDocument.save();
    }

    return oldDocument;
  } catch (error) {
    console.error('documentService.js ▶ archiveDocument error:', error);
    throw error;
  }
};

module.exports = {
  validateDocumentExpiry,
  sendExpiryNotification,
  checkAndNotifyExpiringDocuments,
  handleExpiredDocuments,
  getRequiredDocuments,
  validateDriverDocuments,
  archiveDocument,
};

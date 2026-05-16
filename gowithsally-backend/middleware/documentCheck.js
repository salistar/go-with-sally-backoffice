// ============================================================
// 📄 documentCheck.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('documentCheck.js ▶ Module loaded')
//   • console.log('documentCheck.js ▶ middleware() called')
// ============================================================

console.log('📄 [documentCheck.js] ▶ Module loaded');

const Document = require('../models/Document');
const documentService = require('../services/documentService');

/**
 * Middleware to verify driver has all required valid documents
 * Used to control access to driver features
 */
const documentCheck = async (req, res, next) => {
  console.log('📄 [documentCheck.js] ▶ middleware() called');

  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
      });
    }

    const driverId = req.user.driverId || req.params.driverId;

    if (!driverId) {
      return res.status(400).json({
        success: false,
        message: 'Driver ID not found',
      });
    }

    // Check if driver has valid documents
    const validation = await documentService.validateDriverDocuments(driverId);

    if (!validation.complete) {
      return res.status(403).json({
        success: false,
        message: 'Driver documents incomplete or invalid',
        missing: validation.missing,
        invalid: validation.invalid,
      });
    }

    // Attach document info to request
    req.documentInfo = validation;
    next();
  } catch (error) {
    console.error('documentCheck.js ▶ Error:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Error checking documents',
      error: error.message,
    });
  }
};

/**
 * Soft check - allows access but flags missing documents
 */
const documentCheckWarning = async (req, res, next) => {
  console.log('📄 [documentCheck.js] ▶ documentCheckWarning() called');

  try {
    if (!req.user || !req.user.id) {
      return next();
    }

    const driverId = req.user.driverId || req.params.driverId;

    if (driverId) {
      const validation = await documentService.validateDriverDocuments(driverId);
      req.documentInfo = validation;
      req.documentWarnings = {
        missing: validation.missing,
        invalid: validation.invalid,
      };
    }

    next();
  } catch (error) {
    console.error('documentCheck.js ▶ documentCheckWarning error:', error);
    // Don't block on warning check failure
    next();
  }
};

/**
 * Check specific document type validity
 */
const checkDocumentType = (documentType) => {
  return async (req, res, next) => {
    console.log(`📄 [documentCheck.js] ▶ checkDocumentType(${documentType}) called`);

    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const driverId = req.user.driverId || req.params.driverId;

      if (!driverId) {
        return res.status(400).json({
          success: false,
          message: 'Driver ID not found',
        });
      }

      const document = await Document.findOne({
        driverId,
        documentType,
        isActive: true,
      });

      if (!document) {
        return res.status(403).json({
          success: false,
          message: `Required document not found: ${documentType}`,
        });
      }

      const validation = await documentService.validateDocumentExpiry(document);

      if (!validation.isValid) {
        return res.status(403).json({
          success: false,
          message: `Document is no longer valid: ${validation.reason}`,
        });
      }

      if (document.verificationStatus !== 'verified') {
        return res.status(403).json({
          success: false,
          message: `Document not yet verified: ${document.verificationStatus}`,
        });
      }

      req.requiredDocument = document;
      next();
    } catch (error) {
      console.error('documentCheck.js ▶ checkDocumentType error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error checking document',
        error: error.message,
      });
    }
  };
};

module.exports = {
  documentCheck,
  documentCheckWarning,
  checkDocumentType,
};

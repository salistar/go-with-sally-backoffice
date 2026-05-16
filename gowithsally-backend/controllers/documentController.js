// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - getDocuments() function entry
// - uploadDocument() function entry
// - deleteDocument() function entry
// - getDocumentStatus() function entry

console.log('📄 documentController.js ▶ Module loaded');

// backend/src/controllers/documentController.js
// Contrôleur des documents Go With Sally

const Driver = require('../models/Driver');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');

// ==================== CONFIGURATION ====================

const UPLOAD_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  thumbnailSize: 200,
  uploadDir: 'uploads/documents'
};

const DOCUMENT_TYPES = [
  'drivingLicense', 'drivingLicenseBack',
  'nationalId', 'nationalIdBack',
  'vehicleRegistration', 'insurance',
  'criminalRecord', 'vehicleFront',
  'vehicleBack', 'profilePhoto'
];

// ==================== HELPERS ====================

const getUploadPath = (type) => {
  const categoryMap = {
    drivingLicense: 'licenses',
    drivingLicenseBack: 'licenses',
    nationalId: 'ids',
    nationalIdBack: 'ids',
    vehicleRegistration: 'vehicles',
    insurance: 'insurance',
    criminalRecord: 'legal',
    vehicleFront: 'vehicles',
    vehicleBack: 'vehicles',
    profilePhoto: 'profiles'
  };
  return path.join(UPLOAD_CONFIG.uploadDir, categoryMap[type] || 'other');
};

const generateThumbnail = async (filePath, thumbnailPath) => {
  try {
    await sharp(filePath)
      .resize(UPLOAD_CONFIG.thumbnailSize, UPLOAD_CONFIG.thumbnailSize, {
        fit: 'cover',
        position: 'center'
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    return true;
  } catch (error) {
    console.error('[Document] Thumbnail generation failed:', error);
    return false;
  }
};

// ==================== CONTROLLERS ====================

/**
 * Obtenir tous les documents
 * GET /api/documents
 */
exports.getDocuments = async (req, res) => {
  console.log('📄 documentController.js ▶ getDocuments() called');
  try {
    const driver = await Driver.findById(req.user._id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      });
    }
    
    // Créer un objet avec tous les types de documents
    const documentsMap = {};
    DOCUMENT_TYPES.forEach(type => {
      const doc = driver.documents.find(d => d.type === type);
      documentsMap[type] = doc || null;
    });
    
    res.json({
      success: true,
      documents: driver.documents,
      documentsMap,
      status: driver.documentsStatus,
      progress: driver.getVerificationProgress()
    });
  } catch (error) {
    console.error('[Document] Get all error:', error);
    res.status(500).json({
      success: false,
      error: 'fetch_failed',
      message: 'Failed to fetch documents'
    });
  }
};

/**
 * Obtenir un document spécifique
 * GET /api/documents/:type
 */
exports.getDocument = async (req, res) => {
  try {
    const { type } = req.params;
    
    if (!DOCUMENT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_type',
        message: 'Invalid document type'
      });
    }
    
    const driver = await Driver.findById(req.user._id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      });
    }
    
    const document = driver.documents.find(d => d.type === type);
    
    res.json({
      success: true,
      document: document || null
    });
  } catch (error) {
    console.error('[Document] Get one error:', error);
    res.status(500).json({
      success: false,
      error: 'fetch_failed',
      message: 'Failed to fetch document'
    });
  }
};

/**
 * Upload un document
 * POST /api/documents/upload
 */
exports.uploadDocument = async (req, res) => {
  try {
    const { type } = req.body;
    const file = req.file;
    const isHybrid = req.headers['x-app-mode'] === 'hybrid';
    
    if (!type || !DOCUMENT_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_type',
        message: 'Invalid document type'
      });
    }
    
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'no_file',
        message: 'No file uploaded'
      });
    }
    
    // Vérifier le type MIME
    if (!UPLOAD_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_format',
        message: 'Invalid file format'
      });
    }
    
    const driver = await Driver.findById(req.user._id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      });
    }
    
    // Générer les URLs
    const fileId = uuidv4();
    const extension = path.extname(file.originalname) || '.jpg';
    const fileName = `${driver._id}_${type}_${fileId}${extension}`;
    const uploadPath = getUploadPath(type);
    const filePath = path.join(uploadPath, fileName);
    const thumbnailName = `${driver._id}_${type}_${fileId}_thumb.jpg`;
    const thumbnailPath = path.join(uploadPath, thumbnailName);
    
    // En mode réel, déplacer le fichier
    // En mode hybrid, simuler
    let fileUrl = `/uploads/documents/${fileName}`;
    let thumbnailUrl = `/uploads/documents/${thumbnailName}`;
    
    if (!isHybrid) {
      // Créer le répertoire si nécessaire
      await fs.mkdir(uploadPath, { recursive: true });
      
      // Déplacer le fichier uploadé
      await fs.rename(file.path, filePath);
      
      // Générer thumbnail si c'est une image
      if (file.mimetype.startsWith('image/')) {
        await generateThumbnail(filePath, thumbnailPath);
      }
      
      fileUrl = `${process.env.API_URL}/${filePath}`;
      thumbnailUrl = `${process.env.API_URL}/${thumbnailPath}`;
    }
    
    // Créer l'objet document
    const documentData = {
      type,
      status: 'pending_review',
      url: fileUrl,
      thumbnailUrl: file.mimetype.startsWith('image/') ? thumbnailUrl : null,
      uploadedAt: new Date(),
      verifiedAt: null,
      rejectedAt: null,
      rejectionReason: null,
      metadata: {
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype
      }
    };
    
    // Mettre à jour ou ajouter le document
    const existingIndex = driver.documents.findIndex(d => d.type === type);
    if (existingIndex >= 0) {
      // Supprimer l'ancien fichier si existe
      const oldDoc = driver.documents[existingIndex];
      if (oldDoc.url && !isHybrid) {
        try {
          await fs.unlink(oldDoc.url.replace(process.env.API_URL + '/', ''));
        } catch (e) {
          // Ignorer si le fichier n'existe pas
        }
      }
      driver.documents[existingIndex] = { ...driver.documents[existingIndex].toObject(), ...documentData };
    } else {
      driver.documents.push(documentData);
    }
    
    await driver.save();
    
    // Récupérer le document mis à jour
    const savedDocument = driver.documents.find(d => d.type === type);
    
    res.json({
      success: true,
      document: savedDocument,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    console.error('[Document] Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'upload_failed',
      message: 'Failed to upload document'
    });
  }
};

/**
 * Supprimer un document
 * DELETE /api/documents/:id
 */
exports.deleteDocument = async (req, res) => {
  try {
    const { id } = req.params;
    
    const driver = await Driver.findById(req.user._id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      });
    }
    
    const documentIndex = driver.documents.findIndex(d => d._id.toString() === id);
    
    if (documentIndex === -1) {
      return res.status(404).json({
        success: false,
        error: 'document_not_found',
        message: 'Document not found'
      });
    }
    
    const document = driver.documents[documentIndex];
    
    // Supprimer le fichier physique
    if (document.url) {
      try {
        const filePath = document.url.replace(process.env.API_URL + '/', '');
        await fs.unlink(filePath);
        
        if (document.thumbnailUrl) {
          const thumbPath = document.thumbnailUrl.replace(process.env.API_URL + '/', '');
          await fs.unlink(thumbPath);
        }
      } catch (e) {
        // Ignorer si les fichiers n'existent pas
      }
    }
    
    // Supprimer du tableau
    driver.documents.splice(documentIndex, 1);
    await driver.save();
    
    res.json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('[Document] Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'delete_failed',
      message: 'Failed to delete document'
    });
  }
};

/**
 * Obtenir le statut global des documents
 * GET /api/documents/status
 */
exports.getDocumentsStatus = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user._id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      });
    }
    
    const progress = driver.getVerificationProgress();
    
    res.json({
      success: true,
      status: driver.documentsStatus,
      ...progress,
      canDrive: driver.canDrive
    });
  } catch (error) {
    console.error('[Document] Status error:', error);
    res.status(500).json({
      success: false,
      error: 'fetch_failed',
      message: 'Failed to fetch status'
    });
  }
};

// ==================== ADMIN CONTROLLERS ====================

/**
 * Obtenir les documents en attente (Admin)
 * GET /api/admin/documents/pending
 */
exports.getPendingDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const drivers = await Driver.find({
      'documents.status': 'pending_review'
    })
    .select('firstName lastName email phone documents')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
    
    const pendingDocs = [];
    
    drivers.forEach(driver => {
      driver.documents
        .filter(d => d.status === 'pending_review')
        .forEach(doc => {
          pendingDocs.push({
            documentId: doc._id,
            driverId: driver._id,
            driverName: `${driver.firstName} ${driver.lastName}`,
            driverEmail: driver.email,
            driverPhone: driver.phone,
            ...doc.toObject()
          });
        });
    });
    
    // Trier par date d'upload (plus ancien en premier)
    pendingDocs.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
    
    res.json({
      success: true,
      documents: pendingDocs,
      total: pendingDocs.length,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    console.error('[Admin] Get pending error:', error);
    res.status(500).json({
      success: false,
      error: 'fetch_failed',
      message: 'Failed to fetch pending documents'
    });
  }
};

/**
 * Vérifier un document (Admin)
 * POST /api/admin/documents/:id/verify
 */
exports.verifyDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    
    const driver = await Driver.findOne({ 'documents._id': id });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'document_not_found',
        message: 'Document not found'
      });
    }
    
    const document = driver.documents.id(id);
    document.status = 'verified';
    document.verifiedAt = new Date();
    document.verifiedBy = req.admin._id;
    document.rejectedAt = null;
    document.rejectionReason = null;
    
    await driver.save();
    
    // TODO: Envoyer notification au driver
    
    res.json({
      success: true,
      document,
      message: 'Document verified successfully'
    });
  } catch (error) {
    console.error('[Admin] Verify error:', error);
    res.status(500).json({
      success: false,
      error: 'verification_failed',
      message: 'Failed to verify document'
    });
  }
};

/**
 * Rejeter un document (Admin)
 * POST /api/admin/documents/:id/reject
 */
exports.rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, notes } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'reason_required',
        message: 'Rejection reason is required'
      });
    }
    
    const driver = await Driver.findOne({ 'documents._id': id });
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'document_not_found',
        message: 'Document not found'
      });
    }
    
    const document = driver.documents.id(id);
    document.status = 'rejected';
    document.rejectedAt = new Date();
    document.rejectionReason = reason;
    document.verifiedAt = null;
    document.verifiedBy = null;
    
    await driver.save();
    
    // TODO: Envoyer notification au driver
    
    res.json({
      success: true,
      document,
      message: 'Document rejected'
    });
  } catch (error) {
    console.error('[Admin] Reject error:', error);
    res.status(500).json({
      success: false,
      error: 'rejection_failed',
      message: 'Failed to reject document'
    });
  }
};

/**
 * Demander un appel de vérification (Admin)
 * POST /api/admin/documents/request-call
 */
exports.requestVerificationCall = async (req, res) => {
  try {
    const { driverId, scheduledAt, notes } = req.body;
    
    const driver = await Driver.findById(driverId);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'driver_not_found',
        message: 'Driver not found'
      });
    }
    
    driver.verification.callVerification = {
      required: true,
      status: scheduledAt ? 'scheduled' : 'pending',
      scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      notes
    };
    
    await driver.save();
    
    // TODO: Envoyer notification au driver
    
    res.json({
      success: true,
      message: 'Verification call requested'
    });
  } catch (error) {
    console.error('[Admin] Request call error:', error);
    res.status(500).json({
      success: false,
      error: 'request_failed',
      message: 'Failed to request verification call'
    });
  }
};
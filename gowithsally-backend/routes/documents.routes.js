// backend/src/routes/documents.routes.js
// Routes des documents Go With Sally

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/auth.middleware');
const { adminProtect } = require('../middleware/admin.middleware');

// ==================== MULTER CONFIG ====================

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// ==================== DRIVER ROUTES ====================

// Obtenir tous les documents
router.get('/', protect, documentController.getDocuments);

// Obtenir le statut des documents
router.get('/status', protect, documentController.getDocumentsStatus);

// Obtenir un document spécifique
router.get('/:type', protect, documentController.getDocument);

// Upload un document
router.post('/upload', protect, upload.single('file'), documentController.uploadDocument);

// Supprimer un document
router.delete('/:id', protect, documentController.deleteDocument);

// ==================== ADMIN ROUTES ====================

// Obtenir les documents en attente
router.get('/admin/pending', adminProtect, documentController.getPendingDocuments);

// Vérifier un document
router.post('/admin/:id/verify', adminProtect, documentController.verifyDocument);

// Rejeter un document
router.post('/admin/:id/reject', adminProtect, documentController.rejectDocument);

// Demander un appel de vérification
router.post('/admin/request-call', adminProtect, documentController.requestVerificationCall);

module.exports = router;
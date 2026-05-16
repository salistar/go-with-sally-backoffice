// backend/src/routes/verification.routes.js
// Routes de vérification Go With Sally

const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { protect, optionalAuth } = require('../middleware/auth.middleware');
const { validateOTPSend, validateOTPVerify, validateEmail } = require('../validators/verification.validator');

// ==================== OTP ROUTES ====================

// Envoyer OTP (pas besoin d'être authentifié pour l'inscription)
router.post('/otp/send', optionalAuth, validateOTPSend, verificationController.sendOTP);

// Vérifier OTP
router.post('/otp/verify', optionalAuth, validateOTPVerify, verificationController.verifyOTP);

// Renvoyer OTP
router.post('/otp/resend', optionalAuth, validateOTPSend, verificationController.sendOTP);

// ==================== EMAIL ROUTES ====================

// Envoyer email de vérification
router.post('/email/send', optionalAuth, validateEmail, verificationController.sendEmailVerification);

// Vérifier email (peut être appelé depuis un lien)
router.post('/email/verify', verificationController.verifyEmail);

// Vérifier via GET (pour les liens dans les emails)
router.get('/email/verify/:token', async (req, res) => {
  req.body.token = req.params.token;
  return verificationController.verifyEmail(req, res);
});

// ==================== FACE ROUTES ====================

// Enregistrer visage (nécessite authentification)
router.post('/face/enroll', protect, verificationController.enrollFace);

// Vérifier visage
router.post('/face/verify', protect, verificationController.verifyFace);

// ==================== STATUS ROUTES ====================

// Obtenir le statut global de vérification
router.get('/status', protect, verificationController.getVerificationStatus);

module.exports = router;
// ============================================================
// 📄 otp.js — GoWithSally
// LOG SUMMARY:
//   • console.log('otp.js ▶ Routes loaded')
// ============================================================

console.log('otp.js ▶ Routes loaded');

const express = require('express');
const otpController = require('../controllers/otpController');

const router = express.Router();

// ============================================================
// ROUTES PUBLIQUES (sans authentification)
// ============================================================

/**
 * POST /api/otp/generate
 * Générer et envoyer un OTP
 */
router.post('/generate', otpController.generateOTP);

/**
 * POST /api/otp/verify
 * Vérifier un OTP
 */
router.post('/verify', otpController.verifyOTP);

/**
 * POST /api/otp/resend
 * Renvoyer un OTP
 */
router.post('/resend', otpController.resendOTP);

/**
 * GET /api/otp/config
 * Récupérer la configuration OTP
 */
router.get('/config', otpController.getOTPConfig);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;

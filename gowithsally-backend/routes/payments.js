// ============================================================
// 📄 payments.js — GoWithSally
// LOG SUMMARY:
//   • console.log('payments.js ▶ Routes loaded')
// ============================================================

console.log('payments.js ▶ Routes loaded');

const express = require('express');
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ROUTES PUBLIQUES (avec middleware d'authentification si nécessaire)
// ============================================================

/**
 * POST /api/payments/initiate
 * Initier un paiement
 */
router.post('/initiate', auth, paymentController.initiatePayment);

/**
 * POST /api/payments/:paymentId/complete-cash
 * Compléter un paiement en espèces
 */
router.post('/:paymentId/complete-cash', auth, paymentController.completeCashPayment);

/**
 * POST /api/payments/:paymentId/refund
 * Demander un remboursement
 */
router.post('/:paymentId/refund', auth, paymentController.refundPayment);

/**
 * GET /api/payments/:paymentId
 * Récupérer les détails d'un paiement
 */
router.get('/:paymentId', auth, paymentController.getPaymentDetails);

/**
 * GET /api/payments/passenger/:passengerId/history
 * Récupérer l'historique de paiement d'un passager
 */
router.get('/passenger/:passengerId/history', auth, paymentController.getPassengerPaymentHistory);

/**
 * GET /api/payments/driver/:driverId/history
 * Récupérer l'historique de paiement d'un conducteur
 */
router.get('/driver/:driverId/history', auth, paymentController.getDriverPaymentHistory);

/**
 * GET /api/payments/stats
 * Récupérer les statistiques de paiement
 */
router.get('/stats', paymentController.getPaymentStats);

// ============================================================
// CALLBACK (non authentifié - CMI le sends directement)
// ============================================================

/**
 * POST /api/payments/cmi/callback
 * Recevoir et traiter le callback CMI
 */
router.post('/cmi/callback', paymentController.processCMICallback);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;

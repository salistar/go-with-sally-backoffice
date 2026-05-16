// ============================================================
// 📄 earnings-extended.js — GoWithSally
// LOG SUMMARY:
//   • console.log('earnings-extended.js ▶ Routes loaded')
// ============================================================

console.log('earnings-extended.js ▶ Routes loaded');

const express = require('express');
const earningsController = require('../controllers/earningsController');
const auth = require('../middleware/auth');

const router = express.Router();

// ============================================================
// ROUTES DE GAINS
// ============================================================

/**
 * GET /api/earnings/daily/:driverId
 * Récupérer les gains quotidiens
 */
router.get('/daily/:driverId', auth, earningsController.getDailyEarnings);

/**
 * GET /api/earnings/weekly/:driverId
 * Récupérer les gains hebdomadaires
 */
router.get('/weekly/:driverId', auth, earningsController.getWeeklyEarnings);

/**
 * GET /api/earnings/monthly/:driverId
 * Récupérer les gains mensuels
 */
router.get('/monthly/:driverId', auth, earningsController.getMonthlyEarnings);

/**
 * GET /api/earnings/summary/:driverId
 * Récupérer un résumé complet des gains
 */
router.get('/summary/:driverId', auth, earningsController.getEarningsSummary);

// ============================================================
// ROUTES DE RETRAIT
// ============================================================

/**
 * POST /api/earnings/withdraw
 * Demander un retrait
 */
router.post('/withdraw', auth, earningsController.requestWithdrawal);

/**
 * GET /api/earnings/withdrawals/:driverId
 * Récupérer l'historique des retraits
 */
router.get('/withdrawals/:driverId', auth, earningsController.getWithdrawalHistory);

// ============================================================
// ROUTES DE CONFIGURATION
// ============================================================

/**
 * GET /api/earnings/config/commissions
 * Récupérer la configuration des commissions
 */
router.get('/config/commissions', earningsController.getCommissionConfig);

/**
 * GET /api/earnings/config/withdrawals
 * Récupérer la configuration des retraits
 */
router.get('/config/withdrawals', earningsController.getWithdrawalConfig);

// ============================================================
// EXPORT
// ============================================================

module.exports = router;

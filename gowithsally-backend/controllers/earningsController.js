// ============================================================
// 📄 earningsController.js — GoWithSally
// LOG SUMMARY:
//   • console.log('earningsController.js ▶ Module loaded')
//   • console.log('earningsController.js ▶ getDailyEarnings() called')
// ============================================================

console.log('earningsController.js ▶ Module loaded');

const earningsService = require('../services/earningsService');

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * GET /api/earnings/daily/:driverId
 * Récupérer les gains quotidiens
 */
exports.getDailyEarnings = async (req, res) => {
  console.log('earningsController.js ▶ getDailyEarnings() called');

  try {
    const { driverId } = req.params;
    const { date } = req.query;

    const result = await earningsService.calculateDailyEarnings(
      driverId,
      date ? new Date(date) : new Date()
    );

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('earningsController.js ▶ getDailyEarnings() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/earnings/weekly/:driverId
 * Récupérer les gains hebdomadaires
 */
exports.getWeeklyEarnings = async (req, res) => {
  console.log('earningsController.js ▶ getWeeklyEarnings() called');

  try {
    const { driverId } = req.params;
    const { date } = req.query;

    const result = await earningsService.calculateWeeklyEarnings(
      driverId,
      date ? new Date(date) : new Date()
    );

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('earningsController.js ▶ getWeeklyEarnings() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/earnings/monthly/:driverId
 * Récupérer les gains mensuels
 */
exports.getMonthlyEarnings = async (req, res) => {
  console.log('earningsController.js ▶ getMonthlyEarnings() called');

  try {
    const { driverId } = req.params;
    const { date } = req.query;

    const result = await earningsService.calculateMonthlyEarnings(
      driverId,
      date ? new Date(date) : new Date()
    );

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('earningsController.js ▶ getMonthlyEarnings() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/earnings/summary/:driverId
 * Récupérer un résumé complet des gains
 */
exports.getEarningsSummary = async (req, res) => {
  console.log('earningsController.js ▶ getEarningsSummary() called');

  try {
    const { driverId } = req.params;

    const result = await earningsService.getEarningsSummary(driverId);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('earningsController.js ▶ getEarningsSummary() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/earnings/withdraw
 * Demander un retrait
 */
exports.requestWithdrawal = async (req, res) => {
  console.log('earningsController.js ▶ requestWithdrawal() called');

  try {
    const { driverId, amount, accountNumber, accountHolder } = req.body;

    // Validation
    if (!driverId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'driverId and amount are required',
      });
    }

    if (!accountNumber || !accountHolder) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'Bank account details are required',
      });
    }

    const result = await earningsService.requestWithdrawal(driverId, amount, {
      accountNumber,
      accountHolder,
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('earningsController.js ▶ requestWithdrawal() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/earnings/withdrawals/:driverId
 * Récupérer l'historique des retraits
 */
exports.getWithdrawalHistory = async (req, res) => {
  console.log('earningsController.js ▶ getWithdrawalHistory() called');

  try {
    const { driverId } = req.params;
    const { limit = 20 } = req.query;

    const result = await earningsService.getWithdrawalHistory(driverId, parseInt(limit));

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('earningsController.js ▶ getWithdrawalHistory() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/earnings/config/commissions
 * Récupérer la configuration des commissions
 */
exports.getCommissionConfig = async (req, res) => {
  console.log('earningsController.js ▶ getCommissionConfig() called');

  try {
    const config = earningsService.getCommissionConfig();

    res.json({
      success: true,
      commissions: config,
    });
  } catch (error) {
    console.error('earningsController.js ▶ getCommissionConfig() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/earnings/config/withdrawals
 * Récupérer la configuration des retraits
 */
exports.getWithdrawalConfig = async (req, res) => {
  console.log('earningsController.js ▶ getWithdrawalConfig() called');

  try {
    const config = earningsService.getWithdrawalConfig();

    res.json({
      success: true,
      withdrawalConfig: config,
    });
  } catch (error) {
    console.error('earningsController.js ▶ getWithdrawalConfig() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = exports;

// ============================================================
// 📄 paymentController.js — GoWithSally
// LOG SUMMARY:
//   • console.log('paymentController.js ▶ Module loaded')
//   • console.log('paymentController.js ▶ initiatePayment() called')
//   • console.log('paymentController.js ▶ processCMICallback() called')
// ============================================================

console.log('paymentController.js ▶ Module loaded');

const paymentService = require('../services/paymentService');
const Payment = require('../models/Payment');

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * POST /api/payments/initiate
 * Initier un paiement (CMI, cash, ou wallet)
 */
exports.initiatePayment = async (req, res) => {
  console.log('paymentController.js ▶ initiatePayment() called');

  try {
    const { rideId, passengerId, driverId, amount, method = 'cash', successUrl, errorUrl, callbackUrl } = req.body;

    // Validation
    if (!rideId || !passengerId || !driverId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'rideId, passengerId, driverId, and amount are required',
      });
    }

    if (!['cash', 'card', 'wallet'].includes(method)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_method',
        message: 'Payment method must be cash, card, or wallet',
      });
    }

    // Récupérer l'IP du client
    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await paymentService.initiatePayment(
      {
        rideId,
        passengerId,
        driverId,
        amount,
        successUrl,
        errorUrl,
        callbackUrl,
        clientIp,
        userAgent,
      },
      method
    );

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('paymentController.js ▶ initiatePayment() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/payments/cmi/callback
 * Recevoir et traiter le callback CMI
 */
exports.processCMICallback = async (req, res) => {
  console.log('paymentController.js ▶ processCMICallback() called');

  try {
    const callbackData = req.body;

    const result = await paymentService.processCMICallback(callbackData);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('paymentController.js ▶ processCMICallback() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/payments/:paymentId/complete-cash
 * Compléter un paiement en espèces
 */
exports.completeCashPayment = async (req, res) => {
  console.log('paymentController.js ▶ completeCashPayment() called');

  try {
    const { paymentId } = req.params;

    const result = await paymentService.completeCashPayment(paymentId);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('paymentController.js ▶ completeCashPayment() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/payments/:paymentId/refund
 * Demander un remboursement
 */
exports.refundPayment = async (req, res) => {
  console.log('paymentController.js ▶ refundPayment() called');

  try {
    const { paymentId } = req.params;
    const { reason } = req.body;

    const result = await paymentService.refundPayment(paymentId, reason);

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('paymentController.js ▶ refundPayment() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/payments/:paymentId
 * Récupérer les détails d'un paiement
 */
exports.getPaymentDetails = async (req, res) => {
  console.log('paymentController.js ▶ getPaymentDetails() called');

  try {
    const { paymentId } = req.params;

    const payment = await Payment.findById(paymentId)
      .populate('rideId', 'pickupLocation destination fare')
      .populate('passengerId', 'firstName lastName phone')
      .populate('driverId', 'firstName lastName phone vehicle');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'not_found',
        message: 'Payment not found',
      });
    }

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error('paymentController.js ▶ getPaymentDetails() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/payments/passenger/:passengerId/history
 * Récupérer l'historique de paiement d'un passager
 */
exports.getPassengerPaymentHistory = async (req, res) => {
  console.log('paymentController.js ▶ getPassengerPaymentHistory() called');

  try {
    const { passengerId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const result = await paymentService.getPassengerPaymentHistory(passengerId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.json(result);
  } catch (error) {
    console.error('paymentController.js ▶ getPassengerPaymentHistory() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/payments/driver/:driverId/history
 * Récupérer l'historique de paiement d'un conducteur
 */
exports.getDriverPaymentHistory = async (req, res) => {
  console.log('paymentController.js ▶ getDriverPaymentHistory() called');

  try {
    const { driverId } = req.params;
    const { limit = 20, skip = 0 } = req.query;

    const result = await paymentService.getDriverPaymentHistory(driverId, {
      limit: parseInt(limit),
      skip: parseInt(skip),
    });

    res.json(result);
  } catch (error) {
    console.error('paymentController.js ▶ getDriverPaymentHistory() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/payments/stats
 * Récupérer les statistiques de paiement
 */
exports.getPaymentStats = async (req, res) => {
  console.log('paymentController.js ▶ getPaymentStats() called');

  try {
    const { startDate, endDate, method } = req.query;

    const result = await paymentService.getPaymentStats({
      startDate,
      endDate,
      method,
    });

    res.json(result);
  } catch (error) {
    console.error('paymentController.js ▶ getPaymentStats() error:', error.message);
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

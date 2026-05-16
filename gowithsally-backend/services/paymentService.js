// ============================================================
// 📄 paymentService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('paymentService.js ▶ Module loaded')
//   • console.log('paymentService.js ▶ initiatePayment() called')
//   • console.log('paymentService.js ▶ processWalletPayment() called')
// ============================================================

console.log('paymentService.js ▶ Module loaded');

const Payment = require('../models/Payment');
const Wallet = require('../models/Wallet');
const Ride = require('../models/Ride');
const cmiService = require('./cmiService');
const pricingService = require('./pricingService');

// ============================================================
// CONFIGURATION
// ============================================================

const PAYMENT_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
  PAYMENT_TIMEOUT_MS: 30000,
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Crée un ID de transaction unique
 */
function generateTransactionId() {
  console.log('paymentService.js ▶ generateTransactionId() called');
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
}

/**
 * Attend un délai spécifié
 */
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// MAIN SERVICE
// ============================================================

const paymentService = {
  /**
   * Initie un paiement (CMI ou cash ou wallet)
   * @param {Object} rideData - Données du trajet
   * @param {string} method - Méthode de paiement ('card', 'cash', 'wallet')
   * @returns {Promise<Object>} - Résultat de l'initiation
   */
  async initiatePayment(rideData, method = 'cash') {
    console.log('paymentService.js ▶ initiatePayment() called', { method });

    try {
      const {
        rideId,
        passengerId,
        driverId,
        amount,
        successUrl,
        errorUrl,
        callbackUrl,
        clientIp,
        userAgent,
      } = rideData;

      // Validation
      if (!rideId || !passengerId || !driverId || !amount) {
        throw new Error('Missing required payment data');
      }

      // Créer le paiement en DB
      const payment = await Payment.createPayment({
        rideId,
        passengerId,
        driverId,
        amount,
        currency: 'MAD',
        method,
        status: 'pending',
        metadata: {
          ipAddress: clientIp,
          userAgent,
        },
      });

      console.log(`paymentService.js ▶ Payment created: ${payment._id}`);

      // Selon la méthode de paiement
      if (method === 'card') {
        return await this.initiateCMIPayment(payment, {
          successUrl,
          errorUrl,
          callbackUrl,
          clientIp,
          userAgent,
        });
      } else if (method === 'wallet') {
        return await this.processWalletPayment(payment);
      } else if (method === 'cash') {
        // Le paiement en espèces est marqué comme en attente d'achèvement
        return {
          success: true,
          paymentId: payment._id,
          method: 'cash',
          amount,
          currency: 'MAD',
          status: 'pending',
          message: 'Payment awaiting cash settlement at end of ride',
        };
      }
    } catch (error) {
      console.error('paymentService.js ▶ initiatePayment() error:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to initiate payment',
      };
    }
  },

  /**
   * Initialise un paiement CMI
   */
  async initiateCMIPayment(payment, options = {}) {
    console.log('paymentService.js ▶ initiateCMIPayment() called');

    try {
      await payment.markAsProcessing();

      const cmiResult = await cmiService.initiate({
        amount: payment.amount,
        orderId: payment._id.toString(),
        rideId: payment.rideId,
        passengerId: payment.passengerId,
        driverId: payment.driverId,
        successUrl: options.successUrl,
        errorUrl: options.errorUrl,
        callbackUrl: options.callbackUrl,
        clientIp: options.clientIp,
        userAgent: options.userAgent,
      });

      if (cmiResult.success) {
        // Mettre à jour les détails CMI
        payment.cmiDetails = {
          orderId: cmiResult.orderId,
          cmiTransactionId: cmiResult.cmiTransactionId,
          clientIp: options.clientIp,
          userAgent: options.userAgent,
          successUrl: options.successUrl,
          errorUrl: options.errorUrl,
          callbackUrl: options.callbackUrl,
        };
        await payment.save();

        console.log('paymentService.js ▶ CMI payment URL generated');

        return {
          success: true,
          paymentId: payment._id,
          paymentUrl: cmiResult.paymentUrl,
          orderId: cmiResult.orderId,
          method: 'card',
          amount: payment.amount,
          currency: payment.currency,
        };
      } else {
        await payment.markAsFailed(cmiResult.error);
        throw new Error(cmiResult.error);
      }
    } catch (error) {
      console.error('paymentService.js ▶ initiateCMIPayment() error:', error.message);
      await payment.markAsFailed(error.message);
      return {
        success: false,
        error: error.message,
        paymentId: payment._id,
      };
    }
  },

  /**
   * Traite un paiement par portefeuille
   */
  async processWalletPayment(payment) {
    console.log('paymentService.js ▶ processWalletPayment() called');

    try {
      await payment.markAsProcessing();

      // Récupérer le portefeuille du passager
      const wallet = await Wallet.findOne({ userId: payment.passengerId });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      if (wallet.balance < payment.amount) {
        await payment.markAsFailed('Insufficient wallet balance');
        return {
          success: false,
          error: 'Insufficient wallet balance',
          paymentId: payment._id,
          requiredAmount: payment.amount,
          availableBalance: wallet.balance,
        };
      }

      // Enregistrer les soldes précédents
      const previousBalance = wallet.balance;

      // Débiter le portefeuille
      wallet.balance -= payment.amount;
      wallet.totalSpent += payment.amount;

      // Enregistrer la transaction
      wallet.transactions.push({
        type: 'debit',
        amount: payment.amount,
        description: `Ride payment for trip ${payment.rideId}`,
        rideId: payment.rideId,
        referenceId: payment._id.toString(),
        source: 'ride',
        timestamp: new Date(),
      });

      await wallet.save();

      // Marquer le paiement comme complété
      const transactionId = generateTransactionId();
      payment.transactionId = transactionId;
      payment.walletDetails = {
        walletId: wallet._id,
        previousBalance,
        newBalance: wallet.balance,
      };
      await payment.markAsCompleted(transactionId);

      console.log('paymentService.js ▶ Wallet payment completed:', { paymentId: payment._id });

      return {
        success: true,
        paymentId: payment._id,
        transactionId,
        method: 'wallet',
        amount: payment.amount,
        currency: payment.currency,
        walletBalance: wallet.balance,
        status: 'completed',
      };
    } catch (error) {
      console.error('paymentService.js ▶ processWalletPayment() error:', error.message);
      await payment.markAsFailed(error.message);
      return {
        success: false,
        error: error.message,
        paymentId: payment._id,
      };
    }
  },

  /**
   * Traite le callback CMI
   */
  async processCMICallback(callbackData) {
    console.log('paymentService.js ▶ processCMICallback() called');

    try {
      // Vérifier la signature
      const verification = await cmiService.verifyCallback(callbackData);

      if (!verification.verified) {
        throw new Error('Invalid CMI callback signature');
      }

      // Récupérer le paiement
      const payment = await Payment.findOne({ _id: callbackData.orderId });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Mettre à jour les détails CMI
      payment.cmiDetails.cmiTransactionId = verification.transactionId;
      payment.cmiDetails.responseCode = verification.responseCode;
      payment.cmiDetails.responseMessage = verification.responseMessage;
      payment.cmiDetails.processingDate = new Date();

      if (verification.success) {
        const transactionId = generateTransactionId();
        payment.transactionId = transactionId;
        await payment.markAsCompleted(transactionId);

        console.log('paymentService.js ▶ CMI callback processed successfully');

        return {
          success: true,
          paymentId: payment._id,
          status: 'completed',
          transactionId,
        };
      } else {
        await payment.markAsFailed(verification.responseMessage);

        return {
          success: false,
          paymentId: payment._id,
          error: verification.responseMessage,
          status: 'failed',
        };
      }
    } catch (error) {
      console.error('paymentService.js ▶ processCMICallback() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Complète un paiement en espèces
   */
  async completeCashPayment(paymentId) {
    console.log('paymentService.js ▶ completeCashPayment() called');

    try {
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.method !== 'cash') {
        throw new Error('Payment method is not cash');
      }

      const transactionId = generateTransactionId();
      await payment.markAsCompleted(transactionId);

      console.log('paymentService.js ▶ Cash payment completed');

      return {
        success: true,
        paymentId: payment._id,
        transactionId,
        status: 'completed',
      };
    } catch (error) {
      console.error('paymentService.js ▶ completeCashPayment() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Effectue un remboursement
   */
  async refundPayment(paymentId, reason = 'Customer request') {
    console.log('paymentService.js ▶ refundPayment() called');

    try {
      const payment = await Payment.findById(paymentId);

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'completed') {
        throw new Error('Can only refund completed payments');
      }

      // Si c'est un paiement par portefeuille
      if (payment.method === 'wallet') {
        const wallet = await Wallet.findById(payment.walletDetails.walletId);

        if (!wallet) {
          throw new Error('Wallet not found');
        }

        wallet.balance += payment.amount;
        wallet.totalSpent -= payment.amount;

        wallet.transactions.push({
          type: 'credit',
          amount: payment.amount,
          description: `Refund for ride ${payment.rideId}`,
          rideId: payment.rideId,
          referenceId: payment._id.toString(),
          source: 'refund',
          timestamp: new Date(),
        });

        await wallet.save();
      } else if (payment.method === 'card' && payment.cmiDetails.cmiTransactionId) {
        // Demander un remboursement CMI
        const refundResult = await cmiService.refund({
          orderId: payment.cmiDetails.orderId,
          transactionId: payment.cmiDetails.cmiTransactionId,
          amount: payment.amount,
          reason,
        });

        if (!refundResult.success) {
          throw new Error(refundResult.error);
        }

        payment.refund.refundTransactionId = refundResult.refundId;
      }

      await payment.refund(reason);

      console.log('paymentService.js ▶ Payment refunded successfully');

      return {
        success: true,
        paymentId: payment._id,
        refundAmount: payment.amount,
        status: 'refunded',
      };
    } catch (error) {
      console.error('paymentService.js ▶ refundPayment() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère l'historique de paiement d'un passager
   */
  async getPassengerPaymentHistory(passengerId, options = {}) {
    console.log('paymentService.js ▶ getPassengerPaymentHistory() called');

    try {
      const { limit = 20, skip = 0 } = options;

      const payments = await Payment.getPassengerHistory(passengerId, limit);

      return {
        success: true,
        payments,
        total: payments.length,
      };
    } catch (error) {
      console.error('paymentService.js ▶ getPassengerPaymentHistory() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère l'historique de paiement d'un conducteur
   */
  async getDriverPaymentHistory(driverId, options = {}) {
    console.log('paymentService.js ▶ getDriverPaymentHistory() called');

    try {
      const { limit = 20, skip = 0 } = options;

      const payments = await Payment.getDriverHistory(driverId, limit);

      return {
        success: true,
        payments,
        total: payments.length,
      };
    } catch (error) {
      console.error('paymentService.js ▶ getDriverPaymentHistory() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère les stats de paiement
   */
  async getPaymentStats(filterOptions = {}) {
    console.log('paymentService.js ▶ getPaymentStats() called');

    try {
      const stats = await Payment.getStats(filterOptions);

      return {
        success: true,
        stats: stats[0] || {
          totalRevenue: 0,
          totalTransactions: 0,
          avgAmount: 0,
          totalCommission: 0,
          totalDriverEarnings: 0,
        },
      };
    } catch (error) {
      console.error('paymentService.js ▶ getPaymentStats() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = paymentService;

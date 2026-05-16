// ============================================================
// 📄 cmiService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('cmiService.js ▶ Module loaded')
//   • console.log('cmiService.js ▶ initiate() called')
//   • console.log('cmiService.js ▶ verifyCallback() called')
// ============================================================

console.log('cmiService.js ▶ Module loaded');

const crypto = require('crypto');
const axios = require('axios');

// ============================================================
// CMI CONFIGURATION
// ============================================================

const CMI_CONFIG = {
  MERCHANT_ID: process.env.CMI_MERCHANT_ID || 'YOUR_CMI_MERCHANT_ID',
  API_KEY: process.env.CMI_API_KEY || 'YOUR_CMI_API_KEY',
  BASE_URL: process.env.CMI_BASE_URL || 'https://payment-sandbox.maroc.cmi.ma',
  CURRENCY: 'MAD',
  LANGUAGE: 'en',
  TIMEOUT: 30000,
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Génère un hash HMAC pour la signature CMI
 */
function generateCMIHash(data, key = CMI_CONFIG.API_KEY) {
  console.log('cmiService.js ▶ generateCMIHash() called');
  return crypto
    .createHmac('sha256', key)
    .update(data)
    .digest('hex');
}

/**
 * Crée un ordre ID unique
 */
function generateOrderId() {
  console.log('cmiService.js ▶ generateOrderId() called');
  return `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formate un montant pour CMI (en centimes)
 */
function formatAmount(amount) {
  console.log('cmiService.js ▶ formatAmount() called');
  return Math.round(amount * 100);
}

// ============================================================
// MAIN SERVICE
// ============================================================

const cmiService = {
  /**
   * Initialise une transaction CMI
   * @param {Object} paymentData - Données de paiement
   * @returns {Promise<Object>} - URL de paiement et détails de la commande
   */
  async initiate(paymentData) {
    console.log('cmiService.js ▶ initiate() called');

    try {
      const {
        amount,
        orderId,
        rideId,
        passengerId,
        driverId,
        successUrl,
        errorUrl,
        callbackUrl,
        clientIp,
        userAgent,
      } = paymentData;

      // Validation basique
      if (!amount || !rideId) {
        throw new Error('Amount and rideId are required');
      }

      // Préparation des données CMI
      const cmiOrderId = orderId || generateOrderId();
      const formattedAmount = formatAmount(amount);

      // Préparation de la charge utile
      const payload = {
        merchantId: CMI_CONFIG.MERCHANT_ID,
        orderId: cmiOrderId,
        amount: formattedAmount,
        currencyCode: '504', // Code pour MAD
        language: CMI_CONFIG.LANGUAGE,
        description: `GoWithSally Ride - ${rideId}`,
        okUrl: successUrl || process.env.CMI_SUCCESS_URL,
        failUrl: errorUrl || process.env.CMI_ERROR_URL,
        shopUrl: callbackUrl || process.env.CMI_CALLBACK_URL,
        clientIp,
        reference: rideId.toString(),
      };

      // Signature des données
      const signatureData = `${payload.merchantId}${payload.orderId}${payload.amount}${payload.okUrl}`;
      const hash = generateCMIHash(signatureData);
      payload.hash = hash;

      console.log('cmiService.js ▶ Initiating CMI transaction:', { orderId: cmiOrderId, amount });

      // Appel à l'API CMI
      const response = await axios.post(
        `${CMI_CONFIG.BASE_URL}/api/v1/initiate-payment`,
        payload,
        {
          timeout: CMI_CONFIG.TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': userAgent || 'GoWithSally/1.0',
          },
        }
      );

      if (response.data.success) {
        return {
          success: true,
          paymentUrl: response.data.paymentUrl,
          orderId: cmiOrderId,
          cmiTransactionId: response.data.transactionId,
          amount,
          currency: CMI_CONFIG.CURRENCY,
          metadata: {
            rideId,
            passengerId,
            driverId,
            initiatedAt: new Date(),
          },
        };
      } else {
        throw new Error(`CMI Error: ${response.data.message}`);
      }
    } catch (error) {
      console.error('cmiService.js ▶ initiate() error:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to initiate CMI payment',
      };
    }
  },

  /**
   * Vérifie le callback CMI
   * @param {Object} callbackData - Données du callback CMI
   * @returns {Promise<Object>} - Résultat de la vérification
   */
  async verifyCallback(callbackData) {
    console.log('cmiService.js ▶ verifyCallback() called');

    try {
      const {
        orderId,
        amount,
        okUrl,
        hash,
        transactionId,
        responseCode,
        responseMessage,
      } = callbackData;

      // Validation basique
      if (!orderId || !amount || !hash) {
        throw new Error('Missing required callback data');
      }

      // Vérification de la signature
      const signatureData = `${CMI_CONFIG.MERCHANT_ID}${orderId}${amount}${okUrl}`;
      const expectedHash = generateCMIHash(signatureData);

      if (hash !== expectedHash) {
        console.error('cmiService.js ▶ verifyCallback() - Invalid signature');
        return {
          success: false,
          verified: false,
          error: 'Invalid signature',
        };
      }

      // Code de réponse CMI
      const isSuccessful = responseCode === '00' || responseCode === '000';

      console.log('cmiService.js ▶ Callback verified:', { orderId, transactionId, isSuccessful });

      return {
        success: isSuccessful,
        verified: true,
        orderId,
        transactionId,
        amount,
        responseCode,
        responseMessage,
      };
    } catch (error) {
      console.error('cmiService.js ▶ verifyCallback() error:', error.message);
      return {
        success: false,
        verified: false,
        error: error.message,
      };
    }
  },

  /**
   * Effectue une requête de remboursement
   * @param {Object} refundData - Données de remboursement
   * @returns {Promise<Object>} - Résultat du remboursement
   */
  async refund(refundData) {
    console.log('cmiService.js ▶ refund() called');

    try {
      const { orderId, transactionId, amount, reason } = refundData;

      if (!orderId || !amount) {
        throw new Error('orderId and amount are required for refund');
      }

      const refundPayload = {
        merchantId: CMI_CONFIG.MERCHANT_ID,
        orderId,
        transactionId,
        amount: formatAmount(amount),
        reason: reason || 'Customer request',
        timestamp: new Date().toISOString(),
      };

      // Signature du remboursement
      const signatureData = `${refundPayload.merchantId}${refundPayload.orderId}${refundPayload.amount}`;
      const hash = generateCMIHash(signatureData);
      refundPayload.hash = hash;

      console.log('cmiService.js ▶ Requesting refund:', { orderId, amount });

      const response = await axios.post(
        `${CMI_CONFIG.BASE_URL}/api/v1/refund`,
        refundPayload,
        {
          timeout: CMI_CONFIG.TIMEOUT,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      if (response.data.success) {
        return {
          success: true,
          refundId: response.data.refundId,
          orderId,
          amount,
          status: 'processed',
          processedAt: new Date(),
        };
      } else {
        throw new Error(`CMI Refund Error: ${response.data.message}`);
      }
    } catch (error) {
      console.error('cmiService.js ▶ refund() error:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to process refund',
      };
    }
  },

  /**
   * Récupère le statut d'une transaction
   * @param {string} orderId - Identifiant de la commande
   * @returns {Promise<Object>} - Statut de la transaction
   */
  async getTransactionStatus(orderId) {
    console.log('cmiService.js ▶ getTransactionStatus() called');

    try {
      if (!orderId) {
        throw new Error('orderId is required');
      }

      const response = await axios.get(
        `${CMI_CONFIG.BASE_URL}/api/v1/transaction-status/${orderId}`,
        {
          timeout: CMI_CONFIG.TIMEOUT,
          headers: {
            'Content-Type': 'application/json',
            'X-Merchant-ID': CMI_CONFIG.MERCHANT_ID,
          },
        }
      );

      return {
        success: true,
        orderId,
        status: response.data.status,
        transactionId: response.data.transactionId,
        amount: response.data.amount,
        responseCode: response.data.responseCode,
        processedAt: response.data.processedAt,
      };
    } catch (error) {
      console.error('cmiService.js ▶ getTransactionStatus() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère la configuration CMI
   */
  getConfig() {
    console.log('cmiService.js ▶ getConfig() called');
    return {
      merchantId: CMI_CONFIG.MERCHANT_ID,
      currency: CMI_CONFIG.CURRENCY,
      language: CMI_CONFIG.LANGUAGE,
      baseUrl: CMI_CONFIG.BASE_URL,
    };
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = cmiService;

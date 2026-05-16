// ============================================================
// 📄 infobipService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('infobipService.js ▶ Module loaded')
//   • console.log('infobipService.js ▶ sendSMS() called')
// ============================================================

console.log('infobipService.js ▶ Module loaded');

const axios = require('axios');

// ============================================================
// CONFIGURATION
// ============================================================

const INFOBIP_CONFIG = {
  API_KEY: process.env.INFOBIP_API_KEY || 'your-infobip-api-key',
  BASE_URL: process.env.INFOBIP_BASE_URL || 'https://api.infobip.com',
  SENDER_ID: process.env.INFOBIP_SENDER_ID || 'GoWithSally',
  TIMEOUT_MS: 10000,
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Formate un numéro de téléphone Marocain
 */
function formatMoroccanPhone(phone) {
  console.log('infobipService.js ▶ formatMoroccanPhone() called');

  // Supprimer les caractères non numériques
  let cleaned = phone.replace(/\D/g, '');

  // Si commence par 0, remplacer par 212
  if (cleaned.startsWith('0')) {
    cleaned = '212' + cleaned.substring(1);
  }

  // Si ne commence pas par 212, ajouter le préfixe
  if (!cleaned.startsWith('212')) {
    cleaned = '212' + cleaned;
  }

  // Ajouter le + si absent
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
}

/**
 * Valide un numéro de téléphone Marocain
 */
function isValidMoroccanPhone(phone) {
  console.log('infobipService.js ▶ isValidMoroccanPhone() called');

  // Format Marocain: +212 6XX XXX XXX ou +212 7XX XXX XXX
  const regex = /^(\+212|0)[567]\d{8}$/;
  return regex.test(phone);
}

// ============================================================
// MAIN SERVICE
// ============================================================

const infobipService = {
  /**
   * Envoie un SMS via Infobip
   */
  async sendSMS(phoneNumber, message, options = {}) {
    console.log('infobipService.js ▶ sendSMS() called');

    try {
      // Validation
      if (!phoneNumber || !message) {
        throw new Error('Phone number and message are required');
      }

      // Valider et formater le numéro
      if (!isValidMoroccanPhone(phoneNumber)) {
        return {
          success: false,
          error: 'invalid_phone',
          message: 'Invalid Moroccan phone number',
        };
      }

      const formattedPhone = formatMoroccanPhone(phoneNumber);

      // Payload Infobip
      const payload = {
        messages: [
          {
            destinations: [
              {
                to: formattedPhone,
              },
            ],
            from: INFOBIP_CONFIG.SENDER_ID,
            text: message,
            type: 'SMS',
            notifyUrl: options.notifyUrl || null,
            contentType: 'text/plain',
          },
        ],
      };

      // Requête à Infobip
      const response = await axios.post(
        `${INFOBIP_CONFIG.BASE_URL}/sms/2/text/advanced`,
        payload,
        {
          headers: {
            'Authorization': `App ${INFOBIP_CONFIG.API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: INFOBIP_CONFIG.TIMEOUT_MS,
        }
      );

      // Vérifier le résultat
      if (response.data.messages && response.data.messages.length > 0) {
        const msg = response.data.messages[0];

        if (msg.status.groupId === 1 || msg.status.groupId === 3) {
          // Succès ou message en attente de traitement
          return {
            success: true,
            messageId: msg.messageId,
            status: msg.status.description,
            phone: formattedPhone,
          };
        } else {
          return {
            success: false,
            error: 'send_failed',
            message: msg.status.description,
            statusCode: msg.status.groupId,
          };
        }
      } else {
        throw new Error('Unexpected response from Infobip');
      }
    } catch (error) {
      console.error('infobipService.js ▶ sendSMS() error:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to send SMS',
      };
    }
  },

  /**
   * Envoie un OTP
   */
  async sendOTP(phoneNumber, otpCode, options = {}) {
    console.log('infobipService.js ▶ sendOTP() called');

    const { expiryMinutes = 5, appName = 'Go With Sally' } = options;

    const message = `Votre code de vérification ${appName} est: ${otpCode}. Ce code expire dans ${expiryMinutes} minutes. Ne partagez ce code avec personne.`;

    return this.sendSMS(phoneNumber, message);
  },

  /**
   * Envoie une notification SMS
   */
  async sendNotification(phoneNumber, message, options = {}) {
    console.log('infobipService.js ▶ sendNotification() called');

    return this.sendSMS(phoneNumber, message, options);
  },

  /**
   * Envoie un SMS de confirmation de paiement
   */
  async sendPaymentConfirmation(phoneNumber, amount, orderId, options = {}) {
    console.log('infobipService.js ▶ sendPaymentConfirmation() called');

    const message = `Paiement reçu! Montant: ${amount} MAD. Référence: ${orderId}. Merci d'utiliser Go With Sally.`;

    return this.sendSMS(phoneNumber, message, options);
  },

  /**
   * Envoie un SMS de confirmation de trajet
   */
  async sendRideConfirmation(phoneNumber, rideDetails = {}, options = {}) {
    console.log('infobipService.js ▶ sendRideConfirmation() called');

    const { driverName, carNumber, pickupTime, estimatedFare } = rideDetails;

    let message = 'Votre trajet a été confirmé. ';

    if (driverName) message += `Conductrice: ${driverName}. `;
    if (carNumber) message += `Véhicule: ${carNumber}. `;
    if (pickupTime) message += `Départ: ${pickupTime}. `;
    if (estimatedFare) message += `Tarif estimé: ${estimatedFare} MAD.`;

    return this.sendSMS(phoneNumber, message, options);
  },

  /**
   * Valide le format du message
   */
  validateMessage(message) {
    console.log('infobipService.js ▶ validateMessage() called');

    // Infobip a une limite de 160 caractères par SMS (ou 306 pour les messages longs)
    return {
      isValid: message.length > 0 && message.length <= 1600,
      length: message.length,
      smsCount: Math.ceil(message.length / 160),
    };
  },

  /**
   * Formate et valide un numéro de téléphone
   */
  formatPhoneNumber(phone) {
    console.log('infobipService.js ▶ formatPhoneNumber() called');

    if (!isValidMoroccanPhone(phone)) {
      return {
        success: false,
        error: 'invalid_format',
        message: 'Invalid Moroccan phone number format',
      };
    }

    return {
      success: true,
      formatted: formatMoroccanPhone(phone),
    };
  },

  /**
   * Récupère les statistiques de SMS
   */
  async getDeliveryStatus(messageId) {
    console.log('infobipService.js ▶ getDeliveryStatus() called');

    try {
      const response = await axios.get(
        `${INFOBIP_CONFIG.BASE_URL}/sms/1/reports`,
        {
          params: {
            messageId,
          },
          headers: {
            'Authorization': `App ${INFOBIP_CONFIG.API_KEY}`,
            'Accept': 'application/json',
          },
          timeout: INFOBIP_CONFIG.TIMEOUT_MS,
        }
      );

      if (response.data.results && response.data.results.length > 0) {
        const result = response.data.results[0];

        return {
          success: true,
          messageId,
          status: result.status.description,
          sentAt: result.sentAt,
          doneAt: result.doneAt,
        };
      } else {
        return {
          success: false,
          error: 'not_found',
          message: 'Message status not found',
        };
      }
    } catch (error) {
      console.error('infobipService.js ▶ getDeliveryStatus() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère la configuration Infobip
   */
  getConfig() {
    console.log('infobipService.js ▶ getConfig() called');

    return {
      senderId: INFOBIP_CONFIG.SENDER_ID,
      baseUrl: INFOBIP_CONFIG.BASE_URL,
      timeout: INFOBIP_CONFIG.TIMEOUT_MS,
    };
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = infobipService;

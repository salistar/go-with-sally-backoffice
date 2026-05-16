// ============================================================
// 📄 otpService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('otpService.js ▶ Module loaded')
//   • console.log('otpService.js ▶ generateOTP() called')
// ============================================================

console.log('otpService.js ▶ Module loaded');

const OTP = require('../models/OTP');
const infobipService = require('./infobipService');

// ============================================================
// CONFIGURATION
// ============================================================

const OTP_CONFIG = {
  OTP_LENGTH: 6,
  TTL_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  LOCKOUT_MINUTES: 15,
  RESEND_COOLDOWN_SECONDS: 30,
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Génère un code OTP aléatoire
 */
function generateRandomOTP(length = OTP_CONFIG.OTP_LENGTH) {
  console.log('otpService.js ▶ generateRandomOTP() called');
  return Math.random()
    .toString()
    .substr(2, length)
    .padEnd(length, '0')
    .substring(0, length);
}

/**
 * Crée un ID de session unique
 */
function generateSessionId() {
  console.log('otpService.js ▶ generateSessionId() called');
  return `SESSION-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Calcule le temps d'expiration
 */
function getExpiresAt(minutesFromNow = OTP_CONFIG.TTL_MINUTES) {
  const date = new Date();
  date.setMinutes(date.getMinutes() + minutesFromNow);
  return date;
}

// ============================================================
// MAIN SERVICE
// ============================================================

const otpService = {
  /**
   * Génère et envoie un OTP
   */
  async generateAndSendOTP(phoneOrEmail, type = 'phone', options = {}) {
    console.log('otpService.js ▶ generateAndSendOTP() called');

    try {
      const { appName = 'Go With Sally', expiryMinutes = OTP_CONFIG.TTL_MINUTES } = options;

      // Validation
      if (!phoneOrEmail || !type) {
        return {
          success: false,
          error: 'missing_fields',
          message: 'Phone/Email and type are required',
        };
      }

      if (!['phone', 'email', 'password_reset'].includes(type)) {
        return {
          success: false,
          error: 'invalid_type',
          message: 'Type must be phone, email, or password_reset',
        };
      }

      // Générer le code
      const code = generateRandomOTP();
      const sessionId = generateSessionId();
      const expiresAt = getExpiresAt(expiryMinutes);

      // Créer l'enregistrement OTP
      const otpDoc = new OTP({
        code,
        type,
        sessionId,
        expiresAt,
        maxAttempts: OTP_CONFIG.MAX_ATTEMPTS,
        ...(type === 'phone' && { phone: phoneOrEmail }),
        ...(type === 'email' && { email: phoneOrEmail }),
        ...(type === 'password_reset' && { email: phoneOrEmail }),
        metadata: {
          ip: options.ip,
          userAgent: options.userAgent,
          deviceId: options.deviceId,
        },
      });

      await otpDoc.save();

      // Envoyer le code via SMS ou Email
      let sendResult = { success: true };

      if (type === 'phone') {
        // Envoyer via SMS
        sendResult = await infobipService.sendOTP(phoneOrEmail, code, {
          expiryMinutes,
          appName,
        });
      } else if (type === 'email') {
        // Note: Email devrait être implémenté avec un service email (SendGrid, etc.)
        console.log('otpService.js ▶ Email OTP would be sent to:', phoneOrEmail);
        // sendResult = await emailService.sendOTP(phoneOrEmail, code, { expiryMinutes });
      }

      if (!sendResult.success) {
        // Supprimer l'OTP s'il n'a pas pu être envoyé
        await OTP.deleteOne({ sessionId });
        return {
          success: false,
          error: 'send_failed',
          message: sendResult.error || 'Failed to send OTP',
        };
      }

      return {
        success: true,
        sessionId,
        message: `OTP sent to ${type === 'phone' ? 'phone' : 'email'}`,
        expiresIn: expiryMinutes * 60, // en secondes
        type,
      };
    } catch (error) {
      console.error('otpService.js ▶ generateAndSendOTP() error:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to generate OTP',
      };
    }
  },

  /**
   * Vérifie un OTP
   */
  async verifyOTP(sessionId, code, options = {}) {
    console.log('otpService.js ▶ verifyOTP() called');

    try {
      // Validation
      if (!sessionId || !code) {
        return {
          success: false,
          error: 'missing_fields',
          message: 'sessionId and code are required',
        };
      }

      // Récupérer l'OTP
      const otpDoc = await OTP.findOne({
        sessionId,
        used: false,
        expiresAt: { $gt: new Date() },
      });

      if (!otpDoc) {
        return {
          success: false,
          error: 'otp_not_found_or_expired',
          message: 'OTP is invalid or expired',
        };
      }

      // Vérifier les tentatives
      if (otpDoc.attempts >= otpDoc.maxAttempts) {
        return {
          success: false,
          error: 'too_many_attempts',
          message: `Maximum ${otpDoc.maxAttempts} attempts exceeded. Please request a new OTP.`,
          lockoutUntil: new Date(Date.now() + OTP_CONFIG.LOCKOUT_MINUTES * 60 * 1000),
        };
      }

      // Vérifier le code
      if (otpDoc.code !== code) {
        otpDoc.attempts += 1;
        await otpDoc.save();

        return {
          success: false,
          error: 'invalid_code',
          message: 'Invalid OTP code',
          attemptsRemaining: otpDoc.maxAttempts - otpDoc.attempts,
        };
      }

      // Marquer comme utilisé
      otpDoc.used = true;
      otpDoc.usedAt = new Date();
      await otpDoc.save();

      console.log('otpService.js ▶ OTP verified successfully');

      return {
        success: true,
        message: 'OTP verified successfully',
        phone: otpDoc.phone,
        email: otpDoc.email,
        type: otpDoc.type,
      };
    } catch (error) {
      console.error('otpService.js ▶ verifyOTP() error:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to verify OTP',
      };
    }
  },

  /**
   * Renvoit un OTP
   */
  async resendOTP(sessionId, options = {}) {
    console.log('otpService.js ▶ resendOTP() called');

    try {
      // Validation
      if (!sessionId) {
        return {
          success: false,
          error: 'missing_sessionId',
          message: 'sessionId is required',
        };
      }

      // Récupérer l'OTP existant
      const otpDoc = await OTP.findOne({ sessionId, used: false });

      if (!otpDoc) {
        return {
          success: false,
          error: 'otp_not_found',
          message: 'OTP session not found',
        };
      }

      // Vérifier le cooldown de renvoi
      const timeSinceCreated = (Date.now() - otpDoc.createdAt.getTime()) / 1000;
      if (timeSinceCreated < OTP_CONFIG.RESEND_COOLDOWN_SECONDS) {
        return {
          success: false,
          error: 'cooldown_active',
          message: `Please wait ${Math.ceil(OTP_CONFIG.RESEND_COOLDOWN_SECONDS - timeSinceCreated)} seconds before resending`,
        };
      }

      // Réinitialiser les tentatives
      otpDoc.attempts = 0;
      otpDoc.expiresAt = getExpiresAt();

      // Renvoyer le code
      const phoneOrEmail = otpDoc.phone || otpDoc.email;
      let sendResult = { success: true };

      if (otpDoc.type === 'phone') {
        sendResult = await infobipService.sendOTP(phoneOrEmail, otpDoc.code, options);
      }

      if (sendResult.success) {
        await otpDoc.save();

        return {
          success: true,
          message: 'OTP resent successfully',
          sessionId,
          expiresIn: OTP_CONFIG.TTL_MINUTES * 60,
        };
      } else {
        return {
          success: false,
          error: 'send_failed',
          message: sendResult.error,
        };
      }
    } catch (error) {
      console.error('otpService.js ▶ resendOTP() error:', error.message);
      return {
        success: false,
        error: error.message,
        message: 'Failed to resend OTP',
      };
    }
  },

  /**
   * Nettoie les OTP expirés
   */
  async cleanupExpiredOTPs() {
    console.log('otpService.js ▶ cleanupExpiredOTPs() called');

    try {
      const deletedCount = await OTP.cleanExpired();

      return {
        success: true,
        deletedCount,
        message: `Cleaned up ${deletedCount} expired OTPs`,
      };
    } catch (error) {
      console.error('otpService.js ▶ cleanupExpiredOTPs() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère la configuration OTP
   */
  getOTPConfig() {
    console.log('otpService.js ▶ getOTPConfig() called');

    return {
      otpLength: OTP_CONFIG.OTP_LENGTH,
      ttlMinutes: OTP_CONFIG.TTL_MINUTES,
      maxAttempts: OTP_CONFIG.MAX_ATTEMPTS,
      lockoutMinutes: OTP_CONFIG.LOCKOUT_MINUTES,
      resendCooldownSeconds: OTP_CONFIG.RESEND_COOLDOWN_SECONDS,
    };
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = otpService;

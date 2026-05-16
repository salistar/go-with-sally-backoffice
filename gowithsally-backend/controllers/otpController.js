// ============================================================
// 📄 otpController.js — GoWithSally
// LOG SUMMARY:
//   • console.log('otpController.js ▶ Module loaded')
//   • console.log('otpController.js ▶ generateOTP() called')
// ============================================================

console.log('otpController.js ▶ Module loaded');

const otpService = require('../services/otpService');

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * POST /api/otp/generate
 * Générer et envoyer un OTP
 */
exports.generateOTP = async (req, res) => {
  console.log('otpController.js ▶ generateOTP() called');

  try {
    const { phoneOrEmail, type = 'phone', appName } = req.body;

    // Validation
    if (!phoneOrEmail) {
      return res.status(400).json({
        success: false,
        error: 'missing_phone_or_email',
        message: 'Phone number or email is required',
      });
    }

    if (!['phone', 'email', 'password_reset'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_type',
        message: 'Type must be phone, email, or password_reset',
      });
    }

    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await otpService.generateAndSendOTP(phoneOrEmail, type, {
      ip: clientIp,
      userAgent,
      deviceId: req.body.deviceId,
      appName,
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('otpController.js ▶ generateOTP() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/otp/verify
 * Vérifier un OTP
 */
exports.verifyOTP = async (req, res) => {
  console.log('otpController.js ▶ verifyOTP() called');

  try {
    const { sessionId, code } = req.body;

    // Validation
    if (!sessionId || !code) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'sessionId and code are required',
      });
    }

    const result = await otpService.verifyOTP(sessionId, code, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(result.error === 'too_many_attempts' ? 429 : 400).json(result);
    }
  } catch (error) {
    console.error('otpController.js ▶ verifyOTP() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/otp/resend
 * Renvoyer un OTP
 */
exports.resendOTP = async (req, res) => {
  console.log('otpController.js ▶ resendOTP() called');

  try {
    const { sessionId } = req.body;

    // Validation
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'missing_sessionId',
        message: 'sessionId is required',
      });
    }

    const result = await otpService.resendOTP(sessionId, {
      appName: req.body.appName,
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(result.error === 'cooldown_active' ? 429 : 400).json(result);
    }
  } catch (error) {
    console.error('otpController.js ▶ resendOTP() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/otp/config
 * Récupérer la configuration OTP
 */
exports.getOTPConfig = async (req, res) => {
  console.log('otpController.js ▶ getOTPConfig() called');

  try {
    const config = otpService.getOTPConfig();

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('otpController.js ▶ getOTPConfig() error:', error.message);
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

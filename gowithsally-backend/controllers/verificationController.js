// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - All exported function entries

console.log('📄 verificationController.js ▶ Module loaded');

// backend/src/controllers/verificationController.js
// Contrôleur de vérification Go With Sally

const Driver = require('../models/Driver');
const OTP = require('../models/OTP');
const crypto = require('crypto');
const { sendSMS, sendWhatsApp } = require('../services/smsService');
const { sendVerificationEmail } = require('../services/emailService');
const { generateOTP, hashOTP, verifyOTPHash } = require('../utils/otpGenerator');

// ==================== CONFIGURATION ====================

const OTP_CONFIG = {
  length: 6,
  expiryMinutes: 5,
  maxAttempts: 3,
  resendCooldownSeconds: 60,
  maxResendAttempts: 5,
  lockDurationMinutes: 30
};

const EMAIL_CONFIG = {
  tokenExpiryHours: 24,
  maxResendAttempts: 5,
  resendCooldownMinutes: 5
};

const FACE_CONFIG = {
  minConfidence: 0.85,
  maxFailedAttempts: 3,
  sessionDurationHours: 24,
  lockDurationMinutes: 15
};

// ==================== OTP VERIFICATION ====================

/**
 * Envoyer OTP
 * POST /api/verification/otp/send
 */
exports.sendOTP = async (req, res) => {
  try {
    const { phone, type = 'sms' } = req.body;
    const isHybrid = req.headers['x-app-mode'] === 'hybrid';
    
    if (!phone) {
      return res.status(400).json({
        success: false,
        error: 'invalid_phone',
        message: 'Phone number is required'
      });
    }
    
    // Vérifier le rate limiting
    const existingOTP = await OTP.findOne({ phone, type: 'phone' }).sort({ createdAt: -1 });
    if (existingOTP) {
      const cooldownEnd = new Date(existingOTP.createdAt.getTime() + OTP_CONFIG.resendCooldownSeconds * 1000);
      if (cooldownEnd > new Date()) {
        return res.status(429).json({
          success: false,
          error: 'rate_limited',
          message: 'Please wait before requesting a new code'
        });
      }
    }
    
    // Générer OTP
    const code = isHybrid ? '123456' : generateOTP(OTP_CONFIG.length);
    const hashedCode = hashOTP(code);
    const expiresAt = new Date(Date.now() + OTP_CONFIG.expiryMinutes * 60 * 1000);
    const sessionId = crypto.randomBytes(16).toString('hex');
    
    // Sauvegarder OTP
    const otp = new OTP({
      phone,
      code: hashedCode,
      type: 'phone',
      sessionId,
      expiresAt,
      attempts: 0
    });
    await otp.save();
    
    // Envoyer OTP (sauf en mode hybrid)
    if (!isHybrid) {
      if (type === 'whatsapp') {
        await sendWhatsApp(phone, `Votre code Go With Sally: ${code}`);
      } else {
        await sendSMS(phone, `Votre code Go With Sally: ${code}`);
      }
    }
    
    console.log(`[OTP] Code sent to ${phone}: ${isHybrid ? code : '******'}`);
    
    res.json({
      success: true,
      sessionId,
      expiresAt: expiresAt.toISOString(),
      message: `OTP sent via ${type}`
    });
  } catch (error) {
    console.error('[OTP] Send error:', error);
    res.status(500).json({
      success: false,
      error: 'send_failed',
      message: 'Failed to send OTP'
    });
  }
};

/**
 * Vérifier OTP
 * POST /api/verification/otp/verify
 */
exports.verifyOTP = async (req, res) => {
  try {
    const { code, sessionId } = req.body;
    
    if (!code || !sessionId) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'invalid_request',
        message: 'Code and sessionId are required'
      });
    }
    
    // Trouver l'OTP
    const otp = await OTP.findOne({ sessionId, type: 'phone' });
    
    if (!otp) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'invalid_session',
        message: 'Invalid or expired session'
      });
    }
    
    // Vérifier expiration
    if (otp.expiresAt < new Date()) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'code_expired',
        message: 'OTP has expired'
      });
    }
    
    // Vérifier tentatives
    if (otp.attempts >= OTP_CONFIG.maxAttempts) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'max_attempts_reached',
        message: 'Maximum attempts reached',
        remainingAttempts: 0
      });
    }
    
    // Vérifier le code
    const isValid = verifyOTPHash(code, otp.code);
    
    if (isValid) {
      // Marquer comme utilisé
      otp.used = true;
      otp.usedAt = new Date();
      await otp.save();
      
      // Mettre à jour la vérification du driver si connecté
      if (req.user) {
        await Driver.findByIdAndUpdate(req.user._id, {
          'verification.phone.verified': true,
          'verification.phone.verifiedAt': new Date()
        });
      }
      
      res.json({
        success: true,
        verified: true,
        message: 'Phone verified successfully'
      });
    } else {
      otp.attempts += 1;
      await otp.save();
      
      res.status(400).json({
        success: false,
        verified: false,
        error: 'invalid_code',
        message: 'Invalid OTP code',
        remainingAttempts: OTP_CONFIG.maxAttempts - otp.attempts
      });
    }
  } catch (error) {
    console.error('[OTP] Verify error:', error);
    res.status(500).json({
      success: false,
      verified: false,
      error: 'verification_failed',
      message: 'Failed to verify OTP'
    });
  }
};

// ==================== EMAIL VERIFICATION ====================

/**
 * Envoyer email de vérification
 * POST /api/verification/email/send
 */
exports.sendEmailVerification = async (req, res) => {
  try {
    const { email } = req.body;
    const isHybrid = req.headers['x-app-mode'] === 'hybrid';
    
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'invalid_email',
        message: 'Email is required'
      });
    }
    
    // Générer token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + EMAIL_CONFIG.tokenExpiryHours * 60 * 60 * 1000);
    
    // Sauvegarder le token (dans OTP ou dans Driver selon le contexte)
    const verification = new OTP({
      email,
      code: tokenHash,
      type: 'email',
      sessionId: token,
      expiresAt
    });
    await verification.save();
    
    // Envoyer email (sauf en mode hybrid)
    if (!isHybrid) {
      const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
      await sendVerificationEmail(email, verificationUrl);
    }
    
    console.log(`[Email] Verification sent to ${email}`);
    
    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('[Email] Send error:', error);
    res.status(500).json({
      success: false,
      error: 'send_failed',
      message: 'Failed to send verification email'
    });
  }
};

/**
 * Vérifier token email
 * POST /api/verification/email/verify
 */
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'invalid_token',
        message: 'Token is required'
      });
    }
    
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    // Trouver le token
    const verification = await OTP.findOne({ 
      code: tokenHash, 
      type: 'email',
      used: false,
      expiresAt: { $gt: new Date() }
    });
    
    if (!verification) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'invalid_token',
        message: 'Invalid or expired token'
      });
    }
    
    // Marquer comme utilisé
    verification.used = true;
    verification.usedAt = new Date();
    await verification.save();
    
    // Mettre à jour la vérification du driver
    if (req.user) {
      await Driver.findByIdAndUpdate(req.user._id, {
        'verification.email.verified': true,
        'verification.email.verifiedAt': new Date()
      });
    }
    
    res.json({
      success: true,
      verified: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('[Email] Verify error:', error);
    res.status(500).json({
      success: false,
      verified: false,
      error: 'verification_failed',
      message: 'Failed to verify email'
    });
  }
};

// ==================== FACE VERIFICATION ====================

/**
 * Enregistrer visage
 * POST /api/verification/face/enroll
 */
exports.enrollFace = async (req, res) => {
  try {
    const { faceDescriptor, userId, deviceId } = req.body;
    const isHybrid = req.headers['x-app-mode'] === 'hybrid';
    
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'invalid_data',
        message: 'Face descriptor is required'
      });
    }
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + FACE_CONFIG.sessionDurationHours * 60 * 60 * 1000);
    
    // Sauvegarder les données faciales
    const driver = await Driver.findByIdAndUpdate(
      userId || req.user?._id,
      {
        'verification.face': {
          faceDescriptor,
          enrolledAt: new Date(),
          lastVerifiedAt: new Date(),
          deviceId,
          failedAttempts: 0,
          isLocked: false
        }
      },
      { new: true }
    );
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'user_not_found',
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      verified: true,
      confidence: 0.95,
      sessionId,
      expiresAt: expiresAt.toISOString(),
      message: 'Face enrolled successfully'
    });
  } catch (error) {
    console.error('[Face] Enroll error:', error);
    res.status(500).json({
      success: false,
      verified: false,
      error: 'enrollment_failed',
      message: 'Failed to enroll face'
    });
  }
};

/**
 * Vérifier visage
 * POST /api/verification/face/verify
 */
exports.verifyFace = async (req, res) => {
  try {
    const { faceDescriptor, deviceId } = req.body;
    const isHybrid = req.headers['x-app-mode'] === 'hybrid';
    
    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'invalid_data',
        message: 'Face descriptor is required'
      });
    }
    
    const driver = await Driver.findById(req.user?._id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        verified: false,
        error: 'user_not_found',
        message: 'User not found'
      });
    }
    
    const faceData = driver.verification?.face;
    
    if (!faceData?.faceDescriptor) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: 'face_not_enrolled',
        message: 'Face not enrolled'
      });
    }
    
    // Vérifier si verrouillé
    if (faceData.isLocked && faceData.lockUntil > new Date()) {
      return res.status(403).json({
        success: false,
        verified: false,
        error: 'account_locked',
        message: 'Account locked due to too many failed attempts'
      });
    }
    
    // En mode hybrid, toujours réussir
    let isMatch = isHybrid;
    let confidence = isHybrid ? 0.95 : 0;
    
    if (!isHybrid) {
      // Calculer la similarité (distance euclidienne simplifiée)
      const storedDescriptor = faceData.faceDescriptor;
      let distance = 0;
      for (let i = 0; i < faceDescriptor.length; i++) {
        distance += Math.pow(faceDescriptor[i] - (storedDescriptor[i] || 0), 2);
      }
      distance = Math.sqrt(distance);
      confidence = Math.max(0, 1 - distance);
      isMatch = confidence >= FACE_CONFIG.minConfidence;
    }
    
    if (isMatch) {
      const sessionId = crypto.randomBytes(16).toString('hex');
      const expiresAt = new Date(Date.now() + FACE_CONFIG.sessionDurationHours * 60 * 60 * 1000);
      
      // Reset failed attempts
      driver.verification.face.failedAttempts = 0;
      driver.verification.face.lastVerifiedAt = new Date();
      driver.verification.face.isLocked = false;
      await driver.save();
      
      res.json({
        success: true,
        verified: true,
        confidence,
        sessionId,
        expiresAt: expiresAt.toISOString(),
        message: 'Face verified successfully'
      });
    } else {
      // Increment failed attempts
      driver.verification.face.failedAttempts += 1;
      
      if (driver.verification.face.failedAttempts >= FACE_CONFIG.maxFailedAttempts) {
        driver.verification.face.isLocked = true;
        driver.verification.face.lockUntil = new Date(
          Date.now() + FACE_CONFIG.lockDurationMinutes * 60 * 1000
        );
      }
      
      await driver.save();
      
      res.status(401).json({
        success: false,
        verified: false,
        confidence,
        error: driver.verification.face.isLocked ? 'account_locked' : 'face_not_matched',
        message: driver.verification.face.isLocked 
          ? 'Account locked due to too many failed attempts'
          : 'Face verification failed'
      });
    }
  } catch (error) {
    console.error('[Face] Verify error:', error);
    res.status(500).json({
      success: false,
      verified: false,
      error: 'verification_failed',
      message: 'Failed to verify face'
    });
  }
};

/**
 * Obtenir le statut de vérification
 * GET /api/verification/status
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const driver = await Driver.findById(req.user._id);
    
    if (!driver) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      phone: {
        verified: driver.verification?.phone?.verified || false,
        verifiedAt: driver.verification?.phone?.verifiedAt
      },
      email: {
        verified: driver.verification?.email?.verified || false,
        verifiedAt: driver.verification?.email?.verifiedAt
      },
      face: {
        enrolled: Boolean(driver.verification?.face?.faceDescriptor?.length),
        lastVerifiedAt: driver.verification?.face?.lastVerifiedAt,
        isLocked: driver.verification?.face?.isLocked || false
      },
      documents: {
        status: driver.documentsStatus,
        progress: driver.getVerificationProgress()
      },
      callVerification: driver.verification?.callVerification,
      isFullyVerified: driver.isFullyVerified,
      canDrive: driver.canDrive
    });
  } catch (error) {
    console.error('[Verification] Status error:', error);
    res.status(500).json({
      success: false,
      error: 'fetch_failed',
      message: 'Failed to fetch verification status'
    });
  }
};
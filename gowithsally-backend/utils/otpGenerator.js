/**
 * GO WITH SALLY - OTP GENERATOR
 * @version 2.0.0
 * Utilitaire de génération OTP et tokens sécurisés
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - generateOTP() function entry
// - Other exported function entries

console.log('📄 otpGenerator.js ▶ Module loaded');

const crypto = require('crypto');

// ============================================================================
// CONSTANTS
// ============================================================================

const OTP_SECRET = process.env.OTP_SECRET || 'sally-otp-secret-2024';
const DEFAULT_OTP_LENGTH = 6;
const DEFAULT_OTP_EXPIRY = 5; // minutes

// ============================================================================
// OTP GENERATION
// ============================================================================

/**
 * Générer un code OTP numérique
 * @param {number} length - Longueur du code (défaut: 6)
 * @returns {string} Code OTP
 */
const generateOTP = (length = DEFAULT_OTP_LENGTH) => {
  const digits = '0123456789';
  let otp = '';

  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, digits.length);
    otp += digits[randomIndex];
  }
  
  return otp;
};

/**
 * Générer un code OTP alphanumérique (majuscules + chiffres)
 * @param {number} length - Longueur du code
 * @returns {string} Code OTP
 */
const generateAlphanumericOTP = (length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let otp = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    otp += chars[randomIndex];
  }
  
  return otp;
};

/**
 * Générer un code alphanumérique mixte (maj + min + chiffres)
 * @param {number} length - Longueur du code
 * @returns {string} Code
 */
const generateAlphanumericMixed = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = crypto.randomInt(0, chars.length);
    code += chars[randomIndex];
  }
  
  return code;
};

/**
 * Générer un OTP avec infos d'expiration
 * @param {number} length - Longueur du code
 * @param {number} expiryMinutes - Minutes avant expiration
 * @returns {Object} { code, expiresAt, sessionId }
 */
const generateOTPWithExpiry = (length = DEFAULT_OTP_LENGTH, expiryMinutes = DEFAULT_OTP_EXPIRY) => {
  const code = generateOTP(length);
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
  const sessionId = generateSessionId();
  
  return {
    code,
    expiresAt,
    sessionId,
    expiryMinutes
  };
};

// ============================================================================
// OTP HASHING & VERIFICATION
// ============================================================================

/**
 * Hasher un OTP pour stockage sécurisé
 * @param {string} otp - Code OTP
 * @returns {string} Hash du code
 */
const hashOTP = (otp) => {
  if (!otp) return null;
  return crypto
    .createHash('sha256')
    .update(otp + OTP_SECRET)
    .digest('hex');
};

/**
 * Vérifier un OTP contre son hash
 * @param {string} otp - Code OTP à vérifier
 * @param {string} hash - Hash stocké
 * @returns {boolean} Correspondance
 */
const verifyOTPHash = (otp, hash) => {
  if (!otp || !hash) return false;
  
  try {
    const otpHash = hashOTP(otp);
    return crypto.timingSafeEqual(
      Buffer.from(otpHash),
      Buffer.from(hash)
    );
  } catch (error) {
    console.error('❌ [otpGenerator] verifyOTPHash error:', error.message);
    return false;
  }
};

/**
 * Vérifier le format d'un OTP
 * @param {string} otp - OTP à vérifier
 * @param {number} expectedLength - Longueur attendue
 * @returns {boolean} Format valide
 */
const isValidOTPFormat = (otp, expectedLength = DEFAULT_OTP_LENGTH) => {
  if (!otp || typeof otp !== 'string') return false;
  if (otp.length !== expectedLength) return false;
  return /^\d+$/.test(otp);
};

/**
 * Vérifier si un OTP est expiré
 * @param {Date} expiresAt - Date d'expiration
 * @returns {boolean} Est expiré
 */
const isOTPExpired = (expiresAt) => {
  if (!expiresAt) return true;
  return new Date() > new Date(expiresAt);
};

// ============================================================================
// TOKEN GENERATION
// ============================================================================

/**
 * Générer un token sécurisé
 * @param {number} bytes - Nombre de bytes (défaut: 32)
 * @returns {string} Token en hexadécimal
 */
const generateSecureToken = (bytes = 32) => {
  return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Générer un ID de session
 * @returns {string} ID de session unique
 */
const generateSessionId = () => {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `sess_${timestamp}_${random}`;
};

/**
 * Générer un UUID v4
 * @returns {string} UUID
 */
const generateUUID = () => {
  return crypto.randomUUID();
};

// ============================================================================
// SALLY-SPECIFIC CODES
// ============================================================================

/**
 * Générer un code promo Sally
 * @param {string} prefix - Préfixe (défaut: 'SALLY')
 * @param {number} length - Longueur partie random (défaut: 6)
 * @returns {string} Code promo
 */
const generatePromoCode = (prefix = 'SALLY', length = 6) => {
  const randomPart = generateAlphanumericOTP(length);
  return `${prefix}${randomPart}`;
};

/**
 * Générer un code de course Sally
 * @returns {string} Code de course (format: SALLY-XXXX-XXXX)
 */
const generateRideCode = () => {
  const part1 = generateAlphanumericOTP(4);
  const part2 = generateAlphanumericOTP(4);
  return `SALLY-${part1}-${part2}`;
};

/**
 * Générer un code de vérification conductrice
 * @returns {string} Code de vérification (format: DRV-XXXXXX)
 */
const generateDriverVerificationCode = () => {
  const code = generateAlphanumericOTP(6);
  return `DRV-${code}`;
};

/**
 * Générer un code de référence utilisateur
 * @param {string} firstName - Prénom (optionnel)
 * @returns {string} Code de référence
 */
const generateReferralCode = (firstName = '') => {
  const prefix = firstName ? firstName.substring(0, 3).toUpperCase() : 'SAL';
  const random = generateAlphanumericOTP(5);
  return `${prefix}${random}`;
};

/**
 * Générer un numéro de transaction
 * @returns {string} Numéro de transaction (format: TXN-YYYYMMDD-XXXXXXXX)
 */
const generateTransactionNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = generateAlphanumericOTP(8);
  return `TXN-${dateStr}-${random}`;
};

/**
 * Générer un code de réclamation
 * @returns {string} Code réclamation (format: CLM-XXXXXXXX)
 */
const generateClaimCode = () => {
  const random = generateAlphanumericOTP(8);
  return `CLM-${random}`;
};

/**
 * Générer un code SOS d'urgence
 * @returns {string} Code SOS (format: SOS-XXXXXX)
 */
const generateSOSCode = () => {
  const code = generateOTP(6);
  return `SOS-${code}`;
};

// ============================================================================
// PASSWORD RESET
// ============================================================================

/**
 * Générer un token de reset de mot de passe
 * @returns {Object} { token, hashedToken, expiresAt }
 */
const generatePasswordResetToken = () => {
  const token = generateSecureToken(32);
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 heure
  
  return {
    token,
    hashedToken,
    expiresAt
  };
};

/**
 * Vérifier un token de reset
 * @param {string} token - Token à vérifier
 * @param {string} hashedToken - Token hashé stocké
 * @returns {boolean} Valide
 */
const verifyPasswordResetToken = (token, hashedToken) => {
  if (!token || !hashedToken) return false;
  
  try {
    const hash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(hash),
      Buffer.from(hashedToken)
    );
  } catch (error) {
    return false;
  }
};

// ============================================================================
// EMAIL VERIFICATION
// ============================================================================

/**
 * Générer un token de vérification email
 * @returns {Object} { token, hashedToken, expiresAt }
 */
const generateEmailVerificationToken = () => {
  const token = generateSecureToken(32);
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 heures
  
  return {
    token,
    hashedToken,
    expiresAt
  };
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // OTP Generation
  generateOTP,
  generateAlphanumericOTP,
  generateAlphanumericMixed,
  generateOTPWithExpiry,
  
  // OTP Hashing & Verification
  hashOTP,
  verifyOTPHash,
  isValidOTPFormat,
  isOTPExpired,
  
  // Token Generation
  generateSecureToken,
  generateSessionId,
  generateUUID,
  
  // Sally-Specific Codes
  generatePromoCode,
  generateRideCode,
  generateDriverVerificationCode,
  generateReferralCode,
  generateTransactionNumber,
  generateClaimCode,
  generateSOSCode,
  
  // Password Reset
  generatePasswordResetToken,
  verifyPasswordResetToken,
  
  // Email Verification
  generateEmailVerificationToken,
  
  // Constants (for external use)
  DEFAULT_OTP_LENGTH,
  DEFAULT_OTP_EXPIRY
};
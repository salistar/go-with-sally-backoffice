// backend/src/validators/verification.validator.js
// Validateurs de vérification Go With Sally

const { body, validationResult } = require('express-validator');

// Middleware pour gérer les erreurs de validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'validation_error',
      message: errors.array()[0].msg,
      errors: errors.array()
    });
  }
  next();
};

// Validation envoi OTP
exports.validateOTPSend = [
  body('phone')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(\+212|0)([5-7]\d{8})$/)
    .withMessage('Invalid Moroccan phone number'),
  body('type')
    .optional()
    .isIn(['sms', 'whatsapp', 'call'])
    .withMessage('Invalid send type'),
  handleValidationErrors
];

// Validation vérification OTP
exports.validateOTPVerify = [
  body('code')
    .notEmpty()
    .withMessage('OTP code is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  body('sessionId')
    .notEmpty()
    .withMessage('Session ID is required'),
  handleValidationErrors
];

// Validation email
exports.validateEmail = [
  body('email')
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),
  handleValidationErrors
];

// Validation token email
exports.validateEmailToken = [
  body('token')
    .notEmpty()
    .withMessage('Token is required')
    .isLength({ min: 64, max: 64 })
    .withMessage('Invalid token format'),
  handleValidationErrors
];

// Validation face descriptor
exports.validateFaceDescriptor = [
  body('faceDescriptor')
    .notEmpty()
    .withMessage('Face descriptor is required')
    .isArray({ min: 128, max: 512 })
    .withMessage('Invalid face descriptor format'),
  body('deviceId')
    .optional()
    .isString()
    .withMessage('Device ID must be a string'),
  handleValidationErrors
];
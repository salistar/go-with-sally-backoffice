// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - protect() middleware entry
// - authorize() middleware entry

console.log('📄 auth.middleware.js ▶ Module loaded');

// backend/src/middleware/auth.middleware.js
// Middleware d'authentification Go With Sally

const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

/**
 * Protéger les routes - nécessite authentification
 */
exports.protect = async (req, res, next) => {
  console.log('📄 auth.middleware.js ▶ protect() called');
  try {
    let token;
    
    // Récupérer le token du header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Vérifier si le token existe
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'not_authorized',
        message: 'Not authorized to access this route'
      });
    }
    
    try {
      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sally-jwt-secret');
      
      // Récupérer l'utilisateur
      const driver = await Driver.findById(decoded.id);
      
      if (!driver) {
        return res.status(401).json({
          success: false,
          error: 'user_not_found',
          message: 'User not found'
        });
      }
      
      // Vérifier si le compte est actif
      if (driver.status === 'deactivated') {
        return res.status(401).json({
          success: false,
          error: 'account_deactivated',
          message: 'Account has been deactivated'
        });
      }
      
      // Ajouter l'utilisateur à la requête
      req.user = driver;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'token_expired',
          message: 'Token has expired'
        });
      }
      
      return res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Invalid token'
      });
    }
  } catch (error) {
    console.error('[Auth] Middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Authentication failed'
    });
  }
};

/**
 * Auth optionnelle - charge l'utilisateur si token présent
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'sally-jwt-secret');
        const driver = await Driver.findById(decoded.id);
        
        if (driver && driver.status !== 'deactivated') {
          req.user = driver;
        }
      } catch (err) {
        // Ignorer les erreurs de token en mode optionnel
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

/**
 * Vérifier que le profil est complet
 */
exports.requireCompleteProfile = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'not_authorized',
      message: 'Not authorized'
    });
  }
  
  // Vérifier les champs obligatoires
  if (!req.user.firstName || !req.user.lastName || !req.user.phone) {
    return res.status(403).json({
      success: false,
      error: 'incomplete_profile',
      message: 'Please complete your profile first'
    });
  }
  
  next();
};

/**
 * Vérifier que la conductrice est vérifiée
 */
exports.requireVerified = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'not_authorized',
      message: 'Not authorized'
    });
  }
  
  if (!req.user.isFullyVerified) {
    return res.status(403).json({
      success: false,
      error: 'not_verified',
      message: 'Please complete verification first',
      verification: {
        phone: req.user.verification?.phone?.verified || false,
        email: req.user.verification?.email?.verified || false,
        face: Boolean(req.user.verification?.face?.faceDescriptor?.length),
        documents: req.user.documentsStatus
      }
    });
  }
  
  next();
};

/**
 * Vérifier que la conductrice peut conduire
 */
exports.requireCanDrive = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'not_authorized',
      message: 'Not authorized'
    });
  }
  
  if (!req.user.canDrive) {
    return res.status(403).json({
      success: false,
      error: 'cannot_drive',
      message: 'You are not authorized to drive yet',
      status: req.user.status,
      isVerified: req.user.isFullyVerified
    });
  }
  
  next();
};

/**
 * Vérifier que l'utilisateur est une conductrice
 */
exports.isDriver = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'not_authorized',
      message: 'Not authorized'
    });
  }
  
  if (req.user.role !== 'driver') {
    return res.status(403).json({
      success: false,
      error: 'driver_required',
      message: 'Access reserved for drivers'
    });
  }
  
  next();
};

/**
 * Vérifier que l'utilisateur est admin
 */
exports.isAdmin = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'not_authorized',
      message: 'Not authorized'
    });
  }
  
  if (req.user.role !== 'admin' && req.user.role !== 'support') {
    return res.status(403).json({
      success: false,
      error: 'admin_required',
      message: 'Access reserved for administrators'
    });
  }
  
  next();
};

/**
 * Générer un JWT
 */
exports.generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'sally-jwt-secret',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * Générer un refresh token
 */
exports.generateRefreshToken = (userId) => {
  return jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || 'sally-refresh-secret',
    { expiresIn: '90d' }
  );
};

// ============================================================================
// ALIAS POUR COMPATIBILITÉ AVEC DIFFÉRENTES CONVENTIONS
// ============================================================================

exports.authenticate = exports.protect;
exports.verifyToken = exports.protect;
exports.verifyDriver = exports.isDriver;
exports.verifyAdmin = exports.isAdmin;
exports.admin = exports.isAdmin;

console.log('📄 [auth.middleware.js] ✅ Middleware chargé');
/**
 * ============================================================================
 * GO WITH SALLY - AUTHENTICATION MIDDLEWARE
 * ============================================================================
 * Middleware d'authentification et d'autorisation
 * Gère la vérification des tokens JWT, les rôles et les permissions
 * ============================================================================
 */

console.log('📄 [auth.js] Fichier chargé');

const jwt = require('jsonwebtoken');
const config = require('../config');
const { User, Driver } = require('../models');
const { get: redisGet } = require('../config/database');
const logger = require('../utils/logger');

console.log('📄 [auth.js] Dépendances importées');

// ============================================================================
// VERIFY TOKEN - Vérification du token JWT
// ============================================================================

/**
 * Vérifie le token JWT et attache l'utilisatrice à la requête
 * @middleware
 * @param {Request} req - Requête Express
 * @param {Response} res - Réponse Express
 * @param {NextFunction} next - Fonction suivante
 */
exports.verifyToken = async (req, res, next) => {
  console.log('📄 [auth.js] ▶ verifyToken() appelé');
  console.log('📄 [auth.js] URL:', req.method, req.originalUrl);
  
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Extraire le token du header Authorization
    // ─────────────────────────────────────────────────────────────────────────
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('📄 [auth.js] ❌ Header Authorization manquant');
      return res.status(401).json({ 
        success: false, 
        message: 'Token d\'authentification requis',
        code: 'TOKEN_REQUIRED'
      });
    }
    
    if (!authHeader.startsWith('Bearer ')) {
      console.log('📄 [auth.js] ❌ Format du header incorrect');
      return res.status(401).json({ 
        success: false, 
        message: 'Format du token invalide. Utilisez: Bearer <token>',
        code: 'INVALID_TOKEN_FORMAT'
      });
    }
    
    const token = authHeader.split(' ')[1];
    console.log('📄 [auth.js] Token extrait:', token.substring(0, 20) + '...');
    
    // ─────────────────────────────────────────────────────────────────────────
    // Vérifier si le token est dans la blacklist (déconnexion)
    // ─────────────────────────────────────────────────────────────────────────
    
    try {
      console.log('📄 [auth.js] Vérification blacklist...');
      const isBlacklisted = await redisGet(`blacklist:${token}`);
      
      if (isBlacklisted) {
        console.log('📄 [auth.js] ❌ Token blacklisté');
        return res.status(401).json({ 
          success: false, 
          message: 'Session expirée. Veuillez vous reconnecter.',
          code: 'TOKEN_BLACKLISTED'
        });
      }
      console.log('📄 [auth.js] ✓ Token non blacklisté');
      
    } catch (redisError) {
      // Redis peut ne pas être disponible, on continue sans vérification
      console.log('📄 [auth.js] ⚠ Redis indisponible, skip blacklist check');
      logger.warn(`[AUTH] Redis blacklist check failed: ${redisError.message}`);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Vérifier et décoder le token JWT
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [auth.js] Vérification JWT...');
    
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
      console.log('📄 [auth.js] ✓ JWT valide, userId:', decoded.id);
    } catch (jwtError) {
      console.log('📄 [auth.js] ❌ JWT invalide:', jwtError.name);
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Votre session a expiré. Veuillez vous reconnecter.',
          code: 'TOKEN_EXPIRED',
          expiredAt: jwtError.expiredAt
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({ 
          success: false, 
          message: 'Token invalide',
          code: 'INVALID_TOKEN'
        });
      }
      
      throw jwtError;
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Récupérer l'utilisatrice
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [auth.js] Recherche utilisatrice...');
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log('📄 [auth.js] ❌ Utilisatrice non trouvée');
      return res.status(401).json({ 
        success: false, 
        message: 'Utilisateur non trouvé',
        code: 'USER_NOT_FOUND'
      });
    }
    
    console.log('📄 [auth.js] ✓ Utilisatrice trouvée:', user.email);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Vérifier le statut du compte
    // ─────────────────────────────────────────────────────────────────────────
    
    if (!user.isActive) {
      console.log('📄 [auth.js] ❌ Compte désactivé');
      return res.status(403).json({ 
        success: false, 
        message: 'Votre compte a été désactivé. Contactez le support.',
        code: 'ACCOUNT_DISABLED'
      });
    }
    
    if (user.isBanned) {
      console.log('📄 [auth.js] ❌ Compte banni, raison:', user.banReason);
      return res.status(403).json({ 
        success: false, 
        message: 'Votre compte a été suspendu.',
        reason: user.banReason,
        code: 'ACCOUNT_BANNED'
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Attacher l'utilisatrice à la requête
    // ─────────────────────────────────────────────────────────────────────────
    
    req.user = user;
    req.token = token;
    
    console.log('📄 [auth.js] ✓ User attaché à req, rôle:', user.role);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Charger le profil conductrice si applicable
    // ─────────────────────────────────────────────────────────────────────────
    
    if (user.role === 'driver') {
      console.log('📄 [auth.js] Chargement profil conductrice...');
      
      const driver = await Driver.findOne({ user: user._id });
      
      if (driver) {
        req.driver = driver;
        console.log('📄 [auth.js] ✓ Driver attaché, status:', driver.status);
      } else {
        console.log('📄 [auth.js] ⚠ Profil conductrice non trouvé');
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Continuer vers le prochain middleware/route
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [auth.js] ✓ Authentification réussie');
    next();
    
  } catch (error) {
    console.log('📄 [auth.js] ❌ Erreur verifyToken:', error.message);
    logger.error(`[AUTH] verifyToken error: ${error.message}`);
    
    return res.status(500).json({ 
      success: false, 
      message: 'Erreur d\'authentification',
      code: 'AUTH_ERROR'
    });
  }
};

// ============================================================================
// VERIFY DRIVER - Vérification du statut conductrice
// ============================================================================

/**
 * Vérifie que l'utilisatrice est une conductrice approuvée
 * Doit être utilisé APRÈS verifyToken
 * @middleware
 */
exports.verifyDriver = async (req, res, next) => {
  console.log('📄 [auth.js] ▶ verifyDriver() appelé');
  
  // Vérifier que le profil conductrice existe
  if (!req.driver) {
    console.log('📄 [auth.js] ❌ Pas de profil conductrice');
    return res.status(403).json({ 
      success: false, 
      message: 'Accès réservé aux conductrices',
      code: 'DRIVER_REQUIRED'
    });
  }
  
  // Vérifier que la conductrice est approuvée
  if (req.driver.status !== 'approved') {
    console.log('📄 [auth.js] ❌ Conductrice non approuvée, status:', req.driver.status);
    
    // Messages spécifiques selon le statut
    const statusMessages = {
      'pending_documents': 'Veuillez soumettre vos documents pour validation.',
      'pending_verification': 'Vos documents sont en cours de vérification.',
      'under_review': 'Votre dossier est en cours d\'examen.',
      'suspended': 'Votre compte conductrice a été suspendu.',
      'rejected': 'Votre demande de conductrice a été refusée.'
    };
    
    return res.status(403).json({ 
      success: false, 
      message: statusMessages[req.driver.status] || 'Compte conductrice non approuvé',
      status: req.driver.status,
      statusReason: req.driver.statusReason,
      code: 'DRIVER_NOT_APPROVED'
    });
  }
  
  console.log('📄 [auth.js] ✓ Conductrice approuvée');
  next();
};

// ============================================================================
// VERIFY DRIVER ONLINE - Vérification conductrice en ligne
// ============================================================================

/**
 * Vérifie que la conductrice est en ligne et disponible
 * Doit être utilisé APRÈS verifyDriver
 * @middleware
 */
exports.verifyDriverOnline = async (req, res, next) => {
  console.log('📄 [auth.js] ▶ verifyDriverOnline() appelé');
  
  if (!req.driver.isOnline) {
    console.log('📄 [auth.js] ❌ Conductrice hors ligne');
    return res.status(403).json({ 
      success: false, 
      message: 'Vous devez être en ligne pour effectuer cette action',
      code: 'DRIVER_OFFLINE'
    });
  }
  
  console.log('📄 [auth.js] ✓ Conductrice en ligne');
  next();
};

// ============================================================================
// VERIFY ADMIN - Vérification du rôle administrateur
// ============================================================================

/**
 * Vérifie que l'utilisatrice est une administratrice
 * Doit être utilisé APRÈS verifyToken
 * @middleware
 */
exports.verifyAdmin = async (req, res, next) => {
  console.log('📄 [auth.js] ▶ verifyAdmin() appelé');
  console.log('📄 [auth.js] Rôle utilisatrice:', req.user.role);
  
  if (req.user.role !== 'admin') {
    console.log('📄 [auth.js] ❌ Non admin');
    return res.status(403).json({ 
      success: false, 
      message: 'Accès réservé aux administrateurs',
      code: 'ADMIN_REQUIRED'
    });
  }
  
  console.log('📄 [auth.js] ✓ Admin vérifié');
  next();
};

// ============================================================================
// REQUIRE PHONE VERIFICATION - Vérification téléphone requise
// ============================================================================

/**
 * Vérifie que le téléphone est vérifié
 * Doit être utilisé APRÈS verifyToken
 * @middleware
 */
exports.requirePhoneVerification = async (req, res, next) => {
  console.log('📄 [auth.js] ▶ requirePhoneVerification() appelé');
  console.log('📄 [auth.js] phoneVerified:', req.user.phoneVerified);
  
  if (!req.user.phoneVerified) {
    console.log('📄 [auth.js] ❌ Téléphone non vérifié');
    return res.status(403).json({ 
      success: false, 
      message: 'Veuillez vérifier votre numéro de téléphone pour continuer',
      code: 'PHONE_VERIFICATION_REQUIRED',
      verificationStep: 'phone'
    });
  }
  
  console.log('📄 [auth.js] ✓ Téléphone vérifié');
  next();
};

// ============================================================================
// REQUIRE FACE VERIFICATION - Vérification faciale requise
// ============================================================================

/**
 * Vérifie que la reconnaissance faciale est complétée
 * Doit être utilisé APRÈS verifyToken
 * @middleware
 */
exports.requireFaceVerification = async (req, res, next) => {
  console.log('📄 [auth.js] ▶ requireFaceVerification() appelé');
  console.log('📄 [auth.js] faceVerified:', req.user.faceVerified);
  
  if (!req.user.faceVerified) {
    console.log('📄 [auth.js] ❌ Visage non vérifié');
    return res.status(403).json({ 
      success: false, 
      message: 'Veuillez compléter la vérification faciale pour continuer',
      code: 'FACE_VERIFICATION_REQUIRED',
      verificationStep: 'face'
    });
  }
  
  console.log('📄 [auth.js] ✓ Visage vérifié');
  next();
};

// ============================================================================
// REQUIRE FULL VERIFICATION - Vérification complète requise
// ============================================================================

/**
 * Vérifie que le téléphone ET le visage sont vérifiés
 * Doit être utilisé APRÈS verifyToken
 * @middleware
 */
exports.requireFullVerification = async (req, res, next) => {
  console.log('📄 [auth.js] ▶ requireFullVerification() appelé');
  console.log('📄 [auth.js] phoneVerified:', req.user.phoneVerified, '- faceVerified:', req.user.faceVerified);
  
  // Vérifier le téléphone d'abord
  if (!req.user.phoneVerified) {
    console.log('📄 [auth.js] ❌ Téléphone non vérifié');
    return res.status(403).json({ 
      success: false, 
      message: 'Veuillez vérifier votre numéro de téléphone',
      code: 'PHONE_VERIFICATION_REQUIRED',
      verificationStep: 'phone'
    });
  }
  
  // Puis le visage
  if (!req.user.faceVerified) {
    console.log('📄 [auth.js] ❌ Visage non vérifié');
    return res.status(403).json({ 
      success: false, 
      message: 'Veuillez compléter la vérification faciale',
      code: 'FACE_VERIFICATION_REQUIRED',
      verificationStep: 'face'
    });
  }
  
  console.log('📄 [auth.js] ✓ Vérification complète');
  next();
};

// ============================================================================
// OPTIONAL AUTH - Authentification optionnelle
// ============================================================================

/**
 * Tente d'authentifier l'utilisatrice sans bloquer si pas de token
 * Utile pour les routes publiques qui peuvent bénéficier du contexte utilisateur
 * @middleware
 */
exports.optionalAuth = async (req, res, next) => {
  console.log('📄 [auth.js] ▶ optionalAuth() appelé');
  
  try {
    const authHeader = req.headers.authorization;
    
    // Si pas de header, continuer sans authentification
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('📄 [auth.js] Pas de token, mode anonyme');
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    // Vérifier le token
    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.id);
    
    if (user && user.isActive && !user.isBanned) {
      req.user = user;
      req.token = token;
      
      console.log('📄 [auth.js] ✓ Utilisatrice authentifiée (optionnel):', user.email);
      
      // Charger le profil conductrice si applicable
      if (user.role === 'driver') {
        const driver = await Driver.findOne({ user: user._id });
        if (driver) {
          req.driver = driver;
        }
      }
    } else {
      console.log('📄 [auth.js] ⚠ Token valide mais utilisatrice inactive/bannie');
    }
    
  } catch (error) {
    // Ignorer les erreurs pour l'auth optionnelle
    console.log('📄 [auth.js] ⚠ Auth optionnelle échouée (ignorée):', error.message);
  }
  
  next();
};

// ============================================================================
// AUTHENTICATE SOCKET - Authentification Socket.IO
// ============================================================================

/**
 * Middleware d'authentification pour les connexions Socket.IO
 * @param {Socket} socket - Socket.IO socket
 * @param {Function} next - Fonction suivante
 */
exports.authenticateSocket = async (socket, next) => {
  console.log('📄 [auth.js] ▶ authenticateSocket() appelé');
  console.log('📄 [auth.js] Socket ID:', socket.id);
  
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Extraire le token
    // ─────────────────────────────────────────────────────────────────────────
    
    // Le token peut être dans auth.token ou dans le header Authorization
    const token = socket.handshake.auth?.token?.replace('Bearer ', '') ||
                  socket.handshake.headers?.authorization?.replace('Bearer ', '');
    
    if (!token) {
      console.log('📄 [auth.js] ❌ Socket: Token manquant');
      return next(new Error('Token d\'authentification requis'));
    }
    
    console.log('📄 [auth.js] Socket token:', token.substring(0, 20) + '...');
    
    // ─────────────────────────────────────────────────────────────────────────
    // Vérifier le token
    // ─────────────────────────────────────────────────────────────────────────
    
    const decoded = jwt.verify(token, config.JWT_SECRET);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Récupérer l'utilisatrice
    // ─────────────────────────────────────────────────────────────────────────
    
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log('📄 [auth.js] ❌ Socket: Utilisatrice non trouvée');
      return next(new Error('Utilisateur non trouvé'));
    }
    
    if (!user.isActive) {
      console.log('📄 [auth.js] ❌ Socket: Compte désactivé');
      return next(new Error('Compte désactivé'));
    }
    
    if (user.isBanned) {
      console.log('📄 [auth.js] ❌ Socket: Compte banni');
      return next(new Error('Compte suspendu'));
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Attacher l'utilisatrice au socket
    // ─────────────────────────────────────────────────────────────────────────
    
    socket.user = user;
    socket.userId = user._id.toString();
    
    console.log('📄 [auth.js] ✓ Socket authentifié pour:', user.email);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Charger le profil conductrice si applicable
    // ─────────────────────────────────────────────────────────────────────────
    
    if (user.role === 'driver') {
      const driver = await Driver.findOne({ user: user._id });
      
      if (driver) {
        socket.driver = driver;
        socket.driverId = driver._id.toString();
        console.log('📄 [auth.js] ✓ Socket driver:', driver._id);
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Continuer
    // ─────────────────────────────────────────────────────────────────────────
    
    next();
    
  } catch (error) {
    console.log('📄 [auth.js] ❌ Socket auth error:', error.message);
    logger.error(`[AUTH] Socket auth error: ${error.message}`);
    
    if (error.name === 'TokenExpiredError') {
      return next(new Error('Session expirée'));
    }
    
    return next(new Error('Token invalide'));
  }
};

// ============================================================================
// CHECK OWNERSHIP - Vérifier la propriété d'une ressource
// ============================================================================

/**
 * Factory pour créer un middleware de vérification de propriété
 * @param {Function} getResourceOwnerId - Fonction qui extrait l'ID du propriétaire de la ressource
 * @returns {Function} - Middleware Express
 */
exports.checkOwnership = (getResourceOwnerId) => {
  return async (req, res, next) => {
    console.log('📄 [auth.js] ▶ checkOwnership() appelé');
    
    try {
      const ownerId = await getResourceOwnerId(req);
      
      if (!ownerId) {
        console.log('📄 [auth.js] ❌ Ressource non trouvée');
        return res.status(404).json({
          success: false,
          message: 'Ressource non trouvée',
          code: 'RESOURCE_NOT_FOUND'
        });
      }
      
      const isOwner = ownerId.toString() === req.user._id.toString();
      const isAdmin = req.user.role === 'admin';
      
      if (!isOwner && !isAdmin) {
        console.log('📄 [auth.js] ❌ Pas propriétaire');
        return res.status(403).json({
          success: false,
          message: 'Vous n\'êtes pas autorisé à accéder à cette ressource',
          code: 'NOT_OWNER'
        });
      }
      
      console.log('📄 [auth.js] ✓ Propriété vérifiée');
      next();
      
    } catch (error) {
      console.log('📄 [auth.js] ❌ Erreur checkOwnership:', error.message);
      return res.status(500).json({
        success: false,
        message: 'Erreur de vérification',
        code: 'OWNERSHIP_CHECK_ERROR'
      });
    }
  };
};

// ============================================================================
// RATE LIMITER - Limitation du nombre de requêtes
// ============================================================================

/**
 * Crée un middleware de limitation de requêtes basé sur l'IP ou l'utilisateur
 * @param {Object} options - Options de configuration
 * @param {number} options.maxRequests - Nombre max de requêtes
 * @param {number} options.windowMs - Fenêtre de temps en ms
 * @param {string} options.message - Message d'erreur
 * @returns {Function} - Middleware Express
 */
exports.createRateLimiter = (options = {}) => {
  const {
    maxRequests = 100,
    windowMs = 60000, // 1 minute
    message = 'Trop de requêtes. Veuillez réessayer plus tard.'
  } = options;
  
  // Store simple en mémoire (utiliser Redis en production)
  const requestCounts = new Map();
  
  return async (req, res, next) => {
    console.log('📄 [auth.js] ▶ rateLimiter() appelé');
    
    // Identifier par userId si authentifié, sinon par IP
    const identifier = req.user?._id?.toString() || req.ip;
    const now = Date.now();
    
    // Nettoyer les anciennes entrées
    const userRequests = requestCounts.get(identifier) || [];
    const recentRequests = userRequests.filter(time => now - time < windowMs);
    
    if (recentRequests.length >= maxRequests) {
      console.log('📄 [auth.js] ❌ Rate limit atteint pour:', identifier);
      return res.status(429).json({
        success: false,
        message,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((recentRequests[0] + windowMs - now) / 1000)
      });
    }
    
    // Ajouter la requête actuelle
    recentRequests.push(now);
    requestCounts.set(identifier, recentRequests);
    
    console.log('📄 [auth.js] ✓ Rate limit OK:', recentRequests.length, '/', maxRequests);
    next();
  };
};

// ============================================================================
// ALIAS POUR COMPATIBILITÉ
// ============================================================================

/**
 * Alias pour verifyToken (compatibilité avec d'autres conventions)
 */
exports.protect = exports.verifyToken;

/**
 * Alias pour verifyAdmin (compatibilité avec d'autres conventions)
 */
exports.admin = exports.verifyAdmin;

console.log('📄 [auth.js] ✅ Middleware exporté');
console.log('📄 [auth.js] Fonctions: verifyToken, verifyDriver, verifyDriverOnline, verifyAdmin');
console.log('📄 [auth.js] Fonctions: requirePhoneVerification, requireFaceVerification, requireFullVerification');
console.log('📄 [auth.js] Fonctions: optionalAuth, authenticateSocket, checkOwnership, createRateLimiter');

// ============================================================================
// ALIAS POUR COMPATIBILITÉ
// ============================================================================

/**
 * Alias pour verifyToken (compatibilité avec d'autres conventions)
 */
exports.protect = exports.verifyToken;

/**
 * Alias pour verifyAdmin (compatibilité avec d'autres conventions)
 */
exports.admin = exports.verifyAdmin;

console.log('📄 [auth.js] Alias: protect (verifyToken), admin (verifyAdmin)');console.log('📄 [auth.js] Alias: protect (verifyToken), admin (verifyAdmin)');
/**
 * ============================================================================
 * GO WITH SALLY - AUTHENTICATION ROUTES
 * ============================================================================
 * Routes d'authentification de l'application
 * Gère l'inscription, la connexion, la vérification et la récupération
 * 
 * Base URL: /api/auth
 * ============================================================================
 */

console.log('📄 [routes/auth.js] Fichier chargé');

const express = require('express');
const router = express.Router();

console.log('📄 [routes/auth.js] Express Router initialisé');

// ============================================================================
// IMPORTS
// ============================================================================

const authController = require('../controllers/authController');
const { 
  verifyToken, 
  optionalAuth,
  createRateLimiter 
} = require('../middleware/auth');

console.log('📄 [routes/auth.js] Contrôleurs et middleware importés');

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * Rate limiter pour les routes sensibles (login, register)
 * 5 tentatives par minute par IP
 */
const authRateLimiter = createRateLimiter({
  maxRequests: 5,
  windowMs: 60000, // 1 minute
  message: 'Trop de tentatives. Veuillez réessayer dans une minute.'
});

/**
 * Rate limiter pour les codes de vérification
 * 3 demandes par 5 minutes
 */
const codeRateLimiter = createRateLimiter({
  maxRequests: 3,
  windowMs: 300000, // 5 minutes
  message: 'Trop de demandes de code. Veuillez patienter 5 minutes.'
});

console.log('📄 [routes/auth.js] Rate limiters configurés');

// ============================================================================
// ROUTES PUBLIQUES (Sans authentification)
// ============================================================================

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'une nouvelle utilisatrice
 * @access  Public
 * @body    {
 *            firstName: string,
 *            lastName: string,
 *            email: string,
 *            phone: string,
 *            password: string,
 *            dateOfBirth: string (YYYY-MM-DD),
 *            referralCode?: string,
 *            role?: 'user' | 'driver'
 *          }
 * @returns {
 *            success: boolean,
 *            data: { user, token, refreshToken, verificationStep }
 *          }
 */
router.post('/register', 
  authRateLimiter,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /register');
    next();
  },
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion d'une utilisatrice
 * @access  Public
 * @body    { email: string, password: string }
 * @returns { success, data: { user, token, refreshToken, verificationStep } }
 */
router.post('/login',
  authRateLimiter,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /login');
    next();
  },
  authController.login
);

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Demande de réinitialisation du mot de passe
 * @access  Public
 * @body    { email: string }
 * @returns { success, message }
 */
router.post('/forgot-password',
  authRateLimiter,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /forgot-password');
    next();
  },
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Réinitialiser le mot de passe avec token
 * @access  Public
 * @body    { token: string, password: string }
 * @returns { success, message }
 */
router.post('/reset-password',
  authRateLimiter,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /reset-password');
    next();
  },
  authController.resetPassword
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Rafraîchir le token d'accès
 * @access  Public (avec refresh token valide)
 * @body    { refreshToken: string }
 * @returns { success, data: { token, refreshToken } }
 */
router.post('/refresh-token',
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /refresh-token');
    next();
  },
  authController.refreshToken
);

console.log('📄 [routes/auth.js] Routes publiques configurées');

// ============================================================================
// ROUTES PROTÉGÉES (Authentification requise)
// ============================================================================

/**
 * @route   GET /api/auth/me
 * @desc    Obtenir le profil de l'utilisatrice connectée
 * @access  Private (Token requis)
 * @returns { success, data: { user, driver? } }
 */
router.get('/me',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] GET /me - User:', req.user?.email);
    next();
  },
  authController.getMe
);

/**
 * @route   PUT /api/auth/me
 * @desc    Mettre à jour le profil
 * @access  Private (Token requis)
 * @body    { firstName?, lastName?, avatar?, preferredLanguage?, notifications? }
 * @returns { success, data: { user } }
 */
router.put('/me',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] PUT /me - User:', req.user?.email);
    next();
  },
  authController.updateMe
);

/**
 * @route   POST /api/auth/verify-phone
 * @desc    Vérifier le code SMS
 * @access  Private (Token requis)
 * @body    { code: string }
 * @returns { success, data: { phoneVerified, nextStep } }
 */
router.post('/verify-phone',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /verify-phone - User:', req.user?.email);
    next();
  },
  authController.verifyPhone
);

/**
 * @route   POST /api/auth/resend-phone-code
 * @desc    Renvoyer le code de vérification SMS
 * @access  Private (Token requis)
 * @returns { success, message, data: { phone, expiresIn } }
 */
router.post('/resend-phone-code',
  verifyToken,
  codeRateLimiter,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /resend-phone-code - User:', req.user?.email);
    next();
  },
  authController.resendPhoneCode
);

/**
 * @route   POST /api/auth/verify-face
 * @desc    Vérification ou enregistrement facial
 * @access  Private (Token requis)
 * @body    { faceImage: string (base64) }
 * @returns { success, data: { faceId?, faceVerified } }
 */
router.post('/verify-face',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /verify-face - User:', req.user?.email);
    next();
  },
  authController.verifyFace
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Changer le mot de passe (utilisatrice connectée)
 * @access  Private (Token requis)
 * @body    { currentPassword: string, newPassword: string }
 * @returns { success, message }
 */
router.post('/change-password',
  verifyToken,
  authRateLimiter,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /change-password - User:', req.user?.email);
    next();
  },
  authController.changePassword
);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion (blacklist le token)
 * @access  Private (Token requis)
 * @returns { success, message }
 */
router.post('/logout',
  verifyToken,
  (req, res, next) => {
    console.log('📄 [routes/auth.js] POST /logout - User:', req.user?.email);
    next();
  },
  authController.logout
);

console.log('📄 [routes/auth.js] Routes protégées configurées');

// ============================================================================
// ROUTES DE VÉRIFICATION DE STATUT
// ============================================================================

/**
 * @route   GET /api/auth/check
 * @desc    Vérifier si le token est valide (pour le client)
 * @access  Private (Token requis)
 * @returns { success, data: { valid: true, user: { id, email, role } } }
 */
router.get('/check',
  verifyToken,
  (req, res) => {
    console.log('📄 [routes/auth.js] GET /check - User:', req.user?.email);
    
    res.json({
      success: true,
      message: 'Token valide',
      data: {
        valid: true,
        user: {
          id: req.user._id,
          email: req.user.email,
          role: req.user.role,
          phoneVerified: req.user.phoneVerified,
          faceVerified: req.user.faceVerified
        }
      }
    });
  }
);

/**
 * @route   GET /api/auth/verification-status
 * @desc    Obtenir le statut de vérification de l'utilisatrice
 * @access  Private (Token requis)
 * @returns { success, data: { phoneVerified, faceVerified, nextStep } }
 */
router.get('/verification-status',
  verifyToken,
  (req, res) => {
    console.log('📄 [routes/auth.js] GET /verification-status - User:', req.user?.email);
    
    let nextStep = 'complete';
    
    if (!req.user.phoneVerified) {
      nextStep = 'phone';
    } else if (!req.user.faceVerified) {
      nextStep = 'face';
    }
    
    res.json({
      success: true,
      data: {
        phoneVerified: req.user.phoneVerified,
        faceVerified: req.user.faceVerified,
        isFullyVerified: req.user.phoneVerified && req.user.faceVerified,
        nextStep
      }
    });
  }
);

console.log('📄 [routes/auth.js] Routes de vérification configurées');

// ============================================================================
// DOCUMENTATION DES ROUTES (pour /api/auth)
// ============================================================================

/**
 * @route   GET /api/auth
 * @desc    Documentation des routes d'authentification
 * @access  Public
 */
router.get('/',
  (req, res) => {
    console.log('📄 [routes/auth.js] GET / - Documentation');
    
    res.json({
      success: true,
      message: 'Go With Sally - API Authentification',
      version: '1.0.0',
      endpoints: {
        public: [
          { method: 'POST', path: '/register', description: 'Inscription' },
          { method: 'POST', path: '/login', description: 'Connexion' },
          { method: 'POST', path: '/forgot-password', description: 'Mot de passe oublié' },
          { method: 'POST', path: '/reset-password', description: 'Réinitialiser mot de passe' },
          { method: 'POST', path: '/refresh-token', description: 'Rafraîchir le token' }
        ],
        protected: [
          { method: 'GET', path: '/me', description: 'Profil utilisatrice' },
          { method: 'PUT', path: '/me', description: 'Mettre à jour profil' },
          { method: 'POST', path: '/verify-phone', description: 'Vérifier téléphone' },
          { method: 'POST', path: '/resend-phone-code', description: 'Renvoyer code' },
          { method: 'POST', path: '/verify-face', description: 'Vérification faciale' },
          { method: 'POST', path: '/change-password', description: 'Changer mot de passe' },
          { method: 'POST', path: '/logout', description: 'Déconnexion' },
          { method: 'GET', path: '/check', description: 'Vérifier token' },
          { method: 'GET', path: '/verification-status', description: 'Statut vérification' }
        ]
      }
    });
  }
);

// ============================================================================
// EXPORT
// ============================================================================

console.log('📄 [routes/auth.js] ✅ Router exporté');
console.log('📄 [routes/auth.js] Routes disponibles:');
console.log('📄 [routes/auth.js]   POST /register');
console.log('📄 [routes/auth.js]   POST /login');
console.log('📄 [routes/auth.js]   POST /forgot-password');
console.log('📄 [routes/auth.js]   POST /reset-password');
console.log('📄 [routes/auth.js]   POST /refresh-token');
console.log('📄 [routes/auth.js]   GET  /me');
console.log('📄 [routes/auth.js]   PUT  /me');
console.log('📄 [routes/auth.js]   POST /verify-phone');
console.log('📄 [routes/auth.js]   POST /resend-phone-code');
console.log('📄 [routes/auth.js]   POST /verify-face');
console.log('📄 [routes/auth.js]   POST /change-password');
console.log('📄 [routes/auth.js]   POST /logout');
console.log('📄 [routes/auth.js]   GET  /check');
console.log('📄 [routes/auth.js]   GET  /verification-status');

module.exports = router;
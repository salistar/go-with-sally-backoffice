/**
 * ============================================================================
 * GO WITH SALLY - AUTH CONTROLLER
 * ============================================================================
 * Contrôleur d'authentification
 * Gère l'inscription, la connexion, la vérification et la récupération
 * ============================================================================
 */

console.log('📄 [authController.js] Fichier chargé');

const User = require('../models/User');
const Driver = require('../models/Driver');
const jwt = require('jsonwebtoken');

console.log('📄 [authController.js] Dépendances importées');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  JWT_SECRET: process.env.JWT_SECRET || 'gowithsally-secret-key-2024',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'gowithsally-refresh-secret-2024',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',
  NODE_ENV: process.env.NODE_ENV || 'development',
  SIMULATION_MODE: process.env.SIMULATION_MODE === 'true'
};

// ============================================================================
// CACHE SIMPLE (en mémoire - à remplacer par Redis en production)
// ============================================================================

const cache = new Map();

const setEx = async (key, value, ttl) => {
  cache.set(key, { value, expires: Date.now() + ttl * 1000 });
  setTimeout(() => cache.delete(key), ttl * 1000);
};

const redisGet = async (key) => {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() > item.expires) {
    cache.delete(key);
    return null;
  }
  return item.value;
};

const redisDel = async (key) => {
  cache.delete(key);
};

// ============================================================================
// HELPERS
// ============================================================================

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRE });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ id: userId }, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRE });
};

// ============================================================================
// REGISTER - Inscription d'une nouvelle utilisatrice
// ============================================================================

/**
 * Inscription d'une nouvelle utilisatrice
 * @route POST /api/auth/register
 */
exports.register = async (req, res) => {
  console.log('📄 [authController.js] ▶ register() appelé');
  
  try {
    const { 
      firstName, 
      lastName, 
      email, 
      phone, 
      password, 
      dateOfBirth, 
      referralCode,
      role = 'user'
    } = req.body;
    
    console.log('📄 [authController.js] Données reçues:', { firstName, lastName, email, phone, role });
    
    // ─────────────────────────────────────────────────────────────────────────
    // Validation des champs requis
    // ─────────────────────────────────────────────────────────────────────────
    
    if (!firstName || !lastName || !email || !phone || !password || !dateOfBirth) {
      console.log('📄 [authController.js] ❌ Champs requis manquants');
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis',
        required: ['firstName', 'lastName', 'email', 'phone', 'password', 'dateOfBirth']
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Vérification si l'email ou le téléphone existe déjà
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [authController.js] Vérification email/téléphone existant...');
    
    const existingUser = await User.findOne({
      $or: [
        { email: email?.toLowerCase() },
        { phone }
      ]
    });
    
    if (existingUser) {
      const field = existingUser.email === email?.toLowerCase() ? 'Email' : 'Téléphone';
      console.log('📄 [authController.js] ❌', field, 'déjà utilisé');
      return res.status(400).json({
        success: false,
        message: `${field} déjà utilisé`
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Gestion du code de parrainage
    // ─────────────────────────────────────────────────────────────────────────
    
    let referredBy = null;
    
    if (referralCode) {
      console.log('📄 [authController.js] Vérification code parrainage:', referralCode);
      
      const referrer = await User.findOne({ 
        referralCode: referralCode.toUpperCase() 
      });
      
      if (referrer) {
        referredBy = referrer._id;
        console.log('📄 [authController.js] ✓ Code parrainage valide, parrain:', referrer.email);
        
        // Bonus pour le parrain (100 points)
        await User.findByIdAndUpdate(referrer._id, {
          $inc: { 
            points: 100,
            referralCount: 1
          }
        });
        console.log('📄 [authController.js] ✓ Bonus parrainage ajouté au parrain');
      } else {
        console.log('📄 [authController.js] ⚠ Code parrainage invalide, ignoré');
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Création de l'utilisatrice
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [authController.js] Création de l\'utilisatrice...');
    
    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      phone,
      password,
      dateOfBirth: new Date(dateOfBirth),
      referredBy,
      role,
      points: referredBy ? 50 : 0 // Bonus de bienvenue si parrainée
    });
    
    console.log('📄 [authController.js] ✓ Utilisatrice créée:', user._id);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Création du profil conductrice si rôle = driver
    // ─────────────────────────────────────────────────────────────────────────
    
    let driverProfile = null;
    
    if (role === 'driver') {
      console.log('📄 [authController.js] Création du profil conductrice...');
      
      const { vehicle } = req.body;
      
      if (vehicle && vehicle.brand && vehicle.model && vehicle.year && vehicle.color && vehicle.plateNumber) {
        driverProfile = await Driver.create({
          user: user._id,
          vehicle: {
            brand: vehicle.brand,
            model: vehicle.model,
            year: vehicle.year,
            color: vehicle.color,
            plateNumber: vehicle.plateNumber,
            seats: vehicle.seats || 4,
            type: vehicle.type || 'standard'
          },
          status: 'pending_documents'
        });
        
        console.log('📄 [authController.js] ✓ Profil conductrice créé:', driverProfile._id);
      }
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Génération des tokens
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [authController.js] Génération des tokens...');
    
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    console.log('📄 [authController.js] ✓ Tokens générés');
    
    // ─────────────────────────────────────────────────────────────────────────
    // Génération du code de vérification téléphone
    // ─────────────────────────────────────────────────────────────────────────
    
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Stocker le code en cache (expire dans 10 minutes)
    await setEx(`phone_verify:${user._id}`, verificationCode, 600);
    
    console.log('📄 [authController.js] ✓ Code vérification généré');
    console.log(`📱 [AUTH] Code de vérification pour ${phone}: ${verificationCode}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Réponse
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [authController.js] ✓ Inscription réussie');
    
    res.status(201).json({
      success: true,
      message: 'Inscription réussie! Veuillez vérifier votre téléphone.',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          referralCode: user.referralCode,
          points: user.points
        },
        driver: driverProfile ? {
          id: driverProfile._id,
          status: driverProfile.status,
          vehicle: driverProfile.vehicle
        } : null,
        token,
        refreshToken,
        verificationStep: 'phone',
        // En mode dev, on renvoie le code
        ...(config.NODE_ENV === 'development' && { verificationCode })
      }
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur register:', error.message);
    
    // Gestion des erreurs de validation Mongoose
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: messages
      });
    }
    
    // Erreur de duplicat (index unique)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field === 'email' ? 'Email' : 'Téléphone'} déjà utilisé`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'inscription'
    });
  }
};

// ============================================================================
// LOGIN - Connexion d'une utilisatrice
// ============================================================================

/**
 * Connexion d'une utilisatrice
 * @route POST /api/auth/login
 */
exports.login = async (req, res) => {
  console.log('📄 [authController.js] ▶ login() appelé');

  try {
    const { email, phone, password } = req.body;

    const loginIdentifier = email || phone;
    console.log('📄 [authController.js] Tentative de connexion:', loginIdentifier);

    // ─────────────────────────────────────────────────────────────────────────
    // Validation des champs
    // ─────────────────────────────────────────────────────────────────────────

    if (!loginIdentifier || !password) {
      console.log('📄 [authController.js] ❌ Email/téléphone ou mot de passe manquant');
      return res.status(400).json({
        success: false,
        message: 'Email ou téléphone et mot de passe requis'
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Recherche de l'utilisatrice
    // ─────────────────────────────────────────────────────────────────────────

    console.log('📄 [authController.js] Recherche utilisatrice...');

    const user = await User.findOne({
      $or: [
        email ? { email: email.toLowerCase() } : null,
        phone ? { phone } : null
      ].filter(Boolean)
    }).select('+password');
    
    if (!user) {
      console.log('📄 [authController.js] ❌ Utilisatrice non trouvée');
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Vérification du mot de passe
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [authController.js] Vérification mot de passe...');
    
    const isPasswordValid = await user.comparePassword(password);
    
    if (!isPasswordValid) {
      console.log('📄 [authController.js] ❌ Mot de passe incorrect');
      return res.status(401).json({
        success: false,
        message: 'Identifiants invalides'
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Vérification du compte actif
    // ─────────────────────────────────────────────────────────────────────────
    
    if (!user.isActive) {
      console.log('📄 [authController.js] ❌ Compte désactivé');
      return res.status(403).json({
        success: false,
        message: 'Votre compte a été désactivé. Contactez le support.'
      });
    }
    
    if (user.isBanned) {
      console.log('📄 [authController.js] ❌ Compte banni');
      return res.status(403).json({
        success: false,
        message: `Votre compte a été banni. Raison: ${user.banReason || 'Non spécifiée'}`
      });
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Mise à jour de la dernière connexion
    // ─────────────────────────────────────────────────────────────────────────
    
    user.lastLoginAt = new Date();
    await user.save();
    
    console.log('📄 [authController.js] ✓ Dernière connexion mise à jour');
    
    // ─────────────────────────────────────────────────────────────────────────
    // Génération des tokens
    // ─────────────────────────────────────────────────────────────────────────
    
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);
    
    console.log('📄 [authController.js] ✓ Tokens générés');
    
    // ─────────────────────────────────────────────────────────────────────────
    // Déterminer l'étape de vérification
    // ─────────────────────────────────────────────────────────────────────────
    
    let verificationStep = 'complete';
    let verificationCode = null;
    
    if (!user.phoneVerified) {
      verificationStep = 'phone';
      
      // Générer un nouveau code
      verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      await setEx(`phone_verify:${user._id}`, verificationCode, 600);
      
      console.log('📄 [authController.js] Code vérification téléphone généré');
      console.log(`📱 [AUTH] Code de vérification pour ${user.phone}: ${verificationCode}`);
      
    } else if (!user.faceVerified) {
      verificationStep = 'face';
      console.log('📄 [authController.js] Vérification faciale requise');
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Charger le profil conductrice si applicable
    // ─────────────────────────────────────────────────────────────────────────
    
    let driverProfile = null;
    
    if (user.role === 'driver') {
      driverProfile = await Driver.findOne({ user: user._id });
      console.log('📄 [authController.js] Profil conductrice chargé:', driverProfile?._id);
    }
    
    // ─────────────────────────────────────────────────────────────────────────
    // Réponse
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [authController.js] ✓ Connexion réussie pour:', user.email);
    
    res.json({
      success: true,
      message: 'Connexion réussie',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          role: user.role,
          phoneVerified: user.phoneVerified,
          faceVerified: user.faceVerified,
          preferredLanguage: user.preferredLanguage,
          points: user.points,
          level: user.level,
          referralCode: user.referralCode,
          stats: user.stats,
          wallet: user.wallet
        },
        driver: driverProfile ? {
          id: driverProfile._id,
          status: driverProfile.status,
          isOnline: driverProfile.isOnline,
          isAvailable: driverProfile.isAvailable,
          vehicle: driverProfile.vehicle,
          stats: driverProfile.stats,
          earnings: driverProfile.earnings
        } : null,
        token,
        refreshToken,
        verificationStep,
        // En mode dev, on renvoie le code
        ...(config.NODE_ENV === 'development' && verificationCode && { verificationCode })
      }
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur login:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la connexion'
    });
  }
};

// ============================================================================
// VERIFY PHONE - Vérification du numéro de téléphone
// ============================================================================

/**
 * Vérification du code SMS
 * @route POST /api/auth/verify-phone
 */
exports.verifyPhone = async (req, res) => {
  console.log('📄 [authController.js] ▶ verifyPhone() appelé');
  
  try {
    const { code } = req.body;
    const userId = req.user._id;
    
    console.log('📄 [authController.js] Vérification code pour user:', userId);
    
    // Validation du code
    if (!code) {
      console.log('📄 [authController.js] ❌ Code manquant');
      return res.status(400).json({
        success: false,
        message: 'Le code de vérification est requis'
      });
    }
    
    // Récupérer le code stocké
    const storedCode = await redisGet(`phone_verify:${userId}`);
    
    console.log('📄 [authController.js] Code stocké:', storedCode ? '****' + storedCode.slice(-2) : 'null');
    
    // Vérifier si le code existe
    if (!storedCode) {
      console.log('📄 [authController.js] ❌ Code expiré ou inexistant');
      return res.status(400).json({
        success: false,
        message: 'Le code a expiré. Veuillez en demander un nouveau.'
      });
    }
    
    // Vérifier si le code correspond (ou code de dev "123456")
    const isValidCode = storedCode === code || (config.NODE_ENV === 'development' && code === '123456');
    
    if (!isValidCode) {
      console.log('📄 [authController.js] ❌ Code incorrect');
      return res.status(400).json({
        success: false,
        message: 'Code incorrect'
      });
    }
    
    // Marquer le téléphone comme vérifié
    req.user.phoneVerified = true;
    await req.user.save();
    
    // Supprimer le code du cache
    await redisDel(`phone_verify:${userId}`);
    
    console.log('📄 [authController.js] ✓ Téléphone vérifié pour:', req.user.email);
    
    // Déterminer la prochaine étape
    const nextStep = req.user.faceVerified ? 'complete' : 'face';
    
    res.json({
      success: true,
      message: 'Numéro de téléphone vérifié avec succès',
      data: {
        phoneVerified: true,
        nextStep
      }
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur verifyPhone:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification'
    });
  }
};

// ============================================================================
// RESEND PHONE CODE - Renvoyer le code de vérification
// ============================================================================

/**
 * Renvoyer le code de vérification SMS
 * @route POST /api/auth/resend-phone-code
 */
exports.resendPhoneCode = async (req, res) => {
  console.log('📄 [authController.js] ▶ resendPhoneCode() appelé');
  
  try {
    const userId = req.user._id;
    const phone = req.user.phone;
    
    console.log('📄 [authController.js] Renvoi code pour:', phone);
    
    // Vérifier si déjà vérifié
    if (req.user.phoneVerified) {
      console.log('📄 [authController.js] ⚠ Téléphone déjà vérifié');
      return res.status(400).json({
        success: false,
        message: 'Votre numéro de téléphone est déjà vérifié'
      });
    }
    
    // Générer et stocker le nouveau code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    await setEx(`phone_verify:${userId}`, verificationCode, 600);
    
    console.log('📄 [authController.js] ✓ Nouveau code généré');
    console.log(`📱 [AUTH] Nouveau code pour ${phone}: ${verificationCode}`);
    
    res.json({
      success: true,
      message: 'Un nouveau code a été envoyé',
      data: {
        phone: phone.slice(0, 7) + '****' + phone.slice(-2),
        expiresIn: 600, // 10 minutes
        // En mode dev, on renvoie le code
        ...(config.NODE_ENV === 'development' && { verificationCode })
      }
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur resendPhoneCode:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de l\'envoi du code'
    });
  }
};

// ============================================================================
// VERIFY FACE - Vérification faciale
// ============================================================================

/**
 * Vérification ou enregistrement facial
 * @route POST /api/auth/verify-face
 */
exports.verifyFace = async (req, res) => {
  console.log('📄 [authController.js] ▶ verifyFace() appelé');
  
  try {
    const { faceImage } = req.body;
    const userId = req.user._id;
    
    console.log('📄 [authController.js] Vérification faciale pour user:', userId);
    
    // Validation de l'image
    if (!faceImage) {
      console.log('📄 [authController.js] ❌ Image manquante');
      return res.status(400).json({
        success: false,
        message: 'L\'image est requise'
      });
    }
    
    // Mode simulation
    console.log('📄 [authController.js] Mode simulation activé');
    
    req.user.faceVerified = true;
    await req.user.save();
    
    res.json({
      success: true,
      message: 'Visage vérifié (mode simulation)',
      data: {
        faceVerified: true,
        simulation: true
      }
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur verifyFace:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la vérification faciale'
    });
  }
};

// ============================================================================
// LOGOUT - Déconnexion
// ============================================================================

/**
 * Déconnexion (blacklist le token)
 * @route POST /api/auth/logout
 */
exports.logout = async (req, res) => {
  console.log('📄 [authController.js] ▶ logout() appelé');
  
  try {
    const token = req.token;
    
    if (token) {
      // Blacklister le token pour 30 jours
      await setEx(`blacklist:${token}`, 'true', 86400 * 30);
      console.log('📄 [authController.js] ✓ Token blacklisté');
    }
    
    res.json({
      success: true,
      message: 'Déconnexion réussie'
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur logout:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la déconnexion'
    });
  }
};

// ============================================================================
// FORGOT PASSWORD - Mot de passe oublié
// ============================================================================

/**
 * Demande de réinitialisation du mot de passe
 * @route POST /api/auth/forgot-password
 */
exports.forgotPassword = async (req, res) => {
  console.log('📄 [authController.js] ▶ forgotPassword() appelé');
  
  try {
    const { email } = req.body;
    
    console.log('📄 [authController.js] Demande reset pour:', email);
    
    // Validation
    if (!email) {
      console.log('📄 [authController.js] ❌ Email manquant');
      return res.status(400).json({
        success: false,
        message: 'L\'email est requis'
      });
    }
    
    // Rechercher l'utilisatrice
    const user = await User.findOne({ email: email?.toLowerCase() });
    
    // On ne révèle pas si l'email existe ou non (sécurité)
    if (user) {
      // Générer un token de réinitialisation
      const resetToken = Math.random().toString(36).substring(2, 15) + 
                         Math.random().toString(36).substring(2, 15);
      
      // Stocker le token (expire dans 1 heure)
      await setEx(`reset_password:${resetToken}`, user._id.toString(), 3600);
      
      console.log('📄 [authController.js] ✓ Token reset généré');
      console.log(`🔑 [AUTH] Reset token pour ${email}: ${resetToken}`);
    } else {
      console.log('📄 [authController.js] ⚠ Email non trouvé (pas révélé à l\'utilisateur)');
    }
    
    // Réponse identique que l'email existe ou non
    res.json({
      success: true,
      message: 'Si cet email existe, vous recevrez un lien de réinitialisation.'
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur forgotPassword:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la demande'
    });
  }
};

// ============================================================================
// RESET PASSWORD - Réinitialisation du mot de passe
// ============================================================================

/**
 * Réinitialisation du mot de passe avec token
 * @route POST /api/auth/reset-password
 */
exports.resetPassword = async (req, res) => {
  console.log('📄 [authController.js] ▶ resetPassword() appelé');
  
  try {
    const { token, password } = req.body;
    
    console.log('📄 [authController.js] Tentative reset avec token');
    
    // Validation
    if (!token || !password) {
      console.log('📄 [authController.js] ❌ Token ou mot de passe manquant');
      return res.status(400).json({
        success: false,
        message: 'Token et nouveau mot de passe requis'
      });
    }
    
    if (password.length < 8) {
      console.log('📄 [authController.js] ❌ Mot de passe trop court');
      return res.status(400).json({
        success: false,
        message: 'Le mot de passe doit contenir au moins 8 caractères'
      });
    }
    
    // Vérifier le token
    const userId = await redisGet(`reset_password:${token}`);
    
    if (!userId) {
      console.log('📄 [authController.js] ❌ Token invalide ou expiré');
      return res.status(400).json({
        success: false,
        message: 'Le lien est invalide ou a expiré. Veuillez faire une nouvelle demande.'
      });
    }
    
    // Mettre à jour le mot de passe
    const user = await User.findById(userId);
    
    if (!user) {
      console.log('📄 [authController.js] ❌ Utilisatrice non trouvée');
      return res.status(400).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }
    
    user.password = password;
    await user.save();
    
    // Supprimer le token utilisé
    await redisDel(`reset_password:${token}`);
    
    console.log('📄 [authController.js] ✓ Mot de passe réinitialisé pour:', user.email);
    
    res.json({
      success: true,
      message: 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter.'
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur resetPassword:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la réinitialisation'
    });
  }
};

// ============================================================================
// REFRESH TOKEN - Rafraîchir le token d'accès
// ============================================================================

/**
 * Rafraîchir le token d'accès
 * @route POST /api/auth/refresh-token
 */
exports.refreshToken = async (req, res) => {
  console.log('📄 [authController.js] ▶ refreshToken() appelé');
  
  try {
    const { refreshToken } = req.body;
    
    // Validation
    if (!refreshToken) {
      console.log('📄 [authController.js] ❌ Refresh token manquant');
      return res.status(400).json({
        success: false,
        message: 'Le refresh token est requis'
      });
    }
    
    // Vérifier le refresh token
    console.log('📄 [authController.js] Vérification du refresh token...');
    
    const decoded = jwt.verify(refreshToken, config.JWT_REFRESH_SECRET);
    
    // Récupérer l'utilisatrice
    const user = await User.findById(decoded.id);
    
    if (!user) {
      console.log('📄 [authController.js] ❌ Utilisatrice non trouvée');
      return res.status(401).json({
        success: false,
        message: 'Token invalide'
      });
    }
    
    if (!user.isActive) {
      console.log('📄 [authController.js] ❌ Compte désactivé');
      return res.status(401).json({
        success: false,
        message: 'Compte désactivé'
      });
    }
    
    // Générer de nouveaux tokens
    const newToken = generateToken(user._id);
    const newRefreshToken = generateRefreshToken(user._id);
    
    console.log('📄 [authController.js] ✓ Tokens rafraîchis pour:', user.email);
    
    res.json({
      success: true,
      message: 'Tokens rafraîchis',
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur refreshToken:', error.message);
    
    // Erreur de token JWT
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token invalide ou expiré'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors du rafraîchissement'
    });
  }
};

// ============================================================================
// GET ME - Obtenir le profil de l'utilisatrice connectée
// ============================================================================

/**
 * Obtenir le profil de l'utilisatrice connectée
 * @route GET /api/auth/me
 */
exports.getMe = async (req, res) => {
  console.log('📄 [authController.js] ▶ getMe() appelé');
  
  try {
    const user = req.user;
    
    // Charger le profil conductrice si applicable
    let driverProfile = null;
    
    if (user.role === 'driver') {
      driverProfile = await Driver.findOne({ user: user._id });
    }
    
    console.log('📄 [authController.js] ✓ Profil récupéré pour:', user.email);
    
    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          dateOfBirth: user.dateOfBirth,
          role: user.role,
          phoneVerified: user.phoneVerified,
          faceVerified: user.faceVerified,
          preferredLanguage: user.preferredLanguage,
          points: user.points,
          level: user.level,
          referralCode: user.referralCode,
          stats: user.stats,
          wallet: user.wallet,
          savedPlaces: user.savedPlaces,
          emergencyContacts: user.emergencyContacts,
          notifications: user.notifications
        },
        driver: driverProfile ? {
          id: driverProfile._id,
          status: driverProfile.status,
          isOnline: driverProfile.isOnline,
          isAvailable: driverProfile.isAvailable,
          vehicle: driverProfile.vehicle,
          stats: driverProfile.stats,
          earnings: driverProfile.earnings,
          documentsComplete: driverProfile.documentsComplete
        } : null
      }
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur getMe:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération du profil'
    });
  }
};

// ============================================================================
// UPDATE ME - Mettre à jour le profil
// ============================================================================

/**
 * Mettre à jour le profil
 * @route PUT /api/auth/me
 */
exports.updateMe = async (req, res) => {
  console.log('📄 [authController.js] ▶ updateMe() appelé');
  
  try {
    const allowedUpdates = ['firstName', 'lastName', 'avatar', 'preferredLanguage', 'notifications'];
    const updates = {};
    
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: true }
    );
    
    console.log('📄 [authController.js] ✓ Profil mis à jour pour:', user.email);
    
    res.json({
      success: true,
      message: 'Profil mis à jour',
      data: { user }
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur updateMe:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors de la mise à jour du profil'
    });
  }
};

// ============================================================================
// CHANGE PASSWORD - Changer le mot de passe
// ============================================================================

/**
 * Changer le mot de passe (utilisatrice connectée)
 * @route POST /api/auth/change-password
 */
exports.changePassword = async (req, res) => {
  console.log('📄 [authController.js] ▶ changePassword() appelé');
  
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;
    
    // Validation
    if (!currentPassword || !newPassword) {
      console.log('📄 [authController.js] ❌ Mots de passe manquants');
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel et nouveau mot de passe requis'
      });
    }
    
    if (newPassword.length < 8) {
      console.log('📄 [authController.js] ❌ Nouveau mot de passe trop court');
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
      });
    }
    
    // Vérifier le mot de passe actuel
    const user = await User.findById(userId).select('+password');
    
    const isCurrentValid = await user.comparePassword(currentPassword);
    
    if (!isCurrentValid) {
      console.log('📄 [authController.js] ❌ Mot de passe actuel incorrect');
      return res.status(400).json({
        success: false,
        message: 'Mot de passe actuel incorrect'
      });
    }
    
    // Mettre à jour le mot de passe
    user.password = newPassword;
    await user.save();
    
    console.log('📄 [authController.js] ✓ Mot de passe changé pour:', user.email);
    
    res.json({
      success: true,
      message: 'Mot de passe modifié avec succès'
    });
    
  } catch (error) {
    console.log('📄 [authController.js] ❌ Erreur changePassword:', error.message);
    
    res.status(500).json({
      success: false,
      message: 'Erreur lors du changement de mot de passe'
    });
  }
};

console.log('📄 [authController.js] ✅ Contrôleur exporté');
console.log('📄 [authController.js] Fonctions: register, login, verifyPhone, resendPhoneCode, verifyFace, logout, forgotPassword, resetPassword, refreshToken, getMe, updateMe, changePassword');

/**
 * ============================================================================
 * GO WITH SALLY - USER ROUTES
 * ============================================================================
 * Routes pour la gestion du profil utilisatrice
 * Gère le profil, les préférences, les contacts d'urgence, les lieux et le wallet
 * 
 * Base URL: /api/users
 * ============================================================================
 */

console.log('📄 [routes/user.js] Fichier chargé');

const express = require('express');
const router = express.Router();

console.log('📄 [routes/user.js] Express Router initialisé');

// ============================================================================
// IMPORTS
// ============================================================================

const { 
  verifyToken, 
  requirePhoneVerification,
  createRateLimiter
} = require('../middleware/auth');
const { User } = require('../models');
const logger = require('../utils/logger');

console.log('📄 [routes/user.js] Middleware et modèles importés');

// ============================================================================
// RATE LIMITERS
// ============================================================================

/**
 * Rate limiter pour les mises à jour de profil
 * 20 requêtes par heure
 */
const profileUpdateLimiter = createRateLimiter({
  maxRequests: 20,
  windowMs: 3600000,
  message: 'Trop de modifications. Veuillez patienter.'
});

console.log('📄 [routes/user.js] Rate limiters configurés');

// ============================================================================
// ROUTES PROFIL
// ============================================================================

/**
 * @route   GET /api/users/me
 * @desc    Obtenir le profil complet de l'utilisatrice
 * @access  Private (Token)
 * @returns { success, data: { user } }
 */
router.get('/me',
  verifyToken,
  (req, res) => {
    console.log('📄 [routes/user.js] GET /me - User:', req.user?.email);
    
    res.json({
      success: true,
      data: {
        user: {
          id: req.user._id,
          firstName: req.user.firstName,
          lastName: req.user.lastName,
          email: req.user.email,
          phone: req.user.phone,
          avatar: req.user.avatar,
          dateOfBirth: req.user.dateOfBirth,
          role: req.user.role,
          phoneVerified: req.user.phoneVerified,
          faceVerified: req.user.faceVerified,
          preferredLanguage: req.user.preferredLanguage,
          points: req.user.points,
          level: req.user.level,
          referralCode: req.user.referralCode,
          referralCount: req.user.referralCount,
          stats: req.user.stats,
          wallet: req.user.wallet,
          savedPlaces: req.user.savedPlaces,
          emergencyContacts: req.user.emergencyContacts,
          notifications: req.user.notifications,
          isActive: req.user.isActive,
          createdAt: req.user.createdAt
        }
      }
    });
  }
);

/**
 * @route   PUT /api/users/me
 * @desc    Mettre à jour le profil
 * @access  Private (Token)
 * @body    { firstName?, lastName?, preferredLanguage?, avatar?, dateOfBirth? }
 * @returns { success, data: { user } }
 */
router.put('/me',
  verifyToken,
  profileUpdateLimiter,
  async (req, res) => {
    console.log('📄 [routes/user.js] PUT /me - User:', req.user?.email);
    
    try {
      const allowedUpdates = [
        'firstName', 
        'lastName', 
        'preferredLanguage', 
        'avatar',
        'dateOfBirth'
      ];
      
      const updates = {};
      
      // Filtrer les champs autorisés
      allowedUpdates.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      });
      
      console.log('📄 [routes/user.js] Champs à mettre à jour:', Object.keys(updates));
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Aucun champ valide à mettre à jour',
          allowedFields: allowedUpdates
        });
      }
      
      // Appliquer les mises à jour
      Object.assign(req.user, updates);
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Profil mis à jour');
      
      res.json({
        success: true,
        message: 'Profil mis à jour',
        data: {
          user: {
            id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            email: req.user.email,
            phone: req.user.phone,
            avatar: req.user.avatar,
            preferredLanguage: req.user.preferredLanguage
          }
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur PUT /me:', error.message);
      logger.error(`[USER] Update profile error: ${error.message}`);
      
      res.status(500).json({
        success: false,
        message: 'Erreur lors de la mise à jour'
      });
    }
  }
);

/**
 * @route   GET /api/users/stats
 * @desc    Obtenir les statistiques de l'utilisatrice
 * @access  Private (Token)
 * @returns { success, data: { stats, level, points } }
 */
router.get('/stats',
  verifyToken,
  (req, res) => {
    console.log('📄 [routes/user.js] GET /stats - User:', req.user?.email);
    
    res.json({
      success: true,
      data: {
        stats: req.user.stats,
        points: req.user.points,
        level: req.user.level,
        nextLevelPoints: (req.user.level + 1) * 500, // 500 points par niveau
        referralCode: req.user.referralCode,
        referralCount: req.user.referralCount
      }
    });
  }
);

console.log('📄 [routes/user.js] Routes profil configurées');

// ============================================================================
// ROUTES CONTACTS D'URGENCE
// ============================================================================

/**
 * @route   GET /api/users/emergency-contacts
 * @desc    Obtenir les contacts d'urgence
 * @access  Private (Token)
 * @returns { success, data: { contacts } }
 */
router.get('/emergency-contacts',
  verifyToken,
  (req, res) => {
    console.log('📄 [routes/user.js] GET /emergency-contacts - User:', req.user?.email);
    
    res.json({
      success: true,
      data: {
        contacts: req.user.emergencyContacts || [],
        count: req.user.emergencyContacts?.length || 0,
        maxContacts: 5
      }
    });
  }
);

/**
 * @route   POST /api/users/emergency-contacts
 * @desc    Ajouter un contact d'urgence
 * @access  Private (Token)
 * @body    { name: string, phone: string, relationship?: string }
 * @returns { success, data: { contacts } }
 */
router.post('/emergency-contacts',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/user.js] POST /emergency-contacts - User:', req.user?.email);
    
    try {
      const { name, phone, relationship } = req.body;
      
      // Validation
      if (!name || !phone) {
        console.log('📄 [routes/user.js] ❌ Nom et téléphone requis');
        return res.status(400).json({
          success: false,
          message: 'Le nom et le numéro de téléphone sont requis'
        });
      }
      
      // Vérifier la limite
      if (req.user.emergencyContacts && req.user.emergencyContacts.length >= 5) {
        console.log('📄 [routes/user.js] ❌ Maximum 5 contacts');
        return res.status(400).json({
          success: false,
          message: 'Vous avez atteint le maximum de 5 contacts d\'urgence'
        });
      }
      
      // Vérifier les doublons
      const exists = req.user.emergencyContacts?.find(c => c.phone === phone);
      if (exists) {
        console.log('📄 [routes/user.js] ❌ Contact existe déjà');
        return res.status(400).json({
          success: false,
          message: 'Ce numéro est déjà dans vos contacts d\'urgence'
        });
      }
      
      // Ajouter le contact
      if (!req.user.emergencyContacts) {
        req.user.emergencyContacts = [];
      }
      
      req.user.emergencyContacts.push({
        name,
        phone,
        relationship: relationship || 'autre'
      });
      
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Contact ajouté:', name);
      
      res.status(201).json({
        success: true,
        message: 'Contact d\'urgence ajouté',
        data: {
          contacts: req.user.emergencyContacts
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur POST /emergency-contacts:', error.message);
      logger.error(`[USER] Add emergency contact error: ${error.message}`);
      
      res.status(500).json({
        success: false,
        message: 'Erreur lors de l\'ajout du contact'
      });
    }
  }
);

/**
 * @route   PUT /api/users/emergency-contacts/:contactId
 * @desc    Modifier un contact d'urgence
 * @access  Private (Token)
 * @body    { name?, phone?, relationship? }
 * @returns { success, data: { contact } }
 */
router.put('/emergency-contacts/:contactId',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/user.js] PUT /emergency-contacts/:id -', req.params.contactId);
    
    try {
      const { contactId } = req.params;
      const { name, phone, relationship } = req.body;
      
      // Trouver le contact
      const contact = req.user.emergencyContacts?.id(contactId);
      
      if (!contact) {
        console.log('📄 [routes/user.js] ❌ Contact non trouvé');
        return res.status(404).json({
          success: false,
          message: 'Contact non trouvé'
        });
      }
      
      // Mettre à jour
      if (name) contact.name = name;
      if (phone) contact.phone = phone;
      if (relationship) contact.relationship = relationship;
      
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Contact mis à jour');
      
      res.json({
        success: true,
        message: 'Contact mis à jour',
        data: { contact }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur PUT /emergency-contacts:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

/**
 * @route   DELETE /api/users/emergency-contacts/:contactId
 * @desc    Supprimer un contact d'urgence
 * @access  Private (Token)
 * @returns { success }
 */
router.delete('/emergency-contacts/:contactId',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/user.js] DELETE /emergency-contacts/:id -', req.params.contactId);
    
    try {
      const { contactId } = req.params;
      
      // Trouver et supprimer le contact
      const contact = req.user.emergencyContacts?.id(contactId);
      
      if (!contact) {
        console.log('📄 [routes/user.js] ❌ Contact non trouvé');
        return res.status(404).json({
          success: false,
          message: 'Contact non trouvé'
        });
      }
      
      contact.deleteOne();
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Contact supprimé');
      
      res.json({
        success: true,
        message: 'Contact supprimé',
        data: {
          contacts: req.user.emergencyContacts
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur DELETE /emergency-contacts:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/user.js] Routes contacts d\'urgence configurées');

// ============================================================================
// ROUTES LIEUX ENREGISTRÉS
// ============================================================================

/**
 * @route   GET /api/users/saved-places
 * @desc    Obtenir les lieux enregistrés
 * @access  Private (Token)
 * @returns { success, data: { places } }
 */
router.get('/saved-places',
  verifyToken,
  (req, res) => {
    console.log('📄 [routes/user.js] GET /saved-places - User:', req.user?.email);
    
    res.json({
      success: true,
      data: {
        places: req.user.savedPlaces || [],
        count: req.user.savedPlaces?.length || 0
      }
    });
  }
);

/**
 * @route   POST /api/users/saved-places
 * @desc    Ajouter un lieu enregistré
 * @access  Private (Token)
 * @body    { name: string, type: string, address: string, coordinates: [lng, lat] }
 * @returns { success, data: { places } }
 */
router.post('/saved-places',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/user.js] POST /saved-places - User:', req.user?.email);
    
    try {
      const { name, type, address, coordinates, notes } = req.body;
      
      // Validation
      if (!name || !address || !coordinates) {
        console.log('📄 [routes/user.js] ❌ Champs requis manquants');
        return res.status(400).json({
          success: false,
          message: 'Nom, adresse et coordonnées requis'
        });
      }
      
      if (!Array.isArray(coordinates) || coordinates.length !== 2) {
        console.log('📄 [routes/user.js] ❌ Format coordonnées invalide');
        return res.status(400).json({
          success: false,
          message: 'Format des coordonnées invalide. Attendu: [longitude, latitude]'
        });
      }
      
      // Vérifier la limite
      if (req.user.savedPlaces && req.user.savedPlaces.length >= 20) {
        return res.status(400).json({
          success: false,
          message: 'Vous avez atteint le maximum de 20 lieux enregistrés'
        });
      }
      
      // Ajouter le lieu
      if (!req.user.savedPlaces) {
        req.user.savedPlaces = [];
      }
      
      req.user.savedPlaces.push({
        name,
        type: type || 'other',
        address,
        coordinates: {
          type: 'Point',
          coordinates
        },
        notes
      });
      
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Lieu ajouté:', name);
      
      res.status(201).json({
        success: true,
        message: 'Lieu enregistré',
        data: {
          places: req.user.savedPlaces
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur POST /saved-places:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

/**
 * @route   PUT /api/users/saved-places/:placeId
 * @desc    Modifier un lieu enregistré
 * @access  Private (Token)
 * @returns { success, data: { place } }
 */
router.put('/saved-places/:placeId',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/user.js] PUT /saved-places/:id -', req.params.placeId);
    
    try {
      const { placeId } = req.params;
      const { name, type, address, coordinates, notes } = req.body;
      
      const place = req.user.savedPlaces?.id(placeId);
      
      if (!place) {
        return res.status(404).json({ success: false, message: 'Lieu non trouvé' });
      }
      
      if (name) place.name = name;
      if (type) place.type = type;
      if (address) place.address = address;
      if (coordinates) {
        place.coordinates = { type: 'Point', coordinates };
      }
      if (notes !== undefined) place.notes = notes;
      
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Lieu mis à jour');
      
      res.json({
        success: true,
        message: 'Lieu mis à jour',
        data: { place }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur PUT /saved-places:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

/**
 * @route   DELETE /api/users/saved-places/:placeId
 * @desc    Supprimer un lieu enregistré
 * @access  Private (Token)
 * @returns { success }
 */
router.delete('/saved-places/:placeId',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/user.js] DELETE /saved-places/:id -', req.params.placeId);
    
    try {
      const place = req.user.savedPlaces?.id(req.params.placeId);
      
      if (!place) {
        return res.status(404).json({ success: false, message: 'Lieu non trouvé' });
      }
      
      place.deleteOne();
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Lieu supprimé');
      
      res.json({
        success: true,
        message: 'Lieu supprimé',
        data: { places: req.user.savedPlaces }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur DELETE /saved-places:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/user.js] Routes lieux enregistrés configurées');

// ============================================================================
// ROUTES WALLET
// ============================================================================

/**
 * @route   GET /api/users/wallet
 * @desc    Obtenir le solde du wallet
 * @access  Private (Token)
 * @returns { success, data: { wallet } }
 */
router.get('/wallet',
  verifyToken,
  (req, res) => {
    console.log('📄 [routes/user.js] GET /wallet - User:', req.user?.email);
    
    res.json({
      success: true,
      data: {
        wallet: {
          balance: req.user.wallet?.balance || 0,
          currency: 'MAD'
        }
      }
    });
  }
);

/**
 * @route   POST /api/users/wallet/topup
 * @desc    Recharger le wallet
 * @access  Private (Token + Phone vérifié)
 * @body    { amount: number, paymentMethod: string }
 * @returns { success, data: { newBalance } }
 */
router.post('/wallet/topup',
  verifyToken,
  requirePhoneVerification,
  async (req, res) => {
    console.log('📄 [routes/user.js] POST /wallet/topup - User:', req.user?.email);
    
    try {
      const { amount, paymentMethod } = req.body;
      
      if (!amount || amount < 20) {
        return res.status(400).json({
          success: false,
          message: 'Montant minimum de recharge: 20 MAD'
        });
      }
      
      if (amount > 5000) {
        return res.status(400).json({
          success: false,
          message: 'Montant maximum de recharge: 5000 MAD'
        });
      }
      
      // TODO: Intégrer le paiement réel (CMI, etc.)
      // Pour le moment, simulation
      
      if (!req.user.wallet) {
        req.user.wallet = { balance: 0 };
      }
      
      req.user.wallet.balance += amount;
      
      // Historique des transactions
      if (!req.user.wallet.transactions) {
        req.user.wallet.transactions = [];
      }
      
      req.user.wallet.transactions.push({
        type: 'topup',
        amount,
        paymentMethod,
        createdAt: new Date()
      });
      
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Wallet rechargé:', amount, 'MAD');
      
      res.json({
        success: true,
        message: `${amount} MAD ajoutés à votre wallet`,
        data: {
          newBalance: req.user.wallet.balance,
          transaction: {
            type: 'topup',
            amount,
            paymentMethod
          }
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur topup:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

/**
 * @route   GET /api/users/wallet/transactions
 * @desc    Historique des transactions wallet
 * @access  Private (Token)
 * @returns { success, data: { transactions } }
 */
router.get('/wallet/transactions',
  verifyToken,
  (req, res) => {
    console.log('📄 [routes/user.js] GET /wallet/transactions - User:', req.user?.email);
    
    const transactions = req.user.wallet?.transactions || [];
    
    res.json({
      success: true,
      data: {
        transactions: transactions.slice(-50).reverse(), // 50 dernières
        count: transactions.length
      }
    });
  }
);

console.log('📄 [routes/user.js] Routes wallet configurées');

// ============================================================================
// ROUTES NOTIFICATIONS
// ============================================================================

/**
 * @route   GET /api/users/notifications/settings
 * @desc    Obtenir les paramètres de notifications
 * @access  Private (Token)
 * @returns { success, data: { notifications } }
 */
router.get('/notifications/settings',
  verifyToken,
  (req, res) => {
    console.log('📄 [routes/user.js] GET /notifications/settings - User:', req.user?.email);
    
    res.json({
      success: true,
      data: {
        notifications: req.user.notifications || {
          push: true,
          email: true,
          sms: true,
          promotions: true
        }
      }
    });
  }
);

/**
 * @route   PUT /api/users/notifications/settings
 * @desc    Modifier les paramètres de notifications
 * @access  Private (Token)
 * @body    { push?, email?, sms?, promotions? }
 * @returns { success, data: { notifications } }
 */
router.put('/notifications/settings',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/user.js] PUT /notifications/settings - User:', req.user?.email);
    
    try {
      const { push, email, sms, promotions } = req.body;
      
      if (!req.user.notifications) {
        req.user.notifications = {};
      }
      
      if (push !== undefined) req.user.notifications.push = push;
      if (email !== undefined) req.user.notifications.email = email;
      if (sms !== undefined) req.user.notifications.sms = sms;
      if (promotions !== undefined) req.user.notifications.promotions = promotions;
      
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Notifications mises à jour');
      
      res.json({
        success: true,
        message: 'Paramètres de notifications mis à jour',
        data: {
          notifications: req.user.notifications
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur notifications:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/user.js] Routes notifications configurées');

// ============================================================================
// ROUTES PARRAINAGE
// ============================================================================

/**
 * @route   GET /api/users/referral
 * @desc    Obtenir les infos de parrainage
 * @access  Private (Token)
 * @returns { success, data: { referralCode, referralCount, referrals } }
 */
router.get('/referral',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/user.js] GET /referral - User:', req.user?.email);
    
    try {
      // Trouver les filleules
      const referrals = await User.find({ referredBy: req.user._id })
        .select('firstName lastName createdAt')
        .sort({ createdAt: -1 })
        .limit(20);
      
      res.json({
        success: true,
        data: {
          referralCode: req.user.referralCode,
          referralCount: req.user.referralCount || 0,
          pointsEarned: (req.user.referralCount || 0) * 100,
          referrals: referrals.map(r => ({
            name: `${r.firstName} ${r.lastName.charAt(0)}.`,
            joinedAt: r.createdAt
          })),
          shareMessage: `Rejoignez Go With Sally avec mon code ${req.user.referralCode} et recevez 50 points de bienvenue! 🚗✨`
        }
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur referral:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/user.js] Routes parrainage configurées');

// ============================================================================
// ROUTES SUPPRESSION DE COMPTE
// ============================================================================

/**
 * @route   DELETE /api/users/me
 * @desc    Supprimer le compte (soft delete)
 * @access  Private (Token)
 * @body    { password: string, reason?: string }
 * @returns { success }
 */
router.delete('/me',
  verifyToken,
  async (req, res) => {
    console.log('📄 [routes/user.js] DELETE /me - User:', req.user?.email);
    
    try {
      const { password, reason } = req.body;
      
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe requis pour confirmer la suppression'
        });
      }
      
      // Vérifier le mot de passe
      const user = await User.findById(req.user._id).select('+password');
      const isValid = await user.comparePassword(password);
      
      if (!isValid) {
        return res.status(400).json({
          success: false,
          message: 'Mot de passe incorrect'
        });
      }
      
      // Soft delete
      req.user.isActive = false;
      req.user.deletedAt = new Date();
      req.user.deletionReason = reason;
      await req.user.save();
      
      console.log('📄 [routes/user.js] ✓ Compte désactivé');
      logger.info(`[USER] Account deleted: ${req.user.email}, reason: ${reason}`);
      
      res.json({
        success: true,
        message: 'Votre compte a été supprimé. Nous sommes tristes de vous voir partir.'
      });
      
    } catch (error) {
      console.log('📄 [routes/user.js] ❌ Erreur DELETE /me:', error.message);
      res.status(500).json({ success: false, message: 'Erreur' });
    }
  }
);

console.log('📄 [routes/user.js] Routes suppression configurées');

// ============================================================================
// DOCUMENTATION
// ============================================================================

/**
 * @route   GET /api/users
 * @desc    Documentation des routes utilisatrice
 * @access  Public
 */
router.get('/',
  (req, res) => {
    console.log('📄 [routes/user.js] GET / - Documentation');
    
    res.json({
      success: true,
      message: 'Go With Sally - API Utilisatrice',
      version: '1.0.0',
      endpoints: {
        profile: [
          { method: 'GET', path: '/me', description: 'Profil complet' },
          { method: 'PUT', path: '/me', description: 'Modifier profil' },
          { method: 'DELETE', path: '/me', description: 'Supprimer compte' },
          { method: 'GET', path: '/stats', description: 'Statistiques' }
        ],
        emergencyContacts: [
          { method: 'GET', path: '/emergency-contacts', description: 'Liste contacts' },
          { method: 'POST', path: '/emergency-contacts', description: 'Ajouter contact' },
          { method: 'PUT', path: '/emergency-contacts/:id', description: 'Modifier contact' },
          { method: 'DELETE', path: '/emergency-contacts/:id', description: 'Supprimer contact' }
        ],
        savedPlaces: [
          { method: 'GET', path: '/saved-places', description: 'Liste lieux' },
          { method: 'POST', path: '/saved-places', description: 'Ajouter lieu' },
          { method: 'PUT', path: '/saved-places/:id', description: 'Modifier lieu' },
          { method: 'DELETE', path: '/saved-places/:id', description: 'Supprimer lieu' }
        ],
        wallet: [
          { method: 'GET', path: '/wallet', description: 'Solde' },
          { method: 'POST', path: '/wallet/topup', description: 'Recharger' },
          { method: 'GET', path: '/wallet/transactions', description: 'Historique' }
        ],
        notifications: [
          { method: 'GET', path: '/notifications/settings', description: 'Paramètres' },
          { method: 'PUT', path: '/notifications/settings', description: 'Modifier' }
        ],
        referral: [
          { method: 'GET', path: '/referral', description: 'Infos parrainage' }
        ]
      }
    });
  }
);

// ============================================================================
// EXPORT
// ============================================================================

console.log('📄 [routes/user.js] ✅ Router exporté');
console.log('📄 [routes/user.js] Routes: /me, /stats');
console.log('📄 [routes/user.js] Routes: /emergency-contacts (CRUD)');
console.log('📄 [routes/user.js] Routes: /saved-places (CRUD)');
console.log('📄 [routes/user.js] Routes: /wallet, /wallet/topup, /wallet/transactions');
console.log('📄 [routes/user.js] Routes: /notifications/settings, /referral');

module.exports = router;
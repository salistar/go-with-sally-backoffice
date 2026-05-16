/**
 * ============================================================================
 * GO WITH SALLY - BADGE CONTROLLER
 * ============================================================================
 * Contrôleur pour les endpoints de badges
 *
 * @module controllers/badgeController
 * @version 1.0.0
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - getMyBadge() function entry
// - getMyProgress() function entry
// - refreshMyBadge() function entry
// - checkServiceAccess() function entry
// - getAllBadges() function entry
// - getBadgeConfig() function entry
// - getBadgeStats() function entry
// - getUserBadge() function entry
// - forceUpdateBadge() function entry
// - setUserBadge() function entry
// - getUsersByBadgeLevel() function entry

console.log('📄 badgeController.js ▶ Module loaded');

const badgeService = require('../services/badgeService');
const Badge = require('../models/Badge');

// ============================================================================
// ENDPOINTS UTILISATEUR
// ============================================================================

/**
 * GET /api/badges/me
 * Obtenir son badge actuel
 */
exports.getMyBadge = async (req, res) => {
  console.log('📄 badgeController.js ▶ getMyBadge() called');
  try {
    const userId = req.user.id;
    
    const result = await badgeService.calculateBadge(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
    
    res.json({
      success: true,
      data: {
        badge: result.badge,
        config: result.config,
        missingForNext: result.missingForNext,
      },
    });
  } catch (error) {
    console.error('[BadgeController] Erreur getMyBadge:', error);
    res.status(500).json({
      success: false,
      error: 'badge_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/badges/progress
 * Obtenir la progression vers le prochain badge
 */
exports.getMyProgress = async (req, res) => {
  console.log('📄 badgeController.js ▶ getMyProgress() called');
  try {
    const userId = req.user.id;
    
    const progress = await badgeService.getBadgeProgress(userId);
    
    if (!progress.success) {
      return res.status(400).json({
        success: false,
        error: progress.error,
      });
    }
    
    res.json({
      success: true,
      data: progress,
    });
  } catch (error) {
    console.error('[BadgeController] Erreur getMyProgress:', error);
    res.status(500).json({
      success: false,
      error: 'progress_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/badges/refresh
 * Recalculer et mettre à jour son badge
 */
exports.refreshMyBadge = async (req, res) => {
  console.log('📄 badgeController.js ▶ refreshMyBadge() called');
  try {
    const userId = req.user.id;
    
    const result = await badgeService.updateUserBadge(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
    
    res.json({
      success: true,
      data: {
        badge: result.badge,
        config: result.config,
      },
      message: `Badge mis à jour: ${result.badge}`,
    });
  } catch (error) {
    console.error('[BadgeController] Erreur refreshMyBadge:', error);
    res.status(500).json({
      success: false,
      error: 'refresh_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/badges/service/:serviceType
 * Vérifier si on peut accéder à un service
 */
exports.checkServiceAccess = async (req, res) => {
  console.log('📄 badgeController.js ▶ checkServiceAccess() called');
  try {
    const userId = req.user.id;
    const { serviceType } = req.params;
    
    const access = await badgeService.canAccessService(userId, serviceType);
    
    res.json({
      success: true,
      data: access,
    });
  } catch (error) {
    console.error('[BadgeController] Erreur checkServiceAccess:', error);
    res.status(500).json({
      success: false,
      error: 'access_check_failed',
      message: error.message,
    });
  }
};

// ============================================================================
// ENDPOINTS PUBLICS
// ============================================================================

/**
 * GET /api/badges/all
 * Obtenir tous les badges disponibles
 */
exports.getAllBadges = async (req, res) => {
  console.log('📄 badgeController.js ▶ getAllBadges() called');
  try {
    const badges = badgeService.getAllBadges();
    
    res.json({
      success: true,
      data: badges,
    });
  } catch (error) {
    console.error('[BadgeController] Erreur getAllBadges:', error);
    res.status(500).json({
      success: false,
      error: 'badges_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/badges/config/:level
 * Obtenir la configuration d'un niveau de badge
 */
exports.getBadgeConfig = async (req, res) => {
  console.log('📄 badgeController.js ▶ getBadgeConfig() called');
  try {
    const { level } = req.params;
    
    const config = badgeService.getBadgeConfig(level);
    
    if (!config) {
      return res.status(404).json({
        success: false,
        error: 'badge_not_found',
        message: `Badge "${level}" non trouvé`,
      });
    }
    
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[BadgeController] Erreur getBadgeConfig:', error);
    res.status(500).json({
      success: false,
      error: 'config_failed',
      message: error.message,
    });
  }
};

// ============================================================================
// ENDPOINTS ADMIN
// ============================================================================

/**
 * GET /api/admin/badges/stats
 * Obtenir les stats des badges (admin)
 */
exports.getBadgeStats = async (req, res) => {
  console.log('📄 badgeController.js ▶ getBadgeStats() called');
  try {
    const stats = await Badge.getStats();
    
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[BadgeController] Erreur getBadgeStats:', error);
    res.status(500).json({
      success: false,
      error: 'stats_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/admin/badges/user/:userId
 * Obtenir le badge d'un utilisateur (admin)
 */
exports.getUserBadge = async (req, res) => {
  console.log('📄 badgeController.js ▶ getUserBadge() called');
  try {
    const { userId } = req.params;
    
    const result = await badgeService.calculateBadge(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
    
    const badge = await Badge.findOne({ userId });
    
    res.json({
      success: true,
      data: {
        calculated: result,
        stored: badge,
      },
    });
  } catch (error) {
    console.error('[BadgeController] Erreur getUserBadge:', error);
    res.status(500).json({
      success: false,
      error: 'get_badge_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/admin/badges/user/:userId/update
 * Forcer la mise à jour du badge d'un utilisateur (admin)
 */
exports.forceUpdateBadge = async (req, res) => {
  console.log('📄 badgeController.js ▶ forceUpdateBadge() called');
  try {
    const { userId } = req.params;
    
    const result = await badgeService.updateUserBadge(userId);
    
    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
      });
    }
    
    res.json({
      success: true,
      data: result,
      message: `Badge mis à jour pour l'utilisateur ${userId}`,
    });
  } catch (error) {
    console.error('[BadgeController] Erreur forceUpdateBadge:', error);
    res.status(500).json({
      success: false,
      error: 'update_failed',
      message: error.message,
    });
  }
};

/**
 * POST /api/admin/badges/user/:userId/set
 * Forcer un niveau de badge (admin override)
 */
exports.setUserBadge = async (req, res) => {
  console.log('📄 badgeController.js ▶ setUserBadge() called');
  try {
    const { userId } = req.params;
    const { level, reason } = req.body;
    
    const config = badgeService.getBadgeConfig(level);
    
    if (!config) {
      return res.status(400).json({
        success: false,
        error: 'invalid_level',
        message: `Niveau de badge invalide: ${level}`,
      });
    }
    
    // Override manuel
    const badge = await Badge.getOrCreate(userId);
    
    badge.history.push({
      level,
      earnedAt: new Date(),
      reason: reason || `Admin override by ${req.user.id}`,
    });
    
    badge.level = level;
    badge.icon = config.icon;
    badge.color = config.color;
    badge.earningsBonus = config.earningsBonus;
    badge.benefits = config.benefits;
    badge.earnedAt = new Date();
    
    await badge.save();
    
    res.json({
      success: true,
      data: badge,
      message: `Badge forcé à "${level}" pour l'utilisateur ${userId}`,
    });
  } catch (error) {
    console.error('[BadgeController] Erreur setUserBadge:', error);
    res.status(500).json({
      success: false,
      error: 'set_failed',
      message: error.message,
    });
  }
};

/**
 * GET /api/admin/badges/level/:level
 * Obtenir tous les utilisateurs avec un niveau de badge (admin)
 */
exports.getUsersByBadgeLevel = async (req, res) => {
  console.log('📄 badgeController.js ▶ getUsersByBadgeLevel() called');
  try {
    const { level } = req.params;
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const badges = await Badge.find({ level })
      .populate('userId', 'firstName lastName email avatar rating totalRides')
      .sort({ earnedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    const total = await Badge.countDocuments({ level });
    
    res.json({
      success: true,
      data: badges,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('[BadgeController] Erreur getUsersByBadgeLevel:', error);
    res.status(500).json({
      success: false,
      error: 'get_users_failed',
      message: error.message,
    });
  }
};
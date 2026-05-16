/**
 * ============================================================================
 * GO WITH SALLY - BADGE SERVICE (Backend)
 * ============================================================================
 * Service de gestion des badges pour les conductrices
 *
 * Niveaux de badges:
 * - none: Pas de badge
 * - basic: Badge de base (inscription)
 * - verified: Documents vérifiés
 * - premium: Documents + bonnes stats
 * - elite: Excellence (top conductrices)
 *
 * @module services/badgeService
 * @version 1.0.0
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - All exported function entries

console.log('📄 badgeService.js ▶ Module loaded');

const User = require('../models/User');

// ============================================================================
// CONFIGURATION DES BADGES
// ============================================================================

const BADGE_CONFIGS = {
  none: {
    level: 0,
    name: { fr: 'Aucun', ar: 'لا شيء', en: 'None' },
    icon: '⚪',
    color: '#9CA3AF',
    requirements: {},
    benefits: [],
    earningsBonus: 0,
  },
  basic: {
    level: 1,
    name: { fr: 'Basic', ar: 'أساسي', en: 'Basic' },
    icon: '🔵',
    color: '#3B82F6',
    requirements: {
      emailVerified: true,
      phoneVerified: true,
      genderVerified: true,
    },
    benefits: ['Accès à Sally Standard', 'Accès à Sally Eco'],
    earningsBonus: 0,
  },
  verified: {
    level: 2,
    name: { fr: 'Vérifié', ar: 'موثق', en: 'Verified' },
    icon: '✅',
    color: '#10B981',
    requirements: {
      emailVerified: true,
      phoneVerified: true,
      genderVerified: true,
      faceVerified: true,
      documentsVerified: ['nationalId', 'drivingLicense'],
    },
    benefits: ['Accès à tous les services', 'Badge visible par passagères', 'Priorité dans les demandes'],
    earningsBonus: 0.02, // +2%
  },
  premium: {
    level: 3,
    name: { fr: 'Premium', ar: 'بريميوم', en: 'Premium' },
    icon: '💜',
    color: '#8B5CF6',
    requirements: {
      emailVerified: true,
      phoneVerified: true,
      genderVerified: true,
      faceVerified: true,
      documentsVerified: ['nationalId', 'drivingLicense', 'vehicleRegistration', 'insurance'],
      minRides: 50,
      minRating: 4.5,
    },
    benefits: ['Accès Sally Confort', 'Bonus sur les gains', 'Support prioritaire', 'Badge Premium visible'],
    earningsBonus: 0.05, // +5%
  },
  elite: {
    level: 4,
    name: { fr: 'Elite', ar: 'نخبة', en: 'Elite' },
    icon: '👑',
    color: '#F59E0B',
    requirements: {
      emailVerified: true,
      phoneVerified: true,
      genderVerified: true,
      faceVerified: true,
      documentsVerified: ['nationalId', 'drivingLicense', 'vehicleRegistration', 'insurance'],
      minRides: 200,
      minRating: 4.8,
      minMonthsActive: 6,
    },
    benefits: ['Tous les avantages Premium', 'Bonus Elite +10%', 'Accès aux événements VIP', 'Badge Elite doré'],
    earningsBonus: 0.10, // +10%
  },
};

// Documents requis pour chaque niveau
const REQUIRED_DOCUMENTS = {
  basic: [],
  verified: ['nationalId', 'drivingLicense'],
  premium: ['nationalId', 'drivingLicense', 'vehicleRegistration', 'insurance'],
  elite: ['nationalId', 'drivingLicense', 'vehicleRegistration', 'insurance'],
};

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

const badgeService = {
  /**
   * Calculer le badge d'un utilisateur
   */
  async calculateBadge(userId) {
    const user = await User.findById(userId).select(
      'emailVerified phoneVerified genderVerified faceVerified documents totalRides rating createdAt role'
    );
    
    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé' };
    }
    
    // Admin n'a pas de badge
    if (user.role === 'admin') {
      return { success: true, badge: 'none', reason: 'admin_no_badge' };
    }
    
    // Calculer les documents vérifiés
    const verifiedDocs = (user.documents || [])
      .filter(d => d.status === 'verified')
      .map(d => d.type);
    
    // Calculer les mois d'activité
    const monthsActive = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30)
    );
    
    // Vérifier chaque niveau de badge (du plus haut au plus bas)
    const levels = ['elite', 'premium', 'verified', 'basic', 'none'];
    
    for (const level of levels) {
      const config = BADGE_CONFIGS[level];
      const reqs = config.requirements;
      
      let eligible = true;
      const missingReqs = [];
      
      // Vérifications de base
      if (reqs.emailVerified && !user.emailVerified) {
        eligible = false;
        missingReqs.push('emailVerified');
      }
      if (reqs.phoneVerified && !user.phoneVerified) {
        eligible = false;
        missingReqs.push('phoneVerified');
      }
      if (reqs.genderVerified && !user.genderVerified) {
        eligible = false;
        missingReqs.push('genderVerified');
      }
      if (reqs.faceVerified && !user.faceVerified) {
        eligible = false;
        missingReqs.push('faceVerified');
      }
      
      // Documents
      if (reqs.documentsVerified) {
        for (const docType of reqs.documentsVerified) {
          if (!verifiedDocs.includes(docType)) {
            eligible = false;
            missingReqs.push(`document:${docType}`);
          }
        }
      }
      
      // Stats
      if (reqs.minRides && (user.totalRides || 0) < reqs.minRides) {
        eligible = false;
        missingReqs.push(`minRides:${reqs.minRides}`);
      }
      if (reqs.minRating && (user.rating || 0) < reqs.minRating) {
        eligible = false;
        missingReqs.push(`minRating:${reqs.minRating}`);
      }
      if (reqs.minMonthsActive && monthsActive < reqs.minMonthsActive) {
        eligible = false;
        missingReqs.push(`minMonthsActive:${reqs.minMonthsActive}`);
      }
      
      if (eligible) {
        return {
          success: true,
          badge: level,
          config: BADGE_CONFIGS[level],
          missingForNext: levels.indexOf(level) > 0 
            ? this.getMissingRequirements(user, levels[levels.indexOf(level) - 1])
            : null,
        };
      }
    }
    
    return { success: true, badge: 'none', config: BADGE_CONFIGS.none };
  },
  
  /**
   * Mettre à jour le badge d'un utilisateur
   */
  async updateUserBadge(userId) {
    const result = await this.calculateBadge(userId);
    
    if (!result.success) {
      return result;
    }
    
    const user = await User.findByIdAndUpdate(
      userId,
      {
        'badge.level': result.badge,
        'badge.icon': result.config.icon,
        'badge.color': result.config.color,
        'badge.earnedAt': new Date(),
        'badge.earningsBonus': result.config.earningsBonus,
        'badge.benefits': result.config.benefits,
      },
      { new: true }
    );
    
    console.log(`[BadgeService] 🏅 Badge mis à jour pour ${userId}: ${result.badge}`);
    
    return {
      success: true,
      badge: result.badge,
      config: result.config,
      user: {
        id: user._id,
        badge: user.badge,
      },
    };
  },
  
  /**
   * Obtenir les requirements manquants pour un niveau
   */
  getMissingRequirements(user, targetLevel) {
    const config = BADGE_CONFIGS[targetLevel];
    if (!config) return null;
    
    const reqs = config.requirements;
    const missing = [];
    
    const verifiedDocs = (user.documents || [])
      .filter(d => d.status === 'verified')
      .map(d => d.type);
    
    if (reqs.emailVerified && !user.emailVerified) missing.push({ type: 'emailVerified', label: 'Email vérifié' });
    if (reqs.phoneVerified && !user.phoneVerified) missing.push({ type: 'phoneVerified', label: 'Téléphone vérifié' });
    if (reqs.genderVerified && !user.genderVerified) missing.push({ type: 'genderVerified', label: 'Genre vérifié' });
    if (reqs.faceVerified && !user.faceVerified) missing.push({ type: 'faceVerified', label: 'Visage enregistré' });
    
    if (reqs.documentsVerified) {
      for (const docType of reqs.documentsVerified) {
        if (!verifiedDocs.includes(docType)) {
          missing.push({ type: 'document', docType, label: `Document: ${docType}` });
        }
      }
    }
    
    if (reqs.minRides && (user.totalRides || 0) < reqs.minRides) {
      missing.push({ type: 'minRides', required: reqs.minRides, current: user.totalRides || 0 });
    }
    if (reqs.minRating && (user.rating || 0) < reqs.minRating) {
      missing.push({ type: 'minRating', required: reqs.minRating, current: user.rating || 0 });
    }
    
    return missing;
  },
  
  /**
   * Obtenir la progression vers le prochain badge
   */
  async getBadgeProgress(userId) {
    const result = await this.calculateBadge(userId);
    if (!result.success) return result;
    
    const currentLevel = result.badge;
    const levels = ['none', 'basic', 'verified', 'premium', 'elite'];
    const currentIndex = levels.indexOf(currentLevel);
    
    if (currentIndex >= levels.length - 1) {
      return {
        success: true,
        currentBadge: currentLevel,
        nextBadge: null,
        isMaxLevel: true,
        progress: 100,
      };
    }
    
    const nextLevel = levels[currentIndex + 1];
    const missing = result.missingForNext || [];
    const nextConfig = BADGE_CONFIGS[nextLevel];
    
    // Calculer la progression
    const totalReqs = Object.keys(nextConfig.requirements).length;
    const completedReqs = totalReqs - missing.length;
    const progress = Math.round((completedReqs / totalReqs) * 100);
    
    return {
      success: true,
      currentBadge: currentLevel,
      currentConfig: BADGE_CONFIGS[currentLevel],
      nextBadge: nextLevel,
      nextConfig: BADGE_CONFIGS[nextLevel],
      missingRequirements: missing,
      progress,
      isMaxLevel: false,
    };
  },
  
  /**
   * Obtenir la configuration d'un badge
   */
  getBadgeConfig(level) {
    return BADGE_CONFIGS[level] || null;
  },
  
  /**
   * Obtenir tous les badges
   */
  getAllBadges() {
    return Object.entries(BADGE_CONFIGS).map(([level, config]) => ({
      level,
      ...config,
    }));
  },
  
  /**
   * Vérifier si un utilisateur peut accéder à un service
   */
  async canAccessService(userId, serviceType) {
    const result = await this.calculateBadge(userId);
    if (!result.success) return { canAccess: false, reason: 'error' };
    
    const badge = result.badge;
    
    // Mapping service -> badge minimum requis
    const serviceRequirements = {
      sally_eco: 'basic',
      sally_standard: 'basic',
      sally_confort: 'premium',
      sally_pool: 'basic',
    };
    
    const requiredBadge = serviceRequirements[serviceType];
    if (!requiredBadge) return { canAccess: true, reason: 'unknown_service' };
    
    const levels = ['none', 'basic', 'verified', 'premium', 'elite'];
    const userLevel = levels.indexOf(badge);
    const requiredLevel = levels.indexOf(requiredBadge);
    
    if (userLevel >= requiredLevel) {
      return { canAccess: true, badge, serviceType };
    }
    
    return {
      canAccess: false,
      reason: 'badge_too_low',
      currentBadge: badge,
      requiredBadge,
      serviceType,
    };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = badgeService;
module.exports.BADGE_CONFIGS = BADGE_CONFIGS;
module.exports.REQUIRED_DOCUMENTS = REQUIRED_DOCUMENTS;

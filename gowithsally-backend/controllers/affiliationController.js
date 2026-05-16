/**
 * ============================================================================
 * GO WITH SALLY - AFFILIATION CONTROLLER
 * ============================================================================
 * Contrôleur pour les endpoints du système d'affiliation
 * Gère les ambassadeurs, influenceurs et partenaires
 *
 * @module controllers/affiliationController
 * @version 1.0.0
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - All exported function entries

console.log('📄 affiliationController.js ▶ Module loaded');

const Affiliation = require('../models/Affiliation');
const User = require('../models/User');
const logger = require('../utils/logger');

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique affiliation code
 */
const generateAffiliationCode = async (userName) => {
  const baseCode = userName.substring(0, 4).toUpperCase();
  let code = baseCode;
  let counter = 1;

  while (await Affiliation.findOne({ code })) {
    code = `${baseCode}${counter}`;
    counter++;
  }

  return code;
};

/**
 * Calculate commission based on rides
 */
const calculateCommission = (amount, commissionRate) => {
  return (amount * (commissionRate / 100)).toFixed(2);
};

// ============================================================================
// PUBLIC ENDPOINTS
// ============================================================================

/**
 * POST /api/affiliations/apply
 * Apply to become an affiliate
 */
exports.applyForAffiliation = async (req, res) => {
  try {
    const { userId } = req.user;
    const { type, socialFollowers = 0, website = '' } = req.body;

    // Validate input
    if (!type || !['ambassador', 'influencer', 'partner'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'invalid_type',
        message: 'Type d\'affiliation invalide (ambassador, influencer, partner)'
      });
    }

    // Check if user already has affiliation
    const existingAffiliation = await Affiliation.findOne({ affiliateUser: userId });
    if (existingAffiliation) {
      return res.status(409).json({
        success: false,
        error: 'already_affiliated',
        message: 'L\'utilisateur est déjà affilié'
      });
    }

    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Utilisateur non trouvé'
      });
    }

    // Generate affiliation code
    const code = await generateAffiliationCode(user.firstName || 'USER');

    // Create affiliation with pending status
    const affiliation = new Affiliation({
      affiliateUser: userId,
      code,
      type,
      status: 'pending',
      applicationDate: new Date(),
      socialFollowers,
      website
    });

    await affiliation.save();

    res.status(201).json({
      success: true,
      message: 'Candidature d\'affiliation soumise avec succès',
      data: {
        id: affiliation._id,
        code,
        status: affiliation.status,
        type: affiliation.type,
        appliedAt: affiliation.applicationDate
      }
    });

    logger.info(`[Affiliation] New application from ${user.firstName} ${user.lastName} (${type})`);
  } catch (error) {
    logger.error('[affiliationController] applyForAffiliation error:', error);
    res.status(500).json({
      success: false,
      error: 'application_failed',
      message: error.message
    });
  }
};

/**
 * GET /api/affiliations/my
 * Get current user's affiliation stats
 */
exports.getMyAffiliationStats = async (req, res) => {
  try {
    const { userId } = req.user;

    const affiliation = await Affiliation.findOne({ affiliateUser: userId })
      .select('-__v')
      .lean();

    if (!affiliation) {
      return res.status(404).json({
        success: false,
        error: 'no_affiliation',
        message: 'L\'utilisateur n\'est pas affilié'
      });
    }

    res.json({
      success: true,
      data: {
        ...affiliation,
        conversionRate: affiliation.totalReferrals > 0
          ? (affiliation.successfulReferrals / affiliation.totalReferrals * 100).toFixed(2) + '%'
          : '0%'
      }
    });
  } catch (error) {
    logger.error('[affiliationController] getMyAffiliationStats error:', error);
    res.status(500).json({
      success: false,
      error: 'stats_failed',
      message: error.message
    });
  }
};

/**
 * GET /api/affiliations/:id/stats
 * Get specific affiliate's public stats
 */
exports.getAffiliateStats = async (req, res) => {
  try {
    const { id } = req.params;

    const affiliation = await Affiliation.findById(id)
      .select('code type successfulReferrals totalRides totalEarnings status')
      .lean();

    if (!affiliation) {
      return res.status(404).json({
        success: false,
        error: 'affiliate_not_found',
        message: 'Affilié non trouvé'
      });
    }

    if (affiliation.status !== 'active') {
      return res.status(403).json({
        success: false,
        error: 'affiliate_inactive',
        message: 'Cet affilié n\'est pas actif'
      });
    }

    res.json({
      success: true,
      data: {
        affiliateId: affiliation._id,
        code: affiliation.code,
        type: affiliation.type,
        successfulReferrals: affiliation.successfulReferrals,
        totalRides: affiliation.totalRides,
        totalEarnings: affiliation.totalEarnings
      }
    });
  } catch (error) {
    logger.error('[affiliationController] getAffiliateStats error:', error);
    res.status(500).json({
      success: false,
      error: 'stats_failed',
      message: error.message
    });
  }
};

/**
 * POST /api/affiliations/track/:code
 * Track a referral click/signup
 */
exports.trackReferral = async (req, res) => {
  try {
    const { code } = req.params;
    const { userId } = req.body;

    const affiliation = await Affiliation.findOne({ code, status: 'active' });

    if (!affiliation) {
      return res.status(404).json({
        success: false,
        error: 'code_not_found',
        message: 'Code d\'affiliation invalide ou inactif'
      });
    }

    // Check if user already tracked with this code
    const userExists = affiliation.referredUsers?.includes(userId);
    if (!userExists) {
      affiliation.totalReferrals += 1;
      if (!affiliation.referredUsers) affiliation.referredUsers = [];
      affiliation.referredUsers.push(userId);
    }

    await affiliation.save();

    res.json({
      success: true,
      message: 'Parrainage enregistré',
      data: {
        affiliateCode: code,
        referralId: userId
      }
    });

    logger.info(`[Affiliation] Referral tracked: ${code} -> ${userId}`);
  } catch (error) {
    logger.error('[affiliationController] trackReferral error:', error);
    res.status(500).json({
      success: false,
      error: 'track_failed',
      message: error.message
    });
  }
};

// ============================================================================
// ADMIN ENDPOINTS
// ============================================================================

/**
 * POST /api/affiliations
 * Create new affiliate (admin only)
 */
exports.createAffiliation = async (req, res) => {
  try {
    const { userId, type, commissionRate = 10 } = req.body;

    // Validate
    if (!userId || !type) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'userId et type sont requis'
      });
    }

    // Check user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'user_not_found',
        message: 'Utilisateur non trouvé'
      });
    }

    // Check not already affiliated
    const existing = await Affiliation.findOne({ affiliateUser: userId });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'already_affiliated',
        message: 'Utilisateur déjà affilié'
      });
    }

    // Generate code
    const code = await generateAffiliationCode(user.firstName || 'USER');

    // Create affiliation
    const affiliation = new Affiliation({
      affiliateUser: userId,
      code,
      type,
      commissionRate,
      status: 'active',
      approvedAt: new Date(),
      approvedBy: req.user.userId
    });

    await affiliation.save();

    res.status(201).json({
      success: true,
      message: 'Affilié créé avec succès',
      data: {
        id: affiliation._id,
        code,
        type,
        commissionRate,
        status: affiliation.status
      }
    });

    logger.info(`[Affiliation] New affiliate created: ${user.firstName} ${user.lastName} (${code})`);
  } catch (error) {
    logger.error('[affiliationController] createAffiliation error:', error);
    res.status(500).json({
      success: false,
      error: 'creation_failed',
      message: error.message
    });
  }
};

/**
 * GET /api/affiliations
 * List all affiliates (admin only)
 */
exports.listAffiliates = async (req, res) => {
  try {
    const { status = 'all', type, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    let query = {};
    if (status !== 'all') query.status = status;
    if (type) query.type = type;

    const affiliates = await Affiliation.find(query)
      .populate('affiliateUser', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Affiliation.countDocuments(query);

    res.json({
      success: true,
      data: affiliates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('[affiliationController] listAffiliates error:', error);
    res.status(500).json({
      success: false,
      error: 'list_failed',
      message: error.message
    });
  }
};

/**
 * PUT /api/affiliations/:id/approve
 * Approve affiliate application (admin only)
 */
exports.approveAffiliation = async (req, res) => {
  try {
    const { id } = req.params;
    const { commissionRate } = req.body;

    const affiliation = await Affiliation.findById(id);

    if (!affiliation) {
      return res.status(404).json({
        success: false,
        error: 'affiliate_not_found',
        message: 'Affilié non trouvé'
      });
    }

    // Update affiliation
    affiliation.status = 'active';
    affiliation.approvedAt = new Date();
    affiliation.approvedBy = req.user.userId;

    if (commissionRate) {
      affiliation.commissionRate = Math.min(Math.max(commissionRate, 0), 100);
    }

    await affiliation.save();

    res.json({
      success: true,
      message: 'Affilié approuvé avec succès',
      data: {
        id: affiliation._id,
        code: affiliation.code,
        status: affiliation.status,
        commissionRate: affiliation.commissionRate,
        approvedAt: affiliation.approvedAt
      }
    });

    logger.info(`[Affiliation] Approved: ${affiliation.code}`);
  } catch (error) {
    logger.error('[affiliationController] approveAffiliation error:', error);
    res.status(500).json({
      success: false,
      error: 'approval_failed',
      message: error.message
    });
  }
};

/**
 * PUT /api/affiliations/:id/reject
 * Reject affiliate application (admin only)
 */
exports.rejectAffiliation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const affiliation = await Affiliation.findById(id);

    if (!affiliation) {
      return res.status(404).json({
        success: false,
        error: 'affiliate_not_found',
        message: 'Affilié non trouvé'
      });
    }

    affiliation.status = 'rejected';
    affiliation.rejectionReason = reason || 'Aucune raison fournie';
    affiliation.rejectedAt = new Date();
    affiliation.rejectedBy = req.user.userId;

    await affiliation.save();

    res.json({
      success: true,
      message: 'Candidature rejetée',
      data: {
        id: affiliation._id,
        status: affiliation.status,
        rejectedAt: affiliation.rejectedAt
      }
    });

    logger.info(`[Affiliation] Rejected: ${affiliation.code}`);
  } catch (error) {
    logger.error('[affiliationController] rejectAffiliation error:', error);
    res.status(500).json({
      success: false,
      error: 'rejection_failed',
      message: error.message
    });
  }
};

/**
 * PUT /api/affiliations/:id/suspend
 * Suspend affiliate account (admin only)
 */
exports.suspendAffiliation = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const affiliation = await Affiliation.findById(id);

    if (!affiliation) {
      return res.status(404).json({
        success: false,
        error: 'affiliate_not_found',
        message: 'Affilié non trouvé'
      });
    }

    affiliation.status = 'suspended';
    affiliation.suspensionReason = reason || 'Non spécifiée';
    affiliation.suspendedAt = new Date();
    affiliation.suspendedBy = req.user.userId;

    await affiliation.save();

    res.json({
      success: true,
      message: 'Affilié suspendu',
      data: {
        id: affiliation._id,
        status: affiliation.status,
        suspendedAt: affiliation.suspendedAt
      }
    });

    logger.info(`[Affiliation] Suspended: ${affiliation.code}`);
  } catch (error) {
    logger.error('[affiliationController] suspendAffiliation error:', error);
    res.status(500).json({
      success: false,
      error: 'suspension_failed',
      message: error.message
    });
  }
};

module.exports = exports;

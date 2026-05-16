/**
 * ============================================================================
 * GO WITH SALLY - ADMIN CONTROLLER
 * ============================================================================
 * Contrôleur pour l'administration du système
 * Gère les utilisateurs, conductrices, vérifications et analyses
 * ============================================================================
 */

console.log('[adminController.js] Fichier chargé');

const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Claim = require('../models/Claim');
const Affiliation = require('../models/Affiliation');

console.log('[adminController.js] Dépendances importées');

// ============================================================================
// DASHBOARD STATISTICS
// ============================================================================

/**
 * Obtenir les statistiques du tableau de bord
 * @route GET /api/admin/dashboard
 */
exports.getDashboard = async (req, res) => {
  console.log('[adminController.js] ▶ getDashboard() appelé');

  try {
    // Récupérer les statistiques en parallèle
    const [
      totalUsers,
      totalDrivers,
      totalRides,
      pendingDrivers,
      pendingClaims,
      activeRides,
      driversByStatus,
      ridesByStatus
    ] = await Promise.all([
      User.countDocuments({ role: 'user' }),
      Driver.countDocuments(),
      Ride.countDocuments(),
      Driver.countDocuments({ status: 'pending_verification' }),
      Claim.countDocuments({ status: { $ne: 'resolved' } }),
      Ride.countDocuments({ status: { $in: ['searching', 'driver_assigned', 'in_progress'] } }),
      Driver.countByStatus(),
      Ride.countByStatus()
    ]);

    // Calculer le revenu
    const completedRides = await Ride.find({ status: 'completed' })
      .select('pricing.finalFare');

    const totalRevenue = completedRides.reduce((sum, ride) =>
      sum + (ride.pricing?.finalFare || 0), 0
    );

    console.log('[adminController.js] ✓ Dashboard stats calculées');

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers
        },
        drivers: {
          total: totalDrivers,
          byStatus: driversByStatus,
          pendingVerification: pendingDrivers
        },
        rides: {
          total: totalRides,
          active: activeRides,
          byStatus: ridesByStatus
        },
        claims: {
          pending: pendingClaims
        },
        revenue: {
          total: Math.round(totalRevenue * 100) / 100,
          currency: 'MAD'
        }
      }
    });

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur getDashboard:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur lors de la récupération'
    });
  }
};

// ============================================================================
// PENDING DRIVERS
// ============================================================================

/**
 * Lister les conductrices en attente de vérification
 * @route GET /api/admin/drivers/pending
 */
exports.getPendingDrivers = async (req, res) => {
  console.log('[adminController.js] ▶ getPendingDrivers() appelé');

  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [drivers, total] = await Promise.all([
      Driver.find({ status: { $in: ['pending_documents', 'pending_verification'] } })
        .populate('user', 'firstName lastName email phone avatar')
        .sort({ statusUpdatedAt: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Driver.countDocuments({ status: { $in: ['pending_documents', 'pending_verification'] } })
    ]);

    console.log('[adminController.js] ✓ Conductrices en attente:', drivers.length);

    res.status(200).json({
      success: true,
      data: {
        drivers: drivers.map(driver => ({
          id: driver._id,
          name: `${driver.user?.firstName} ${driver.user?.lastName}`,
          email: driver.user?.email,
          phone: driver.user?.phone,
          avatar: driver.user?.avatar,
          status: driver.status,
          documentsProgress: driver.documentsProgress,
          documents: {
            nationalId: driver.documents?.nationalId?.verified ? 'verified' : 'pending',
            drivingLicense: driver.documents?.drivingLicense?.verified ? 'verified' : 'pending',
            profilePhoto: driver.documents?.profilePhoto?.verified ? 'verified' : 'pending',
            registration: driver.vehicle?.registration?.verified ? 'verified' : 'pending',
            insurance: driver.vehicle?.insurance?.verified ? 'verified' : 'pending'
          },
          vehicle: {
            brand: driver.vehicle?.brand,
            model: driver.vehicle?.model,
            plateNumber: driver.vehicle?.plateNumber
          },
          statusUpdatedAt: driver.statusUpdatedAt,
          createdAt: driver.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur getPendingDrivers:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

// ============================================================================
// VERIFY DRIVER
// ============================================================================

/**
 * Approuver/Rejeter une conductrice
 * @route PUT /api/admin/drivers/:driverId/verify
 */
exports.verifyDriver = async (req, res) => {
  console.log('[adminController.js] ▶ verifyDriver() appelé');

  try {
    const { driverId } = req.params;
    const { action, reason } = req.body;

    // Validation
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action invalide (approve ou reject)'
      });
    }

    const driver = await Driver.findById(driverId).populate('user');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Conductrice non trouvée'
      });
    }

    if (action === 'approve') {
      driver.status = 'approved';
      driver.statusReason = null;
      console.log('[adminController.js] ✓ Conductrice approuvée:', driver.user?.firstName);
    } else {
      driver.status = 'rejected';
      driver.statusReason = reason || 'Rejetée par l\'administrateur';
      console.log('[adminController.js] ✓ Conductrice rejetée');
    }

    driver.statusUpdatedAt = new Date();
    await driver.save();

    res.status(200).json({
      success: true,
      message: `Conductrice ${action === 'approve' ? 'approuvée' : 'rejetée'}`,
      data: {
        driverId: driver._id,
        status: driver.status,
        reason: driver.statusReason
      }
    });

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur verifyDriver:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

// ============================================================================
// VIEW DRIVER DOCUMENTS
// ============================================================================

/**
 * Voir les documents d'une conductrice
 * @route GET /api/admin/drivers/:driverId/documents
 */
exports.getDriverDocuments = async (req, res) => {
  console.log('[adminController.js] ▶ getDriverDocuments() appelé');

  try {
    const { driverId } = req.params;

    const driver = await Driver.findById(driverId).populate('user', 'firstName lastName');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Conductrice non trouvée'
      });
    }

    console.log('[adminController.js] ✓ Documents récupérés');

    res.status(200).json({
      success: true,
      data: {
        driverId: driver._id,
        name: `${driver.user?.firstName} ${driver.user?.lastName}`,
        documents: {
          nationalId: {
            front: driver.documents?.nationalId?.front,
            back: driver.documents?.nationalId?.back,
            number: driver.documents?.nationalId?.number,
            expiryDate: driver.documents?.nationalId?.expiryDate,
            verified: driver.documents?.nationalId?.verified,
            verifiedAt: driver.documents?.nationalId?.verifiedAt
          },
          drivingLicense: {
            front: driver.documents?.drivingLicense?.front,
            back: driver.documents?.drivingLicense?.back,
            number: driver.documents?.drivingLicense?.number,
            category: driver.documents?.drivingLicense?.category,
            expiryDate: driver.documents?.drivingLicense?.expiryDate,
            verified: driver.documents?.drivingLicense?.verified,
            verifiedAt: driver.documents?.drivingLicense?.verifiedAt
          },
          profilePhoto: {
            url: driver.documents?.profilePhoto?.url,
            verified: driver.documents?.profilePhoto?.verified,
            verifiedAt: driver.documents?.profilePhoto?.verifiedAt
          },
          anthropometricRecord: {
            file: driver.documents?.anthropometricRecord?.file,
            verified: driver.documents?.anthropometricRecord?.verified,
            verifiedAt: driver.documents?.anthropometricRecord?.verifiedAt
          }
        },
        vehicle: {
          registration: {
            file: driver.vehicle?.registration?.file,
            expiryDate: driver.vehicle?.registration?.expiryDate,
            verified: driver.vehicle?.registration?.verified
          },
          insurance: {
            file: driver.vehicle?.insurance?.file,
            expiryDate: driver.vehicle?.insurance?.expiryDate,
            verified: driver.vehicle?.insurance?.verified
          },
          technicalInspection: {
            file: driver.vehicle?.technicalInspection?.file,
            expiryDate: driver.vehicle?.technicalInspection?.expiryDate,
            verified: driver.vehicle?.technicalInspection?.verified
          }
        }
      }
    });

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur getDriverDocuments:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

// ============================================================================
// VERIFY DOCUMENT
// ============================================================================

/**
 * Vérifier un document spécifique
 * @route PUT /api/admin/documents/:documentType/verify
 */
exports.verifyDocument = async (req, res) => {
  console.log('[adminController.js] ▶ verifyDocument() appelé');

  try {
    const { driverId } = req.params;
    const { documentType, verified, reason } = req.body;

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Conductrice non trouvée'
      });
    }

    // Mettre à jour le document
    const docPath = getDocumentPath(documentType);

    if (docPath) {
      eval(`driver.${docPath}.verified = ${verified}`);
      if (verified) {
        eval(`driver.${docPath}.verifiedAt = new Date()`);
        eval(`driver.${docPath}.verifiedBy = req.user._id`);
      }

      await driver.save();

      console.log('[adminController.js] ✓ Document vérifié:', documentType);

      res.status(200).json({
        success: true,
        message: 'Document mis à jour',
        data: {
          driverId: driver._id,
          documentType,
          verified,
          documentsProgress: driver.documentsProgress
        }
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Type de document invalide'
      });
    }

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur verifyDocument:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

// ============================================================================
// CLAIMS MANAGEMENT
// ============================================================================

/**
 * Lister toutes les réclamations
 * @route GET /api/admin/claims
 */
exports.getClaims = async (req, res) => {
  console.log('[adminController.js] ▶ getClaims() appelé');

  try {
    const { page = 1, limit = 20, status = null, priority = null } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const [claims, total] = await Promise.all([
      Claim.find(query)
        .populate('user', 'firstName lastName email phone')
        .populate('driver', 'user')
        .populate('ride', 'rideNumber')
        .sort({ priority: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Claim.countDocuments(query)
    ]);

    console.log('[adminController.js] ✓ Réclamations récupérées:', claims.length);

    res.status(200).json({
      success: true,
      data: {
        claims: claims.map(claim => ({
          id: claim._id,
          claimNumber: claim.claimNumber,
          type: claim.type,
          status: claim.status,
          priority: claim.priority,
          description: claim.description,
          user: {
            name: claim.user?.firstName,
            email: claim.user?.email,
            phone: claim.user?.phone
          },
          ride: claim.ride?.rideNumber,
          assignedTo: claim.assignedTo,
          createdAt: claim.createdAt,
          daysOpen: claim.daysOpen
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur getClaims:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

/**
 * Résoudre une réclamation
 * @route PUT /api/admin/claims/:claimId/resolve
 */
exports.resolveClaim = async (req, res) => {
  console.log('[adminController.js] ▶ resolveClaim() appelé');

  try {
    const { claimId } = req.params;
    const { action, resolution } = req.body;

    const claim = await Claim.findById(claimId);

    if (!claim) {
      return res.status(404).json({
        success: false,
        message: 'Réclamation non trouvée'
      });
    }

    if (action === 'resolve') {
      await claim.resolve(resolution, req.user._id);
      console.log('[adminController.js] ✓ Réclamation résolue');
    } else if (action === 'dismiss') {
      await claim.dismiss(req.user._id);
      console.log('[adminController.js] ✓ Réclamation rejetée');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Action invalide'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Réclamation mise à jour',
      data: {
        claimId: claim._id,
        status: claim.status,
        resolution: claim.resolution
      }
    });

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur resolveClaim:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

// ============================================================================
// USERS MANAGEMENT
// ============================================================================

/**
 * Lister tous les utilisateurs
 * @route GET /api/admin/users
 */
exports.getUsers = async (req, res) => {
  console.log('[adminController.js] ▶ getUsers() appelé');

  try {
    const { page = 1, limit = 20, search = null } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { role: 'user' };
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments(query)
    ]);

    console.log('[adminController.js] ✓ Utilisateurs récupérés:', users.length);

    res.status(200).json({
      success: true,
      data: {
        users: users.map(user => ({
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          phone: user.phone,
          avatar: user.avatar,
          status: user.status,
          createdAt: user.createdAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur getUsers:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

/**
 * Bannir un utilisateur
 * @route DELETE /api/admin/users/:userId/ban
 */
exports.banUser = async (req, res) => {
  console.log('[adminController.js] ▶ banUser() appelé');

  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    user.status = 'banned';
    user.banReason = reason || 'Banni par l\'administrateur';
    user.bannedAt = new Date();

    await user.save();

    console.log('[adminController.js] ✓ Utilisateur banni:', user.email);

    res.status(200).json({
      success: true,
      message: 'Utilisateur banni',
      data: {
        userId: user._id,
        status: user.status,
        reason: user.banReason
      }
    });

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur banUser:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

// ============================================================================
// ANALYTICS
// ============================================================================

/**
 * Obtenir les analyses détaillées
 * @route GET /api/admin/analytics
 */
exports.getAnalytics = async (req, res) => {
  console.log('[adminController.js] ▶ getAnalytics() appelé');

  try {
    const { startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), endDate = new Date() } = req.query;

    const stats = await Ride.getStats(new Date(startDate), new Date(endDate));

    console.log('[adminController.js] ✓ Analytics calculées');

    res.status(200).json({
      success: true,
      data: {
        period: {
          startDate: new Date(startDate),
          endDate: new Date(endDate)
        },
        statistics: {
          totalRides: stats.totalRides || 0,
          completedRides: stats.completedRides || 0,
          cancelledRides: stats.cancelledRides || 0,
          totalRevenue: stats.totalRevenue || 0,
          totalDistance: stats.totalDistance || 0,
          avgRating: stats.avgRating || 0
        }
      }
    });

  } catch (error) {
    console.log('[adminController.js] ❌ Erreur getAnalytics:', error.message);

    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
};

// ============================================================================
// HELPERS
// ============================================================================

function getDocumentPath(documentType) {
  const paths = {
    'nationalId': 'documents.nationalId',
    'drivingLicense': 'documents.drivingLicense',
    'profilePhoto': 'documents.profilePhoto',
    'registration': 'vehicle.registration',
    'insurance': 'vehicle.insurance',
    'technicalInspection': 'vehicle.technicalInspection'
  };

  return paths[documentType];
}

console.log('[adminController.js] ✅ Contrôleur exporté');

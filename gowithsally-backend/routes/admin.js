/**
 * ============================================================================
 * GO WITH SALLY - ADMIN ROUTES
 * ============================================================================
 * Routes pour l'administration
 * Toutes les routes nécessitent une authentification admin
 * ============================================================================
 */

const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const { protect, admin } = require('../middleware/auth');

// ============================================================================
// MIDDLEWARE - Toutes les routes admin nécessitent auth + role admin
// ============================================================================

router.use(protect);
router.use(admin);

// ============================================================================
// DASHBOARD STATS
// ============================================================================

/**
 * @route   GET /api/admin/dashboard
 * @desc    Récupérer les statistiques du dashboard
 * @access  Admin
 */
router.get('/dashboard', async (req, res) => {
  try {
    console.log('📊 [Admin] GET /dashboard');

    // Compter les utilisateurs
    const totalUsers = await User.countDocuments({ role: 'user' });
    
    // Compter les conductrices
    const totalDrivers = await User.countDocuments({ role: 'driver' });
    
    // Compter les courses
    const totalRides = await Ride.countDocuments();
    
    // Courses actives
    const activeRides = await Ride.countDocuments({ 
      status: { $in: ['searching', 'accepted', 'arriving', 'in_progress'] } 
    });
    
    // Vérifications en attente
    const pendingVerifications = await Driver.countDocuments({ 
      'verification.status': 'pending' 
    });

    // Revenus du jour
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayRides = await Ride.find({
      status: 'completed',
      completedAt: { $gte: today }
    });
    
    const todayRevenue = todayRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);

    // Revenus de la semaine
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    
    const weekRides = await Ride.find({
      status: 'completed',
      completedAt: { $gte: weekStart }
    });
    
    const weekRevenue = weekRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);

    // Revenus du mois
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    const monthRides = await Ride.find({
      status: 'completed',
      completedAt: { $gte: monthStart }
    });
    
    const monthRevenue = monthRides.reduce((sum, ride) => sum + (ride.fare || 0), 0);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalDrivers,
        totalRides,
        activeRides,
        pendingVerifications,
        revenue: {
          today: todayRevenue,
          week: weekRevenue,
          month: monthRevenue,
        },
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Dashboard error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// USERS MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/users
 * @desc    Récupérer la liste des utilisateurs
 * @access  Admin
 */
router.get('/users', async (req, res) => {
  try {
    console.log('👥 [Admin] GET /users');

    const { page = 1, limit = 20, search, status, sort = '-createdAt' } = req.query;

    const query = { role: 'user' };

    // Recherche
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Filtrer par statut
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'blocked') {
      query.isActive = false;
    }

    const users = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Get users error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/users/:id
 * @desc    Récupérer un utilisateur par ID
 * @access  Admin
 */
router.get('/users/:id', async (req, res) => {
  try {
    console.log('👤 [Admin] GET /users/:id', req.params.id);

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    // Récupérer les stats de courses
    const ridesCount = await Ride.countDocuments({ user: user._id });
    const completedRides = await Ride.countDocuments({ user: user._id, status: 'completed' });

    res.json({
      success: true,
      data: {
        user,
        stats: {
          totalRides: ridesCount,
          completedRides,
        },
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Get user error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/users/:id
 * @desc    Modifier un utilisateur
 * @access  Admin
 */
router.put('/users/:id', async (req, res) => {
  try {
    console.log('✏️ [Admin] PUT /users/:id', req.params.id);

    const { firstName, lastName, phone, isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { firstName, lastName, phone, isActive },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('❌ [Admin] Update user error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/admin/users/:id/block
 * @desc    Bloquer/Débloquer un utilisateur
 * @access  Admin
 */
router.post('/users/:id/block', async (req, res) => {
  try {
    console.log('🚫 [Admin] POST /users/:id/block', req.params.id);

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur non trouvé' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      success: true,
      message: user.isActive ? 'Utilisateur débloqué' : 'Utilisateur bloqué',
      data: { isActive: user.isActive },
    });
  } catch (error) {
    console.error('❌ [Admin] Block user error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// DRIVERS MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/drivers
 * @desc    Récupérer la liste des conductrices
 * @access  Admin
 */
router.get('/drivers', async (req, res) => {
  try {
    console.log('🚗 [Admin] GET /drivers');

    const { page = 1, limit = 20, search, status, sort = '-createdAt' } = req.query;

    const query = { role: 'driver' };

    // Recherche
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Filtrer par statut
    if (status === 'active') {
      query.isActive = true;
      query.isVerified = true;
    } else if (status === 'pending') {
      query.isVerified = false;
    } else if (status === 'blocked') {
      query.isActive = false;
    }

    const drivers = await User.find(query)
      .select('-password')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Enrichir avec les données Driver
    const enrichedDrivers = await Promise.all(
      drivers.map(async (user) => {
        const driverData = await Driver.findOne({ user: user._id });
        return {
          ...user.toObject(),
          driverInfo: driverData,
        };
      })
    );

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        drivers: enrichedDrivers,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Get drivers error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/drivers/:id
 * @desc    Récupérer une conductrice par ID
 * @access  Admin
 */
router.get('/drivers/:id', async (req, res) => {
  try {
    console.log('🚗 [Admin] GET /drivers/:id', req.params.id);

    const user = await User.findById(req.params.id).select('-password');

    if (!user || user.role !== 'driver') {
      return res.status(404).json({ success: false, message: 'Conductrice non trouvée' });
    }

    const driverData = await Driver.findOne({ user: user._id });

    // Stats
    const ridesCount = await Ride.countDocuments({ driver: user._id });
    const completedRides = await Ride.countDocuments({ driver: user._id, status: 'completed' });
    
    const earnings = await Ride.aggregate([
      { $match: { driver: user._id, status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$fare' } } }
    ]);

    res.json({
      success: true,
      data: {
        driver: {
          ...user.toObject(),
          driverInfo: driverData,
        },
        stats: {
          totalRides: ridesCount,
          completedRides,
          totalEarnings: earnings[0]?.total || 0,
        },
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Get driver error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/admin/drivers/:id/block
 * @desc    Bloquer/Débloquer une conductrice
 * @access  Admin
 */
router.post('/drivers/:id/block', async (req, res) => {
  try {
    console.log('🚫 [Admin] POST /drivers/:id/block', req.params.id);

    const user = await User.findById(req.params.id);

    if (!user || user.role !== 'driver') {
      return res.status(404).json({ success: false, message: 'Conductrice non trouvée' });
    }

    user.isActive = !user.isActive;
    await user.save();

    // Mettre aussi à jour le profil driver
    await Driver.findOneAndUpdate(
      { user: user._id },
      { isActive: user.isActive, isOnline: false }
    );

    res.json({
      success: true,
      message: user.isActive ? 'Conductrice débloquée' : 'Conductrice bloquée',
      data: { isActive: user.isActive },
    });
  } catch (error) {
    console.error('❌ [Admin] Block driver error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// VERIFICATIONS
// ============================================================================

/**
 * @route   GET /api/admin/verifications
 * @desc    Récupérer les vérifications en attente
 * @access  Admin
 */
router.get('/verifications', async (req, res) => {
  try {
    console.log('📋 [Admin] GET /verifications');

    const { status = 'pending', page = 1, limit = 20 } = req.query;

    const query = {};
    
    if (status === 'pending') {
      query['verification.status'] = 'pending';
    } else if (status === 'approved') {
      query['verification.status'] = 'approved';
    } else if (status === 'rejected') {
      query['verification.status'] = 'rejected';
    }

    const drivers = await Driver.find(query)
      .populate('user', 'firstName lastName email phone avatar createdAt')
      .sort('-createdAt')
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Driver.countDocuments(query);

    res.json({
      success: true,
      data: {
        verifications: drivers.map(d => ({
          id: d._id,
          driver: d.user,
          documents: d.documents,
          vehicle: d.vehicle,
          verification: d.verification,
          createdAt: d.createdAt,
        })),
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Get verifications error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/verifications/pending
 * @desc    Récupérer uniquement les vérifications en attente
 * @access  Admin
 */
router.get('/verifications/pending', async (req, res) => {
  try {
    console.log('📋 [Admin] GET /verifications/pending');

    const drivers = await Driver.find({ 'verification.status': 'pending' })
      .populate('user', 'firstName lastName email phone avatar createdAt')
      .sort('-createdAt');

    res.json({
      success: true,
      data: {
        verifications: drivers.map(d => ({
          id: d._id,
          driver: d.user,
          documents: d.documents,
          vehicle: d.vehicle,
          verification: d.verification,
          createdAt: d.createdAt,
        })),
        count: drivers.length,
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Get pending verifications error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/admin/verifications/:id/approve
 * @desc    Approuver une vérification
 * @access  Admin
 */
router.post('/verifications/:id/approve', async (req, res) => {
  try {
    console.log('✅ [Admin] POST /verifications/:id/approve', req.params.id);

    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Conductrice non trouvée' });
    }

    driver.verification.status = 'approved';
    driver.verification.verifiedAt = new Date();
    driver.verification.verifiedBy = req.user._id;
    driver.isVerified = true;
    driver.isActive = true;

    await driver.save();

    // Mettre à jour l'utilisateur
    await User.findByIdAndUpdate(driver.user, { isVerified: true });

    res.json({
      success: true,
      message: 'Conductrice approuvée avec succès',
    });
  } catch (error) {
    console.error('❌ [Admin] Approve verification error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   POST /api/admin/verifications/:id/reject
 * @desc    Rejeter une vérification
 * @access  Admin
 */
router.post('/verifications/:id/reject', async (req, res) => {
  try {
    console.log('❌ [Admin] POST /verifications/:id/reject', req.params.id);

    const { reason } = req.body;

    const driver = await Driver.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Conductrice non trouvée' });
    }

    driver.verification.status = 'rejected';
    driver.verification.rejectionReason = reason || 'Documents non conformes';
    driver.verification.verifiedAt = new Date();
    driver.verification.verifiedBy = req.user._id;
    driver.isVerified = false;

    await driver.save();

    res.json({
      success: true,
      message: 'Vérification rejetée',
    });
  } catch (error) {
    console.error('❌ [Admin] Reject verification error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// RIDES MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/admin/rides
 * @desc    Récupérer la liste des courses
 * @access  Admin
 */
router.get('/rides', async (req, res) => {
  try {
    console.log('🚕 [Admin] GET /rides');

    const { page = 1, limit = 20, status, sort = '-createdAt' } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    const rides = await Ride.find(query)
      .populate('user', 'firstName lastName phone')
      .populate('driver', 'firstName lastName phone')
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Ride.countDocuments(query);

    res.json({
      success: true,
      data: {
        rides,
        total,
        page: parseInt(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Get rides error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/rides/active
 * @desc    Récupérer les courses actives
 * @access  Admin
 */
router.get('/rides/active', async (req, res) => {
  try {
    console.log('🚕 [Admin] GET /rides/active');

    const rides = await Ride.find({
      status: { $in: ['searching', 'accepted', 'arriving', 'in_progress'] }
    })
      .populate('user', 'firstName lastName phone')
      .populate('driver', 'firstName lastName phone')
      .sort('-createdAt');

    res.json({
      success: true,
      data: { rides, count: rides.length },
    });
  } catch (error) {
    console.error('❌ [Admin] Get active rides error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/rides/:id
 * @desc    Récupérer une course par ID
 * @access  Admin
 */
router.get('/rides/:id', async (req, res) => {
  try {
    console.log('🚕 [Admin] GET /rides/:id', req.params.id);

    const ride = await Ride.findById(req.params.id)
      .populate('user', 'firstName lastName phone email')
      .populate('driver', 'firstName lastName phone email');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Course non trouvée' });
    }

    res.json({ success: true, data: { ride } });
  } catch (error) {
    console.error('❌ [Admin] Get ride error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// REPORTS & ANALYTICS
// ============================================================================

/**
 * @route   GET /api/admin/reports/overview
 * @desc    Récupérer les rapports généraux
 * @access  Admin
 */
router.get('/reports/overview', async (req, res) => {
  try {
    console.log('📊 [Admin] GET /reports/overview');

    const { period = 'week' } = req.query;

    let startDate = new Date();
    
    switch (period) {
      case 'day':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Stats des courses
    const ridesStats = await Ride.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalFare: { $sum: '$fare' },
        },
      },
    ]);

    // Nouveaux utilisateurs
    const newUsers = await User.countDocuments({
      role: 'user',
      createdAt: { $gte: startDate },
    });

    // Nouvelles conductrices
    const newDrivers = await User.countDocuments({
      role: 'driver',
      createdAt: { $gte: startDate },
    });

    // Top conductrices
    const topDrivers = await Ride.aggregate([
      { $match: { status: 'completed', createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: '$driver',
          rides: { $sum: 1 },
          earnings: { $sum: '$fare' },
          avgRating: { $avg: '$rating.driver' },
        },
      },
      { $sort: { rides: -1 } },
      { $limit: 5 },
    ]);

    // Enrichir avec les infos des conductrices
    const enrichedTopDrivers = await Promise.all(
      topDrivers.map(async (d) => {
        const user = await User.findById(d._id).select('firstName lastName');
        return {
          ...d,
          name: user ? `${user.firstName} ${user.lastName}` : 'Inconnue',
        };
      })
    );

    res.json({
      success: true,
      data: {
        period,
        ridesStats,
        newUsers,
        newDrivers,
        topDrivers: enrichedTopDrivers,
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Get reports error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   GET /api/admin/reports/hourly
 * @desc    Récupérer les stats par heure
 * @access  Admin
 */
router.get('/reports/hourly', async (req, res) => {
  try {
    console.log('📊 [Admin] GET /reports/hourly');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const hourlyStats = await Ride.aggregate([
      { $match: { createdAt: { $gte: today } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          rides: { $sum: 1 },
          revenue: { $sum: '$fare' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Formatter pour avoir toutes les heures
    const formattedStats = [];
    for (let i = 0; i < 24; i++) {
      const hourData = hourlyStats.find(h => h._id === i);
      formattedStats.push({
        hour: `${i.toString().padStart(2, '0')}h`,
        rides: hourData?.rides || 0,
        revenue: hourData?.revenue || 0,
      });
    }

    res.json({
      success: true,
      data: { hourlyStats: formattedStats },
    });
  } catch (error) {
    console.error('❌ [Admin] Get hourly stats error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// ACTIVITIES LOG
// ============================================================================

/**
 * @route   GET /api/admin/activities
 * @desc    Récupérer le journal des activités
 * @access  Admin
 */
router.get('/activities', async (req, res) => {
  try {
    console.log('📋 [Admin] GET /activities');

    const { type, limit = 50 } = req.query;

    // Récupérer les dernières activités de différentes sources
    const activities = [];

    // Dernières inscriptions
    const recentUsers = await User.find({ role: 'user' })
      .sort('-createdAt')
      .limit(10)
      .select('firstName lastName createdAt');

    recentUsers.forEach(u => {
      activities.push({
        id: `user_${u._id}`,
        type: 'user',
        action: 'Nouveau compte',
        description: `${u.firstName} ${u.lastName} s'est inscrite`,
        timestamp: u.createdAt,
      });
    });

    // Dernières courses
    const recentRides = await Ride.find()
      .sort('-createdAt')
      .limit(10)
      .select('status createdAt');

    recentRides.forEach(r => {
      activities.push({
        id: `ride_${r._id}`,
        type: 'ride',
        action: r.status === 'completed' ? 'Course terminée' : `Course ${r.status}`,
        description: `Course #${r._id.toString().slice(-6)}`,
        timestamp: r.createdAt,
      });
    });

    // Dernières vérifications
    const recentVerifications = await Driver.find({ 'verification.status': 'pending' })
      .populate('user', 'firstName lastName')
      .sort('-createdAt')
      .limit(5);

    recentVerifications.forEach(d => {
      activities.push({
        id: `verif_${d._id}`,
        type: 'verification',
        action: 'Nouvelle demande',
        description: `${d.user?.firstName} ${d.user?.lastName} a soumis ses documents`,
        timestamp: d.createdAt,
      });
    });

    // Trier par date
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Filtrer par type si spécifié
    let filteredActivities = activities;
    if (type && type !== 'all') {
      filteredActivities = activities.filter(a => a.type === type);
    }

    // Limiter
    filteredActivities = filteredActivities.slice(0, parseInt(limit));

    // Formatter les timestamps
    const now = new Date();
    filteredActivities.forEach(a => {
      const diff = now - new Date(a.timestamp);
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (minutes < 60) {
        a.timestamp = `Il y a ${minutes} min`;
      } else if (hours < 24) {
        a.timestamp = `Il y a ${hours}h`;
      } else {
        a.timestamp = `Il y a ${days}j`;
      }
    });

    res.json({
      success: true,
      data: { activities: filteredActivities },
    });
  } catch (error) {
    console.error('❌ [Admin] Get activities error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// SETTINGS
// ============================================================================

/**
 * @route   GET /api/admin/settings
 * @desc    Récupérer les paramètres de l'application
 * @access  Admin
 */
router.get('/settings', async (req, res) => {
  try {
    console.log('⚙️ [Admin] GET /settings');

    // Pour l'instant, retourner des valeurs par défaut
    // Plus tard, ces valeurs viendront d'une collection Settings
    res.json({
      success: true,
      data: {
        pricing: {
          baseFare: 8,
          pricePerKm: 5,
          pricePerMinute: 0.5,
          commission: 0.15,
          minimumFare: 15,
        },
        verification: {
          autoApprove: false,
          requireFaceVerification: true,
          requirePhoneVerification: true,
        },
        app: {
          maintenanceMode: false,
          version: '1.0.0',
          environment: process.env.NODE_ENV || 'development',
        },
      },
    });
  } catch (error) {
    console.error('❌ [Admin] Get settings error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

/**
 * @route   PUT /api/admin/settings
 * @desc    Mettre à jour les paramètres
 * @access  Admin
 */
router.put('/settings', async (req, res) => {
  try {
    console.log('⚙️ [Admin] PUT /settings');

    // Pour l'instant, juste confirmer
    // Plus tard, sauvegarder dans une collection Settings

    res.json({
      success: true,
      message: 'Paramètres mis à jour',
    });
  } catch (error) {
    console.error('❌ [Admin] Update settings error:', error);
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
});

// ============================================================================
// SUB-ADMIN MANAGEMENT (Super Admin only)
// ============================================================================

/**
 * @route   POST /api/admin/sub-admins
 * @desc    Créer un sous-administrateur
 * @access  Super Admin
 */
router.post('/sub-admins', async (req, res) => {
  try {
    console.log('[routes/admin.js] ▶ POST /sub-admins');

    const { userId, region } = req.body;

    if (!userId || !region) {
      return res.status(400).json({
        success: false,
        message: 'userId et region requis'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role: 'sub_admin', region },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur non trouvé'
      });
    }

    console.log('[routes/admin.js] ✓ Sub-admin créé pour région:', region);

    res.status(201).json({
      success: true,
      message: 'Sub-admin créé',
      data: {
        subAdmin: user
      }
    });

  } catch (error) {
    console.log('[routes/admin.js] ❌ Erreur POST /sub-admins:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
});

/**
 * @route   GET /api/admin/sub-admins
 * @desc    Lister les sous-administrateurs
 * @access  Super Admin
 */
router.get('/sub-admins', async (req, res) => {
  try {
    console.log('[routes/admin.js] ▶ GET /sub-admins');

    const subAdmins = await User.find({ role: 'sub_admin' })
      .select('firstName lastName email phone region createdAt');

    console.log('[routes/admin.js] ✓ Sub-admins récupérés:', subAdmins.length);

    res.status(200).json({
      success: true,
      data: {
        subAdmins
      }
    });

  } catch (error) {
    console.log('[routes/admin.js] ❌ Erreur GET /sub-admins:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
});

/**
 * @route   PUT /api/admin/sub-admins/:subAdminId
 * @desc    Mettre à jour un sous-administrateur
 * @access  Super Admin
 */
router.put('/sub-admins/:subAdminId', async (req, res) => {
  try {
    console.log('[routes/admin.js] ▶ PUT /sub-admins/:subAdminId');

    const { subAdminId } = req.params;
    const { region } = req.body;

    if (!region) {
      return res.status(400).json({
        success: false,
        message: 'region requis'
      });
    }

    const subAdmin = await User.findByIdAndUpdate(
      subAdminId,
      { region },
      { new: true }
    ).select('-password');

    if (!subAdmin || subAdmin.role !== 'sub_admin') {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin non trouvé'
      });
    }

    console.log('[routes/admin.js] ✓ Sub-admin mis à jour');

    res.status(200).json({
      success: true,
      message: 'Sub-admin mis à jour',
      data: {
        subAdmin
      }
    });

  } catch (error) {
    console.log('[routes/admin.js] ❌ Erreur PUT /sub-admins/:subAdminId:', error.message);
    res.status(500).json({
      success: false,
      message: 'Erreur'
    });
  }
});

module.exports = router;
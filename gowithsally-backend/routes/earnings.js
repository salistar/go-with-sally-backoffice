/**
 * ============================================================================
 * GO WITH SALLY - DRIVER EARNINGS ROUTES
 * ============================================================================
 * Routes pour les gains des conductrices
 *
 * @module routes/earnings
 * @version 1.0.0
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

let authenticate;
try {
  const mainAuth = require('../middleware/auth');
  authenticate = mainAuth.verifyToken || mainAuth.protect;
} catch (e) {
  const altAuth = require('../middleware/auth.middleware');
  authenticate = altAuth.protect || altAuth.authenticate;
}

/**
 * GET /api/earnings/daily
 * Obtenir les gains du jour
 */
router.get('/daily', authenticate, async (req, res) => {
  try {
    const DriverEarnings = require('../models/DriverEarnings');
    const Driver = require('../models/Driver');

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Profil conductrice non trouvé'
      });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const earnings = await DriverEarnings.findOne({
      driverId: driver._id,
      period: 'daily',
      date: { $gte: today }
    });

    res.json({
      success: true,
      data: earnings || {
        totalEarnings: 0,
        ridesCount: 0,
        breakdown: {
          grossRevenue: 0,
          platformCommission: 0,
          netEarnings: 0,
          bonuses: 0,
          penalties: 0
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/earnings/weekly
 * Obtenir les gains de la semaine
 */
router.get('/weekly', authenticate, async (req, res) => {
  try {
    const DriverEarnings = require('../models/DriverEarnings');
    const Driver = require('../models/Driver');

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Profil conductrice non trouvé'
      });
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const earnings = await DriverEarnings.find({
      driverId: driver._id,
      date: { $gte: weekAgo }
    }).sort({ date: -1 });

    const totalEarnings = earnings.reduce((sum, e) => sum + e.totalEarnings, 0);

    res.json({
      success: true,
      data: {
        earnings,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        daysWorked: earnings.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/earnings/monthly
 * Obtenir les gains du mois
 */
router.get('/monthly', authenticate, async (req, res) => {
  try {
    const DriverEarnings = require('../models/DriverEarnings');
    const Driver = require('../models/Driver');

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Profil conductrice non trouvé'
      });
    }

    const monthAgo = new Date();
    monthAgo.setDate(1);

    const earnings = await DriverEarnings.find({
      driverId: driver._id,
      date: { $gte: monthAgo }
    }).sort({ date: -1 });

    const totalEarnings = earnings.reduce((sum, e) => sum + e.totalEarnings, 0);
    const totalRides = earnings.reduce((sum, e) => sum + e.ridesCount, 0);

    res.json({
      success: true,
      data: {
        earnings,
        totalEarnings: Math.round(totalEarnings * 100) / 100,
        totalRides,
        daysWorked: earnings.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/earnings/breakdown
 * Obtenir le détail des gains
 */
router.get('/breakdown', authenticate, async (req, res) => {
  try {
    const DriverEarnings = require('../models/DriverEarnings');
    const Driver = require('../models/Driver');
    const { period = 'monthly' } = req.query;

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Profil conductrice non trouvé'
      });
    }

    let dateFilter = {};
    if (period === 'daily') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dateFilter = { $gte: today };
    } else if (period === 'weekly') {
      dateFilter = { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) };
    } else if (period === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setDate(1);
      dateFilter = { $gte: monthAgo };
    }

    const earnings = await DriverEarnings.find({
      driverId: driver._id,
      date: dateFilter
    });

    const breakdown = {
      totalGrossRevenue: 0,
      totalCommission: 0,
      totalNetEarnings: 0,
      totalBonuses: 0,
      totalPenalties: 0,
      totalRides: 0
    };

    earnings.forEach(e => {
      breakdown.totalGrossRevenue += e.breakdown.grossRevenue || 0;
      breakdown.totalCommission += e.breakdown.platformCommission || 0;
      breakdown.totalNetEarnings += e.breakdown.netEarnings || 0;
      breakdown.totalBonuses += e.breakdown.bonuses || 0;
      breakdown.totalPenalties += e.breakdown.penalties || 0;
      breakdown.totalRides += e.ridesCount || 0;
    });

    res.json({
      success: true,
      data: breakdown
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

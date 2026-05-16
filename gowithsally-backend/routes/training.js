/**
 * ============================================================================
 * GO WITH SALLY - DRIVER TRAINING ROUTES
 * ============================================================================
 * Routes pour la formation des conductrices
 *
 * @module routes/training
 * @version 1.0.0
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

let authenticate, isAdmin;
try {
  const mainAuth = require('../middleware/auth');
  authenticate = mainAuth.verifyToken || mainAuth.protect;
  isAdmin = mainAuth.verifyAdmin || mainAuth.admin;
} catch (e) {
  const altAuth = require('../middleware/auth.middleware');
  authenticate = altAuth.protect || altAuth.authenticate;
  isAdmin = altAuth.isAdmin;
}

/**
 * GET /api/training/modules
 * Obtenir les modules disponibles
 */
router.get('/modules', async (req, res) => {
  try {
    const modules = [
      {
        id: '1',
        name: 'Safety First',
        description: 'Learn essential safety protocols',
        category: 'safety',
        duration: 30,
        modules: 5
      },
      {
        id: '2',
        name: 'Customer Service Excellence',
        description: 'Provide outstanding customer service',
        category: 'customer_service',
        duration: 45,
        modules: 8
      },
      {
        id: '3',
        name: 'Vehicle Maintenance',
        description: 'Maintain your vehicle in top condition',
        category: 'vehicle_maintenance',
        duration: 60,
        modules: 10
      }
    ];

    res.json({
      success: true,
      data: modules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/training/progress
 * Obtenir sa progression
 */
router.get('/progress', authenticate, async (req, res) => {
  try {
    const DriverTraining = require('../models/DriverTraining');
    const Driver = require('../models/Driver');

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Profil conductrice non trouvé'
      });
    }

    let training = await DriverTraining.findOne({ driverId: driver._id });

    if (!training) {
      training = new DriverTraining({ driverId: driver._id });
      await training.save();
    }

    res.json({
      success: true,
      data: {
        totalModulesCompleted: training.totalModulesCompleted,
        averageScore: training.averageScore || 0,
        complianceStatus: training.complianceStatus,
        nextTrainingDue: training.nextTrainingDue,
        modules: training.modules
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
 * POST /api/training/complete-module
 * Marquer un module comme complété
 */
router.post('/complete-module', authenticate, async (req, res) => {
  try {
    const DriverTraining = require('../models/DriverTraining');
    const Driver = require('../models/Driver');
    const { moduleId, score } = req.body;

    if (!moduleId || !score) {
      return res.status(400).json({
        success: false,
        message: 'ID du module et score requis'
      });
    }

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Profil conductrice non trouvé'
      });
    }

    let training = await DriverTraining.findOne({ driverId: driver._id });

    if (!training) {
      training = new DriverTraining({ driverId: driver._id });
    }

    const moduleIndex = training.modules.findIndex(m => m.moduleId.toString() === moduleId);

    if (moduleIndex !== -1) {
      training.modules[moduleIndex].status = 'completed';
      training.modules[moduleIndex].completedAt = new Date();
      training.modules[moduleIndex].score = score;
    }

    training.totalModulesCompleted = training.modules.filter(m => m.status === 'completed').length;

    const scores = training.modules
      .filter(m => m.score)
      .map(m => m.score);

    if (scores.length > 0) {
      training.averageScore = Math.round(scores.reduce((a, b) => a + b) / scores.length);
    }

    training.trainingHistory.push({
      moduleId,
      completedAt: new Date(),
      score
    });

    await training.save();

    res.json({
      success: true,
      message: 'Module marqué comme complété',
      data: training
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/training/certifications
 * Obtenir ses certifications
 */
router.get('/certifications', authenticate, async (req, res) => {
  try {
    const DriverTraining = require('../models/DriverTraining');
    const Driver = require('../models/Driver');

    const driver = await Driver.findOne({ userId: req.user._id });

    if (!driver) {
      return res.json({
        success: true,
        data: []
      });
    }

    const training = await DriverTraining.findOne({ driverId: driver._id });

    res.json({
      success: true,
      data: training?.certifications || []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

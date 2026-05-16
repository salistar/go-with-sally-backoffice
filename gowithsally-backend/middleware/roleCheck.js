/**
 * ============================================================================
 * GO WITH SALLY - ROLE CHECK MIDDLEWARE
 * ============================================================================
 * Middleware pour vérifier les rôles et permissions des utilisateurs
 *
 * @module middleware/roleCheck
 * @version 1.0.0
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - isAdmin() middleware entry
// - isDriver() middleware entry
// - Other middleware entries

console.log('📄 roleCheck.js ▶ Module loaded');

const logger = require('../utils/logger');

/**
 * Check if user is admin
 * @middleware
 */
exports.isAdmin = (req, res, next) => {
  console.log('📄 roleCheck.js ▶ isAdmin() called');
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'not_authenticated',
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      logger.warn(`[roleCheck] Non-admin user attempted access: ${req.user._id}`);
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Admin access required'
      });
    }

    next();
  } catch (error) {
    logger.error('[roleCheck] isAdmin error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message
    });
  }
};

/**
 * Check if user is driver
 * @middleware
 */
exports.isDriver = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'not_authenticated',
        message: 'Authentication required'
      });
    }

    if (!req.user.driver) {
      return res.status(403).json({
        success: false,
        error: 'not_driver',
        message: 'Driver account required'
      });
    }

    next();
  } catch (error) {
    logger.error('[roleCheck] isDriver error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message
    });
  }
};

/**
 * Check if user is support
 * @middleware
 */
exports.isSupport = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'not_authenticated',
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'support' && req.user.role !== 'admin') {
      logger.warn(`[roleCheck] Non-support user attempted access: ${req.user._id}`);
      return res.status(403).json({
        success: false,
        error: 'forbidden',
        message: 'Support access required'
      });
    }

    next();
  } catch (error) {
    logger.error('[roleCheck] isSupport error:', error);
    res.status(500).json({
      success: false,
      error: 'internal_error',
      message: error.message
    });
  }
};

/**
 * Check if user has a specific permission
 * @middleware
 * @param {string} permission - Permission to check
 */
exports.hasPermission = (permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'not_authenticated',
          message: 'Authentication required'
        });
      }

      // Admin has all permissions
      if (req.user.role === 'admin') {
        return next();
      }

      const userPermissions = req.user.permissions || [];
      if (!userPermissions.includes(permission)) {
        logger.warn(`[roleCheck] User lacks permission ${permission}: ${req.user._id}`);
        return res.status(403).json({
          success: false,
          error: 'forbidden',
          message: `Permission required: ${permission}`
        });
      }

      next();
    } catch (error) {
      logger.error('[roleCheck] hasPermission error:', error);
      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: error.message
      });
    }
  };
};

/**
 * Check if user has one of multiple roles
 * @middleware
 * @param {string[]} roles - Array of roles to check
 */
exports.hasRole = (roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: 'not_authenticated',
          message: 'Authentication required'
        });
      }

      if (!Array.isArray(roles)) {
        roles = [roles];
      }

      if (!roles.includes(req.user.role)) {
        logger.warn(`[roleCheck] User has invalid role: ${req.user.role} (expected: ${roles.join(', ')})`);
        return res.status(403).json({
          success: false,
          error: 'forbidden',
          message: `One of these roles required: ${roles.join(', ')}`
        });
      }

      next();
    } catch (error) {
      logger.error('[roleCheck] hasRole error:', error);
      res.status(500).json({
        success: false,
        error: 'internal_error',
        message: error.message
      });
    }
  };
};

module.exports = exports;

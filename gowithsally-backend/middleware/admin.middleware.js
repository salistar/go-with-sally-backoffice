// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - adminProtect() middleware entry
// - Other middleware entries

console.log('📄 admin.middleware.js ▶ Module loaded');

// backend/src/middleware/admin.middleware.js
// Middleware admin Go With Sally

const jwt = require('jsonwebtoken');

// Modèle Admin (simplifié pour l'exemple)
// En production, créer un vrai modèle Admin
const Admin = {
  findById: async (id) => {
    // Simuler un admin pour les tests
    if (id === 'admin_001') {
      return {
        _id: 'admin_001',
        email: 'admin@gowithsally.ma',
        role: 'admin',
        permissions: ['verify_documents', 'manage_drivers', 'view_reports']
      };
    }
    return null;
  }
};

/**
 * Protection des routes admin
 */
exports.adminProtect = async (req, res, next) => {
  console.log('📄 admin.middleware.js ▶ adminProtect() called');
  try {
    let token;
    
    // Récupérer le token du header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'not_authorized',
        message: 'Admin authentication required'
      });
    }
    
    try {
      // Vérifier le token
      const decoded = jwt.verify(token, process.env.JWT_ADMIN_SECRET || 'sally-admin-secret');
      
      // Vérifier que c'est un token admin
      if (decoded.type !== 'admin') {
        return res.status(401).json({
          success: false,
          error: 'invalid_token',
          message: 'Not an admin token'
        });
      }
      
      // Récupérer l'admin
      const admin = await Admin.findById(decoded.id);
      
      if (!admin) {
        return res.status(401).json({
          success: false,
          error: 'admin_not_found',
          message: 'Admin not found'
        });
      }
      
      req.admin = admin;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'token_expired',
          message: 'Admin token has expired'
        });
      }
      
      return res.status(401).json({
        success: false,
        error: 'invalid_token',
        message: 'Invalid admin token'
      });
    }
  } catch (error) {
    console.error('[Admin Auth] Middleware error:', error);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: 'Admin authentication failed'
    });
  }
};

/**
 * Vérifier les permissions spécifiques
 */
exports.requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.admin) {
      return res.status(401).json({
        success: false,
        error: 'not_authorized',
        message: 'Admin authentication required'
      });
    }
    
    if (!req.admin.permissions || !req.admin.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: 'permission_denied',
        message: `Permission '${permission}' required`
      });
    }
    
    next();
  };
};

/**
 * Générer un token admin
 */
exports.generateAdminToken = (adminId) => {
  return jwt.sign(
    { id: adminId, type: 'admin' },
    process.env.JWT_ADMIN_SECRET || 'sally-admin-secret',
    { expiresIn: '8h' }
  );
};

console.log('📄 [admin.middleware.js] ✅ Middleware admin chargé');
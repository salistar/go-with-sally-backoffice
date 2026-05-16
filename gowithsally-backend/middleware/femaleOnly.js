// ============================================================
// 📄 femaleOnly.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('femaleOnly.js ▶ Module loaded')
//   • console.log('femaleOnly.js ▶ femaleOnly() middleware called')
// ============================================================

console.log('📄 [femaleOnly.js] ▶ Module loaded');

const jwt = require('jsonwebtoken');

/**
 * Middleware to verify that user is female
 * Checks JWT token and validates gender field
 */
const femaleOnly = (req, res, next) => {
  console.log('📄 [femaleOnly.js] ▶ femaleOnly() middleware called');

  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check gender from JWT payload
    if (decoded.gender && decoded.gender.toLowerCase() === 'female') {
      req.user = decoded;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'This service is exclusively for female users',
    });
  } catch (error) {
    console.error('femaleOnly.js ▶ Error:', error.message);
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
    });
  }
};

module.exports = femaleOnly;

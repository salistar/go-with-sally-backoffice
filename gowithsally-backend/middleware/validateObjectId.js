// ============================================================
// 📄 validateObjectId.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('validateObjectId.js ▶ Module loaded')
//   • console.log('validateObjectId.js ▶ validateObjectId() middleware called')
// ============================================================

console.log('📄 [validateObjectId.js] ▶ Module loaded');

const mongoose = require('mongoose');

/**
 * Middleware to validate MongoDB ObjectId in request parameters
 * Validates the specified parameter contains a valid ObjectId
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    console.log(`📄 [validateObjectId.js] ▶ validateObjectId() middleware called for param: ${paramName}`);

    const id = req.params[paramName];

    if (!id) {
      return res.status(400).json({
        success: false,
        message: `Missing required parameter: ${paramName}`,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format. Must be a valid MongoDB ObjectId.`,
      });
    }

    next();
  };
};

module.exports = validateObjectId;

// ============================================================
// 📄 tokenController.js — GoWithSally
// LOG SUMMARY:
//   • console.log('tokenController.js ▶ Module loaded')
//   • console.log('tokenController.js ▶ refreshToken() called')
// ============================================================

console.log('tokenController.js ▶ Module loaded');

const tokenService = require('../services/tokenService');

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * POST /api/tokens/refresh
 * Rafraîchir les tokens
 */
exports.refreshToken = async (req, res) => {
  console.log('tokenController.js ▶ refreshToken() called');

  try {
    const { refreshToken } = req.body;

    // Validation
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'missing_refresh_token',
        message: 'Refresh token is required',
      });
    }

    const clientIp = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    const result = await tokenService.refreshTokens(refreshToken, {
      ip: clientIp,
      userAgent,
    });

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(401).json(result);
    }
  } catch (error) {
    console.error('tokenController.js ▶ refreshToken() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/tokens/logout
 * Logout et révoquer le token actuel
 */
exports.logout = async (req, res) => {
  console.log('tokenController.js ▶ logout() called');

  try {
    const { refreshToken } = req.body;

    // Validation
    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'missing_refresh_token',
        message: 'Refresh token is required',
      });
    }

    const result = await tokenService.revokeToken(refreshToken);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('tokenController.js ▶ logout() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/tokens/logout-all
 * Logout de tous les appareils
 */
exports.logoutAll = async (req, res) => {
  console.log('tokenController.js ▶ logoutAll() called');

  try {
    const userId = req.user?.id || req.body.userId;

    // Validation
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'missing_userId',
        message: 'userId is required',
      });
    }

    const result = await tokenService.revokeAllUserTokens(userId);

    if (result.success) {
      return res.json({
        success: true,
        message: 'Logged out from all devices',
        revokedCount: result.revokedCount,
      });
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('tokenController.js ▶ logoutAll() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/tokens/active
 * Récupérer les tokens actifs
 */
exports.getActiveTokens = async (req, res) => {
  console.log('tokenController.js ▶ getActiveTokens() called');

  try {
    const userId = req.user?.id;

    // Validation
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'unauthorized',
        message: 'User not authenticated',
      });
    }

    const result = await tokenService.getUserActiveTokens(userId);

    if (result.success) {
      return res.json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('tokenController.js ▶ getActiveTokens() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/tokens/revoke/:tokenId
 * Révoquer un token spécifique
 */
exports.revokeSpecificToken = async (req, res) => {
  console.log('tokenController.js ▶ revokeSpecificToken() called');

  try {
    const { tokenId } = req.params;
    const userId = req.user?.id;

    // Validation
    if (!tokenId || !userId) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'tokenId and user authentication are required',
      });
    }

    // Vérifier que le token appartient à l'utilisateur
    const RefreshToken = require('../models/RefreshToken');
    const token = await RefreshToken.findOne({ _id: tokenId, userId });

    if (!token) {
      return res.status(404).json({
        success: false,
        error: 'token_not_found',
        message: 'Token not found or does not belong to user',
      });
    }

    // Révoquer le token
    await token.revoke();

    return res.json({
      success: true,
      message: 'Token revoked successfully',
    });
  } catch (error) {
    console.error('tokenController.js ▶ revokeSpecificToken() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/tokens/config
 * Récupérer la configuration des tokens
 */
exports.getTokenConfig = async (req, res) => {
  console.log('tokenController.js ▶ getTokenConfig() called');

  try {
    const config = tokenService.getTokenConfig();

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('tokenController.js ▶ getTokenConfig() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = exports;

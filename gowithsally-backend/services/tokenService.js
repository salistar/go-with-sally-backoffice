// ============================================================
// 📄 tokenService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('tokenService.js ▶ Module loaded')
//   • console.log('tokenService.js ▶ generateTokenPair() called')
// ============================================================

console.log('tokenService.js ▶ Module loaded');

const jwt = require('jsonwebtoken');
const RefreshToken = require('../models/RefreshToken');

// ============================================================
// CONFIGURATION
// ============================================================

const TOKEN_CONFIG = {
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-change-in-production',
  ACCESS_TOKEN_EXPIRES_IN: '15m',
  REFRESH_TOKEN_EXPIRES_IN: 7 * 24 * 60 * 60 * 1000, // 7 jours en millisecondes
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Génère un JWT Access Token
 */
function generateAccessToken(userId, userData = {}) {
  console.log('tokenService.js ▶ generateAccessToken() called');

  const payload = {
    userId,
    email: userData.email,
    role: userData.role,
    type: 'access',
  };

  return jwt.sign(payload, TOKEN_CONFIG.JWT_SECRET, {
    expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRES_IN,
  });
}

/**
 * Génère un JWT Refresh Token (utilisé pour valider le refresh)
 */
function generateRefreshTokenJWT(token, userId) {
  console.log('tokenService.js ▶ generateRefreshTokenJWT() called');

  const payload = {
    userId,
    tokenId: token,
    type: 'refresh',
  };

  return jwt.sign(payload, TOKEN_CONFIG.JWT_REFRESH_SECRET, {
    expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRES_IN / 1000, // Convertir en secondes
  });
}

/**
 * Vérifie un JWT
 */
function verifyToken(token, secret = TOKEN_CONFIG.JWT_SECRET) {
  console.log('tokenService.js ▶ verifyToken() called');

  try {
    return jwt.verify(token, secret);
  } catch (error) {
    console.error('tokenService.js ▶ verifyToken() error:', error.message);
    return null;
  }
}

// ============================================================
// MAIN SERVICE
// ============================================================

const tokenService = {
  /**
   * Génère une paire de tokens (access + refresh)
   */
  async generateTokenPair(userId, userData = {}, options = {}) {
    console.log('tokenService.js ▶ generateTokenPair() called');

    try {
      const { userAgent = null, ip = null, deviceId = null } = options;

      // Générer l'access token
      const accessToken = generateAccessToken(userId, userData);

      // Créer et sauvegarder le refresh token en DB
      const refreshTokenDoc = await RefreshToken.createToken(userId, {
        expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRES_IN,
        userAgent,
        ip,
        deviceId,
      });

      // Générer le JWT de refresh (pour la validation)
      const refreshToken = generateRefreshTokenJWT(refreshTokenDoc.token, userId);

      return {
        success: true,
        accessToken,
        refreshToken,
        expiresIn: 15 * 60, // 15 minutes en secondes
        tokenType: 'Bearer',
      };
    } catch (error) {
      console.error('tokenService.js ▶ generateTokenPair() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Vérifie et rafraîchit les tokens
   */
  async refreshTokens(refreshToken, options = {}) {
    console.log('tokenService.js ▶ refreshTokens() called');

    try {
      // Vérifier le JWT de refresh
      const decoded = verifyToken(refreshToken, TOKEN_CONFIG.JWT_REFRESH_SECRET);

      if (!decoded) {
        return {
          success: false,
          error: 'invalid_token',
          message: 'Refresh token is invalid or expired',
        };
      }

      // Vérifier que le token existe en DB et n'est pas révoqué
      const refreshTokenDoc = await RefreshToken.findValidToken(decoded.tokenId);

      if (!refreshTokenDoc) {
        return {
          success: false,
          error: 'token_revoked_or_expired',
          message: 'Refresh token has been revoked or expired',
        };
      }

      // Générer une nouvelle paire de tokens
      const user = await refreshTokenDoc.populate('userId');

      return await this.generateTokenPair(decoded.userId, {
        email: user.userId.email,
        role: user.userId.role,
      }, options);
    } catch (error) {
      console.error('tokenService.js ▶ refreshTokens() error:', error.message);
      return {
        success: false,
        error: 'refresh_failed',
        message: error.message,
      };
    }
  },

  /**
   * Vérifie un access token
   */
  async verifyAccessToken(accessToken) {
    console.log('tokenService.js ▶ verifyAccessToken() called');

    const decoded = verifyToken(accessToken, TOKEN_CONFIG.JWT_SECRET);

    if (!decoded) {
      return {
        success: false,
        error: 'invalid_token',
        message: 'Access token is invalid or expired',
      };
    }

    return {
      success: true,
      decoded,
    };
  },

  /**
   * Révoque un refresh token
   */
  async revokeToken(refreshToken) {
    console.log('tokenService.js ▶ revokeToken() called');

    try {
      const decoded = verifyToken(refreshToken, TOKEN_CONFIG.JWT_REFRESH_SECRET);

      if (!decoded) {
        return {
          success: false,
          error: 'invalid_token',
        };
      }

      // Révoquer le token en DB
      await RefreshToken.revokeToken(decoded.tokenId);

      return {
        success: true,
        message: 'Token revoked successfully',
      };
    } catch (error) {
      console.error('tokenService.js ▶ revokeToken() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Révoque tous les tokens d'un utilisateur
   */
  async revokeAllUserTokens(userId) {
    console.log('tokenService.js ▶ revokeAllUserTokens() called');

    try {
      const count = await RefreshToken.revokeAllUserTokens(userId);

      return {
        success: true,
        message: `Revoked ${count} tokens`,
        revokedCount: count,
      };
    } catch (error) {
      console.error('tokenService.js ▶ revokeAllUserTokens() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère les tokens actifs d'un utilisateur
   */
  async getUserActiveTokens(userId) {
    console.log('tokenService.js ▶ getUserActiveTokens() called');

    try {
      const tokens = await RefreshToken.getUserActiveTokens(userId);

      return {
        success: true,
        tokens: tokens.map(t => ({
          id: t._id,
          createdAt: t.createdAt,
          expiresAt: t.expiresAt,
          deviceId: t.deviceId,
          userAgent: t.userAgent,
          ip: t.ip,
        })),
      };
    } catch (error) {
      console.error('tokenService.js ▶ getUserActiveTokens() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Décoder un JWT sans vérifier la signature (pour inspection)
   */
  decodeToken(token) {
    console.log('tokenService.js ▶ decodeToken() called');

    try {
      return jwt.decode(token);
    } catch (error) {
      console.error('tokenService.js ▶ decodeToken() error:', error.message);
      return null;
    }
  },

  /**
   * Récupère la configuration des tokens
   */
  getTokenConfig() {
    console.log('tokenService.js ▶ getTokenConfig() called');

    return {
      accessTokenExpiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRES_IN,
      refreshTokenExpiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRES_IN,
    };
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = tokenService;

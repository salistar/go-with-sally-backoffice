// ============================================================
// 📄 aiProxyController.js — GoWithSally
// LOG SUMMARY:
//   • console.log('aiProxyController.js ▶ Module loaded')
//   • console.log('aiProxyController.js ▶ verifyFace() called')
// ============================================================

console.log('aiProxyController.js ▶ Module loaded');

const axios = require('axios');

// ============================================================
// CONFIGURATION
// ============================================================

const AI_PROXY_CONFIG = {
  FACE_API_URL: process.env.FACE_API_URL || 'http://gowithsally-face-api:8000',
  TIMEOUT_MS: 10000,
  MAX_RETRIES: 1,
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Effectue une requête vers l'API FastAPI avec retry
 */
async function callFaceAPI(endpoint, data, method = 'POST', retries = 0) {
  console.log(`aiProxyController.js ▶ callFaceAPI() called - endpoint: ${endpoint}, retry: ${retries}`);

  try {
    const url = `${AI_PROXY_CONFIG.FACE_API_URL}${endpoint}`;

    const response = await axios({
      method,
      url,
      data,
      timeout: AI_PROXY_CONFIG.TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error(`aiProxyController.js ▶ callFaceAPI() error on attempt ${retries + 1}:`, error.message);

    // Retry logic
    if (retries < AI_PROXY_CONFIG.MAX_RETRIES) {
      console.log(`aiProxyController.js ▶ Retrying... (${retries + 1}/${AI_PROXY_CONFIG.MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      return callFaceAPI(endpoint, data, method, retries + 1);
    }

    return {
      success: false,
      error: error.message,
      code: error.response?.status || 'timeout',
    };
  }
}

// ============================================================
// CONTROLLERS
// ============================================================

/**
 * POST /api/ai-proxy/face/verify
 * Proxy pour vérification faciale
 */
exports.verifyFace = async (req, res) => {
  console.log('aiProxyController.js ▶ verifyFace() called');

  try {
    const { image, userId, liveness = false } = req.body;

    // Validation
    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'missing_image',
        message: 'Image is required',
      });
    }

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: 'missing_userId',
        message: 'userId is required',
      });
    }

    // Appeler le service FastAPI
    const result = await callFaceAPI('/verify', {
      image,
      userId,
      liveness,
    });

    if (result.success) {
      return res.json({
        success: true,
        verification: result.data,
      });
    } else {
      return res.status(result.code === 'timeout' ? 504 : 400).json({
        success: false,
        error: 'face_verification_failed',
        message: result.error,
      });
    }
  } catch (error) {
    console.error('aiProxyController.js ▶ verifyFace() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/ai-proxy/face/register
 * Proxy pour enregistrement de visage
 */
exports.registerFace = async (req, res) => {
  console.log('aiProxyController.js ▶ registerFace() called');

  try {
    const { image, userId } = req.body;

    // Validation
    if (!image || !userId) {
      return res.status(400).json({
        success: false,
        error: 'missing_fields',
        message: 'image and userId are required',
      });
    }

    // Appeler le service FastAPI
    const result = await callFaceAPI('/register', {
      image,
      userId,
    });

    if (result.success) {
      return res.json({
        success: true,
        registration: result.data,
      });
    } else {
      return res.status(result.code === 'timeout' ? 504 : 400).json({
        success: false,
        error: 'face_registration_failed',
        message: result.error,
      });
    }
  } catch (error) {
    console.error('aiProxyController.js ▶ registerFace() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/ai-proxy/face/liveness
 * Proxy pour vérification de vivacité
 */
exports.livenessDetection = async (req, res) => {
  console.log('aiProxyController.js ▶ livenessDetection() called');

  try {
    const { image, videoFrames } = req.body;

    // Validation
    if (!image && !videoFrames) {
      return res.status(400).json({
        success: false,
        error: 'missing_media',
        message: 'Either image or videoFrames is required',
      });
    }

    // Appeler le service FastAPI
    const result = await callFaceAPI('/liveness', {
      image: image || null,
      videoFrames: videoFrames || null,
    });

    if (result.success) {
      return res.json({
        success: true,
        liveness: result.data,
      });
    } else {
      return res.status(result.code === 'timeout' ? 504 : 400).json({
        success: false,
        error: 'liveness_detection_failed',
        message: result.error,
      });
    }
  } catch (error) {
    console.error('aiProxyController.js ▶ livenessDetection() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * POST /api/ai-proxy/face/compare
 * Proxy pour comparaison de visages
 */
exports.compareFaces = async (req, res) => {
  console.log('aiProxyController.js ▶ compareFaces() called');

  try {
    const { image1, image2 } = req.body;

    // Validation
    if (!image1 || !image2) {
      return res.status(400).json({
        success: false,
        error: 'missing_images',
        message: 'Both image1 and image2 are required',
      });
    }

    // Appeler le service FastAPI
    const result = await callFaceAPI('/compare', {
      image1,
      image2,
    });

    if (result.success) {
      return res.json({
        success: true,
        comparison: result.data,
      });
    } else {
      return res.status(result.code === 'timeout' ? 504 : 400).json({
        success: false,
        error: 'face_comparison_failed',
        message: result.error,
      });
    }
  } catch (error) {
    console.error('aiProxyController.js ▶ compareFaces() error:', error.message);
    res.status(500).json({
      success: false,
      error: 'server_error',
      message: error.message,
    });
  }
};

/**
 * GET /api/ai-proxy/health
 * Vérifier la santé du service FastAPI
 */
exports.healthCheck = async (req, res) => {
  console.log('aiProxyController.js ▶ healthCheck() called');

  try {
    const result = await callFaceAPI('/health', {}, 'GET');

    if (result.success) {
      return res.json({
        success: true,
        status: 'healthy',
        faceApiUrl: AI_PROXY_CONFIG.FACE_API_URL,
      });
    } else {
      return res.status(503).json({
        success: false,
        status: 'unhealthy',
        error: result.error,
        faceApiUrl: AI_PROXY_CONFIG.FACE_API_URL,
      });
    }
  } catch (error) {
    console.error('aiProxyController.js ▶ healthCheck() error:', error.message);
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
    });
  }
};

// ============================================================
// EXPORT
// ============================================================

module.exports = exports;

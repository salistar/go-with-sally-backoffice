/**
 * Face AI Proxy Routes
 * Connects backend with gowithsally-face-api service
 */
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const config = require('../config');
const logger = require('../utils/logger');

const FACE_API_URL = process.env.FACE_API_URL || 'http://localhost:8000';
let faceApiKey = null;

// Initialize Face API connection
async function initFaceApi() {
  try {
    const formData = new URLSearchParams();
    formData.append('password', process.env.FACE_API_PASSWORD || 'sally2024');
    const response = await fetch(`${FACE_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    const data = await response.json();
    if (data.api_key) {
      faceApiKey = data.api_key;
      logger.info('Face API connected successfully');
    }
  } catch (e) {
    logger.warn(`Face API not available: ${e.message}`);
  }
}

// Proxy helper
async function faceApiCall(endpoint, options = {}) {
  if (!faceApiKey) await initFaceApi();
  if (!faceApiKey) throw new Error('Face API not configured');

  const res = await fetch(`${FACE_API_URL}${endpoint}`, {
    ...options,
    headers: {
      'X-API-Key': faceApiKey,
      ...options.headers
    }
  });
  return await res.json();
}

// Health check
router.get('/health', async (req, res) => {
  try {
    const data = await faceApiCall('/api/health/ping');
    res.json({ success: true, faceApi: 'connected', data });
  } catch (e) {
    res.json({ success: false, faceApi: 'disconnected', error: e.message });
  }
});

// Available models
router.get('/models', verifyToken, async (req, res) => {
  try {
    const data = await faceApiCall('/api/test');
    res.json({ success: true, data });
  } catch (e) {
    res.status(503).json({ success: false, message: 'Face AI service unavailable' });
  }
});

// Driver verification
router.post('/driver-verify', verifyToken, async (req, res) => {
  try {
    const formData = new FormData();
    // Forward multipart data to Face API
    if (req.files) {
      if (req.files.profile) formData.append('profile', req.files.profile.data, req.files.profile.name);
      if (req.files.selfie) formData.append('selfie', req.files.selfie.data, req.files.selfie.name);
    }
    const data = await faceApiCall('/api/driver-verify', { method: 'POST', body: formData });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Passenger verification
router.post('/passenger-verify', verifyToken, async (req, res) => {
  try {
    const formData = new FormData();
    if (req.files) {
      if (req.files.booking) formData.append('booking', req.files.booking.data, req.files.booking.name);
      if (req.files.live) formData.append('live', req.files.live.data, req.files.live.name);
    }
    const data = await faceApiCall('/api/passenger-verify', { method: 'POST', body: formData });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Face detection
router.post('/detect', verifyToken, async (req, res) => {
  try {
    const formData = new FormData();
    if (req.files?.image) formData.append('image', req.files.image.data, req.files.image.name);
    const data = await faceApiCall('/api/detect', { method: 'POST', body: formData });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Face compare
router.post('/compare', verifyToken, async (req, res) => {
  try {
    const formData = new FormData();
    if (req.files?.image1) formData.append('image1', req.files.image1.data, req.files.image1.name);
    if (req.files?.image2) formData.append('image2', req.files.image2.data, req.files.image2.name);
    const data = await faceApiCall('/api/compare', { method: 'POST', body: formData });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Gender verification
router.post('/gender', verifyToken, async (req, res) => {
  try {
    const formData = new FormData();
    if (req.files?.image) formData.append('image', req.files.image.data, req.files.image.name);
    const data = await faceApiCall('/api/gender', { method: 'POST', body: formData });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Anti-spoof (liveness)
router.post('/antispoof', verifyToken, async (req, res) => {
  try {
    const formData = new FormData();
    if (req.files?.image) formData.append('image', req.files.image.data, req.files.image.name);
    const data = await faceApiCall('/api/antispoof', { method: 'POST', body: formData });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Full analysis
router.post('/analyze', verifyToken, async (req, res) => {
  try {
    const formData = new FormData();
    if (req.files?.image) formData.append('image', req.files.image.data, req.files.image.name);
    const data = await faceApiCall('/api/analyze', { method: 'POST', body: formData });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Trip safety
router.post('/trip-safety', verifyToken, async (req, res) => {
  try {
    const formData = new FormData();
    if (req.files?.image) formData.append('image', req.files.image.data, req.files.image.name);
    const data = await faceApiCall('/api/trip-safety', { method: 'POST', body: formData });
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Initialize on load
initFaceApi();

module.exports = router;

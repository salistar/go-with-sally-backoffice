// ============================================================
// 📄 rateLimiter.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('rateLimiter.js ▶ Module loaded')
//   • console.log('rateLimiter.js ▶ limiter() applied')
// ============================================================

console.log('📄 [rateLimiter.js] ▶ Module loaded');

const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter (100 requests per minute)
 */
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for auth endpoints (10 requests per 15 minutes)
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * OTP/Verification rate limiter (5 requests per hour)
 */
const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many OTP requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Ride request rate limiter (20 requests per minute)
 */
const rideLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: 'Too many ride requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

console.log('📄 [rateLimiter.js] ▶ All limiters initialized');

module.exports = {
  limiter,
  authLimiter,
  otpLimiter,
  rideLimiter,
};

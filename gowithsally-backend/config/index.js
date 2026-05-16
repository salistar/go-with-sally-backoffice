/**
 * ============================================================================
 * GO WITH SALLY - CONFIGURATION
 * ============================================================================
 * @version 2.0.0
 * Configuration centralisée de l'application
 *
 * Variables requises en production:
 * - MONGODB_URI, JWT_SECRET, JWT_REFRESH_SECRET
 *
 * Usage:
 *   const config = require('./config');
 *   console.log(config.PORT);
 *   if (config.isProduction()) { ... }
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log at line 19
// - validateEnv() function entry
// - Helper function entries (isProduction, isDevelopment, etc.)
// - getSummary() function entry

require('dotenv').config();
console.log('📄 index.js ▶ Module loaded');

// ============================================================================
// VALIDATION ENVIRONNEMENT
// ============================================================================

const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Variables requises par environnement
 */
const REQUIRED_VARS = {
  production: ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'],
  staging: ['MONGODB_URI', 'JWT_SECRET'],
  development: [],
  test: []
};

/**
 * Valide les variables d'environnement
 */
const validateEnv = () => {
  console.log('📄 index.js ▶ validateEnv() called');
  const required = REQUIRED_VARS[NODE_ENV] || [];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    if (NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    console.warn(`⚠️ [Config] Missing variables (${NODE_ENV}): ${missing.join(', ')}`);
  }
};

validateEnv();

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse un entier avec valeur par défaut
 */
const parseIntSafe = (value, defaultValue) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse un float avec valeur par défaut
 */
const parseFloatSafe = (value, defaultValue) => {
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Parse un boolean
 */
const parseBool = (value, defaultValue = false) => {
  if (value === undefined || value === null) return defaultValue;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return defaultValue;
};

/**
 * Parse une liste séparée par virgules
 */
const parseList = (value, defaultValue = []) => {
  if (!value) return defaultValue;
  return value.split(',').map(s => s.trim()).filter(Boolean);
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  
  // ══════════════════════════════════════════════════════════════════════════
  // SERVEUR
  // ══════════════════════════════════════════════════════════════════════════
  
  PORT: parseIntSafe(process.env.PORT, 5000),
  HOST: process.env.HOST || '0.0.0.0',
  NODE_ENV,
  
  // Mode simulation (bypass certaines validations en dev)
  SIMULATION_MODE: parseBool(process.env.SIMULATION_MODE, NODE_ENV === 'development'),
  
  // URLs
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  API_URL: process.env.API_URL || 'http://localhost:5000',
  ADMIN_URL: process.env.ADMIN_URL || 'http://localhost:3001',
  
  // CORS
  CORS_ORIGINS: parseList(process.env.CORS_ORIGINS, [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:19006', // Expo
    'exp://localhost:19000'
  ]),
  
  // Trust proxy (pour Heroku, AWS, etc.)
  TRUST_PROXY: parseBool(process.env.TRUST_PROXY, NODE_ENV === 'production'),
  
  // ══════════════════════════════════════════════════════════════════════════
  // MONGODB
  // ══════════════════════════════════════════════════════════════════════════
  
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/gowithsally',
  
  MONGODB_OPTIONS: {
    serverSelectionTimeoutMS: parseIntSafe(process.env.MONGODB_TIMEOUT, 30000),
    socketTimeoutMS: parseIntSafe(process.env.MONGODB_SOCKET_TIMEOUT, 45000),
    maxPoolSize: parseIntSafe(process.env.MONGODB_POOL_SIZE, 10),
    minPoolSize: parseIntSafe(process.env.MONGODB_MIN_POOL, 2),
    maxIdleTimeMS: 30000,
    retryWrites: true,
    retryReads: true
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // REDIS
  // ══════════════════════════════════════════════════════════════════════════
  
  REDIS_ENABLED: parseBool(process.env.REDIS_ENABLED, false),
  REDIS_URL: process.env.REDIS_URL || null,
  REDIS_HOST: process.env.REDIS_HOST || 'localhost',
  REDIS_PORT: parseIntSafe(process.env.REDIS_PORT, 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || '',
  REDIS_DB: parseIntSafe(process.env.REDIS_DB, 0),
  REDIS_PREFIX: process.env.REDIS_PREFIX || 'gws:',
  REDIS_TLS: parseBool(process.env.REDIS_TLS, false),
  
  // ══════════════════════════════════════════════════════════════════════════
  // JWT (JSON Web Tokens)
  // ══════════════════════════════════════════════════════════════════════════
  
  JWT_SECRET: process.env.JWT_SECRET || 'gowithsally-dev-secret-change-in-production-2024',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'gowithsally-refresh-dev-secret-2024',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '90d',
  JWT_ALGORITHM: 'HS256',
  JWT_ISSUER: process.env.JWT_ISSUER || 'gowithsally',
  JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'gowithsally-app',
  
  // ══════════════════════════════════════════════════════════════════════════
  // BCRYPT
  // ══════════════════════════════════════════════════════════════════════════
  
  BCRYPT_ROUNDS: parseIntSafe(process.env.BCRYPT_ROUNDS, 10),
  
  // ══════════════════════════════════════════════════════════════════════════
  // OTP (One Time Password)
  // ══════════════════════════════════════════════════════════════════════════
  
  OTP: {
    LENGTH: parseIntSafe(process.env.OTP_LENGTH, 6),
    EXPIRE_MINUTES: parseIntSafe(process.env.OTP_EXPIRE_MINUTES, 10),
    MAX_ATTEMPTS: parseIntSafe(process.env.OTP_MAX_ATTEMPTS, 5),
    COOLDOWN_MINUTES: parseIntSafe(process.env.OTP_COOLDOWN_MINUTES, 1),
    RESEND_COOLDOWN_SECONDS: parseIntSafe(process.env.OTP_RESEND_COOLDOWN, 60),
    // En dev, OTP fixe pour faciliter les tests
    DEV_CODE: NODE_ENV === 'development' ? '123456' : null
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // EMAIL (Nodemailer)
  // ══════════════════════════════════════════════════════════════════════════
  
  EMAIL: {
    ENABLED: parseBool(process.env.EMAIL_ENABLED, NODE_ENV === 'production'),
    HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
    PORT: parseIntSafe(process.env.EMAIL_PORT, 587),
    SECURE: parseBool(process.env.EMAIL_SECURE, false),
    USER: process.env.EMAIL_USER || '',
    PASS: process.env.EMAIL_PASS || '',
    FROM: process.env.EMAIL_FROM || 'Go With Sally <noreply@gowithsally.ma>',
    FROM_NAME: process.env.EMAIL_FROM_NAME || 'Go With Sally',
    REPLY_TO: process.env.EMAIL_REPLY_TO || 'support@gowithsally.ma',
    TEMPLATES_PATH: process.env.EMAIL_TEMPLATES_PATH || './templates/emails'
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // SMS (Twilio)
  // ══════════════════════════════════════════════════════════════════════════
  
  SMS: {
    ENABLED: parseBool(process.env.SMS_ENABLED, false),
    PROVIDER: process.env.SMS_PROVIDER || 'twilio',
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID || '',
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN || '',
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER || '',
    TWILIO_VERIFY_SID: process.env.TWILIO_VERIFY_SID || '',
    FALLBACK_ENABLED: parseBool(process.env.SMS_FALLBACK_ENABLED, false)
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // PAIEMENT
  // ══════════════════════════════════════════════════════════════════════════
  
  PAYMENT: {
    // Stripe
    STRIPE_ENABLED: parseBool(process.env.STRIPE_ENABLED, false),
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
    STRIPE_PUBLIC_KEY: process.env.STRIPE_PUBLIC_KEY || '',
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
    
    // CMI (Centre Monétique Interbancaire - Maroc)
    CMI_ENABLED: parseBool(process.env.CMI_ENABLED, false),
    CMI_STORE_ID: process.env.CMI_STORE_ID || '',
    CMI_MERCHANT_ID: process.env.CMI_MERCHANT_ID || '',
    CMI_SECRET_KEY: process.env.CMI_SECRET_KEY || '',
    CMI_GATEWAY_URL: process.env.CMI_GATEWAY_URL || 'https://payment.cmi.co.ma/fim/est3Dgate',
    CMI_CALLBACK_URL: process.env.CMI_CALLBACK_URL || '',
    
    // Options
    CASH_ENABLED: parseBool(process.env.CASH_ENABLED, true),
    WALLET_ENABLED: parseBool(process.env.WALLET_ENABLED, true),
    WALLET_MAX_BALANCE: parseFloatSafe(process.env.WALLET_MAX_BALANCE, 5000),
    WALLET_MIN_TOPUP: parseFloatSafe(process.env.WALLET_MIN_TOPUP, 20),
    WALLET_MAX_TOPUP: parseFloatSafe(process.env.WALLET_MAX_TOPUP, 2000)
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // PUSH NOTIFICATIONS (Firebase)
  // ══════════════════════════════════════════════════════════════════════════
  
  FIREBASE: {
    ENABLED: parseBool(process.env.FIREBASE_ENABLED, false),
    PROJECT_ID: process.env.FIREBASE_PROJECT_ID || '',
    PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') || '',
    CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || '',
    DATABASE_URL: process.env.FIREBASE_DATABASE_URL || ''
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // GOOGLE MAPS / GÉOLOCALISATION
  // ══════════════════════════════════════════════════════════════════════════
  
  MAPS: {
    GOOGLE_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',
    DEFAULT_SEARCH_RADIUS: parseIntSafe(process.env.DEFAULT_SEARCH_RADIUS, 10000),
    MAX_SEARCH_RADIUS: parseIntSafe(process.env.MAX_SEARCH_RADIUS, 50000),
    GPS_UPDATE_INTERVAL: parseIntSafe(process.env.GPS_UPDATE_INTERVAL, 5000),
    LOCATION_ACCURACY: parseIntSafe(process.env.LOCATION_ACCURACY, 50),
    DEFAULT_CENTER: {
      lat: parseFloatSafe(process.env.DEFAULT_LAT, 33.5731),
      lng: parseFloatSafe(process.env.DEFAULT_LNG, -7.5898)
    }
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // RECONNAISSANCE FACIALE
  // ══════════════════════════════════════════════════════════════════════════
  
  FACE_RECOGNITION: {
    ENABLED: parseBool(process.env.FACE_VERIFICATION_ENABLED, true),
    THRESHOLD: parseFloatSafe(process.env.FACE_RECOGNITION_THRESHOLD, 0.75),
    MODEL: process.env.FACE_RECOGNITION_MODEL || 'ssd_mobilenetv1',
    MAX_ATTEMPTS: parseIntSafe(process.env.FACE_MAX_ATTEMPTS, 3),
    COOLDOWN_HOURS: parseIntSafe(process.env.FACE_COOLDOWN_HOURS, 24)
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // STORAGE (Upload fichiers)
  // ══════════════════════════════════════════════════════════════════════════
  
  STORAGE: {
    PROVIDER: process.env.STORAGE_PROVIDER || 'local',
    
    // Local
    UPLOAD_PATH: process.env.UPLOAD_PATH || './uploads',
    UPLOAD_URL: process.env.UPLOAD_URL || '/uploads',
    
    // AWS S3
    S3_BUCKET: process.env.S3_BUCKET || '',
    S3_REGION: process.env.S3_REGION || 'eu-west-3',
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY || '',
    S3_SECRET_KEY: process.env.S3_SECRET_KEY || '',
    S3_CDN_URL: process.env.S3_CDN_URL || '',
    
    // Cloudinary
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || '',
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || '',
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || '',
    
    // Limites
    MAX_FILE_SIZE: parseIntSafe(process.env.MAX_FILE_SIZE, 10 * 1024 * 1024),
    MAX_FILES_PER_REQUEST: parseIntSafe(process.env.MAX_FILES_PER_REQUEST, 5),
    ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/heic'],
    ALLOWED_DOCUMENT_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
    
    // Dimensions
    AVATAR_SIZE: { width: 400, height: 400 },
    DOCUMENT_SIZE: { width: 1200, height: 1600 },
    THUMBNAIL_SIZE: { width: 150, height: 150 }
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // RATE LIMITING
  // ══════════════════════════════════════════════════════════════════════════
  
  RATE_LIMIT: {
    WINDOW_MS: parseIntSafe(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    MAX_REQUESTS: parseIntSafe(process.env.RATE_LIMIT_MAX_REQUESTS, 100),
    AUTH_WINDOW_MS: 60 * 1000,
    AUTH_MAX_REQUESTS: 5,
    OTP_WINDOW_MS: 60 * 1000,
    OTP_MAX_REQUESTS: 3,
    API_WINDOW_MS: 60 * 1000,
    API_MAX_REQUESTS: 30,
    SKIP_IN_DEV: parseBool(process.env.RATE_LIMIT_SKIP_DEV, true)
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // TARIFICATION (MAD)
  // ══════════════════════════════════════════════════════════════════════════
  
  PRICING: {
    CURRENCY: 'MAD',
    CURRENCY_SYMBOL: 'DH',
    
    BASE_FARE: parseFloatSafe(process.env.PRICING_BASE_FARE, 8),
    PER_KM: parseFloatSafe(process.env.PRICING_PER_KM, 5),
    PER_MINUTE: parseFloatSafe(process.env.PRICING_PER_MINUTE, 0.5),
    BOOKING_FEE: parseFloatSafe(process.env.PRICING_BOOKING_FEE, 3),
    
    MIN_FARE: parseFloatSafe(process.env.PRICING_MIN_FARE, 15),
    MAX_FARE: parseFloatSafe(process.env.PRICING_MAX_FARE, 500),
    
    STOP_FEE: parseFloatSafe(process.env.PRICING_STOP_FEE, 5),
    WAITING_FEE_PER_MINUTE: parseFloatSafe(process.env.PRICING_WAITING_FEE, 0.3),
    FREE_WAITING_MINUTES: parseIntSafe(process.env.PRICING_FREE_WAITING, 5),
    NIGHT_SURCHARGE: parseFloatSafe(process.env.PRICING_NIGHT_SURCHARGE, 1.2),
    
    SURGE_ENABLED: parseBool(process.env.SURGE_ENABLED, true),
    SURGE_MAX: parseFloatSafe(process.env.PRICING_SURGE_MAX, 2.5),
    SURGE_THRESHOLDS: {
      LOW: { demand: 0.5, multiplier: 1.0 },
      MEDIUM: { demand: 0.7, multiplier: 1.25 },
      HIGH: { demand: 0.85, multiplier: 1.5 },
      VERY_HIGH: { demand: 0.95, multiplier: 2.0 }
    },
    
    PEAK_HOURS: {
      MORNING: { start: 7, end: 9, multiplier: 1.2 },
      EVENING: { start: 17, end: 20, multiplier: 1.25 },
      NIGHT: { start: 22, end: 6, multiplier: 1.15 }
    },
    
    PLATFORM_COMMISSION: parseFloatSafe(process.env.PRICING_COMMISSION, 0.15),
    CANCELLATION_FEE: parseFloatSafe(process.env.PRICING_CANCELLATION_FEE, 10),
    FREE_CANCELLATION_MINUTES: parseIntSafe(process.env.FREE_CANCELLATION_MINUTES, 2),
    NO_SHOW_FEE: parseFloatSafe(process.env.PRICING_NO_SHOW_FEE, 15)
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // TYPES DE SERVICE
  // ══════════════════════════════════════════════════════════════════════════
  
  SERVICE_TYPES: {
    sally_eco: { key: 'sally_eco', name: 'Sally Eco', nameAr: 'سالي إيكو', multiplier: 0.85, maxPassengers: 4, minVehicleYear: 2015, icon: '🌱', active: true },
    sally_standard: { key: 'sally_standard', name: 'Sally Standard', nameAr: 'سالي عادي', multiplier: 1.0, maxPassengers: 4, minVehicleYear: 2018, icon: '🚗', active: true },
    sally_confort: { key: 'sally_confort', name: 'Sally Confort', nameAr: 'سالي مريح', multiplier: 1.3, maxPassengers: 4, minVehicleYear: 2020, icon: '✨', active: true },
    sally_premium: { key: 'sally_premium', name: 'Sally Premium', nameAr: 'سالي ممتاز', multiplier: 1.8, maxPassengers: 4, minVehicleYear: 2021, icon: '💎', active: true },
    sally_xl: { key: 'sally_xl', name: 'Sally XL', nameAr: 'سالي كبير', multiplier: 1.5, maxPassengers: 6, minVehicleYear: 2018, icon: '🚐', active: true },
    sally_pool: { key: 'sally_pool', name: 'Sally Pool', nameAr: 'سالي مشترك', multiplier: 0.6, maxPassengers: 3, minVehicleYear: 2018, icon: '👥', active: false }
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // VILLES SUPPORTÉES
  // ══════════════════════════════════════════════════════════════════════════
  
  CITIES: [
    { code: 'CAS', name: 'Casablanca', nameAr: 'الدار البيضاء', lat: 33.5731, lng: -7.5898, timezone: 'Africa/Casablanca', active: true, tier: 'primary' },
    { code: 'RAB', name: 'Rabat', nameAr: 'الرباط', lat: 34.0209, lng: -6.8416, timezone: 'Africa/Casablanca', active: true, tier: 'primary' },
    { code: 'MAR', name: 'Marrakech', nameAr: 'مراكش', lat: 31.6295, lng: -7.9811, timezone: 'Africa/Casablanca', active: true, tier: 'primary' },
    { code: 'TNG', name: 'Tanger', nameAr: 'طنجة', lat: 35.7595, lng: -5.8340, timezone: 'Africa/Casablanca', active: true, tier: 'secondary' },
    { code: 'FES', name: 'Fès', nameAr: 'فاس', lat: 34.0181, lng: -5.0078, timezone: 'Africa/Casablanca', active: true, tier: 'secondary' },
    { code: 'AGA', name: 'Agadir', nameAr: 'أكادير', lat: 30.4278, lng: -9.5981, timezone: 'Africa/Casablanca', active: false, tier: 'secondary' },
    { code: 'MEK', name: 'Meknès', nameAr: 'مكناس', lat: 33.8935, lng: -5.5473, timezone: 'Africa/Casablanca', active: false, tier: 'tertiary' },
    { code: 'OUJ', name: 'Oujda', nameAr: 'وجدة', lat: 34.6867, lng: -1.9114, timezone: 'Africa/Casablanca', active: false, tier: 'tertiary' },
    { code: 'KEN', name: 'Kénitra', nameAr: 'القنيطرة', lat: 34.2610, lng: -6.5802, timezone: 'Africa/Casablanca', active: false, tier: 'tertiary' },
    { code: 'TET', name: 'Tétouan', nameAr: 'تطوان', lat: 35.5889, lng: -5.3626, timezone: 'Africa/Casablanca', active: false, tier: 'tertiary' },
    { code: 'SAL', name: 'Salé', nameAr: 'سلا', lat: 34.0531, lng: -6.7985, timezone: 'Africa/Casablanca', active: true, tier: 'secondary' },
    { code: 'MOH', name: 'Mohammedia', nameAr: 'المحمدية', lat: 33.6833, lng: -7.3833, timezone: 'Africa/Casablanca', active: true, tier: 'secondary' }
  ],
  
  // ══════════════════════════════════════════════════════════════════════════
  // LANGUES
  // ══════════════════════════════════════════════════════════════════════════
  
  LANGUAGES: [
    { code: 'fr', name: 'Français', nativeName: 'Français', direction: 'ltr', default: true },
    { code: 'ar', name: 'Arabe', nativeName: 'العربية', direction: 'rtl', default: false },
    { code: 'en', name: 'Anglais', nativeName: 'English', direction: 'ltr', default: false },
    { code: 'darija', name: 'Darija', nativeName: 'الدارجة', direction: 'rtl', default: false }
  ],
  
  DEFAULT_LANGUAGE: 'fr',
  
  // ══════════════════════════════════════════════════════════════════════════
  // NUMÉROS D'URGENCE MAROC
  // ══════════════════════════════════════════════════════════════════════════
  
  EMERGENCY: {
    POLICE: '19',
    GENDARMERIE: '177',
    SAMU: '15',
    POMPIERS: '15',
    PROTECTION_CIVILE: '150',
    SOS_FEMMES_VIOLENCES: '8350',
    NUMERO_VERT_ENFANCE: '111',
    INFO_ROUTE: '5050'
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // GAMIFICATION
  // ══════════════════════════════════════════════════════════════════════════
  
  GAMIFICATION: {
    ENABLED: parseBool(process.env.GAMIFICATION_ENABLED, true),
    POINTS_PER_RIDE: 10,
    POINTS_PER_RATING: 5,
    POINTS_PER_REFERRAL: 100,
    POINTS_PER_KM: 1,
    WELCOME_BONUS: 50,
    
    LEVELS: [
      { level: 1, name: 'Bronze', nameAr: 'برونز', minPoints: 0, discount: 0, icon: '🥉' },
      { level: 2, name: 'Argent', nameAr: 'فضي', minPoints: 500, discount: 2, icon: '🥈' },
      { level: 3, name: 'Or', nameAr: 'ذهبي', minPoints: 1500, discount: 5, icon: '🥇' },
      { level: 4, name: 'Platine', nameAr: 'بلاتين', minPoints: 3000, discount: 8, icon: '💎' },
      { level: 5, name: 'Diamant', nameAr: 'ألماس', minPoints: 5000, discount: 10, icon: '👑' },
      { level: 6, name: 'Élite', nameAr: 'نخبة', minPoints: 10000, discount: 12, icon: '🌟' }
    ],
    
    POINTS_EXPIRY_MONTHS: 12
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // TIMEOUTS
  // ══════════════════════════════════════════════════════════════════════════
  
  TIMEOUTS: {
    RIDE_SEARCH: parseIntSafe(process.env.RIDE_SEARCH_TIMEOUT, 120000),
    RIDE_SEARCH_RADIUS_INCREASE_INTERVAL: 30000,
    RIDE_ACCEPT: parseIntSafe(process.env.RIDE_ACCEPT_TIMEOUT, 30000),
    PICKUP_WAIT: parseIntSafe(process.env.PICKUP_WAIT_TIMEOUT, 600000),
    DRIVER_IDLE: parseIntSafe(process.env.DRIVER_IDLE_TIMEOUT, 1800000),
    SOCKET_TIMEOUT: parseIntSafe(process.env.SOCKET_TIMEOUT, 30000),
    VERIFICATION_CODE_TTL: 600,
    PASSWORD_RESET_TTL: 3600,
    EMAIL_VERIFICATION_TTL: 86400,
    TOKEN_BLACKLIST_TTL: 86400 * 30
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // LOGGING
  // ══════════════════════════════════════════════════════════════════════════
  
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || (NODE_ENV === 'production' ? 'info' : 'debug'),
    FORMAT: process.env.LOG_FORMAT || 'combined',
    REQUEST_LOGGING: parseBool(process.env.REQUEST_LOGGING, true),
    PATH: process.env.LOG_PATH || './logs',
    MAX_SIZE: parseIntSafe(process.env.LOG_MAX_SIZE, 5 * 1024 * 1024),
    MAX_FILES: parseIntSafe(process.env.LOG_MAX_FILES, 10),
    COLORIZE: parseBool(process.env.LOG_COLORIZE, NODE_ENV !== 'production')
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // APP INFO
  // ══════════════════════════════════════════════════════════════════════════
  
  APP: {
    NAME: 'Go With Sally',
    NAME_AR: 'سالي',
    VERSION: process.env.APP_VERSION || '2.0.0',
    BUILD: process.env.APP_BUILD || '1',
    TAGLINE: 'Covoiturage sécurisé entre femmes au Maroc 🇲🇦',
    TAGLINE_AR: 'مشاركة السيارة الآمنة بين النساء في المغرب',
    WEBSITE: 'https://gowithsally.ma',
    SUPPORT_EMAIL: 'support@gowithsally.ma',
    SUPPORT_PHONE: '+212 5 22 00 00 00',
    SUPPORT_WHATSAPP: '+212 6 00 00 00 00',
    LEGAL_EMAIL: 'legal@gowithsally.ma',
    PRIVACY_URL: 'https://gowithsally.ma/privacy',
    TERMS_URL: 'https://gowithsally.ma/terms',
    FAQ_URL: 'https://gowithsally.ma/faq',
    STORE_IOS: 'https://apps.apple.com/app/gowithsally',
    STORE_ANDROID: 'https://play.google.com/store/apps/details?id=ma.gowithsally',
    SOCIAL: {
      FACEBOOK: 'https://facebook.com/gowithsally',
      INSTAGRAM: 'https://instagram.com/gowithsally',
      TWITTER: 'https://twitter.com/gowithsally',
      LINKEDIN: 'https://linkedin.com/company/gowithsally',
      TIKTOK: 'https://tiktok.com/@gowithsally'
    }
  },
  
  // ══════════════════════════════════════════════════════════════════════════
  // SÉCURITÉ
  // ══════════════════════════════════════════════════════════════════════════
  
  SECURITY: {
    HELMET_ENABLED: parseBool(process.env.HELMET_ENABLED, true),
    XSS_ENABLED: parseBool(process.env.XSS_ENABLED, true),
    HPP_ENABLED: parseBool(process.env.HPP_ENABLED, true),
    SESSION_SECRET: process.env.SESSION_SECRET || 'gowithsally-session-secret',
    SESSION_NAME: process.env.SESSION_NAME || 'gws.sid',
    SESSION_MAX_AGE: parseIntSafe(process.env.SESSION_MAX_AGE, 86400000),
    COOKIE_SECURE: parseBool(process.env.COOKIE_SECURE, NODE_ENV === 'production'),
    COOKIE_SAME_SITE: process.env.COOKIE_SAME_SITE || 'lax',
    MAX_IPS_PER_USER: parseIntSafe(process.env.MAX_IPS_PER_USER, 5),
    SUSPICIOUS_IP_THRESHOLD: parseIntSafe(process.env.SUSPICIOUS_IP_THRESHOLD, 10)
  }
};

// ============================================================================
// MÉTHODES HELPER
// ============================================================================

config.isProduction = () => config.NODE_ENV === 'production';
config.isDevelopment = () => config.NODE_ENV === 'development';
config.isStaging = () => config.NODE_ENV === 'staging';
config.isTest = () => config.NODE_ENV === 'test';

config.getCity = (code) => config.CITIES.find(c => c.code === code) || null;
config.getActiveCities = () => config.CITIES.filter(c => c.active);
config.getServiceType = (key) => config.SERVICE_TYPES[key] || null;
config.getActiveServiceTypes = () => Object.values(config.SERVICE_TYPES).filter(s => s.active);

config.calculateLevel = (points) => {
  const levels = [...config.GAMIFICATION.LEVELS].sort((a, b) => b.minPoints - a.minPoints);
  const current = levels.find(l => points >= l.minPoints) || levels[levels.length - 1];
  const next = levels.find(l => l.level === current.level + 1);
  
  return {
    ...current,
    nextLevel: next || null,
    pointsToNext: next ? next.minPoints - points : 0,
    progress: next ? ((points - current.minPoints) / (next.minPoints - current.minPoints)) * 100 : 100
  };
};

config.getRedisConfig = () => {
  if (config.REDIS_URL) return { url: config.REDIS_URL };
  return {
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    password: config.REDIS_PASSWORD || undefined,
    db: config.REDIS_DB,
    keyPrefix: config.REDIS_PREFIX,
    tls: config.REDIS_TLS ? {} : undefined
  };
};

config.getMongoConfig = () => ({
  uri: config.MONGODB_URI,
  options: config.MONGODB_OPTIONS
});

config.isServiceEnabled = (service) => {
  const services = {
    redis: config.REDIS_ENABLED,
    email: config.EMAIL.ENABLED,
    sms: config.SMS.ENABLED,
    firebase: config.FIREBASE.ENABLED,
    stripe: config.PAYMENT.STRIPE_ENABLED,
    cmi: config.PAYMENT.CMI_ENABLED,
    faceRecognition: config.FACE_RECOGNITION.ENABLED,
    gamification: config.GAMIFICATION.ENABLED
  };
  return services[service] ?? false;
};

config.getSummary = () => ({
  env: config.NODE_ENV,
  port: config.PORT,
  simulation: config.SIMULATION_MODE,
  mongodb: config.MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'),
  redis: config.REDIS_ENABLED ? `${config.REDIS_HOST}:${config.REDIS_PORT}` : 'disabled',
  services: {
    email: config.EMAIL.ENABLED,
    sms: config.SMS.ENABLED,
    firebase: config.FIREBASE.ENABLED,
    stripe: config.PAYMENT.STRIPE_ENABLED,
    cmi: config.PAYMENT.CMI_ENABLED
  },
  cities: config.getActiveCities().length,
  serviceTypes: config.getActiveServiceTypes().length
});

// ============================================================================
// LOG DÉMARRAGE
// ============================================================================

if (NODE_ENV !== 'test') {
  console.log('📄 [Config] Loaded');
  console.log(`📄 [Config] Environment: ${config.NODE_ENV}`);
  console.log(`📄 [Config] Port: ${config.PORT}`);
  console.log(`📄 [Config] Simulation: ${config.SIMULATION_MODE}`);
}

// ============================================================================
// EXPORT
// ============================================================================

module.exports = config;
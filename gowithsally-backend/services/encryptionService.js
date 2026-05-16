// ============================================================
// 📄 encryptionService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('encryptionService.js ▶ Module loaded')
//   • console.log('encryptionService.js ▶ encrypt() called')
// ============================================================

console.log('encryptionService.js ▶ Module loaded');

const crypto = require('crypto');

// ============================================================
// CONFIGURATION
// ============================================================

const ENCRYPTION_CONFIG = {
  ALGORITHM: 'aes-256-cbc',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'your-32-byte-encryption-key-here!!!',
  IV_LENGTH: 16, // Initialization vector length
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Valide la clé de chiffrement
 */
function validateEncryptionKey(key) {
  console.log('encryptionService.js ▶ validateEncryptionKey() called');

  if (!key) {
    throw new Error('Encryption key is not set');
  }

  if (key.length < 32) {
    console.warn('encryptionService.js ▶ Encryption key is too short (< 32 bytes)');
  }

  return true;
}

/**
 * Génère une clé de chiffrement de 32 octets
 */
function getEncryptionKey() {
  console.log('encryptionService.js ▶ getEncryptionKey() called');

  let key = ENCRYPTION_CONFIG.ENCRYPTION_KEY;

  // Si la clé est plus courte que 32 octets, la remplir
  if (key.length < 32) {
    key = key.padEnd(32, '0');
  }

  // Si la clé est plus longue que 32 octets, la tronquer
  if (key.length > 32) {
    key = key.substring(0, 32);
  }

  return Buffer.from(key);
}

// ============================================================
// MAIN SERVICE
// ============================================================

const encryptionService = {
  /**
   * Chiffre une données
   */
  encrypt(plaintext) {
    console.log('encryptionService.js ▶ encrypt() called');

    try {
      validateEncryptionKey(ENCRYPTION_CONFIG.ENCRYPTION_KEY);

      // Générer un IV aléatoire
      const iv = crypto.randomBytes(ENCRYPTION_CONFIG.IV_LENGTH);
      const key = getEncryptionKey();

      // Créer le cipher
      const cipher = crypto.createCipheriv(ENCRYPTION_CONFIG.ALGORITHM, key, iv);

      // Chiffrer les données
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combiner IV + encrypted (IV est en clair car il ne faut pas le mémoriser)
      const combined = iv.toString('hex') + ':' + encrypted;

      return combined;
    } catch (error) {
      console.error('encryptionService.js ▶ encrypt() error:', error.message);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  },

  /**
   * Déchiffre des données
   */
  decrypt(encryptedData) {
    console.log('encryptionService.js ▶ decrypt() called');

    try {
      validateEncryptionKey(ENCRYPTION_CONFIG.ENCRYPTION_KEY);

      // Séparer IV et données chiffrées
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const key = getEncryptionKey();

      // Créer le decipher
      const decipher = crypto.createDecipheriv(ENCRYPTION_CONFIG.ALGORITHM, key, iv);

      // Déchiffrer les données
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('encryptionService.js ▶ decrypt() error:', error.message);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  },

  /**
   * Chiffre un objet JSON
   */
  encryptObject(obj) {
    console.log('encryptionService.js ▶ encryptObject() called');

    try {
      const jsonString = JSON.stringify(obj);
      return this.encrypt(jsonString);
    } catch (error) {
      console.error('encryptionService.js ▶ encryptObject() error:', error.message);
      throw new Error(`Object encryption failed: ${error.message}`);
    }
  },

  /**
   * Déchiffre un objet JSON
   */
  decryptObject(encryptedData) {
    console.log('encryptionService.js ▶ decryptObject() called');

    try {
      const decrypted = this.decrypt(encryptedData);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('encryptionService.js ▶ decryptObject() error:', error.message);
      throw new Error(`Object decryption failed: ${error.message}`);
    }
  },

  /**
   * Hash une données avec SHA-256
   */
  hash(data) {
    console.log('encryptionService.js ▶ hash() called');

    try {
      return crypto
        .createHash('sha256')
        .update(data)
        .digest('hex');
    } catch (error) {
      console.error('encryptionService.js ▶ hash() error:', error.message);
      throw new Error(`Hash failed: ${error.message}`);
    }
  },

  /**
   * Génère un hash HMAC
   */
  hmac(data, secret) {
    console.log('encryptionService.js ▶ hmac() called');

    try {
      return crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');
    } catch (error) {
      console.error('encryptionService.js ▶ hmac() error:', error.message);
      throw new Error(`HMAC failed: ${error.message}`);
    }
  },

  /**
   * Génère un token sécurisé aléatoire
   */
  generateSecureToken(length = 32) {
    console.log('encryptionService.js ▶ generateSecureToken() called');

    try {
      return crypto.randomBytes(length).toString('hex');
    } catch (error) {
      console.error('encryptionService.js ▶ generateSecureToken() error:', error.message);
      throw new Error(`Token generation failed: ${error.message}`);
    }
  },

  /**
   * Valide une clé de chiffrement
   */
  validateKey(key) {
    console.log('encryptionService.js ▶ validateKey() called');

    return {
      isValid: key && key.length >= 32,
      keyLength: key ? key.length : 0,
      minLength: 32,
    };
  },

  /**
   * Récupère la configuration d'encryption
   */
  getConfig() {
    console.log('encryptionService.js ▶ getConfig() called');

    return {
      algorithm: ENCRYPTION_CONFIG.ALGORITHM,
      ivLength: ENCRYPTION_CONFIG.IV_LENGTH,
    };
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = encryptionService;

/**
 * ============================================================================
 * GO WITH SALLY - DATABASE CONFIGURATION
 * ============================================================================
 * Configuration et connexion aux bases de données
 * - MongoDB: Base de données principale
 * - Redis: Cache, sessions, géolocalisation temps réel, pub/sub
 * ============================================================================
 */

console.log('📄 [database.js] Fichier chargé');

const mongoose = require('mongoose');
const Redis = require('ioredis');
const config = require('./index');
const logger = require('../utils/logger');

console.log('📄 [database.js] Dépendances importées');

// ============================================================================
// MONGODB CONNECTION
// ============================================================================

/**
 * Connexion à MongoDB
 * Utilise Mongoose pour la gestion des modèles et requêtes
 * @returns {Promise<void>}
 */
const connectMongoDB = async () => {
  console.log('📄 [database.js] ▶ connectMongoDB() appelé');
  console.log('📄 [database.js] URI:', config.MONGODB_URI?.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));
  
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Configuration Mongoose
    // ─────────────────────────────────────────────────────────────────────────
    
    mongoose.set('strictQuery', false);
    
    // Options de connexion
    const mongooseOptions = {
      // Timeout de connexion (30 secondes)
      serverSelectionTimeoutMS: 30000,
      // Timeout des requêtes (45 secondes)
      socketTimeoutMS: 45000,
      // Taille du pool de connexions
      maxPoolSize: 10,
      minPoolSize: 2,
      // Heartbeat pour détecter les déconnexions
      heartbeatFrequencyMS: 10000
    };
    
    console.log('📄 [database.js] Options MongoDB:', JSON.stringify(mongooseOptions));
    
    // ─────────────────────────────────────────────────────────────────────────
    // Connexion
    // ─────────────────────────────────────────────────────────────────────────
    
    console.log('📄 [database.js] Connexion à MongoDB...');
    
    await mongoose.connect(config.MONGODB_URI, mongooseOptions);
    
    console.log('📄 [database.js] ✅ MongoDB connecté');
    logger.info('✅ MongoDB connected successfully');
    logger.info(`   Database: ${mongoose.connection.db.databaseName}`);
    logger.info(`   Host: ${mongoose.connection.host}`);
    logger.info(`   Port: ${mongoose.connection.port}`);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Gestionnaires d'événements
    // ─────────────────────────────────────────────────────────────────────────
    
    mongoose.connection.on('error', (err) => {
      console.log('📄 [database.js] ❌ MongoDB error:', err.message);
      logger.error(`MongoDB connection error: ${err.message}`);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('📄 [database.js] ⚠ MongoDB déconnecté');
      logger.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('reconnected', () => {
      console.log('📄 [database.js] ✅ MongoDB reconnecté');
      logger.info('MongoDB reconnected');
    });
    
    mongoose.connection.on('close', () => {
      console.log('📄 [database.js] MongoDB connexion fermée');
      logger.info('MongoDB connection closed');
    });
    
    // Gestion de la fermeture propre
    process.on('SIGINT', async () => {
      console.log('📄 [database.js] Fermeture MongoDB (SIGINT)...');
      await mongoose.connection.close();
      process.exit(0);
    });
    
  } catch (error) {
    console.log('📄 [database.js] ❌ MongoDB connexion échouée:', error.message);
    logger.error(`❌ MongoDB connection failed: ${error.message}`);
    
    // En production, on quitte si MongoDB n'est pas disponible
    if (config.NODE_ENV === 'production') {
      process.exit(1);
    }
    
    throw error;
  }
};

/**
 * Déconnexion de MongoDB
 * @returns {Promise<void>}
 */
const disconnectMongoDB = async () => {
  console.log('📄 [database.js] ▶ disconnectMongoDB() appelé');
  
  try {
    await mongoose.connection.close();
    console.log('📄 [database.js] ✅ MongoDB déconnecté proprement');
  } catch (error) {
    console.log('📄 [database.js] ❌ Erreur déconnexion MongoDB:', error.message);
  }
};

/**
 * Vérifier l'état de la connexion MongoDB
 * @returns {Object} - État de la connexion
 */
const getMongoDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    state: states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    port: mongoose.connection.port,
    name: mongoose.connection.name
  };
};

console.log('📄 [database.js] Fonctions MongoDB définies');

// ============================================================================
// REDIS CONNECTION
// ============================================================================

let redis = null;
let subscriber = null; // Client séparé pour les subscriptions

/**
 * Obtenir le client Redis principal
 * Crée le client si nécessaire (lazy initialization)
 * @returns {Redis} - Client Redis
 */
const getRedisClient = () => {
  console.log('📄 [database.js] ▶ getRedisClient() appelé');
  
  if (!redis) {
    console.log('📄 [database.js] Création du client Redis...');
    console.log('📄 [database.js] Redis Host:', config.REDIS_HOST);
    console.log('📄 [database.js] Redis Port:', config.REDIS_PORT);
    
    redis = new Redis({
      host: config.REDIS_HOST || 'localhost',
      port: config.REDIS_PORT || 6379,
      password: config.REDIS_PASSWORD || undefined,
      db: config.REDIS_DB || 0,
      
      // Stratégie de reconnexion
      retryStrategy: (times) => {
        console.log('📄 [database.js] Redis retry #', times);
        
        if (times > 5) {
          console.log('📄 [database.js] ⚠ Redis: abandon après 5 tentatives');
          logger.warn('Redis connection failed. Running without cache.');
          return null; // Stop retrying
        }
        
        // Délai exponentiel: 200ms, 400ms, 800ms, 1600ms, 2000ms
        return Math.min(times * 200, 2000);
      },
      
      // Limiter les retries par requête
      maxRetriesPerRequest: 3,
      
      // Ne pas connecter immédiatement
      lazyConnect: true,
      
      // Timeout de connexion
      connectTimeout: 10000,
      
      // Garder la connexion active
      keepAlive: 30000,
      
      // Nom de la connexion pour le debug
      connectionName: 'gowithsally-main'
    });
    
    // ─────────────────────────────────────────────────────────────────────────
    // Gestionnaires d'événements Redis
    // ─────────────────────────────────────────────────────────────────────────
    
    redis.on('connect', () => {
      console.log('📄 [database.js] ✅ Redis connecté');
      logger.info('✅ Redis connected');
    });
    
    redis.on('ready', () => {
      console.log('📄 [database.js] ✅ Redis prêt');
      logger.info('✅ Redis ready');
    });
    
    redis.on('error', (err) => {
      console.log('📄 [database.js] ❌ Redis error:', err.message);
      logger.error(`Redis error: ${err.message}`);
    });
    
    redis.on('close', () => {
      console.log('📄 [database.js] ⚠ Redis connexion fermée');
      logger.warn('Redis connection closed');
    });
    
    redis.on('reconnecting', (delay) => {
      console.log('📄 [database.js] Redis reconnexion dans', delay, 'ms');
      logger.info(`Redis reconnecting in ${delay}ms`);
    });
    
    redis.on('end', () => {
      console.log('📄 [database.js] Redis connexion terminée');
    });
  }
  
  return redis;
};

/**
 * Obtenir un client Redis pour les subscriptions (pub/sub)
 * Un client séparé est nécessaire car un client en mode subscribe
 * ne peut pas exécuter d'autres commandes
 * @returns {Redis} - Client Redis subscriber
 */
const getSubscriber = () => {
  console.log('📄 [database.js] ▶ getSubscriber() appelé');
  
  if (!subscriber) {
    console.log('📄 [database.js] Création du subscriber Redis...');
    
    subscriber = new Redis({
      host: config.REDIS_HOST || 'localhost',
      port: config.REDIS_PORT || 6379,
      password: config.REDIS_PASSWORD || undefined,
      db: config.REDIS_DB || 0,
      lazyConnect: true,
      connectionName: 'gowithsally-subscriber'
    });
    
    subscriber.on('error', (err) => {
      console.log('📄 [database.js] ❌ Redis subscriber error:', err.message);
    });
  }
  
  return subscriber;
};

/**
 * Connexion à Redis (non-bloquante)
 * @returns {Promise<void>}
 */
const connectRedis = async () => {
  console.log('📄 [database.js] ▶ connectRedis() appelé');
  
  try {
    const client = getRedisClient();
    await client.connect();
    console.log('📄 [database.js] ✅ Redis connecté');
  } catch (error) {
    console.log('📄 [database.js] ⚠ Redis connexion ignorée:', error.message);
    logger.warn(`Redis connection skipped: ${error.message}`);
  }
};

/**
 * Déconnexion de Redis
 * @returns {Promise<void>}
 */
const disconnectRedis = async () => {
  console.log('📄 [database.js] ▶ disconnectRedis() appelé');
  
  try {
    if (redis) {
      await redis.quit();
      redis = null;
      console.log('📄 [database.js] ✅ Redis déconnecté');
    }
    
    if (subscriber) {
      await subscriber.quit();
      subscriber = null;
      console.log('📄 [database.js] ✅ Redis subscriber déconnecté');
    }
  } catch (error) {
    console.log('📄 [database.js] ❌ Erreur déconnexion Redis:', error.message);
  }
};

/**
 * Vérifier l'état de la connexion Redis
 * @returns {Object} - État de la connexion
 */
const getRedisStatus = () => {
  if (!redis) {
    return { connected: false, state: 'not_initialized' };
  }
  
  return {
    connected: redis.status === 'ready',
    state: redis.status,
    host: config.REDIS_HOST,
    port: config.REDIS_PORT
  };
};

console.log('📄 [database.js] Fonctions Redis définies');

// ============================================================================
// REDIS HELPERS - Cache
// ============================================================================

/**
 * Définir une valeur avec expiration
 * @param {string} key - Clé
 * @param {any} value - Valeur (string ou objet)
 * @param {number} seconds - Durée de vie en secondes (défaut: 1h)
 * @returns {Promise<string|null>} - 'OK' ou null si erreur
 */
const setEx = async (key, value, seconds = 3600) => {
  console.log('📄 [database.js] ▶ setEx():', key, '- TTL:', seconds, 's');
  
  try {
    const client = getRedisClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    const result = await client.setex(key, seconds, stringValue);
    console.log('📄 [database.js] ✓ setEx OK');
    return result;
  } catch (error) {
    console.log('📄 [database.js] ❌ setEx error:', error.message);
    logger.error(`Redis setEx error: ${error.message}`);
    return null;
  }
};

/**
 * Définir une valeur sans expiration
 * @param {string} key - Clé
 * @param {any} value - Valeur
 * @returns {Promise<string|null>}
 */
const set = async (key, value) => {
  console.log('📄 [database.js] ▶ set():', key);
  
  try {
    const client = getRedisClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return await client.set(key, stringValue);
  } catch (error) {
    console.log('📄 [database.js] ❌ set error:', error.message);
    logger.error(`Redis set error: ${error.message}`);
    return null;
  }
};

/**
 * Récupérer une valeur (avec parsing JSON automatique)
 * @param {string} key - Clé
 * @returns {Promise<any>} - Valeur parsée ou null
 */
const get = async (key) => {
  console.log('📄 [database.js] ▶ get():', key);
  
  try {
    const client = getRedisClient();
    const value = await client.get(key);
    
    if (!value) {
      console.log('📄 [database.js] get: clé non trouvée');
      return null;
    }
    
    // Tenter de parser en JSON
    try {
      const parsed = JSON.parse(value);
      console.log('📄 [database.js] ✓ get OK (JSON)');
      return parsed;
    } catch {
      // Si ce n'est pas du JSON, retourner la string
      console.log('📄 [database.js] ✓ get OK (string)');
      return value;
    }
  } catch (error) {
    console.log('📄 [database.js] ❌ get error:', error.message);
    logger.error(`Redis get error: ${error.message}`);
    return null;
  }
};

/**
 * Supprimer une clé
 * @param {string} key - Clé à supprimer
 * @returns {Promise<number|null>} - Nombre de clés supprimées
 */
const del = async (key) => {
  console.log('📄 [database.js] ▶ del():', key);
  
  try {
    const client = getRedisClient();
    const result = await client.del(key);
    console.log('📄 [database.js] ✓ del OK:', result);
    return result;
  } catch (error) {
    console.log('📄 [database.js] ❌ del error:', error.message);
    logger.error(`Redis del error: ${error.message}`);
    return null;
  }
};

/**
 * Vérifier si une clé existe
 * @param {string} key - Clé
 * @returns {Promise<number>} - 1 si existe, 0 sinon
 */
const exists = async (key) => {
  console.log('📄 [database.js] ▶ exists():', key);
  
  try {
    const client = getRedisClient();
    return await client.exists(key);
  } catch (error) {
    console.log('📄 [database.js] ❌ exists error:', error.message);
    logger.error(`Redis exists error: ${error.message}`);
    return 0;
  }
};

/**
 * Obtenir le TTL d'une clé
 * @param {string} key - Clé
 * @returns {Promise<number>} - TTL en secondes (-2 si n'existe pas, -1 si pas d'expiration)
 */
const ttl = async (key) => {
  console.log('📄 [database.js] ▶ ttl():', key);
  
  try {
    const client = getRedisClient();
    return await client.ttl(key);
  } catch (error) {
    console.log('📄 [database.js] ❌ ttl error:', error.message);
    return -2;
  }
};

/**
 * Définir l'expiration d'une clé existante
 * @param {string} key - Clé
 * @param {number} seconds - TTL en secondes
 * @returns {Promise<number>} - 1 si succès, 0 si clé n'existe pas
 */
const expire = async (key, seconds) => {
  console.log('📄 [database.js] ▶ expire():', key, seconds, 's');
  
  try {
    const client = getRedisClient();
    return await client.expire(key, seconds);
  } catch (error) {
    console.log('📄 [database.js] ❌ expire error:', error.message);
    return 0;
  }
};

console.log('📄 [database.js] Helpers cache définis');

// ============================================================================
// REDIS HELPERS - Compteurs
// ============================================================================

/**
 * Incrémenter une valeur
 * @param {string} key - Clé
 * @returns {Promise<number|null>} - Nouvelle valeur
 */
const incr = async (key) => {
  console.log('📄 [database.js] ▶ incr():', key);
  
  try {
    const client = getRedisClient();
    return await client.incr(key);
  } catch (error) {
    console.log('📄 [database.js] ❌ incr error:', error.message);
    logger.error(`Redis incr error: ${error.message}`);
    return null;
  }
};

/**
 * Incrémenter une valeur de N
 * @param {string} key - Clé
 * @param {number} increment - Valeur à ajouter
 * @returns {Promise<number|null>}
 */
const incrBy = async (key, increment) => {
  console.log('📄 [database.js] ▶ incrBy():', key, '+', increment);
  
  try {
    const client = getRedisClient();
    return await client.incrby(key, increment);
  } catch (error) {
    console.log('📄 [database.js] ❌ incrBy error:', error.message);
    return null;
  }
};

/**
 * Décrémenter une valeur
 * @param {string} key - Clé
 * @returns {Promise<number|null>}
 */
const decr = async (key) => {
  console.log('📄 [database.js] ▶ decr():', key);
  
  try {
    const client = getRedisClient();
    return await client.decr(key);
  } catch (error) {
    console.log('📄 [database.js] ❌ decr error:', error.message);
    return null;
  }
};

console.log('📄 [database.js] Helpers compteurs définis');

// ============================================================================
// REDIS HELPERS - Hash
// ============================================================================

/**
 * Définir un champ dans un hash
 * @param {string} key - Clé du hash
 * @param {string} field - Champ
 * @param {any} value - Valeur
 * @returns {Promise<number|null>}
 */
const hSet = async (key, field, value) => {
  console.log('📄 [database.js] ▶ hSet():', key, field);
  
  try {
    const client = getRedisClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return await client.hset(key, field, stringValue);
  } catch (error) {
    console.log('📄 [database.js] ❌ hSet error:', error.message);
    return null;
  }
};

/**
 * Récupérer un champ d'un hash
 * @param {string} key - Clé du hash
 * @param {string} field - Champ
 * @returns {Promise<any>}
 */
const hGet = async (key, field) => {
  console.log('📄 [database.js] ▶ hGet():', key, field);
  
  try {
    const client = getRedisClient();
    const value = await client.hget(key, field);
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.log('📄 [database.js] ❌ hGet error:', error.message);
    return null;
  }
};

/**
 * Récupérer tous les champs d'un hash
 * @param {string} key - Clé du hash
 * @returns {Promise<Object|null>}
 */
const hGetAll = async (key) => {
  console.log('📄 [database.js] ▶ hGetAll():', key);
  
  try {
    const client = getRedisClient();
    return await client.hgetall(key);
  } catch (error) {
    console.log('📄 [database.js] ❌ hGetAll error:', error.message);
    return null;
  }
};

/**
 * Supprimer un champ d'un hash
 * @param {string} key - Clé du hash
 * @param {string} field - Champ à supprimer
 * @returns {Promise<number|null>}
 */
const hDel = async (key, field) => {
  console.log('📄 [database.js] ▶ hDel():', key, field);
  
  try {
    const client = getRedisClient();
    return await client.hdel(key, field);
  } catch (error) {
    console.log('📄 [database.js] ❌ hDel error:', error.message);
    return null;
  }
};

console.log('📄 [database.js] Helpers hash définis');

// ============================================================================
// REDIS HELPERS - Géospatial
// ============================================================================

/**
 * Ajouter une position géographique
 * @param {string} key - Clé de l'index géo
 * @param {number} longitude - Longitude
 * @param {number} latitude - Latitude
 * @param {string} member - Identifiant du membre
 * @returns {Promise<number|null>}
 */
const geoAdd = async (key, longitude, latitude, member) => {
  console.log('📄 [database.js] ▶ geoAdd():', key, member, '- [', longitude, latitude, ']');
  
  try {
    const client = getRedisClient();
    return await client.geoadd(key, longitude, latitude, member);
  } catch (error) {
    console.log('📄 [database.js] ❌ geoAdd error:', error.message);
    logger.error(`Redis geoAdd error: ${error.message}`);
    return null;
  }
};

/**
 * Supprimer un membre d'un index géo
 * @param {string} key - Clé de l'index
 * @param {string} member - Identifiant du membre
 * @returns {Promise<number|null>}
 */
const geoRemove = async (key, member) => {
  console.log('📄 [database.js] ▶ geoRemove():', key, member);
  
  try {
    const client = getRedisClient();
    return await client.zrem(key, member);
  } catch (error) {
    console.log('📄 [database.js] ❌ geoRemove error:', error.message);
    return null;
  }
};

/**
 * Rechercher par rayon
 * @param {string} key - Clé de l'index géo
 * @param {number} longitude - Longitude du centre
 * @param {number} latitude - Latitude du centre
 * @param {number} radius - Rayon de recherche
 * @param {string} unit - Unité (km, m, mi, ft) - défaut: km
 * @returns {Promise<Array>} - Liste des membres avec distance
 */
const geoRadius = async (key, longitude, latitude, radius, unit = 'km') => {
  console.log('📄 [database.js] ▶ geoRadius():', key, '- [', longitude, latitude, ']', radius, unit);
  
  try {
    const client = getRedisClient();
    const results = await client.georadius(
      key, 
      longitude, 
      latitude, 
      radius, 
      unit, 
      'WITHDIST',  // Inclure la distance
      'WITHCOORD', // Inclure les coordonnées
      'ASC'        // Trier par distance croissante
    );
    
    console.log('📄 [database.js] ✓ geoRadius:', results.length, 'résultats');
    return results;
  } catch (error) {
    console.log('📄 [database.js] ❌ geoRadius error:', error.message);
    logger.error(`Redis geoRadius error: ${error.message}`);
    return [];
  }
};

/**
 * Rechercher par rayon autour d'un membre existant
 * @param {string} key - Clé de l'index géo
 * @param {string} member - Membre centre de la recherche
 * @param {number} radius - Rayon
 * @param {string} unit - Unité
 * @returns {Promise<Array>}
 */
const geoRadiusByMember = async (key, member, radius, unit = 'km') => {
  console.log('📄 [database.js] ▶ geoRadiusByMember():', key, member, radius, unit);
  
  try {
    const client = getRedisClient();
    return await client.georadiusbymember(key, member, radius, unit, 'WITHDIST', 'ASC');
  } catch (error) {
    console.log('📄 [database.js] ❌ geoRadiusByMember error:', error.message);
    return [];
  }
};

/**
 * Obtenir la position d'un membre
 * @param {string} key - Clé de l'index géo
 * @param {string} member - Membre
 * @returns {Promise<Array|null>} - [longitude, latitude] ou null
 */
const geoPos = async (key, member) => {
  console.log('📄 [database.js] ▶ geoPos():', key, member);
  
  try {
    const client = getRedisClient();
    const result = await client.geopos(key, member);
    return result[0] || null;
  } catch (error) {
    console.log('📄 [database.js] ❌ geoPos error:', error.message);
    return null;
  }
};

/**
 * Calculer la distance entre deux membres
 * @param {string} key - Clé de l'index géo
 * @param {string} member1 - Premier membre
 * @param {string} member2 - Second membre
 * @param {string} unit - Unité
 * @returns {Promise<number|null>} - Distance ou null
 */
const geoDist = async (key, member1, member2, unit = 'km') => {
  console.log('📄 [database.js] ▶ geoDist():', member1, '↔', member2);
  
  try {
    const client = getRedisClient();
    return await client.geodist(key, member1, member2, unit);
  } catch (error) {
    console.log('📄 [database.js] ❌ geoDist error:', error.message);
    return null;
  }
};

console.log('📄 [database.js] Helpers géospatial définis');

// ============================================================================
// REDIS HELPERS - Pub/Sub
// ============================================================================

/**
 * Publier un message sur un canal
 * @param {string} channel - Canal
 * @param {any} message - Message (string ou objet)
 * @returns {Promise<number|null>} - Nombre de subscribers qui ont reçu
 */
const publish = async (channel, message) => {
  console.log('📄 [database.js] ▶ publish():', channel);
  
  try {
    const client = getRedisClient();
    const stringMessage = typeof message === 'string' ? message : JSON.stringify(message);
    return await client.publish(channel, stringMessage);
  } catch (error) {
    console.log('📄 [database.js] ❌ publish error:', error.message);
    logger.error(`Redis publish error: ${error.message}`);
    return null;
  }
};

/**
 * S'abonner à un canal
 * @param {string} channel - Canal
 * @param {Function} callback - Fonction appelée pour chaque message
 * @returns {Promise<void>}
 */
const subscribe = async (channel, callback) => {
  console.log('📄 [database.js] ▶ subscribe():', channel);
  
  try {
    const sub = getSubscriber();
    await sub.connect();
    
    await sub.subscribe(channel, (err, count) => {
      if (err) {
        console.log('📄 [database.js] ❌ subscribe error:', err.message);
      } else {
        console.log('📄 [database.js] ✓ Abonné à', count, 'canal(aux)');
      }
    });
    
    sub.on('message', (ch, message) => {
      if (ch === channel) {
        try {
          const parsed = JSON.parse(message);
          callback(parsed);
        } catch {
          callback(message);
        }
      }
    });
    
  } catch (error) {
    console.log('📄 [database.js] ❌ subscribe error:', error.message);
  }
};

/**
 * Se désabonner d'un canal
 * @param {string} channel - Canal
 * @returns {Promise<void>}
 */
const unsubscribe = async (channel) => {
  console.log('📄 [database.js] ▶ unsubscribe():', channel);
  
  try {
    const sub = getSubscriber();
    await sub.unsubscribe(channel);
    console.log('📄 [database.js] ✓ Désabonné de', channel);
  } catch (error) {
    console.log('📄 [database.js] ❌ unsubscribe error:', error.message);
  }
};

console.log('📄 [database.js] Helpers pub/sub définis');

// ============================================================================
// REDIS HELPERS - Lists (pour les queues)
// ============================================================================

/**
 * Ajouter à la fin d'une liste
 * @param {string} key - Clé
 * @param {any} value - Valeur
 * @returns {Promise<number|null>}
 */
const rPush = async (key, value) => {
  console.log('📄 [database.js] ▶ rPush():', key);
  
  try {
    const client = getRedisClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    return await client.rpush(key, stringValue);
  } catch (error) {
    console.log('📄 [database.js] ❌ rPush error:', error.message);
    return null;
  }
};

/**
 * Retirer du début d'une liste (bloquant)
 * @param {string} key - Clé
 * @param {number} timeout - Timeout en secondes
 * @returns {Promise<any>}
 */
const bLPop = async (key, timeout = 0) => {
  console.log('📄 [database.js] ▶ bLPop():', key);
  
  try {
    const client = getRedisClient();
    const result = await client.blpop(key, timeout);
    if (!result) return null;
    
    try {
      return JSON.parse(result[1]);
    } catch {
      return result[1];
    }
  } catch (error) {
    console.log('📄 [database.js] ❌ bLPop error:', error.message);
    return null;
  }
};

/**
 * Obtenir la longueur d'une liste
 * @param {string} key - Clé
 * @returns {Promise<number>}
 */
const lLen = async (key) => {
  console.log('📄 [database.js] ▶ lLen():', key);
  
  try {
    const client = getRedisClient();
    return await client.llen(key);
  } catch (error) {
    console.log('📄 [database.js] ❌ lLen error:', error.message);
    return 0;
  }
};

console.log('📄 [database.js] Helpers lists définis');

// ============================================================================
// EXPORTS
// ============================================================================

console.log('📄 [database.js] ✅ Module exporté');
console.log('📄 [database.js] Exports MongoDB: connectMongoDB, disconnectMongoDB, getMongoDBStatus');
console.log('📄 [database.js] Exports Redis: connectRedis, disconnectRedis, getRedisClient, getRedisStatus');
console.log('📄 [database.js] Exports Cache: set, setEx, get, del, exists, ttl, expire');
console.log('📄 [database.js] Exports Counters: incr, incrBy, decr');
console.log('📄 [database.js] Exports Hash: hSet, hGet, hGetAll, hDel');
console.log('📄 [database.js] Exports Geo: geoAdd, geoRemove, geoRadius, geoRadiusByMember, geoPos, geoDist');
console.log('📄 [database.js] Exports PubSub: publish, subscribe, unsubscribe');
console.log('📄 [database.js] Exports Lists: rPush, bLPop, lLen');

module.exports = {
  // MongoDB
  connectMongoDB,
  disconnectMongoDB,
  getMongoDBStatus,
  mongoose,
  
  // Redis connexion
  connectRedis,
  disconnectRedis,
  getRedisClient,
  getSubscriber,
  getRedisStatus,
  redis: getRedisClient,
  
  // Cache
  set,
  setEx,
  get,
  del,
  exists,
  ttl,
  expire,
  
  // Compteurs
  incr,
  incrBy,
  decr,
  
  // Hash
  hSet,
  hGet,
  hGetAll,
  hDel,
  
  // Géospatial
  geoAdd,
  geoRemove,
  geoRadius,
  geoRadiusByMember,
  geoPos,
  geoDist,
  
  // Pub/Sub
  publish,
  subscribe,
  unsubscribe,
  
  // Lists (queues)
  rPush,
  bLPop,
  lLen
};
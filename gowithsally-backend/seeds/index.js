/**
 * ============================================================================
 * GO WITH SALLY - DATABASE SEEDER
 * ============================================================================
 * @version 2.1.0
 * Script principal pour injecter les données de test dans MongoDB
 * ✅ FIX: seedChat reçoit drivers[] et mappe Driver._id -> User._id
 * 
 * Usage:
 *   node seeds/index.js              # Ajoute les données (sans reset)
 *   node seeds/index.js --reset      # Reset complet + seed
 *   node seeds/index.js --reset -y   # Reset sans confirmation
 *   node seeds/index.js --dry-run    # Simulation sans écriture
 *   node seeds/index.js --only=users # Seed uniquement users
 *   node seeds/index.js --count=100  # Nombre de données générées
 * ============================================================================
 */

require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');

// ============================================================================
// CONFIGURATION
// ============================================================================

const config = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/gowithsally',
  DEFAULT_COUNT: {
    users: 30,
    drivers: 15,
    rides: 100,
    notifications: 50,
    activities: 150,
    reports: 40,
    messages: 200
  }
};

// ============================================================================
// COULEURS CONSOLE
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  white: '\x1b[37m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

// ============================================================================
// LOGGER
// ============================================================================

const log = {
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${colors.yellow}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✖${colors.reset}  ${colors.red}${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}═══ ${msg} ${'═'.repeat(Math.max(0, 50 - msg.length))}${colors.reset}\n`),
  subtitle: (msg) => console.log(`${colors.bright}${colors.blue}▸ ${msg}${colors.reset}`),
  step: (num, total, msg) => console.log(`${colors.dim}[${num}/${total}]${colors.reset} ${msg}`),
  item: (icon, msg) => console.log(`    ${icon} ${msg}`),
  divider: () => console.log(`${colors.dim}${'─'.repeat(60)}${colors.reset}`),
  newline: () => console.log('')
};

// ============================================================================
// PROGRESS BAR
// ============================================================================

const progressBar = (current, total, label = '') => {
  const width = 30;
  const percent = Math.round((current / total) * 100);
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const bar = `${colors.green}${'█'.repeat(filled)}${colors.dim}${'░'.repeat(empty)}${colors.reset}`;
  process.stdout.write(`\r    ${bar} ${percent.toString().padStart(3)}% ${label.substring(0, 20).padEnd(20)}`);
  if (current === total) console.log('');
};

// ============================================================================
// MODELS - Import avec fallback
// ============================================================================

let models = {};

const loadModels = () => {
  log.subtitle('Chargement des modèles...');
  
  const modelNames = ['User', 'Driver', 'Ride', 'Message', 'Conversation', 'Notification', 'Payment', 'Review', 'Promo', 'Badge', 'Activity', 'SupportTicket', 'OTP'];
  
  try {
    models = require('../models');
    log.success(`Modèles chargés depuis models/index.js`);
  } catch (e) {
    log.warning(`models/index.js non trouvé, import individuel...`);
    
    for (const name of modelNames) {
      try {
        models[name] = require(`../models/${name}`);
        log.item('✓', `${name}`);
      } catch (err) {
        log.item('⚠', `${name} (non trouvé)`);
      }
    }
  }
  
  const required = ['User', 'Driver', 'Ride'];
  const missing = required.filter(m => !models[m]);
  
  if (missing.length > 0) {
    log.error(`Modèles requis manquants: ${missing.join(', ')}`);
    process.exit(1);
  }
  
  log.success(`${Object.keys(models).filter(k => models[k]).length} modèles disponibles`);
  return models;
};

// ============================================================================
// SEED DATA - Import avec fallback
// ============================================================================

let seedData = {};

const loadSeedData = () => {
  log.subtitle('Chargement des données seed...');
  
  const dataModules = {
    users: './data/users',
    drivers: './data/drivers',
    rides: './data/rides',
    chat: './data/chat',
    notifications: './data/notifications',
    admin: './data/admin'
  };
  
  for (const [name, path] of Object.entries(dataModules)) {
    try {
      seedData[name] = require(path);
      log.item('✓', `${name}`);
    } catch (err) {
      log.item('⚠', `${name} (${err.message})`);
      seedData[name] = null;
    }
  }
  
  const loaded = Object.values(seedData).filter(Boolean).length;
  log.success(`${loaded}/${Object.keys(dataModules).length} modules de données chargés`);
  
  return seedData;
};

// ============================================================================
// DATABASE CONNECTION
// ============================================================================

const connectDB = async () => {
  log.title('CONNEXION MONGODB');
  
  try {
    const options = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000
    };
    
    await mongoose.connect(config.MONGODB_URI, options);
    
    const { host, port, name } = mongoose.connection;
    log.success(`Connecté à MongoDB`);
    log.item('🔗', `Host: ${host}:${port}`);
    log.item('📁', `Database: ${name}`);
    
    return true;
  } catch (error) {
    log.error(`Échec connexion: ${error.message}`);
    return false;
  }
};

// ============================================================================
// CONFIRMATION PROMPT
// ============================================================================

const confirm = async (message) => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question(`${colors.yellow}⚠ ${message} (y/N): ${colors.reset}`, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
};

// ============================================================================
// CLEAR DATABASE
// ============================================================================

const clearDatabase = async (options = {}) => {
  log.title('NETTOYAGE DATABASE');
  
  if (!options.skipConfirm) {
    const confirmed = await confirm('Voulez-vous vraiment supprimer toutes les données?');
    if (!confirmed) {
      log.warning('Opération annulée');
      return false;
    }
  }
  
  const collections = [
    'users', 'drivers', 'rides', 
    'conversations', 'messages', 
    'notifications', 'payments', 
    'reviews', 'promos', 'badges',
    'activities', 'verifications', 'reports', 
    'settings', 'otps', 'supporttickets'
  ];
  
  let cleared = 0;
  let totalDocs = 0;
  
  for (const collection of collections) {
    try {
      const result = await mongoose.connection.collection(collection).deleteMany({});
      if (result.deletedCount > 0) {
        log.item('🗑️', `${collection}: ${result.deletedCount} documents`);
        totalDocs += result.deletedCount;
        cleared++;
      }
    } catch (error) {
      if (error.codeName !== 'NamespaceNotFound') {
        log.warning(`${collection}: ${error.message}`);
      }
    }
  }
  
  log.success(`${cleared} collections nettoyées (${totalDocs} documents supprimés)`);
  return true;
};

// ============================================================================
// SEED USERS
// ============================================================================

const seedUsers = async (count = 30, options = {}) => {
  log.title('SEED UTILISATRICES');
  
  if (!seedData.users) {
    log.error('Module users non disponible');
    return [];
  }
  
  const { User } = models;
  if (!User) {
    log.error('Modèle User non disponible');
    return [];
  }
  
  const { predefinedUsers = [], generateUsers } = seedData.users;
  
  const generatedUsers = generateUsers ? generateUsers(count, { hashPasswords: false }) : [];
  const allUsers = [...predefinedUsers.map(u => ({
    ...u,
    password: u.password || 'password123'
  })), ...generatedUsers];
  
  log.info(`${allUsers.length} utilisatrices à créer (${predefinedUsers.length} prédéfinies + ${generatedUsers.length} générées)`);
  
  const createdUsers = [];
  const errors = { duplicates: 0, other: 0 };
  
  for (let i = 0; i < allUsers.length; i++) {
    const userData = allUsers[i];
    
    if (options.dryRun) {
      createdUsers.push({ ...userData, _id: new mongoose.Types.ObjectId() });
      continue;
    }
    
    try {
      const user = await User.create(userData);
      createdUsers.push(user);
      
      if (i < 10 || userData.isTestAccount) {
        const icon = { admin: '👑', driver: '🚗', user: '👤', support: '🎧', moderator: '🛡️' }[user.role] || '👤';
        log.item(icon, `${user.firstName} ${user.lastName} (${user.email})`);
      } else if (i === 10) {
        log.item('...', `${allUsers.length - 10} autres utilisatrices...`);
      }
      
      progressBar(i + 1, allUsers.length, `${userData.firstName}`);
    } catch (error) {
      if (error.code === 11000) {
        errors.duplicates++;
      } else {
        errors.other++;
        if (errors.other <= 3) {
          log.error(`${userData.email}: ${error.message}`);
        }
      }
    }
  }
  
  log.newline();
  log.success(`${createdUsers.length} utilisatrices créées`);
  if (errors.duplicates > 0) log.warning(`${errors.duplicates} doublons ignorés`);
  if (errors.other > 0) log.warning(`${errors.other} erreurs`);
  
  const byRole = createdUsers.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(byRole).forEach(([role, count]) => {
    const icon = { admin: '👑', driver: '🚗', user: '👤', support: '🎧', moderator: '🛡️' }[role] || '👤';
    log.item(icon, `${role}: ${count}`);
  });
  
  return createdUsers;
};

// ============================================================================
// SEED DRIVERS
// ============================================================================

const seedDrivers = async (users, options = {}) => {
  log.title('SEED CONDUCTRICES');
  
  if (!seedData.drivers) {
    log.error('Module drivers non disponible');
    return [];
  }
  
  const { Driver } = models;
  if (!Driver) {
    log.error('Modèle Driver non disponible');
    return [];
  }
  
  const { predefinedDrivers = [], generateDrivers } = seedData.drivers;
  const driverUsers = users.filter(u => u.role === 'driver');
  
  if (driverUsers.length === 0) {
    log.warning('Aucune utilisatrice avec role=driver');
    return [];
  }
  
  log.info(`${driverUsers.length} conductrices à configurer`);
  
  const generatedDriverData = generateDrivers ? generateDrivers(driverUsers.length, driverUsers) : [];
  
  const createdDrivers = [];
  const errors = { duplicates: 0, other: 0 };
  
  for (let i = 0; i < driverUsers.length; i++) {
    const user = driverUsers[i];
    
    const predefined = predefinedDrivers.find(d => d.userEmail === user.email);
    const driverData = predefined || generatedDriverData[i] || generateDrivers(1, [user])[0];
    
    if (options.dryRun) {
      createdDrivers.push({ ...driverData, _id: new mongoose.Types.ObjectId(), user: user._id });
      continue;
    }
    
    try {
      await Driver.deleteOne({ user: user._id });
      
      const driver = await Driver.create({
        ...driverData,
        user: user._id
      });
      
      createdDrivers.push(driver);
      
      const statusIcon = driver.status === 'approved' ? '✅' : (driver.status === 'pending_verification' ? '⏳' : '❌');
      log.item(statusIcon, `${user.firstName} ${user.lastName} - ${driver.vehicle?.brand || 'N/A'} ${driver.vehicle?.model || ''}`);
      
      progressBar(i + 1, driverUsers.length, `${user.firstName}`);
    } catch (error) {
      if (error.code === 11000) {
        errors.duplicates++;
      } else {
        errors.other++;
        log.error(`${user.email}: ${error.message}`);
      }
    }
  }
  
  log.newline();
  log.success(`${createdDrivers.length} profils conductrice créés`);
  
  const byStatus = createdDrivers.reduce((acc, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(byStatus).forEach(([status, count]) => {
    const icon = status === 'approved' ? '✅' : (status.includes('pending') ? '⏳' : '❌');
    log.item(icon, `${status}: ${count}`);
  });
  
  return createdDrivers;
};

// ============================================================================
// SEED RIDES
// ============================================================================

const seedRides = async (users, drivers, count = 100, options = {}) => {
  log.title('SEED COURSES');
  
  if (!seedData.rides) {
    log.error('Module rides non disponible');
    return [];
  }
  
  const { Ride } = models;
  if (!Ride) {
    log.error('Modèle Ride non disponible');
    return [];
  }
  
  const { generateRides } = seedData.rides;
  
  const passengers = users.filter(u => u.role === 'user');
  const approvedDrivers = drivers.filter(d => d.status === 'approved');
  
  if (passengers.length === 0) {
    log.warning('Aucune passagère disponible');
    return [];
  }
  
  if (approvedDrivers.length === 0) {
    log.warning('Aucune conductrice approuvée');
    return [];
  }
  
  log.info(`Génération de ${count} courses (${passengers.length} passagères, ${approvedDrivers.length} conductrices)`);
  
  const ridesData = generateRides ? generateRides(count, passengers, approvedDrivers) : [];
  const createdRides = [];
  const errors = 0;
  
  for (let i = 0; i < ridesData.length; i++) {
    const rideData = ridesData[i];
    
    if (options.dryRun) {
      createdRides.push({ ...rideData, _id: new mongoose.Types.ObjectId() });
      continue;
    }
    
    try {
      const ride = await Ride.create(rideData);
      createdRides.push(ride);
      progressBar(i + 1, ridesData.length, `${ride.status}`);
    } catch (error) {
      if (i < 3) log.error(`Ride: ${error.message}`);
    }
  }
  
  log.newline();
  log.success(`${createdRides.length} courses créées`);
  
  const byStatus = createdRides.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});
  
  Object.entries(byStatus).forEach(([status, count]) => {
    const icon = status === 'completed' ? '✅' : (status === 'cancelled' ? '❌' : '🚗');
    log.item(icon, `${status}: ${count}`);
  });
  
  const completedRides = createdRides.filter(r => r.status === 'completed');
  const totalRevenue = completedRides.reduce((sum, r) => sum + (r.pricing?.finalFare || 0), 0);
  const avgFare = completedRides.length > 0 ? Math.round(totalRevenue / completedRides.length) : 0;
  
  log.item('💰', `Revenue total: ${totalRevenue} MAD`);
  log.item('📊', `Tarif moyen: ${avgFare} MAD`);
  
  return createdRides;
};

// ============================================================================
// SEED NOTIFICATIONS
// ============================================================================

const seedNotifications = async (users, count = 50, options = {}) => {
  log.title('SEED NOTIFICATIONS');
  
  if (!seedData.notifications) {
    log.warning('Module notifications non disponible');
    return [];
  }
  
  const { Notification } = models;
  const { generateNotifications, createWelcomeNotification } = seedData.notifications;
  
  if (!Notification && !mongoose.connection.collection('notifications')) {
    log.warning('Collection notifications non disponible');
    return [];
  }
  
  const regularUsers = users.filter(u => ['user', 'driver'].includes(u.role));
  log.info(`Génération de notifications pour ${regularUsers.length} utilisatrices`);
  
  const allNotifications = [];
  
  if (createWelcomeNotification) {
    for (const user of regularUsers) {
      allNotifications.push(createWelcomeNotification(user._id));
    }
  }
  
  if (generateNotifications) {
    for (const user of regularUsers.slice(0, 20)) {
      const userNotifs = generateNotifications(user._id, Math.floor(count / 20));
      allNotifications.push(...userNotifs);
    }
  }
  
  if (options.dryRun) {
    log.success(`${allNotifications.length} notifications (dry-run)`);
    return allNotifications;
  }
  
  try {
    if (Notification) {
      await Notification.insertMany(allNotifications, { ordered: false });
    } else {
      await mongoose.connection.collection('notifications').insertMany(allNotifications);
    }
    log.success(`${allNotifications.length} notifications créées`);
  } catch (error) {
    log.warning(`Notifications: ${error.message}`);
  }
  
  return allNotifications;
};

// ============================================================================
// SEED CONVERSATIONS & MESSAGES
// ============================================================================

// ✅ FIX v2.1.0: Ajout du paramètre drivers pour mapper Driver._id -> User._id
const seedChat = async (users, rides, drivers = [], options = {}) => {
  log.title('SEED CONVERSATIONS & MESSAGES');
  
  if (!seedData.chat) {
    log.warning('Module chat non disponible');
    return { conversations: [], messages: [] };
  }
  
  const { Message, Conversation } = models;
  const { generateConversation, generateRideScenario } = seedData.chat;
  
  if (!generateConversation) {
    log.warning('Générateur de conversations non disponible');
    return { conversations: [], messages: [] };
  }
  
  const allConversations = [];
  const allMessages = [];
  
  const completedRides = rides.filter(r => r.status === 'completed').slice(0, 30);
  log.info(`Génération de conversations pour ${completedRides.length} courses`);
  
  // ✅ FIX: Map Driver._id -> User._id pour les participants
  const driverUserMap = new Map();
  for (const driver of drivers) {
    if (driver._id && driver.user) {
      driverUserMap.set(driver._id.toString(), driver.user);
    }
  }
  
  for (const ride of completedRides) {
    // ✅ FIX: Utiliser le User._id de la conductrice, pas le Driver._id
    const driverUserId = ride.driver ? driverUserMap.get(ride.driver.toString()) : null;
    if (!ride.user || !driverUserId) continue;
    
    try {
      const { conversation, messages } = generateConversation(
        ride.user,      // User._id de la passagère
        driverUserId,        // User._id de la conductrice (corrigé)
        'ride',
        Math.floor(Math.random() * 8) + 2,
        ride._id
      );
      
      allConversations.push(conversation);
      allMessages.push(...messages);
    } catch (e) {
      // Ignore
    }
  }
  
  if (options.dryRun) {
    log.success(`${allConversations.length} conversations, ${allMessages.length} messages (dry-run)`);
    return { conversations: allConversations, messages: allMessages };
  }
  
  try {
    if (Conversation) {
      await Conversation.insertMany(allConversations, { ordered: false });
    } else {
      await mongoose.connection.collection('conversations').insertMany(allConversations);
    }
    log.item('💬', `${allConversations.length} conversations`);
  } catch (e) {
    log.warning(`Conversations: ${e.message}`);
  }
  
  try {
    if (Message) {
      await Message.insertMany(allMessages, { ordered: false });
    } else {
      await mongoose.connection.collection('messages').insertMany(allMessages);
    }
    log.item('📨', `${allMessages.length} messages`);
  } catch (e) {
    log.warning(`Messages: ${e.message}`);
  }
  
  log.success('Chat seed terminé');
  return { conversations: allConversations, messages: allMessages };
};

// ============================================================================
// SEED ADMIN DATA
// ============================================================================

const seedAdminData = async (options = {}) => {
  log.title('SEED DONNÉES ADMIN');
  
  if (!seedData.admin) {
    log.warning('Module admin non disponible');
    return;
  }
  
  const { 
    generateActivities, 
    generateVerifications, 
    generateReports,
    systemSettings,
    dashboardStats
  } = seedData.admin;
  
  log.subtitle('Activités admin...');
  if (generateActivities) {
    const activities = generateActivities(150);
    if (!options.dryRun) {
      try {
        await mongoose.connection.collection('activities').insertMany(activities);
        log.item('📋', `${activities.length} activités`);
      } catch (e) {
        log.warning(`Activités: ${e.message}`);
      }
    }
  }
  
  log.subtitle('Vérifications conductrices...');
  if (generateVerifications) {
    const verifications = generateVerifications(15);
    if (!options.dryRun) {
      try {
        await mongoose.connection.collection('verifications').insertMany(verifications);
        log.item('🔍', `${verifications.length} vérifications`);
      } catch (e) {
        log.warning(`Vérifications: ${e.message}`);
      }
    }
  }
  
  log.subtitle('Signalements...');
  if (generateReports) {
    const reports = generateReports(40);
    if (!options.dryRun) {
      try {
        await mongoose.connection.collection('reports').insertMany(reports);
        log.item('🚨', `${reports.length} signalements`);
      } catch (e) {
        log.warning(`Signalements: ${e.message}`);
      }
    }
  }
  
  log.subtitle('Paramètres système...');
  if (systemSettings && !options.dryRun) {
    try {
      await mongoose.connection.collection('settings').deleteMany({});
      await mongoose.connection.collection('settings').insertOne({
        ...systemSettings,
        _id: new mongoose.Types.ObjectId(),
        createdAt: new Date(),
        updatedAt: new Date()
      });
      log.item('⚙️', 'Paramètres système configurés');
    } catch (e) {
      log.warning(`Settings: ${e.message}`);
    }
  }
  
  log.success('Données admin seed terminées');
};

// ============================================================================
// UPDATE STATISTICS
// ============================================================================

const updateStatistics = async (users, drivers, rides, options = {}) => {
  log.title('MISE À JOUR STATISTIQUES');
  
  if (options.dryRun) {
    log.info('Dry-run: statistiques non mises à jour');
    return;
  }
  
  const { User, Driver } = models;
  
  log.subtitle('Statistiques utilisatrices...');
  let usersUpdated = 0;
  
  for (const user of users) {
    try {
      const userRides = rides.filter(r => r.passenger?.toString() === user._id.toString());
      const completed = userRides.filter(r => r.status === 'completed');
      const cancelled = userRides.filter(r => r.status === 'cancelled');
      const totalSpent = completed.reduce((sum, r) => sum + (r.pricing?.finalFare || 0), 0);
      
      if (User) {
        await User.updateOne(
          { _id: user._id },
          {
            $set: {
              'stats.totalRides': userRides.length,
              'stats.completedRides': completed.length,
              'stats.cancelledRides': cancelled.length,
              'stats.totalSpent': totalSpent,
              points: completed.length * 10,
              level: Math.min(10, Math.floor(completed.length / 10) + 1)
            }
          }
        );
        usersUpdated++;
      }
    } catch (e) {
      // Ignore
    }
  }
  log.item('👤', `${usersUpdated} utilisatrices mises à jour`);
  
  log.subtitle('Statistiques conductrices...');
  let driversUpdated = 0;
  
  for (const driver of drivers) {
    try {
      const driverRides = rides.filter(r => r.driver?.toString() === driver._id.toString());
      const completed = driverRides.filter(r => r.status === 'completed');
      const cancelled = driverRides.filter(r => r.status === 'cancelled');
      const totalEarnings = completed.reduce((sum, r) => sum + (r.pricing?.driverEarnings || 0), 0);
      
      const ratings = completed.filter(r => r.userRating?.rating);
      const avgRating = ratings.length > 0 
        ? ratings.reduce((sum, r) => sum + r.userRating.rating, 0) / ratings.length 
        : 0;
      
      if (Driver) {
        await Driver.updateOne(
          { _id: driver._id },
          {
            $set: {
              'stats.completedRides': completed.length,
              'stats.cancelledRides': cancelled.length,
              'stats.totalRatings': ratings.length,
              'stats.averageRating': Math.round(avgRating * 100) / 100,
              'earnings.total': totalEarnings,
              'earnings.available': Math.round(totalEarnings * 0.8),
              'earnings.pending': Math.round(totalEarnings * 0.2)
            }
          }
        );
        driversUpdated++;
      }
    } catch (e) {
      // Ignore
    }
  }
  log.item('🚗', `${driversUpdated} conductrices mises à jour`);
  
  log.success('Statistiques mises à jour');
};

// ============================================================================
// PRINT SUMMARY
// ============================================================================

const printSummary = async (data = {}) => {
  const { User, Driver, Ride } = models;
  
  const counts = {
    users: User ? await User.countDocuments() : 0,
    drivers: Driver ? await Driver.countDocuments() : 0,
    rides: Ride ? await Ride.countDocuments() : 0,
    conversations: 0,
    messages: 0,
    notifications: 0,
    activities: 0,
    reports: 0
  };
  
  const collections = ['conversations', 'messages', 'notifications', 'activities', 'reports'];
  for (const col of collections) {
    try {
      counts[col] = await mongoose.connection.collection(col).countDocuments();
    } catch (e) {
      // Ignore
    }
  }
  
  console.log(`
${colors.bright}${colors.cyan}
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║     🚗  GO WITH SALLY - SEED COMPLETE  🚗                        ║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ${colors.green}📊 DONNÉES CRÉÉES${colors.cyan}                                              ║
║  ─────────────────────────────────────────────────────────────   ║
║  👤 Utilisatrices     │ ${String(counts.users).padStart(6)} ${' '.repeat(32)}║
║  🚗 Conductrices      │ ${String(counts.drivers).padStart(6)} ${' '.repeat(32)}║
║  🛣️  Courses           │ ${String(counts.rides).padStart(6)} ${' '.repeat(32)}║
║  💬 Conversations     │ ${String(counts.conversations).padStart(6)} ${' '.repeat(32)}║
║  📨 Messages          │ ${String(counts.messages).padStart(6)} ${' '.repeat(32)}║
║  🔔 Notifications     │ ${String(counts.notifications).padStart(6)} ${' '.repeat(32)}║
║  📋 Activités admin   │ ${String(counts.activities).padStart(6)} ${' '.repeat(32)}║
║  🚨 Signalements      │ ${String(counts.reports).padStart(6)} ${' '.repeat(32)}║
║                                                                   ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  ${colors.yellow}🔑 COMPTES DE TEST${colors.cyan}                                             ║
║  ─────────────────────────────────────────────────────────────   ║
║  📧 Passagère    │ fatima@test.com          │ password123        ║
║  📧 Conductrice  │ amina.driver@test.com    │ password123        ║
║  📧 Admin        │ admin@gowithsally.ma     │ admin123           ║
║  📧 Support      │ support@gowithsally.ma   │ support123         ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
${colors.reset}`);
};

// ============================================================================
// PARSE ARGUMENTS
// ============================================================================

const parseArgs = () => {
  const args = process.argv.slice(2);
  const options = {
    reset: false,
    skipConfirm: false,
    dryRun: false,
    only: null,
    count: null,
    verbose: false
  };
  
  for (const arg of args) {
    if (arg === '--reset' || arg === '-r') options.reset = true;
    else if (arg === '-y' || arg === '--yes') options.skipConfirm = true;
    else if (arg === '--dry-run' || arg === '-d') options.dryRun = true;
    else if (arg === '--verbose' || arg === '-v') options.verbose = true;
    else if (arg.startsWith('--only=')) options.only = arg.split('=')[1].split(',');
    else if (arg.startsWith('--count=')) options.count = parseInt(arg.split('=')[1], 10);
  }
  
  return options;
};

// ============================================================================
// MAIN SEED FUNCTION
// ============================================================================

const seed = async () => {
  console.log(`
${colors.bright}${colors.magenta}
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║     🌱  GO WITH SALLY - DATABASE SEEDER  🌱          ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
${colors.reset}`);

  const startTime = Date.now();
  const options = parseArgs();
  
  if (options.dryRun) {
    log.warning('MODE DRY-RUN: Aucune donnée ne sera écrite');
  }
  
  try {
    const connected = await connectDB();
    if (!connected) {
      process.exit(1);
    }
    
    loadModels();
    loadSeedData();
    
    if (options.reset) {
      await clearDatabase({ skipConfirm: options.skipConfirm });
    }
    
    const counts = {
      users: options.count || config.DEFAULT_COUNT.users,
      rides: options.count ? options.count * 3 : config.DEFAULT_COUNT.rides
    };
    
    const shouldSeed = (name) => !options.only || options.only.includes(name);
    
    let users = [];
    let drivers = [];
    let rides = [];
    
    if (shouldSeed('users')) {
      users = await seedUsers(counts.users, options);
    }
    
    if (shouldSeed('drivers') && users.length > 0) {
      drivers = await seedDrivers(users, options);
    }
    
    if (shouldSeed('rides') && users.length > 0 && drivers.length > 0) {
      rides = await seedRides(users, drivers, counts.rides, options);
    }
    
    if (shouldSeed('notifications') && users.length > 0) {
      await seedNotifications(users, config.DEFAULT_COUNT.notifications, options);
    }
    
    // ✅ FIX: Passer drivers à seedChat
    if (shouldSeed('chat') && rides.length > 0) {
      await seedChat(users, rides, drivers, options);
    }
    
    if (shouldSeed('admin')) {
      await seedAdminData(options);
    }
    
    if (!options.dryRun && users.length > 0) {
      await updateStatistics(users, drivers, rides, options);
    }
    
    if (!options.dryRun) {
      await printSummary({ users, drivers, rides });
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.success(`Seed terminé en ${duration}s 🎉`);
    
  } catch (error) {
    log.error(`Erreur fatale: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    log.info('Connexion MongoDB fermée');
    process.exit(0);
  }
};

// ============================================================================
// RUN
// ============================================================================

seed();
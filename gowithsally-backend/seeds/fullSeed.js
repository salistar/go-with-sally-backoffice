/**
 * ============================================================================
 * GO WITH SALLY - COMPREHENSIVE SEED SCRIPT
 * ============================================================================
 * Complete test data seeding with realistic Moroccan data
 * Includes: admin, sub_admins, drivers, users, rides, services, badges
 *
 * Usage:
 *   node seeds/fullSeed.js              # Seed with defaults
 *   node seeds/fullSeed.js --reset      # Reset collections first
 *
 * MongoDB Connection:
 *   User: gowithsally_admin
 *   Password: sally_secure_2024
 *   Database: gowithsally
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - main() function entry
// - Other key functions

console.log('📄 fullSeed.js ▶ Module loaded');

require('dotenv').config();
const mongoose = require('mongoose');

// ============================================================================
// COLORS & LOGGING
// ============================================================================

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  bgGreen: '\x1b[42m',
  bgRed: '\x1b[41m'
};

const log = {
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}═══ ${msg} ${'═'.repeat(Math.max(0, 50 - msg.length))}${colors.reset}\n`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset}  ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset}  ${colors.yellow}${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✖${colors.reset}  ${colors.red}${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ${colors.reset}  ${msg}`),
  item: (icon, msg) => console.log(`    ${icon} ${msg}`)
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://gowithsally_admin:sally_secure_2024@localhost:27017/gowithsally';

const resetCollections = process.argv.includes('--reset');

// Moroccan data
const moroccanCities = {
  casablanca: { name: 'Casablanca', lat: 33.5731, lng: -7.5898, radius: 0.05 },
  rabat: { name: 'Rabat', lat: 34.0209, lng: -6.8416, radius: 0.03 },
  marrakech: { name: 'Marrakech', lat: 31.6295, lng: -7.9811, radius: 0.04 },
  fes: { name: 'Fès', lat: 34.0331, lng: -5.0003, radius: 0.03 },
  tanger: { name: 'Tanger', lat: 35.7595, lng: -5.8340, radius: 0.03 }
};

const firstNames = [
  'Fatima', 'Khadija', 'Aicha', 'Meryem', 'Zineb', 'Hajar', 'Salma', 'Nour',
  'Imane', 'Sara', 'Houda', 'Laila', 'Amina', 'Sanaa', 'Wafaa', 'Naima',
  'Hafsa', 'Ikram', 'Soukaina', 'Rim', 'Lamia', 'Yasmine'
];

const lastNames = [
  'Alami', 'Bennis', 'Chraibi', 'Doukkali', 'El Fassi', 'Filali', 'Guessous',
  'Hajji', 'Idrissi', 'Jaidi', 'Kettani', 'Lahlou', 'Mernissi', 'Naciri',
  'Ouazzani', 'Squalli', 'Tazi', 'Bennani', 'Berrada', 'Belhaj'
];

const vehicleBrands = ['Dacia', 'Renault', 'Peugeot', 'Hyundai', 'Toyota', 'Volkswagen'];
const vehicleColors = ['Blanc', 'Noir', 'Gris', 'Bleu', 'Rouge', 'Beige'];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomLocation(city) {
  const c = moroccanCities[city] || moroccanCities.casablanca;
  return {
    type: 'Point',
    coordinates: [
      c.lng + (Math.random() - 0.5) * c.radius,
      c.lat + (Math.random() - 0.5) * c.radius
    ]
  };
}

function generatePhone() {
  const prefix = randomItem(['6', '7']);
  return '+212' + prefix + String(randomInt(10000000, 99999999));
}

function generatePlateNumber() {
  const num = randomInt(100000, 999999);
  const letter = String.fromCharCode(65 + randomInt(0, 25));
  const region = randomInt(1, 80);
  return `${num}-${letter}-${region}`;
}

// Passwords are stored in plain text here and hashed by Mongoose pre-save hook
// Do NOT pre-hash — the User model's pre-save middleware handles bcrypt hashing
const plainPasswords = {
  'Admin@2024': 'Admin@2024',
  'SubAdmin@2024': 'SubAdmin@2024',
  'Driver@2024': 'Driver@2024',
  'User@2024': 'User@2024',
  'Support@2024': 'Support@2024'
};

// ============================================================================
// TEST ACCOUNTS DATA
// ============================================================================

const testAccounts = {
  admin: {
    email: 'admin@gowithsally.ma',
    password: 'Admin@2024',
    role: 'admin'
  },
  subAdmin_casa: {
    email: 'subadmin.casa@gowithsally.ma',
    password: 'SubAdmin@2024',
    role: 'sub_admin',
    region: 'Casablanca'
  },
  subAdmin_rabat: {
    email: 'subadmin.rabat@gowithsally.ma',
    password: 'SubAdmin@2024',
    role: 'sub_admin',
    region: 'Rabat'
  },
  driver1: {
    email: 'fatima.driver@gmail.com',
    password: 'Driver@2024',
    role: 'driver'
  },
  driver2: {
    email: 'khadija.driver@gmail.com',
    password: 'Driver@2024',
    role: 'driver'
  },
  driver3: {
    email: 'amina.driver@gmail.com',
    password: 'Driver@2024',
    role: 'driver'
  },
  user1: {
    email: 'sara.user@gmail.com',
    password: 'User@2024',
    role: 'user'
  },
  user2: {
    email: 'meryem.user@gmail.com',
    password: 'User@2024',
    role: 'user'
  },
  user3: {
    email: 'nadia.user@gmail.com',
    password: 'User@2024',
    role: 'user'
  },
  user4: {
    email: 'laila.user@gmail.com',
    password: 'User@2024',
    role: 'user'
  },
  user5: {
    email: 'zineb.user@gmail.com',
    password: 'User@2024',
    role: 'user'
  },
  support: {
    email: 'support@gowithsally.ma',
    password: 'Support@2024',
    role: 'sub_admin'
  }
};

// ============================================================================
// SEED FUNCTIONS
// ============================================================================

async function createAdmin(User) {
  log.info('Creating super admin...');
  const admin = await User.create({
    firstName: 'Admin',
    lastName: 'GoWithSally',
    email: testAccounts.admin.email,
    phone: '+212600000001',
    password: plainPasswords['Admin@2024'],
    role: 'admin',
    dateOfBirth: new Date('1990-01-15'),
    emailVerified: true,
    phoneVerified: true,
    faceVerified: true,
    currentLocation: randomLocation('casablanca'),
    wallet: { balance: 0, currency: 'MAD' },
    stats: { totalRides: 0, averageRating: 5, totalRatings: 0, totalSpent: 0 },
    preferredLanguage: 'fr',
    isActive: true
  });
  log.item('✓', `Admin: ${testAccounts.admin.email}`);
  return admin._id;
}

async function createSupportAccount(User, adminId) {
  log.info('Creating support account...');
  const support = await User.create({
    firstName: 'Support',
    lastName: 'GoWithSally',
    email: testAccounts.support.email,
    phone: '+212600000002',
    password: plainPasswords['Support@2024'],
    role: 'sub_admin',
    managedBy: adminId,
    dateOfBirth: new Date('1991-06-10'),
    emailVerified: true,
    phoneVerified: true,
    faceVerified: true,
    currentLocation: randomLocation('casablanca'),
    wallet: { balance: 0, currency: 'MAD' },
    stats: { totalRides: 0, averageRating: 5, totalRatings: 0, totalSpent: 0 },
    preferredLanguage: 'fr',
    isActive: true
  });
  log.item('✓', `Support: ${testAccounts.support.email}`);
  return support._id;
}

async function createSubAdmins(User, adminId) {
  log.info('Creating sub-admins...');
  const subAdmins = [];

  // Sub-admin Casablanca
  const subAdminCasa = await User.create({
    firstName: 'Sub-Admin',
    lastName: 'Casablanca',
    email: testAccounts.subAdmin_casa.email,
    phone: '+212611000001',
    password: plainPasswords['SubAdmin@2024'],
    role: 'sub_admin',
    region: 'Casablanca',
    managedBy: adminId,
    dateOfBirth: new Date('1992-03-20'),
    emailVerified: true,
    phoneVerified: true,
    faceVerified: true,
    currentLocation: randomLocation('casablanca'),
    wallet: { balance: 0, currency: 'MAD' },
    stats: { totalRides: 0, averageRating: 5, totalRatings: 0, totalSpent: 0 },
    preferredLanguage: 'fr',
    isActive: true
  });
  log.item('✓', `Sub-Admin Casablanca: ${testAccounts.subAdmin_casa.email}`);
  subAdmins.push(subAdminCasa._id);

  // Sub-admin Rabat
  const subAdminRabat = await User.create({
    firstName: 'Sub-Admin',
    lastName: 'Rabat',
    email: testAccounts.subAdmin_rabat.email,
    phone: '+212621000001',
    password: plainPasswords['SubAdmin@2024'],
    role: 'sub_admin',
    region: 'Rabat',
    managedBy: adminId,
    dateOfBirth: new Date('1993-07-15'),
    emailVerified: true,
    phoneVerified: true,
    faceVerified: true,
    currentLocation: randomLocation('rabat'),
    wallet: { balance: 0, currency: 'MAD' },
    stats: { totalRides: 0, averageRating: 5, totalRatings: 0, totalSpent: 0 },
    preferredLanguage: 'fr',
    isActive: true
  });
  log.item('✓', `Sub-Admin Rabat: ${testAccounts.subAdmin_rabat.email}`);
  subAdmins.push(subAdminRabat._id);

  return subAdmins;
}

async function createDrivers(User) {
  log.info('Creating drivers (approved with vehicle info)...');
  const drivers = [];

  // Driver 1: Fatima (Casablanca)
  const driver1 = await User.create({
    firstName: 'Fatima',
    lastName: 'Ben Mohamed',
    email: testAccounts.driver1.email,
    phone: '+212612345671',
    password: plainPasswords['Driver@2024'],
    role: 'driver',
    dateOfBirth: new Date('1988-05-10'),
    emailVerified: true,
    phoneVerified: true,
    faceVerified: true,
    currentLocation: randomLocation('casablanca'),
    wallet: { balance: 2500, currency: 'MAD' },
    stats: { totalRides: 87, averageRating: 4.8, totalRatings: 87, totalSpent: 0 },
    preferredLanguage: 'fr',
    isActive: true
  });
  log.item('✓', `Driver: ${testAccounts.driver1.email} (Casablanca, 87 rides, 4.8★)`);
  drivers.push({ id: driver1._id, firstName: driver1.firstName });

  // Driver 2: Khadija (Rabat)
  const driver2 = await User.create({
    firstName: 'Khadija',
    lastName: 'El Fassi',
    email: testAccounts.driver2.email,
    phone: '+212612345672',
    password: plainPasswords['Driver@2024'],
    role: 'driver',
    dateOfBirth: new Date('1990-08-22'),
    emailVerified: true,
    phoneVerified: true,
    faceVerified: true,
    currentLocation: randomLocation('rabat'),
    wallet: { balance: 3200, currency: 'MAD' },
    stats: { totalRides: 156, averageRating: 4.9, totalRatings: 156, totalSpent: 0 },
    preferredLanguage: 'fr',
    isActive: true
  });
  log.item('✓', `Driver: ${testAccounts.driver2.email} (Rabat, 156 rides, 4.9★)`);
  drivers.push({ id: driver2._id, firstName: driver2.firstName });

  // Driver 3: Amina (Marrakech)
  const driver3 = await User.create({
    firstName: 'Amina',
    lastName: 'Bennani',
    email: testAccounts.driver3.email,
    phone: '+212612345673',
    password: plainPasswords['Driver@2024'],
    role: 'driver',
    dateOfBirth: new Date('1991-02-14'),
    emailVerified: true,
    phoneVerified: true,
    faceVerified: true,
    currentLocation: randomLocation('marrakech'),
    wallet: { balance: 1800, currency: 'MAD' },
    stats: { totalRides: 45, averageRating: 4.7, totalRatings: 45, totalSpent: 0 },
    preferredLanguage: 'fr',
    isActive: true
  });
  log.item('✓', `Driver: ${testAccounts.driver3.email} (Marrakech, 45 rides, 4.7★)`);
  drivers.push({ id: driver3._id, firstName: driver3.firstName });

  return drivers;
}

async function createRegularUsers(User) {
  log.info('Creating regular users...');
  const users = [];

  const userConfigs = [
    { ...testAccounts.user1, firstName: 'Sara', lastName: 'Alami', city: 'casablanca', phone: '+212612345681' },
    { ...testAccounts.user2, firstName: 'Meryem', lastName: 'Idrissi', city: 'rabat', phone: '+212612345682' },
    { ...testAccounts.user3, firstName: 'Nadia', lastName: 'Chraibi', city: 'marrakech', phone: '+212612345683' },
    { ...testAccounts.user4, firstName: 'Laila', lastName: 'Berrada', city: 'casablanca', phone: '+212612345684' },
    { ...testAccounts.user5, firstName: 'Zineb', lastName: 'Ouazzani', city: 'fes', phone: '+212612345685' }
  ];

  for (const config of userConfigs) {
    const user = await User.create({
      firstName: config.firstName,
      lastName: config.lastName,
      email: config.email,
      phone: config.phone,
      password: plainPasswords['User@2024'],
      role: 'user',
      dateOfBirth: new Date(1995 + randomInt(0, 10), randomInt(0, 11), randomInt(1, 28)),
      emailVerified: true,
      phoneVerified: true,
      faceVerified: true,
      currentLocation: randomLocation(config.city),
      wallet: { balance: randomInt(500, 2000), currency: 'MAD' },
      stats: {
        totalRides: randomInt(5, 30),
        averageRating: randomFloat(4.5, 5),
        totalRatings: randomInt(5, 30),
        totalSpent: randomInt(500, 5000)
      },
      preferredLanguage: 'fr',
      isActive: true
    });
    log.item('✓', `User: ${config.email} (${config.city})`);
    users.push(user._id);
  }

  return users;
}

async function createServices(Service) {
  log.info('Creating services...');

  // Délègue au modèle: initializeDefaults() crée les 4 services
  // (sally_eco / sally_standard / sally_confort / sally_pool) conformes
  // au schéma (type, name.{fr,ar,en}, pricing.{...}, capacity.{min,max},
  // features:[{fr,ar,en}]) via upsert idempotent.
  await Service.initializeDefaults();

  const created = await Service.find({}, '_id type');
  created.forEach(s => log.item('✓', `Service: ${s.type}`));

  return created.map(s => s._id);
}

async function createBadges(Badge, driverIds = []) {
  log.info('Creating badges...');

  // Le modèle Badge représente UN badge par conductrice (userId requis/unique,
  // level dans ['none','basic','verified','premium','elite']). On attribue
  // donc un badge à chaque conductrice avec un niveau/bonus cohérent.
  const levelPresets = [
    { level: 'verified', icon: '🛡️', color: '#3B82F6', earningsBonus: 0.05, benefits: ['Profil vérifié', 'Priorité matching'] },
    { level: 'premium',  icon: '⭐', color: '#8B5CF6', earningsBonus: 0.15, benefits: ['Bonus gains 15%', 'Support prioritaire'] },
    { level: 'elite',    icon: '👑', color: '#F59E0B', earningsBonus: 0.25, benefits: ['Bonus gains 25%', 'Ambassadrice GoWithSally'] },
  ];

  const created = [];
  for (let i = 0; i < driverIds.length; i++) {
    const preset = levelPresets[i % levelPresets.length];
    const driverUserId = driverIds[i].id || driverIds[i];
    const b = new Badge({ userId: driverUserId, ...preset });
    await b.save();
    log.item('✓', `Badge: ${preset.level} -> driver ${driverUserId}`);
    created.push(b._id);
  }

  if (created.length === 0) {
    log.warning('No driver IDs provided, skipping badge creation');
  }

  return created;
}

async function createRides(Ride, driverIds, userIds) {
  log.info('Creating sample rides...');

  const rideStatuses = ['completed', 'in_progress', 'cancelled'];
  const rides = [];

  // Extrait un ObjectId d'un wrapper {id,...} OU d'un ObjectId brut.
  // NB: sur un ObjectId Mongoose, `.id` renvoie le Buffer brut (truthy),
  // d'où le test sur `_bsontype` pour ne pas casser le cast.
  const pickId = (v) => (v && v.id && !v._bsontype) ? v.id : v;

  // Create 15 sample rides
  for (let i = 0; i < 15; i++) {
    const status = randomItem(rideStatuses);
    const driver = randomItem(driverIds);
    const passenger = randomItem(userIds);
    const service = randomItem(['sally_eco', 'sally_standard', 'sally_confort']);

    const startLocation = randomLocation('casablanca');
    const endLocation = randomLocation('casablanca');
    const distance = randomFloat(2, 30, 1);
    const duration = randomInt(5, 60);
    const fare = randomFloat(50, 500, 2);

    const ride = new Ride({
      user: pickId(passenger),
      driver: pickId(driver),
      serviceType: service,
      status: status,
      pickup: {
        address: 'Départ - Casablanca',
        city: 'Casablanca',
        coordinates: { type: 'Point', coordinates: startLocation.coordinates }
      },
      dropoff: {
        address: 'Arrivée - Casablanca',
        city: 'Casablanca',
        coordinates: { type: 'Point', coordinates: endLocation.coordinates }
      },
      route: {
        distance: Math.round(distance * 1000),   // mètres
        duration: duration * 60                   // secondes
      },
      pricing: {
        estimatedFare: fare,
        baseFare: 10,
        distanceFare: Math.round(distance * 3 * 100) / 100,
        timeFare: Math.round(duration * 0.3 * 100) / 100
      },
      payment: { method: randomItem(['cash', 'card', 'wallet']) },
      createdAt: new Date(Date.now() - randomInt(1, 90) * 24 * 60 * 60 * 1000),
      updatedAt: new Date()
    });

    await ride.save();
    rides.push(ride._id);
    log.item('✓', `Ride: ${status} (${distance}km, ${fare}MAD)`);
  }

  return rides;
}

// ============================================================================
// MAIN SEEDING FUNCTION
// ============================================================================

async function seedDatabase() {
  try {
    log.title('GoWithSally - Database Seeding');

    // Connect to MongoDB
    log.info(`Connecting to MongoDB: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    log.success('Connected to MongoDB');

    // Load models
    const User = require('../models/User');
    const Service = require('../models/Service');
    const Badge = require('../models/Badge');
    const Ride = require('../models/Ride');

    // Reset collections if requested
    if (resetCollections) {
      log.warning('Resetting collections...');
      await User.deleteMany({});
      await Service.deleteMany({});
      await Badge.deleteMany({});
      await Ride.deleteMany({});
      log.success('Collections cleared');
    }

    // Seed data
    log.title('Seeding Users');
    const adminId = await createAdmin(User);
    await createSupportAccount(User, adminId);
    const subAdminIds = await createSubAdmins(User, adminId);
    const driverIds = await createDrivers(User);
    const userIds = await createRegularUsers(User);

    log.title('Seeding Services');
    await createServices(Service);

    log.title('Seeding Badges');
    await createBadges(Badge, driverIds);

    log.title('Seeding Rides');
    await createRides(Ride, driverIds, userIds);

    log.title('Seeding Complete');
    log.success('Database seeded successfully!');
    log.info('All test accounts are ready for login');

    // Disconnect
    await mongoose.connection.close();
    log.success('Database connection closed');

    process.exit(0);
  } catch (error) {
    log.error(`Seeding error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// ============================================================================
// EXECUTE
// ============================================================================

seedDatabase();

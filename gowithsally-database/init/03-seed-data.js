// GoWithSally - Complete Seed Data Script
// Populates database with realistic simulated data for Morocco

print("========================================");
print("GoWithSally - Seeding Database");
print("========================================");

const dbName = process.env.MONGO_INITDB_DATABASE || "gowithsally";
db = db.getSiblingDB(dbName);

// ============ HELPER FUNCTIONS ============
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max, dec) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec || 2)); }
function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomDate(start, end) { return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())); }
function generatePhone() { return "+212" + randomItem(["6", "7"]) + String(randomInt(10000000, 99999999)); }
function generateObjectId() { return ObjectId(); }

// Moroccan female names
const firstNames = [
  "Fatima", "Khadija", "Aicha", "Meryem", "Zineb", "Hajar", "Salma", "Nour",
  "Imane", "Sara", "Houda", "Laila", "Amina", "Sanaa", "Wafaa", "Naima",
  "Hafsa", "Ikram", "Soukaina", "Rim", "Lamia", "Yasmine", "Dounia", "Ghita",
  "Hiba", "Malak", "Rajae", "Samira", "Touria", "Hanane", "Bouchra", "Latifa",
  "Nezha", "Mounia", "Fouzia", "Karima", "Rachida", "Nawal", "Jamila", "Saida"
];

const lastNames = [
  "Alami", "Bennis", "Chraibi", "Doukkali", "El Fassi", "Filali", "Guessous",
  "Hajji", "Idrissi", "Jaidi", "Kettani", "Lahlou", "Mernissi", "Naciri",
  "Ouazzani", "Squalli", "Tazi", "Bennani", "Berrada", "Belhaj",
  "Cherkaoui", "Dahbi", "El Amrani", "Fassi Fihri", "Ghazouani",
  "Hmimou", "Jabri", "Kabbaj", "Lamrani", "Meknassi", "Naji",
  "Oufkir", "Raissouni", "Sahli", "Tadlaoui", "Zniber", "Bouazza",
  "Rhissassi", "Mouline", "Benkirane"
];

// Moroccan cities with coordinates
const cities = {
  casablanca: { name: "Casablanca", lat: 33.5731, lng: -7.5898, radius: 0.05 },
  rabat: { name: "Rabat", lat: 34.0209, lng: -6.8416, radius: 0.03 },
  marrakech: { name: "Marrakech", lat: 31.6295, lng: -7.9811, radius: 0.04 },
  fes: { name: "Fès", lat: 34.0331, lng: -5.0003, radius: 0.03 },
  tanger: { name: "Tanger", lat: 35.7595, lng: -5.8340, radius: 0.03 },
  agadir: { name: "Agadir", lat: 30.4278, lng: -9.5981, radius: 0.03 },
  meknes: { name: "Meknès", lat: 33.8935, lng: -5.5473, radius: 0.02 },
  oujda: { name: "Oujda", lat: 34.6805, lng: -1.9076, radius: 0.02 }
};

// Locations in Casablanca
const casaLocations = [
  { name: "Gare Casa Voyageurs", address: "Boulevard Mohammed V, Casablanca", lat: 33.5889, lng: -7.5896 },
  { name: "Morocco Mall", address: "Angle Autoroute, Casablanca", lat: 33.5486, lng: -7.6548 },
  { name: "Ain Diab Corniche", address: "Boulevard de la Corniche, Casablanca", lat: 33.5920, lng: -7.6700 },
  { name: "Maarif", address: "Quartier Maarif, Casablanca", lat: 33.5800, lng: -7.6300 },
  { name: "Anfa Place", address: "Boulevard d'Anfa, Casablanca", lat: 33.5933, lng: -7.6389 },
  { name: "Casa Port", address: "Port de Casablanca", lat: 33.6028, lng: -7.6167 },
  { name: "Derb Sultan", address: "Derb Sultan, Casablanca", lat: 33.5778, lng: -7.5889 },
  { name: "Hay Hassani", address: "Hay Hassani, Casablanca", lat: 33.5567, lng: -7.6444 },
  { name: "Sidi Maarouf", address: "Sidi Maarouf, Casablanca", lat: 33.5356, lng: -7.6311 },
  { name: "Ain Sebaa", address: "Ain Sebaa, Casablanca", lat: 33.6067, lng: -7.5500 },
  { name: "Hassan II Mosque", address: "Boulevard de la Corniche, Casablanca", lat: 33.6086, lng: -7.6323 },
  { name: "Twin Center", address: "Boulevard Zerktouni, Casablanca", lat: 33.5878, lng: -7.6283 },
  { name: "Aeroport Mohammed V", address: "Nouasseur, Casablanca", lat: 33.3675, lng: -7.5898 },
  { name: "CIL Residence", address: "Route d'El Jadida, Casablanca", lat: 33.5600, lng: -7.6100 },
  { name: "Technopark", address: "Route de Nouaceur, Casablanca", lat: 33.5100, lng: -7.5600 }
];

const vehicleBrands = [
  { brand: "Dacia", models: ["Logan", "Sandero", "Duster", "Dokker"] },
  { brand: "Renault", models: ["Clio", "Megane", "Symbol", "Kangoo"] },
  { brand: "Peugeot", models: ["208", "308", "3008", "2008"] },
  { brand: "Hyundai", models: ["i10", "i20", "Tucson", "Accent"] },
  { brand: "Toyota", models: ["Yaris", "Corolla", "RAV4", "C-HR"] },
  { brand: "Volkswagen", models: ["Polo", "Golf", "T-Roc", "Tiguan"] },
  { brand: "Fiat", models: ["Punto", "500", "Tipo", "Panda"] },
  { brand: "Kia", models: ["Picanto", "Rio", "Sportage", "Ceed"] }
];

const vehicleColors = ["Blanc", "Noir", "Gris", "Bleu", "Rouge", "Beige", "Argent", "Marron"];
const serviceTypes = ["sally_eco", "sally_standard", "sally_confort", "sally_pool"];
const languages = ["fr", "ar", "en"];
const paymentMethods = ["cash", "card", "wallet"];
const badgeLevels = ["none", "basic", "verified", "premium", "elite"];

function randomLocation(city) {
  const c = cities[city] || cities.casablanca;
  return {
    type: "Point",
    coordinates: [
      c.lng + (Math.random() - 0.5) * c.radius * 2,
      c.lat + (Math.random() - 0.5) * c.radius * 2
    ]
  };
}

function generatePlateNumber() {
  const letters = "ABCDEFGHJKLMNPRSTUVWXYZ";
  const num = randomInt(1, 99999);
  const letter = letters[randomInt(0, letters.length - 1)];
  const region = randomInt(1, 80);
  return `${num}-${letter}-${region}`;
}

// ============ SEED ADMIN USER ============
print("\n[1/9] Creating admin user...");
const adminId = generateObjectId();
db.users.insertOne({
  _id: adminId,
  firstName: "Admin",
  lastName: "GoWithSally",
  email: "admin@gowithsally.ma",
  phone: "+212600000001",
  password: "$2b$10$gaH9XXUJ.pdYmrlnbddaa.PXq1AUtObcWgIvfQojjMCDu5QhGizVy", // password: admin2024
  role: "admin",
  avatar: null,
  dateOfBirth: new Date("1990-01-15"),
  preferredLanguage: "fr",
  emailVerified: true,
  phoneVerified: true,
  faceVerified: true,
  genderVerified: true,
  isActive: true,
  currentLocation: randomLocation("casablanca"),
  savedPlaces: [],
  emergencyContacts: [],
  notifications: { push: true, email: true, sms: true, rideUpdates: true, promotions: false, socialActivity: true },
  statistics: { totalRides: 0, averageRating: 5.0, totalRatings: 0, totalSpent: 0 },
  wallet: { balance: 0, currency: "MAD", transactions: [] },
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date()
});
print("  -> Admin user created (admin@gowithsally.ma)");

// ============ SEED SUPPORT USER ============
print("\n[2/9] Creating support user...");
const supportId = generateObjectId();
db.users.insertOne({
  _id: supportId,
  firstName: "Support",
  lastName: "Sally",
  email: "support@gowithsally.ma",
  phone: "+212600000002",
  password: "$2b$10$gaH9XXUJ.pdYmrlnbddaa.PXq1AUtObcWgIvfQojjMCDu5QhGizVy",
  role: "support",
  avatar: null,
  dateOfBirth: new Date("1992-05-20"),
  preferredLanguage: "fr",
  emailVerified: true,
  phoneVerified: true,
  faceVerified: true,
  genderVerified: true,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date()
});
print("  -> Support user created (support@gowithsally.ma)");

// ============ SEED PASSENGER USERS (50) ============
print("\n[3/9] Creating 50 passenger users...");
const userIds = [];
const usedPhones = new Set(["+212600000001", "+212600000002"]);
const usedEmails = new Set(["admin@gowithsally.ma", "support@gowithsally.ma"]);

for (let i = 0; i < 50; i++) {
  const id = generateObjectId();
  userIds.push(id);
  const fn = randomItem(firstNames);
  const ln = randomItem(lastNames);
  let phone = generatePhone();
  while (usedPhones.has(phone)) phone = generatePhone();
  usedPhones.add(phone);
  let email = `${fn.toLowerCase()}.${ln.toLowerCase().replace(/ /g, "")}${randomInt(1, 99)}@gmail.com`;
  while (usedEmails.has(email)) email = `${fn.toLowerCase()}${randomInt(100, 999)}@gmail.com`;
  usedEmails.add(email);

  const city = randomItem(Object.keys(cities));
  const isFullyVerified = Math.random() > 0.3;
  const registeredDate = randomDate(new Date("2024-03-01"), new Date("2025-12-31"));
  const totalRides = randomInt(0, 150);
  const rating = totalRides > 0 ? randomFloat(3.5, 5.0, 1) : 0;

  const savedPlacesPool = casaLocations.slice(0, 5);
  const savedPlaces = savedPlacesPool.slice(0, randomInt(0, 3)).map(loc => ({
    name: loc.name,
    address: loc.address,
    coordinates: { type: "Point", coordinates: [loc.lng, loc.lat] },
    icon: randomItem(["home", "work", "school", "gym", "hospital"]),
    color: randomItem(["#FF69B4", "#3B82F6", "#22C55E", "#A855F7"])
  }));

  db.users.insertOne({
    _id: id,
    firstName: fn,
    lastName: ln,
    email: email,
    phone: phone,
    password: "$2b$10$vuBnwqOJWrRxwokFio35YuSy8XKtHNXYqMw/OvPhavD0qCcvfdlzy", // password: password123
    role: "user",
    avatar: null,
    dateOfBirth: randomDate(new Date("1975-01-01"), new Date("2005-12-31")),
    preferredLanguage: randomItem(languages),
    emailVerified: isFullyVerified || Math.random() > 0.4,
    phoneVerified: true,
    faceVerified: isFullyVerified,
    genderVerified: isFullyVerified || Math.random() > 0.2,
    faceDescriptor: isFullyVerified ? Array.from({ length: 128 }, () => randomFloat(-1, 1, 6)) : [],
    faceImages: isFullyVerified ? [`faces/user_${i}_1.jpg`, `faces/user_${i}_2.jpg`] : [],
    isActive: Math.random() > 0.05,
    currentLocation: randomLocation(city),
    savedPlaces: savedPlaces,
    emergencyContacts: [
      { name: randomItem(firstNames) + " " + randomItem(lastNames), phone: generatePhone(), relationship: randomItem(["Mère", "Soeur", "Amie", "Père", "Mari"]) }
    ],
    notifications: {
      push: true,
      email: Math.random() > 0.3,
      sms: Math.random() > 0.5,
      rideUpdates: true,
      promotions: Math.random() > 0.5,
      socialActivity: Math.random() > 0.4
    },
    statistics: {
      totalRides: totalRides,
      averageRating: rating,
      totalRatings: Math.floor(totalRides * 0.7),
      totalSpent: totalRides * randomFloat(20, 80, 0)
    },
    wallet: {
      balance: randomFloat(0, 500, 2),
      currency: "MAD",
      transactions: []
    },
    createdAt: registeredDate,
    updatedAt: new Date()
  });
}
print("  -> 50 passenger users created");

// ============ SEED DRIVER USERS + DRIVER PROFILES (25) ============
print("\n[4/9] Creating 25 drivers (user + driver profile)...");
const driverUserIds = [];
const driverIds = [];

for (let i = 0; i < 25; i++) {
  const userId = generateObjectId();
  const driverId = generateObjectId();
  driverUserIds.push(userId);
  driverIds.push(driverId);

  const fn = randomItem(firstNames);
  const ln = randomItem(lastNames);
  let phone = generatePhone();
  while (usedPhones.has(phone)) phone = generatePhone();
  usedPhones.add(phone);
  let email = `driver.${fn.toLowerCase()}.${ln.toLowerCase().replace(/ /g, "")}${randomInt(1, 99)}@gmail.com`;
  while (usedEmails.has(email)) email = `driver${randomInt(100, 999)}@gmail.com`;
  usedEmails.add(email);

  const city = randomItem(Object.keys(cities));
  const registeredDate = randomDate(new Date("2024-01-15"), new Date("2025-10-31"));
  const completedRides = randomInt(10, 500);
  const rating = randomFloat(3.8, 5.0, 1);
  const isApproved = Math.random() > 0.15;
  const vehicle = randomItem(vehicleBrands);
  const model = randomItem(vehicle.models);
  const badgeLevel = isApproved ? randomItem(["basic", "verified", "premium", "elite"]) : "none";

  // Create user record for driver
  db.users.insertOne({
    _id: userId,
    firstName: fn,
    lastName: ln,
    email: email,
    phone: phone,
    password: "$2b$10$vuBnwqOJWrRxwokFio35YuSy8XKtHNXYqMw/OvPhavD0qCcvfdlzy",
    role: "driver",
    avatar: `avatars/driver_${i}.jpg`,
    dateOfBirth: randomDate(new Date("1975-01-01"), new Date("2003-12-31")),
    preferredLanguage: randomItem(languages),
    emailVerified: true,
    phoneVerified: true,
    faceVerified: true,
    genderVerified: true,
    faceDescriptor: Array.from({ length: 128 }, () => randomFloat(-1, 1, 6)),
    faceImages: [`faces/driver_${i}_1.jpg`, `faces/driver_${i}_2.jpg`, `faces/driver_${i}_3.jpg`],
    isActive: true,
    currentLocation: randomLocation(city),
    savedPlaces: [],
    emergencyContacts: [
      { name: randomItem(firstNames) + " " + randomItem(lastNames), phone: generatePhone(), relationship: randomItem(["Mère", "Soeur", "Mari", "Père"]) }
    ],
    notifications: { push: true, email: true, sms: true, rideUpdates: true, promotions: true, socialActivity: true },
    statistics: {
      totalRides: completedRides,
      averageRating: rating,
      totalRatings: Math.floor(completedRides * 0.8),
      totalSpent: 0
    },
    wallet: { balance: randomFloat(0, 2000, 2), currency: "MAD", transactions: [] },
    createdAt: registeredDate,
    updatedAt: new Date()
  });

  // Create driver profile
  const plateNumber = generatePlateNumber();
  db.drivers.insertOne({
    _id: driverId,
    user: userId,
    status: isApproved ? "approved" : randomItem(["pending_documents", "pending_verification", "under_review"]),
    nationalId: {
      front: `documents/driver_${i}_cin_front.jpg`,
      back: `documents/driver_${i}_cin_back.jpg`,
      number: `${randomItem(["B", "BH", "BK", "BE", "BJ"])}${randomInt(100000, 999999)}`,
      expiryDate: randomDate(new Date("2026-01-01"), new Date("2034-12-31")),
      verified: isApproved,
      verifiedAt: isApproved ? randomDate(registeredDate, new Date()) : null,
      verifiedBy: isApproved ? adminId : null
    },
    drivingLicense: {
      front: `documents/driver_${i}_license_front.jpg`,
      back: `documents/driver_${i}_license_back.jpg`,
      number: `${randomInt(10000, 99999)}/${randomInt(10, 99)}`,
      category: randomItem(["B", "B+E", "C"]),
      expiryDate: randomDate(new Date("2026-01-01"), new Date("2034-12-31")),
      verified: isApproved
    },
    anthropometricRecord: {
      file: `documents/driver_${i}_anthropometric.jpg`,
      issueDate: randomDate(new Date("2023-01-01"), new Date("2025-06-30")),
      verified: isApproved
    },
    profilePhoto: {
      url: `photos/driver_${i}_profile.jpg`,
      faceDescriptor: Array.from({ length: 128 }, () => randomFloat(-1, 1, 6)),
      verified: isApproved
    },
    vehicle: {
      brand: vehicle.brand,
      model: model,
      year: randomInt(2015, 2025),
      color: randomItem(vehicleColors),
      plateNumber: plateNumber,
      seats: randomInt(3, 5),
      type: randomItem(["standard", "comfort", "premium"]),
      hasAC: Math.random() > 0.2,
      photos: {
        front: `vehicles/driver_${i}_front.jpg`,
        back: `vehicles/driver_${i}_back.jpg`,
        left: `vehicles/driver_${i}_left.jpg`,
        right: `vehicles/driver_${i}_right.jpg`,
        interior: `vehicles/driver_${i}_interior.jpg`
      },
      registration: {
        file: `documents/driver_${i}_registration.jpg`,
        expiryDate: randomDate(new Date("2026-01-01"), new Date("2027-12-31")),
        verified: isApproved
      },
      insurance: {
        company: randomItem(["Wafa Assurance", "Saham Assurance", "AXA Assurance", "RMA Watanya", "Atlanta"]),
        policyNumber: `POL-${randomInt(100000, 999999)}`,
        file: `documents/driver_${i}_insurance.jpg`,
        expiryDate: randomDate(new Date("2026-01-01"), new Date("2027-12-31")),
        verified: isApproved
      },
      technicalInspection: {
        file: `documents/driver_${i}_inspection.jpg`,
        expiryDate: randomDate(new Date("2026-01-01"), new Date("2027-06-30"))
      }
    },
    banking: {
      iban: `MA${randomInt(10, 99)}${String(randomInt(100000000000, 999999999999))}${String(randomInt(100000000000, 999999999999))}`,
      accountHolder: `${fn} ${ln}`
    },
    currentLocation: randomLocation(city),
    lastLocationUpdate: new Date(),
    isOnline: isApproved && Math.random() > 0.4,
    isAvailable: isApproved && Math.random() > 0.3,
    currentRide: null,
    statistics: {
      completedRides: completedRides,
      totalEarnings: completedRides * randomFloat(25, 60, 0),
      averageRating: rating,
      totalRatings: Math.floor(completedRides * 0.8),
      cancellationRate: randomFloat(0, 8, 1),
      acceptanceRate: randomFloat(80, 99, 1),
      hoursWorked: completedRides * randomFloat(0.3, 0.8, 1),
      distanceCovered: completedRides * randomFloat(5, 20, 0)
    },
    createdAt: registeredDate,
    updatedAt: new Date()
  });

  // Create badge for driver
  db.badges.insertOne({
    userId: userId,
    level: badgeLevel,
    icon: badgeLevel === "elite" ? "crown" : badgeLevel === "premium" ? "star" : badgeLevel === "verified" ? "check-circle" : "circle",
    color: badgeLevel === "elite" ? "#FFD700" : badgeLevel === "premium" ? "#A855F7" : badgeLevel === "verified" ? "#22C55E" : "#3B82F6",
    earningsBonus: badgeLevel === "elite" ? 50 : badgeLevel === "premium" ? 20 : badgeLevel === "verified" ? 10 : badgeLevel === "basic" ? 5 : 0,
    benefits: badgeLevel === "elite"
      ? ["Priority rides", "Dedicated support", "All services", "+15% earnings", "Highlighted profile"]
      : badgeLevel === "premium"
      ? ["Sally Confort access", "+10% earnings", "Highlighted profile", "Priority"]
      : badgeLevel === "verified"
      ? ["Visible badge", "+5% earnings", "Priority rides"]
      : badgeLevel === "basic"
      ? ["Can accept rides"]
      : [],
    earnedAt: registeredDate,
    history: [{ level: badgeLevel, earnedAt: registeredDate, reason: "Initial assignment" }],
    progress: {
      nextLevel: badgeLevel === "elite" ? null : badgeLevels[badgeLevels.indexOf(badgeLevel) + 1],
      percentage: randomInt(10, 95),
      missingRequirements: []
    },
    ridesAtEarning: completedRides,
    ratingAtEarning: rating,
    createdAt: registeredDate,
    updatedAt: new Date()
  });
}
print("  -> 25 drivers created with profiles and badges");

// ============ SEED SERVICES ============
print("\n[5/9] Creating services...");
const servicesData = [
  {
    type: "sally_eco",
    name: { fr: "Sally Éco", ar: "سالي إيكو", en: "Sally Eco" },
    description: {
      fr: "Le trajet le plus économique. Parfait pour les budgets serrés.",
      ar: "الرحلة الأكثر اقتصادية. مثالية للميزانيات المحدودة.",
      en: "The most economical ride. Perfect for tight budgets."
    },
    icon: "leaf", emoji: "💰", color: "#22C55E",
    pricing: { basePrice: 8, pricePerKm: 3, pricePerMinute: 0.3, minimumFare: 15, multiplier: 0.8, commissionRate: 12 },
    capacity: { min: 1, max: 4 },
    features: [
      { fr: "Prix réduit", ar: "سعر مخفض", en: "Reduced price" },
      { fr: "Trajet direct", ar: "رحلة مباشرة", en: "Direct route" }
    ],
    requiredBadge: "none",
    displayOrder: 1, isActive: true
  },
  {
    type: "sally_standard",
    name: { fr: "Sally Standard", ar: "سالي ستاندارد", en: "Sally Standard" },
    description: {
      fr: "Le meilleur rapport qualité-prix. Confort et sécurité.",
      ar: "أفضل قيمة مقابل المال. الراحة والأمان.",
      en: "Best value for money. Comfort and safety."
    },
    icon: "car", emoji: "🚗", color: "#3B82F6",
    pricing: { basePrice: 10, pricePerKm: 4, pricePerMinute: 0.4, minimumFare: 20, multiplier: 1.0, commissionRate: 15 },
    capacity: { min: 1, max: 4 },
    features: [
      { fr: "Conductrice vérifiée", ar: "سائقة موثقة", en: "Verified driver" },
      { fr: "Suivi en temps réel", ar: "تتبع في الوقت الحقيقي", en: "Real-time tracking" },
      { fr: "Bagages acceptés", ar: "قبول الأمتعة", en: "Luggage accepted" }
    ],
    requiredBadge: "basic",
    displayOrder: 2, isActive: true
  },
  {
    type: "sally_confort",
    name: { fr: "Sally Confort", ar: "سالي كونفور", en: "Sally Comfort" },
    description: {
      fr: "L'expérience premium. Véhicules haut de gamme avec services inclus.",
      ar: "تجربة مميزة. سيارات فاخرة مع خدمات مضمنة.",
      en: "The premium experience. High-end vehicles with included services."
    },
    icon: "star", emoji: "🌟", color: "#A855F7",
    pricing: { basePrice: 15, pricePerKm: 6, pricePerMinute: 0.6, minimumFare: 30, multiplier: 1.4, commissionRate: 18 },
    capacity: { min: 1, max: 4 },
    features: [
      { fr: "Eau gratuite", ar: "ماء مجاني", en: "Free water" },
      { fr: "WiFi à bord", ar: "واي فاي على متن السيارة", en: "WiFi onboard" },
      { fr: "Chargeur téléphone", ar: "شاحن هاتف", en: "Phone charger" },
      { fr: "Climatisation garantie", ar: "تكييف مضمون", en: "Guaranteed AC" },
      { fr: "Conductrice Premium", ar: "سائقة بريميوم", en: "Premium driver" }
    ],
    requiredBadge: "premium",
    displayOrder: 3, isActive: true
  },
  {
    type: "sally_pool",
    name: { fr: "Sally Pool", ar: "سالي بول", en: "Sally Pool" },
    description: {
      fr: "Partagez le trajet, partagez les frais. Écologique et économique.",
      ar: "شاركي الرحلة، شاركي التكاليف. صديقة للبيئة واقتصادية.",
      en: "Share the ride, share the cost. Eco-friendly and economical."
    },
    icon: "users", emoji: "👥", color: "#F97316",
    pricing: { basePrice: 6, pricePerKm: 2.5, pricePerMinute: 0.25, minimumFare: 12, multiplier: 0.6, commissionRate: 10 },
    capacity: { min: 1, max: 3 },
    features: [
      { fr: "Trajet partagé", ar: "رحلة مشتركة", en: "Shared ride" },
      { fr: "Éco-responsable", ar: "مسؤولة بيئياً", en: "Eco-friendly" },
      { fr: "Prix réduit", ar: "سعر مخفض", en: "Reduced price" }
    ],
    requiredBadge: "basic",
    displayOrder: 4, isActive: true
  }
];

servicesData.forEach(s => {
  s.stats = { totalRides: randomInt(500, 5000), avgRating: randomFloat(4.2, 4.9, 1), activeDrivers: randomInt(5, 20) };
  s.createdAt = new Date("2024-01-01");
  s.updatedAt = new Date();
  db.services.insertOne(s);
});
print("  -> 4 services created");

// ============ SEED RIDES (200) ============
print("\n[6/9] Creating 200 rides...");
const rideStatuses = ["completed", "completed", "completed", "completed", "completed", "cancelled", "in_progress", "searching"];
let rideNumber = 1000;

for (let i = 0; i < 200; i++) {
  const userId = randomItem(userIds);
  const driverIdx = randomInt(0, driverUserIds.length - 1);
  const driverUserId = driverUserIds[driverIdx];
  const driverId = driverIds[driverIdx];
  const status = randomItem(rideStatuses);
  const serviceType = randomItem(serviceTypes);
  const pickup = randomItem(casaLocations);
  let dropoff = randomItem(casaLocations);
  while (dropoff.name === pickup.name) dropoff = randomItem(casaLocations);

  const distance = randomFloat(2, 25, 1);
  const duration = randomInt(8, 55);
  const baseFare = serviceType === "sally_eco" ? 8 : serviceType === "sally_standard" ? 10 : serviceType === "sally_confort" ? 15 : 6;
  const perKm = serviceType === "sally_eco" ? 3 : serviceType === "sally_standard" ? 4 : serviceType === "sally_confort" ? 6 : 2.5;
  const totalFare = Math.max(baseFare + distance * perKm + duration * 0.4, 15);
  const surge = Math.random() > 0.8 ? randomFloat(1.1, 2.0, 1) : 1.0;
  const finalPrice = parseFloat((totalFare * surge).toFixed(2));

  rideNumber++;
  const createdAt = randomDate(new Date("2024-06-01"), new Date("2025-12-31"));

  const ride = {
    user: userId,
    driver: status !== "searching" ? driverUserId : null,
    driverProfile: status !== "searching" ? driverId : null,
    rideNumber: `GWS-${rideNumber}`,
    status: status,
    serviceType: serviceType,
    pickup: {
      address: pickup.address,
      city: "Casablanca",
      coordinates: { type: "Point", coordinates: [pickup.lng, pickup.lat] },
      notes: Math.random() > 0.7 ? randomItem(["Devant la porte principale", "Côté parking", "Près de la pharmacie"]) : null,
      landmark: pickup.name
    },
    dropoff: {
      address: dropoff.address,
      city: "Casablanca",
      coordinates: { type: "Point", coordinates: [dropoff.lng, dropoff.lat] },
      notes: null,
      landmark: dropoff.name
    },
    qrCode: {
      pickup: { code: `QR-P-${rideNumber}-${randomInt(1000, 9999)}`, scanned: status === "completed", scannedAt: status === "completed" ? createdAt : null },
      dropoff: { code: `QR-D-${rideNumber}-${randomInt(1000, 9999)}`, scanned: status === "completed", scannedAt: status === "completed" ? new Date(createdAt.getTime() + duration * 60000) : null }
    },
    faceVerification: {
      userVerified: status === "completed" || status === "in_progress",
      driverVerified: status === "completed" || status === "in_progress",
      confidence: status === "completed" ? randomFloat(85, 99, 1) : 0
    },
    estimatedDistance: distance,
    estimatedDuration: duration,
    baseFare: baseFare,
    distanceFare: parseFloat((distance * perKm).toFixed(2)),
    timeFare: parseFloat((duration * 0.4).toFixed(2)),
    totalFare: parseFloat(totalFare.toFixed(2)),
    surgeMultiplier: surge,
    actualDistance: status === "completed" ? randomFloat(distance * 0.9, distance * 1.15, 1) : null,
    actualDuration: status === "completed" ? randomInt(Math.floor(duration * 0.85), Math.floor(duration * 1.3)) : null,
    finalPrice: status === "completed" ? finalPrice : null,
    intermediateStops: Math.random() > 0.85 ? [{ address: randomItem(casaLocations).address, coordinates: randomLocation("casablanca"), visitedAt: createdAt }] : [],
    payment: {
      method: randomItem(paymentMethods),
      status: status === "completed" ? "completed" : "pending",
      transactionId: status === "completed" ? `TXN-${randomInt(100000, 999999)}` : null
    },
    userRating: status === "completed" && Math.random() > 0.2
      ? { score: randomInt(3, 5), comment: randomItem(["Très bien!", "Bonne conduite", "Agréable", "Ponctuelle", "Recommandée", ""]), createdAt: new Date(createdAt.getTime() + (duration + 5) * 60000) }
      : null,
    driverRating: status === "completed" && Math.random() > 0.3
      ? { score: randomInt(4, 5), comment: randomItem(["Passagère agréable", "Polie", "Ponctuelle", ""]), createdAt: new Date(createdAt.getTime() + (duration + 5) * 60000) }
      : null,
    cancellation: status === "cancelled"
      ? { cancelledBy: Math.random() > 0.5 ? "user" : "driver", cancelledAt: new Date(createdAt.getTime() + randomInt(60, 600) * 1000), cancelReason: randomItem(["Trop d'attente", "Changement de plan", "Urgence", "Conductrice trop loin"]), refund: Math.random() > 0.5 }
      : null,
    safetyChecks: { vehicleMatches: true, driverMatches: true, userMatches: true },
    shareRideLink: status === "in_progress" || status === "completed" ? `https://share.gowithsally.ma/ride/${rideNumber}` : null,
    createdAt: createdAt,
    startedAt: status === "in_progress" || status === "completed" ? new Date(createdAt.getTime() + randomInt(3, 15) * 60000) : null,
    completedAt: status === "completed" ? new Date(createdAt.getTime() + (duration + randomInt(5, 20)) * 60000) : null,
    updatedAt: new Date()
  };

  db.rides.insertOne(ride);
}
print("  -> 200 rides created");

// ============ SEED CONVERSATIONS & MESSAGES ============
print("\n[7/9] Creating conversations and messages...");
let msgCount = 0;

for (let i = 0; i < 30; i++) {
  const userId = randomItem(userIds);
  const driverUserId = randomItem(driverUserIds);
  const convId = generateObjectId();
  const convCreatedAt = randomDate(new Date("2024-06-01"), new Date("2025-12-31"));

  db.conversations.insertOne({
    _id: convId,
    participants: [userId, driverUserId],
    rideId: null,
    lastMessage: null,
    isActive: Math.random() > 0.3,
    metadata: {},
    createdAt: convCreatedAt,
    updatedAt: new Date()
  });

  // Add messages to conversation
  const numMessages = randomInt(2, 12);
  let lastMsgId = null;
  const messageTemplates = [
    "Bonjour, je suis en route!",
    "Je suis arrivée devant l'entrée principale",
    "D'accord, je descends dans 2 minutes",
    "Pouvez-vous m'attendre s'il vous plaît?",
    "Bien sûr, prenez votre temps",
    "Je suis la voiture blanche",
    "Merci beaucoup pour la course!",
    "Bonne journée!",
    "Est-ce que vous pouvez passer par la route principale?",
    "Pas de problème",
    "Je vous vois!",
    "Parfait, merci!",
    "Où êtes-vous exactement?",
    "À côté de la pharmacie",
    "J'arrive dans 3 minutes"
  ];

  for (let j = 0; j < numMessages; j++) {
    const msgId = generateObjectId();
    const sender = j % 2 === 0 ? userId : driverUserId;
    const recipient = sender === userId ? driverUserId : userId;
    const msgTime = new Date(convCreatedAt.getTime() + j * randomInt(30, 300) * 1000);

    db.messages.insertOne({
      _id: msgId,
      conversationId: convId,
      rideId: null,
      sender: sender,
      recipient: recipient,
      type: "text",
      content: randomItem(messageTemplates),
      status: "read",
      readAt: new Date(msgTime.getTime() + randomInt(10, 120) * 1000),
      deliveredAt: new Date(msgTime.getTime() + randomInt(1, 5) * 1000),
      isDeleted: false,
      createdAt: msgTime,
      updatedAt: msgTime
    });
    lastMsgId = msgId;
    msgCount++;
  }

  // Update conversation with last message
  db.conversations.updateOne({ _id: convId }, { $set: { lastMessage: lastMsgId } });
}
print(`  -> 30 conversations and ${msgCount} messages created`);

// ============ SEED PRICE PROPOSALS ============
print("\n[8/9] Creating price proposals...");
for (let i = 0; i < 50; i++) {
  const pickup = randomItem(casaLocations);
  let dest = randomItem(casaLocations);
  while (dest.name === pickup.name) dest = randomItem(casaLocations);
  const distance = randomFloat(2, 20, 1);
  const duration = randomInt(8, 45);
  const suggestedPrice = parseFloat((10 + distance * 4 + duration * 0.4).toFixed(2));
  const isSurge = Math.random() > 0.75;

  db.priceproposals.insertOne({
    userId: randomItem(userIds),
    rideId: null,
    pickup: { name: pickup.name, address: pickup.address, latitude: pickup.lat, longitude: pickup.lng },
    destination: { name: dest.name, address: dest.address, latitude: dest.lat, longitude: dest.lng },
    estimatedDistance: distance,
    estimatedDuration: duration,
    serviceType: randomItem(serviceTypes),
    suggestedPrice: suggestedPrice,
    minPrice: parseFloat((suggestedPrice * 0.8).toFixed(2)),
    maxPrice: parseFloat((suggestedPrice * 1.5).toFixed(2)),
    proposedPrice: parseFloat((suggestedPrice * randomFloat(0.85, 1.2, 2)).toFixed(2)),
    priceRatio: randomFloat(0.85, 1.2, 2),
    surgeInfo: {
      isActive: isSurge,
      multiplier: isSurge ? randomFloat(1.1, 2.0, 1) : 1.0,
      reason: isSurge ? randomItem(["Forte demande", "Heure de pointe", "Mauvais temps", "Événement"]) : null
    },
    acceptanceLikelihood: {
      level: randomItem(["high", "medium", "low"]),
      percentage: randomInt(30, 95),
      estimatedMinutes: randomInt(2, 15)
    },
    status: randomItem(["pending", "accepted", "rejected", "expired"]),
    createdAt: randomDate(new Date("2025-01-01"), new Date()),
    updatedAt: new Date()
  });
}
print("  -> 50 price proposals created");

// ============ SEED NOTIFICATIONS ============
print("\n[9/9] Creating notifications...");
const notifTypes = ["ride_accepted", "ride_completed", "ride_cancelled", "driver_arriving", "payment_received", "badge_earned", "promo", "system"];
const notifMessages = {
  ride_accepted: { fr: "Votre course a été acceptée!", ar: "تم قبول رحلتك!", en: "Your ride has been accepted!" },
  ride_completed: { fr: "Course terminée. Merci d'avoir voyagé avec Sally!", ar: "انتهت الرحلة. شكراً لسفرك مع سالي!", en: "Ride completed. Thanks for riding with Sally!" },
  ride_cancelled: { fr: "Course annulée.", ar: "تم إلغاء الرحلة.", en: "Ride cancelled." },
  driver_arriving: { fr: "Votre conductrice arrive dans 3 minutes", ar: "سائقتك تصل خلال 3 دقائق", en: "Your driver arrives in 3 minutes" },
  payment_received: { fr: "Paiement reçu avec succès", ar: "تم استلام الدفع بنجاح", en: "Payment received successfully" },
  badge_earned: { fr: "Félicitations! Nouveau badge obtenu!", ar: "تهانينا! حصلت على شارة جديدة!", en: "Congratulations! New badge earned!" },
  promo: { fr: "20% de réduction sur votre prochaine course!", ar: "خصم 20% على رحلتك القادمة!", en: "20% off your next ride!" },
  system: { fr: "Mise à jour de l'application disponible", ar: "تحديث التطبيق متاح", en: "App update available" }
};

const allUserIds = [...userIds, ...driverUserIds];
for (let i = 0; i < 100; i++) {
  const type = randomItem(notifTypes);
  db.notifications.insertOne({
    userId: randomItem(allUserIds),
    type: type,
    title: notifMessages[type],
    message: notifMessages[type],
    read: Math.random() > 0.4,
    data: { rideId: null },
    createdAt: randomDate(new Date("2025-06-01"), new Date()),
    readAt: Math.random() > 0.4 ? randomDate(new Date("2025-06-01"), new Date()) : null
  });
}
print("  -> 100 notifications created");

// ============ SEED ADMIN LOGS ============
print("\nCreating admin activity logs...");
const adminActions = ["driver_approved", "driver_rejected", "document_verified", "user_suspended", "ride_investigated", "settings_updated"];
for (let i = 0; i < 30; i++) {
  db.adminlogs.insertOne({
    adminId: adminId,
    action: randomItem(adminActions),
    targetType: randomItem(["user", "driver", "ride", "document"]),
    targetId: randomItem(allUserIds),
    details: { note: "Action performed by admin" },
    ip: `192.168.1.${randomInt(1, 254)}`,
    createdAt: randomDate(new Date("2024-06-01"), new Date())
  });
}
print("  -> 30 admin logs created");

// ============ SUMMARY ============
print("\n========================================");
print("SEED DATA SUMMARY");
print("========================================");
print(`  Users (passengers): 50`);
print(`  Users (drivers):    25`);
print(`  Users (admin):      1`);
print(`  Users (support):    1`);
print(`  Driver profiles:    25`);
print(`  Badges:             25`);
print(`  Services:           4`);
print(`  Rides:              200`);
print(`  Conversations:      30`);
print(`  Messages:           ~${msgCount}`);
print(`  Price proposals:    50`);
print(`  Notifications:      100`);
print(`  Admin logs:         30`);
print(`  TOTAL DOCUMENTS:    ~${50 + 25 + 2 + 25 + 25 + 4 + 200 + 30 + msgCount + 50 + 100 + 30}`);
print("========================================");
print("\nDefault credentials (PASSWORD IN CLEAR):");
print("  Admin:    admin@gowithsally.ma   / admin2024");
print("  Support:  support@gowithsally.ma / admin2024");
print("  Drivers:  driver.[name]@gmail.com / password123");
print("  Users:    [name]@gmail.com        / password123");
print("========================================");

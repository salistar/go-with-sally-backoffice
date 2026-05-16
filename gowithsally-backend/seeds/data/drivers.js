/**
 * ============================================================================
 * GO WITH SALLY - DRIVERS SEED DATA
 * ============================================================================
 * Données de test pour les conductrices
 * 
 * Contient:
 * - Conductrices prédéfinies (test accounts)
 * - Générateur de conductrices aléatoires
 * - Données véhicules réalistes (marques marocaines)
 * - Quartiers de Casablanca avec coordonnées
 * 
 * @module seeds/data/drivers
 * @version 1.0.0
 * ============================================================================
 */

console.log('📄 [seeds/data/drivers.js] Fichier chargé');

// ============================================================================
// DONNÉES VÉHICULES
// ============================================================================

/**
 * Marques et modèles de véhicules populaires au Maroc
 * @constant {Object[]}
 */
const vehicles = [
  { brand: 'Dacia', models: ['Logan', 'Sandero', 'Duster', 'Dokker', 'Lodgy'] },
  { brand: 'Renault', models: ['Clio', 'Megane', 'Symbol', 'Kangoo', 'Captur'] },
  { brand: 'Peugeot', models: ['208', '308', '2008', '3008', '301'] },
  { brand: 'Citroën', models: ['C3', 'C4', 'C-Elysée', 'Berlingo', 'C5 Aircross'] },
  { brand: 'Volkswagen', models: ['Polo', 'Golf', 'Passat', 'Tiguan', 'T-Roc'] },
  { brand: 'Hyundai', models: ['i10', 'i20', 'Accent', 'Tucson', 'Creta'] },
  { brand: 'Toyota', models: ['Yaris', 'Corolla', 'C-HR', 'RAV4', 'Hilux'] },
  { brand: 'Fiat', models: ['Punto', '500', 'Tipo', 'Panda', 'Doblo'] },
  { brand: 'Kia', models: ['Picanto', 'Rio', 'Sportage', 'Ceed', 'Sorento'] },
  { brand: 'Mercedes', models: ['Classe A', 'Classe C', 'Classe E', 'GLA', 'GLC'] },
  { brand: 'BMW', models: ['Série 1', 'Série 3', 'X1', 'X3', 'X5'] },
  { brand: 'Audi', models: ['A1', 'A3', 'A4', 'Q3', 'Q5'] },
  { brand: 'Nissan', models: ['Micra', 'Qashqai', 'Juke', 'X-Trail'] },
  { brand: 'Ford', models: ['Fiesta', 'Focus', 'Kuga', 'Puma'] },
  { brand: 'Opel', models: ['Corsa', 'Astra', 'Crossland', 'Grandland'] }
];

console.log('📄 [seeds/data/drivers.js] Marques de véhicules chargées:', vehicles.length);

/**
 * Couleurs de véhicules
 * @constant {string[]}
 */
const colors = [
  'Blanc', 'Noir', 'Gris', 'Gris Métallisé', 'Rouge', 'Bleu', 
  'Beige', 'Argent', 'Marron', 'Vert', 'Orange', 'Bordeaux'
];

console.log('📄 [seeds/data/drivers.js] Couleurs chargées:', colors.length);

/**
 * Noms de banques marocaines
 * @constant {string[]}
 */
const bankNames = [
  'Attijariwafa Bank',
  'BMCE Bank of Africa',
  'Banque Populaire',
  'CIH Bank',
  'Crédit du Maroc',
  'BMCI',
  'Société Générale Maroc',
  'CFG Bank',
  'Bank Al-Maghrib',
  'Al Barid Bank'
];

console.log('📄 [seeds/data/drivers.js] Banques chargées:', bankNames.length);

/**
 * Compagnies d'assurance marocaines
 * @constant {string[]}
 */
const insuranceCompanies = [
  'Wafa Assurance',
  'AXA Assurance Maroc',
  'SAHAM Assurance',
  'RMA Assurance',
  'Atlanta Assurance',
  'MAMDA',
  'Sanad Assurance',
  'Allianz Maroc',
  'MCMA'
];

console.log('📄 [seeds/data/drivers.js] Assurances chargées:', insuranceCompanies.length);

// ============================================================================
// QUARTIERS DE CASABLANCA
// ============================================================================

/**
 * Quartiers de Casablanca avec coordonnées GPS
 * @constant {Object[]}
 */
const casablancaAreas = [
  { name: 'Maarif', lat: 33.5731, lng: -7.6198, popular: true },
  { name: 'Gauthier', lat: 33.5883, lng: -7.6156, popular: true },
  { name: 'Anfa', lat: 33.5667, lng: -7.6667, popular: true },
  { name: 'Ain Diab', lat: 33.5933, lng: -7.6700, popular: true },
  { name: 'Sidi Maarouf', lat: 33.5350, lng: -7.6567, popular: true },
  { name: 'Hay Hassani', lat: 33.5567, lng: -7.5833, popular: false },
  { name: 'Ain Chock', lat: 33.5333, lng: -7.5833, popular: false },
  { name: 'Bourgogne', lat: 33.5800, lng: -7.6100, popular: true },
  { name: 'Racine', lat: 33.5767, lng: -7.6300, popular: true },
  { name: '2 Mars', lat: 33.5650, lng: -7.6050, popular: false },
  { name: 'Oasis', lat: 33.5700, lng: -7.6400, popular: true },
  { name: 'Palmier', lat: 33.5650, lng: -7.6250, popular: true },
  { name: 'Californie', lat: 33.5500, lng: -7.6350, popular: true },
  { name: 'CIL', lat: 33.5450, lng: -7.6150, popular: false },
  { name: 'Hay Mohammadi', lat: 33.5850, lng: -7.5650, popular: false }
];

console.log('📄 [seeds/data/drivers.js] Quartiers Casablanca chargés:', casablancaAreas.length);

// ============================================================================
// CONDUCTRICES PRÉDÉFINIES
// ============================================================================

console.log('📄 [seeds/data/drivers.js] Création des conductrices prédéfinies...');

/**
 * Conductrices prédéfinies pour les tests
 * Ces profils correspondent aux utilisatrices avec role='driver'
 * @constant {Object[]}
 */
const drivers = [
  // ─────────────────────────────────────────────────────────────────────────
  // CONDUCTRICE 1 - AMINA (Expérimentée, haut rating)
  // ─────────────────────────────────────────────────────────────────────────
  {
    status: 'approved',
    approvedAt: new Date('2023-06-15'),
    documents: {
      nationalId: {
        front: 'https://storage.gowithsally.com/docs/cni_front_1.jpg',
        back: 'https://storage.gowithsally.com/docs/cni_back_1.jpg',
        number: 'BK123456',
        expiryDate: new Date('2028-05-15'),
        verified: true,
        verifiedAt: new Date('2023-06-10')
      },
      drivingLicense: {
        front: 'https://storage.gowithsally.com/docs/permis_front_1.jpg',
        back: 'https://storage.gowithsally.com/docs/permis_back_1.jpg',
        number: '12/345678',
        category: 'B',
        expiryDate: new Date('2027-08-22'),
        verified: true,
        verifiedAt: new Date('2023-06-10')
      },
      anthropometricRecord: {
        file: 'https://storage.gowithsally.com/docs/casier_1.pdf',
        issueDate: new Date('2024-01-15'),
        verified: true,
        verifiedAt: new Date('2024-01-20')
      },
      profilePhoto: {
        url: 'https://randomuser.me/api/portraits/women/2.jpg',
        verified: true,
        verifiedAt: new Date('2023-06-10')
      },
      faceDescriptor: null // Sera généré par le service de reconnaissance faciale
    },
    vehicle: {
      brand: 'Dacia',
      model: 'Logan',
      year: 2022,
      color: 'Blanc',
      plateNumber: '12345-A-1',
      seats: 4,
      type: 'standard',
      hasAC: true,
      hasChildSeat: false,
      hasWheelchairAccess: false,
      photos: {
        front: 'https://storage.gowithsally.com/vehicles/car_front_1.jpg',
        back: 'https://storage.gowithsally.com/vehicles/car_back_1.jpg',
        left: 'https://storage.gowithsally.com/vehicles/car_left_1.jpg',
        right: 'https://storage.gowithsally.com/vehicles/car_right_1.jpg',
        interior: 'https://storage.gowithsally.com/vehicles/car_interior_1.jpg'
      },
      registration: {
        file: 'https://storage.gowithsally.com/docs/carte_grise_1.pdf',
        number: 'CG-123456',
        expiryDate: new Date('2025-12-31'),
        verified: true
      },
      insurance: {
        company: 'Wafa Assurance',
        policyNumber: 'WA-2024-123456',
        file: 'https://storage.gowithsally.com/docs/assurance_1.pdf',
        expiryDate: new Date('2025-06-30'),
        verified: true
      },
      technicalInspection: {
        file: 'https://storage.gowithsally.com/docs/visite_tech_1.pdf',
        expiryDate: new Date('2025-03-15'),
        verified: true
      }
    },
    isOnline: true,
    isAvailable: true,
    currentLocation: {
      type: 'Point',
      coordinates: [-7.6198, 33.5731], // Maarif
      heading: 45,
      speed: 0,
      accuracy: 10,
      updatedAt: new Date()
    },
    stats: {
      completedRides: 245,
      cancelledRides: 8,
      totalDistance: 12500, // km
      totalHours: 520,
      averageRating: 4.92,
      totalRatings: 198,
      acceptanceRate: 95,
      responseTime: 12, // secondes
      onTimeRate: 98
    },
    ratings: [],  // Corrigé: tableau vide (schema attend array)
    earnings: {
      today: 450,
      week: 2800,
      month: 12500,
      total: 85000,
      available: 3500,
      pending: 1200,
      withdrawn: 80300
    },
    bankDetails: {
      rib: '007 123 0001234567890123 45',
      bankName: 'Attijariwafa Bank',
      accountHolder: 'AMINA EL AMRANI',
      verified: true,
      verifiedAt: new Date('2023-06-15')
    },
    commissionRate: 0.15,
    preferredAreas: [
      { 
        name: 'Maarif', 
        coordinates: { type: 'Point', coordinates: [-7.6198, 33.5731] }, 
        radius: 5000 
      },
      { 
        name: 'Anfa', 
        coordinates: { type: 'Point', coordinates: [-7.6667, 33.5667] }, 
        radius: 3000 
      }
    ],
    schedule: {
      monday: { active: true, start: '08:00', end: '20:00' },
      tuesday: { active: true, start: '08:00', end: '20:00' },
      wednesday: { active: true, start: '08:00', end: '20:00' },
      thursday: { active: true, start: '08:00', end: '20:00' },
      friday: { active: true, start: '08:00', end: '22:00' },
      saturday: { active: true, start: '09:00', end: '22:00' },
      sunday: { active: false, start: null, end: null }
    }
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // CONDUCTRICE 2 - KHADIJA (Active, véhicule confort)
  // ─────────────────────────────────────────────────────────────────────────
  {
    status: 'approved',
    approvedAt: new Date('2023-09-20'),
    documents: {
      nationalId: { 
        number: 'BK234567', 
        verified: true, 
        expiryDate: new Date('2029-03-10'),
        verifiedAt: new Date('2023-09-15')
      },
      drivingLicense: { 
        number: '23/456789', 
        category: 'B', 
        verified: true, 
        expiryDate: new Date('2028-03-10'),
        verifiedAt: new Date('2023-09-15')
      },
      anthropometricRecord: {
        issueDate: new Date('2023-08-01'),
        verified: true,
        verifiedAt: new Date('2023-09-15')
      },
      profilePhoto: { 
        url: 'https://randomuser.me/api/portraits/women/3.jpg', 
        verified: true,
        verifiedAt: new Date('2023-09-15')
      }
    },
    vehicle: {
      brand: 'Peugeot',
      model: '208',
      year: 2021,
      color: 'Gris Métallisé',
      plateNumber: '23456-B-2',
      seats: 4,
      type: 'comfort',
      hasAC: true,
      hasChildSeat: true,
      hasWheelchairAccess: false,
      photos: {
        front: 'https://storage.gowithsally.com/vehicles/car_front_2.jpg',
        interior: 'https://storage.gowithsally.com/vehicles/car_interior_2.jpg'
      },
      registration: { 
        verified: true, 
        expiryDate: new Date('2025-10-15') 
      },
      insurance: { 
        company: 'AXA Assurance Maroc', 
        verified: true, 
        expiryDate: new Date('2025-04-20') 
      },
      technicalInspection: {
        expiryDate: new Date('2025-06-30'),
        verified: true
      }
    },
    isOnline: true,
    isAvailable: false, // En course actuellement
    currentLocation: {
      type: 'Point',
      coordinates: [-7.6156, 33.5883], // Gauthier
      heading: 180,
      speed: 35,
      accuracy: 5,
      updatedAt: new Date()
    },
    stats: {
      completedRides: 312,
      cancelledRides: 5,
      totalDistance: 15800,
      totalHours: 680,
      averageRating: 4.85,
      totalRatings: 287,
      acceptanceRate: 98,
      responseTime: 8,
      onTimeRate: 96
    },
    ratings: [],  // Corrigé: tableau vide (schema attend array)
    earnings: {
      today: 380,
      week: 3200,
      month: 14800,
      total: 95000,
      available: 4200,
      pending: 800,
      withdrawn: 90000
    },
    bankDetails: {
      rib: '011 456 0009876543210987 65',
      bankName: 'BMCE Bank of Africa',
      accountHolder: 'KHADIJA TAZI',
      verified: true
    },
    commissionRate: 0.15,
    preferredAreas: [
      { 
        name: 'Gauthier', 
        coordinates: { type: 'Point', coordinates: [-7.6156, 33.5883] }, 
        radius: 4000 
      }
    ]
  }
];

console.log('📄 [seeds/data/drivers.js] ✓ Conductrices prédéfinies:', drivers.length);

// ============================================================================
// GÉNÉRATEUR DE CONDUCTRICES ALÉATOIRES
// ============================================================================

/**
 * Génère un numéro de plaque d'immatriculation marocaine
 * @returns {string} - Numéro de plaque (XXXXX-X-XX)
 */
const generatePlateNumber = () => {
  const letters = 'ABCDEFGH';
  const plateNumber = Math.floor(10000 + Math.random() * 90000);
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const region = Math.floor(1 + Math.random() * 99);
  return `${plateNumber}-${letter}-${region}`;
};

/**
 * Génère un RIB bancaire marocain
 * @returns {string} - RIB (XXX XXX XXXXXXXXXXXXXXXX XX)
 */
const generateRIB = () => {
  const bankCode = Math.floor(1 + Math.random() * 99).toString().padStart(3, '0');
  const branchCode = Math.floor(1 + Math.random() * 999).toString().padStart(3, '0');
  const accountNumber = Math.floor(Math.random() * 9999999999999999).toString().padStart(16, '0');
  const key = Math.floor(Math.random() * 99).toString().padStart(2, '0');
  return `${bankCode} ${branchCode} ${accountNumber} ${key}`;
};

/**
 * Génère une date d'expiration future
 * @param {number} minYears - Années minimum
 * @param {number} maxYears - Années maximum
 * @returns {Date} - Date d'expiration
 */
const generateExpiryDate = (minYears = 1, maxYears = 5) => {
  const years = minYears + Math.floor(Math.random() * (maxYears - minYears));
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + years);
  futureDate.setMonth(Math.floor(Math.random() * 12));
  futureDate.setDate(Math.floor(Math.random() * 28) + 1);
  return futureDate;
};

/**
 * Génère des conductrices aléatoires
 * @param {number} count - Nombre de conductrices à générer
 * @returns {Object[]} - Tableau de conductrices
 */
const generateDrivers = (count = 5) => {
  console.log('📄 [seeds/data/drivers.js] ▶ generateDrivers() - Génération de', count, 'conductrices');
  
  const generatedDrivers = [];
  const usedPlates = new Set();
  
  for (let i = 0; i < count; i++) {
    // Sélectionner un véhicule aléatoire
    const vehicleType = vehicles[Math.floor(Math.random() * vehicles.length)];
    const model = vehicleType.models[Math.floor(Math.random() * vehicleType.models.length)];
    const color = colors[Math.floor(Math.random() * colors.length)];
    const area = casablancaAreas[Math.floor(Math.random() * casablancaAreas.length)];
    const isOnline = Math.random() > 0.3;
    
    // Générer une plaque unique
    let plateNumber;
    do {
      plateNumber = generatePlateNumber();
    } while (usedPlates.has(plateNumber));
    usedPlates.add(plateNumber);
    
    // Déterminer le statut (majoritairement approuvées)
    const statusWeights = [
      { status: 'approved', weight: 70 },
      { status: 'pending_verification', weight: 15 },
      { status: 'pending_documents', weight: 10 },
      { status: 'suspended', weight: 3 },
      { status: 'rejected', weight: 2 }
    ];
    
    let status = 'approved';
    const random = Math.random() * 100;
    let cumulative = 0;
    for (const sw of statusWeights) {
      cumulative += sw.weight;
      if (random <= cumulative) {
        status = sw.status;
        break;
      }
    }
    
    // Générer les stats basées sur l'ancienneté simulée
    const monthsActive = Math.floor(Math.random() * 24) + 1;
    const ridesPerMonth = 15 + Math.floor(Math.random() * 30);
    const completedRides = monthsActive * ridesPerMonth;
    const cancelledRides = Math.floor(completedRides * (Math.random() * 0.05));
    
    // Déterminer le type de véhicule
    const vehicleTypeCategory = ['standard', 'standard', 'standard', 'comfort', 'premium'][Math.floor(Math.random() * 5)];
    
    const driver = {
      status,
      approvedAt: status === 'approved' ? new Date(Date.now() - monthsActive * 30 * 24 * 60 * 60 * 1000) : null,
      documents: {
        nationalId: {
          number: `BK${Math.floor(100000 + Math.random() * 900000)}`,
          verified: status === 'approved' || Math.random() > 0.3,
          expiryDate: generateExpiryDate(2, 6)
        },
        drivingLicense: {
          number: `${Math.floor(10 + Math.random() * 90)}/${Math.floor(100000 + Math.random() * 900000)}`,
          category: 'B',
          verified: status === 'approved' || Math.random() > 0.3,
          expiryDate: generateExpiryDate(1, 5)
        },
        anthropometricRecord: {
          issueDate: new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000),
          verified: status === 'approved' || Math.random() > 0.4
        },
        profilePhoto: {
          url: `https://randomuser.me/api/portraits/women/${20 + i}.jpg`,
          verified: status === 'approved' || Math.random() > 0.2
        }
      },
      vehicle: {
        brand: vehicleType.brand,
        model: model,
        year: 2018 + Math.floor(Math.random() * 6),
        color: color,
        plateNumber: plateNumber,
        seats: [4, 4, 4, 5, 7][Math.floor(Math.random() * 5)],
        type: vehicleTypeCategory,
        hasAC: Math.random() > 0.1,
        hasChildSeat: Math.random() > 0.8,
        hasWheelchairAccess: Math.random() > 0.95,
        registration: {
          verified: status === 'approved' || Math.random() > 0.3,
          expiryDate: generateExpiryDate(1, 2)
        },
        insurance: {
          company: insuranceCompanies[Math.floor(Math.random() * insuranceCompanies.length)],
          verified: status === 'approved' || Math.random() > 0.3,
          expiryDate: generateExpiryDate(0, 1)
        },
        technicalInspection: {
          expiryDate: generateExpiryDate(0, 1),
          verified: status === 'approved' || Math.random() > 0.4
        }
      },
      isOnline: status === 'approved' && isOnline,
      isAvailable: status === 'approved' && isOnline && Math.random() > 0.3,
      currentLocation: {
        type: 'Point',
        coordinates: [
          area.lng + (Math.random() - 0.5) * 0.02,
          area.lat + (Math.random() - 0.5) * 0.02
        ],
        heading: Math.floor(Math.random() * 360),
        speed: isOnline ? Math.floor(Math.random() * 60) : 0,
        accuracy: 5 + Math.floor(Math.random() * 20),
        updatedAt: new Date()
      },
      stats: {
        completedRides,
        cancelledRides,
        totalDistance: completedRides * (8 + Math.floor(Math.random() * 10)),
        totalHours: completedRides * (0.4 + Math.random() * 0.3),
        averageRating: completedRides > 0 ? (4 + Math.random() * 0.95) : undefined,
        totalRatings: Math.floor(completedRides * (0.6 + Math.random() * 0.3)),
        acceptanceRate: 80 + Math.floor(Math.random() * 20),
        responseTime: 5 + Math.floor(Math.random() * 30),
        onTimeRate: 85 + Math.floor(Math.random() * 15)
      },
      ratings: [],  // Corrigé: tableau vide (schema attend array)
      earnings: {
        today: Math.floor(Math.random() * 800),
        week: Math.floor(Math.random() * 5000),
        month: Math.floor(Math.random() * 20000),
        total: completedRides * (35 + Math.floor(Math.random() * 20)),
        available: Math.floor(Math.random() * 10000),
        pending: Math.floor(Math.random() * 3000),
        withdrawn: Math.floor(Math.random() * 80000)
      },
      bankDetails: {
        rib: generateRIB(),
        bankName: bankNames[Math.floor(Math.random() * bankNames.length)],
        accountHolder: null, // Sera rempli avec le nom de l'utilisatrice
        verified: status === 'approved' && Math.random() > 0.2
      },
      commissionRate: 0.15,
      preferredAreas: [
        {
          name: area.name,
          coordinates: { type: 'Point', coordinates: [area.lng, area.lat] },
          radius: 3000 + Math.floor(Math.random() * 5000)
        }
      ]
    };
    
    generatedDrivers.push(driver);
  }
  
  console.log('📄 [seeds/data/drivers.js] ✓ Conductrices générées:', generatedDrivers.length);
  console.log('📄 [seeds/data/drivers.js]   - Approuvées:', generatedDrivers.filter(d => d.status === 'approved').length);
  console.log('📄 [seeds/data/drivers.js]   - En ligne:', generatedDrivers.filter(d => d.isOnline).length);
  
  return generatedDrivers;
};

// ============================================================================
// EXPORT
// ============================================================================

console.log('📄 [seeds/data/drivers.js] ✅ Module exporté');

module.exports = {
  drivers,
  generateDrivers,
  vehicles,
  colors,
  casablancaAreas,
  bankNames,
  insuranceCompanies,
  generatePlateNumber,
  generateRIB,
  generateExpiryDate
};
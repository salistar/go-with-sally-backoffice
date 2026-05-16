/**
 * ============================================================================
 * GO WITH SALLY - SERVICE MODEL
 * ============================================================================
 * Modèle MongoDB pour les types de services
 * 
 * @module models/Service
 * @version 1.0.0
 * ============================================================================
 */

const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  // Identifiant unique du service
  type: {
    type: String,
    enum: ['sally_eco', 'sally_standard', 'sally_confort', 'sally_pool'],
    required: true,
    unique: true,
    index: true,
  },
  
  // Nom du service (multilingue)
  name: {
    fr: { type: String, required: true },
    ar: { type: String, required: true },
    en: { type: String, required: true },
  },
  
  // Description courte
  shortDescription: {
    fr: { type: String },
    ar: { type: String },
    en: { type: String },
  },
  
  // Description complète
  description: {
    fr: { type: String },
    ar: { type: String },
    en: { type: String },
  },
  
  // Icône et emoji
  icon: {
    type: String,
    default: 'car',
  },
  emoji: {
    type: String,
    default: '🚗',
  },
  
  // Couleur thème
  color: {
    type: String,
    default: '#E91E8C',
  },
  
  // Configuration des prix
  pricing: {
    basePrice: { type: Number, required: true },
    pricePerKm: { type: Number, required: true },
    pricePerMinute: { type: Number, required: true },
    minimumFare: { type: Number, required: true },
    multiplier: { type: Number, default: 1.0 },
    commissionRate: { type: Number, default: 0.15 },
  },
  
  // Capacité
  capacity: {
    min: { type: Number, default: 1 },
    max: { type: Number, default: 4 },
  },
  
  // Fonctionnalités incluses
  features: [{
    fr: String,
    ar: String,
    en: String,
  }],
  
  // Badge requis pour proposer ce service
  requiredBadge: {
    type: String,
    enum: ['none', 'basic', 'verified', 'premium', 'elite'],
    default: 'basic',
  },
  
  // Priorité d'affichage
  displayOrder: {
    type: Number,
    default: 0,
  },
  
  // Actif ou non
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  // Stats
  stats: {
    totalRides: { type: Number, default: 0 },
    avgRating: { type: Number, default: 5.0 },
    activeDrivers: { type: Number, default: 0 },
  },
  
}, {
  timestamps: true,
});

// ============================================================================
// INDEX
// ============================================================================

serviceSchema.index({ isActive: 1, displayOrder: 1 });
serviceSchema.index({ requiredBadge: 1 });

// ============================================================================
// MÉTHODES D'INSTANCE
// ============================================================================

/**
 * Calculer le prix estimé
 */
serviceSchema.methods.calculatePrice = function(distanceKm, durationMinutes, surgeMultiplier = 1.0) {
  const { basePrice, pricePerKm, pricePerMinute, minimumFare, multiplier } = this.pricing;
  
  const rawPrice = (basePrice + distanceKm * pricePerKm + durationMinutes * pricePerMinute) 
    * multiplier * surgeMultiplier;
  
  const price = Math.max(minimumFare, Math.round(rawPrice / 5) * 5);
  
  return {
    price,
    breakdown: {
      base: basePrice,
      distance: Math.round(distanceKm * pricePerKm * 100) / 100,
      duration: Math.round(durationMinutes * pricePerMinute * 100) / 100,
      surge: surgeMultiplier > 1 ? Math.round(price * (1 - 1/surgeMultiplier)) : 0,
    },
  };
};

/**
 * Obtenir le nom localisé
 */
serviceSchema.methods.getName = function(lang = 'fr') {
  return this.name[lang] || this.name.fr;
};

/**
 * Obtenir la description localisée
 */
serviceSchema.methods.getDescription = function(lang = 'fr') {
  return this.description[lang] || this.description.fr;
};

// ============================================================================
// MÉTHODES STATIQUES
// ============================================================================

/**
 * Obtenir tous les services actifs
 */
serviceSchema.statics.getActiveServices = async function(lang = 'fr') {
  const services = await this.find({ isActive: true }).sort({ displayOrder: 1 });
  
  return services.map(service => ({
    type: service.type,
    name: service.getName(lang),
    shortDescription: service.shortDescription?.[lang] || service.shortDescription?.fr,
    emoji: service.emoji,
    icon: service.icon,
    color: service.color,
    pricing: service.pricing,
    capacity: service.capacity,
    features: service.features.map(f => f[lang] || f.fr),
    requiredBadge: service.requiredBadge,
  }));
};

/**
 * Obtenir un service par type
 */
serviceSchema.statics.getByType = async function(type) {
  return this.findOne({ type, isActive: true });
};

/**
 * Initialiser les services par défaut
 */
serviceSchema.statics.initializeDefaults = async function() {
  const defaults = [
    {
      type: 'sally_eco',
      name: { fr: 'Sally Eco', ar: 'سالي إيكو', en: 'Sally Eco' },
      shortDescription: { fr: 'Économique', ar: 'اقتصادي', en: 'Economic' },
      description: { fr: 'Option la plus économique', ar: 'الخيار الأكثر اقتصادا', en: 'Most economic option' },
      emoji: '🌱',
      icon: 'leaf',
      color: '#22C55E',
      pricing: { basePrice: 7, pricePerKm: 3.0, pricePerMinute: 0.3, minimumFare: 15, multiplier: 0.8, commissionRate: 0.12 },
      features: [
        { fr: 'Prix réduit', ar: 'سعر مخفض', en: 'Reduced price' },
        { fr: 'Véhicule standard', ar: 'سيارة عادية', en: 'Standard vehicle' },
      ],
      requiredBadge: 'basic',
      displayOrder: 1,
    },
    {
      type: 'sally_standard',
      name: { fr: 'Sally Standard', ar: 'سالي ستاندارد', en: 'Sally Standard' },
      shortDescription: { fr: 'Confort quotidien', ar: 'راحة يومية', en: 'Daily comfort' },
      description: { fr: 'Le meilleur rapport qualité-prix', ar: 'أفضل قيمة مقابل السعر', en: 'Best value for money' },
      emoji: '🚗',
      icon: 'car',
      color: '#E91E8C',
      pricing: { basePrice: 10, pricePerKm: 4.0, pricePerMinute: 0.5, minimumFare: 20, multiplier: 1.0, commissionRate: 0.15 },
      features: [
        { fr: 'Climatisation', ar: 'تكييف', en: 'Air conditioning' },
        { fr: 'Véhicule récent', ar: 'سيارة حديثة', en: 'Recent vehicle' },
      ],
      requiredBadge: 'basic',
      displayOrder: 2,
    },
    {
      type: 'sally_confort',
      name: { fr: 'Sally Confort', ar: 'سالي كومفورت', en: 'Sally Comfort' },
      shortDescription: { fr: 'Premium', ar: 'بريميوم', en: 'Premium' },
      description: { fr: 'Véhicules haut de gamme', ar: 'سيارات فاخرة', en: 'High-end vehicles' },
      emoji: '✨',
      icon: 'star',
      color: '#8B5CF6',
      pricing: { basePrice: 15, pricePerKm: 5.5, pricePerMinute: 0.8, minimumFare: 35, multiplier: 1.4, commissionRate: 0.18 },
      features: [
        { fr: 'Véhicule premium', ar: 'سيارة فاخرة', en: 'Premium vehicle' },
        { fr: 'WiFi gratuit', ar: 'واي فاي مجاني', en: 'Free WiFi' },
        { fr: 'Eau offerte', ar: 'ماء مجاني', en: 'Free water' },
      ],
      requiredBadge: 'premium',
      displayOrder: 3,
    },
    {
      type: 'sally_pool',
      name: { fr: 'Sally Pool', ar: 'سالي بول', en: 'Sally Pool' },
      shortDescription: { fr: 'Partagé', ar: 'مشترك', en: 'Shared' },
      description: { fr: 'Partagez et économisez', ar: 'شاركي ووفري', en: 'Share and save' },
      emoji: '👥',
      icon: 'account-group',
      color: '#06B6D4',
      pricing: { basePrice: 5, pricePerKm: 2.5, pricePerMinute: 0.2, minimumFare: 10, multiplier: 0.6, commissionRate: 0.10 },
      capacity: { min: 1, max: 3 },
      features: [
        { fr: 'Prix partagé', ar: 'سعر مشترك', en: 'Shared price' },
        { fr: 'Écologique', ar: 'صديق للبيئة', en: 'Eco-friendly' },
      ],
      requiredBadge: 'basic',
      displayOrder: 4,
    },
  ];
  
  for (const service of defaults) {
    await this.findOneAndUpdate(
      { type: service.type },
      service,
      { upsert: true, new: true }
    );
  }
  
  console.log('[Service] ✅ Services par défaut initialisés');
};

// ============================================================================
// EXPORT
// ============================================================================

const Service = mongoose.model('Service', serviceSchema);

module.exports = Service;
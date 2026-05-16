/**
 * ============================================================================
 * GO WITH SALLY - GENDER VERIFICATION SERVICE (Backend)
 * ============================================================================
 * Service de vérification du genre pour garantir un service femme-only
 *
 * Méthodes de vérification:
 * 1. Selfie avec analyse IA
 * 2. Document d'identité (CIN/Passeport)
 * 3. Auto-déclaration (en attente de validation admin)
 *
 * @module services/genderVerificationService
 * @version 1.0.0
 * ============================================================================
 */

// LOG SUMMARY
// Console.log statements added:
// - Module load log
// - All exported function entries

console.log('📄 genderVerificationService.js ▶ Module loaded');

const User = require('../models/User');

// ============================================================================
// CONFIGURATION
// ============================================================================

const VERIFICATION_CONFIG = {
  // Seuils de confiance
  minConfidenceForAuto: 0.85,    // Auto-validation si > 85%
  minConfidenceForReview: 0.60,  // Revue manuelle si entre 60-85%
  
  // Délais
  manualReviewTimeoutHours: 24,
  verificationExpiryDays: 365,
  
  // Méthodes autorisées
  allowedMethods: ['selfie', 'document', 'self_declaration'],
  
  // Documents acceptés
  allowedDocuments: ['cin', 'passport', 'driver_license'],
};

// ============================================================================
// SERVICE PRINCIPAL
// ============================================================================

const genderVerificationService = {
  /**
   * Vérifier le genre via selfie (simulation IA)
   */
  async verifyWithSelfie(userId, imageBase64) {
    console.log(`[GenderVerification] 📸 Vérification selfie pour user: ${userId}`);
    
    // Simulation de l'analyse IA
    // En production: appeler un service d'IA (AWS Rekognition, Azure Face API, etc.)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulation résultat IA
    const aiResult = {
      isFemale: Math.random() > 0.1, // 90% de succès en simulation
      confidence: 0.85 + Math.random() * 0.14, // Entre 85% et 99%
      faceDetected: true,
      faceCount: 1,
      attributes: {
        age: Math.floor(20 + Math.random() * 40),
        smile: Math.random() > 0.5,
        glasses: Math.random() > 0.7,
      },
    };
    
    // Déterminer le statut
    let status = 'pending';
    let message = '';
    
    if (!aiResult.faceDetected) {
      status = 'failed';
      message = 'Aucun visage détecté dans l\'image';
    } else if (aiResult.faceCount > 1) {
      status = 'failed';
      message = 'Plusieurs visages détectés. Veuillez prendre une photo seule.';
    } else if (!aiResult.isFemale) {
      status = 'rejected';
      message = 'Go With Sally est exclusivement réservé aux femmes.';
    } else if (aiResult.confidence >= VERIFICATION_CONFIG.minConfidenceForAuto) {
      status = 'verified';
      message = 'Vérification réussie automatiquement.';
    } else if (aiResult.confidence >= VERIFICATION_CONFIG.minConfidenceForReview) {
      status = 'manual_review';
      message = 'Votre vérification est en cours de revue par notre équipe.';
    } else {
      status = 'failed';
      message = 'Impossible de vérifier. Veuillez réessayer avec une meilleure photo.';
    }
    
    // Mettre à jour l'utilisateur si vérifié
    if (status === 'verified') {
      await User.findByIdAndUpdate(userId, {
        genderVerified: true,
        genderVerificationMethod: 'selfie',
        genderVerificationDate: new Date(),
        gender: 'female',
      });
    }
    
    return {
      success: status === 'verified',
      status,
      message,
      confidence: Math.round(aiResult.confidence * 100),
      method: 'selfie',
      requiresManualReview: status === 'manual_review',
    };
  },
  
  /**
   * Vérifier le genre via document d'identité
   */
  async verifyWithDocument(userId, documentUri, documentType) {
    console.log(`[GenderVerification] 📄 Vérification document (${documentType}) pour user: ${userId}`);
    
    // Validation du type de document
    if (!VERIFICATION_CONFIG.allowedDocuments.includes(documentType)) {
      return {
        success: false,
        status: 'failed',
        message: `Type de document non accepté. Types acceptés: ${VERIFICATION_CONFIG.allowedDocuments.join(', ')}`,
      };
    }
    
    // Simulation OCR et extraction
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulation résultat OCR
    const ocrResult = {
      documentValid: Math.random() > 0.05, // 95% de documents valides
      gender: Math.random() > 0.1 ? 'F' : 'M', // 90% femmes en simulation
      firstName: 'Prénom',
      lastName: 'Nom',
      dateOfBirth: '1990-01-01',
      documentNumber: 'AB123456',
      expiryDate: '2030-12-31',
      confidence: 0.90 + Math.random() * 0.09,
    };
    
    // Déterminer le statut
    let status = 'pending';
    let message = '';
    
    if (!ocrResult.documentValid) {
      status = 'failed';
      message = 'Document non lisible ou invalide. Veuillez réessayer.';
    } else if (ocrResult.gender !== 'F') {
      status = 'rejected';
      message = 'Go With Sally est exclusivement réservé aux femmes.';
    } else if (ocrResult.confidence >= VERIFICATION_CONFIG.minConfidenceForAuto) {
      status = 'verified';
      message = 'Document vérifié avec succès.';
    } else {
      status = 'manual_review';
      message = 'Document en cours de vérification manuelle.';
    }
    
    // Mettre à jour l'utilisateur si vérifié
    if (status === 'verified') {
      await User.findByIdAndUpdate(userId, {
        genderVerified: true,
        genderVerificationMethod: 'document',
        genderVerificationDate: new Date(),
        genderVerificationDocument: documentType,
        gender: 'female',
      });
    }
    
    return {
      success: status === 'verified',
      status,
      message,
      confidence: Math.round(ocrResult.confidence * 100),
      method: 'document',
      documentType,
      extractedData: status === 'verified' ? {
        firstName: ocrResult.firstName,
        lastName: ocrResult.lastName,
      } : null,
      requiresManualReview: status === 'manual_review',
    };
  },
  
  /**
   * Auto-déclaration (nécessite validation admin)
   */
  async selfDeclare(userId) {
    console.log(`[GenderVerification] ✋ Auto-déclaration pour user: ${userId}`);
    
    // Créer une demande de vérification manuelle
    await User.findByIdAndUpdate(userId, {
      genderVerified: false,
      genderVerificationMethod: 'self_declaration',
      genderVerificationStatus: 'pending_admin',
      genderVerificationRequestDate: new Date(),
      gender: 'female',
    });
    
    return {
      success: true,
      status: 'pending_admin',
      message: 'Votre déclaration a été enregistrée. Elle sera validée par notre équipe sous 24h.',
      method: 'self_declaration',
      requiresManualReview: true,
      estimatedReviewTime: '24 heures',
    };
  },
  
  /**
   * Valider manuellement (Admin)
   */
  async adminValidate(userId, adminId, decision, reason = '') {
    console.log(`[GenderVerification] 👑 Validation admin pour user: ${userId} - Décision: ${decision}`);
    
    const updateData = {
      genderVerified: decision === 'approved',
      genderVerificationStatus: decision,
      genderVerificationAdminId: adminId,
      genderVerificationAdminDate: new Date(),
      genderVerificationAdminReason: reason,
    };
    
    if (decision === 'approved') {
      updateData.gender = 'female';
    }
    
    await User.findByIdAndUpdate(userId, updateData);
    
    return {
      success: true,
      decision,
      reason,
      userId,
      adminId,
    };
  },
  
  /**
   * Obtenir le statut de vérification
   */
  async getVerificationStatus(userId) {
    const user = await User.findById(userId).select(
      'genderVerified genderVerificationMethod genderVerificationStatus genderVerificationDate gender'
    );
    
    if (!user) {
      return { success: false, error: 'Utilisateur non trouvé' };
    }
    
    return {
      success: true,
      isVerified: user.genderVerified || false,
      method: user.genderVerificationMethod || null,
      status: user.genderVerificationStatus || 'not_started',
      verifiedAt: user.genderVerificationDate || null,
      gender: user.gender || null,
    };
  },
  
  /**
   * Obtenir les demandes en attente (Admin)
   */
  async getPendingVerifications(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    
    const users = await User.find({
      genderVerificationStatus: 'pending_admin',
    })
      .select('firstName lastName email phone genderVerificationMethod genderVerificationRequestDate')
      .sort({ genderVerificationRequestDate: 1 })
      .skip(skip)
      .limit(limit);
    
    const total = await User.countDocuments({ genderVerificationStatus: 'pending_admin' });
    
    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  },
  
  /**
   * Vérifier si un utilisateur peut accéder à l'app
   */
  async canAccessApp(userId) {
    const user = await User.findById(userId).select('genderVerified role');
    
    if (!user) {
      return { canAccess: false, reason: 'user_not_found' };
    }
    
    // Admin bypass
    if (user.role === 'admin') {
      return { canAccess: true, reason: 'admin_bypass' };
    }
    
    // Vérification genre requise
    if (!user.genderVerified) {
      return { canAccess: false, reason: 'gender_not_verified' };
    }
    
    return { canAccess: true, reason: 'verified' };
  },
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = genderVerificationService;
module.exports.VERIFICATION_CONFIG = VERIFICATION_CONFIG;
// ============================================================
// 📄 gdprService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('gdprService.js ▶ Module loaded')
//   • console.log('gdprService.js ▶ exportUserData() called')
// ============================================================

console.log('gdprService.js ▶ Module loaded');

const User = require('../models/User');
const Ride = require('../models/Ride');
const Payment = require('../models/Payment');
const Wallet = require('../models/Wallet');
const Consent = require('../models/Consent');
const BiometricData = require('../models/BiometricData');
const Rating = require('../models/Rating');
const Document = require('../models/Document');
const encryptionService = require('./encryptionService');

// ============================================================
// HELPERS
// ============================================================

/**
 * Génère un export JSON formaté
 */
function createExportJSON(data, exportedAt = new Date()) {
  console.log('gdprService.js ▶ createExportJSON() called');

  return {
    exportedAt: exportedAt.toISOString(),
    version: '1.0',
    dataCategories: Object.keys(data),
    data,
  };
}

// ============================================================
// MAIN SERVICE
// ============================================================

const gdprService = {
  /**
   * Exporte toutes les données personnelles d'un utilisateur
   */
  async exportUserData(userId) {
    console.log('gdprService.js ▶ exportUserData() called');

    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'user_not_found',
        };
      }

      // Collecter toutes les données
      const exportData = {};

      // 1. Profil utilisateur (données sensibles omises en partie)
      exportData.profile = {
        id: user._id,
        email: user.email,
        phone: user.phone,
        firstName: user.firstName,
        lastName: user.lastName,
        profilePicture: user.profilePicture,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        nationality: user.nationality,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // 2. Adresses stockées
      exportData.addresses = user.addresses || [];

      // 3. Documents
      const documents = await Document.find({ userId });
      exportData.documents = documents.map(d => ({
        id: d._id,
        type: d.documentType,
        isVerified: d.isVerified,
        uploadedAt: d.uploadedAt,
      }));

      // 4. Consentements
      const consent = await Consent.findOne({ userId });
      exportData.consents = consent ? consent.consents : [];

      // 5. Trajets (si passager)
      const rides = await Ride.find({ $or: [{ passengerId: userId }, { driverId: userId }] })
        .select('_id status pickupLocation destination fare createdAt completedAt');
      exportData.rides = rides;

      // 6. Paiements
      const payments = await Payment.find({ $or: [{ passengerId: userId }, { driverId: userId }] })
        .select('_id amount method status createdAt completedAt');
      exportData.payments = payments;

      // 7. Portefeuille
      const wallet = await Wallet.findOne({ userId });
      if (wallet) {
        exportData.wallet = {
          balance: wallet.balance,
          currency: wallet.currency,
          totalEarnings: wallet.totalEarnings,
          totalSpent: wallet.totalSpent,
          transactionCount: wallet.transactions.length,
        };
      }

      // 8. Évaluations
      const ratings = await Rating.find({ userId });
      exportData.ratings = ratings;

      // 9. Données biométriques (non incluses dans l'export - trop sensibles)
      const biometricData = await BiometricData.findOne({ userId });
      exportData.biometricData = {
        hasData: !!biometricData && !biometricData.isDeleted,
        capturedAt: biometricData?.capturedAt,
        expiresAt: biometricData?.expiresAt,
        note: 'Biometric embeddings are not included in this export for security reasons',
      };

      const exportedData = createExportJSON(exportData);

      console.log('gdprService.js ▶ User data exported successfully');

      return {
        success: true,
        data: exportedData,
        fileName: `user-data-export-${userId}-${Date.now()}.json`,
      };
    } catch (error) {
      console.error('gdprService.js ▶ exportUserData() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Supprime le compte utilisateur (GDPR Right to be Forgotten)
   */
  async deleteUserAccount(userId, reason = 'User request') {
    console.log('gdprService.js ▶ deleteUserAccount() called');

    try {
      const user = await User.findById(userId);

      if (!user) {
        return {
          success: false,
          error: 'user_not_found',
        };
      }

      // 1. Anonymiser les données personnelles
      user.email = `deleted-${userId}@gowithsally.local`;
      user.phone = null;
      user.firstName = 'Deleted';
      user.lastName = 'User';
      user.profilePicture = null;
      user.dateOfBirth = null;
      user.addresses = [];
      user.isDeleted = true;
      user.deletedAt = new Date();
      user.deletedReason = reason;

      await user.save();

      console.log('gdprService.js ▶ User data anonymized');

      // 2. Supprimer les données biométriques
      const biometricData = await BiometricData.findOne({ userId });
      if (biometricData) {
        await biometricData.delete('Account deletion');
      }

      // 3. Supprimer les consentements
      await Consent.deleteOne({ userId });

      // 4. Anonymiser les trajets
      await Ride.updateMany(
        { $or: [{ passengerId: userId }, { driverId: userId }] },
        {
          passengerName: 'Deleted User',
          driverName: 'Deleted User',
        }
      );

      // 5. Anonymiser les paiements
      await Payment.updateMany(
        { $or: [{ passengerId: userId }, { driverId: userId }] },
        {
          metadata: null,
        }
      );

      console.log('gdprService.js ▶ Account deleted successfully');

      return {
        success: true,
        message: 'Account and personal data have been deleted',
        userId,
        deletedAt: new Date(),
      };
    } catch (error) {
      console.error('gdprService.js ▶ deleteUserAccount() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Gère le consentement utilisateur
   */
  async manageConsent(userId, consents = {}) {
    console.log('gdprService.js ▶ manageConsent() called');

    try {
      let consent = await Consent.findOne({ userId });

      if (!consent) {
        consent = await Consent.createConsent(userId);
      }

      // Mettre à jour chaque consentement
      for (const [consentType, isGiven] of Object.entries(consents)) {
        if (isGiven) {
          await consent.giveConsent(consentType, {
            ip: null,
            userAgent: null,
          });
        } else {
          await consent.revokeConsent(consentType);
        }
      }

      await consent.save();

      console.log('gdprService.js ▶ Consent updated');

      return {
        success: true,
        consents: consent.consents,
      };
    } catch (error) {
      console.error('gdprService.js ▶ manageConsent() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère l'historique d'accès aux données de l'utilisateur
   */
  async getAccessHistory(userId) {
    console.log('gdprService.js ▶ getAccessHistory() called');

    try {
      const biometricData = await BiometricData.findOne({ userId });

      return {
        success: true,
        userId,
        biometricAccessLog: biometricData?.accessLog || [],
        lastAccessed: biometricData?.accessLog[0]?.accessedAt,
      };
    } catch (error) {
      console.error('gdprService.js ▶ getAccessHistory() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Rectifie les données personnelles
   */
  async rectifyUserData(userId, updates = {}) {
    console.log('gdprService.js ▶ rectifyUserData() called');

    try {
      // Blancheur des champs autorisés
      const allowedFields = [
        'firstName',
        'lastName',
        'dateOfBirth',
        'gender',
        'addresses',
        'profilePicture',
      ];

      const sanitizedUpdates = {};

      for (const field of allowedFields) {
        if (field in updates) {
          sanitizedUpdates[field] = updates[field];
        }
      }

      const user = await User.findByIdAndUpdate(userId, sanitizedUpdates, { new: true });

      if (!user) {
        return {
          success: false,
          error: 'user_not_found',
        };
      }

      console.log('gdprService.js ▶ User data rectified');

      return {
        success: true,
        user: {
          firstName: user.firstName,
          lastName: user.lastName,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
        },
      };
    } catch (error) {
      console.error('gdprService.js ▶ rectifyUserData() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Obtient la conformité GDPR et CNDP d'un utilisateur
   */
  async getComplianceStatus(userId) {
    console.log('gdprService.js ▶ getComplianceStatus() called');

    try {
      const user = await User.findById(userId);
      const consent = await Consent.findOne({ userId });
      const biometricData = await BiometricData.findOne({ userId });

      if (!user) {
        return {
          success: false,
          error: 'user_not_found',
        };
      }

      return {
        success: true,
        userId,
        gdpr: {
          canBeExported: true,
          canBeDeleted: true,
          canBeRectified: true,
          hasConsent: consent?.gdprOptIn || false,
        },
        cndp: {
          canBeExported: true,
          canBeDeleted: true,
          canBeRectified: true,
          hasConsent: consent?.cndpOptIn || false,
          biometricDataManaged: !!biometricData,
        },
        consents,
      };
    } catch (error) {
      console.error('gdprService.js ▶ getComplianceStatus() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = gdprService;

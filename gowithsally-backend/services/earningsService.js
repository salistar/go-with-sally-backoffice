// ============================================================
// 📄 earningsService.js — GoWithSally
// LOG SUMMARY:
//   • console.log('earningsService.js ▶ Module loaded')
//   • console.log('earningsService.js ▶ calculateDailyEarnings() called')
// ============================================================

console.log('earningsService.js ▶ Module loaded');

const Payment = require('../models/Payment');
const Ride = require('../models/Ride');
const Wallet = require('../models/Wallet');

// ============================================================
// CONFIGURATION
// ============================================================

const COMMISSION_RATES = {
  sally_eco: 0.12,      // 12%
  sally_standard: 0.15, // 15%
  sally_confort: 0.18,  // 18%
  sally_pool: 0.10,     // 10%
};

const WITHDRAWAL_CONFIG = {
  MIN_WITHDRAWAL: 100,      // MAD
  MAX_WITHDRAWAL: 50000,    // MAD
  PROCESSING_FEE_RATE: 0.02, // 2%
  MIN_PROCESSING_FEE: 5,    // MAD
};

// ============================================================
// HELPERS
// ============================================================

/**
 * Calcule la commission basée sur le type de service
 */
function calculateCommission(amount, serviceType = 'sally_standard') {
  console.log('earningsService.js ▶ calculateCommission() called');
  const rate = COMMISSION_RATES[serviceType] || COMMISSION_RATES.sally_standard;
  const commission = Math.round(amount * rate * 100) / 100;
  return {
    totalAmount: amount,
    commission,
    rate,
    driverEarnings: Math.round((amount - commission) * 100) / 100,
  };
}

/**
 * Obtient la plage de dates pour une période
 */
function getDateRange(period = 'day', referenceDate = new Date()) {
  console.log('earningsService.js ▶ getDateRange() called');

  const startDate = new Date(referenceDate);
  const endDate = new Date(referenceDate);

  if (period === 'day') {
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'week') {
    const dayOfWeek = startDate.getDay();
    const diff = startDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
  } else if (period === 'month') {
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59, 999);
  }

  return { startDate, endDate };
}

// ============================================================
// MAIN SERVICE
// ============================================================

const earningsService = {
  /**
   * Calcule les gains quotidiens d'un conducteur
   */
  async calculateDailyEarnings(driverId, date = new Date()) {
    console.log('earningsService.js ▶ calculateDailyEarnings() called');

    try {
      const { startDate, endDate } = getDateRange('day', date);

      const payments = await Payment.find({
        driverId,
        status: 'completed',
        completedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      }).populate('rideId');

      if (payments.length === 0) {
        return {
          success: true,
          driverId,
          period: 'day',
          date: date.toISOString().split('T')[0],
          totalEarnings: 0,
          grossRevenue: 0,
          commissions: 0,
          rides: 0,
          breakdown: [],
        };
      }

      let totalGrossRevenue = 0;
      let totalCommissions = 0;
      const breakdown = [];

      payments.forEach(payment => {
        const serviceType = payment.rideId?.serviceType || 'sally_standard';
        const commission = calculateCommission(payment.amount, serviceType);

        totalGrossRevenue += payment.amount;
        totalCommissions += commission.commission;

        breakdown.push({
          paymentId: payment._id,
          rideId: payment.rideId._id,
          amount: payment.amount,
          commission: commission.commission,
          earnings: commission.driverEarnings,
          serviceType,
          completedAt: payment.completedAt,
        });
      });

      return {
        success: true,
        driverId,
        period: 'day',
        date: date.toISOString().split('T')[0],
        totalEarnings: totalGrossRevenue - totalCommissions,
        grossRevenue: totalGrossRevenue,
        commissions: totalCommissions,
        rides: payments.length,
        breakdown,
      };
    } catch (error) {
      console.error('earningsService.js ▶ calculateDailyEarnings() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Calcule les gains hebdomadaires d'un conducteur
   */
  async calculateWeeklyEarnings(driverId, date = new Date()) {
    console.log('earningsService.js ▶ calculateWeeklyEarnings() called');

    try {
      const { startDate, endDate } = getDateRange('week', date);

      const payments = await Payment.find({
        driverId,
        status: 'completed',
        completedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      }).populate('rideId');

      let totalGrossRevenue = 0;
      let totalCommissions = 0;
      const dailyBreakdown = {};

      payments.forEach(payment => {
        const dayKey = payment.completedAt.toISOString().split('T')[0];
        const serviceType = payment.rideId?.serviceType || 'sally_standard';
        const commission = calculateCommission(payment.amount, serviceType);

        totalGrossRevenue += payment.amount;
        totalCommissions += commission.commission;

        if (!dailyBreakdown[dayKey]) {
          dailyBreakdown[dayKey] = {
            date: dayKey,
            revenue: 0,
            commissions: 0,
            rides: 0,
            earnings: 0,
          };
        }

        dailyBreakdown[dayKey].revenue += payment.amount;
        dailyBreakdown[dayKey].commissions += commission.commission;
        dailyBreakdown[dayKey].rides += 1;
        dailyBreakdown[dayKey].earnings = dailyBreakdown[dayKey].revenue - dailyBreakdown[dayKey].commissions;
      });

      return {
        success: true,
        driverId,
        period: 'week',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        totalEarnings: totalGrossRevenue - totalCommissions,
        grossRevenue: totalGrossRevenue,
        commissions: totalCommissions,
        rides: payments.length,
        avgPerDay: Math.round((totalGrossRevenue - totalCommissions) / 7 * 100) / 100,
        dailyBreakdown: Object.values(dailyBreakdown),
      };
    } catch (error) {
      console.error('earningsService.js ▶ calculateWeeklyEarnings() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Calcule les gains mensuels d'un conducteur
   */
  async calculateMonthlyEarnings(driverId, date = new Date()) {
    console.log('earningsService.js ▶ calculateMonthlyEarnings() called');

    try {
      const { startDate, endDate } = getDateRange('month', date);

      const payments = await Payment.find({
        driverId,
        status: 'completed',
        completedAt: {
          $gte: startDate,
          $lte: endDate,
        },
      }).populate('rideId');

      let totalGrossRevenue = 0;
      let totalCommissions = 0;
      const weeklyBreakdown = {};

      payments.forEach(payment => {
        const paymentDate = new Date(payment.completedAt);
        const weekStart = new Date(paymentDate);
        weekStart.setDate(weekStart.getDate() - paymentDate.getDay() + 1);
        const weekKey = weekStart.toISOString().split('T')[0];

        const serviceType = payment.rideId?.serviceType || 'sally_standard';
        const commission = calculateCommission(payment.amount, serviceType);

        totalGrossRevenue += payment.amount;
        totalCommissions += commission.commission;

        if (!weeklyBreakdown[weekKey]) {
          weeklyBreakdown[weekKey] = {
            week: weekKey,
            revenue: 0,
            commissions: 0,
            rides: 0,
            earnings: 0,
          };
        }

        weeklyBreakdown[weekKey].revenue += payment.amount;
        weeklyBreakdown[weekKey].commissions += commission.commission;
        weeklyBreakdown[weekKey].rides += 1;
        weeklyBreakdown[weekKey].earnings = weeklyBreakdown[weekKey].revenue - weeklyBreakdown[weekKey].commissions;
      });

      return {
        success: true,
        driverId,
        period: 'month',
        month: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        totalEarnings: totalGrossRevenue - totalCommissions,
        grossRevenue: totalGrossRevenue,
        commissions: totalCommissions,
        rides: payments.length,
        avgPerDay: Math.round((totalGrossRevenue - totalCommissions) / date.getDate() * 100) / 100,
        weeklyBreakdown: Object.values(weeklyBreakdown),
      };
    } catch (error) {
      console.error('earningsService.js ▶ calculateMonthlyEarnings() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère un résumé complet des gains
   */
  async getEarningsSummary(driverId) {
    console.log('earningsService.js ▶ getEarningsSummary() called');

    try {
      const today = new Date();
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      const [dailyResult, weeklyResult, monthlyResult] = await Promise.all([
        this.calculateDailyEarnings(driverId, today),
        this.calculateWeeklyEarnings(driverId, today),
        this.calculateMonthlyEarnings(driverId, lastMonth),
      ]);

      return {
        success: true,
        driverId,
        today: dailyResult.totalEarnings,
        thisWeek: weeklyResult.totalEarnings,
        thisMonth: monthlyResult.totalEarnings,
        allTime: await this.getAllTimeEarnings(driverId),
        details: {
          daily: dailyResult,
          weekly: weeklyResult,
          monthly: monthlyResult,
        },
      };
    } catch (error) {
      console.error('earningsService.js ▶ getEarningsSummary() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère les gains cumulatifs all-time
   */
  async getAllTimeEarnings(driverId) {
    console.log('earningsService.js ▶ getAllTimeEarnings() called');

    try {
      const payments = await Payment.find({
        driverId,
        status: 'completed',
      });

      let totalGrossRevenue = 0;
      let totalCommissions = 0;

      payments.forEach(payment => {
        const serviceType = payment.rideId?.serviceType || 'sally_standard';
        const commission = calculateCommission(payment.amount, serviceType);
        totalGrossRevenue += payment.amount;
        totalCommissions += commission.commission;
      });

      return Math.round((totalGrossRevenue - totalCommissions) * 100) / 100;
    } catch (error) {
      console.error('earningsService.js ▶ getAllTimeEarnings() error:', error.message);
      return 0;
    }
  },

  /**
   * Crée une demande de retrait
   */
  async requestWithdrawal(driverId, amount, ribDetails = {}) {
    console.log('earningsService.js ▶ requestWithdrawal() called');

    try {
      // Validation
      if (amount < WITHDRAWAL_CONFIG.MIN_WITHDRAWAL) {
        return {
          success: false,
          error: 'amount_too_low',
          message: `Minimum withdrawal is ${WITHDRAWAL_CONFIG.MIN_WITHDRAWAL} MAD`,
          minAmount: WITHDRAWAL_CONFIG.MIN_WITHDRAWAL,
        };
      }

      if (amount > WITHDRAWAL_CONFIG.MAX_WITHDRAWAL) {
        return {
          success: false,
          error: 'amount_too_high',
          message: `Maximum withdrawal is ${WITHDRAWAL_CONFIG.MAX_WITHDRAWAL} MAD`,
          maxAmount: WITHDRAWAL_CONFIG.MAX_WITHDRAWAL,
        };
      }

      // Récupérer les gains disponibles
      const allTimeEarnings = await this.getAllTimeEarnings(driverId);

      if (amount > allTimeEarnings) {
        return {
          success: false,
          error: 'insufficient_balance',
          message: 'Insufficient earnings balance',
          availableBalance: allTimeEarnings,
        };
      }

      // Calculer les frais de traitement
      const processingFee = Math.max(
        Math.round(amount * WITHDRAWAL_CONFIG.PROCESSING_FEE_RATE * 100) / 100,
        WITHDRAWAL_CONFIG.MIN_PROCESSING_FEE
      );

      const netAmount = amount - processingFee;

      // Créer la demande de retrait (enregistrer dans Wallet)
      const wallet = await Wallet.findOne({ userId: driverId });

      if (!wallet) {
        return {
          success: false,
          error: 'wallet_not_found',
        };
      }

      // Ajouter les détails de retrait
      wallet.transactions.push({
        type: 'debit',
        amount,
        description: `Withdrawal request - RIB ending in ${ribDetails.accountNumber?.slice(-4)}`,
        referenceId: `WD-${Date.now()}`,
        source: 'withdrawal',
        timestamp: new Date(),
      });

      wallet.withdrawalMethods = [
        {
          method: 'bank_transfer',
          isDefault: true,
          accountNumber: ribDetails.accountNumber,
          accountHolder: ribDetails.accountHolder,
        },
      ];

      await wallet.save();

      return {
        success: true,
        driverId,
        amount,
        processingFee,
        netAmount,
        status: 'pending',
        estimatedProcessing: '2-3 business days',
        ribDetails: {
          accountNumber: ribDetails.accountNumber?.replace(/./g, (m, i) => i < ribDetails.accountNumber.length - 4 ? '*' : m),
          accountHolder: ribDetails.accountHolder,
        },
      };
    } catch (error) {
      console.error('earningsService.js ▶ requestWithdrawal() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère l'historique des retraits
   */
  async getWithdrawalHistory(driverId, limit = 20) {
    console.log('earningsService.js ▶ getWithdrawalHistory() called');

    try {
      const wallet = await Wallet.findOne({ userId: driverId });

      if (!wallet) {
        return {
          success: false,
          error: 'wallet_not_found',
        };
      }

      const withdrawals = wallet.transactions
        .filter(t => t.source === 'withdrawal')
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, limit);

      return {
        success: true,
        driverId,
        withdrawals,
        total: withdrawals.length,
      };
    } catch (error) {
      console.error('earningsService.js ▶ getWithdrawalHistory() error:', error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },

  /**
   * Récupère la configuration des commissions
   */
  getCommissionConfig() {
    console.log('earningsService.js ▶ getCommissionConfig() called');
    return COMMISSION_RATES;
  },

  /**
   * Récupère la configuration des retraits
   */
  getWithdrawalConfig() {
    console.log('earningsService.js ▶ getWithdrawalConfig() called');
    return WITHDRAWAL_CONFIG;
  },
};

// ============================================================
// EXPORT
// ============================================================

module.exports = earningsService;

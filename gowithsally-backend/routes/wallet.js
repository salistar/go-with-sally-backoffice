/**
 * ============================================================================
 * GO WITH SALLY - WALLET ROUTES
 * ============================================================================
 * Routes pour le portefeuille utilisateur
 *
 * @module routes/wallet
 * @version 1.0.0
 * ============================================================================
 */

const express = require('express');
const router = express.Router();

let authenticate;
try {
  const mainAuth = require('../middleware/auth');
  authenticate = mainAuth.verifyToken || mainAuth.protect;
} catch (e) {
  const altAuth = require('../middleware/auth.middleware');
  authenticate = altAuth.protect || altAuth.authenticate;
}

/**
 * GET /api/wallet
 * Obtenir le solde du portefeuille
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const Wallet = require('../models/Wallet');
    let wallet = await Wallet.findOne({ userId: req.user._id });

    if (!wallet) {
      wallet = new Wallet({ userId: req.user._id });
      await wallet.save();
    }

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
        totalEarnings: wallet.totalEarnings,
        totalSpent: wallet.totalSpent
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/wallet/history
 * Obtenir l'historique des transactions
 */
router.get('/history', authenticate, async (req, res) => {
  try {
    const Wallet = require('../models/Wallet');
    const { limit = 50, page = 1 } = req.query;
    const skip = (page - 1) * limit;

    const wallet = await Wallet.findOne({ userId: req.user._id });

    if (!wallet) {
      return res.json({
        success: true,
        data: {
          transactions: [],
          total: 0
        }
      });
    }

    const transactions = wallet.transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      data: {
        transactions,
        total: wallet.transactions.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/topup
 * Recharger le portefeuille
 */
router.post('/topup', authenticate, async (req, res) => {
  try {
    const Wallet = require('../models/Wallet');
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Montant invalide'
      });
    }

    let wallet = await Wallet.findOne({ userId: req.user._id });

    if (!wallet) {
      wallet = new Wallet({ userId: req.user._id });
    }

    wallet.balance += amount;
    wallet.transactions.push({
      type: 'credit',
      amount,
      description: 'Recharge de portefeuille',
      source: 'topup',
      timestamp: new Date()
    });

    await wallet.save();

    res.json({
      success: true,
      message: 'Portefeuille rechargé',
      data: {
        newBalance: wallet.balance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * POST /api/wallet/withdraw
 * Retirer de l'argent du portefeuille
 */
router.post('/withdraw', authenticate, async (req, res) => {
  try {
    const Wallet = require('../models/Wallet');
    const { amount, withdrawalMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Montant invalide'
      });
    }

    let wallet = await Wallet.findOne({ userId: req.user._id });

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Portefeuille non trouvé'
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({
        success: false,
        message: 'Solde insuffisant'
      });
    }

    wallet.balance -= amount;
    wallet.transactions.push({
      type: 'debit',
      amount,
      description: 'Retrait de portefeuille',
      source: 'withdrawal',
      timestamp: new Date()
    });

    await wallet.save();

    res.json({
      success: true,
      message: 'Retrait effectué',
      data: {
        newBalance: wallet.balance
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;

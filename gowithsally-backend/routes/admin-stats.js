// ============================================================
// 📄 admin-stats.js — GoWithSally Backend Routes
// LOG SUMMARY:
//   • console.log('admin-stats.js ▶ Router loaded')
//   • Admin analytics and statistics endpoints
// ============================================================

console.log('📄 [admin-stats.js] ▶ Router loaded');

const express = require('express');

const router = express.Router();
const adminStatsController = require('../controllers/adminStatsController');
const { verifyToken } = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin.middleware');
const validateObjectId = require('../middleware/validateObjectId');

console.log('📄 [admin-stats.js] ▶ Dependencies loaded');

// ============================================================
// ADMIN MIDDLEWARE
// ============================================================

router.use(verifyToken, adminMiddleware.requireAdmin);

// ============================================================
// KPI & ANALYTICS ENDPOINTS
// ============================================================

/**
 * @route   GET /api/admin/stats/kpis
 * @desc    Get dashboard KPIs
 * @access  Private/Admin
 * @query   { dateRange?: 'today' | 'week' | 'month' | 'year' }
 */
router.get('/kpis', (req, res, next) => {
  console.log('📄 [admin-stats.js] ▶ GET /kpis');
  next();
}, adminStatsController.getDashboardKPIs);

/**
 * @route   GET /api/admin/stats/rides-by-day
 * @desc    Get rides by day chart data
 * @access  Private/Admin
 * @query   { days?: number (default: 30) }
 */
router.get('/rides-by-day', (req, res, next) => {
  console.log('📄 [admin-stats.js] ▶ GET /rides-by-day');
  next();
}, adminStatsController.getRidesByDay);

/**
 * @route   GET /api/admin/stats/revenue-by-month
 * @desc    Get revenue by month chart data
 * @access  Private/Admin
 * @query   { months?: number (default: 12) }
 */
router.get('/revenue-by-month', (req, res, next) => {
  console.log('📄 [admin-stats.js] ▶ GET /revenue-by-month');
  next();
}, adminStatsController.getRevenueByMonth);

/**
 * @route   GET /api/admin/stats/driver-metrics
 * @desc    Get driver performance metrics
 * @access  Private/Admin
 * @query   { limit?: number (default: 10) }
 */
router.get('/driver-metrics', (req, res, next) => {
  console.log('📄 [admin-stats.js] ▶ GET /driver-metrics');
  next();
}, adminStatsController.getDriverMetrics);

/**
 * @route   GET /api/admin/stats/user-demographics
 * @desc    Get user demographics breakdown
 * @access  Private/Admin
 */
router.get('/user-demographics', (req, res, next) => {
  console.log('📄 [admin-stats.js] ▶ GET /user-demographics');
  next();
}, adminStatsController.getUserDemographics);

/**
 * @route   GET /api/admin/stats/complaints
 * @desc    Get complaint statistics
 * @access  Private/Admin
 */
router.get('/complaints', (req, res, next) => {
  console.log('📄 [admin-stats.js] ▶ GET /complaints');
  next();
}, adminStatsController.getComplaintStats);

// ============================================================
// COMPLAINT MANAGEMENT ENDPOINTS
// ============================================================

/**
 * @route   GET /api/admin/complaints
 * @desc    Get all complaints with pagination
 * @access  Private/Admin
 * @query   {
 *            page?: number,
 *            limit?: number,
 *            status?: string,
 *            category?: string,
 *            severity?: string
 *          }
 */
router.get('/', (req, res, next) => {
  console.log('📄 [admin-stats.js] ▶ GET / (list complaints)');
  next();
}, adminStatsController.getComplaints);

/**
 * @route   GET /api/admin/complaints/:complaintId
 * @desc    Get single complaint details
 * @access  Private/Admin
 */
router.get(
  '/:complaintId',
  validateObjectId('complaintId'),
  (req, res, next) => {
    console.log('📄 [admin-stats.js] ▶ GET /:complaintId');
    next();
  },
  adminStatsController.getComplaintDetails
);

/**
 * @route   PUT /api/admin/complaints/:complaintId/assign
 * @desc    Assign complaint to admin
 * @access  Private/Admin
 * @body    { adminId: ObjectId }
 */
router.put(
  '/:complaintId/assign',
  validateObjectId('complaintId'),
  (req, res, next) => {
    console.log('📄 [admin-stats.js] ▶ PUT /:complaintId/assign');
    next();
  },
  adminStatsController.assignComplaint
);

/**
 * @route   PUT /api/admin/complaints/:complaintId/resolve
 * @desc    Resolve a complaint
 * @access  Private/Admin
 * @body    {
 *            resolution: string,
 *            resolutionType: string,
 *            notes?: string
 *          }
 */
router.put(
  '/:complaintId/resolve',
  validateObjectId('complaintId'),
  (req, res, next) => {
    console.log('📄 [admin-stats.js] ▶ PUT /:complaintId/resolve');
    next();
  },
  adminStatsController.resolveComplaint
);

console.log('📄 [admin-stats.js] ▶ All routes initialized');

module.exports = router;

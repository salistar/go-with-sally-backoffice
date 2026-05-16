// ============================================================
// 📄 adminStatsController.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('adminStatsController.js ▶ Module loaded')
//   • Admin stats and analytics endpoints
// ============================================================

console.log('📄 [adminStatsController.js] ▶ Module loaded');

const adminStatsService = require('../services/adminStatsService');
const Complaint = require('../models/Complaint');

/**
 * GET /admin/stats/kpis
 * Get dashboard KPIs
 */
exports.getDashboardKPIs = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ getDashboardKPIs() called');

  try {
    const { dateRange = 'today' } = req.query;
    const kpis = await adminStatsService.getDashboardKPIs(dateRange);

    return res.status(200).json({
      success: true,
      data: kpis,
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ getDashboardKPIs error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching KPIs',
      error: error.message,
    });
  }
};

/**
 * GET /admin/stats/rides-by-day
 * Get rides by day chart data
 */
exports.getRidesByDay = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ getRidesByDay() called');

  try {
    const { days = 30 } = req.query;
    const data = await adminStatsService.getRidesByDay(parseInt(days));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ getRidesByDay error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching rides by day',
      error: error.message,
    });
  }
};

/**
 * GET /admin/stats/revenue-by-month
 * Get revenue by month chart data
 */
exports.getRevenueByMonth = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ getRevenueByMonth() called');

  try {
    const { months = 12 } = req.query;
    const data = await adminStatsService.getRevenueByMonth(parseInt(months));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ getRevenueByMonth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching revenue by month',
      error: error.message,
    });
  }
};

/**
 * GET /admin/stats/driver-metrics
 * Get driver performance metrics
 */
exports.getDriverMetrics = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ getDriverMetrics() called');

  try {
    const { limit = 10 } = req.query;
    const data = await adminStatsService.getDriverMetrics(parseInt(limit));

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ getDriverMetrics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching driver metrics',
      error: error.message,
    });
  }
};

/**
 * GET /admin/stats/user-demographics
 * Get user demographics
 */
exports.getUserDemographics = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ getUserDemographics() called');

  try {
    const data = await adminStatsService.getUserDemographics();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ getUserDemographics error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching user demographics',
      error: error.message,
    });
  }
};

/**
 * GET /admin/stats/complaints
 * Get complaint statistics
 */
exports.getComplaintStats = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ getComplaintStats() called');

  try {
    const data = await adminStatsService.getComplaintStats();

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ getComplaintStats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching complaint stats',
      error: error.message,
    });
  }
};

/**
 * GET /admin/complaints
 * Get all complaints with pagination
 */
exports.getComplaints = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ getComplaints() called');

  try {
    const { page = 1, limit = 20, status, category, severity } = req.query;
    const skip = (page - 1) * limit;

    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (severity) query.severity = severity;

    const complaints = await Complaint.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Complaint.countDocuments(query);

    return res.status(200).json({
      success: true,
      data: complaints,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ getComplaints error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching complaints',
      error: error.message,
    });
  }
};

/**
 * GET /admin/complaints/:complaintId
 * Get single complaint details
 */
exports.getComplaintDetails = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ getComplaintDetails() called');

  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findById(complaintId)
      .populate('userId', 'firstName lastName email phone')
      .populate('againstUserId', 'firstName lastName')
      .populate('rideId')
      .populate('assignedTo', 'firstName lastName');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: complaint,
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ getComplaintDetails error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error fetching complaint details',
      error: error.message,
    });
  }
};

/**
 * PUT /admin/complaints/:complaintId/assign
 * Assign complaint to admin
 */
exports.assignComplaint = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ assignComplaint() called');

  try {
    const { complaintId } = req.params;
    const { adminId } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      complaintId,
      {
        assignedTo: adminId,
        status: 'in_review',
      },
      { new: true }
    ).populate('assignedTo', 'firstName lastName');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Complaint assigned successfully',
      data: complaint,
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ assignComplaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error assigning complaint',
      error: error.message,
    });
  }
};

/**
 * PUT /admin/complaints/:complaintId/resolve
 * Resolve a complaint
 */
exports.resolveComplaint = async (req, res) => {
  console.log('📄 [adminStatsController.js] ▶ resolveComplaint() called');

  try {
    const { complaintId } = req.params;
    const { resolution, resolutionType, notes } = req.body;

    const complaint = await Complaint.findById(complaintId);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    await complaint.resolve(resolution, resolutionType);

    if (notes) {
      await complaint.addInternalNote(req.user.id, notes);
    }

    return res.status(200).json({
      success: true,
      message: 'Complaint resolved successfully',
      data: complaint,
    });
  } catch (error) {
    console.error('adminStatsController.js ▶ resolveComplaint error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error resolving complaint',
      error: error.message,
    });
  }
};

console.log('📄 [adminStatsController.js] ▶ All exports initialized');

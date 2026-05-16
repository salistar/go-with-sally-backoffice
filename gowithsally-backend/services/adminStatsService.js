// ============================================================
// 📄 adminStatsService.js — GoWithSally Backend
// LOG SUMMARY:
//   • console.log('adminStatsService.js ▶ Module loaded')
//   • KPI calculation and analytics
// ============================================================

console.log('📄 [adminStatsService.js] ▶ Module loaded');

const User = require('../models/User');
const Driver = require('../models/Driver');
const Ride = require('../models/Ride');
const Complaint = require('../models/Complaint');
const Payment = require('../models/Wallet'); // assuming payment tracking in Wallet
const Rating = require('../models/Rating');

/**
 * Get dashboard KPIs
 */
const getDashboardKPIs = async (dateRange = 'today') => {
  console.log('📄 [adminStatsService.js] ▶ getDashboardKPIs() called');

  try {
    const dateFilter = getDateFilter(dateRange);

    const [
      totalUsers,
      totalDrivers,
      activeRides,
      totalRevenue,
      averageRating,
      openComplaints,
      newUsersCount,
      newDriversCount,
      completedRidesCount,
      totalPaymentsCount,
    ] = await Promise.all([
      User.countDocuments(),
      Driver.countDocuments({ status: 'approved' }),
      Ride.countDocuments({ status: { $in: ['searching', 'driver_assigned', 'in_progress'] } }),
      getTotalRevenue(dateFilter),
      getAverageRating(),
      Complaint.countDocuments({ status: { $ne: 'closed' } }),
      User.countDocuments({ createdAt: dateFilter }),
      Driver.countDocuments({ createdAt: dateFilter }),
      Ride.countDocuments({ status: 'completed', completedAt: dateFilter }),
      Ride.countDocuments({ status: 'completed', completedAt: dateFilter }),
    ]);

    return {
      totalUsers,
      totalDrivers,
      activeRides,
      totalRevenue,
      averageRating,
      openComplaints,
      newUsersCount,
      newDriversCount,
      completedRidesCount,
      totalPaymentsCount,
    };
  } catch (error) {
    console.error('adminStatsService.js ▶ getDashboardKPIs error:', error);
    throw error;
  }
};

/**
 * Get rides by day for chart
 */
const getRidesByDay = async (days = 30) => {
  console.log('📄 [adminStatsService.js] ▶ getRidesByDay() called');

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const ridesByDay = await Ride.aggregate([
      {
        $match: {
          completedAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
          },
          count: { $sum: 1 },
          revenue: { $sum: '$fare' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return ridesByDay;
  } catch (error) {
    console.error('adminStatsService.js ▶ getRidesByDay error:', error);
    throw error;
  }
};

/**
 * Get revenue by month
 */
const getRevenueByMonth = async (months = 12) => {
  console.log('📄 [adminStatsService.js] ▶ getRevenueByMonth() called');

  try {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const revenueByMonth = await Ride.aggregate([
      {
        $match: {
          completedAt: { $gte: startDate },
          status: 'completed',
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$completedAt' },
          },
          revenue: { $sum: '$fare' },
          rideCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return revenueByMonth;
  } catch (error) {
    console.error('adminStatsService.js ▶ getRevenueByMonth error:', error);
    throw error;
  }
};

/**
 * Get driver performance metrics
 */
const getDriverMetrics = async (limit = 10) => {
  console.log('📄 [adminStatsService.js] ▶ getDriverMetrics() called');

  try {
    const drivers = await Driver.aggregate([
      {
        $lookup: {
          from: 'rides',
          localField: '_id',
          foreignField: 'driverId',
          as: 'rides',
        },
      },
      {
        $lookup: {
          from: 'ratings',
          let: { driverId: '$_id' },
          pipeline: [
            { $match: { $expr: { $eq: ['$toUserId', '$$driverId'] } } },
          ],
          as: 'ratings',
        },
      },
      {
        $project: {
          name: { $concat: ['$user.firstName', ' ', '$user.lastName'] },
          totalRides: { $size: '$rides' },
          totalEarnings: {
            $sum: {
              $map: {
                input: '$rides',
                as: 'ride',
                in: '$$ride.fare',
              },
            },
          },
          averageRating: { $avg: '$ratings.stars' },
          completionRate: {
            $cond: [
              { $gt: [{ $size: '$rides' }, 0] },
              {
                $divide: [
                  {
                    $size: {
                      $filter: {
                        input: '$rides',
                        as: 'ride',
                        cond: { $eq: ['$$ride.status', 'completed'] },
                      },
                    },
                  },
                  { $size: '$rides' },
                ],
              },
              0,
            ],
          },
          status: 1,
        },
      },
      { $sort: { totalRides: -1 } },
      { $limit: limit },
    ]);

    return drivers;
  } catch (error) {
    console.error('adminStatsService.js ▶ getDriverMetrics error:', error);
    throw error;
  }
};

/**
 * Get user demographics
 */
const getUserDemographics = async () => {
  console.log('📄 [adminStatsService.js] ▶ getUserDemographics() called');

  try {
    const demographics = await User.aggregate([
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 },
        },
      },
    ]);

    const ageGroups = await User.aggregate([
      {
        $group: {
          _id: {
            $cond: [
              { $lt: ['$age', 25] },
              '18-24',
              {
                $cond: [
                  { $lt: ['$age', 35] },
                  '25-34',
                  {
                    $cond: [
                      { $lt: ['$age', 45] },
                      '35-44',
                      {
                        $cond: [
                          { $lt: ['$age', 55] },
                          '45-54',
                          '55+',
                        ],
                      },
                    ],
                  },
                ],
              },
            ],
          },
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      byGender: demographics,
      byAgeGroup: ageGroups,
    };
  } catch (error) {
    console.error('adminStatsService.js ▶ getUserDemographics error:', error);
    throw error;
  }
};

/**
 * Get complaint statistics
 */
const getComplaintStats = async () => {
  console.log('📄 [adminStatsService.js] ▶ getComplaintStats() called');

  try {
    const byCategory = await Complaint.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averageResolutionTime: {
            $avg: {
              $subtract: ['$resolvedAt', '$createdAt'],
            },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const bySeverity = await Complaint.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 },
        },
      },
    ]);

    const byStatus = await Complaint.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return {
      byCategory,
      bySeverity,
      byStatus,
      totalComplaints: (await Complaint.countDocuments()),
      avgResolutionTime: await getAverageResolutionTime(),
    };
  } catch (error) {
    console.error('adminStatsService.js ▶ getComplaintStats error:', error);
    throw error;
  }
};

/**
 * Helper: Get total revenue
 */
const getTotalRevenue = async (dateFilter) => {
  console.log('📄 [adminStatsService.js] ▶ getTotalRevenue() called');

  try {
    const result = await Ride.aggregate([
      {
        $match: {
          status: 'completed',
          ...(dateFilter && { completedAt: dateFilter }),
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$fare' },
        },
      },
    ]);

    return result.length > 0 ? result[0].total : 0;
  } catch (error) {
    console.error('adminStatsService.js ▶ getTotalRevenue error:', error);
    return 0;
  }
};

/**
 * Helper: Get average rating
 */
const getAverageRating = async () => {
  console.log('📄 [adminStatsService.js] ▶ getAverageRating() called');

  try {
    const result = await Rating.aggregate([
      {
        $group: {
          _id: null,
          average: { $avg: '$stars' },
        },
      },
    ]);

    return result.length > 0 ? result[0].average.toFixed(2) : 0;
  } catch (error) {
    console.error('adminStatsService.js ▶ getAverageRating error:', error);
    return 0;
  }
};

/**
 * Helper: Get average resolution time
 */
const getAverageResolutionTime = async () => {
  console.log('📄 [adminStatsService.js] ▶ getAverageResolutionTime() called');

  try {
    const result = await Complaint.getAverageResolutionTime();
    if (result.length > 0) {
      const milliseconds = result[0].averageTime;
      const days = Math.round(milliseconds / (1000 * 60 * 60 * 24));
      return days;
    }
    return 0;
  } catch (error) {
    console.error('adminStatsService.js ▶ getAverageResolutionTime error:', error);
    return 0;
  }
};

/**
 * Helper: Get date filter
 */
const getDateFilter = (dateRange) => {
  console.log('📄 [adminStatsService.js] ▶ getDateFilter() called');

  const now = new Date();
  let startDate;

  switch (dateRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      break;
    default:
      return null;
  }

  return { $gte: startDate };
};

module.exports = {
  getDashboardKPIs,
  getRidesByDay,
  getRevenueByMonth,
  getDriverMetrics,
  getUserDemographics,
  getComplaintStats,
};

Feature: Admin API Tests

  Background:
    * url apiUrl
    * def adminToken = karate.properties['adminToken']
    * def userToken = karate.properties['userToken']

  # ==================== DASHBOARD ====================

  Scenario: Get admin dashboard stats
    Given path 'admin/dashboard'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.stats contains {
      totalUsers: '#number',
      totalRides: '#number',
      totalRevenue: '#number',
      activeDrivers: '#number'
    }

  # ==================== USER MANAGEMENT ====================

  Scenario: List all users
    Given path 'admin/users'
    And header Authorization = 'Bearer ' + adminToken
    And param page = 1
    And param limit = 20
    When method get
    Then status 200
    And match response.success == true
    And match response.users == '#array'
    And match response.pagination.page == 1

  Scenario: Search users
    Given path 'admin/users'
    And header Authorization = 'Bearer ' + adminToken
    And param search = 'sara'
    When method get
    Then status 200
    And match response.users == '#array'

  Scenario: Get user details (admin)
    Given path 'admin/users'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    * def userId = response.users[0]._id

    Given path 'admin/users/' + userId
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.user.email == '#string'

  Scenario: Update user status (ban/activate)
    Given path 'admin/users'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    * def userId = response.users[0]._id

    Given path 'admin/users/' + userId + '/status'
    And header Authorization = 'Bearer ' + adminToken
    And request { status: 'active' }
    When method put
    Then status 200
    And match response.success == true

  # ==================== DRIVER MANAGEMENT ====================

  Scenario: List all drivers
    Given path 'admin/drivers'
    And header Authorization = 'Bearer ' + adminToken
    And param page = 1
    And param limit = 20
    When method get
    Then status 200
    And match response.success == true
    And match response.drivers == '#array'

  Scenario: Verify driver documents
    Given path 'admin/drivers'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    * def driverId = response.drivers[0]._id

    Given path 'admin/drivers/' + driverId + '/documents'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.documents == '#array'

  Scenario: Approve driver documents
    Given path 'admin/drivers'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    * def driverId = response.drivers[0]._id

    Given path 'admin/drivers/' + driverId + '/documents/approve'
    And header Authorization = 'Bearer ' + adminToken
    And request { documentType: 'license', status: 'approved' }
    When method post
    Then status 200
    And match response.success == true

  # ==================== RIDE MANAGEMENT ====================

  Scenario: List all rides
    Given path 'admin/rides'
    And header Authorization = 'Bearer ' + adminToken
    And param page = 1
    And param limit = 20
    When method get
    Then status 200
    And match response.success == true
    And match response.rides == '#array'

  Scenario: View ride details (admin)
    Given path 'admin/rides'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    * def rideId = response.rides[0]._id

    Given path 'admin/rides/' + rideId
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.ride._id == rideId

  Scenario: Cancel ride (admin)
    Given path 'admin/rides'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    * def rideId = response.rides[0]._id

    Given path 'admin/rides/' + rideId + '/cancel'
    And header Authorization = 'Bearer ' + adminToken
    And request { reason: 'Fraud detected' }
    When method post
    Then status 200
    And match response.success == true

  # ==================== SUPPORT TICKETS ====================

  Scenario: Get support tickets
    Given path 'admin/support/tickets'
    And header Authorization = 'Bearer ' + adminToken
    And param status = 'open'
    When method get
    Then status 200
    And match response.success == true
    And match response.tickets == '#array'

  Scenario: Resolve support ticket
    Given path 'admin/support/tickets'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    * def ticketId = response.tickets[0]._id

    Given path 'admin/support/tickets/' + ticketId + '/resolve'
    And header Authorization = 'Bearer ' + adminToken
    And request { resolution: 'Issue was resolved by refunding user' }
    When method post
    Then status 200
    And match response.success == true

  # ==================== ANALYTICS & REPORTS ====================

  Scenario: Get revenue report
    Given path 'admin/reports/revenue'
    And header Authorization = 'Bearer ' + adminToken
    And param startDate = '2024-01-01'
    And param endDate = '2024-03-17'
    When method get
    Then status 200
    And match response.success == true
    And match response.report contains {
      totalRevenue: '#number',
      period: '#string'
    }

  Scenario: Get user growth report
    Given path 'admin/reports/users'
    And header Authorization = 'Bearer ' + adminToken
    And param month = 3
    And param year = 2024
    When method get
    Then status 200
    And match response.success == true
    And match response.data == '#array'

  Scenario: Get driver performance analytics
    Given path 'admin/reports/drivers'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.analytics contains {
      averageRating: '#number',
      totalRides: '#number'
    }

  # ==================== PROMOTIONS MANAGEMENT ====================

  Scenario: Create promotion (admin)
    Given path 'admin/promotions'
    And header Authorization = 'Bearer ' + adminToken
    And request {
      code: 'ADMIN100',
      description: 'Admin test promo',
      discountType: 'percentage',
      discountValue: 10,
      validFrom: '2024-03-17',
      validUntil: '2024-03-24',
      maxUses: 100
    }
    When method post
    Then status 201
    And match response.success == true

  Scenario: List promotions (admin)
    Given path 'admin/promotions'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.promotions == '#array'

  # ==================== SYSTEM SETTINGS ====================

  Scenario: Get system settings
    Given path 'admin/settings'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.settings == '#object'

  Scenario: Update system settings
    Given path 'admin/settings'
    And header Authorization = 'Bearer ' + adminToken
    And request {
      commissionPercentage: 15,
      baseFare: 5,
      minRideDistance: 1
    }
    When method put
    Then status 200
    And match response.success == true

  # ==================== UNAUTHORIZED ACCESS ====================

  Scenario: Regular user cannot access admin endpoints
    Given path 'admin/users'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 403
    And match response.success == false
    And match response.success == true
    And match response.users == '#array'
    And match response.total == '#number'

  Scenario: Search Users
    Given path 'admin/users/search'
    And header Authorization = 'Bearer ' + adminToken
    And param query = 'user'
    When method get
    Then status 200
    And match response.success == true
    And match response.users == '#array'

  Scenario: Get User Details - Admin
    Given path 'admin/users/USER_ID'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.user.id == '#string'
    And match response.user.email == '#string'

  Scenario: Update User - Admin
    Given path 'admin/users/USER_ID'
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        status: 'ACTIVE',
        notes: 'User verified'
      }
      """
    When method put
    Then status 200
    And match response.success == true

  Scenario: Suspend User - Admin
    Given path 'admin/users/USER_ID/suspend'
    And header Authorization = 'Bearer ' + adminToken
    And request { reason: 'Violation of terms' }
    When method put
    Then status 200
    And match response.success == true

  Scenario: Unsuspend User - Admin
    Given path 'admin/users/USER_ID/unsuspend'
    And header Authorization = 'Bearer ' + adminToken
    When method put
    Then status 200
    And match response.success == true

  Scenario: Get All Rides - Admin
    Given path 'admin/rides'
    And header Authorization = 'Bearer ' + adminToken
    And param limit = 20
    And param offset = 0
    When method get
    Then status 200
    And match response.success == true
    And match response.rides == '#array'
    And match response.total == '#number'

  Scenario: Filter Rides by Status - Admin
    Given path 'admin/rides'
    And header Authorization = 'Bearer ' + adminToken
    And param status = 'COMPLETED'
    When method get
    Then status 200
    And match response.success == true
    And match response.rides == '#array'

  Scenario: Get Ride Details - Admin
    Given path 'admin/rides/RIDE_ID'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.ride.id == '#string'
    And match response.ride.passenger == '#object'
    And match response.ride.driver == '#object'

  Scenario: Get System Statistics
    Given path 'admin/statistics'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.stats.totalUsers == '#number'
    And match response.stats.totalDrivers == '#number'
    And match response.stats.totalRides == '#number'
    And match response.stats.totalEarnings == '#number'
    And match response.stats.averageRating == '#number'

  Scenario: Get Dashboard Metrics
    Given path 'admin/dashboard/metrics'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.metrics.dailyRides == '#number'
    And match response.metrics.dailyEarnings == '#number'
    And match response.metrics.pendingVerifications == '#number'

  Scenario: Get Reports
    Given path 'admin/reports'
    And header Authorization = 'Bearer ' + adminToken
    And param type = 'DAILY'
    And param startDate = '2024-01-01'
    And param endDate = '2024-01-31'
    When method get
    Then status 200
    And match response.success == true
    And match response.reports == '#array'

  Scenario: Create Report
    Given path 'admin/reports/create'
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        type: 'DAILY',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        format: 'PDF'
      }
      """
    When method post
    Then status 200
    And match response.success == true
    And match response.report.id == '#string'

  Scenario: Get System Settings
    Given path 'admin/settings'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.settings == '#object'

  Scenario: Update System Settings
    Given path 'admin/settings'
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        commissionRate: 0.20,
        minimumRideAmount: 5.00,
        maintenanceMode: false
      }
      """
    When method put
    Then status 200
    And match response.success == true

  Scenario: Get Support Tickets - Admin
    Given path 'admin/support/tickets'
    And header Authorization = 'Bearer ' + adminToken
    And param status = 'OPEN'
    When method get
    Then status 200
    And match response.success == true
    And match response.tickets == '#array'

  Scenario: Respond to Support Ticket
    Given path 'admin/support/tickets/TICKET_ID/respond'
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        response: 'Thank you for contacting us. We are looking into this matter.',
        status: 'IN_PROGRESS'
      }
      """
    When method post
    Then status 200
    And match response.success == true

  Scenario: Close Support Ticket
    Given path 'admin/support/tickets/TICKET_ID/close'
    And header Authorization = 'Bearer ' + adminToken
    And request { notes: 'Issue resolved' }
    When method put
    Then status 200
    And match response.success == true

  Scenario: Get Audit Logs
    Given path 'admin/audit-logs'
    And header Authorization = 'Bearer ' + adminToken
    And param limit = 50
    When method get
    Then status 200
    And match response.success == true
    And match response.logs == '#array'

  Scenario: Non-Admin Cannot Access Admin Endpoints
    # Get non-admin token
    * path 'auth/login'
    * request { email: '#(testUser.email)', password: '#(testUser.password)' }
    * method post
    * def userToken = response.token

    Given path 'admin/users'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 403
    And match response.success == false

  Scenario: Get Complaints - Admin
    Given path 'admin/complaints'
    And header Authorization = 'Bearer ' + adminToken
    And param status = 'OPEN'
    When method get
    Then status 200
    And match response.success == true
    And match response.complaints == '#array'

  Scenario: Resolve Complaint
    Given path 'admin/complaints/COMPLAINT_ID/resolve'
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        resolution: 'Refund issued to passenger',
        status: 'RESOLVED'
      }
      """
    When method put
    Then status 200
    And match response.success == true

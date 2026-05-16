Feature: Drivers API Tests

  Background:
    * url apiUrl
    * def driverToken = karate.properties['driverToken']
    * def userToken = karate.properties['userToken']
    * def adminToken = karate.properties['adminToken']

  # ==================== DRIVER PROFILE ====================

  Scenario: Get driver profile
    Given path 'drivers/profile'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.driver.email == 'fatima.driver@gmail.com'
    And match response.driver contains {
      firstName: '#string',
      lastName: '#string',
      phone: '#string',
      role: 'driver'
    }

  Scenario: Update driver profile
    Given path 'drivers/profile'
    And header Authorization = 'Bearer ' + driverToken
    And request {
      firstName: 'Fatima',
      lastName: 'Hassan',
      phone: '+212612345678'
    }
    When method put
    Then status 200
    And match response.success == true
    And match response.driver.firstName == 'Fatima'

  # ==================== DRIVER VEHICLE MANAGEMENT ====================

  Scenario: Get driver vehicles
    Given path 'drivers/vehicles'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.vehicles == '#array'

  Scenario: Add vehicle to driver
    Given path 'drivers/vehicles'
    And header Authorization = 'Bearer ' + driverToken
    And request {
      make: 'Toyota',
      model: 'Prius',
      year: 2022,
      licensePlate: 'ABC123DEF',
      color: 'Silver',
      capacity: 4,
      insuranceExpiry: '2024-12-31'
    }
    When method post
    Then status 201
    And match response.success == true
    And match response.vehicle contains { make: 'Toyota', model: 'Prius' }

  Scenario: Update vehicle details
    # First create a vehicle
    Given path 'drivers/vehicles'
    And header Authorization = 'Bearer ' + driverToken
    And request {
      make: 'Honda',
      model: 'Civic',
      year: 2021,
      licensePlate: 'XYZ789',
      color: 'Blue',
      capacity: 5
    }
    When method post
    Then status 201
    * def vehicleId = response.vehicle._id

    # Then update it
    Given path 'drivers/vehicles/' + vehicleId
    And header Authorization = 'Bearer ' + driverToken
    And request { color: 'Red' }
    When method put
    Then status 200
    And match response.vehicle.color == 'Red'

  # ==================== DRIVER AVAILABILITY ====================

  Scenario: Set driver online
    Given path 'drivers/status'
    And header Authorization = 'Bearer ' + driverToken
    And request { isOnline: true }
    When method post
    Then status 200
    And match response.success == true
    And match response.driver.isOnline == true

  Scenario: Set driver offline
    Given path 'drivers/status'
    And header Authorization = 'Bearer ' + driverToken
    And request { isOnline: false }
    When method post
    Then status 200
    And match response.success == true
    And match response.driver.isOnline == false

  # ==================== DRIVER LOCATION ====================

  Scenario: Update driver location
    Given path 'drivers/location'
    And header Authorization = 'Bearer ' + driverToken
    And request {
      latitude: 33.9716,
      longitude: -6.8498,
      heading: 45,
      speed: 60
    }
    When method post
    Then status 200
    And match response.success == true

  Scenario: Get nearby drivers (from user perspective)
    Given path 'drivers/nearby'
    And header Authorization = 'Bearer ' + userToken
    And param latitude = 33.9716
    And param longitude = -6.8498
    And param radius = 5
    When method get
    Then status 200
    And match response.success == true
    And match response.drivers == '#array'

  # ==================== DRIVER EARNINGS ====================

  Scenario: Get driver earnings
    Given path 'drivers/earnings'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.earnings contains {
      totalEarnings: '#number',
      completedRides: '#number',
      averageRating: '#number'
    }

  Scenario: Get daily earnings summary
    Given path 'drivers/earnings/daily'
    And header Authorization = 'Bearer ' + driverToken
    And param date = '2024-03-17'
    When method get
    Then status 200
    And match response.success == true
    And match response.dailyEarnings contains {
      date: '#string',
      earnings: '#number',
      rides: '#number'
    }

  Scenario: Get earnings by period
    Given path 'drivers/earnings/period'
    And header Authorization = 'Bearer ' + driverToken
    And param startDate = '2024-01-01'
    And param endDate = '2024-03-17'
    When method get
    Then status 200
    And match response.success == true
    And match response.earnings == '#array'

  # ==================== DRIVER RATINGS & REVIEWS ====================

  Scenario: Get driver ratings
    Given path 'drivers/ratings'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.ratings == '#array'
    And match response.averageRating == '#number'

  Scenario: Get driver reviews
    Given path 'drivers/reviews'
    And header Authorization = 'Bearer ' + driverToken
    And param page = 1
    And param limit = 10
    When method get
    Then status 200
    And match response.success == true
    And match response.reviews == '#array'

  # ==================== DRIVER DOCUMENTS ====================

  Scenario: Get driver documents
    Given path 'drivers/documents'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.documents == '#array'

  Scenario: Get document verification status
    Given path 'drivers/documents/status'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.verification contains {
      license: '#string',
      insurance: '#string',
      registration: '#string'
    }

  # ==================== DRIVER STATISTICS ====================

  Scenario: Get driver statistics
    Given path 'drivers/stats'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.stats contains {
      totalRides: '#number',
      completedRides: '#number',
      cancelledRides: '#number',
      totalDistance: '#number',
      acceptanceRate: '#number'
    }

  Scenario: Get driver performance metrics
    Given path 'drivers/performance'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.performance contains {
      rating: '#number',
      acceptanceRate: '#number',
      cancellationRate: '#number',
      completionRate: '#number'
    }

  # ==================== DRIVER ACTIVE RIDE ====================

  Scenario: Get driver's current ride
    Given path 'drivers/current-ride'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200 || status 204

  # ==================== DRIVER SEARCH (ADMIN) ====================

  Scenario: Search drivers (admin)
    Given path 'drivers'
    And header Authorization = 'Bearer ' + adminToken
    And param search = 'fatima'
    And param page = 1
    And param limit = 10
    When method get
    Then status 200
    And match response.success == true
    And match response.drivers == '#array'

  Scenario: Filter drivers by status
    Given path 'drivers'
    And header Authorization = 'Bearer ' + adminToken
    And param status = 'online'
    When method get
    Then status 200
    And match response.success == true

  # ==================== DRIVER BACKGROUND CHECK ====================

  Scenario: Get background check status
    Given path 'drivers/background-check'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.backgroundCheck contains {
      status: '#string',
      approvalDate: '#string?',
      expiryDate: '#string?'
    }

  # ==================== INVALID OPERATIONS ====================

  Scenario: User cannot access driver endpoints
    Given path 'drivers/profile'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 403

  Scenario: Invalid vehicle creation - missing fields
    Given path 'drivers/vehicles'
    And header Authorization = 'Bearer ' + driverToken
    And request { make: 'Toyota' }
    When method post
    Then status 400
    And match response.success == false
    * method post
    * def driverToken = response.token

    # Get admin token
    * path 'auth/login'
    * request { email: '#(testAdmin.email)', password: '#(testAdmin.password)' }
    * method post
    * def adminToken = response.token

  Scenario: Register as Driver
    Given path 'drivers/register'
    And request
      """
      {
        firstName: 'Fatima',
        lastName: 'Hassan',
        email: 'newdriver' + java.time.LocalDateTime.now().getSecond() + '@test.com',
        password: 'Driver@1234',
        phoneNumber: '+212612345678',
        dateOfBirth: '1990-01-15',
        licenseNumber: 'DL123456789',
        licenseExpiry: '2028-12-31',
        vehicleType: 'sedan',
        licensePlate: 'ABC-1234',
        vehicleColor: 'white',
        vehicleYear: 2022
      }
      """
    When method post
    Then status 201
    And match response.success == true
    And match response.driver.id == '#string'
    And match response.driver.status == 'PENDING_VERIFICATION'
    And match response.token == '#string'

  Scenario: Get Driver Profile
    Given path 'drivers/profile'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.driver.id == '#string'
    And match response.driver.email == '#string'
    And match response.driver.licenseNumber == '#string'
    And match response.driver.vehicleInfo == '#object'

  Scenario: Update Driver Profile
    Given path 'drivers/profile'
    And header Authorization = 'Bearer ' + driverToken
    And request
      """
      {
        phoneNumber: '+212612999999',
        vehicleColor: 'black',
        emergencyContact: {
          name: 'Contact Name',
          phone: '+212612888888'
        }
      }
      """
    When method put
    Then status 200
    And match response.success == true
    And match response.driver.phoneNumber == '+212612999999'

  Scenario: Upload Documents - License
    Given path 'drivers/documents/license'
    And header Authorization = 'Bearer ' + driverToken
    And multipart file document = { read: 'classpath:fixtures/license.jpg' }
    When method post
    Then status 200
    And match response.success == true
    And match response.document.type == 'LICENSE'

  Scenario: Upload Documents - Vehicle Registration
    Given path 'drivers/documents/vehicle-registration'
    And header Authorization = 'Bearer ' + driverToken
    And multipart file document = { read: 'classpath:fixtures/vehicle-reg.jpg' }
    When method post
    Then status 200
    And match response.success == true
    And match response.document.type == 'VEHICLE_REGISTRATION'

  Scenario: Upload Documents - Insurance
    Given path 'drivers/documents/insurance'
    And header Authorization = 'Bearer ' + driverToken
    And multipart file document = { read: 'classpath:fixtures/insurance.jpg' }
    When method post
    Then status 200
    And match response.success == true
    And match response.document.type == 'INSURANCE'

  Scenario: Get Driver Documents
    Given path 'drivers/documents'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.documents == '#array'

  Scenario: Get Driver Statistics
    Given path 'drivers/statistics'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.stats.totalRides == '#number'
    And match response.stats.totalEarnings == '#number'
    And match response.stats.averageRating == '#number'
    And match response.stats.acceptanceRate == '#number'

  Scenario: Get Driver Earnings
    Given path 'drivers/earnings'
    And header Authorization = 'Bearer ' + driverToken
    And param period = 'month'
    When method get
    Then status 200
    And match response.success == true
    And match response.earnings.total == '#number'
    And match response.earnings.breakdown == '#array'

  Scenario: Update Driver Status - Online
    Given path 'drivers/status'
    And header Authorization = 'Bearer ' + driverToken
    And request { status: 'ONLINE' }
    When method put
    Then status 200
    And match response.success == true
    And match response.driver.status == 'ONLINE'

  Scenario: Update Driver Status - Offline
    Given path 'drivers/status'
    And header Authorization = 'Bearer ' + driverToken
    And request { status: 'OFFLINE' }
    When method put
    Then status 200
    And match response.success == true
    And match response.driver.status == 'OFFLINE'

  Scenario: Set Driver Availability
    Given path 'drivers/availability'
    And header Authorization = 'Bearer ' + driverToken
    And request
      """
      {
        available: true,
        serviceType: 'economy'
      }
      """
    When method put
    Then status 200
    And match response.success == true

  Scenario: Get Driver Background Check Status
    Given path 'drivers/background-check'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.backgroundCheck.status == '#string'
    And match response.backgroundCheck.completionDate == '#string|null'

  Scenario: Admin Approve Driver
    Given path 'drivers/' + 'DRIVER_ID' + '/approve'
    And header Authorization = 'Bearer ' + adminToken
    And request { notes: 'All documents verified' }
    When method put
    Then status 200
    And match response.success == true
    And match response.driver.status == 'VERIFIED'

  Scenario: Admin Reject Driver
    Given path 'drivers/' + 'DRIVER_ID' + '/reject'
    And header Authorization = 'Bearer ' + adminToken
    And request { reason: 'Invalid documents provided' }
    When method put
    Then status 200
    And match response.success == true
    And match response.driver.status == 'REJECTED'

  Scenario: Admin Suspend Driver
    Given path 'drivers/' + 'DRIVER_ID' + '/suspend'
    And header Authorization = 'Bearer ' + adminToken
    And request { reason: 'Safety violation' }
    When method put
    Then status 200
    And match response.success == true

  Scenario: Get All Drivers - Admin Only
    Given path 'drivers'
    And header Authorization = 'Bearer ' + adminToken
    And param status = 'VERIFIED'
    And param limit = 20
    When method get
    Then status 200
    And match response.success == true
    And match response.drivers == '#array'
    And match response.total == '#number'

  Scenario: Get Driver Rating
    Given path 'drivers/rating'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.rating.average == '#number'
    And match response.rating.totalRatings == '#number'
    And match response.rating.breakdown == '#object'

  Scenario: Update Bank Account
    Given path 'drivers/bank-account'
    And header Authorization = 'Bearer ' + driverToken
    And request
      """
      {
        bankName: 'Bank Al Maghrib',
        accountHolderName: 'Driver Name',
        accountNumber: '1234567890',
        iban: 'MA21XXXX0000000000000000000'
      }
      """
    When method put
    Then status 200
    And match response.success == true

  Scenario: Get Pending Rides
    Given path 'drivers/pending-rides'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.rides == '#array'

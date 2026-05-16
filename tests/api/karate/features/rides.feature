Feature: Rides API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']
    * def adminToken = karate.properties['adminToken']
    * def pickupLat = 33.9716
    * def pickupLon = -6.8498
    * def dropoffLat = 33.5731
    * def dropoffLon = -7.5898

  # ==================== CREATE RIDE ====================

  Scenario: Create a new ride request
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)', address: 'Casablanca Center' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)', address: 'Marrakech Center' },
      rideType: 'standard',
      paymentMethod: 'cash'
    }
    When method post
    Then status 201
    And match response.success == true
    And match response.ride contains {
      status: 'requested',
      passengerId: '#string',
      pickupLocation: '#object',
      dropoffLocation: '#object'
    }
    * def rideId = response.ride._id

  Scenario: Create ride with scheduled time
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard',
      scheduledTime: '2024-03-18T14:30:00Z',
      paymentMethod: 'wallet'
    }
    When method post
    Then status 201
    And match response.ride.scheduledTime == '#string'

  # ==================== GET RIDE DETAILS ====================

  Scenario: Get ride details
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    Given path 'rides/' + rideId
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.ride._id == rideId
    And match response.ride contains {
      status: '#string',
      passengerId: '#string'
    }

  # ==================== RIDE STATUS UPDATES ====================

  Scenario: Get user's active rides
    Given path 'rides/active'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.rides == '#array'

  Scenario: Get user's ride history
    Given path 'rides/history'
    And header Authorization = 'Bearer ' + userToken
    And param page = 1
    And param limit = 10
    When method get
    Then status 200
    And match response.success == true
    And match response.rides == '#array'
    And match response.pagination contains { page: 1, limit: 10 }

  # ==================== ACCEPT/REJECT RIDE (DRIVER) ====================

  Scenario: Driver accepts ride
    # Create a ride first
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    # Driver accepts
    Given path 'rides/' + rideId + '/accept'
    And header Authorization = 'Bearer ' + driverToken
    When method post
    Then status 200
    And match response.success == true
    And match response.ride.status == 'accepted'
    And match response.ride.driverId == '#string'

  Scenario: Driver rejects ride
    # Create a ride first
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    # Driver rejects
    Given path 'rides/' + rideId + '/reject'
    And header Authorization = 'Bearer ' + driverToken
    And request { reason: 'Going offline' }
    When method post
    Then status 200
    And match response.success == true

  # ==================== RIDE CANCELLATION ====================

  Scenario: User cancels ride before driver arrival
    # Create a ride first
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    # User cancels
    Given path 'rides/' + rideId + '/cancel'
    And header Authorization = 'Bearer ' + userToken
    And request { reason: 'Found alternative transport' }
    When method post
    Then status 200
    And match response.success == true
    And match response.ride.status == 'cancelled'

  # ==================== RIDE COMPLETION ====================

  Scenario: Mark ride as started
    # This would require driver acceptance first
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    Given path 'rides/' + rideId + '/start'
    And header Authorization = 'Bearer ' + driverToken
    When method post
    Then status 200
    And match response.success == true
    And match response.ride.status == 'in_progress'

  Scenario: Mark ride as completed
    # Create and start a ride
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    Given path 'rides/' + rideId + '/complete'
    And header Authorization = 'Bearer ' + driverToken
    And request { actualDistance: 85.5, actualDuration: 95 }
    When method post
    Then status 200
    And match response.success == true
    And match response.ride.status == 'completed'

  # ==================== RIDE PRICING & ESTIMATES ====================

  Scenario: Get ride estimate
    Given path 'rides/estimate'
    And header Authorization = 'Bearer ' + userToken
    And param pickupLat = 33.9716
    And param pickupLon = -6.8498
    And param dropoffLat = 33.5731
    And param dropoffLon = -7.5898
    And param rideType = 'standard'
    When method get
    Then status 200
    And match response.success == true
    And match response.estimate contains {
      baseFare: '#number',
      distanceFare: '#number',
      timeFare: '#number',
      totalFare: '#number',
      estimatedDuration: '#number',
      estimatedDistance: '#number'
    }

  # ==================== RIDE FEEDBACK & RATINGS ====================

  Scenario: Rate a completed ride
    # Would need a completed ride
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    Given path 'rides/' + rideId + '/rate'
    And header Authorization = 'Bearer ' + userToken
    And request {
      rating: 5,
      comment: 'Great driver, clean car!',
      cleanliness: 5,
      communication: 5,
      driving: 5
    }
    When method post
    Then status 200
    And match response.success == true

  Scenario: Driver rates passenger
    # Would need a completed ride
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    Given path 'rides/' + rideId + '/driver-rate'
    And header Authorization = 'Bearer ' + driverToken
    And request {
      rating: 5,
      comment: 'Polite and on time!',
      behavior: 5,
      punctuality: 5
    }
    When method post
    Then status 200
    And match response.success == true

  # ==================== RIDER TRACKING ====================

  Scenario: Get driver location during ride
    # Create a ride
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    Given path 'rides/' + rideId + '/driver-location'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.location contains {
      latitude: '#number',
      longitude: '#number'
    }

  # ==================== RIDE FARE DETAILS ====================

  Scenario: Get ride fare breakdown
    Given path 'rides'
    And header Authorization = 'Bearer ' + userToken
    And request {
      pickupLocation: { latitude: '#(pickupLat)', longitude: '#(pickupLon)' },
      dropoffLocation: { latitude: '#(dropoffLat)', longitude: '#(dropoffLon)' },
      rideType: 'standard'
    }
    When method post
    Then status 201
    * def rideId = response.ride._id

    Given path 'rides/' + rideId + '/fare'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.fare contains {
      baseFare: '#number',
      distanceFare: '#number',
      timeFare: '#number',
      surgePricing: '#number?',
      totalFare: '#number'
    }

  # ==================== RIDE FILTERS & SEARCH ====================

  Scenario: Search rides by status (admin)
    Given path 'rides'
    And header Authorization = 'Bearer ' + adminToken
    And param status = 'completed'
    And param page = 1
    And param limit = 10
    When method get
    Then status 200
    And match response.success == true
    And match response.rides == '#array'

  # ==================== ERROR HANDLING ====================

  Scenario: Cannot get ride without authentication
    Given path 'rides/507f1f77bcf86cd799439011'
    When method get
    Then status 401

  Scenario: Get non-existent ride
    Given path 'rides/507f1f77bcf86cd799439011'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 404
    And match response.success == false
    * def testDriver = { email: 'driver@test.com', password: 'test1234' }

    # Get user token
    * path 'auth/login'
    * request { email: '#(testUser.email)', password: '#(testUser.password)' }
    * method post
    * def userToken = response.token

    # Get driver token
    * path 'auth/login'
    * request { email: '#(testDriver.email)', password: '#(testDriver.password)' }
    * method post
    * def driverToken = response.token

  Scenario: Create Ride Request
    Given path 'rides/request'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        pickupLocation: {
          latitude: 33.9716,
          longitude: -6.8498,
          address: 'Casablanca, Morocco'
        },
        dropoffLocation: {
          latitude: 33.5731,
          longitude: -7.5898,
          address: 'Marrakech, Morocco'
        },
        rideType: 'economy',
        phoneNumber: '+212612345678'
      }
      """
    When method post
    Then status 201
    And match response.success == true
    And match response.ride.id == '#string'
    And match response.ride.status == 'WAITING_FOR_DRIVER'
    And match response.ride.rideType == 'economy'
    * def rideId = response.ride.id

  Scenario: Request with Invalid Location
    Given path 'rides/request'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        pickupLocation: null,
        dropoffLocation: {
          latitude: 33.5731,
          longitude: -7.5898,
          address: 'Marrakech, Morocco'
        }
      }
      """
    When method post
    Then status 400
    And match response.success == false

  Scenario: Find Available Drivers
    Given path 'rides/find-drivers'
    And header Authorization = 'Bearer ' + userToken
    And param latitude = 33.9716
    And param longitude = -6.8498
    And param radius = 5
    When method get
    Then status 200
    And match response.success == true
    And match response.drivers == '#array'

  Scenario: Accept Ride by Driver
    # First create a ride
    Given path 'rides/request'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        pickupLocation: {
          latitude: 33.9716,
          longitude: -6.8498,
          address: 'Casablanca, Morocco'
        },
        dropoffLocation: {
          latitude: 33.5731,
          longitude: -7.5898,
          address: 'Marrakech, Morocco'
        },
        rideType: 'economy'
      }
      """
    When method post
    * def rideId = response.ride.id

    # Driver accepts the ride
    Given path 'rides/' + rideId + '/accept'
    And header Authorization = 'Bearer ' + driverToken
    When method put
    Then status 200
    And match response.success == true
    And match response.ride.status == 'DRIVER_ACCEPTED'

  Scenario: Start Ride
    # Create and accept ride
    Given path 'rides/request'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        pickupLocation: {
          latitude: 33.9716,
          longitude: -6.8498,
          address: 'Casablanca, Morocco'
        },
        dropoffLocation: {
          latitude: 33.5731,
          longitude: -7.5898,
          address: 'Marrakech, Morocco'
        }
      }
      """
    When method post
    * def rideId = response.ride.id

    Given path 'rides/' + rideId + '/accept'
    And header Authorization = 'Bearer ' + driverToken
    When method put

    # Start ride
    Given path 'rides/' + rideId + '/start'
    And header Authorization = 'Bearer ' + driverToken
    When method put
    Then status 200
    And match response.ride.status == 'IN_PROGRESS'

  Scenario: Complete Ride
    # Create and accept ride
    Given path 'rides/request'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        pickupLocation: {
          latitude: 33.9716,
          longitude: -6.8498,
          address: 'Casablanca, Morocco'
        },
        dropoffLocation: {
          latitude: 33.5731,
          longitude: -7.5898,
          address: 'Marrakech, Morocco'
        }
      }
      """
    When method post
    * def rideId = response.ride.id

    Given path 'rides/' + rideId + '/accept'
    And header Authorization = 'Bearer ' + driverToken
    When method put

    Given path 'rides/' + rideId + '/start'
    And header Authorization = 'Bearer ' + driverToken
    When method put

    # Complete ride
    Given path 'rides/' + rideId + '/complete'
    And header Authorization = 'Bearer ' + driverToken
    And request
      """
      {
        finalLocation: {
          latitude: 33.5731,
          longitude: -7.5898
        },
        fare: 150.00
      }
      """
    When method put
    Then status 200
    And match response.ride.status == 'COMPLETED'
    And match response.ride.fare == 150.00

  Scenario: Cancel Ride by Passenger
    # Create ride
    Given path 'rides/request'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        pickupLocation: {
          latitude: 33.9716,
          longitude: -6.8498,
          address: 'Casablanca, Morocco'
        },
        dropoffLocation: {
          latitude: 33.5731,
          longitude: -7.5898,
          address: 'Marrakech, Morocco'
        }
      }
      """
    When method post
    * def rideId = response.ride.id

    # Cancel ride
    Given path 'rides/' + rideId + '/cancel'
    And header Authorization = 'Bearer ' + userToken
    When method put
    Then status 200
    And match response.ride.status == 'CANCELLED'

  Scenario: Get Ride Details
    # Create ride
    Given path 'rides/request'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        pickupLocation: {
          latitude: 33.9716,
          longitude: -6.8498,
          address: 'Casablanca, Morocco'
        },
        dropoffLocation: {
          latitude: 33.5731,
          longitude: -7.5898,
          address: 'Marrakech, Morocco'
        }
      }
      """
    When method post
    * def rideId = response.ride.id

    # Get ride details
    Given path 'rides/' + rideId
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.ride.id == rideId
    And match response.ride.pickupLocation == '#object'
    And match response.ride.dropoffLocation == '#object'

  Scenario: Get User Ride History
    Given path 'rides/history'
    And header Authorization = 'Bearer ' + userToken
    And param limit = 10
    And param offset = 0
    When method get
    Then status 200
    And match response.success == true
    And match response.rides == '#array'
    And match response.total == '#number'

  Scenario: Rate Ride
    # Create, accept, and complete ride
    Given path 'rides/request'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        pickupLocation: {
          latitude: 33.9716,
          longitude: -6.8498,
          address: 'Casablanca, Morocco'
        },
        dropoffLocation: {
          latitude: 33.5731,
          longitude: -7.5898,
          address: 'Marrakech, Morocco'
        }
      }
      """
    When method post
    * def rideId = response.ride.id

    Given path 'rides/' + rideId + '/accept'
    And header Authorization = 'Bearer ' + driverToken
    When method put

    Given path 'rides/' + rideId + '/start'
    And header Authorization = 'Bearer ' + driverToken
    When method put

    Given path 'rides/' + rideId + '/complete'
    And header Authorization = 'Bearer ' + driverToken
    And request { finalLocation: { latitude: 33.5731, longitude: -7.5898 }, fare: 150.00 }
    When method put

    # Rate the ride
    Given path 'rides/' + rideId + '/rate'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        rating: 5,
        comment: 'Great ride, very safe and comfortable',
        categories: { safety: 5, cleanliness: 5, professionalism: 5 }
      }
      """
    When method post
    Then status 200
    And match response.success == true
    And match response.ride.rating == 5

  Scenario: Update Driver Location
    Given path 'rides/location/update'
    And header Authorization = 'Bearer ' + driverToken
    And request
      """
      {
        latitude: 33.9716,
        longitude: -6.8498
      }
      """
    When method post
    Then status 200
    And match response.success == true

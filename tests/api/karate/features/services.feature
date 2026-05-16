Feature: Services API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']
    * def adminToken = karate.properties['adminToken']

  # ==================== LIST SERVICES ====================

  Scenario: Get available ride services
    Given path 'services'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.services == '#array'
    And match response.services[0] contains {
      id: '#string',
      name: '#string',
      baseFare: '#number',
      perKmRate: '#number',
      perMinRate: '#number'
    }

  Scenario: Get service details
    Given path 'services'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def serviceId = response.services[0].id

    Given path 'services/' + serviceId
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.service contains {
      id: '#string',
      name: '#string',
      description: '#string'
    }

  Scenario: Filter services by category
    Given path 'services'
    And header Authorization = 'Bearer ' + userToken
    And param category = 'standard'
    When method get
    Then status 200
    And match response.success == true
    And match response.services == '#array'

  # ==================== SERVICE PRICING ====================

  Scenario: Get pricing for service
    Given path 'services/pricing'
    And header Authorization = 'Bearer ' + userToken
    And param serviceId = 'standard'
    And param distance = 10
    And param duration = 20
    When method get
    Then status 200
    And match response.success == true
    And match response.pricing contains {
      baseFare: '#number',
      distanceFare: '#number',
      timeFare: '#number',
      totalFare: '#number'
    }

  # ==================== ESTIMATE ====================

  Scenario: Get service estimate for route
    Given path 'services/estimate'
    And header Authorization = 'Bearer ' + userToken
    And param pickupLat = 33.9716
    And param pickupLon = -6.8498
    And param dropoffLat = 33.5731
    And param dropoffLon = -7.5898
    And param serviceId = 'standard'
    When method get
    Then status 200
    And match response.success == true
    And match response.estimate contains {
      distance: '#number',
      duration: '#number',
      fare: '#number'
    }

  # ==================== SERVICE DETAILS ====================

  Scenario: Get service capacity details
    Given path 'services/standard'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.service.capacity == '#number'

  Scenario: Get service with surge pricing
    Given path 'services'
    And header Authorization = 'Bearer ' + userToken
    And param includeSurge = true
    When method get
    Then status 200
    And match response.success == true

  # ==================== SERVICE AVAILABILITY ====================

  Scenario: Check service availability at location
    Given path 'services/available'
    And header Authorization = 'Bearer ' + userToken
    And param latitude = 33.9716
    And param longitude = -6.8498
    When method get
    Then status 200
    And match response.success == true
    And match response.available == '#boolean'

  # ==================== SERVICE REQUIREMENTS ====================

  Scenario: Get minimum ratings requirement for premium service
    Given path 'services/requirements'
    And header Authorization = 'Bearer ' + userToken
    And param serviceId = 'premium'
    When method get
    Then status 200
    And match response.success == true
    And match response.requirements contains {
      minimumRating: '#number?'
    }

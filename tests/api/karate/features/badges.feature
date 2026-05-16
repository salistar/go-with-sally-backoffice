Feature: Badges & Achievements API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']

  # ==================== LIST BADGES ====================

  Scenario: Get all available badges
    Given path 'badges'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.badges == '#array'
    And match response.badges[0] contains {
      id: '#string',
      name: '#string',
      description: '#string',
      icon: '#string'
    }

  Scenario: Get user badges
    Given path 'badges/user'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.badges == '#array'

  Scenario: Get driver badges
    Given path 'badges/driver'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.badges == '#array'

  # ==================== BADGE DETAILS ====================

  Scenario: Get badge details
    Given path 'badges'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def badgeId = response.badges[0].id

    Given path 'badges/' + badgeId
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.badge contains {
      name: '#string',
      description: '#string',
      requirements: '#array'
    }

  # ==================== BADGE PROGRESS ====================

  Scenario: Get badge progress for user
    Given path 'badges/progress'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.progress == '#array'

  Scenario: Get specific badge progress
    Given path 'badges'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def badgeId = response.badges[0].id

    Given path 'badges/' + badgeId + '/progress'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.progress contains {
      completed: '#boolean',
      percentage: '#number?'
    }

  # ==================== BADGE CATEGORIES ====================

  Scenario: Get badges by category
    Given path 'badges'
    And header Authorization = 'Bearer ' + userToken
    And param category = 'safety'
    When method get
    Then status 200
    And match response.badges == '#array'

  Scenario: Get ride-related badges
    Given path 'badges'
    And header Authorization = 'Bearer ' + userToken
    And param category = 'rides'
    When method get
    Then status 200
    And match response.badges == '#array'

  # ==================== LEADERBOARD ====================

  Scenario: Get users by badges
    Given path 'badges/leaderboard'
    And header Authorization = 'Bearer ' + userToken
    And param type = 'user'
    And param limit = 10
    When method get
    Then status 200
    And match response.success == true
    And match response.users == '#array'

  Scenario: Get drivers by badges
    Given path 'badges/leaderboard'
    And header Authorization = 'Bearer ' + userToken
    And param type = 'driver'
    When method get
    Then status 200
    And match response.drivers == '#array'

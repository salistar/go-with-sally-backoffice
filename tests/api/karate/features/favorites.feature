Feature: Favorites & Places API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']

  # ==================== ADD FAVORITE ====================

  Scenario: Save favorite place
    Given path 'favorites'
    And header Authorization = 'Bearer ' + userToken
    And request {
      label: 'Home',
      latitude: 33.9716,
      longitude: -6.8498,
      address: 'My Home Address'
    }
    When method post
    Then status 201
    And match response.success == true
    And match response.favorite contains {
      label: 'Home',
      latitude: 33.9716,
      longitude: -6.8498
    }
    * def favoriteId = response.favorite._id

  Scenario: Save work address as favorite
    Given path 'favorites'
    And header Authorization = 'Bearer ' + userToken
    And request {
      label: 'Work',
      latitude: 33.5731,
      longitude: -7.5898,
      address: 'My Office Address'
    }
    When method post
    Then status 201
    And match response.favorite.label == 'Work'

  # ==================== LIST FAVORITES ====================

  Scenario: Get user favorites
    Given path 'favorites'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.favorites == '#array'

  Scenario: Get favorites with pagination
    Given path 'favorites'
    And header Authorization = 'Bearer ' + userToken
    And param page = 1
    And param limit = 10
    When method get
    Then status 200
    And match response.pagination.page == 1
    And match response.pagination.limit == 10

  # ==================== UPDATE FAVORITE ====================

  Scenario: Update favorite place
    Given path 'favorites'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def favoriteId = response.favorites[0]._id

    Given path 'favorites/' + favoriteId
    And header Authorization = 'Bearer ' + userToken
    And request { label: 'Home (Updated)' }
    When method put
    Then status 200
    And match response.success == true
    And match response.favorite.label == 'Home (Updated)'

  # ==================== DELETE FAVORITE ====================

  Scenario: Delete favorite place
    Given path 'favorites'
    And header Authorization = 'Bearer ' + userToken
    And request {
      label: 'Temporary',
      latitude: 33.9716,
      longitude: -6.8498
    }
    When method post
    Then status 201
    * def favoriteId = response.favorite._id

    Given path 'favorites/' + favoriteId
    And header Authorization = 'Bearer ' + userToken
    When method delete
    Then status 200
    And match response.success == true

  # ==================== FAVORITE USAGE ====================

  Scenario: Quick request from favorite
    Given path 'favorites'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def favoriteId = response.favorites[0]._id

    Given path 'favorites/' + favoriteId + '/quick-ride'
    And header Authorization = 'Bearer ' + userToken
    And request {
      dropoffLatitude: 33.5731,
      dropoffLongitude: -7.5898,
      rideType: 'standard'
    }
    When method post
    Then status 201
    And match response.ride._id == '#string'

  # ==================== RECENT LOCATIONS ====================

  Scenario: Get recent locations
    Given path 'favorites/recent'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.locations == '#array'

  # ==================== SUGGESTION PLACES ====================

  Scenario: Get place suggestions
    Given path 'favorites/suggestions'
    And header Authorization = 'Bearer ' + userToken
    And param latitude = 33.9716
    And param longitude = -6.8498
    And param radius = 5
    When method get
    Then status 200
    And match response.success == true
    And match response.suggestions == '#array'

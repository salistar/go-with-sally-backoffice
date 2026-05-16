Feature: Reviews & Ratings API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']
    * def adminToken = karate.properties['adminToken']

  # ==================== CREATE REVIEW ====================

  Scenario: User leaves review for driver
    Given path 'reviews'
    And header Authorization = 'Bearer ' + userToken
    And request {
      rideId: '507f1f77bcf86cd799439011',
      targetId: '507f1f77bcf86cd799439012',
      targetType: 'driver',
      rating: 5,
      comment: 'Excellent service!',
      categories: {
        cleanliness: 5,
        communication: 5,
        driving: 5
      }
    }
    When method post
    Then status 201
    And match response.success == true
    And match response.review.rating == 5

  Scenario: Driver leaves review for passenger
    Given path 'reviews'
    And header Authorization = 'Bearer ' + driverToken
    And request {
      rideId: '507f1f77bcf86cd799439011',
      targetId: '507f1f77bcf86cd799439013',
      targetType: 'passenger',
      rating: 4,
      comment: 'Very polite passenger'
    }
    When method post
    Then status 201
    And match response.review.targetType == 'passenger'

  # ==================== GET REVIEWS ====================

  Scenario: Get driver reviews
    Given path 'reviews/driver/507f1f77bcf86cd799439011'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.reviews == '#array'
    And match response.averageRating == '#number'

  Scenario: Get user reviews with pagination
    Given path 'reviews/user/507f1f77bcf86cd799439011'
    And header Authorization = 'Bearer ' + userToken
    And param page = 1
    And param limit = 10
    When method get
    Then status 200
    And match response.reviews == '#array'
    And match response.pagination.page == 1

  # ==================== MY REVIEWS ====================

  Scenario: Get my reviews given
    Given path 'reviews/my'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.reviews == '#array'

  # ==================== UPDATE REVIEW ====================

  Scenario: Update review
    Given path 'reviews'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def reviewId = response.reviews[0]._id

    Given path 'reviews/' + reviewId
    And header Authorization = 'Bearer ' + userToken
    And request { rating: 4, comment: 'Updated review' }
    When method put
    Then status 200
    And match response.success == true
    And match response.review.comment == 'Updated review'

  # ==================== DELETE REVIEW ====================

  Scenario: Delete review
    Given path 'reviews'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def reviewId = response.reviews[0]._id

    Given path 'reviews/' + reviewId
    And header Authorization = 'Bearer ' + userToken
    When method delete
    Then status 200
    And match response.success == true

  # ==================== REVIEW STATS ====================

  Scenario: Get rating statistics
    Given path 'reviews/stats'
    And header Authorization = 'Bearer ' + userToken
    And param userId = '507f1f77bcf86cd799439011'
    When method get
    Then status 200
    And match response.success == true
    And match response.stats contains {
      averageRating: '#number',
      totalReviews: '#number',
      ratingDistribution: '#object'
    }

  # ==================== HELPFUL REVIEW ====================

  Scenario: Mark review as helpful
    Given path 'reviews'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def reviewId = response.reviews[0]._id

    Given path 'reviews/' + reviewId + '/helpful'
    And header Authorization = 'Bearer ' + userToken
    When method post
    Then status 200
    And match response.success == true

  # ==================== FILTERED REVIEWS ====================

  Scenario: Get high-rated reviews
    Given path 'reviews'
    And header Authorization = 'Bearer ' + userToken
    And param minRating = 4
    When method get
    Then status 200
    And match response.reviews == '#array'

  Scenario: Search reviews by comment
    Given path 'reviews/search'
    And header Authorization = 'Bearer ' + userToken
    And param query = 'clean car'
    When method get
    Then status 200
    And match response.results == '#array'

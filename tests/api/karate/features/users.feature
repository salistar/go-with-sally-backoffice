Feature: Users API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']
    * def adminToken = karate.properties['adminToken']

  # ==================== GET USER PROFILE ====================

  Scenario: Get current user profile
    Given path 'users/profile'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.user.email == 'sara.user@gmail.com'
    And match response.user contains { firstName: '#string', lastName: '#string', phone: '#string', role: 'user' }

  Scenario: Get user profile without authentication
    Given path 'users/profile'
    When method get
    Then status 401

  # ==================== UPDATE USER PROFILE ====================

  Scenario: Update user first name
    * def newFirstName = 'Sarah'
    Given path 'users/profile'
    And header Authorization = 'Bearer ' + userToken
    And request { firstName: '#(newFirstName)' }
    When method put
    Then status 200
    And match response.success == true
    And match response.user.firstName == newFirstName

  Scenario: Update user last name and phone
    * def newLastName = 'Johnson'
    * def newPhone = '+212612345678'
    Given path 'users/profile'
    And header Authorization = 'Bearer ' + userToken
    And request { lastName: '#(newLastName)', phone: '#(newPhone)' }
    When method put
    Then status 200
    And match response.success == true
    And match response.user.lastName == newLastName
    And match response.user.phone == newPhone

  Scenario: Update user with invalid email format
    Given path 'users/profile'
    And header Authorization = 'Bearer ' + userToken
    And request { email: 'invalid-email' }
    When method put
    Then status 400
    And match response.success == false

  # ==================== USER PREFERENCES/SETTINGS ====================

  Scenario: Get user settings
    Given path 'users/settings'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.settings contains {
        notificationsEnabled: '#boolean',
        preferredLanguage: '#string'
      }

  Scenario: Update user settings
    Given path 'users/settings'
    And header Authorization = 'Bearer ' + userToken
    And request {
      notificationsEnabled: false,
      preferredLanguage: 'ar',
      musicEnabled: true
    }
    When method put
    Then status 200
    And match response.success == true
    And match response.settings.preferredLanguage == 'ar'

  # ==================== USER DOCUMENT VERIFICATION ====================

  Scenario: Get user verification status
    Given path 'users/verification-status'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.verification contains {
      email: '#boolean',
      phone: '#boolean',
      identity: '#boolean'
    }

  # ==================== USER STATS/HISTORY ====================

  Scenario: Get user ride statistics
    Given path 'users/stats'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.stats contains {
      totalRides: '#number',
      totalDistance: '#number',
      averageRating: '#number'
    }

  # ==================== AVATAR/PROFILE PICTURE ====================

  Scenario: Get user avatar
    Given path 'users/profile'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.user.avatar == '#string?'

  # ==================== USER PREFERENCES ====================

  Scenario: Get user preferred routes
    Given path 'users/preferences'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.preferences == '#array'

  Scenario: Add preferred route
    Given path 'users/preferences'
    And header Authorization = 'Bearer ' + userToken
    And request {
      name: 'Work Route',
      pickup: { latitude: 33.9716, longitude: -6.8498 },
      dropoff: { latitude: 33.5731, longitude: -7.5898 }
    }
    When method post
    Then status 201
    And match response.success == true

  # ==================== USER RATINGS/REVIEWS ====================

  Scenario: Get user ratings
    Given path 'users/ratings'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.ratings == '#array'
    And match response.averageRating == '#number'

  # ==================== USER ACCOUNT STATUS ====================

  Scenario: Get user account status
    Given path 'users/account-status'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.status == '#string'
    And match response.verifiedEmail == '#boolean'
    And match response.verifiedPhone == '#boolean'

  # ==================== USER PREFERENCES - SAFETY ====================

  Scenario: Update safety preferences
    Given path 'users/settings'
    And header Authorization = 'Bearer ' + userToken
    And request {
      shareLocation: true,
      trustedContacts: ['contact@example.com'],
      emergencyContactsVisible: true
    }
    When method put
    Then status 200
    And match response.success == true

  # ==================== INVALID USER ID ====================

  Scenario: Get user profile with invalid token
    Given path 'users/profile'
    And header Authorization = 'Bearer invalid_token_here'
    When method get
    Then status 401

  Scenario: Get user profile of another user (should not be accessible)
    * def anotherUserId = '507f1f77bcf86cd799439011'
    Given path 'users/' + anotherUserId
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 403

  # ==================== BATCH USER OPERATIONS ====================

  Scenario: Get multiple users (admin only)
    Given path 'users'
    And header Authorization = 'Bearer ' + adminToken
    And param page = 1
    And param limit = 10
    When method get
    Then status 200
    And match response.success == true
    And match response.users == '#array'
    And match response.pagination contains { page: 1, limit: 10 }

  Scenario: Search users by email
    Given path 'users'
    And header Authorization = 'Bearer ' + adminToken
    And param search = 'sara'
    When method get
    Then status 200
    And match response.success == true
    And match response.users == '#array'

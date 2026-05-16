Feature: Notifications API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']

  # ==================== GET NOTIFICATIONS ====================

  Scenario: Get user notifications
    Given path 'notifications'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.notifications == '#array'

  Scenario: Get notifications with pagination
    Given path 'notifications'
    And header Authorization = 'Bearer ' + userToken
    And param page = 1
    And param limit = 20
    When method get
    Then status 200
    And match response.notifications == '#array'
    And match response.pagination.page == 1

  # ==================== UNREAD NOTIFICATIONS ====================

  Scenario: Get unread notification count
    Given path 'notifications/unread/count'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.unreadCount == '#number'

  Scenario: Get unread notifications
    Given path 'notifications/unread'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.notifications == '#array'

  # ==================== MARK AS READ ====================

  Scenario: Mark notification as read
    Given path 'notifications'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def notificationId = response.notifications[0]._id

    Given path 'notifications/' + notificationId + '/read'
    And header Authorization = 'Bearer ' + userToken
    When method post
    Then status 200
    And match response.success == true

  Scenario: Mark all notifications as read
    Given path 'notifications/mark-all-read'
    And header Authorization = 'Bearer ' + userToken
    When method post
    Then status 200
    And match response.success == true

  # ==================== DELETE NOTIFICATION ====================

  Scenario: Delete notification
    Given path 'notifications'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def notificationId = response.notifications[0]._id

    Given path 'notifications/' + notificationId
    And header Authorization = 'Bearer ' + userToken
    When method delete
    Then status 200
    And match response.success == true

  Scenario: Clear all notifications
    Given path 'notifications/clear-all'
    And header Authorization = 'Bearer ' + userToken
    When method post
    Then status 200
    And match response.success == true

  # ==================== NOTIFICATION PREFERENCES ====================

  Scenario: Get notification preferences
    Given path 'notifications/preferences'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.preferences contains {
      rideUpdates: '#boolean',
      promotions: '#boolean',
      messages: '#boolean'
    }

  Scenario: Update notification preferences
    Given path 'notifications/preferences'
    And header Authorization = 'Bearer ' + userToken
    And request {
      rideUpdates: true,
      promotions: false,
      messages: true,
      pushEnabled: true,
      emailEnabled: false
    }
    When method put
    Then status 200
    And match response.success == true
    And match response.preferences.promotions == false

  # ==================== FILTER NOTIFICATIONS ====================

  Scenario: Filter notifications by type
    Given path 'notifications'
    And header Authorization = 'Bearer ' + userToken
    And param type = 'ride_update'
    When method get
    Then status 200
    And match response.notifications == '#array'

  Scenario: Get recent notifications
    Given path 'notifications/recent'
    And header Authorization = 'Bearer ' + userToken
    And param days = 7
    When method get
    Then status 200
    And match response.notifications == '#array'

  # ==================== NOTIFICATION DETAILS ====================

  Scenario: Get notification details
    Given path 'notifications'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def notificationId = response.notifications[0]._id

    Given path 'notifications/' + notificationId
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.notification._id == notificationId

  # ==================== DEVICE TOKENS ====================

  Scenario: Register push notification token
    Given path 'notifications/device-token'
    And header Authorization = 'Bearer ' + userToken
    And request { token: 'fake_device_token_12345' }
    When method post
    Then status 200
    And match response.success == true

  Scenario: Remove push notification token
    Given path 'notifications/device-token'
    And header Authorization = 'Bearer ' + userToken
    And request { token: 'fake_device_token_12345' }
    When method delete
    Then status 200
    And match response.success == true

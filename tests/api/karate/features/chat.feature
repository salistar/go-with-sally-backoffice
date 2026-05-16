Feature: Chat & Messaging API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']
    * def adminToken = karate.properties['adminToken']

  # ==================== CONVERSATIONS ====================

  Scenario: Get user conversations
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.conversations == '#array'

  Scenario: Create new conversation
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    And request { participantId: '507f1f77bcf86cd799439011' }
    When method post
    Then status 201
    And match response.success == true
    And match response.conversation._id == '#string'
    * def conversationId = response.conversation._id

  # ==================== MESSAGES ====================

  Scenario: Send message
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def conversationId = response.conversations[0]._id

    Given path 'chat/conversations/' + conversationId + '/messages'
    And header Authorization = 'Bearer ' + userToken
    And request { text: 'Hello, are you available?' }
    When method post
    Then status 201
    And match response.success == true
    And match response.message.text == 'Hello, are you available?'
    And match response.message.senderId == '#string'

  Scenario: Get conversation messages
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def conversationId = response.conversations[0]._id

    Given path 'chat/conversations/' + conversationId + '/messages'
    And header Authorization = 'Bearer ' + userToken
    And param page = 1
    And param limit = 20
    When method get
    Then status 200
    And match response.success == true
    And match response.messages == '#array'

  # ==================== MESSAGE STATUS ====================

  Scenario: Mark message as read
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def conversationId = response.conversations[0]._id

    Given path 'chat/conversations/' + conversationId + '/messages'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def messageId = response.messages[0]._id

    Given path 'chat/messages/' + messageId + '/read'
    And header Authorization = 'Bearer ' + userToken
    When method post
    Then status 200
    And match response.success == true

  # ==================== TYPING INDICATORS ====================

  Scenario: Send typing indicator
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def conversationId = response.conversations[0]._id

    Given path 'chat/conversations/' + conversationId + '/typing'
    And header Authorization = 'Bearer ' + userToken
    And request { isTyping: true }
    When method post
    Then status 200
    And match response.success == true

  # ==================== FILE SHARING ====================

  Scenario: Send file message
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def conversationId = response.conversations[0]._id

    # Would normally include multipart form data
    Given path 'chat/conversations/' + conversationId + '/messages'
    And header Authorization = 'Bearer ' + userToken
    And request { text: 'Check this file', hasFile: true }
    When method post
    Then status 201
    And match response.success == true

  # ==================== CONVERSATION SETTINGS ====================

  Scenario: Update conversation settings
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def conversationId = response.conversations[0]._id

    Given path 'chat/conversations/' + conversationId
    And header Authorization = 'Bearer ' + userToken
    And request { muted: true }
    When method put
    Then status 200
    And match response.success == true

  Scenario: Leave conversation
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def conversationId = response.conversations[0]._id

    Given path 'chat/conversations/' + conversationId + '/leave'
    And header Authorization = 'Bearer ' + userToken
    When method post
    Then status 200
    And match response.success == true

  # ==================== UNREAD MESSAGES ====================

  Scenario: Get unread message count
    Given path 'chat/unread'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.unreadCount == '#number'

  Scenario: Mark all messages as read
    Given path 'chat/mark-all-read'
    And header Authorization = 'Bearer ' + userToken
    When method post
    Then status 200
    And match response.success == true

  # ==================== SEARCH MESSAGES ====================

  Scenario: Search in conversation
    Given path 'chat/conversations'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def conversationId = response.conversations[0]._id

    Given path 'chat/conversations/' + conversationId + '/search'
    And header Authorization = 'Bearer ' + userToken
    And param query = 'hello'
    When method get
    Then status 200
    And match response.success == true
    And match response.results == '#array'

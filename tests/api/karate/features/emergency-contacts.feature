Feature: Emergency Contacts API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']

  # ==================== CREATE EMERGENCY CONTACT ====================

  Scenario: Add emergency contact
    Given path 'emergency-contacts'
    And header Authorization = 'Bearer ' + userToken
    And request {
      name: 'Mother',
      phoneNumber: '+212612345678',
      relationship: 'family'
    }
    When method post
    Then status 201
    And match response.success == true
    And match response.contact contains {
      name: 'Mother',
      phoneNumber: '#string',
      relationship: 'family'
    }
    * def contactId = response.contact._id

  Scenario: Add multiple emergency contacts
    Given path 'emergency-contacts'
    And header Authorization = 'Bearer ' + userToken
    And request {
      name: 'Brother',
      phoneNumber: '+212612345679',
      relationship: 'family'
    }
    When method post
    Then status 201
    And match response.contact.name == 'Brother'

  # ==================== GET EMERGENCY CONTACTS ====================

  Scenario: List emergency contacts
    Given path 'emergency-contacts'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.contacts == '#array'

  Scenario: Get specific emergency contact
    Given path 'emergency-contacts'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def contactId = response.contacts[0]._id

    Given path 'emergency-contacts/' + contactId
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.contact.name == '#string'

  # ==================== UPDATE EMERGENCY CONTACT ====================

  Scenario: Update emergency contact
    Given path 'emergency-contacts'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def contactId = response.contacts[0]._id

    Given path 'emergency-contacts/' + contactId
    And header Authorization = 'Bearer ' + userToken
    And request { phoneNumber: '+212612345699' }
    When method put
    Then status 200
    And match response.success == true
    And match response.contact.phoneNumber == '+212612345699'

  # ==================== DELETE EMERGENCY CONTACT ====================

  Scenario: Delete emergency contact
    Given path 'emergency-contacts'
    And header Authorization = 'Bearer ' + userToken
    And request {
      name: 'Temporary',
      phoneNumber: '+212612345677',
      relationship: 'friend'
    }
    When method post
    Then status 201
    * def contactId = response.contact._id

    Given path 'emergency-contacts/' + contactId
    And header Authorization = 'Bearer ' + userToken
    When method delete
    Then status 200
    And match response.success == true

  # ==================== EMERGENCY CONTACT PRIORITY ====================

  Scenario: Set primary emergency contact
    Given path 'emergency-contacts'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def contactId = response.contacts[0]._id

    Given path 'emergency-contacts/' + contactId + '/set-primary'
    And header Authorization = 'Bearer ' + userToken
    When method post
    Then status 200
    And match response.success == true

  # ==================== EMERGENCY CONTACT VISIBILITY ====================

  Scenario: Update contact visibility during ride
    Given path 'emergency-contacts'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def contactId = response.contacts[0]._id

    Given path 'emergency-contacts/' + contactId
    And header Authorization = 'Bearer ' + userToken
    And request { visibleDuringRide: true }
    When method put
    Then status 200
    And match response.contact.visibleDuringRide == true

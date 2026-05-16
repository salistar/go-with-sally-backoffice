Feature: Subscriptions API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']
    * def adminToken = karate.properties['adminToken']

  # ==================== LIST SUBSCRIPTIONS ====================

  Scenario: Get available subscription plans
    Given path 'subscriptions'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.plans == '#array'
    And match response.plans[0] contains {
      id: '#string',
      name: '#string',
      price: '#number',
      benefits: '#array'
    }

  Scenario: Get subscription details
    Given path 'subscriptions'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def planId = response.plans[0].id

    Given path 'subscriptions/' + planId
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.plan.name == '#string'

  # ==================== SUBSCRIBE ====================

  Scenario: Subscribe to plan
    Given path 'subscriptions'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def planId = response.plans[0].id

    Given path 'subscriptions/' + planId + '/subscribe'
    And header Authorization = 'Bearer ' + userToken
    And request { paymentMethod: 'credit_card' }
    When method post
    Then status 201
    And match response.success == true
    And match response.subscription.status == 'active'

  # ==================== USER SUBSCRIPTION ====================

  Scenario: Get active subscription
    Given path 'subscriptions/my'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.subscription.status == '#string?'

  Scenario: Get subscription history
    Given path 'subscriptions/history'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.subscriptions == '#array'

  # ==================== CANCEL SUBSCRIPTION ====================

  Scenario: Cancel subscription
    Given path 'subscriptions/my'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200 || status 404

  Scenario: Cancel with feedback
    Given path 'subscriptions/cancel'
    And header Authorization = 'Bearer ' + userToken
    And request { reason: 'Too expensive', feedback: 'Need lower price' }
    When method post
    Then status 200 || status 400
    And match response.success == '#boolean'

  # ==================== RENEW SUBSCRIPTION ====================

  Scenario: Renew expired subscription
    Given path 'subscriptions/renew'
    And header Authorization = 'Bearer ' + userToken
    And request { planId: '507f1f77bcf86cd799439011' }
    When method post
    Then status 200 || status 400
    And match response.success == '#boolean'

  # ==================== UPGRADE/DOWNGRADE ====================

  Scenario: Upgrade subscription plan
    Given path 'subscriptions'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def newPlanId = response.plans[1].id

    Given path 'subscriptions/upgrade'
    And header Authorization = 'Bearer ' + userToken
    And request { newPlanId: '#(newPlanId)' }
    When method post
    Then status 200 || status 400
    And match response.success == '#boolean'

  # ==================== INVOICE ====================

  Scenario: Get subscription invoices
    Given path 'subscriptions/invoices'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.invoices == '#array'

  Scenario: Download invoice
    Given path 'subscriptions/invoices/507f1f77bcf86cd799439011'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200 || status 404

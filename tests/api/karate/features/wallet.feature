Feature: Wallet & Payment API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']
    * def adminToken = karate.properties['adminToken']

  # ==================== WALLET BALANCE ====================

  Scenario: Get user wallet balance
    Given path 'wallet/balance'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.balance contains {
      available: '#number',
      pending: '#number',
      total: '#number'
    }

  Scenario: Get driver wallet balance
    Given path 'wallet/balance'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.balance.available == '#number'

  # ==================== ADD FUNDS ====================

  Scenario: Add funds to wallet
    Given path 'wallet/add-funds'
    And header Authorization = 'Bearer ' + userToken
    And request { amount: 100, paymentMethod: 'credit_card' }
    When method post
    Then status 200
    And match response.success == true
    And match response.transaction.status == '#string'

  # ==================== WALLET TRANSACTIONS ====================

  Scenario: Get wallet transaction history
    Given path 'wallet/transactions'
    And header Authorization = 'Bearer ' + userToken
    And param page = 1
    And param limit = 20
    When method get
    Then status 200
    And match response.success == true
    And match response.transactions == '#array'
    And match response.pagination.page == 1

  Scenario: Filter transactions by type
    Given path 'wallet/transactions'
    And header Authorization = 'Bearer ' + userToken
    And param type = 'debit'
    When method get
    Then status 200
    And match response.success == true

  Scenario: Filter transactions by date range
    Given path 'wallet/transactions'
    And header Authorization = 'Bearer ' + userToken
    And param startDate = '2024-01-01'
    And param endDate = '2024-03-17'
    When method get
    Then status 200
    And match response.success == true

  # ==================== REFUND ====================

  Scenario: Request refund for ride
    Given path 'wallet/refund'
    And header Authorization = 'Bearer ' + userToken
    And request {
      rideId: '507f1f77bcf86cd799439011',
      reason: 'Driver cancelled late'
    }
    When method post
    Then status 200 || status 400
    And match response.success == '#boolean'

  # ==================== PAYMENT METHODS ====================

  Scenario: Get saved payment methods
    Given path 'wallet/payment-methods'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.methods == '#array'

  Scenario: Add payment method
    Given path 'wallet/payment-methods'
    And header Authorization = 'Bearer ' + userToken
    And request {
      type: 'credit_card',
      cardNumber: '4111111111111111',
      expiryDate: '12/26',
      cvv: '123',
      name: 'John Doe'
    }
    When method post
    Then status 201
    And match response.success == true

  Scenario: Delete payment method
    Given path 'wallet/payment-methods'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def methodId = response.methods[0]._id

    Given path 'wallet/payment-methods/' + methodId
    And header Authorization = 'Bearer ' + userToken
    When method delete
    Then status 200
    And match response.success == true

  # ==================== WALLET STATEMENTS ====================

  Scenario: Get wallet statement
    Given path 'wallet/statement'
    And header Authorization = 'Bearer ' + userToken
    And param month = '03'
    And param year = '2024'
    When method get
    Then status 200
    And match response.success == true
    And match response.statement.totalCredit == '#number'
    And match response.statement.totalDebit == '#number'

  # ==================== DRIVER PAYOUTS ====================

  Scenario: Get driver payout history
    Given path 'wallet/payouts'
    And header Authorization = 'Bearer ' + driverToken
    When method get
    Then status 200
    And match response.success == true
    And match response.payouts == '#array'

  Scenario: Request payout
    Given path 'wallet/request-payout'
    And header Authorization = 'Bearer ' + driverToken
    And request { amount: 500, bankAccount: '1234567890' }
    When method post
    Then status 201
    And match response.success == true
    And match response.payout.status == 'pending'

  # ==================== PROMO CODES ====================

  Scenario: Apply promo code
    Given path 'wallet/apply-promo'
    And header Authorization = 'Bearer ' + userToken
    And request { code: 'WELCOME50' }
    When method post
    Then status 200
    And match response.success == true
    And match response.discount == '#number'

  Scenario: Invalid promo code
    Given path 'wallet/apply-promo'
    And header Authorization = 'Bearer ' + userToken
    And request { code: 'INVALID123' }
    When method post
    Then status 400
    And match response.success == false

  # ==================== SUBSCRIPTION PAYMENTS ====================

  Scenario: Get active subscription
    Given path 'wallet/subscription'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200 || status 404

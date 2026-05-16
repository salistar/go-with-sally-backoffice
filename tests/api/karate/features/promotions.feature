Feature: Promotions & Coupons API Tests

  Background:
    * url apiUrl
    * def userToken = karate.properties['userToken']
    * def driverToken = karate.properties['driverToken']
    * def adminToken = karate.properties['adminToken']

  # ==================== LIST PROMOTIONS ====================

  Scenario: Get available promotions
    Given path 'promotions'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.promotions == '#array'

  Scenario: Get active promotions
    Given path 'promotions'
    And header Authorization = 'Bearer ' + userToken
    And param status = 'active'
    When method get
    Then status 200
    And match response.promotions == '#array'

  # ==================== APPLY COUPON ====================

  Scenario: Apply valid coupon code
    Given path 'promotions/apply'
    And header Authorization = 'Bearer ' + userToken
    And request { code: 'WELCOME50' }
    When method post
    Then status 200
    And match response.success == true
    And match response.promotion contains {
      code: '#string',
      discountType: '#string',
      discountValue: '#number'
    }

  Scenario: Apply invalid coupon
    Given path 'promotions/apply'
    And header Authorization = 'Bearer ' + userToken
    And request { code: 'INVALID999' }
    When method post
    Then status 400
    And match response.success == false
    And match response.message == '#string'

  Scenario: Apply expired coupon
    Given path 'promotions/apply'
    And header Authorization = 'Bearer ' + userToken
    And request { code: 'EXPIRED123' }
    When method post
    Then status 400
    And match response.success == false

  # ==================== PROMOTION DETAILS ====================

  Scenario: Get promotion details
    Given path 'promotions'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def promoId = response.promotions[0]._id

    Given path 'promotions/' + promoId
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.promotion contains {
      code: '#string',
      validFrom: '#string',
      validUntil: '#string'
    }

  # ==================== USER APPLIED PROMOTIONS ====================

  Scenario: Get my applied promotions
    Given path 'promotions/my'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.promotions == '#array'

  # ==================== REFERRAL PROMOTIONS ====================

  Scenario: Get referral promotion code
    Given path 'promotions/referral'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.referralCode == '#string'
    And match response.reward == '#number'

  Scenario: Share referral code
    Given path 'promotions/referral/share'
    And header Authorization = 'Bearer ' + userToken
    And request { email: 'friend@example.com' }
    When method post
    Then status 200
    And match response.success == true

  # ==================== PROMOTION FILTERS ====================

  Scenario: Filter promotions by category
    Given path 'promotions'
    And header Authorization = 'Bearer ' + userToken
    And param category = 'rides'
    When method get
    Then status 200
    And match response.promotions == '#array'

  Scenario: Get seasonal promotions
    Given path 'promotions'
    And header Authorization = 'Bearer ' + userToken
    And param type = 'seasonal'
    When method get
    Then status 200
    And match response.promotions == '#array'

  # ==================== TERMS & CONDITIONS ====================

  Scenario: Get promotion terms
    Given path 'promotions'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    * def promoId = response.promotions[0]._id

    Given path 'promotions/' + promoId + '/terms'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.terms == '#string'

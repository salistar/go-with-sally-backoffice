Feature: Affiliation System API Tests

  Background:
    * url apiUrl
    * def testUser = { email: 'user@test.com', password: 'test1234' }
    * def testAdmin = { email: 'admin@test.com', password: 'admin1234' }

    # Get user token
    * path 'auth/login'
    * request { email: '#(testUser.email)', password: '#(testUser.password)' }
    * method post
    * def userToken = response.token

    # Get admin token
    * path 'auth/login'
    * request { email: '#(testAdmin.email)', password: '#(testAdmin.password)' }
    * method post
    * def adminToken = response.token

  Scenario: Create Affiliation Program
    Given path 'admin/affiliations/programs'
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        name: 'Summer Referral Program',
        description: 'Earn rewards by inviting friends',
        commission: {
          type: 'PERCENTAGE',
          amount: 10.0,
          perRide: 15.00
        },
        active: true,
        terms: 'Refer a friend and earn 10% commission',
        bonus: {
          newUserBonus: 25.00,
          referrerBonus: 50.00
        }
      }
      """
    When method post
    Then status 201
    And match response.success == true
    And match response.program.id == '#string'
    And match response.program.name == 'Summer Referral Program'
    * def programId = response.program.id

  Scenario: Get Active Affiliation Programs
    Given path 'affiliations/programs'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.programs == '#array'
    And match response.programs[0].name == '#string'

  Scenario: Join Affiliation Program
    Given path 'affiliations/programs/PROGRAM_ID/join'
    And header Authorization = 'Bearer ' + userToken
    When method post
    Then status 200
    And match response.success == true
    And match response.affiliation.status == 'ACTIVE'
    And match response.affiliation.referralCode == '#string'

  Scenario: Get User Affiliation Status
    Given path 'affiliations/status'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.affiliation.referralCode == '#string'
    And match response.affiliation.earnings == '#number'

  Scenario: Get Referral Code
    Given path 'affiliations/referral-code'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.referralCode == '#string'

  Scenario: Register Using Referral Code
    # First get a referral code from an existing affiliate
    Given path 'affiliations/referral-code'
    And header Authorization = 'Bearer ' + userToken
    When method post
    * def referralCode = response.referralCode

    # Register new user with referral code
    Given path 'auth/register'
    And request
      """
      {
        firstName: 'New',
        lastName: 'User',
        email: 'referred' + java.time.LocalDateTime.now().getSecond() + '@test.com',
        password: 'NewUser@1234',
        phoneNumber: '+212612345678',
        role: 'user',
        referralCode: '#(referralCode)'
      }
      """
    When method post
    Then status 201
    And match response.success == true
    And match response.referralApplied == true

  Scenario: Get Referral Earnings
    Given path 'affiliations/earnings'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.earnings.total == '#number'
    And match response.earnings.pending == '#number'
    And match response.earnings.paid == '#number'

  Scenario: Get Referral Details
    Given path 'affiliations/referrals'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.referrals == '#array'

  Scenario: Withdraw Earnings
    Given path 'affiliations/earnings/withdraw'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        amount: 100.00,
        bankAccount: {
          bankName: 'Bank Al Maghrib',
          accountNumber: '1234567890'
        }
      }
      """
    When method post
    Then status 200
    And match response.success == true
    And match response.withdrawal.status == 'PENDING'

  Scenario: Get Withdrawal History
    Given path 'affiliations/earnings/withdrawals'
    And header Authorization = 'Bearer ' + userToken
    When method get
    Then status 200
    And match response.success == true
    And match response.withdrawals == '#array'

  Scenario: Admin Get All Affiliates
    Given path 'admin/affiliations/affiliates'
    And header Authorization = 'Bearer ' + adminToken
    And param programId = 'PROGRAM_ID'
    When method get
    Then status 200
    And match response.success == true
    And match response.affiliates == '#array'
    And match response.total == '#number'

  Scenario: Admin Get Program Statistics
    Given path 'admin/affiliations/programs/PROGRAM_ID/statistics'
    And header Authorization = 'Bearer ' + adminToken
    When method get
    Then status 200
    And match response.success == true
    And match response.stats.totalAffiliates == '#number'
    And match response.stats.totalReferrals == '#number'
    And match response.stats.totalEarnings == '#number'

  Scenario: Admin Get Withdrawal Requests
    Given path 'admin/affiliations/withdrawals'
    And header Authorization = 'Bearer ' + adminToken
    And param status = 'PENDING'
    When method get
    Then status 200
    And match response.success == true
    And match response.withdrawals == '#array'

  Scenario: Admin Process Withdrawal
    Given path 'admin/affiliations/withdrawals/WITHDRAWAL_ID/process'
    And header Authorization = 'Bearer ' + adminToken
    And request
      """
      {
        status: 'APPROVED',
        transactionId: 'TXN123456'
      }
      """
    When method put
    Then status 200
    And match response.success == true
    And match response.withdrawal.status == 'APPROVED'

  Scenario: Admin Reject Withdrawal
    Given path 'admin/affiliations/withdrawals/WITHDRAWAL_ID/reject'
    And header Authorization = 'Bearer ' + adminToken
    And request { reason: 'Invalid bank account' }
    When method put
    Then status 200
    And match response.success == true
    And match response.withdrawal.status == 'REJECTED'

  Scenario: Get Affiliation Leaderboard
    Given path 'affiliations/leaderboard'
    When method get
    Then status 200
    And match response.success == true
    And match response.leaderboard == '#array'
    And match response.leaderboard[0].referrals == '#number'
    And match response.leaderboard[0].earnings == '#number'

  Scenario: Get Affiliation Terms
    Given path 'affiliations/terms'
    When method get
    Then status 200
    And match response.success == true
    And match response.terms == '#string'

  Scenario: Update Affiliation Profile
    Given path 'affiliations/profile'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        bankAccount: {
          bankName: 'Bank Al Maghrib',
          accountNumber: '9876543210'
        },
        paymentMethod: 'BANK_TRANSFER'
      }
      """
    When method put
    Then status 200
    And match response.success == true

  Scenario: Generate Referral Links
    Given path 'affiliations/referral-links/generate'
    And header Authorization = 'Bearer ' + userToken
    And request
      """
      {
        count: 5,
        trackingPixel: true
      }
      """
    When method post
    Then status 200
    And match response.success == true
    And match response.links == '#array'
    And match response.links[0].url == '#string'

  Scenario: Get Referral Analytics
    Given path 'affiliations/analytics'
    And header Authorization = 'Bearer ' + userToken
    And param period = 'month'
    When method get
    Then status 200
    And match response.success == true
    And match response.analytics.clicks == '#number'
    And match response.analytics.conversions == '#number'
    And match response.analytics.conversionRate == '#number'
    And match response.analytics.earnings == '#number'

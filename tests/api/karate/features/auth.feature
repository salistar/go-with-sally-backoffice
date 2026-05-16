Feature: Authentication API Tests

  Background:
    * url apiUrl
    * def testUser = { email: 'user@test.com', password: 'test1234' }
    * def testDriver = { email: 'driver@test.com', password: 'test1234' }
    * def testAdmin = { email: 'admin@test.com', password: 'admin1234' }

  Scenario: User Login Success
    Given path 'auth/login'
    And request { email: '#(testUser.email)', password: '#(testUser.password)' }
    When method post
    Then status 200
    And match response.success == true
    And match response.token == '#string'
    And match response.user.email == testUser.email
    And match response.user.role == 'user'
    * def userToken = response.token

  Scenario: Driver Login Success
    Given path 'auth/login'
    And request { email: '#(testDriver.email)', password: '#(testDriver.password)' }
    When method post
    Then status 200
    And match response.success == true
    And match response.token == '#string'
    And match response.user.email == testDriver.email
    And match response.user.role == 'driver'
    * def driverToken = response.token

  Scenario: Admin Login Success
    Given path 'auth/login'
    And request { email: '#(testAdmin.email)', password: '#(testAdmin.password)' }
    When method post
    Then status 200
    And match response.success == true
    And match response.token == '#string'
    And match response.user.email == testAdmin.email
    And match response.user.role == 'admin'
    * def adminToken = response.token

  Scenario: Login with Invalid Credentials
    Given path 'auth/login'
    And request { email: 'invalid@test.com', password: 'wrongpassword' }
    When method post
    Then status 401
    And match response.success == false
    And match response.message == '#string'

  Scenario: Login with Missing Email
    Given path 'auth/login'
    And request { password: 'test1234' }
    When method post
    Then status 400
    And match response.success == false

  Scenario: Login with Missing Password
    Given path 'auth/login'
    And request { email: 'user@test.com' }
    When method post
    Then status 400
    And match response.success == false

  Scenario: User Registration
    Given path 'auth/register'
    And request
      """
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'newuser' + java.time.LocalDateTime.now().getSecond() + '@test.com',
        password: 'Test@1234',
        phoneNumber: '+212612345678',
        role: 'user'
      }
      """
    When method post
    Then status 201
    And match response.success == true
    And match response.user.email == '#string'
    And match response.token == '#string'

  Scenario: User Registration with Invalid Email
    Given path 'auth/register'
    And request
      """
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'invalid-email',
        password: 'Test@1234',
        phoneNumber: '+212612345678',
        role: 'user'
      }
      """
    When method post
    Then status 400
    And match response.success == false

  Scenario: User Registration with Weak Password
    Given path 'auth/register'
    And request
      """
      {
        firstName: 'Test',
        lastName: 'User',
        email: 'newuser' + java.time.LocalDateTime.now().getSecond() + '@test.com',
        password: 'weak',
        phoneNumber: '+212612345678',
        role: 'user'
      }
      """
    When method post
    Then status 400
    And match response.success == false

  Scenario: Token Refresh
    # First login to get tokens
    Given path 'auth/login'
    And request { email: '#(testUser.email)', password: '#(testUser.password)' }
    When method post
    Then status 200
    * def accessToken = response.token
    * def refreshToken = response.refreshToken

    # Then refresh the token
    Given path 'auth/refresh'
    And request { refreshToken: '#(refreshToken)' }
    When method post
    Then status 200
    And match response.success == true
    And match response.token == '#string'
    And match response.token != '#(accessToken)'

  Scenario: Verify Token
    # First login
    Given path 'auth/login'
    And request { email: '#(testUser.email)', password: '#(testUser.password)' }
    When method post
    * def token = response.token

    # Then verify token
    Given path 'auth/verify'
    And header Authorization = 'Bearer ' + token
    When method get
    Then status 200
    And match response.valid == true
    And match response.user.email == testUser.email

  Scenario: Invalid Token
    Given path 'auth/verify'
    And header Authorization = 'Bearer invalid.token.here'
    When method get
    Then status 401
    And match response.valid == false

  Scenario: Missing Authorization Header
    Given path 'auth/verify'
    When method get
    Then status 401

  Scenario: Logout
    # First login
    Given path 'auth/login'
    And request { email: '#(testUser.email)', password: '#(testUser.password)' }
    When method post
    * def token = response.token

    # Then logout
    Given path 'auth/logout'
    And header Authorization = 'Bearer ' + token
    When method post
    Then status 200
    And match response.success == true

  Scenario: Password Reset Request
    Given path 'auth/forgot-password'
    And request { email: '#(testUser.email)' }
    When method post
    Then status 200
    And match response.success == true
    And match response.message == '#string'

  Scenario: Password Reset with Invalid Email
    Given path 'auth/forgot-password'
    And request { email: 'nonexistent@test.com' }
    When method post
    Then status 404
    And match response.success == false

  Scenario: Change Password
    # First login
    Given path 'auth/login'
    And request { email: '#(testUser.email)', password: '#(testUser.password)' }
    When method post
    * def token = response.token

    # Change password
    Given path 'auth/change-password'
    And header Authorization = 'Bearer ' + token
    And request
      """
      {
        currentPassword: 'test1234',
        newPassword: 'NewPassword@1234'
      }
      """
    When method post
    Then status 200
    And match response.success == true

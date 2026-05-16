package simulations

import io.gatling.core.Predef._
import io.gatling.core.assertion.Assertion
import io.gatling.http.Predef._
import scala.concurrent.duration._

/**
 * GoWithSally - Authentication Endpoints Load Test
 *
 * Tests the following endpoints:
 * - POST /auth/register - User registration
 * - POST /auth/login - User login
 * - POST /auth/refresh-token - Token refresh
 * - POST /auth/logout - User logout
 * - POST /auth/forgot-password - Password reset request
 * - POST /auth/verify-code - Code verification
 *
 * Scenarios:
 * 1. Ramp-up: 10-100 users over 2 minutes with sustained load
 * 2. Assertions: Response time p95 < 500ms, error rate < 1%, throughput > 100 req/s
 */
class AuthSimulation extends Simulation {

  // Configuration
  val baseUrl = "http://localhost:5000/api"
  val adminEmail = "admin@gowithsally.ma"
  val adminPassword = "Admin@2024"
  val userEmail = "sara.user@gmail.com"
  val userPassword = "User@2024"
  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/3.9.5")
    .shareConnections()
    .connectionTimeout(10 seconds)
    .requestTimeout(30 seconds)

  // Session setup
  val setup = {
    feed(csv("auth_login.csv").circular)
      .exec(session => session.set("counter", session("counter").validate[Int](i => i + 1).getOrElse(0)))
  }

  // Authentication chain - Login
  val loginChain = exec(
    http("Login")
      .post("/auth/login")
      .body(StringBody("""{"email":"${email}","password":"${password}"}"""))
      .check(status.is(200))
      .check(jsonPath("$.data.token").saveAs("token"))
      .check(jsonPath("$.data.user.id").saveAs("userId"))
      .check(jsonPath("$.data.user.role").saveAs("userRole"))
      .check(responseTimeInMillis.saveAs("loginTime"))
  )
    .pause(1 second)
    .exec(http("Get User Profile")
      .get("/users/profile")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
      .check(jsonPath("$.data.id").is("${userId}"))
    )
    .pause(500 milliseconds)

  // Register new user
  val registerChain = exec(
    http("Register User")
      .post("/auth/register")
      .body(StringBody("""{"firstName":"Test","lastName":"User${counter}","email":"testuser${counter}@gowithsally.ma","phone":"+212612345${counter}","password":"TestPass@2024","dateOfBirth":"1990-01-15","role":"user"}"""))
      .check(status.in(200, 201))
      .check(jsonPath("$.data.token").saveAs("newUserToken"))
      .check(jsonPath("$.data.user.id").saveAs("newUserId"))
  )
    .pause(500 milliseconds)

  // Token refresh
  val refreshTokenChain = exec(
    http("Refresh Token")
      .post("/auth/refresh-token")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
      .check(jsonPath("$.data.token").saveAs("refreshedToken"))
  )
    .pause(500 milliseconds)

  // Logout
  val logoutChain = exec(
    http("Logout")
      .post("/auth/logout")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
  )
    .pause(500 milliseconds)

  // Forgot password
  val forgotPasswordChain = exec(
    http("Forgot Password Request")
      .post("/auth/forgot-password")
      .body(StringBody("""{"email":"${email}"}"""))
      .check(status.is(200))
      .check(jsonPath("$.message").exists)
  )
    .pause(1 second)

  // Verify code (mock implementation)
  val verifyCodeChain = exec(
    http("Verify Code")
      .post("/auth/verify-code")
      .body(StringBody("""{"email":"${email}","code":"123456"}"""))
      .check(status.in(200, 401, 400))
  )
    .pause(500 milliseconds)

  // Scenario 1: Regular authentication flow
  val authFlowScenario = scenario("Authentication Flow")
    .exec(setup)
    .exec(loginChain)
    .repeat(3) {
      exec(refreshTokenChain)
        .pause(2 seconds)
    }
    .exec(logoutChain)

  // Scenario 2: High-frequency login attempts
  val loginStressScenario = scenario("Login Stress Test")
    .exec(setup)
    .repeat(10) {
      exec(loginChain)
        .pause(500 milliseconds)
    }

  // Scenario 3: Registration stress
  val registrationScenario = scenario("Registration Stress Test")
    .repeat(5) {
      exec(registerChain)
        .pause(1 second)
    }

  // Scenario 4: Password recovery flow
  val passwordRecoveryScenario = scenario("Password Recovery")
    .exec(setup)
    .exec(forgotPasswordChain)
    .exec(verifyCodeChain)
    .pause(2 seconds)

  // Setup simulation
  setUp(
    authFlowScenario.inject(
      nothingFor(5 seconds),
      rampUsers(10).during(2 minutes),
      constantUsersPerSec(2).during(5 minutes),
      rampDown(10).during(1 minute)
    ),
    loginStressScenario.inject(
      nothingFor(3 minutes),
      constantUsersPerSec(1).during(2 minutes),
      rampDown(5).during(1 minute)
    ),
    registrationScenario.inject(
      nothingFor(5 minutes),
      constantUsersPerSec(0.5).during(2 minutes)
    ),
    passwordRecoveryScenario.inject(
      nothingFor(7 minutes),
      constantUsersPerSec(0.3).during(2 minutes)
    )
  ).protocols(httpProtocol)
    .assertions(
      // Response time assertions
      global.responseTime.percentile1.lt(200),
      global.responseTime.percentile2.lt(300),
      global.responseTime.percentile3.lt(500),
      global.responseTime.percentile4.lt(1000),
      global.responseTime.max.lt(5000),

      // Error rate assertions
      global.failedRequests.percent.lt(1),
      global.successfulRequests.percent.gt(99),

      // Throughput assertions
      global.requestsPerSec.gt(100),

      // Specific endpoint assertions
      forAll.responseTime.percentile3.lt(500),
      forAll.failedRequests.percent.lt(1)
    )

}

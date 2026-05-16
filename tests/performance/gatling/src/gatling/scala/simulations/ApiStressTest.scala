package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

/**
 * GoWithSally - API Stress Test
 *
 * Comprehensive stress testing of all major API endpoints:
 * - Authentication endpoints
 * - Ride booking endpoints
 * - Driver endpoints
 * - User profile endpoints
 * - Review endpoints
 * - Wallet endpoints
 * - Subscription endpoints
 *
 * Test scenarios:
 * 1. Spike test: Sudden surge from 10 to 200 users
 * 2. Soak test: Low load sustained for long duration
 * 3. Stress test: Gradually increase load until breaking point
 * 4. Combined endpoint stress: All endpoints under heavy load simultaneously
 */
class ApiStressTest extends Simulation {

  val baseUrl = "http://localhost:5000/api"
  val adminToken = "test-admin-token"
  val userToken = "test-user-token"
  val driverToken = "test-driver-token"

  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/3.9.5")
    .shareConnections()
    .connectionTimeout(10 seconds)
    .requestTimeout(30 seconds)
    .acceptEncodingHeader("gzip, deflate, br")

  // ============================================================================
  // Auth Endpoints
  // ============================================================================

  val stressLoginChain = exec(
    http("Stress - Login")
      .post("/auth/login")
      .body(StringBody("""{"email":"sara.user@gmail.com","password":"User@2024"}"""))
      .check(status.in(200, 401))
      .check(jsonPath("$.data.token").optional.saveAs("token"))
  )

  val stressRegisterChain = exec(
    http("Stress - Register")
      .post("/auth/register")
      .body(StringBody("""{"firstName":"Stress","lastName":"Test${counter}","email":"stresstest${counter}@gowithsally.ma","phone":"+212612345${counter}","password":"StressPass@2024","dateOfBirth":"1990-01-15","role":"user"}"""))
      .check(status.in(200, 201, 400, 409))
  )

  // ============================================================================
  // Ride Endpoints
  // ============================================================================

  val stressRideRequestChain = exec(
    http("Stress - Request Ride")
      .post("/rides/request")
      .header("Authorization", s"Bearer $${userToken}")
      .body(StringBody("""{"pickupLocation":{"address":"Downtown Casablanca","latitude":33.5731,"longitude":-7.5898},"dropoffLocation":{"address":"Rabat Central","latitude":34.0209,"longitude":-6.8416},"rideType":"economy","passengers":1,"notes":"Stress test"}"""))
      .check(status.in(200, 201, 400))
      .check(jsonPath("$.data.id").optional.saveAs("rideId"))
  )

  val stressGetRidesChain = exec(
    http("Stress - Get Rides List")
      .get("/rides")
      .header("Authorization", s"Bearer $${userToken}")
      .check(status.in(200, 400))
  )

  val stressNearestDriversChain = exec(
    http("Stress - Nearest Drivers")
      .get("/rides/nearest-drivers?latitude=33.5731&longitude=-7.5898&distance=5")
      .header("Authorization", s"Bearer $${userToken}")
      .check(status.in(200, 400))
  )

  // ============================================================================
  // Driver Endpoints
  // ============================================================================

  val stressDriverLocationChain = exec(
    http("Stress - Update Driver Location")
      .post("/drivers/location")
      .header("Authorization", s"Bearer $${driverToken}")
      .body(StringBody("""{"latitude":33.5731,"longitude":-7.5898,"heading":0,"speed":35,"accuracy":5,"bearing":0,"altitude":0}"""))
      .check(status.in(200, 204, 400))
  )

  val stressDriverEarningsChain = exec(
    http("Stress - Driver Earnings")
      .get("/earnings/daily")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.in(200, 400))
  )

  val stressAvailableRidesChain = exec(
    http("Stress - Available Rides")
      .get("/drivers/available-rides")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.in(200, 400))
  )

  // ============================================================================
  // User Endpoints
  // ============================================================================

  val stressGetProfileChain = exec(
    http("Stress - Get Profile")
      .get("/users/profile")
      .header("Authorization", s"Bearer $${userToken}")
      .check(status.in(200, 400))
  )

  val stressUpdateProfileChain = exec(
    http("Stress - Update Profile")
      .put("/users/profile")
      .header("Authorization", s"Bearer $${userToken}")
      .body(StringBody("""{"firstName":"UpdatedTest","lastName":"User","phone":"+212612345678"}"""))
      .check(status.in(200, 400))
  )

  // ============================================================================
  // Review Endpoints
  // ============================================================================

  val stressCreateReviewChain = exec(
    http("Stress - Create Review")
      .post("/reviews")
      .header("Authorization", s"Bearer $${userToken}")
      .body(StringBody("""{"rideId":"test-ride-123","rating":5,"comment":"Great service","categories":{"cleanliness":5,"driving":5,"communication":5}}"""))
      .check(status.in(200, 201, 400, 404))
  )

  // ============================================================================
  // Wallet Endpoints
  // ============================================================================

  val stressGetWalletChain = exec(
    http("Stress - Get Wallet")
      .get("/wallet")
      .header("Authorization", s"Bearer $${userToken}")
      .check(status.in(200, 400))
  )

  val stressWalletHistoryChain = exec(
    http("Stress - Wallet History")
      .get("/wallet/history")
      .header("Authorization", s"Bearer $${userToken}")
      .check(status.in(200, 400))
  )

  // ============================================================================
  // Subscription Endpoints
  // ============================================================================

  val stressGetPlansChain = exec(
    http("Stress - Get Subscription Plans")
      .get("/subscriptions/plans")
      .check(status.in(200, 400))
  )

  val stressGetCurrentSubscriptionChain = exec(
    http("Stress - Get Current Subscription")
      .get("/subscriptions/current")
      .header("Authorization", s"Bearer $${userToken}")
      .check(status.in(200, 400))
  )

  // ============================================================================
  // Favorites Endpoints
  // ============================================================================

  val stressGetFavoritesChain = exec(
    http("Stress - Get Favorites")
      .get("/favorites")
      .header("Authorization", s"Bearer $${userToken}")
      .check(status.in(200, 400))
  )

  // ============================================================================
  // Scenarios
  // ============================================================================

  // Scenario 1: Spike test (sudden surge)
  val spikeTestScenario = scenario("Spike Test")
    .repeat(5) {
      exec(stressLoginChain)
        .pause(500 milliseconds)
        .exec(stressGetProfileChain)
        .pause(500 milliseconds)
        .exec(stressRideRequestChain)
        .pause(1 second)
    }

  // Scenario 2: Soak test (sustained low load)
  val soakTestScenario = scenario("Soak Test")
    .repeat(50) {
      exec(stressGetRidesChain)
        .pause(2 seconds)
        .exec(stressGetPlansChain)
        .pause(2 seconds)
        .exec(stressGetFavoritesChain)
        .pause(2 seconds)
    }

  // Scenario 3: Driver stress test
  val driverStressScenario = scenario("Driver Stress Test")
    .repeat(20) {
      exec(stressDriverLocationChain)
        .pause(500 milliseconds)
        .exec(stressAvailableRidesChain)
        .pause(1 second)
        .exec(stressDriverEarningsChain)
        .pause(500 milliseconds)
    }

  // Scenario 4: Comprehensive endpoint stress
  val comprehensiveStressScenario = scenario("Comprehensive Stress")
    .repeat(10) {
      exec(stressLoginChain)
        .pause(500 milliseconds)
        .exec(stressGetProfileChain)
        .pause(500 milliseconds)
        .exec(stressGetRidesChain)
        .pause(500 milliseconds)
        .exec(stressRideRequestChain)
        .pause(1 second)
        .exec(stressNearestDriversChain)
        .pause(500 milliseconds)
        .exec(stressGetWalletChain)
        .pause(500 milliseconds)
        .exec(stressGetCurrentSubscriptionChain)
        .pause(1 second)
    }

  // Scenario 5: Authentication stress
  val authStressScenario = scenario("Authentication Stress")
    .repeat(30) {
      exec(stressLoginChain)
        .pause(300 milliseconds)
        .exec(stressRegisterChain)
        .pause(500 milliseconds)
    }

  // Setup simulation
  setUp(
    spikeTestScenario.inject(
      nothingFor(10 seconds),
      atOnceUsers(10),
      rampUsers(190).during(1 minute),
      constantUsersPerSec(3).during(2 minutes),
      rampDown(100).during(1 minute)
    ),
    soakTestScenario.inject(
      nothingFor(2 minutes),
      constantUsersPerSec(0.5).during(10 minutes),
      rampDown(5).during(30 seconds)
    ),
    driverStressScenario.inject(
      nothingFor(1 minute),
      rampUsers(50).during(2 minutes),
      constantUsersPerSec(2).during(3 minutes),
      rampDown(20).during(1 minute)
    ),
    comprehensiveStressScenario.inject(
      nothingFor(3 minutes),
      rampUsers(75).during(2 minutes),
      constantUsersPerSec(2.5).during(3 minutes),
      rampDown(30).during(1 minute)
    ),
    authStressScenario.inject(
      nothingFor(5 minutes),
      constantUsersPerSec(3).during(3 minutes),
      rampDown(10).during(1 minute)
    )
  ).protocols(httpProtocol)
    .assertions(
      // Response time assertions - more lenient for stress test
      global.responseTime.percentile1.lt(500),
      global.responseTime.percentile2.lt(750),
      global.responseTime.percentile3.lt(1000),
      global.responseTime.percentile4.lt(2000),
      global.responseTime.max.lt(10000),

      // Error rate assertions
      global.failedRequests.percent.lt(5),

      // Throughput assertions
      global.requestsPerSec.gt(50),

      // Specific endpoint assertions
      forAll.failedRequests.percent.lt(10)
    )

}

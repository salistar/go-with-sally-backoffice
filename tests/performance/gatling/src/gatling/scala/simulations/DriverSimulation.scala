package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

/**
 * GoWithSally - Driver Operations Load Test
 *
 * Tests driver-specific endpoints:
 * - POST /drivers/location - Update driver location
 * - GET /drivers/available-rides - Get available rides for driver
 * - POST /drivers/{id}/go-online - Go online
 * - POST /drivers/{id}/go-offline - Go offline
 * - GET /drivers/earnings - Get driver earnings
 * - GET /drivers/statistics - Get driver statistics
 * - POST /drivers/documents - Upload documents
 * - GET /drivers/vehicles - Get driver vehicles
 *
 * Scenarios:
 * 1. Location tracking (continuous updates)
 * 2. Available rides polling
 * 3. Online/offline management
 * 4. Earnings and statistics retrieval
 */
class DriverSimulation extends Simulation {

  val baseUrl = "http://localhost:5000/api"
  val driverToken = "test-driver-token"

  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/3.9.5")
    .shareConnections()
    .connectionTimeout(10 seconds)
    .requestTimeout(30 seconds)

  // Location coordinates for different cities in Morocco
  val locations = Array(
    Map("lat" -> "33.5731", "lon" -> "-7.5898", "city" -> "Casablanca"),
    Map("lat" -> "33.5890", "lon" -> "-7.5950", "city" -> "Casablanca-North"),
    Map("lat" -> "33.5600", "lon" -> "-7.6100", "city" -> "Casablanca-South"),
    Map("lat" -> "34.0209", "lon" -> "-6.8416", "city" -> "Rabat"),
    Map("lat" -> "35.7595", "lon" -> "-5.8330", "city" -> "Tangier"),
    Map("lat" -> "31.6295", "lon" -> "-7.9811", "city" -> "Marrakech")
  )

  // Feeder for location updates
  val locationFeeder = locations.circular

  // Setup
  val setup = exec(session => session.set("driverId", "test-driver-123"))

  // Update driver location (continuous tracking)
  val updateLocationChain = exec(
    http("Update Location")
      .post("/drivers/location")
      .header("Authorization", s"Bearer $${driverToken}")
      .body(StringBody(
        """{"latitude":"${lat}","longitude":"${lon}","heading":0,"speed":25,"accuracy":5,"bearing":45,"altitude":10}"""
      ))
      .check(status.in(200, 204))
      .check(responseTimeInMillis.saveAs("locUpdateTime"))
  )
    .pause(30 seconds)

  // Get available rides
  val getAvailableRidesChain = exec(
    http("Get Available Rides")
      .get("/drivers/available-rides")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.is(200))
      .check(jsonPath("$.data").optional.saveAs("ridesList"))
  )
    .pause(5 seconds)

  // Go online
  val goOnlineChain = exec(
    http("Go Online")
      .post("/drivers/${driverId}/go-online")
      .header("Authorization", s"Bearer $${driverToken}")
      .body(StringBody("""{"latitude":"${lat}","longitude":"${lon}"}"""))
      .check(status.in(200, 400))
  )
    .pause(1 second)

  // Go offline
  val goOfflineChain = exec(
    http("Go Offline")
      .post("/drivers/${driverId}/go-offline")
      .header("Authorization", s"Bearer $${driverToken}")
      .body(StringBody("""{"reason":"End of shift"}"""))
      .check(status.in(200, 400))
  )
    .pause(1 second)

  // Get driver earnings
  val getEarningsChain = exec(
    http("Get Daily Earnings")
      .get("/earnings/daily")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.is(200))
      .check(jsonPath("$.data.totalEarnings").optional.saveAs("dailyEarnings"))
      .check(jsonPath("$.data.ridesCompleted").optional.saveAs("ridesCount"))
  )
    .pause(500 milliseconds)

  // Get driver statistics
  val getStatisticsChain = exec(
    http("Get Driver Statistics")
      .get("/drivers/statistics")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.is(200))
      .check(jsonPath("$.data.acceptanceRate").optional.saveAs("acceptanceRate"))
      .check(jsonPath("$.data.averageRating").optional.saveAs("avgRating"))
  )
    .pause(500 milliseconds)

  // Get driver profile
  val getProfileChain = exec(
    http("Get Driver Profile")
      .get("/drivers/profile")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.is(200))
      .check(jsonPath("$.data.id").saveAs("driverId"))
      .check(jsonPath("$.data.status").saveAs("driverStatus"))
  )
    .pause(500 milliseconds)

  // Get vehicles
  val getVehiclesChain = exec(
    http("Get Driver Vehicles")
      .get("/vehicles")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.is(200))
      .check(jsonPath("$.data").optional.saveAs("vehicles"))
  )
    .pause(500 milliseconds)

  // Update vehicle location
  val updateVehicleLocationChain = feed(locationFeeder)
    .exec(
      http("Update Vehicle Location")
        .post("/drivers/location")
        .header("Authorization", s"Bearer $${driverToken}")
        .body(StringBody(
          """{"latitude":"${lat}","longitude":"${lon}","heading":0,"speed":35,"accuracy":5,"bearing":0,"altitude":0,"provider":"gps"}"""
        ))
        .check(status.in(200, 204))
    )
    .pause(30 seconds)

  // Get weekly earnings
  val getWeeklyEarningsChain = exec(
    http("Get Weekly Earnings")
      .get("/earnings/weekly")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.is(200))
      .check(jsonPath("$.data").optional.saveAs("weeklyStats"))
  )
    .pause(500 milliseconds)

  // Get monthly earnings
  val getMonthlyEarningsChain = exec(
    http("Get Monthly Earnings")
      .get("/earnings/monthly")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.is(200))
      .check(jsonPath("$.data").optional.saveAs("monthlyStats"))
  )
    .pause(500 milliseconds)

  // Get earnings breakdown
  val getEarningsBreakdownChain = exec(
    http("Get Earnings Breakdown")
      .get("/earnings/breakdown")
      .header("Authorization", s"Bearer $${driverToken}")
      .check(status.is(200))
      .check(jsonPath("$.data").optional.saveAs("breakdown"))
  )
    .pause(500 milliseconds)

  // Scenario 1: Driver shift with location updates
  val driverShiftScenario = scenario("Driver Shift")
    .setup
    .exec(goOnlineChain)
    .repeat(10) {
      exec(updateVehicleLocationChain)
        .exec(getAvailableRidesChain)
    }
    .exec(goOfflineChain)

  // Scenario 2: Driver statistics polling
  val driverStatsScenario = scenario("Driver Statistics Polling")
    .setup
    .repeat(20) {
      exec(getProfileChain)
        .exec(getEarningsChain)
        .exec(getStatisticsChain)
        .pause(2 seconds)
    }

  // Scenario 3: Earnings tracking
  val earningsTrackingScenario = scenario("Earnings Tracking")
    .setup
    .repeat(15) {
      exec(getEarningsChain)
        .exec(getWeeklyEarningsChain)
        .exec(getMonthlyEarningsChain)
        .exec(getEarningsBreakdownChain)
        .pause(3 seconds)
    }

  // Scenario 4: Continuous location tracking (high frequency)
  val locationTrackingScenario = scenario("Continuous Location Tracking")
    .setup
    .feed(locationFeeder)
    .repeat(30) {
      exec(updateLocationChain)
    }

  // Scenario 5: Available rides polling
  val ridesPollingScenario = scenario("Rides Polling")
    .setup
    .repeat(25) {
      exec(getAvailableRidesChain)
        .pause(3 seconds)
    }

  // Setup simulation
  setUp(
    driverShiftScenario.inject(
      nothingFor(10 seconds),
      rampUsers(15).during(2 minutes),
      constantUsersPerSec(1).during(8 minutes),
      rampDown(10).during(1 minute)
    ),
    driverStatsScenario.inject(
      nothingFor(2 minutes),
      constantUsersPerSec(2).during(5 minutes),
      rampDown(5).during(1 minute)
    ),
    earningsTrackingScenario.inject(
      nothingFor(3 minutes),
      constantUsersPerSec(1.5).during(4 minutes),
      rampDown(5).during(1 minute)
    ),
    locationTrackingScenario.inject(
      nothingFor(5 seconds),
      rampUsers(30).during(1 minute),
      constantUsersPerSec(2).during(5 minutes),
      rampDown(10).during(1 minute)
    ),
    ridesPollingScenario.inject(
      nothingFor(1 minute),
      constantUsersPerSec(1).during(6 minutes),
      rampDown(5).during(1 minute)
    )
  ).protocols(httpProtocol)
    .assertions(
      // Response time assertions
      global.responseTime.percentile1.lt(300),
      global.responseTime.percentile2.lt(400),
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

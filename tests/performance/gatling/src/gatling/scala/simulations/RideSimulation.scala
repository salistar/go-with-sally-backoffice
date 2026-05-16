package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import scala.util.Random

/**
 * GoWithSally - Ride Booking Flow Load Test
 *
 * Tests the following endpoints:
 * - POST /rides/request - Request a ride
 * - GET /rides/{id} - Get ride details
 * - GET /rides/nearest-drivers - Find nearest drivers
 * - POST /rides/{id}/accept - Accept ride (driver)
 * - POST /rides/{id}/start - Start ride
 * - POST /rides/{id}/complete - Complete ride
 * - POST /rides/{id}/cancel - Cancel ride
 * - POST /rides/{id}/rate - Rate ride
 *
 * Scenarios:
 * 1. Complete ride booking flow
 * 2. High-volume ride requests
 * 3. Driver acceptance and completion
 * 4. Cancellation scenarios
 */
class RideSimulation extends Simulation {

  // Configuration
  val baseUrl = "http://localhost:5000/api"
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

  // Feeder for ride data
  val locations = Array(
    ("33.5731", "-7.5898", "33.5865", "-7.6012", "Downtown Casablanca"),
    ("33.5890", "-7.5950", "33.6100", "-7.6200", "Casablanca to Rabat"),
    ("34.0209", "-6.8416", "34.0560", "-6.8600", "Rabat Central"),
    ("31.6295", "-7.9811", "31.6450", "-8.0100", "Marrakech"),
    ("35.7595", "-5.8330", "35.7900", "-5.8100", "Tangier")
  )

  val rideTypesFeeder = Array("economy", "premium", "shared").map(rt => Map("rideType" -> rt))

  // Session setup
  val setup = {
    exec(session => session.set("locationIndex", Random.nextInt(locations.length)))
      .exec(session => session.set("counter", 0))
  }

  // Get nearest drivers
  val getNearestDriversChain = exec(setup)
    .exec { session =>
      val index = session("locationIndex").as[Int]
      val (pickupLat, pickupLon, _, _, _) = locations(index)
      session
        .set("pickupLat", pickupLat)
        .set("pickupLon", pickupLon)
    }
    .exec(
      http("Get Nearest Drivers")
        .get(s"/rides/nearest-drivers?latitude=$${pickupLat}&longitude=$${pickupLon}&distance=5")
        .header("Authorization", s"Bearer $${token}")
        .check(status.in(200, 400))
        .check(jsonPath("$.data").optional.saveAs("drivers"))
    )
    .pause(500 milliseconds)

  // Request a ride
  val requestRideChain = exec { session =>
    val index = session("locationIndex").as[Int]
    val (pickupLat, pickupLon, dropoffLat, dropoffLon, description) = locations(index)
    session
      .set("pickupLat", pickupLat)
      .set("pickupLon", pickupLon)
      .set("dropoffLat", dropoffLat)
      .set("dropoffLon", dropoffLon)
      .set("locationDesc", description)
  }
    .exec(
      http("Request Ride")
        .post("/rides/request")
        .header("Authorization", s"Bearer $${token}")
        .body(StringBody(
          """{"pickupLocation":{"address":"${locationDesc}","latitude":${pickupLat},"longitude":${pickupLon}},"dropoffLocation":{"address":"Drop off point","latitude":${dropoffLat},"longitude":${dropoffLon}},"rideType":"economy","passengers":1,"notes":"Performance test ride","insuranceRequired":false}"""
        ))
        .check(status.in(200, 201))
        .check(jsonPath("$.data.id").saveAs("rideId"))
        .check(jsonPath("$.data.estimatedFare").saveAs("fare"))
        .check(responseTimeInMillis.saveAs("requestTime"))
    )
    .pause(1 second)

  // Get ride details
  val getRideDetailsChain = exec(
    http("Get Ride Details")
      .get("/rides/${rideId}")
      .header("Authorization", s"Bearer $${token}")
      .check(status.is(200))
      .check(jsonPath("$.data.id").is("${rideId}"))
      .check(jsonPath("$.data.status").saveAs("rideStatus"))
  )
    .pause(500 milliseconds)

  // Accept ride (driver perspective)
  val acceptRideChain = exec(
    http("Accept Ride")
      .post("/rides/${rideId}/accept")
      .header("Authorization", s"Bearer $${driverToken}")
      .body(StringBody("""{"driverId":"test-driver-123"}"""))
      .check(status.in(200, 400))
  )
    .pause(1 second)

  // Start ride
  val startRideChain = exec(
    http("Start Ride")
      .post("/rides/${rideId}/start")
      .header("Authorization", s"Bearer $${driverToken}")
      .body(StringBody("""{"latitude":${pickupLat},"longitude":${pickupLon}}"""))
      .check(status.in(200, 400))
  )
    .pause(2 seconds)

  // Complete ride
  val completeRideChain = exec(
    http("Complete Ride")
      .post("/rides/${rideId}/complete")
      .header("Authorization", s"Bearer $${driverToken}")
      .body(StringBody("""{"latitude":${dropoffLat},"longitude":${dropoffLon},"distance":5.2,"duration":600}"""))
      .check(status.in(200, 400))
  )
    .pause(1 second)

  // Rate ride
  val rateRideChain = exec(
    http("Rate Ride")
      .post("/rides/${rideId}/rate")
      .header("Authorization", s"Bearer $${token}")
      .body(StringBody("""{"rating":5,"comment":"Great ride!","categories":{"cleanliness":5,"driving":5,"communication":5}}"""))
      .check(status.in(200, 400))
  )
    .pause(500 milliseconds)

  // Cancel ride
  val cancelRideChain = exec(
    http("Cancel Ride")
      .post("/rides/${rideId}/cancel")
      .header("Authorization", s"Bearer $${token}")
      .body(StringBody("""{"reason":"User requested cancellation"}"""))
      .check(status.in(200, 400))
  )
    .pause(500 milliseconds)

  // Scenario 1: Complete happy path
  val completeRideFlowScenario = scenario("Complete Ride Flow")
    .setup
    .exec(requestRideChain)
    .exec(getRideDetailsChain)
    .pause(2 seconds)
    .exec(acceptRideChain)
    .exec(startRideChain)
    .exec(completeRideChain)
    .exec(rateRideChain)

  // Scenario 2: High-volume ride requests (without acceptance)
  val rideRequestStressScenario = scenario("Ride Request Stress")
    .repeat(20) {
      exec(requestRideChain)
        .pause(500 milliseconds)
    }

  // Scenario 3: Get nearest drivers (location search)
  val nearestDriversScenario = scenario("Nearest Drivers Search")
    .repeat(15) {
      exec(getNearestDriversChain)
        .pause(1 second)
    }

  // Scenario 4: Cancellation flow
  val cancellationScenario = scenario("Ride Cancellation")
    .exec(requestRideChain)
    .pause(2 seconds)
    .exec(cancelRideChain)

  // Scenario 5: Driver workflow
  val driverWorkflowScenario = scenario("Driver Workflow")
    .exec(requestRideChain)
    .pause(1 second)
    .exec(acceptRideChain)
    .pause(2 seconds)
    .exec(startRideChain)
    .pause(3 seconds)
    .exec(completeRideChain)

  // Setup simulation
  setUp(
    completeRideFlowScenario.inject(
      nothingFor(10 seconds),
      rampUsers(20).during(2 minutes),
      constantUsersPerSec(1).during(5 minutes),
      rampDown(10).during(1 minute)
    ),
    rideRequestStressScenario.inject(
      nothingFor(2 minutes),
      constantUsersPerSec(2).during(3 minutes),
      rampDown(5).during(1 minute)
    ),
    nearestDriversScenario.inject(
      nothingFor(1 minute),
      constantUsersPerSec(1.5).during(3 minutes),
      rampDown(5).during(1 minute)
    ),
    cancellationScenario.inject(
      nothingFor(3 minutes),
      constantUsersPerSec(0.5).during(2 minutes)
    ),
    driverWorkflowScenario.inject(
      nothingFor(4 minutes),
      constantUsersPerSec(0.3).during(3 minutes)
    )
  ).protocols(httpProtocol)
    .assertions(
      // Response time assertions
      global.responseTime.percentile1.lt(250),
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

package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import scala.util.Random

/**
 * GoWithSally - End-to-End User Journey Simulation
 *
 * Complete user scenarios from signup to ride completion:
 *
 * User Journey:
 * 1. Register new account
 * 2. Verify email/phone
 * 3. Complete profile
 * 4. Browse available services
 * 5. Request a ride
 * 6. Select pickup/dropoff
 * 7. Wait for driver
 * 8. Track ride in real-time
 * 9. Rate and review ride
 * 10. Check wallet/earnings
 *
 * Driver Journey:
 * 1. Register as driver
 * 2. Complete verification
 * 3. Add vehicle information
 * 4. Go online
 * 5. Accept incoming rides
 * 6. Track to pickup location
 * 7. Arrive and notify user
 * 8. Complete ride
 * 9. Check earnings
 * 10. Go offline
 *
 * Load Scenarios:
 * - Normal load: 10-100 users over 2 minutes
 * - Sustained load: 5 minutes at peak
 * - Mixed user/driver ratio: 80/20 split
 */
class EndToEndSimulation extends Simulation {

  val baseUrl = "http://localhost:5000/api"
  val random = new Random()

  val httpProtocol = http
    .baseUrl(baseUrl)
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/3.9.5")
    .shareConnections()
    .connectionTimeout(10 seconds)
    .requestTimeout(30 seconds)

  // ============================================================================
  // User Journey Chains
  // ============================================================================

  val userRegistration = exec(session => {
    val counter = session("counter").validate[Int](i => i + 1).getOrElse(0)
    session
      .set("counter", counter)
      .set("email", s"user${counter}@gowithsally.ma")
      .set("phone", s"+2126${String.format("%08d", counter)}")
  })
    .exec(
      http("User Register")
        .post("/auth/register")
        .body(StringBody("""{"firstName":"TestUser","lastName":"${counter}","email":"${email}","phone":"${phone}","password":"TestPass@2024","dateOfBirth":"1990-01-15","role":"user"}"""))
        .check(status.in(200, 201))
        .check(jsonPath("$.data.token").saveAs("userToken"))
        .check(jsonPath("$.data.user.id").saveAs("userId"))
    )
    .pause(1 second)

  val userProfileSetup = exec(
    http("User Update Profile")
      .put("/users/profile")
      .header("Authorization", "Bearer ${userToken}")
      .body(StringBody("""{"firstName":"TestUser","lastName":"Profile","emergencyContact":"0612345678","address":"123 Rue Test, Casablanca"}"""))
      .check(status.in(200, 400))
  )
    .pause(500 milliseconds)

  val userBrowseServices = repeat(3) {
    exec(
      http("Browse Services")
        .get("/services")
        .header("Authorization", "Bearer ${userToken}")
        .check(status.is(200))
    )
      .pause(1 second)
  }

  val userRideRequest = exec(session => {
    val pickupLat = 33.5731 + (random.nextDouble() * 0.05)
    val pickupLon = -7.5898 + (random.nextDouble() * 0.05)
    val dropoffLat = 34.0209 + (random.nextDouble() * 0.05)
    val dropoffLon = -6.8416 + (random.nextDouble() * 0.05)
    session
      .set("pickupLat", pickupLat)
      .set("pickupLon", pickupLon)
      .set("dropoffLat", dropoffLat)
      .set("dropoffLon", dropoffLon)
  })
    .exec(
      http("Request Ride")
        .post("/rides/request")
        .header("Authorization", "Bearer ${userToken}")
        .body(StringBody("""{"pickupLocation":{"address":"Pickup Point","latitude":${pickupLat},"longitude":${pickupLon}},"dropoffLocation":{"address":"Drop-off Point","latitude":${dropoffLat},"longitude":${dropoffLon}},"rideType":"economy","passengers":1}"""))
        .check(status.in(200, 201))
        .check(jsonPath("$.data.id").saveAs("rideId"))
        .check(jsonPath("$.data.estimatedFare").saveAs("fare"))
    )
    .pause(2 seconds)

  val userTrackRide = repeat(5) {
    exec(
      http("Track Ride Progress")
        .get("/rides/${rideId}")
        .header("Authorization", "Bearer ${userToken}")
        .check(status.is(200))
        .check(jsonPath("$.data.status").saveAs("rideStatus"))
    )
      .pause(3 seconds)
  }

  val userRateRide = exec(
    http("Rate Ride")
      .post("/rides/${rideId}/rate")
      .header("Authorization", "Bearer ${userToken}")
      .body(StringBody("""{"rating":5,"comment":"Excellent service!","categories":{"cleanliness":5,"driving":5,"communication":5},"wouldRecommend":true}"""))
      .check(status.in(200, 400))
  )
    .pause(1 second)

  val userCheckWallet = exec(
    http("Check Wallet")
      .get("/wallet")
      .header("Authorization", "Bearer ${userToken}")
      .check(status.is(200))
      .check(jsonPath("$.data.balance").optional.saveAs("walletBalance"))
  )
    .pause(500 milliseconds)

  // Full user journey
  val userJourney = scenario("User Complete Journey")
    .exec(userRegistration)
    .exec(userProfileSetup)
    .exec(userBrowseServices)
    .exec(userRideRequest)
    .exec(userTrackRide)
    .exec(userRateRide)
    .exec(userCheckWallet)

  // ============================================================================
  // Driver Journey Chains
  // ============================================================================

  val driverRegistration = exec(session => {
    val counter = session("counter").validate[Int](i => i + 1).getOrElse(0)
    session
      .set("counter", counter)
      .set("driverEmail", s"driver${counter}@gowithsally.ma")
      .set("driverPhone", s"+2126${String.format("%08d", counter + 1000)}")
      .set("driverId", s"driver-${counter}")
  })
    .exec(
      http("Driver Register")
        .post("/auth/register")
        .body(StringBody("""{"firstName":"DriverTest","lastName":"${counter}","email":"${driverEmail}","phone":"${driverPhone}","password":"DriverPass@2024","dateOfBirth":"1985-01-15","role":"driver"}"""))
        .check(status.in(200, 201))
        .check(jsonPath("$.data.token").saveAs("driverToken"))
        .check(jsonPath("$.data.user.id").saveAs("driverId"))
    )
    .pause(1 second)

  val driverDocumentUpload = exec(
    http("Upload Driver Documents")
      .post("/drivers/documents")
      .header("Authorization", "Bearer ${driverToken}")
      .body(StringBody("""{"documentType":"license","documentNumber":"ABC123456","expiryDate":"2025-12-31","issuingCountry":"MA"}"""))
      .check(status.in(200, 201, 400))
  )
    .pause(500 milliseconds)

  val driverVehicleInfo = exec(
    http("Add Vehicle Information")
      .post("/vehicles")
      .header("Authorization", "Bearer ${driverToken}")
      .body(StringBody("""{"make":"Toyota","model":"Corolla","year":2022,"licensePlate":"AA-12345","color":"Silver","seatingCapacity":5,"insuranceExpiry":"2025-12-31"}"""))
      .check(status.in(200, 201, 400))
      .check(jsonPath("$.data.id").optional.saveAs("vehicleId"))
  )
    .pause(500 milliseconds)

  val driverGoOnline = exec(session => {
    val lat = 33.5731 + (random.nextDouble() * 0.1)
    val lon = -7.5898 + (random.nextDouble() * 0.1)
    session
      .set("driverLat", lat)
      .set("driverLon", lon)
  })
    .exec(
      http("Driver Go Online")
        .post("/drivers/${driverId}/go-online")
        .header("Authorization", "Bearer ${driverToken}")
        .body(StringBody("""{"latitude":${driverLat},"longitude":${driverLon}}"""))
        .check(status.in(200, 400))
    )
    .pause(1 second)

  val driverPollRides = repeat(5) {
    exec(
      http("Poll Available Rides")
        .get("/drivers/available-rides")
        .header("Authorization", "Bearer ${driverToken}")
        .check(status.is(200))
    )
      .pause(3 seconds)
  }

  val driverUpdateLocation = repeat(3) {
    exec(session => {
      val lat = session("driverLat").as[Double] + (random.nextDouble() * 0.01)
      val lon = session("driverLon").as[Double] + (random.nextDouble() * 0.01)
      session
        .set("driverLat", lat)
        .set("driverLon", lon)
    })
      .exec(
        http("Update Driver Location")
          .post("/drivers/location")
          .header("Authorization", "Bearer ${driverToken}")
          .body(StringBody("""{"latitude":${driverLat},"longitude":${driverLon},"heading":0,"speed":35,"accuracy":5}"""))
          .check(status.in(200, 204))
      )
      .pause(5 seconds)
  }

  val driverCheckEarnings = exec(
    http("Check Daily Earnings")
      .get("/earnings/daily")
      .header("Authorization", "Bearer ${driverToken}")
      .check(status.is(200))
      .check(jsonPath("$.data.totalEarnings").optional.saveAs("earnings"))
  )
    .pause(500 milliseconds)

  val driverGoOffline = exec(
    http("Driver Go Offline")
      .post("/drivers/${driverId}/go-offline")
      .header("Authorization", "Bearer ${driverToken}")
      .body(StringBody("""{"reason":"End of shift"}"""))
      .check(status.in(200, 400))
  )
    .pause(500 milliseconds)

  // Full driver journey
  val driverJourney = scenario("Driver Complete Journey")
    .exec(driverRegistration)
    .exec(driverDocumentUpload)
    .exec(driverVehicleInfo)
    .exec(driverGoOnline)
    .exec(driverPollRides)
    .exec(driverUpdateLocation)
    .exec(driverCheckEarnings)
    .exec(driverGoOffline)

  // ============================================================================
  // Mixed User Scenarios
  // ============================================================================

  val frequentUserScenario = scenario("Frequent User")
    .repeat(3) {
      exec(
        http("User Login")
          .post("/auth/login")
          .body(StringBody("""{"email":"sara.user@gmail.com","password":"User@2024"}"""))
          .check(status.is(200))
          .check(jsonPath("$.data.token").saveAs("userToken"))
      )
        .pause(1 second)
        .exec(
          http("Request Multiple Rides")
            .post("/rides/request")
            .header("Authorization", "Bearer ${userToken}")
            .body(StringBody("""{"pickupLocation":{"address":"Location A","latitude":33.5731,"longitude":-7.5898},"dropoffLocation":{"address":"Location B","latitude":34.0209,"longitude":-6.8416},"rideType":"economy"}"""))
            .check(status.in(200, 201))
        )
        .pause(2 seconds)
    }

  val adminActionsScenario = scenario("Admin Activities")
    .exec(
      http("Admin Login")
        .post("/auth/login")
        .body(StringBody("""{"email":"admin@gowithsally.ma","password":"Admin@2024"}"""))
        .check(status.is(200))
        .check(jsonPath("$.data.token").saveAs("adminToken"))
    )
    .pause(1 second)
    .repeat(5) {
      exec(
        http("Get Platform Statistics")
          .get("/admin/statistics")
          .header("Authorization", "Bearer ${adminToken}")
          .check(status.in(200, 400))
      )
        .pause(2 seconds)
    }

  // ============================================================================
  // Setup Simulation
  // ============================================================================

  setUp(
    userJourney.inject(
      nothingFor(10 seconds),
      rampUsers(40).during(2 minutes),
      constantUsersPerSec(2).during(5 minutes),
      rampDown(20).during(1 minute)
    ),
    driverJourney.inject(
      nothingFor(15 seconds),
      rampUsers(10).during(2 minutes),
      constantUsersPerSec(0.5).during(5 minutes),
      rampDown(5).during(1 minute)
    ),
    frequentUserScenario.inject(
      nothingFor(2 minutes),
      constantUsersPerSec(1).during(6 minutes),
      rampDown(5).during(1 minute)
    ),
    adminActionsScenario.inject(
      nothingFor(3 minutes),
      constantUsersPerSec(0.2).during(5 minutes)
    )
  ).protocols(httpProtocol)
    .assertions(
      // Overall response time assertions
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

      // Specific scenario assertions
      forAll.responseTime.percentile3.lt(500),
      forAll.failedRequests.percent.lt(1),

      // Successful request rate
      details("Request Ride").successfulRequests.percent.gte(95),
      details("Track Ride Progress").successfulRequests.percent.gte(98)
    )

}

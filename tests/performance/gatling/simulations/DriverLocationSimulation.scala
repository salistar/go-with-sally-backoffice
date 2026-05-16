package gowithsally.simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._
import scala.util.Random

class DriverLocationSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://localhost:5000")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/Performance-Test")
    .disableCaching

  val random = new Random()

  def randomLatitude(): Double = 33.9 + (random.nextDouble() * 0.2)
  def randomLongitude(): Double = -6.9 + (random.nextDouble() * 0.2)

  val driverLocationUpdates = scenario("Driver Location Updates")
    // Login as driver
    .exec(http("Driver Login")
      .post("/api/auth/login")
      .body(StringBody("""{"email":"driver@test.com","password":"test1234"}"""))
      .check(status.is(200))
      .check(jsonPath("$.token").saveAs("token"))
    )
    // Set online status
    .exec(http("Set Online Status")
      .put("/api/drivers/status")
      .header("Authorization", "Bearer ${token}")
      .body(StringBody("""{"status":"ONLINE"}"""))
      .check(status.is(200))
    )
    // Continuous location updates every 5 seconds
    .repeat(10) {
      exec(http("Update Driver Location")
        .post("/api/rides/location/update")
        .header("Authorization", "Bearer ${token}")
        .body(StringBody(
          s"""{
            "latitude":${randomLatitude()},
            "longitude":${randomLongitude()}
          }"""
        ))
        .check(status.is(200))
      )
      .pause(5 seconds)
    }
    // Get driver statistics
    .exec(http("Get Driver Statistics")
      .get("/api/drivers/statistics")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
    )
    // Get driver earnings
    .exec(http("Get Driver Earnings")
      .get("/api/drivers/earnings?period=month")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
    )
    // Get pending rides
    .exec(http("Get Pending Rides")
      .get("/api/drivers/pending-rides")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
    )

  setUp(
    driverLocationUpdates.inject(
      nothingFor(2 seconds),
      atOnceUsers(20),
      rampUsers(30) during (30 seconds),
      constantUsersPerSec(10) during (120 seconds)
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.max.lt(1500),
      global.responseTime.mean.lt(600),
      global.successfulRequests.percent.gt(95),
      forAll.responseTime.percentile1.lt(900),
      forAll.responseTime.percentile2.lt(1200)
    )
}

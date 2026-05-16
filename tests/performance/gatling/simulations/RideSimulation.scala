package gowithsally.simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class RideSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://localhost:5000")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/Performance-Test")
    .disableCaching

  val rideScenario = scenario("Ride Creation and Management")
    // Login first
    .exec(http("Login")
      .post("/api/auth/login")
      .body(StringBody("""{"email":"user@test.com","password":"test1234"}"""))
      .check(status.is(200))
      .check(jsonPath("$.token").saveAs("token"))
    )
    // Create ride request
    .exec(http("Create Ride Request")
      .post("/api/rides/request")
      .header("Authorization", "Bearer ${token}")
      .body(StringBody("""
        {
          "pickupLocation":{"latitude":33.9716,"longitude":-6.8498,"address":"Casablanca"},
          "dropoffLocation":{"latitude":33.5731,"longitude":-7.5898,"address":"Marrakech"},
          "rideType":"economy"
        }
      """))
      .check(status.is(201))
      .check(jsonPath("$.ride.id").saveAs("rideId"))
    )
    // Find available drivers
    .exec(http("Find Available Drivers")
      .get("/api/rides/find-drivers?latitude=33.9716&longitude=-6.8498&radius=5")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
      .check(jsonPath("$.drivers[0].id").saveAs("driverId"))
    )
    // Get ride details
    .exec(http("Get Ride Details")
      .get("/api/rides/${rideId}")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
      .check(jsonPath("$.ride.status").is("WAITING_FOR_DRIVER"))
    )
    // Get user ride history
    .exec(http("Get Ride History")
      .get("/api/rides/history?limit=10&offset=0")
      .header("Authorization", "Bearer ${token}")
      .check(status.is(200))
      .check(jsonPath("$.rides").ofType[Seq[Any]].count.gte(0))
    )

  setUp(
    rideScenario.inject(
      nothingFor(3 seconds),
      atOnceUsers(5),
      rampUsers(15) during (30 seconds),
      constantUsersPerSec(3) during (60 seconds),
      rampUsersPerSec(1, 3) during (60 seconds),
      constantUsersPerSec(2) during (30 seconds)
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.max.lt(2000),
      global.responseTime.mean.lt(800),
      global.successfulRequests.percent.gt(90),
      forAll.responseTime.percentile1.lt(1500),
      forAll.responseTime.percentile2.lt(1800)
    )
}

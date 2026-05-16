package gowithsally.simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import scala.concurrent.duration._

class LoginSimulation extends Simulation {

  val httpProtocol = http
    .baseUrl("http://localhost:5000")
    .acceptHeader("application/json")
    .contentTypeHeader("application/json")
    .userAgentHeader("Gatling/Performance-Test")
    .disableCaching

  val loginUsers = repeat(100) {
    feed(csv("users.csv").random) // Load users from CSV file
      .exec(http("Login")
        .post("/api/auth/login")
        .body(StringBody("""{"email":"${email}","password":"${password}"}"""))
        .check(status.is(200))
        .check(jsonPath("$.token").exists)
        .check(headerRegex("Set-Cookie", ".*").saveAs("setCookie"))
      )
  }

  val loginScenario = scenario("Login Simulation")
    .exec(loginUsers)

  setUp(
    loginScenario.inject(
      nothingFor(2 seconds),
      atOnceUsers(10),
      rampUsers(20) during (30 seconds),
      constantUsersPerSec(5) during (60 seconds),
      rampUsersPerSec(1, 5) during (60 seconds)
    )
  ).protocols(httpProtocol)
    .assertions(
      global.responseTime.max.lt(1000),
      global.responseTime.mean.lt(500),
      global.successfulRequests.percent.gt(95),
      forAll.responseTime.percentile1.lt(700)
    )
}

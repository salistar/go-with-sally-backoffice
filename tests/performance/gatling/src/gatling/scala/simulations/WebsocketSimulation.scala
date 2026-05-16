package simulations

import io.gatling.core.Predef._
import io.gatling.http.Predef._
import io.gatling.core.body.StringBody
import scala.concurrent.duration._

/**
 * GoWithSally - WebSocket/Socket.IO Performance Test
 *
 * Tests real-time communication:
 * - Driver location updates (Socket.IO)
 * - Ride notifications (Socket.IO)
 * - Chat messages (Socket.IO)
 * - Driver-Passenger real-time communication
 *
 * Scenarios:
 * 1. Driver location broadcasting
 * 2. Ride status notifications
 * 3. Chat message exchange
 * 4. Combined real-time operations
 */
class WebsocketSimulation extends Simulation {

  val baseUrl = "http://localhost:5000"
  val wsBaseUrl = "ws://localhost:5000"
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

  // Setup session
  val setup = exec(session => session
    .set("driverId", "driver-123")
    .set("userId", "user-123")
    .set("rideId", "ride-123")
  )

  // ============================================================================
  // Driver Location Broadcasting
  // ============================================================================

  val driverLocationWebsocketScenario = scenario("Driver Location WebSocket")
    .setup
    .exec(
      ws("Connect Driver WS")
        .connect(s"$${wsBaseUrl}/socket.io/?token=$${driverToken}&type=driver")
    )
    .pause(1 second)
    .repeat(10) {
      exec(
        ws("Broadcast Location")
          .sendText("""{"event":"location_update","data":{"latitude":33.5731,"longitude":-7.5898,"heading":0,"speed":35}}""")
      )
        .pause(5 seconds)
    }
    .exec(
      ws("Close Driver WS")
        .close()
    )

  // ============================================================================
  // Ride Status Notifications
  // ============================================================================

  val rideNotificationsScenario = scenario("Ride Notifications")
    .setup
    .exec(
      ws("Connect User WS")
        .connect(s"$${wsBaseUrl}/socket.io/?token=$${userToken}&type=user")
    )
    .pause(1 second)
    .exec(
      ws("Receive Driver Accepted")
        .sendText("""{"event":"ride_accepted","data":{"driverId":"driver-123","driverName":"Ahmed","rideId":"ride-123"}}""")
    )
    .pause(2 seconds)
    .exec(
      ws("Receive Driver Arrived")
        .sendText("""{"event":"driver_arrived","data":{"rideId":"ride-123","eta":2}}""")
    )
    .pause(3 seconds)
    .exec(
      ws("Receive Ride Started")
        .sendText("""{"event":"ride_started","data":{"rideId":"ride-123"}}""")
    )
    .pause(5 seconds)
    .exec(
      ws("Receive Ride Completed")
        .sendText("""{"event":"ride_completed","data":{"rideId":"ride-123","finalFare":125.50}}""")
    )
    .pause(1 second)
    .exec(
      ws("Close User WS")
        .close()
    )

  // ============================================================================
  // Chat Messages
  // ============================================================================

  val chatScenario = scenario("Chat Messages")
    .setup
    .exec(
      ws("Connect Chat WS")
        .connect(s"$${wsBaseUrl}/socket.io/?token=$${userToken}&type=chat")
    )
    .pause(1 second)
    .repeat(10) {
      exec(
        ws("Send Chat Message")
          .sendText("""{"event":"send_message","data":{"conversationId":"ride-123","message":"Hello driver, are you close?","timestamp":"2024-03-17T12:00:00Z"}}""")
      )
        .pause(3 seconds)
        .exec(
          ws("Receive Chat Message")
            .sendText("""{"event":"receive_message","data":{"conversationId":"ride-123","senderId":"driver-123","message":"Yes, arriving in 2 minutes!","timestamp":"2024-03-17T12:00:05Z"}}""")
        )
        .pause(2 seconds)
    }
    .exec(
      ws("Close Chat WS")
        .close()
    )

  // ============================================================================
  // Real-time Driver Tracking
  // ============================================================================

  val realtimeTrackingScenario = scenario("Real-time Tracking")
    .setup
    .exec(
      ws("Connect Tracking WS")
        .connect(s"$${wsBaseUrl}/socket.io/?token=$${userToken}&type=tracking")
    )
    .pause(1 second)
    .repeat(15) {
      exec(
        ws("Receive Location Update")
          .sendText("""{"event":"driver_location","data":{"rideId":"ride-123","driverId":"driver-123","latitude":33.5731,"longitude":-7.5898,"heading":45,"speed":35}}""")
      )
        .pause(2 seconds)
    }
    .exec(
      ws("Close Tracking WS")
        .close()
    )

  // ============================================================================
  // Combined Real-time Operations
  // ============================================================================

  val combinedRealtimeScenario = scenario("Combined Real-time Operations")
    .setup
    .exec(
      ws("Connect Main WS")
        .connect(s"$${wsBaseUrl}/socket.io/?token=$${userToken}&type=all")
    )
    .pause(1 second)
    // Receive ride acceptance
    .exec(
      ws("Event 1: Ride Accepted")
        .sendText("""{"event":"ride_accepted","data":{"driverId":"driver-123"}}""")
    )
    .pause(1 second)
    // Receive location update
    .exec(
      ws("Event 2: Location Update")
        .sendText("""{"event":"driver_location","data":{"latitude":33.5731,"longitude":-7.5898}}""")
    )
    .pause(1 second)
    // Send chat message
    .exec(
      ws("Event 3: Send Message")
        .sendText("""{"event":"send_message","data":{"message":"I'm on my way"}}""")
    )
    .pause(1 second)
    // Receive driver arrived
    .exec(
      ws("Event 4: Driver Arrived")
        .sendText("""{"event":"driver_arrived","data":{"eta":0}}""")
    )
    .pause(2 seconds)
    // Receive ride started
    .exec(
      ws("Event 5: Ride Started")
        .sendText("""{"event":"ride_started","data":{"rideId":"ride-123"}}""")
    )
    .pause(5 seconds)
    // Continuous location updates
    .repeat(5) {
      exec(
        ws("Event 6: Location Updates")
          .sendText("""{"event":"driver_location","data":{"latitude":33.5900,"longitude":-7.6100}}""")
      )
        .pause(3 seconds)
    }
    // Receive ride completed
    .exec(
      ws("Event 7: Ride Completed")
        .sendText("""{"event":"ride_completed","data":{"finalFare":125.50}}""")
    )
    .pause(1 second)
    .exec(
      ws("Close Main WS")
        .close()
    )

  // ============================================================================
  // High-frequency Location Updates
  // ============================================================================

  val highFrequencyLocationScenario = scenario("High-Frequency Location Updates")
    .setup
    .exec(
      ws("Connect Location WS")
        .connect(s"$${wsBaseUrl}/socket.io/?token=$${driverToken}&type=location")
    )
    .pause(1 second)
    .repeat(50) {
      exec(
        ws("Send Location")
          .sendText("""{"event":"location_update","data":{"latitude":33.5731,"longitude":-7.5898,"speed":35}}""")
      )
        .pause(1 second)
    }
    .exec(
      ws("Close Location WS")
        .close()
    )

  // Setup simulation with more lenient assertions for WebSocket
  setUp(
    driverLocationWebsocketScenario.inject(
      nothingFor(10 seconds),
      rampUsers(20).during(1 minute),
      constantUsersPerSec(1).during(3 minutes),
      rampDown(10).during(1 minute)
    ),
    rideNotificationsScenario.inject(
      nothingFor(2 minutes),
      constantUsersPerSec(2).during(3 minutes),
      rampDown(5).during(1 minute)
    ),
    chatScenario.inject(
      nothingFor(1 minute),
      constantUsersPerSec(1.5).during(4 minutes),
      rampDown(5).during(1 minute)
    ),
    realtimeTrackingScenario.inject(
      nothingFor(3 minutes),
      rampUsers(30).during(1 minute),
      constantUsersPerSec(2).during(3 minutes),
      rampDown(10).during(1 minute)
    ),
    combinedRealtimeScenario.inject(
      nothingFor(30 seconds),
      rampUsers(25).during(2 minutes),
      constantUsersPerSec(1.5).during(3 minutes),
      rampDown(10).during(1 minute)
    ),
    highFrequencyLocationScenario.inject(
      nothingFor(5 minutes),
      rampUsers(40).during(1 minute),
      constantUsersPerSec(2).during(4 minutes),
      rampDown(15).during(1 minute)
    )
  ).protocols(httpProtocol)
    .assertions(
      // WebSocket connection assertions
      global.responseTime.percentile3.lt(1000),
      global.responseTime.max.lt(10000),

      // More lenient error rates for WebSocket due to connection nature
      global.failedRequests.percent.lt(5),
      global.successfulRequests.percent.gt(95),

      // Throughput assertions
      global.requestsPerSec.gt(50)
    )

}

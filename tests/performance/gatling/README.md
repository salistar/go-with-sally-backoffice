# GoWithSally - Gatling Performance Tests

Comprehensive performance testing suite for the GoWithSally ride-hailing application using Gatling.

## Overview

This test suite provides realistic load testing, stress testing, and performance profiling for all major GoWithSally API endpoints and real-time Socket.IO connections.

## Test Simulations

### 1. AuthSimulation
Tests authentication and user verification endpoints with various load patterns.

**Endpoints Tested:**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/refresh-token` - Token refresh
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Password reset
- `POST /auth/verify-code` - Code verification

**Scenarios:**
- Authentication Flow (10-100 users over 2 minutes)
- Login Stress Test (continuous login attempts)
- Registration Stress Test
- Password Recovery Flow

**Run Command:**
```bash
./gradlew runAuthSimulation
```

### 2. RideSimulation
Tests complete ride booking workflow and driver operations.

**Endpoints Tested:**
- `POST /rides/request` - Request a ride
- `GET /rides/{id}` - Get ride details
- `GET /rides/nearest-drivers` - Find nearest drivers
- `POST /rides/{id}/accept` - Accept ride (driver)
- `POST /rides/{id}/start` - Start ride
- `POST /rides/{id}/complete` - Complete ride
- `POST /rides/{id}/cancel` - Cancel ride
- `POST /rides/{id}/rate` - Rate ride

**Scenarios:**
- Complete Ride Flow (full user journey)
- Ride Request Stress (high-volume requests)
- Nearest Drivers Search
- Ride Cancellation Flow
- Driver Workflow

**Run Command:**
```bash
./gradlew runRideSimulation
```

### 3. DriverSimulation
Tests driver-specific operations including location tracking and earnings.

**Endpoints Tested:**
- `POST /drivers/location` - Update driver location
- `GET /drivers/available-rides` - Get available rides
- `POST /drivers/{id}/go-online` - Go online
- `POST /drivers/{id}/go-offline` - Go offline
- `GET /earnings/daily` - Daily earnings
- `GET /earnings/weekly` - Weekly earnings
- `GET /earnings/monthly` - Monthly earnings
- `GET /drivers/statistics` - Driver statistics
- `GET /drivers/vehicles` - Driver vehicles

**Scenarios:**
- Driver Shift with location updates
- Driver Statistics Polling
- Earnings Tracking
- Continuous Location Tracking (high frequency)
- Available Rides Polling

**Run Command:**
```bash
./gradlew runDriverSimulation
```

### 4. ApiStressTest
Comprehensive stress testing of all API endpoints simultaneously.

**Test Types:**
- Spike Test: Sudden surge from 10 to 200 users
- Soak Test: Low load (0.5 users) sustained for 10+ minutes
- Driver Stress: High driver operation load
- Comprehensive Stress: All endpoints under heavy load

**Run Command:**
```bash
./gradlew runStressTest
```

### 5. WebsocketSimulation
Tests real-time Socket.IO connections for live updates.

**Endpoints Tested:**
- Driver location broadcasting
- Ride status notifications
- Chat messages
- Real-time tracking

**Scenarios:**
- Driver Location WebSocket
- Ride Notifications
- Chat Messages
- Real-time Tracking
- Combined Real-time Operations
- High-frequency Location Updates

**Run Command:**
```bash
./gradlew runWebsocketSimulation
```

### 6. EndToEndSimulation
Complete user and driver journey simulations representing real usage patterns.

**User Journey:**
1. Register and verify account
2. Complete profile setup
3. Browse services
4. Request ride
5. Track ride progress
6. Rate and review
7. Check wallet

**Driver Journey:**
1. Register as driver
2. Upload documents
3. Add vehicle info
4. Go online
5. Poll for available rides
6. Update location
7. Check earnings
8. Go offline

**Run Command:**
```bash
./gradlew runEndToEndSimulation
```

## Configuration

### Base URL and Authentication

Edit `src/gatling/resources/gatling.conf`:

```hocon
app {
  baseUrl = "http://localhost:5000/api"

  auth {
    adminUser = "admin@gowithsally.ma"
    adminPassword = "Admin@2024"
    regularUser = "sara.user@gmail.com"
    regularPassword = "User@2024"
  }
}
```

### Performance Thresholds

Default assertions are configured in each simulation:

- **Response Time (p95):** < 500ms
- **Response Time (p99):** < 1000ms
- **Error Rate:** < 1%
- **Throughput:** > 100 req/s

Modify thresholds in the `assertions` section of each simulation file.

### JVM Configuration

Heap size and GC settings in `build.gradle`:

```gradle
gatling {
  jvmArgs = [
    '-server',
    '-Xmx2g',     // Increase heap if testing > 500 concurrent users
    '-Xms512m',
    '-XX:+UseG1GC'
  ]
}
```

## Running Tests

### Prerequisites

- Java 11+
- Gradle 6.0+
- Running GoWithSally backend on `http://localhost:5000`

### Single Simulation

```bash
# Run specific simulation
./gradlew runAuthSimulation
./gradlew runRideSimulation
./gradlew runDriverSimulation
./gradlew runStressTest
./gradlew runWebsocketSimulation
./gradlew runEndToEndSimulation
```

### All Simulations

```bash
./gradlew gatlingRun
```

### Custom Simulation Class

```bash
./gradlew gatlingRun -Dgatling.simulationClass=simulations.AuthSimulation
```

### With Custom JVM Args

```bash
./gradlew gatlingRun -Dgatling.jvmArgs="-Xmx4g -XX:+UseG1GC"
```

## Results

Test results are generated in:
```
build/reports/gatling/
```

Each test run creates a timestamped directory with:
- `index.html` - Interactive HTML report
- `simulation.log` - Raw simulation data
- JSON results for CI/CD integration

### Viewing Results

```bash
# Open HTML report
open build/reports/gatling/[timestamp]/index.html
```

## Load Profile Examples

### Light Load (Development Testing)
```scala
setUp(
  scenario.inject(
    rampUsers(10).during(1 minute),
    constantUsersPerSec(1).during(2 minutes)
  )
)
```

### Normal Load (Staging Testing)
```scala
setUp(
  scenario.inject(
    rampUsers(50).during(2 minutes),
    constantUsersPerSec(2).during(5 minutes),
    rampDown(25).during(1 minute)
  )
)
```

### High Load (Production Simulation)
```scala
setUp(
  scenario.inject(
    rampUsers(100).during(2 minutes),
    constantUsersPerSec(3).during(10 minutes),
    rampDown(50).during(2 minutes)
  )
)
```

### Spike Test
```scala
setUp(
  scenario.inject(
    atOnceUsers(10),
    rampUsers(190).during(1 minute),
    constantUsersPerSec(3).during(2 minutes)
  )
)
```

### Soak Test
```scala
setUp(
  scenario.inject(
    constantUsersPerSec(0.5).during(60 minutes)
  )
)
```

## Test Data

### Request Body Templates

Located in `src/gatling/resources/bodies/`:

- `auth_login.json` - Login credentials
- `auth_register.json` - Registration data
- `ride_request.json` - Ride request payload
- `driver_update_location.json` - Location updates
- `review_create.json` - Review data

### Feeder Data

CSV files can be placed in `src/gatling/resources/` for dynamic test data:

```csv
email,password
user1@test.com,Pass@123
user2@test.com,Pass@456
```

Usage in simulation:
```scala
feed(csv("users.csv").circular)
  .exec(http("Login").post("/auth/login")
    .body(StringBody("""{"email":"${email}","password":"${password}"}"""))
  )
```

## Performance Tuning

### Increasing Concurrent Users

1. Increase JVM heap size:
```gradle
jvmArgs = ['-Xmx4g']  // 4GB instead of 2GB
```

2. Increase Gatling connection pool:
```scala
val httpProtocol = http
  .maxConnectionsPerHost(500)
  .maxConnections(10000)
```

3. Adjust scenario user injection:
```scala
setUp(
  scenario.inject(
    rampUsers(500).during(5 minutes),  // 500 instead of 100
    constantUsersPerSec(10).during(10 minutes)
  )
)
```

### Reducing Test Duration

Modify pause durations in simulations:
```scala
.pause(100 milliseconds)  // Instead of 1 second
```

### Enabling Detailed Logging

```gradle
gatling {
  logLevel = 'DEBUG'  // TRACE, DEBUG, INFO, WARN, ERROR
  logHttp = true      // Log HTTP traffic
}
```

## Common Issues

### OutOfMemoryError
**Solution:** Increase JVM heap size in `build.gradle`:
```gradle
jvmArgs = ['-Xmx4g', '-Xms2g']
```

### Connection Refused
**Solution:** Ensure backend is running:
```bash
# Check if service is running on port 5000
curl http://localhost:5000/api/health
```

### Slow Request Times
**Solution:** Check backend logs and database performance:
```bash
# Check backend performance
docker logs <container-id> | grep "duration:"
```

### WebSocket Failures
**Solution:** Verify Socket.IO is enabled:
```bash
curl http://localhost:5000/socket.io/
```

## Best Practices

1. **Run tests sequentially** - Avoid overlapping test runs to get accurate results
2. **Use realistic data** - Test with production-like data volumes
3. **Monitor system metrics** - Track CPU, memory, network during tests
4. **Set baseline** - Establish performance baseline before optimization
5. **Gradual load increase** - Ramp up users gradually to identify breaking points
6. **Document results** - Save reports for comparison and trend analysis

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on: [push, pull_request]

jobs:
  gatling:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-java@v2
        with:
          java-version: '11'
      - run: cd tests/performance/gatling && ./gradlew runAuthSimulation
      - uses: actions/upload-artifact@v2
        with:
          name: gatling-reports
          path: tests/performance/gatling/build/reports/gatling/
```

## Resources

- [Gatling Documentation](https://gatling.io/docs/)
- [Gatling Javadoc](https://gatling.io/javadoc/gatling-core/index.html)
- [Performance Testing Guide](https://gatling.io/resources/eBook/gatling_best_practices.pdf)

## Support

For issues or questions:
1. Check Gatling logs in `build/reports/gatling/`
2. Review simulation code comments
3. Check backend logs for API errors
4. Run lighter scenarios to isolate issues

## License

This test suite is part of the GoWithSally project.

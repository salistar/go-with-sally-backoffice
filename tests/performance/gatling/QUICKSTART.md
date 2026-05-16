# Gatling Performance Tests - Quick Start Guide

## 5-Minute Setup

### Step 1: Prerequisites
```bash
# Verify Java installation (11+)
java -version

# Verify Gradle installation
gradle -version

# Ensure backend is running
curl http://localhost:5000/api/health
```

### Step 2: Configure Credentials
Update credentials in `src/gatling/resources/gatling.conf`:

```hocon
app {
  auth {
    adminUser = "admin@gowithsally.ma"
    adminPassword = "Admin@2024"
    regularUser = "sara.user@gmail.com"
    regularPassword = "User@2024"
  }
}
```

### Step 3: Run Your First Test

**Auth Test (5 minutes):**
```bash
./gradlew runAuthSimulation
```

**Ride Test (8 minutes):**
```bash
./gradlew runRideSimulation
```

**Quick Stress Test (10 minutes):**
```bash
./gradlew runStressTest
```

## Test Selection Guide

| Test | Duration | Focus | Use Case |
|------|----------|-------|----------|
| **AuthSimulation** | 10 min | Login/Register | Quick validation |
| **RideSimulation** | 10 min | Ride booking | Core functionality |
| **DriverSimulation** | 12 min | Driver ops | Driver-specific |
| **ApiStressTest** | 15 min | All endpoints | Stress testing |
| **WebsocketSimulation** | 12 min | Real-time | Socket.IO testing |
| **EndToEndSimulation** | 15 min | Full journeys | Realistic scenarios |

## View Results

After test completes:

```bash
# Open HTML report (macOS)
open build/reports/gatling/*/index.html

# Open HTML report (Linux)
xdg-open build/reports/gatling/*/index.html

# Open HTML report (Windows)
start build/reports/gatling/*/index.html
```

## Common Commands

```bash
# Run all tests
./gradlew gatlingRun

# Run specific test with custom JVM memory
./gradlew runAuthSimulation -Dgatling.jvmArgs="-Xmx4g"

# Run with verbose logging
./gradlew runStressTest -Dgatling.logLevel="DEBUG"

# Clean old reports
./gradlew clean

# View available tasks
./gradlew tasks | grep -i gatling
```

## Performance Targets

Default assertions in all tests:

✓ **Response Time (p95)** < 500ms
✓ **Response Time (p99)** < 1000ms
✓ **Error Rate** < 1%
✓ **Throughput** > 100 req/s

## Troubleshooting

### "Connection refused" Error
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# Start backend if needed
cd ../../gowithsally-backend
npm start
```

### "OutOfMemoryError"
```bash
# Increase heap size
./gradlew runAuthSimulation \
  -Dgatling.jvmArgs="-Xmx4g -Xms1g"
```

### "No such method or class"
```bash
# Clean and rebuild
./gradlew clean gatlingClasses
./gradlew runAuthSimulation
```

### WebSocket Connection Fails
```bash
# Verify Socket.IO is running
curl http://localhost:5000/socket.io/

# Check if ws protocol is enabled in backend
```

## Load Levels Explained

**Light (10 users):** For development testing
- Fast feedback
- Low resource usage
- ~2 minutes runtime

**Normal (50 users):** For staging validation
- Realistic load
- Moderate resource usage
- ~5-8 minutes runtime

**Heavy (100+ users):** For production simulation
- High load stress
- High resource usage
- ~10-15 minutes runtime

**Spike (sudden 200 users):** For resilience testing
- Sudden traffic surge
- Tests auto-scaling
- ~5 minutes ramp

**Soak (long duration):** For stability testing
- Memory leak detection
- Connection pooling
- ~30-60 minutes runtime

## Key Metrics Explained

| Metric | What It Means | Good Value |
|--------|---------------|------------|
| **Response Time (p50)** | Median response time | < 200ms |
| **Response Time (p95)** | 95th percentile (acceptable) | < 500ms |
| **Response Time (p99)** | 99th percentile (edge case) | < 1000ms |
| **Error Rate** | Failed requests | < 1% |
| **Throughput** | Requests per second | > 100 |
| **Active Users** | Concurrent users | Variable |

## Real-World Scenarios

### Development Testing (5 min setup)
```bash
# Quick validation before push
./gradlew runAuthSimulation
```

### Pre-Deployment Checklist
```bash
# Run all major tests
./gradlew runAuthSimulation
./gradlew runRideSimulation
./gradlew runDriverSimulation
./gradlew runEndToEndSimulation
# Total: ~40 minutes
```

### Production Baseline
```bash
# Establish performance baseline
# Run during low-traffic period
./gradlew runStressTest
./gradlew runEndToEndSimulation
# Document results for comparison
```

### Regression Testing
```bash
# After code changes
./gradlew runAuthSimulation
./gradlew runRideSimulation
# Compare with baseline
```

## Next Steps

1. **Review Results** - Check HTML report for bottlenecks
2. **Identify Issues** - Look for high error rates or slow endpoints
3. **Analyze Logs** - Check `build/reports/gatling/*/simulation.log`
4. **Optimize** - Address performance bottlenecks
5. **Re-test** - Validate improvements

## Documentation

- Full guide: `README.md`
- Configuration: `src/gatling/resources/gatling.conf`
- Simulations: `src/gatling/scala/simulations/`
- Request bodies: `src/gatling/resources/bodies/`

## Support

Run tests in verbose mode for debugging:
```bash
./gradlew runAuthSimulation -Dgatling.logLevel=TRACE
```

Check logs in:
```
build/reports/gatling/[timestamp]/simulation.log
```

---

**Ready to test?** Start with:
```bash
./gradlew runAuthSimulation
```

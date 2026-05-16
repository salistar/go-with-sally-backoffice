# Getting Started with Gatling Performance Tests

## Pre-Flight Checklist

### System Requirements
- [ ] Java 11 or higher installed
- [ ] Gradle 6.0 or higher installed
- [ ] 4GB+ available RAM
- [ ] Git installed
- [ ] Backend service accessible

### Verify Installation

```bash
# Check Java
java -version
# Should show Java 11+

# Check Gradle
gradle -version
# Should show Gradle 6.0+

# Check backend health
curl http://localhost:5000/api/health
# Should return 200 OK
```

## Step-by-Step Setup

### 1. Clone/Access Project
```bash
cd /path/to/goWithSally
cd tests/performance/gatling
ls -la
```

### 2. Verify Files
- [ ] `build.gradle` exists
- [ ] `src/gatling/resources/gatling.conf` exists
- [ ] `src/gatling/scala/simulations/` contains all .scala files
- [ ] `src/gatling/resources/bodies/` contains JSON templates

### 3. Configure Credentials

Copy the example config:
```bash
cp gatling.conf.example src/gatling/resources/gatling.conf
```

Edit `src/gatling/resources/gatling.conf` with your credentials:
```hocon
app {
  baseUrl = "http://localhost:5000/api"
  auth {
    adminUser = "your-admin@email.com"
    adminPassword = "your-password"
    regularUser = "your-user@email.com"
    regularPassword = "your-password"
  }
}
```

### 4. Start Backend Service

In another terminal:
```bash
cd gowithsally-backend
npm install
npm start
```

Wait until you see:
```
✅ Server running on port 5000
```

### 5. Run First Test

```bash
cd tests/performance/gatling
./gradlew runAuthSimulation
```

### 6. View Results

After test completes:
```bash
# macOS
open build/reports/gatling/*/index.html

# Linux
xdg-open build/reports/gatling/*/index.html

# Windows
start build/reports/gatling/*/index.html
```

## Test Execution Guide

### Quick Tests (< 5 min)
```bash
./gradlew runAuthSimulation
```
Best for: Quick validation before committing code

### Standard Tests (5-10 min)
```bash
./gradlew runRideSimulation
./gradlew runDriverSimulation
```
Best for: Regular testing during development

### Comprehensive Tests (10-15 min)
```bash
./gradlew runStressTest
./gradlew runEndToEndSimulation
```
Best for: Pre-deployment validation

### Full Suite (30-40 min)
```bash
./gradlew gatlingRun
```
Best for: Complete validation and baseline establishment

## Understanding Results

### HTML Report Contents

1. **Global Stats** - Overall performance metrics
   - Total requests
   - Success/failure counts
   - Min/max/mean/p95/p99 response times

2. **Response Time Charts**
   - Response time distribution over time
   - Identifies performance degradation
   - Shows error spikes

3. **Active Users Chart**
   - Shows ramp-up profile
   - Concurrent user trends
   - Load distribution

4. **Requests Per Second**
   - Throughput over time
   - Identifies bottlenecks
   - Shows handling capacity

5. **Assertion Results**
   - ✓ or ✗ for each assertion
   - Helps identify thresholds exceeded

### Key Metrics to Check

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| Success Rate | > 99% | 95-99% | < 95% |
| Error Count | < 10 | 10-50 | > 50 |
| p95 Response | < 500ms | 500-1000ms | > 1000ms |
| p99 Response | < 1000ms | 1000-2000ms | > 2000ms |
| Throughput | > 100 req/s | 50-100 req/s | < 50 req/s |

## Troubleshooting

### Issue: "Connection refused"
```bash
# Check if backend is running
curl http://localhost:5000/api/health

# If not running, start it:
cd gowithsally-backend
npm start
```

### Issue: "OutOfMemoryError"
```bash
# Increase heap size
./gradlew runAuthSimulation \
  -Dgatling.jvmArgs="-Xmx4g -Xms1g"
```

### Issue: Authentication failures
- [ ] Check credentials in `gatling.conf`
- [ ] Verify user accounts exist in database
- [ ] Check if user accounts are active/verified

### Issue: Slow response times
- [ ] Check backend logs
- [ ] Monitor database performance
- [ ] Check system resources (CPU, RAM, network)

### Issue: WebSocket connection fails
```bash
# Verify Socket.IO is running
curl http://localhost:5000/socket.io/
# Should return a response

# Check backend logs for WebSocket errors
```

## Customization Guide

### Change Load Profile

Edit simulation file (e.g., `AuthSimulation.scala`):

**Current (10-100 users over 2 minutes):**
```scala
setUp(
  scenario.inject(
    rampUsers(10).during(2 minutes),
    constantUsersPerSec(2).during(5 minutes)
  )
)
```

**To 50-200 users over 5 minutes:**
```scala
setUp(
  scenario.inject(
    rampUsers(50).during(5 minutes),
    constantUsersPerSec(3).during(5 minutes)
  )
)
```

### Change Performance Thresholds

Find assertions section and modify:

```scala
.assertions(
  global.responseTime.percentile3.lt(500),  // Change to desired value
  global.failedRequests.percent.lt(1)       // Change to desired value
)
```

### Add New Scenario

1. Copy existing chain template
2. Modify endpoint and body
3. Update assertion if needed
4. Add to `setUp()` method

Example:
```scala
val newScenario = scenario("My Custom Test")
  .exec(setup)
  .exec(
    http("Custom Request")
      .post("/api/endpoint")
      .body(StringBody("""{"key":"value"}"""))
      .check(status.is(200))
  )
  .pause(1 second)

// Add to setUp:
setUp(
  newScenario.inject(
    rampUsers(10).during(1 minute)
  )
)
```

## Performance Optimization Tips

### Before Testing
1. Ensure clean database state
2. Disable unnecessary logging
3. Monitor system resources
4. Run during low-traffic period

### During Testing
1. Monitor `top` or Task Manager
2. Check backend logs for errors
3. Watch network traffic
4. Don't run other heavy processes

### After Testing
1. Review error logs
2. Identify slow endpoints
3. Check database queries
4. Verify resource usage

## Documentation Map

| Document | Purpose | Audience |
|----------|---------|----------|
| **README.md** | Complete reference | All users |
| **QUICKSTART.md** | Quick setup guide | New users |
| **GETTING_STARTED.md** | This guide | First-time users |
| **CI_CD_GUIDE.md** | Integration instructions | DevOps/CI teams |
| **IMPLEMENTATION_SUMMARY.md** | Technical details | Developers |

## Next Steps

### After First Test
1. [ ] Review HTML report
2. [ ] Check if all assertions passed
3. [ ] Compare metrics against targets
4. [ ] Save report as baseline

### For Regular Testing
1. [ ] Schedule weekly tests
2. [ ] Track performance trends
3. [ ] Document any changes
4. [ ] Share results with team

### For Production Deployment
1. [ ] Run complete test suite
2. [ ] Compare against baseline
3. [ ] Check for regressions
4. [ ] Get approval from team

### For Optimization
1. [ ] Identify slow endpoints
2. [ ] Profile database queries
3. [ ] Optimize code/queries
4. [ ] Re-test to validate improvements

## Useful Commands

```bash
# Clean old reports
./gradlew clean

# Run with custom settings
./gradlew runAuthSimulation \
  -Dgatling.jvmArgs="-Xmx4g" \
  -Dgatling.logLevel=DEBUG

# List available tasks
./gradlew tasks

# Run all simulations
./gradlew gatlingRun

# Run specific simulation without gradle tasks
# (Edit build.gradle simulationClass property first)
./gradlew gatlingRun

# View Gradle properties
./gradlew properties | grep gatling
```

## Getting Help

### Check Documentation
1. README.md - Full reference
2. QUICKSTART.md - Common issues
3. Gatling docs - https://gatling.io/docs/

### Enable Debug Mode
```bash
./gradlew runAuthSimulation -Dgatling.logLevel=DEBUG
```

### Check Logs
```bash
# Simulation logs
cat build/reports/gatling/*/simulation.log | head -50

# Backend logs
tail -100 ../../gowithsally-backend/logs/server.log
```

### Verify Setup
```bash
# Check files exist
ls -la src/gatling/scala/simulations/
ls -la src/gatling/resources/

# Check gradle can find tests
./gradlew tasks --all | grep gatling

# Test backend connectivity
curl -I http://localhost:5000/api/health
```

## Success Indicators

After running a test, you should see:

- [ ] No "java.net.ConnectException" errors
- [ ] No "OutOfMemoryError" exceptions
- [ ] HTML report generated successfully
- [ ] Report contains performance charts
- [ ] Assertions section shows results
- [ ] Success rate > 95%

## Common Questions

**Q: How long does each test take?**
A: See test duration in Test Execution Guide above (5-40 minutes)

**Q: Can I run tests in parallel?**
A: Not recommended - use sequential runs for accurate metrics

**Q: Can I modify test scenarios?**
A: Yes! Edit .scala files to customize tests

**Q: Where are results saved?**
A: `build/reports/gatling/[timestamp]/`

**Q: How do I compare results between runs?**
A: Save HTML reports and compare metrics side-by-side

**Q: Can I integrate with CI/CD?**
A: Yes! See CI_CD_GUIDE.md for GitHub Actions, GitLab CI, Jenkins examples

## Support Resources

- Gatling Documentation: https://gatling.io/docs/
- Scala DSL Guide: https://gatling.io/docs/gatling/tutorials/dsl/
- Community Forum: https://groups.google.com/forum/#!forum/gatling
- GitHub Issues: Check project repository

---

**You're ready!** Run your first test:
```bash
./gradlew runAuthSimulation
```

Happy testing! 🚀

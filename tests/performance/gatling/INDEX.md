# GoWithSally Gatling Performance Tests - Complete Index

## Quick Navigation

- [Getting Started](#getting-started)
- [File Structure](#file-structure)
- [Simulations Overview](#simulations-overview)
- [Documentation Guide](#documentation-guide)
- [Commands Reference](#commands-reference)

## Getting Started

**New to the project?** Start here:

1. **First Time Setup:** Read [`GETTING_STARTED.md`](GETTING_STARTED.md)
2. **5-Minute Quick Start:** Read [`QUICKSTART.md`](QUICKSTART.md)
3. **Complete Reference:** Read [`README.md`](README.md)

## File Structure

```
tests/performance/gatling/
│
├── build.gradle                              # Gradle build configuration
├── gatling.conf.example                      # Configuration template
│
├── INDEX.md                                  # This file
├── README.md                                 # Complete reference (600+ lines)
├── QUICKSTART.md                            # 5-minute setup guide
├── GETTING_STARTED.md                       # Step-by-step guide
├── IMPLEMENTATION_SUMMARY.md                # Technical overview
├── CI_CD_GUIDE.md                          # CI/CD integration
│
├── src/
│   └── gatling/
│       ├── scala/
│       │   └── simulations/                 # Simulation classes
│       │       ├── AuthSimulation.scala              (189 lines)
│       │       ├── RideSimulation.scala              (252 lines)
│       │       ├── DriverSimulation.scala            (282 lines)
│       │       ├── ApiStressTest.scala               (306 lines)
│       │       ├── WebsocketSimulation.scala         (289 lines)
│       │       └── EndToEndSimulation.scala          (365 lines)
│       │
│       └── resources/
│           ├── gatling.conf                 # Main configuration
│           │
│           └── bodies/                      # Request templates
│               ├── auth_login.json
│               ├── auth_register.json
│               ├── ride_request.json
│               ├── driver_update_location.json
│               └── review_create.json
│
└── build/
    └── reports/
        └── gatling/
            └── [timestamp]/
                ├── index.html               # Interactive report
                └── simulation.log           # Raw test data
```

## Simulations Overview

### 1. AuthSimulation.scala
**Purpose:** Authentication endpoint load testing

**Endpoints:** Register, Login, Refresh Token, Logout, Forgot Password, Verify Code

**Scenarios:**
- Authentication Flow (10-100 users, 2 minutes ramp)
- Login Stress Test (10 repetitions)
- Registration Stress Test (5 repetitions)
- Password Recovery Flow

**Run:** `./gradlew runAuthSimulation`

**Duration:** ~10 minutes

**Best for:** Quick validation before commits

---

### 2. RideSimulation.scala
**Purpose:** Ride booking workflow load testing

**Endpoints:** Request Ride, Get Details, Nearest Drivers, Accept, Start, Complete, Cancel, Rate

**Scenarios:**
- Complete Ride Flow (full journey)
- Ride Request Stress (20 requests)
- Nearest Drivers Search (15 searches)
- Cancellation Flow
- Driver Workflow

**Run:** `./gradlew runRideSimulation`

**Duration:** ~10 minutes

**Best for:** Core functionality validation

---

### 3. DriverSimulation.scala
**Purpose:** Driver operations load testing

**Endpoints:** Location Updates, Available Rides, Online/Offline, Earnings, Statistics, Vehicles

**Scenarios:**
- Driver Shift (location updates + rides polling)
- Driver Statistics Polling (20 iterations)
- Earnings Tracking (15 iterations)
- Continuous Location Tracking (30 updates, 30s interval)
- Rides Polling (25 iterations)

**Run:** `./gradlew runDriverSimulation`

**Duration:** ~12 minutes

**Best for:** Driver-specific performance validation

---

### 4. ApiStressTest.scala
**Purpose:** Comprehensive stress testing

**Endpoints:** 20+ endpoints across all services

**Scenarios:**
- Spike Test (10 → 200 users in 1 minute)
- Soak Test (0.5 users for 10 minutes)
- Driver Stress Test (50 users)
- Comprehensive Stress (75 users, all endpoints)
- Authentication Stress (3 users/sec)

**Run:** `./gradlew runStressTest`

**Duration:** ~15 minutes

**Best for:** Stress testing and spike resilience

---

### 5. WebsocketSimulation.scala
**Purpose:** Real-time Socket.IO connection testing

**Events:** Location Broadcast, Notifications, Chat, Tracking, Combined Operations

**Scenarios:**
- Driver Location WebSocket (10 location updates)
- Ride Notifications (full lifecycle)
- Chat Messages (10 exchanges)
- Real-time Tracking (15 updates)
- Combined Real-time Operations (full workflow)
- High-frequency Location Updates (50 updates, 1s interval)

**Run:** `./gradlew runWebsocketSimulation`

**Duration:** ~12 minutes

**Best for:** Real-time feature validation

---

### 6. EndToEndSimulation.scala
**Purpose:** Complete user and driver journey testing

**User Journey:**
1. Register → Verify → Setup Profile → Browse Services → Request Ride → Track → Rate → Check Wallet

**Driver Journey:**
1. Register → Upload Docs → Add Vehicle → Go Online → Poll Rides → Update Location → Check Earnings → Go Offline

**Scenarios:**
- User Complete Journey (40 users)
- Driver Complete Journey (10 users)
- Frequent User (3 rides)
- Admin Activities (0.2 users/sec)

**Run:** `./gradlew runEndToEndSimulation`

**Duration:** ~15 minutes

**Best for:** Realistic scenario validation

---

## Documentation Guide

### For Different Audiences

| Role | Start Here |
|------|-----------|
| **Developer (First Time)** | GETTING_STARTED.md → README.md |
| **QA Engineer** | QUICKSTART.md → README.md |
| **DevOps/CI** | CI_CD_GUIDE.md |
| **Architect** | IMPLEMENTATION_SUMMARY.md |
| **Team Lead** | README.md (overview section) |

### Documentation Files

#### GETTING_STARTED.md
- Minimum viable setup
- Pre-flight checklist
- Step-by-step instructions
- Troubleshooting guide
- Common questions

**Best for:** First-time setup, 30 minutes read

#### QUICKSTART.md
- 5-minute setup guide
- Test selection matrix
- Common commands
- Quick troubleshooting
- Load levels explained

**Best for:** Quick reference, 10 minutes read

#### README.md
- Complete simulation reference
- All endpoints documented
- Configuration guide
- Performance tuning tips
- Best practices
- CI/CD examples

**Best for:** Complete reference, 60 minutes read

#### CI_CD_GUIDE.md
- GitHub Actions workflows
- GitLab CI configuration
- Jenkins pipeline
- Docker Compose setup
- Performance tracking
- Monitoring and alerting

**Best for:** CI/CD integration, 45 minutes read

#### IMPLEMENTATION_SUMMARY.md
- Architecture overview
- Technical details
- Design decisions
- Integration points
- Statistics

**Best for:** Understanding design, 30 minutes read

## Commands Reference

### Run Tests

```bash
# Quick auth test (10 min)
./gradlew runAuthSimulation

# Core functionality tests (20 min)
./gradlew runRideSimulation
./gradlew runDriverSimulation

# Stress tests (15 min)
./gradlew runStressTest

# Real-time tests (12 min)
./gradlew runWebsocketSimulation

# End-to-end tests (15 min)
./gradlew runEndToEndSimulation

# Run all tests (40+ min)
./gradlew gatlingRun
```

### Advanced Usage

```bash
# Run with custom JVM memory
./gradlew runAuthSimulation -Dgatling.jvmArgs="-Xmx4g -Xms1g"

# Run with debug logging
./gradlew runStressTest -Dgatling.logLevel=DEBUG

# Run with trace logging
./gradlew runRideSimulation -Dgatling.logLevel=TRACE

# Clean old reports
./gradlew clean

# List all available tasks
./gradlew tasks | grep gatling
```

### View Results

```bash
# macOS
open build/reports/gatling/*/index.html

# Linux
xdg-open build/reports/gatling/*/index.html

# Windows
start build/reports/gatling/*/index.html

# View raw simulation log
cat build/reports/gatling/*/simulation.log | head -100
```

## Performance Targets

All simulations include assertions for these targets:

| Metric | Target | Notes |
|--------|--------|-------|
| p50 Response | < 200ms | Excellent |
| p95 Response | < 500ms | Good (main target) |
| p99 Response | < 1000ms | Acceptable |
| Max Response | < 5000ms | Hard limit |
| Error Rate | < 1% | High reliability |
| Throughput | > 100 req/s | Minimum capacity |
| Success Rate | > 99% | Production grade |

## Test Scenarios At A Glance

| Simulation | Users | Duration | Focus | Use Case |
|-----------|-------|----------|-------|----------|
| AuthSimulation | 10-100 | 10 min | Authentication | Quick validation |
| RideSimulation | 20-100 | 10 min | Ride booking | Core features |
| DriverSimulation | 15-100 | 12 min | Driver ops | Driver features |
| ApiStressTest | 10-200 | 15 min | Stress | Breaking point |
| WebsocketSimulation | 20-200 | 12 min | Real-time | Socket.IO |
| EndToEndSimulation | 50-150 | 15 min | Journeys | Realistic flows |

## Configuration

### Basic Setup

```bash
# Copy template
cp gatling.conf.example src/gatling/resources/gatling.conf

# Edit credentials
nano src/gatling/resources/gatling.conf
# Update:
# - API base URL
# - Test user credentials
# - Performance thresholds
```

### Environment Variables

```bash
export API_BASE_URL="http://localhost:5000/api"
export ADMIN_EMAIL="admin@test.com"
export ADMIN_PASSWORD="password"
export USER_EMAIL="user@test.com"
export USER_PASSWORD="password"
```

### Custom Load Profile

Edit simulation file and modify:

```scala
setUp(
  scenario.inject(
    rampUsers(10).during(2 minutes),    // Change users/duration
    constantUsersPerSec(2).during(5 minutes),
    rampDown(10).during(1 minute)
  )
)
```

## Integration Checklist

- [ ] Read GETTING_STARTED.md
- [ ] Configure credentials in gatling.conf
- [ ] Start backend service
- [ ] Run ./gradlew runAuthSimulation
- [ ] Verify HTML report generated
- [ ] Review key metrics
- [ ] Check assertions passed
- [ ] Save baseline report
- [ ] Document setup in team wiki
- [ ] Add to CI/CD pipeline (see CI_CD_GUIDE.md)

## Support & Help

### Documentation
1. **Quick answers:** QUICKSTART.md
2. **Setup issues:** GETTING_STARTED.md
3. **Deep dive:** README.md
4. **Technical details:** IMPLEMENTATION_SUMMARY.md
5. **CI/CD setup:** CI_CD_GUIDE.md

### Enable Debug Mode
```bash
./gradlew runAuthSimulation -Dgatling.logLevel=DEBUG
```

### Check Logs
```bash
# Simulation results
cat build/reports/gatling/*/simulation.log

# Gatling output
grep -i error build/reports/gatling/*/simulation.log
```

### Common Issues

**Connection refused?**
```bash
# Check backend
curl http://localhost:5000/api/health
```

**OutOfMemoryError?**
```bash
# Increase heap
./gradlew run -Dgatling.jvmArgs="-Xmx4g"
```

**Auth failures?**
- Verify credentials in gatling.conf
- Check user accounts exist
- Verify users are active

## Performance Tuning

### For Light Testing (dev)
- 10-20 users
- 1-2 minute ramp
- 2-3 minute sustained load

### For Standard Testing (staging)
- 50-100 users
- 2 minute ramp
- 5 minute sustained load

### For Heavy Testing (production)
- 100-200 users
- 2-3 minute ramp
- 10+ minute sustained load

### For Stress Testing
- Spike: 10 → 200 in 1 minute
- Soak: 0.5 users for 30+ minutes
- Ramp: Gradually increase to breaking point

## Real-World Workflows

### Pre-Commit Testing (5 min)
```bash
./gradlew runAuthSimulation
# Quick validation before pushing
```

### Daily Regression (30 min)
```bash
./gradlew runAuthSimulation
./gradlew runRideSimulation
./gradlew runDriverSimulation
# Test core features daily
```

### Pre-Deployment (60+ min)
```bash
./gradlew gatlingRun
# Full test suite before production
```

### Nightly Stress (varies)
```bash
./gradlew runStressTest
# Identify breaking points
```

## Metrics Explained

**Response Time:**
- p50 = 50% of requests complete faster
- p95 = 95% complete faster (main target)
- p99 = 99% complete faster (edge cases)
- Max = longest request

**Error Rate:**
- Percentage of failed requests
- Target: < 1% (high reliability)

**Throughput:**
- Requests per second
- Higher is better
- Target: > 100 req/s

**Success Rate:**
- Percentage of successful requests
- Target: > 99%

## Resources

- [Gatling Documentation](https://gatling.io/docs/)
- [Gatling Javadoc](https://gatling.io/javadoc/)
- [Scala DSL Guide](https://gatling.io/docs/gatling/tutorials/dsl/)
- [Community Forum](https://groups.google.com/forum/#!forum/gatling)

---

**Ready to start?** Run:
```bash
./gradlew runAuthSimulation
```

Questions? See [GETTING_STARTED.md](GETTING_STARTED.md)

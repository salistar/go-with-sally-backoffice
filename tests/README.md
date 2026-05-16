# GoWithSally Testing Suite

Comprehensive testing framework covering E2E, API, Performance, Mobile, and Unit tests.

## Test Structure

```
tests/
├── e2e/                    # End-to-End Web Tests
│   ├── playwright/
│   │   ├── playwright.config.ts
│   │   └── tests/
│   │       ├── landing-page.spec.ts
│   │       ├── login.spec.ts
│   │       └── admin-dashboard.spec.ts
│
├── api/                    # API Tests
│   └── karate/
│       ├── karate-config.js
│       └── features/
│           ├── auth.feature
│           ├── rides.feature
│           ├── drivers.feature
│           ├── admin.feature
│           └── affiliations.feature
│
├── performance/            # Load & Performance Tests
│   └── gatling/
│       ├── build.gradle
│       └── simulations/
│           ├── LoginSimulation.scala
│           ├── RideSimulation.scala
│           └── DriverLocationSimulation.scala
│
├── mobile/                 # Mobile App Tests
│   └── appium/
│       ├── wdio.conf.js
│       ├── package.json
│       └── tests/
│           ├── login.test.js
│           ├── ride-request.test.js
│           └── driver-mode.test.js
│
├── unit/                   # Backend Unit Tests
│   ├── models/
│   │   ├── user.test.js
│   │   └── driver.test.js
│   └── services/
│       ├── nearestDriver.test.js
│       └── pricing.test.js
│
└── README.md              # This file
```

## Running Tests

### Unit Tests (Backend)
```bash
cd gowithsally-backend
npm run test:unit
```

### API Tests (Karate)
Requires Docker and running services:
```bash
docker-compose -f docker-compose.test.yml up -d
cd tests/api/karate
npx karate test
```

### E2E Tests (Playwright)
Requires running web server:
```bash
# Start the app (in one terminal)
cd gowithsally-web && npm start

# Run tests (in another terminal)
cd tests/e2e/playwright
npx playwright test
```

### Mobile Tests (Appium)
Requires Android emulator or device:
```bash
cd tests/mobile/appium
npm run test:mobile
```

### Performance Tests (Gatling)
```bash
cd tests/performance/gatling
gradle gatlingRun -Dsimulation=LoginSimulation
```

## Test Credentials

### Test User Accounts (Auto-seeded)
- **Regular User**: user@test.com / test1234
- **Driver User**: driver@test.com / test1234
- **Admin User**: admin@test.com / admin1234

### Test Endpoints
- **Local**: http://localhost:5000
- **Staging**: https://staging-api.gowithsally.ma
- **Production**: https://api.gowithsally.ma (manual approval required)

## CI/CD Integration

All tests run automatically on:
- **Pull Requests**: Lint, unit tests, API tests, SonarQube analysis
- **Push to staging**: All tests + E2E + deploy to staging
- **Push to main**: All tests + deploy to production (manual approval)

See `.github/workflows/` for pipeline configuration.

## Coverage Requirements

- **Unit Tests**: ≥80% coverage
- **API Tests**: All critical endpoints
- **E2E Tests**: Critical user flows
- **Performance**: <200ms response time at 100 concurrent users

## Environment Variables for Testing

Create `tests/.env.test`:
```
TEST_API_URL=http://localhost:5000
TEST_USER_EMAIL=user@test.com
TEST_USER_PASSWORD=test1234
TEST_DRIVER_EMAIL=driver@test.com
TEST_DRIVER_PASSWORD=test1234
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=admin1234
PLAYWRIGHT_HEADLESS=true
```

## Maintenance

- Update test credentials when password policies change
- Review and update API tests when endpoints change
- Add new tests for new features before marking PR as ready
- Run tests locally before pushing to avoid CI failures

# Gatling Performance Tests - CI/CD Integration Guide

## GitHub Actions Integration

### Basic Performance Test on Every Push

```yaml
# .github/workflows/performance-tests.yml
name: Performance Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  auth-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Java
      uses: actions/setup-java@v3
      with:
        java-version: '11'
        distribution: 'temurin'

    - name: Start backend services
      run: |
        cd gowithsally-backend
        npm install
        npm start &
        sleep 10

    - name: Run Auth Performance Tests
      working-directory: tests/performance/gatling
      run: ./gradlew runAuthSimulation

    - name: Upload results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: auth-test-results
        path: tests/performance/gatling/build/reports/gatling/

  ride-tests:
    runs-on: ubuntu-latest
    needs: auth-tests

    steps:
    - uses: actions/checkout@v3

    - name: Set up Java
      uses: actions/setup-java@v3
      with:
        java-version: '11'

    - name: Start backend services
      run: |
        cd gowithsally-backend
        npm install
        npm start &
        sleep 10

    - name: Run Ride Performance Tests
      working-directory: tests/performance/gatling
      run: ./gradlew runRideSimulation

    - name: Upload results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: ride-test-results
        path: tests/performance/gatling/build/reports/gatling/
```

### Nightly Stress Tests

```yaml
# .github/workflows/nightly-stress-tests.yml
name: Nightly Stress Tests

on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily

jobs:
  stress-tests:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Java
      uses: actions/setup-java@v3
      with:
        java-version: '11'

    - name: Start backend services
      run: |
        cd gowithsally-backend
        npm install
        npm start &
        sleep 10

    - name: Run Stress Tests
      working-directory: tests/performance/gatling
      run: |
        ./gradlew runStressTest \
          -Dgatling.jvmArgs="-Xmx4g -Xms2g"

    - name: Run Soak Tests
      working-directory: tests/performance/gatling
      run: |
        ./gradlew runEndToEndSimulation \
          -Dgatling.jvmArgs="-Xmx4g -Xms2g"

    - name: Upload stress test results
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: stress-test-results
        path: tests/performance/gatling/build/reports/gatling/

    - name: Send results notification
      if: failure()
      uses: 8398a7/action-slack@v3
      with:
        status: ${{ job.status }}
        text: 'Stress tests failed'
        webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

## Continuous Deployment Performance Gate

```yaml
# .github/workflows/performance-gate.yml
name: Performance Gate

on:
  pull_request:
    branches: [ main ]

jobs:
  performance-baseline:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3
      with:
        fetch-depth: 0

    - name: Set up Java
      uses: actions/setup-java@v3
      with:
        java-version: '11'

    - name: Start backend
      run: |
        cd gowithsally-backend
        npm install
        npm start &
        sleep 10

    - name: Run baseline tests
      working-directory: tests/performance/gatling
      run: ./gradlew runAuthSimulation

    - name: Compare with baseline
      run: |
        BASELINE=$(cat .github/performance-baseline.json | jq '.p95ResponseTime')
        CURRENT=$(cat tests/performance/gatling/build/reports/gatling/*/simulation.log | \
          grep "OK" | awk '{print $7}' | tail -1)

        if (( $(echo "$CURRENT > $BASELINE" | bc -l) )); then
          echo "Performance regression detected!"
          echo "Baseline: ${BASELINE}ms"
          echo "Current: ${CURRENT}ms"
          exit 1
        fi

    - name: Comment on PR
      if: failure()
      uses: actions/github-script@v6
      with:
        script: |
          github.rest.issues.createComment({
            issue_number: context.issue.number,
            owner: context.repo.owner,
            repo: context.repo.repo,
            body: '❌ Performance regression detected. Check the artifacts for details.'
          })
```

## Docker Compose for Testing

```yaml
# docker-compose.perf.yml
version: '3.8'

services:
  backend:
    build: ./gowithsally-backend
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: test
      DB_HOST: mongodb
    depends_on:
      - mongodb
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/api/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  mongodb:
    image: mongo:5.0
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_DATABASE: gowithsally_test

  gatling:
    image: openjdk:11-jre
    working_dir: /gatling
    volumes:
      - ./tests/performance/gatling:/gatling
    depends_on:
      backend:
        condition: service_healthy
    command: >
      /bin/sh -c "
        apt-get update &&
        apt-get install -y gradle &&
        gradle runAuthSimulation
      "
```

Usage:
```bash
docker-compose -f docker-compose.perf.yml up
```

## GitLab CI Integration

```yaml
# .gitlab-ci.yml
stages:
  - build
  - test
  - performance

auth-performance:
  stage: performance
  image: openjdk:11
  before_script:
    - apt-get update && apt-get install -y gradle
    - cd gowithsally-backend && npm install && npm start &
    - sleep 10
  script:
    - cd tests/performance/gatling
    - gradle runAuthSimulation
  artifacts:
    paths:
      - tests/performance/gatling/build/reports/gatling/
    reports:
      performance: tests/performance/gatling/build/reports/gatling/*/simulation.log
  retry: 1
  only:
    - main
    - merge_requests

stress-performance:
  stage: performance
  image: openjdk:11
  before_script:
    - apt-get update && apt-get install -y gradle
    - cd gowithsally-backend && npm install && npm start &
    - sleep 10
  script:
    - cd tests/performance/gatling
    - gradle runStressTest -Dgatling.jvmArgs="-Xmx4g"
  artifacts:
    paths:
      - tests/performance/gatling/build/reports/gatling/
  only:
    - main
  when: manual
```

## Jenkins Pipeline

```groovy
// Jenkinsfile.perf
pipeline {
    agent any

    parameters {
        choice(name: 'TEST_TYPE', choices: ['auth', 'ride', 'stress', 'e2e'], description: 'Test type to run')
        string(name: 'HEAP_SIZE', defaultValue: '2g', description: 'JVM Heap size')
    }

    environment {
        BACKEND_URL = 'http://localhost:5000'
        GATLING_DIR = 'tests/performance/gatling'
    }

    stages {
        stage('Setup') {
            steps {
                script {
                    sh 'java -version'
                    sh 'gradle --version'
                }
            }
        }

        stage('Start Backend') {
            steps {
                dir('gowithsally-backend') {
                    sh '''
                        npm install
                        npm start > backend.log 2>&1 &
                        sleep 10
                        curl -f http://localhost:5000/api/health || exit 1
                    '''
                }
            }
        }

        stage('Run Performance Tests') {
            steps {
                dir("${GATLING_DIR}") {
                    script {
                        def taskName = "run${params.TEST_TYPE.capitalize()}Simulation"
                        sh '''
                            ./gradlew ${taskName} \
                              -Dgatling.jvmArgs="-Xmx${HEAP_SIZE} -Xms1g"
                        '''
                    }
                }
            }
        }

        stage('Archive Results') {
            steps {
                archiveArtifacts artifacts: "${GATLING_DIR}/build/reports/gatling/**",
                                 allowEmptyArchive: true
                publishHTML([
                    reportDir: "${GATLING_DIR}/build/reports/gatling",
                    reportFiles: 'index.html',
                    reportName: "Gatling Report - ${params.TEST_TYPE}"
                ])
            }
        }

        stage('Performance Analysis') {
            steps {
                script {
                    sh '''
                        # Extract key metrics
                        LOG_FILE=$(find ${GATLING_DIR}/build/reports/gatling -name "simulation.log" -type f)

                        echo "Performance Summary:"
                        echo "==================="

                        # Count successful/failed
                        SUCCESSFUL=$(grep "^OK" $LOG_FILE | wc -l)
                        FAILED=$(grep "^KO" $LOG_FILE | wc -l)

                        echo "Successful requests: $SUCCESSFUL"
                        echo "Failed requests: $FAILED"

                        # Calculate success rate
                        TOTAL=$((SUCCESSFUL + FAILED))
                        if [ $TOTAL -gt 0 ]; then
                            SUCCESS_RATE=$(echo "scale=2; $SUCCESSFUL * 100 / $TOTAL" | bc)
                            echo "Success rate: ${SUCCESS_RATE}%"
                        fi
                    '''
                }
            }
        }
    }

    post {
        always {
            sh 'pkill -f "npm start" || true'
            cleanWs()
        }

        failure {
            emailext(
                subject: "Performance Test Failed: ${params.TEST_TYPE}",
                body: '''
                    Performance test failed. Check Jenkins console output for details.

                    Test type: ${TEST_TYPE}
                    Build: ${BUILD_URL}
                ''',
                to: '${DEFAULT_RECIPIENTS}'
            )
        }

        success {
            archiveArtifacts artifacts: "${GATLING_DIR}/build/reports/gatling/**"
        }
    }
}
```

## Performance Trend Tracking

```bash
#!/bin/bash
# scripts/track-performance.sh

RESULTS_DIR="performance-results"
mkdir -p $RESULTS_DIR

TEST_TYPE=${1:-"auth"}
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
REPORT_DIR="tests/performance/gatling/build/reports/gatling"

echo "Running performance test: $TEST_TYPE at $TIMESTAMP"

cd tests/performance/gatling
./gradlew run${TEST_TYPE^}Simulation

# Extract metrics
LOG_FILE=$(find $REPORT_DIR -name "simulation.log" -type f | head -1)

if [ -f "$LOG_FILE" ]; then
    # Count requests
    SUCCESSFUL=$(grep "^OK" $LOG_FILE | wc -l)
    FAILED=$(grep "^KO" $LOG_FILE | wc -l)
    TOTAL=$((SUCCESSFUL + FAILED))

    # Extract response times
    P95=$(grep "^OK" $LOG_FILE | awk '{print $7}' | sort -n | \
          awk '{arr[NR]=$0} END {print arr[int(NR*0.95)]}')
    P99=$(grep "^OK" $LOG_FILE | awk '{print $7}' | sort -n | \
          awk '{arr[NR]=$0} END {print arr[int(NR*0.99)]}')

    # Save results
    cat > "$RESULTS_DIR/${TEST_TYPE}_${TIMESTAMP}.json" <<EOF
{
  "timestamp": "$TIMESTAMP",
  "testType": "$TEST_TYPE",
  "totalRequests": $TOTAL,
  "successfulRequests": $SUCCESSFUL,
  "failedRequests": $FAILED,
  "successRate": $((SUCCESSFUL * 100 / TOTAL)),
  "p95ResponseTime": $P95,
  "p99ResponseTime": $P99
}
EOF

    echo "Results saved to $RESULTS_DIR/${TEST_TYPE}_${TIMESTAMP}.json"
fi
```

## Best Practices for CI/CD

1. **Run tests in isolation** - Don't overlap test executions
2. **Use environment-specific configs** - Different settings for staging/production
3. **Archive results** - Keep historical data for trend analysis
4. **Set clear pass/fail criteria** - Define acceptable thresholds
5. **Notify on failures** - Alert team of performance regressions
6. **Resource management** - Clean up old reports and artifacts
7. **Security** - Don't log sensitive data (passwords, tokens)
8. **Parallel execution** - Run independent tests in parallel
9. **Performance baselines** - Compare against previous runs
10. **Regular reviews** - Analyze trends and identify patterns

## Monitoring and Alerting

```yaml
# alerts.yml
alerts:
  - name: High Error Rate
    condition: error_rate > 2%
    severity: critical
    notification: slack

  - name: P95 Degradation
    condition: p95_response_time > 500ms
    severity: warning
    notification: slack

  - name: Low Throughput
    condition: throughput < 100 req/s
    severity: warning
    notification: email

  - name: Memory Issues
    condition: heap_usage > 85%
    severity: critical
    notification: pagerduty
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI Documentation](https://docs.gitlab.com/ee/ci/)
- [Jenkins Documentation](https://www.jenkins.io/doc/)
- [Gatling and CI/CD](https://gatling.io/docs/gatling/tutorials/continuous-integration/)

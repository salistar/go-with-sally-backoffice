#!/bin/bash
# GoWithSally - Redis Cache Flush Script
# Usage: ./flush-cache.sh [all|sessions|surge|config|pattern PATTERN]

set -euo pipefail

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASS="${REDIS_PASSWORD:-sally_redis_2024}"

RCLI="redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS --no-auth-warning"

echo "========================================="
echo "GoWithSally - Redis Cache Flush"
echo "========================================="

flush_pattern() {
  local pattern=$1
  local count=$($RCLI KEYS "$pattern" | wc -l)
  if [ "$count" -gt 0 ]; then
    $RCLI KEYS "$pattern" | xargs $RCLI DEL > /dev/null 2>&1
    echo "  -> Deleted $count keys matching '$pattern'"
  else
    echo "  -> No keys matching '$pattern'"
  fi
}

case "${1:-}" in
  all)
    echo "[WARN] Flushing ALL Redis data..."
    $RCLI FLUSHDB
    echo "  -> All data flushed"
    ;;
  sessions)
    echo "Flushing user sessions..."
    flush_pattern "gws:session:*"
    flush_pattern "gws:blacklist:*"
    ;;
  surge)
    echo "Flushing surge cache..."
    flush_pattern "gws:surge:*"
    ;;
  config)
    echo "Flushing config cache..."
    flush_pattern "gws:config:*"
    flush_pattern "gws:service:*"
    ;;
  ratelimit)
    echo "Flushing rate limits..."
    flush_pattern "gws:ratelimit:*"
    ;;
  drivers)
    echo "Flushing driver location cache..."
    flush_pattern "gws:drivers:*"
    flush_pattern "gws:driver:location:*"
    ;;
  pattern)
    flush_pattern "${2:?Pattern required}"
    ;;
  *)
    echo "Usage: $0 [all|sessions|surge|config|ratelimit|drivers|pattern PATTERN]"
    exit 1
    ;;
esac

echo ""
echo "Remaining keys: $($RCLI DBSIZE | awk '{print $2}')"
echo "========================================="

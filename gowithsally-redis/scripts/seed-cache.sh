#!/bin/bash
# GoWithSally - Redis Cache Seed Script
# Pre-populates Redis with essential cached data

set -euo pipefail

REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASS="${REDIS_PASSWORD:-sally_redis_2024}"

RCLI="redis-cli -h $REDIS_HOST -p $REDIS_PORT -a $REDIS_PASS --no-auth-warning"

echo "========================================="
echo "GoWithSally - Redis Cache Seeding"
echo "========================================="

# Service configuration cache
echo "[1/7] Caching service configurations..."
$RCLI SET "gws:service:sally_eco" '{"type":"sally_eco","basePrice":8,"pricePerKm":3,"pricePerMinute":0.3,"minimumFare":15,"multiplier":0.8,"commission":12,"active":true}' EX 86400
$RCLI SET "gws:service:sally_standard" '{"type":"sally_standard","basePrice":10,"pricePerKm":4,"pricePerMinute":0.4,"minimumFare":20,"multiplier":1.0,"commission":15,"active":true}' EX 86400
$RCLI SET "gws:service:sally_confort" '{"type":"sally_confort","basePrice":15,"pricePerKm":6,"pricePerMinute":0.6,"minimumFare":30,"multiplier":1.4,"commission":18,"active":true}' EX 86400
$RCLI SET "gws:service:sally_pool" '{"type":"sally_pool","basePrice":6,"pricePerKm":2.5,"pricePerMinute":0.25,"minimumFare":12,"multiplier":0.6,"commission":10,"active":true}' EX 86400
echo "  -> 4 services cached"

# Surge pricing zones
echo "[2/7] Caching surge zones..."
$RCLI HSET "gws:surge:casablanca" "maarif" "1.0" "ain_diab" "1.0" "anfa" "1.0" "derb_sultan" "1.0" "hay_hassani" "1.0" "sidi_maarouf" "1.0" "ain_sebaa" "1.0" "airport" "1.2"
$RCLI EXPIRE "gws:surge:casablanca" 300
echo "  -> Casablanca surge zones cached"

# App configuration
echo "[3/7] Caching app configuration..."
$RCLI HSET "gws:config:app" \
  "version" "1.0.0" \
  "minAppVersion" "1.0.0" \
  "maintenanceMode" "false" \
  "maxDriverSearchRadius" "5000" \
  "maxDriverSearchTime" "180" \
  "defaultLanguage" "fr" \
  "supportedLanguages" "fr,ar,en" \
  "currency" "MAD" \
  "maxWalletBalance" "5000" \
  "minTopup" "20" \
  "maxTopup" "2000"
echo "  -> App config cached"

# Rate limiting counters (initialize)
echo "[4/7] Initializing rate limit buckets..."
$RCLI SET "gws:ratelimit:global:counter" "0" EX 900
echo "  -> Rate limit buckets initialized"

# Emergency numbers
echo "[5/7] Caching emergency numbers..."
$RCLI HSET "gws:emergency" \
  "police" "19" \
  "ambulance" "15" \
  "fire" "15" \
  "gendarmerie" "177" \
  "sally_support" "+212600000002" \
  "sally_sos" "+212600000003"
echo "  -> Emergency numbers cached"

# City bounds (for geofencing)
echo "[6/7] Caching city geofences..."
$RCLI GEOADD "gws:cities" -7.5898 33.5731 "casablanca"
$RCLI GEOADD "gws:cities" -6.8416 34.0209 "rabat"
$RCLI GEOADD "gws:cities" -7.9811 31.6295 "marrakech"
$RCLI GEOADD "gws:cities" -5.0003 34.0331 "fes"
$RCLI GEOADD "gws:cities" -5.8340 35.7595 "tanger"
$RCLI GEOADD "gws:cities" -9.5981 30.4278 "agadir"
echo "  -> 6 cities geofenced"

# Online drivers count (sorted set for leaderboard)
echo "[7/7] Initializing driver metrics..."
$RCLI ZADD "gws:drivers:online:casablanca" 0 "init"
$RCLI DEL "gws:drivers:online:casablanca"
echo "  -> Driver metrics initialized"

# Stats
echo ""
echo "========================================="
echo "Cache seeding complete!"
echo "Total keys: $($RCLI DBSIZE | awk '{print $2}')"
echo "Memory used: $($RCLI INFO memory | grep 'used_memory_human' | cut -d: -f2 | tr -d '\r')"
echo "========================================="

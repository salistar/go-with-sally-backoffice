FROM redis:7.2-alpine

# Copy custom configuration
COPY config/redis.conf /usr/local/etc/redis/redis.conf

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD redis-cli ping | grep -q PONG || exit 1

EXPOSE 6379

CMD ["redis-server", "/usr/local/etc/redis/redis.conf"]

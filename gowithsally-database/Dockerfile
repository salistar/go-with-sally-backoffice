FROM mongo:7.0

# Set environment
ENV MONGO_INITDB_ROOT_USERNAME=gowithsally_admin
ENV MONGO_INITDB_ROOT_PASSWORD=sally_secure_2024
ENV MONGO_INITDB_DATABASE=gowithsally

# Copy initialization scripts
COPY scripts/01-init-db.js /docker-entrypoint-initdb.d/01-init-db.js
COPY scripts/02-create-indexes.js /docker-entrypoint-initdb.d/02-create-indexes.js
COPY scripts/03-seed-data.js /docker-entrypoint-initdb.d/03-seed-data.js

# Copy custom MongoDB config
COPY config/mongod.conf /etc/mongod.conf

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD mongosh --eval "db.adminCommand('ping')" --quiet || exit 1

EXPOSE 27017

CMD ["mongod", "--config", "/etc/mongod.conf"]

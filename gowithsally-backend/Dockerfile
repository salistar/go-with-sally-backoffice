##############################################################################
# GoWithSally Backend - Multi-stage Dockerfile
# Supports: development, testing, production
##############################################################################

FROM node:20-alpine AS dependencies

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json yarn.lock* ./

# ─── Development Stage ──────────────────────────────────────────────────────
FROM dependencies AS development

ENV NODE_ENV=development
ENV LOG_LEVEL=debug

# Install all dependencies including dev
RUN npm install

# Create required directories
RUN mkdir -p logs uploads/avatars uploads/documents uploads/chat uploads/vehicles

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

EXPOSE 5000

CMD ["dumb-init", "npm", "run", "dev"]

# ─── Testing Stage ──────────────────────────────────────────────────────────
FROM dependencies AS testing

ENV NODE_ENV=test
ENV LOG_LEVEL=warn

# Install all dependencies including dev
RUN npm install

# Create required directories
RUN mkdir -p logs uploads/avatars uploads/documents uploads/chat uploads/vehicles

# Copy application code
COPY . .

# Health check
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

EXPOSE 5000

CMD ["dumb-init", "npm", "run", "test"]

# ─── Production Stage ──────────────────────────────────────────────────────
FROM dependencies AS production

ENV NODE_ENV=production
ENV LOG_LEVEL=info

# Install production dependencies only
# npm install (pas npm ci) : package-lock.json desynchronise du package.json
# (meme contournement que la methode SallyCards : npm install --legacy-peer-deps)
RUN npm install --omit=dev --legacy-peer-deps && npm cache clean --force

# Create required directories
RUN mkdir -p logs uploads/avatars uploads/documents uploads/chat uploads/vehicles

# Copy application code
COPY . .

# L'image node:20-alpine fournit DEJA l'utilisateur/groupe 'node'.
# On reutilise cet utilisateur (addgroup/adduser echouait : deja existant).
RUN chown -R node:node /app

USER node

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

EXPOSE 5000

CMD ["dumb-init", "node", "server.js"]

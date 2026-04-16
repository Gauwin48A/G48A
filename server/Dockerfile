FROM node:20-alpine AS base

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init wget

# Install dependencies first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy application code (use .dockerignore to exclude node_modules, tests, etc.)
COPY src/ ./src/
COPY ecosystem.config.js ./
COPY migrations/ ./migrations/
COPY database/ ./database/

# Create non-root user
RUN addgroup -g 1001 -S mhub && \
    adduser -S mhub -u 1001 -G mhub && \
    mkdir -p /app/uploads /app/logs /app/private_uploads && \
    chown -R mhub:mhub /app

USER mhub

ENV NODE_ENV=production
ENV PORT=5001

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=10s --retries=3 --start-period=40s \
  CMD wget -qO- http://localhost:5001/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]

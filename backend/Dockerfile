# Production Dockerfile for VibeBox Backend
# Multi-stage build for optimized image size

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Install security updates and required tools
RUN apk update && \
    apk upgrade && \
    apk add --no-cache \
    ca-certificates \
    tini \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1000 vibebox && \
    adduser -D -u 1000 -G vibebox vibebox

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=vibebox:vibebox /app/node_modules ./node_modules
COPY --from=builder --chown=vibebox:vibebox /app/dist ./dist
COPY --from=builder --chown=vibebox:vibebox /app/prisma ./prisma
COPY --from=builder --chown=vibebox:vibebox /app/package*.json ./

# Create necessary directories with correct permissions
RUN mkdir -p /app/.cache /app/logs && \
    chown -R vibebox:vibebox /app

# Switch to non-root user
USER vibebox

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Use tini as entrypoint for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/index.js"]

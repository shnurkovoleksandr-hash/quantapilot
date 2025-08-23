# QuantaPilot™ API Gateway Dockerfile
# Purpose: Central API gateway for all QuantaPilot™ services
# Base image: Node.js 18 Alpine for minimal attack surface

FROM node:18-alpine

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    ca-certificates \
    dumb-init \
    && rm -rf /var/cache/apk/*

# Create application directory with proper permissions
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S api-gateway -u 1001 -G nodejs

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application source code
COPY --chown=api-gateway:nodejs . .

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R api-gateway:nodejs /app

# Switch to non-root user
USER api-gateway

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose service port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

# Labels for container metadata
LABEL maintainer="QuantaPilot™ Team <team@quantapilot.com>"
LABEL version="1.0.0"
LABEL description="API Gateway for QuantaPilot™ - Central routing and authentication"
LABEL service="api-gateway"
LABEL component="infrastructure"

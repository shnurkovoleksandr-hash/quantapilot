# QuantaPilot™ Cursor Integration Service Dockerfile
# Purpose: Handles AI agent communication with Cursor API
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
    adduser -S cursor-service -u 1001 -G nodejs

# Copy package files for dependency installation
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application source code
COPY --chown=cursor-service:nodejs . .

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && \
    chown -R cursor-service:nodejs /app

# Switch to non-root user
USER cursor-service

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Expose service port
EXPOSE 3001

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["npm", "start"]

# Labels for container metadata
LABEL maintainer="QuantaPilot™ Team <team@quantapilot.com>"
LABEL version="1.0.0"
LABEL description="Cursor Integration Service for QuantaPilot™ - AI agent communication"
LABEL service="cursor-integration"
LABEL component="ai-integration"

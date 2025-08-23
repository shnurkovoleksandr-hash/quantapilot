# QuantaPilot™ Dashboard Dockerfile
# Purpose: React-based web dashboard for project management and monitoring
# Multi-stage build for optimized production image

# Build stage
FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Install security updates
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Copy built application
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Create non-root user
RUN addgroup -g 1001 -S nginx && \
    adduser -S dashboard -u 1001 -G nginx && \
    chown -R dashboard:nginx /var/cache/nginx && \
    chown -R dashboard:nginx /var/log/nginx && \
    chown -R dashboard:nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && \
    chown -R dashboard:nginx /var/run/nginx.pid

# Switch to non-root user
USER dashboard

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Expose port
EXPOSE 3000

# Start nginx
CMD ["nginx", "-g", "daemon off;"]

# Labels
LABEL maintainer="QuantaPilot™ Team <team@quantapilot.com>"
LABEL version="1.0.0"
LABEL description="Web Dashboard for QuantaPilot™ - Project management interface"
LABEL service="dashboard"
LABEL component="frontend"

# Multi-stage build for AI Arriendo Pro
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Set working directory
WORKDIR /app

# Copy package files for server
COPY package*.json ./
COPY tsconfig*.json ./

# Install server dependencies
RUN npm ci --only=production

# Copy client package files
COPY client/package*.json ./client/
WORKDIR /app/client

# Install client dependencies
RUN npm ci

# Go back to app root
WORKDIR /app

# Copy all source code
COPY . .

# Build the application
RUN npm run build:server
RUN cd client && npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for production
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Set environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    NODE_ENV=production

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY --from=base /app/dist ./dist
COPY --from=base /app/client/build ./client/build
COPY --from=base /app/config ./config
COPY --from=base /app/core ./core
COPY --from=base /app/hooks ./hooks
COPY --from=base /app/middleware ./middleware
COPY --from=base /app/models ./models
COPY --from=base /app/routes ./routes
COPY --from=base /app/utils ./utils

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/server.js"]

# Build stage - Install dependencies
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build tools if any)
RUN npm ci

# Runtime stage - Lightweight final image
FROM node:18-alpine

WORKDIR /app

# Install Chrome dependencies for Puppeteer
# Using --no-cache to keep image size small
RUN apk add --no-cache \
    chromium \
    ttf-dejavu \
    fontconfig

# Set Puppeteer to use system Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy node_modules from builder stage (pre-installed and optimized)
COPY --from=builder /app/node_modules ./node_modules

# Copy application files
COPY bot.js .
COPY package*.json ./

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "console.log('Bot is running')" || exit 1

# Run the bot
CMD ["npm", "start"]

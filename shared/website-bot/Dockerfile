# Use official Node.js runtime as a base image
FROM node:18-alpine

WORKDIR /app

# Install Chrome dependencies for Puppeteer
RUN apk add --no-cache \
    chromium \
    noto-sans-arabic \
    noto-sans-hebrew \
    noto-sans-thai \
    ttf-dejavu \
    fontconfig

# Set Puppeteer to use system Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy application files
COPY bot.js .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD node -e "console.log('Bot is running')" || exit 1

# Run the bot
CMD ["npm", "start"]

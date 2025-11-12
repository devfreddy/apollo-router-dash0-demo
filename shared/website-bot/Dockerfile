# Locust-based load test container for Apollo Router
# Lightweight Python-based load testing with full OpenTelemetry support

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Playwright and build tools
# Use Playwright's supported dependencies list for Debian/Linux
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    python3-dev \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libxkbcommon0 \
    libxss1 \
    libgtk-3-0 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgbm1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxrandr2 \
    libxrender1 \
    libfontconfig1 \
    libfreetype6 \
    libnss3 \
    libnspr4 \
    fonts-liberation \
    xdg-utils \
    libasound2 \
    xvfb \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (chromium, firefox, webkit)
# This will download and install the browser binaries
RUN python -m playwright install chromium

# Copy application
COPY locustfile.py .
COPY entrypoint.sh .

# Make entrypoint executable
RUN chmod +x entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8089', timeout=5)" || exit 1

# Locust runs in headless mode by default
# Web UI available on port 8089
ENV LOCUST_HEADLESS=true
ENV LOCUST_LOGLEVEL=info
ENV LOCUST_HOST=http://willful-waste-website:8080
ENV LOCUST_USERS=5
ENV LOCUST_SPAWN_RATE=1
ENV OTEL_ENABLED=true
ENV PYTHONDONTWRITEBYTECODE=1

# Run Locust with entrypoint script to use environment variables
ENTRYPOINT ["./entrypoint.sh"]

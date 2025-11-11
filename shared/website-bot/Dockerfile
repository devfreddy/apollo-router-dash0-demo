# Locust-based load test container for Apollo Router
# Lightweight Python-based load testing with full OpenTelemetry support

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

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
ENV LOCUST_HOST=http://apollo-router:4000
ENV LOCUST_USERS=5
ENV LOCUST_SPAWN_RATE=1

# Run Locust with entrypoint script to use environment variables
ENTRYPOINT ["./entrypoint.sh"]

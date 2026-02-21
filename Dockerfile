# Use slim Python 3.11
FROM python:3.11-slim

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libxml2-dev libxslt-dev libffi-dev gcc && \
    rm -rf /var/lib/apt/lists/*

# Copy & install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Expose port (Railway uses $PORT, but this helps local dev)
EXPOSE 8000

# Start command — will be overridden by railway.json, but safe fallback
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
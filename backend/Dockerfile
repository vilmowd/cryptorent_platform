# 1. Use 3.12 to support numpy 2.4.3
FROM python:3.12-slim

# 2. Basic environment setup
# We put these at the top so Python behaves correctly from the start
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# 3. Install system dependencies
# We combine these to keep the image small
RUN apt-get update && apt-get install -y \
    build-essential \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# 4. Install Python dependencies
# We upgrade pip BEFORE copying requirements
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy project files
COPY . .

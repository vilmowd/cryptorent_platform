# 1. Use 3.12 to support numpy 2.4.3
FROM python:3.12-slim

# 2. Basic environment setup
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# 3. Install system dependencies
# Added 'libatomic1' which Railpack often looks for
RUN apt-get update && apt-get install -y \
    build-essential \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# 4. Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 5. Copy project files
COPY . .

# 6. Use the $PORT variable provided by Railway
# If $PORT isn't set, it defaults to 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
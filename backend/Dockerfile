# 1. Use 3.12 to support numpy 2.4.3
FROM python:3.12-slim

# 2. Basic environment setup
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/backend:/backend/app

# 3. Set the working directory to the root of your project
WORKDIR /backend

# 4. Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libatomic1 \
    && rm -rf /var/lib/apt/lists/*

# 5. Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy all files from 'backend' into the container
COPY . .

# 7. Start the application
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0"]
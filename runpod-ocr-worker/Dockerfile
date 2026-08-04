FROM python:3.10-slim

# Install system dependencies (OpenCV butuh libGL)
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements & handler
COPY requirements.txt .
COPY handler.py .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Start the RunPod handler
CMD ["python", "-u", "/app/handler.py"]

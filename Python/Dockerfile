FROM python:3.10

# Set the working directory
WORKDIR /app

# Set PYTHONPATH to include /app
ENV PYTHONPATH=/app

# Ensure Python output is unbuffered for immediate logging
ENV PYTHONUNBUFFERED=1

# Copy the requirements file into the container
COPY requirements.txt /app/

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application files into the container
COPY . /app/

# Set environment variables file (optional, to be mounted later)
# You can mount your environment variables file during runtime using Docker Compose or `docker run`.

# Command to run the application (update this as needed)
CMD ["python", "app.py"]
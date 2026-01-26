FROM node:20-slim as builder

# Set the working directory for our build process
WORKDIR /app

# Copy the frontend's package files first to leverage Docker's layer caching.
COPY frontend/package*.json ./frontend/
# Run 'npm install' from the context of the 'frontend' subdirectory
RUN npm --prefix frontend install

# Copy the rest of the frontend source code
COPY frontend/ ./frontend/
# Run the build script, which will create the 'frontend/dist' directory
RUN npm --prefix frontend run build


# STAGE 2: Build the Python Production Image
# This stage creates the final, lean container with our Python app and the built frontend.
FROM python:3.13-slim

# Set the final working directory
WORKDIR /app

# Install uv, our fast package manager
RUN pip install uv

# Copy the requirements.txt from the backend directory
COPY requirements.txt .
# Install the Python dependencies
RUN uv pip install --no-cache-dir --system -r requirements.txt

# Copy the contents of your backend application directory directly into the working directory.
COPY backend/app/ .

# CRITICAL STEP: Copy the built frontend assets from the 'builder' stage.
# We copy to /frontend/dist because main.py looks for "../../frontend/dist"
# When main.py is in /app, "../../" resolves to "/", so it looks for /frontend/dist
COPY --from=builder /app/frontend/dist /frontend/dist

# Cloud Run injects a PORT environment variable, which your main.py uses (defaults to 8080).
EXPOSE 8080

# Set the command to run the application.
CMD ["python", "main.py"]

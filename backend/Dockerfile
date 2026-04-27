# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Build the backend
FROM python:3.11-slim

# Install uv
RUN pip install uv

WORKDIR /app

# Copy dependency files
COPY backend/requirements.txt .

# Install dependencies using uv
RUN uv pip install --system -r requirements.txt

# Copy source code
COPY backend/ .

# Copy built frontend
COPY --from=frontend-builder /frontend/out /frontend-build

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

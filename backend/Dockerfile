FROM python:3.11-slim

# Install uv
RUN pip install uv

WORKDIR /app

# Copy dependency files
COPY requirements.txt .

# Install dependencies using uv
RUN uv pip install --system -r requirements.txt

# Copy source code
COPY . .

# Run the app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

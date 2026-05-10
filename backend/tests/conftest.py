import os
import sys
from pathlib import Path

# Set TESTING environment variable BEFORE importing main to disable rate limiter
os.environ["TESTING"] = "1"

# Add the backend directory to the Python path so tests can import from main, ai, etc.
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

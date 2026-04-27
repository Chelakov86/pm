from fastapi import FastAPI
from fastapi.responses import HTMLResponse
import os
from fastapi.staticfiles import StaticFiles

app = FastAPI()

@app.get("/api/hello")
def read_hello():
    return {"message": "Hello World"}

frontend_build_dir = "/frontend-build"
local_build_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "out")

if os.path.exists(frontend_build_dir):
    app.mount("/", StaticFiles(directory=frontend_build_dir, html=True), name="static")
elif os.path.exists(local_build_dir):
    app.mount("/", StaticFiles(directory=local_build_dir, html=True), name="static")
else:
    @app.get("/")
    def read_root():
        return {"message": "Frontend build not found. Run 'npm run build' in the frontend directory."}


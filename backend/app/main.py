import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from backend.app.core.config import settings, SESSIONS_DIR, DOCS_DIR
from backend.app.db.database import init_db
from backend.app.api.endpoints import router as api_router
from backend.app.api.websocket import ws_router
from backend.app.services.demo_service import demo_service

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("LearnLensAI")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and seed demo session
    logger.info("Initializing LearnLens AI SQLite database...")
    init_db()
    logger.info("Database initialized successfully.")
    
    # Pre-seed high-yield demo session so users/evaluators can test instantly
    try:
        demo_id = demo_service.seed_demo_session()
        logger.info(f"Verified seed demo session: {demo_id}")
    except Exception as e:
        logger.warning(f"Could not seed demo session: {e}")
        
    yield
    logger.info("Shutting down LearnLens AI server...")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Local-first personal AI learning companion that observes user-authorized Chrome tabs and teaches through interactive dialogue.",
    lifespan=lifespan
)

# Enable CORS for local development and Chrome Extensions
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API and WebSocket routers
app.include_router(api_router, prefix=settings.API_PREFIX)
app.include_router(ws_router)

import os
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "frontend", "dist")

@app.get("/")
def root():
    return {
        "app": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "version": settings.VERSION,
        "status": "ONLINE",
        "api_docs": "/docs",
        "web_app": "/app" if os.path.exists(frontend_dist) else "http://localhost:5173"
    }

# Mount frontend/dist at /app if built
if os.path.exists(frontend_dist) and os.path.isfile(os.path.join(frontend_dist, "index.html")):
    app.mount("/app", StaticFiles(directory=frontend_dist, html=True), name="frontend_app")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main.py:app", host=settings.HOST, port=settings.PORT, reload=True)

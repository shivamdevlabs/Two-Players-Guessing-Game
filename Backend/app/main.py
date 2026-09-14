import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.database.mongo import db_manager
from app.api.games import router as games_router
from app.api.ws import router as ws_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("guessing_game")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up Two-Player Guessing Game Backend...")
    await db_manager.connect()
    yield
    logger.info("Shutting down Two-Player Guessing Game Backend...")
    await db_manager.close()

app = FastAPI(
    title="Two Player Guessing Game API",
    description="Production-grade real-time multiplayer guessing game backend with WebSockets and MongoDB.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for cleaner frontend error messages
@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled error on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An internal server error occurred. Please try again."}
    )

# Routes
app.include_router(games_router, prefix="/api")
app.include_router(ws_router)

@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "mock_db": db_manager.is_mock,
        "database": settings.DATABASE_NAME
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from app.api.v1.router import api_router
from app.core.config import settings
from app.db.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: check database connection if configured
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        print("[INFO] Database connection verified successfully.")
    except Exception as e:
        print(f"[WARNING] Database connection check deferred or failed: {e}")
    yield
    # Shutdown
    await engine.dispose()
    print("[INFO] Database engine disposed.")


app = FastAPI(
    title="Personal Client Hunting Tool API",
    description="Private lead discovery, technical website auditing, AI qualification, and client CRM.",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Router
app.include_router(api_router, prefix="/api/v1")


@app.get("/healthz", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "client-hunter-api",
        "environment": settings.ENVIRONMENT,
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred.", "error": str(exc)[:200]},
    )

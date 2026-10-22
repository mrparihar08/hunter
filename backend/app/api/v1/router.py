from fastapi import APIRouter
from app.api.v1.endpoints import (
    analytics,
    audits,
    auth,
    followups,
    leads,
    outreach,
    search,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(search.router, prefix="/search", tags=["Search & Ingestion"])
api_router.include_router(leads.router, prefix="/leads", tags=["Lead Management"])
api_router.include_router(audits.router, prefix="", tags=["Website Audits"])
api_router.include_router(outreach.router, prefix="", tags=["AI Qualification & Outreach"])
api_router.include_router(followups.router, prefix="/followups", tags=["Follow-ups"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])

from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.search import DeepLinkQuery, PlacesSearchRequest
from app.services.adapters.deep_links import build_custom_deep_link, generate_curated_deep_links
from app.services.adapters.google_places import search_google_places

router = APIRouter()


@router.get("/deep-links", response_model=List[DeepLinkQuery])
async def get_curated_deep_links():
    """Returns curated high-yield search queries across LinkedIn, X, Upwork, and Facebook."""
    return generate_curated_deep_links()


@router.get("/custom-deep-link")
async def generate_custom_link(
    platform: str = Query(..., description="Target platform: linkedin, twitter, upwork, facebook, instagram"),
    keywords: str = Query(..., description="Search keyword terms"),
):
    """Generates a direct platform query link given custom user keywords."""
    url = build_custom_deep_link(platform, keywords)
    return {
        "platform": platform,
        "keywords": keywords,
        "generated_url": url,
    }


@router.post("/places")
async def search_places(
    request: PlacesSearchRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Queries Google Places API (New) with field masks.
    Returns status: UNCONFIGURED if API key is not yet set in .env.
    """
    return await search_google_places(request.query, request.location)

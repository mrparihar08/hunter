from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.search import (
    CompiledQueryResponse,
    DeepLinkQuery,
    DorkQuery,
    GeoLocationPreset,
    IndustryPreset,
    PlacesSearchRequest,
    QueryCompileRequest,
)
from app.services.adapters.deep_links import (
    generate_curated_deep_links,
    get_curated_google_dorks,
    get_geo_targets,
    get_industry_catalog,
    get_standard_exclusions,
)
from app.services.adapters.google_places import search_google_places
from app.services.query_compiler import compile_search_query

router = APIRouter()


@router.get("/deep-links", response_model=List[DeepLinkQuery])
async def get_curated_deep_links():
    """Returns curated high-yield search queries across LinkedIn, X, Reddit, Upwork, and Facebook."""
    return generate_curated_deep_links()


@router.post("/compile", response_model=CompiledQueryResponse)
async def compile_query(request: QueryCompileRequest):
    """
    Compiles positive phrases, negative exclusions, industry context, and geo-tokens
    into a valid, platform-tailored Boolean search query with live URL.
    """
    return compile_search_query(request)


@router.get("/niches", response_model=List[IndustryPreset])
async def list_industry_niches():
    """Returns the 12-niche industry catalog with buying intents and suggested services."""
    return get_industry_catalog()


@router.get("/geo-targets", response_model=List[GeoLocationPreset])
async def list_geo_targets():
    """Returns curated target locations across India and high-ticket international markets."""
    return get_geo_targets()


@router.get("/standard-negatives", response_model=List[str])
async def list_standard_negatives():
    """Returns recommended negative exclusion phrases to eliminate spam."""
    return get_standard_exclusions()


@router.get("/dorks", response_model=List[DorkQuery])
async def list_google_dorks():
    """Returns pre-built Google Search Operator queries for Website Opportunity Discovery."""
    return get_curated_google_dorks()


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

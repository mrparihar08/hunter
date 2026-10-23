import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.query_preset import QueryPreset
from app.models.user import User
from app.schemas.search import (
    CompiledQueryResponse,
    DeepLinkQuery,
    DorkQuery,
    GeoLocationPreset,
    IcebreakerRequest,
    IcebreakerResponse,
    IndustryPreset,
    PlacesSearchRequest,
    QueryCompileRequest,
    QueryPresetCreate,
    QueryPresetResponse,
)
from app.services.adapters.deep_links import (
    generate_curated_deep_links,
    get_curated_google_dorks,
    get_geo_targets,
    get_industry_catalog,
    get_standard_exclusions,
)
from app.services.adapters.google_places import search_google_places
from app.services.ai_qualifier import generate_icebreaker_pitch
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


@router.post("/icebreaker", response_model=IcebreakerResponse)
async def create_icebreaker(request: IcebreakerRequest):
    """
    Feature F: Generates tailored, non-spammy outreach messages for Twitter,
    LinkedIn, Reddit, Email, and Hinglish.
    """
    res = await generate_icebreaker_pitch(
        platform=request.platform,
        lead_title=request.lead_title,
        contact_name=request.contact_name,
        industry=request.industry,
        tone=request.tone,
        language=request.language,
        context_snippet=request.context_snippet,
        portfolio_url=request.portfolio_url,
        audit_issues=request.audit_issues,
    )
    return IcebreakerResponse(**res)


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


# --- Presets Persistence Endpoints (Authenticated) ---

@router.get("/presets", response_model=List[QueryPresetResponse])
async def list_user_presets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = (
        select(QueryPreset)
        .where(QueryPreset.user_id == current_user.id)
        .order_by(QueryPreset.is_favorite.desc(), QueryPreset.created_at.desc())
    )
    result = await db.execute(stmt)
    presets = result.scalars().all()
    return [QueryPresetResponse.model_validate(p) for p in presets]


@router.post("/presets", response_model=QueryPresetResponse, status_code=status.HTTP_201_CREATED)
async def create_user_preset(
    preset_in: QueryPresetCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    preset = QueryPreset(
        user_id=current_user.id,
        preset_name=preset_in.preset_name.strip(),
        platform=preset_in.platform,
        industry=preset_in.industry,
        location_target=preset_in.location_target,
        positive_keywords=preset_in.positive_keywords,
        negative_keywords=preset_in.negative_keywords,
        language=preset_in.language,
        intent_level=preset_in.intent_level,
        is_favorite=preset_in.is_favorite,
    )
    db.add(preset)
    await db.commit()
    await db.refresh(preset)
    return QueryPresetResponse.model_validate(preset)


@router.delete("/presets/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_preset(
    preset_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(QueryPreset).where(
        QueryPreset.id == preset_id,
        QueryPreset.user_id == current_user.id,
    )
    result = await db.execute(stmt)
    preset = result.scalars().first()
    if not preset:
        raise HTTPException(status_code=404, detail="Preset not found")
    await db.delete(preset)
    await db.commit()
    return None


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

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class DeepLinkQuery(BaseModel):
    platform: str
    target_category: str
    query_text: str
    generated_url: str
    description: str


class SocialHubCatalog(BaseModel):
    queries: List[DeepLinkQuery]


class PlacesSearchRequest(BaseModel):
    query: str
    location: Optional[str] = None
    radius_meters: Optional[int] = 10000


class SearchResultItem(BaseModel):
    business_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    website_url: Optional[str] = None
    rating: Optional[float] = None
    user_ratings_total: Optional[int] = None
    place_id: Optional[str] = None
    is_saved: bool = False
    existing_lead_id: Optional[str] = None


# --- Advanced Query Builder Schemas (Feature A, B, C, D, E) ---

class QueryCompileRequest(BaseModel):
    platform: str = Field(..., description="Target: twitter | linkedin | reddit | upwork | google_dork | facebook | instagram")
    positive_keywords: List[str] = Field(default_factory=list, description="Positive intent phrases")
    negative_keywords: List[str] = Field(default_factory=list, description="Exclusion terms to filter out spam")
    industry_id: Optional[str] = Field(None, description="Industry slug (e.g. healthcare, restaurants, d2c)")
    location_target: Optional[str] = Field(None, description="Target city/region (e.g. Delhi NCR, Mumbai, Dubai, USA)")
    service_type: Optional[str] = Field(None, description="redesign | ecommerce | mvp | maintenance | new_site")
    recency: Optional[str] = Field(None, description="24h | week | month | all")
    require_budget_signals: bool = Field(False, description="Whether to require budget/paid commercial signals")
    language: str = Field("en", description="Language mode: en | hi | hinglish | all")
    intent_preset: str = Field("HIGH", description="BROAD | HIGH | HIRING | CUSTOM")
    subreddits: Optional[List[str]] = Field(default=None, description="Subreddit names for Reddit searches")
    dork_mode: Optional[str] = Field(None, description="outdated_copyright | insecure_http | missing_mobile")


class CompiledQueryResponse(BaseModel):
    platform: str
    raw_query: str
    generated_url: str
    positive_clauses: List[str]
    negative_clauses: List[str]
    location_clause: Optional[str] = None
    operator_notes: str
    integration_status: str  # CONNECTED | AVAILABLE_VIA_SEARCH | LIMITED | UNAVAILABLE


class IndustryPreset(BaseModel):
    id: str
    name: str
    buying_intents: List[str]
    hinglish_variants: List[str]
    suggested_services: List[str]
    recommended_negatives: List[str]
    rationale: str


class GeoLocationPreset(BaseModel):
    region: str  # INDIA | INTERNATIONAL
    name: str
    search_tokens: List[str]


class DorkQuery(BaseModel):
    category: str
    dork_syntax: str
    target_industry: str
    target_location: str
    generated_url: str
    verification_advice: str


# --- Preset Persistence Schemas ---

class QueryPresetCreate(BaseModel):
    preset_name: str
    platform: str
    industry: Optional[str] = None
    location_target: Optional[str] = None
    positive_keywords: List[str]
    negative_keywords: List[str] = []
    language: str = "en"
    intent_level: str = "HIGH"
    is_favorite: bool = False


class QueryPresetResponse(QueryPresetCreate):
    id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# --- Feature F: Icebreaker Schemas ---

class IcebreakerRequest(BaseModel):
    platform: str = Field(..., description="TWITTER | LINKEDIN | REDDIT | EMAIL | HINGLISH")
    lead_title: str = Field(..., description="Business name or project title")
    contact_name: Optional[str] = None
    industry: Optional[str] = None
    tone: str = Field("CONSULTATIVE", description="SHORT | PROFESSIONAL | FRIENDLY | CONSULTATIVE")
    language: str = Field("en", description="en | hi | hinglish")
    context_snippet: Optional[str] = None
    portfolio_url: Optional[str] = None
    audit_issues: Optional[List[str]] = None


class IcebreakerResponse(BaseModel):
    platform: str
    tone: str
    subject_line: Optional[str] = None
    message_body: str
    caution_notes: str

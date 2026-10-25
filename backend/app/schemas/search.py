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

class SubQueryItem(BaseModel):
    label: str
    raw_query: str
    generated_url: str
    operator_notes: Optional[str] = None


class SearchGroupPreset(BaseModel):
    id: str
    name: str
    description: str
    is_indirect: bool = False
    default_positive_keywords: List[str]
    default_hinglish_keywords: List[str] = []
    default_negative_exclusions: List[str] = []


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
    search_group: Optional[str] = Field("GROUP_A", description="GROUP_A | GROUP_B | GROUP_C | GROUP_D | ALL | CUSTOM")


class CompiledQueryResponse(BaseModel):
    platform: str
    raw_query: str
    generated_url: str
    positive_clauses: List[str]
    negative_clauses: List[str]
    location_clause: Optional[str] = None
    operator_notes: str
    integration_status: str  # CONNECTED | AVAILABLE_VIA_SEARCH | LIMITED | UNAVAILABLE
    search_group: Optional[str] = None
    sub_queries: List[SubQueryItem] = []


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



# --- Unified Source Registry Schemas ---

class SourceRegistryItem(BaseModel):
    source_id: str
    name: str
    category: str  # social | freelance | directory | startup | search_engine | other
    source_mode: str  # official_api | authorized_integration | manual_search | not_configured | unsupported
    description: str
    is_automated: bool = False
    auth_status: str = "NOT_REQUIRED"  # READY | NEEDS_KEY | NOT_REQUIRED | RESTRICTED
    supported_filters: List[str] = Field(default_factory=list)
    is_indirect: bool = False
    compliance_notes: Optional[str] = None
    example_url: Optional[str] = None


class MultiQueryCompileRequest(BaseModel):
    sources: List[str] = Field(..., description="List of source IDs to compile queries for")
    positive_keywords: List[str] = Field(default_factory=list)
    negative_keywords: List[str] = Field(default_factory=list)
    industry_id: Optional[str] = None
    location_target: Optional[str] = None
    service_type: Optional[str] = None
    recency: Optional[str] = None
    require_budget_signals: bool = False
    language: str = "en"
    search_group: Optional[str] = "GROUP_A"
    subreddits: Optional[List[str]] = None
    dork_mode: Optional[str] = None


class MultiQueryCompileResponse(BaseModel):
    queries: List[CompiledQueryResponse]
    total_sources: int
    total_sub_queries: int


# --- Hacker News Automated Search Schemas ---

class HackerNewsSearchRequest(BaseModel):
    query: str = Field("web developer", description="Search query")
    tags: Optional[str] = Field("story", description="story | comment | (story,comment)")
    hits_per_page: int = Field(15, ge=1, le=50)


class HackerNewsLeadItem(BaseModel):
    object_id: str
    title: str
    story_text: Optional[str] = None
    url: str
    author: str
    created_at: str
    intent_category: str
    lead_score: int
    positive_evidence: List[str] = Field(default_factory=list)
    negative_evidence: List[str] = Field(default_factory=list)
    explanation: str
    is_indirect: bool = False


class HackerNewsSearchResponse(BaseModel):
    status: str
    message: str
    total_hits: int
    leads: List[HackerNewsLeadItem] = Field(default_factory=list)

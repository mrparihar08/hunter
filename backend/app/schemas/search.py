from typing import List, Optional
from pydantic import BaseModel


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

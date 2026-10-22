import logging
from typing import Any, Dict, List, Optional
import httpx
from app.core.config import settings
from app.schemas.search import SearchResultItem

logger = logging.getLogger(__name__)

PLACES_SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText"


async def search_google_places(
    query: str,
    location: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Executes a structured search against the Google Places API (New).
    Enforces strict field masking to control API cost.
    If GOOGLE_PLACES_API_KEY is not configured, returns an informative status notice.
    """
    if not settings.GOOGLE_PLACES_API_KEY:
        return {
            "status": "UNCONFIGURED",
            "message": "Google Places API key is not configured in .env. Use the Assisted Deep-Link Search or add your key.",
            "results": [],
        }

    full_query = f"{query} in {location}" if location else query

    # Cost-efficient FieldMask (only request essentials)
    headers = {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": settings.GOOGLE_PLACES_API_KEY,
        "X-Goog-FieldMask": (
            "places.id,"
            "places.displayName,"
            "places.formattedAddress,"
            "places.nationalPhoneNumber,"
            "places.websiteUri,"
            "places.rating,"
            "places.userRatingCount"
        ),
    }

    payload = {
        "textQuery": full_query,
        "pageSize": 20,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(PLACES_SEARCH_TEXT_URL, json=payload, headers=headers)
            if response.status_code != 200:
                logger.error(f"Google Places API error ({response.status_code}): {response.text}")
                return {
                    "status": "ERROR",
                    "message": f"Places API returned status {response.status_code}: {response.text[:150]}",
                    "results": [],
                }

            data = response.json()
            raw_places = data.get("places", [])
            items: List[SearchResultItem] = []

            for p in raw_places:
                display_name = p.get("displayName", {}).get("text", "Unknown Business")
                items.append(
                    SearchResultItem(
                        business_name=display_name,
                        address=p.get("formattedAddress"),
                        phone=p.get("nationalPhoneNumber"),
                        website_url=p.get("websiteUri"),
                        rating=p.get("rating"),
                        user_ratings_total=p.get("userRatingCount"),
                        place_id=p.get("id"),
                    )
                )

            return {
                "status": "SUCCESS",
                "message": f"Found {len(items)} places.",
                "results": [item.dict() for item in items],
            }

    except Exception as e:
        logger.error(f"Error querying Google Places: {str(e)}")
        return {
            "status": "ERROR",
            "message": f"Network error during Places request: {str(e)}",
            "results": [],
        }

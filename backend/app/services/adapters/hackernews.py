import logging
import re
from typing import Any, Dict, List, Optional
import httpx
from app.schemas.search import HackerNewsLeadItem, HackerNewsSearchResponse
from app.services.lead_classifier import classify_lead_intent

logger = logging.getLogger(__name__)

HN_ALGOLIA_SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date"


def strip_html_tags(text: str) -> str:
    """Removes HTML formatting tags from Algolia comments/stories."""
    if not text:
        return ""
    clean = re.sub(r"<[^>]+>", " ", text)
    return re.sub(r"\s+", " ", clean).strip()


async def search_hacker_news(
    query: str = "web developer",
    tags: str = "story",
    hits_per_page: int = 15,
) -> HackerNewsSearchResponse:
    """
    Executes an automated, rate-compliant search against the official Algolia Hacker News API.
    Normalizes stories and comments into structured leads and evaluates buyer intent
    using the deterministic Lead Classifier engine.
    """
    params = {
        "query": query,
        "tags": tags,
        "hitsPerPage": min(hits_per_page, 50),
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(HN_ALGOLIA_SEARCH_URL, params=params)
            if resp.status_code != 200:
                logger.error(f"Algolia HN API returned status {resp.status_code}: {resp.text[:200]}")
                return HackerNewsSearchResponse(
                    status="ERROR",
                    message=f"Hacker News API error (HTTP {resp.status_code})",
                    total_hits=0,
                    leads=[],
                )

            data = resp.json()
            hits = data.get("hits", [])
            leads: List[HackerNewsLeadItem] = []

            for hit in hits:
                obj_id = str(hit.get("objectID") or "")
                raw_title = hit.get("title") or hit.get("story_title") or ""
                raw_text = hit.get("story_text") or hit.get("comment_text") or ""
                clean_text = strip_html_tags(raw_text)
                author = hit.get("author") or "anonymous"
                created_at = hit.get("created_at") or ""

                # Construct canonical permalink
                ext_url = hit.get("url")
                if not ext_url:
                    ext_url = f"https://news.ycombinator.com/item?id={obj_id}"

                display_title = raw_title if raw_title else (clean_text[:90] + "..." if len(clean_text) > 90 else clean_text)
                full_body = f"{display_title}\n{clean_text}".strip()

                # Run buyer-intent evaluation
                eval_res = classify_lead_intent(
                    text=full_body,
                    author_role=f"HN User ({author})",
                )

                leads.append(
                    HackerNewsLeadItem(
                        object_id=obj_id,
                        title=display_title,
                        story_text=clean_text[:400] if clean_text else None,
                        url=ext_url,
                        author=author,
                        created_at=created_at,
                        intent_category=eval_res.intent_category,
                        lead_score=eval_res.lead_score,
                        positive_evidence=eval_res.positive_evidence,
                        negative_evidence=eval_res.negative_evidence,
                        explanation=eval_res.explanation,
                        is_indirect=eval_res.is_indirect_opportunity,
                    )
                )

            return HackerNewsSearchResponse(
                status="SUCCESS",
                message=f"Retrieved and evaluated {len(leads)} Hacker News discussions.",
                total_hits=len(leads),
                leads=leads,
            )

    except Exception as exc:
        logger.error(f"Failed to query Hacker News Algolia API: {str(exc)}")
        return HackerNewsSearchResponse(
            status="ERROR",
            message=f"Network error querying Hacker News: {str(exc)}",
            total_hits=0,
            leads=[],
        )

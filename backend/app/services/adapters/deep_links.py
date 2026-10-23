from typing import Any, Dict, List
from app.schemas.search import DeepLinkQuery, DorkQuery, GeoLocationPreset, IndustryPreset
from app.services.query_compiler import (
    GEO_TARGETS,
    INDUSTRY_CATALOG,
    STANDARD_EXCLUSIONS,
    clean_phrase,
    compile_search_query,
)


def get_industry_catalog() -> List[IndustryPreset]:
    """Returns the curated 12-niche industry catalog with buying intents and suggested services."""
    presets = []
    for ind_id, item in INDUSTRY_CATALOG.items():
        presets.append(
            IndustryPreset(
                id=item["id"],
                name=item["name"],
                buying_intents=item["buying_intents"],
                hinglish_variants=item["hinglish_variants"],
                suggested_services=item["suggested_services"],
                recommended_negatives=item["recommended_negatives"],
                rationale=item["rationale"],
            )
        )
    return presets


def get_geo_targets() -> List[GeoLocationPreset]:
    """Returns the curated list of India and International high-ticket target locations."""
    targets = []
    for geo_id, item in GEO_TARGETS.items():
        targets.append(
            GeoLocationPreset(
                region=item["region"],
                name=item["name"],
                search_tokens=item["search_tokens"],
            )
        )
    return targets


def get_standard_exclusions() -> List[str]:
    """Returns recommended negative exclusion phrases to eliminate spam."""
    return list(STANDARD_EXCLUSIONS)


# Curated query matrices for English, Hindi, and Hinglish search patterns
QUERY_TEMPLATES = [
    {
        "platform": "LinkedIn",
        "category": "Explicit Web Dev Need",
        "keywords": '"need a website" OR "looking for a website developer" OR "web developer required"',
        "url_template": "https://www.linkedin.com/search/results/content/?keywords={query}&sortBy=%22date_posted%22",
        "description": "Recent public posts on LinkedIn explicitly seeking website development services.",
    },
    {
        "platform": "LinkedIn",
        "category": "E-commerce & Redesign",
        "keywords": '"website redesign" OR "Shopify developer needed" OR "ecommerce website banwani"',
        "url_template": "https://www.linkedin.com/search/results/content/?keywords={query}&sortBy=%22date_posted%22",
        "description": "Businesses and agency founders requesting redesigns and store builds.",
    },
    {
        "platform": "X (Twitter)",
        "category": "Direct Intent & Hiring",
        "keywords": '("need a web developer" OR "looking for a web developer" OR "hire a web developer") -is:retweet',
        "url_template": "https://twitter.com/search?q={query}&f=live",
        "description": "Live, real-time tweets requesting developer recommendations.",
    },
    {
        "platform": "X (Twitter)",
        "category": "Hinglish / Regional Need",
        "keywords": '("website developer chahiye" OR "website banwani hai" OR "koi website bana sakta hai") -is:retweet',
        "url_template": "https://twitter.com/search?q={query}&f=live",
        "description": "Hindi / Hinglish business owners and creators asking for website help.",
    },
    {
        "platform": "Reddit",
        "category": "Verified Client Hiring",
        "keywords": '(subreddit:forhire OR subreddit:freelance_forhire) flair:"Hiring" ("web developer" OR "website")',
        "url_template": "https://www.reddit.com/search/?q={query}&sort=new",
        "description": "Direct client hiring posts on Reddit freelancing communities.",
    },
    {
        "platform": "Upwork",
        "category": "High-Converting Web Projects",
        "keywords": "website development React Python",
        "url_template": "https://www.upwork.com/nx/search/jobs/?q={query}&payment_verified=1&proposals=0-4&sort=recency",
        "description": "Fresh Upwork postings with verified payment and under 5 proposals.",
    },
    {
        "platform": "Facebook",
        "category": "Business Groups / Indian Freelancers",
        "keywords": "website developer chahiye web design",
        "url_template": "https://www.facebook.com/search/posts/?q={query}",
        "description": "Facebook group and public page posts for local and small business leads.",
    },
    {
        "platform": "Instagram",
        "category": "New Stores & Creators",
        "keywords": "new store launch website coming soon",
        "url_template": "https://www.instagram.com/explore/tags/{query}/",
        "description": "Emerging retail and D2C brands that may lack an optimized e-commerce store.",
    },
]


def generate_curated_deep_links() -> List[DeepLinkQuery]:
    """Returns the standardized, high-yield deep link queries across platforms."""
    from urllib.parse import quote_plus
    results = []
    for item in QUERY_TEMPLATES:
        encoded_query = quote_plus(item["keywords"])
        url = item["url_template"].format(query=encoded_query)
        results.append(
            DeepLinkQuery(
                platform=item["platform"],
                target_category=item["category"],
                query_text=item["keywords"],
                generated_url=url,
                description=item["description"],
            )
        )
    return results


def get_curated_google_dorks() -> List[DorkQuery]:
    """Returns pre-built Google Search Operator discovery queries (Website Opportunity Finder)."""
    from urllib.parse import quote
    dorks = [
        {
            "category": "Outdated Maintenance",
            "syntax": 'site:.in "all rights reserved 2018..2021" "interior designer" "Delhi"',
            "industry": "Interior Design",
            "location": "Delhi NCR",
            "advice": "Verify if the website shows ancient copyright years, broken galleries, or lack of recent projects.",
        },
        {
            "category": "Insecure HTTP Websites",
            "syntax": 'site:.in "contact us" -inurl:https "dental clinic" "Mumbai"',
            "industry": "Healthcare",
            "location": "Mumbai",
            "advice": "Check whether Google marks the site 'Not Secure' (HTTP). Pitch SSL setup and modern redesign.",
        },
        {
            "category": "Missing Mobile Viewport",
            "syntax": 'site:.in "best viewed in" "restaurant" "Bangalore"',
            "industry": "Restaurants",
            "location": "Bangalore",
            "advice": "Legacy sites with fixed desktop layouts convert poorly on smartphones. Pitch modern responsive design.",
        },
        {
            "category": "D2C Stores Needing Redesign",
            "syntax": 'site:.in "powered by opencart" OR "powered by oscommerce" "clothing"',
            "industry": "D2C Apparel",
            "location": "India",
            "advice": "Legacy e-commerce CMS stores can be migrated to modern Shopify or custom Next.js storefronts.",
        },
    ]

    results = []
    for d in dorks:
        encoded = quote(d["syntax"])
        results.append(
            DorkQuery(
                category=d["category"],
                dork_syntax=d["syntax"],
                target_industry=d["industry"],
                target_location=d["location"],
                generated_url=f"https://www.google.com/search?q={encoded}",
                verification_advice=d["advice"],
            )
        )
    return results

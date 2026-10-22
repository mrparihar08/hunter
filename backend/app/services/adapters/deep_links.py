from typing import List
from urllib.parse import quote_plus
from app.schemas.search import DeepLinkQuery


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


def build_custom_deep_link(platform: str, user_keywords: str) -> str:
    """Generates a custom platform search link given user-entered keywords."""
    encoded = quote_plus(user_keywords.strip())
    p = platform.lower()
    if "linkedin" in p:
        return f"https://www.linkedin.com/search/results/content/?keywords={encoded}&sortBy=%22date_posted%22"
    elif "twitter" in p or "x" in p:
        return f"https://twitter.com/search?q={encoded}%20-is:retweet&f=live"
    elif "upwork" in p:
        return f"https://www.upwork.com/nx/search/jobs/?q={encoded}&sort=recency"
    elif "facebook" in p:
        return f"https://www.facebook.com/search/posts/?q={encoded}"
    elif "instagram" in p:
        tag_clean = user_keywords.replace(" ", "").replace("#", "")
        return f"https://www.instagram.com/explore/tags/{tag_clean}/"
    else:
        return f"https://www.google.com/search?q={encoded}"

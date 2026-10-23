import re
from typing import Dict, List, Optional
from urllib.parse import quote, quote_plus
from app.schemas.search import CompiledQueryResponse, QueryCompileRequest


# Curated Industry Catalog with Buying Intents, Hindi/Hinglish Tokens, and Exclusions
INDUSTRY_CATALOG = {
    "healthcare": {
        "id": "healthcare",
        "name": "Healthcare & Clinics",
        "buying_intents": [
            "clinic website",
            "dental clinic website",
            "doctor appointment website",
            "hospital website redesign",
        ],
        "hinglish_variants": [
            "clinic ki website banwani hai",
            "doctor website developer chahiye",
            "dental clinic website",
        ],
        "suggested_services": [
            "Online patient booking",
            "Mobile-responsive doctor profile",
            "Google Maps local SEO integration",
        ],
        "recommended_negatives": ["mbbs admission", "medical college notes", "neet exam"],
        "rationale": "High-trust local medical practices frequently have outdated or missing online booking portals.",
    },
    "restaurants": {
        "id": "restaurants",
        "name": "Restaurants, Cafes & Cloud Kitchens",
        "buying_intents": [
            "restaurant website",
            "cafe menu website",
            "online food ordering website",
            "cloud kitchen website",
        ],
        "hinglish_variants": [
            "restaurant online order website",
            "cafe ki website banani hai",
            "food menu website",
        ],
        "suggested_services": [
            "Digital QR menu",
            "Direct WhatsApp / online ordering (0% Zomato commission)",
            "Fast mobile loading",
        ],
        "recommended_negatives": ["recipe", "food review", "swiggy coupon", "zomato discount"],
        "rationale": "Restaurants want direct ordering websites to avoid paying 25-30% aggregator commissions.",
    },
    "fitness": {
        "id": "fitness",
        "name": "Fitness, Gyms & Studios",
        "buying_intents": [
            "gym website",
            "fitness trainer website",
            "yoga studio website",
            "crossfit landing page",
        ],
        "hinglish_variants": [
            "gym ki website banwani",
            "fitness website developer",
        ],
        "suggested_services": [
            "Membership signup forms",
            "Trainer booking schedule",
            "Instagram feed integration",
        ],
        "recommended_negatives": ["workout routine", "diet plan pdf", "protein powder sale"],
        "rationale": "Gyms and coaches rely on high-converting landing pages for member registrations.",
    },
    "real_estate": {
        "id": "real_estate",
        "name": "Real Estate & Builders",
        "buying_intents": [
            "real estate website",
            "property listing website",
            "builder project landing page",
            "realtor website developer",
        ],
        "hinglish_variants": [
            "property portal banwana hai",
            "real estate landing page",
        ],
        "suggested_services": [
            "Interactive floor plan viewer",
            "Lead capture forms with instant CRM sync",
            "Virtual tour embeds",
        ],
        "recommended_negatives": ["flat for rent", "roommate needed", "pg in"],
        "rationale": "High deal values mean real estate developers easily spend ₹50k–₹2L for quality landing pages.",
    },
    "d2c": {
        "id": "d2c",
        "name": "D2C & E-Commerce Brands",
        "buying_intents": [
            "Shopify store setup",
            "ecommerce website developer",
            "clothing brand website",
            "online store redesign",
        ],
        "hinglish_variants": [
            "online store banwana hai",
            "Shopify website banwani hai",
            "ecommerce developer chahiye",
        ],
        "suggested_services": [
            "Shopify custom liquid theme",
            "Razorpay / Cashfree / Stripe payment gateway",
            "Speed optimization (< 2s load time)",
        ],
        "recommended_negatives": ["free dropshipping course", "supplier list", "wholesale market"],
        "rationale": "Rapidly growing D2C brands require reliable e-commerce storefronts and fast checkouts.",
    },
    "education": {
        "id": "education",
        "name": "Education & Coaching Institutes",
        "buying_intents": [
            "coaching institute website",
            "tutor website",
            "LMS course website",
            "school website redesign",
        ],
        "hinglish_variants": [
            "coaching classes website",
            "institute portal banwana hai",
        ],
        "suggested_services": [
            "Student registration portal",
            "Test series / PDF notes download gate",
            "Demo lecture video showcases",
        ],
        "recommended_negatives": ["free notes pdf", "syllabus download", "exam admit card"],
        "rationale": "Coaching centers in Tier 1 & 2 cities compete intensely for student admissions every season.",
    },
    "local_services": {
        "id": "local_services",
        "name": "Local Services & Interior Designers",
        "buying_intents": [
            "interior designer website",
            "salon website",
            "event planner website",
            "architect portfolio website",
        ],
        "hinglish_variants": [
            "interior design portfolio website",
            "service booking website",
        ],
        "suggested_services": [
            "High-resolution image gallery",
            "Quotation calculator widget",
            "Google Reviews widget",
        ],
        "recommended_negatives": ["salary", "job opening", "internship"],
        "rationale": "Designers and premium service providers need elegant portfolios to justify high fees.",
    },
    "startups": {
        "id": "startups",
        "name": "Startups & SaaS",
        "buying_intents": [
            "MVP developer",
            "SaaS landing page",
            "React developer needed",
            "FastAPI backend developer",
            "Next.js developer needed",
        ],
        "hinglish_variants": [
            "startup MVP banwana hai",
            "web app develop karwana hai",
        ],
        "suggested_services": [
            "Fast MVP turnaround (2-3 weeks)",
            "Authentication, database & payment integration",
            "Scalable full-stack architecture",
        ],
        "recommended_negatives": ["pitch deck template", "startup equity only", "unpaid intern"],
        "rationale": "Early-stage founders with funding or revenue want fast, skilled full-stack execution.",
    },
}

# Curated Geographic Target Data
GEO_TARGETS = {
    "delhi_ncr": {
        "region": "INDIA",
        "name": "Delhi NCR",
        "search_tokens": ["Delhi", "Gurgaon", "Noida", "Faridabad", "Ghaziabad"],
    },
    "mumbai": {
        "region": "INDIA",
        "name": "Mumbai MMR",
        "search_tokens": ["Mumbai", "Navi Mumbai", "Thane", "Bandra", "Andheri"],
    },
    "bengaluru": {
        "region": "INDIA",
        "name": "Bengaluru",
        "search_tokens": ["Bangalore", "Bengaluru", "Koramangala", "Indiranagar", "Whitefield"],
    },
    "pune": {
        "region": "INDIA",
        "name": "Pune",
        "search_tokens": ["Pune", "Hinjewadi", "Kothrud", "Baner", "Viman Nagar"],
    },
    "hyderabad": {
        "region": "INDIA",
        "name": "Hyderabad",
        "search_tokens": ["Hyderabad", "Secunderabad", "HITEC City", "Gachibowli"],
    },
    "dubai_uae": {
        "region": "INTERNATIONAL",
        "name": "Dubai, UAE",
        "search_tokens": ["Dubai", "UAE", "Abu Dhabi", "Sharjah"],
    },
    "usa": {
        "region": "INTERNATIONAL",
        "name": "United States",
        "search_tokens": ["USA", "US", "California", "New York", "Texas", "Florida"],
    },
    "uk": {
        "region": "INTERNATIONAL",
        "name": "United Kingdom",
        "search_tokens": ["UK", "London", "Manchester", "Birmingham"],
    },
    "canada": {
        "region": "INTERNATIONAL",
        "name": "Canada",
        "search_tokens": ["Canada", "Toronto", "Vancouver", "Montreal"],
    },
}

# Standard Anti-Spam Exclusion Defaults (Freelancer / Course Seller Self-Promo)
STANDARD_EXCLUSIONS = [
    "I am a developer",
    "hire me",
    "my portfolio",
    "DM for projects",
    "DM for services",
    "we are an agency",
    "web development course",
    "free website",
    "job vacancy",
]


def clean_phrase(phrase: str) -> str:
    """Cleans extra spaces and unwanted punctuation while preserving inner words."""
    cleaned = re.sub(r'["\']', '', phrase).strip()
    return re.sub(r'\s+', ' ', cleaned)


def compile_search_query(req: QueryCompileRequest) -> CompiledQueryResponse:
    """
    Compiles positive phrases, negative exclusions, industry context, and geo-tokens
    into a valid, platform-tailored Boolean search string and destination URL.
    """
    platform = req.platform.lower().strip()

    # 1. Gather Positive Clauses
    positives: List[str] = [clean_phrase(p) for p in req.positive_keywords if clean_phrase(p)]

    # Inject industry buying intents if selected
    if req.industry_id and req.industry_id in INDUSTRY_CATALOG:
        ind = INDUSTRY_CATALOG[req.industry_id]
        if req.language in ("en", "all"):
            positives.extend(ind["buying_intents"][:2])
        if req.language in ("hi", "hinglish", "all"):
            positives.extend(ind["hinglish_variants"][:2])

    # Inject service type intents if specified
    if req.service_type == "redesign":
        positives.append("website redesign")
    elif req.service_type == "ecommerce":
        positives.append("Shopify store")
        positives.append("ecommerce website")
    elif req.service_type == "mvp":
        positives.append("MVP web app")
    elif req.service_type == "maintenance":
        positives.append("website maintenance")

    # Inject budget signals if enabled
    if req.require_budget_signals:
        positives.append("budget")

    # If empty, provide sensible default
    if not positives:
        if req.language in ("hi", "hinglish"):
            positives = ["website developer chahiye", "website banwani hai"]
        else:
            positives = ["need a website", "looking for a web developer", "website developer needed"]

    # 2. Gather Negative Clauses
    negatives: List[str] = [clean_phrase(n) for n in req.negative_keywords if clean_phrase(n)]
    if req.industry_id and req.industry_id in INDUSTRY_CATALOG:
        negatives.extend(INDUSTRY_CATALOG[req.industry_id]["recommended_negatives"])

    # 3. Location Clause
    loc_clause: Optional[str] = None
    loc_tokens: List[str] = []
    if req.location_target:
        loc_key = req.location_target.lower().replace(" ", "_")
        if loc_key in GEO_TARGETS:
            loc_tokens = GEO_TARGETS[loc_key]["search_tokens"]
        else:
            loc_tokens = [req.location_target.strip()]
        loc_clause = " OR ".join(f'"{t}"' for t in loc_tokens)

    # 4. Platform-Specific Compilation
    raw_query = ""
    url = ""
    notes = ""
    status = "AVAILABLE_VIA_SEARCH"

    # --- Platform: X (Twitter) ---
    if platform in ("twitter", "x"):
        # Format: ("need a website" OR "looking for developer") ("Delhi" OR "Noida") -("I am a dev" OR "hire me") -is:retweet
        pos_grouped = " OR ".join(f'"{p}"' for p in positives)
        raw_query = f"({pos_grouped})"

        if loc_clause:
            raw_query += f" ({loc_clause})"

        if negatives:
            neg_grouped = " ".join(f'-"{n}"' for n in negatives[:6])
            raw_query += f" {neg_grouped}"

        # Feed cleanliness filters
        raw_query += " -is:retweet -filter:replies"

        encoded = quote(raw_query)
        url = f"https://twitter.com/search?q={encoded}&f=live"
        notes = "Live real-time feed with retweets and replies excluded. Negative keywords are enforced using -\"term\"."

    # --- Platform: LinkedIn ---
    elif platform == "linkedin":
        # LinkedIn web search parser prefers flat ORs and NOT clauses; long queries (>250 chars) degrade
        # Format: "need a website" OR "looking for a web developer"
        clean_pos = positives[:3]
        pos_grouped = " OR ".join(f'"{p}"' for p in clean_pos)
        raw_query = f"{pos_grouped}"

        if loc_tokens:
            raw_query += f' "{loc_tokens[0]}"'

        if negatives:
            # LinkedIn supports NOT keyword
            clean_negs = " OR ".join(f'"{n}"' for n in negatives[:3])
            raw_query += f" NOT ({clean_negs})"

        encoded = quote(raw_query)
        url = f"https://www.linkedin.com/search/results/content/?keywords={encoded}&sortBy=%22date_posted%22"
        notes = "Sorted by date_posted. LinkedIn query capped at key phrases to prevent search truncation."

    # --- Platform: Reddit ---
    elif platform == "reddit":
        # Format: subreddit:forhire flair:"Hiring" ("web developer" OR "website")
        target_subs = req.subreddits or ["forhire", "freelance_forhire", "smallbusiness"]
        sub_clause = " OR ".join(f"subreddit:{s}" for s in target_subs)
        pos_grouped = " OR ".join(f'"{p}"' for p in positives[:4])

        raw_query = f"({sub_clause}) ({pos_grouped}) -title:\"[For Hire]\""
        if "forhire" in target_subs:
            raw_query += ' flair:"Hiring"'

        encoded = quote(raw_query)
        url = f"https://www.reddit.com/search/?q={encoded}&sort=new"
        notes = "Scoped to vetted freelancing & business subreddits sorted by newest first. Excludes [For Hire] talent ads."

    # --- Platform: Upwork ---
    elif platform == "upwork":
        # Upwork recency search with verified payment filter
        # Upwork handles space-separated keywords best
        main_keywords = " ".join(positives[:3])
        raw_query = main_keywords
        encoded = quote_plus(raw_query)
        url = f"https://www.upwork.com/nx/search/jobs/?q={encoded}&payment_verified=1&proposals=0-4&sort=recency"
        notes = "Filtered to payment-verified clients with 0-4 competing proposals, sorted by newest."

    # --- Platform: Google Dork / Opportunity Finder ---
    elif platform == "google_dork":
        dork_mode = req.dork_mode or "outdated_copyright"
        industry_term = positives[0] if positives else "clinic"
        location_term = loc_tokens[0] if loc_tokens else "India"

        if dork_mode == "outdated_copyright":
            raw_query = f'site:.in "all rights reserved 2018..2021" "{industry_term}" "{location_term}"'
            notes = "Targets indexed business websites displaying outdated copyright years, indicating neglected maintenance."
        elif dork_mode == "insecure_http":
            raw_query = f'site:.in "contact us" -inurl:https "{industry_term}" "{location_term}"'
            notes = "Discovers websites indexed without HTTPS encryption. Verify via technical audit before pitch."
        elif dork_mode == "missing_mobile":
            raw_query = f'site:.in "best viewed in" OR "designed for 1024x768" "{industry_term}" "{location_term}"'
            notes = "Discovers legacy websites designed for fixed desktop resolutions lacking responsive mobile viewports."
        else:
            raw_query = f'site:.in "contact us" "{industry_term}" "{location_term}"'
            notes = "General business discovery dork."

        encoded = quote(raw_query)
        url = f"https://www.google.com/search?q={encoded}"

    # --- Platform: Facebook ---
    elif platform == "facebook":
        pos_grouped = " ".join(positives[:3])
        raw_query = pos_grouped
        if loc_tokens:
            raw_query += f" {loc_tokens[0]}"
        encoded = quote_plus(raw_query)
        url = f"https://www.facebook.com/search/posts/?q={encoded}"
        notes = "Searches public Facebook group and page posts for matching business requests."
        status = "LIMITED"

    # --- Platform: Instagram ---
    elif platform == "instagram":
        # Tag based lookup
        tag = positives[0].replace(" ", "").replace("#", "")
        raw_query = f"#{tag}"
        url = f"https://www.instagram.com/explore/tags/{tag}/"
        notes = "Explores emerging store launches, brand announcements, and creator accounts via tags."
        status = "LIMITED"

    else:
        # Fallback Google Web Search
        pos_grouped = " OR ".join(f'"{p}"' for p in positives)
        raw_query = f"({pos_grouped})"
        if loc_clause:
            raw_query += f" ({loc_clause})"
        encoded = quote(raw_query)
        url = f"https://www.google.com/search?q={encoded}"
        notes = "Standard web search query."

    return CompiledQueryResponse(
        platform=platform,
        raw_query=raw_query,
        generated_url=url,
        positive_clauses=positives,
        negative_clauses=negatives,
        location_clause=loc_clause,
        operator_notes=notes,
        integration_status=status,
    )

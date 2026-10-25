import re
from typing import Any, Dict, List, Optional
from urllib.parse import quote, quote_plus
from app.schemas.search import (
    CompiledQueryResponse,
    MultiQueryCompileRequest,
    MultiQueryCompileResponse,
    QueryCompileRequest,
    SearchGroupPreset,
    SubQueryItem,
)


# Curated Industry Catalog with Buying Intents, Hindi/Hinglish Tokens, and Exclusions
INDUSTRY_CATALOG = {
    "healthcare": {
        "id": "healthcare",
        "name": "Healthcare & Clinics",
        "buying_intents": [
            "need a clinic website",
            "dental clinic website developer",
            "doctor appointment website developer",
            "hospital website redesign",
        ],
        "hinglish_variants": [
            "clinic ki website banwani hai",
            "doctor website developer chahiye",
            "dental clinic website developer",
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
            "need a restaurant website",
            "cafe menu website developer",
            "online food ordering website developer",
            "cloud kitchen website",
        ],
        "hinglish_variants": [
            "restaurant online order website banwani",
            "cafe ki website banani hai",
            "food menu website developer chahiye",
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
            "need a gym website",
            "fitness trainer website developer",
            "yoga studio website redesign",
            "crossfit landing page developer",
        ],
        "hinglish_variants": [
            "gym ki website banwani",
            "fitness website developer chahiye",
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
            "need a real estate website",
            "property listing website developer",
            "builder project landing page",
            "realtor website developer needed",
        ],
        "hinglish_variants": [
            "property portal banwana hai",
            "real estate landing page banwani",
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
            "Shopify store setup needed",
            "ecommerce website developer needed",
            "clothing brand website redesign",
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
            "need coaching institute website",
            "tutor website developer",
            "LMS course website developer",
            "school website redesign",
        ],
        "hinglish_variants": [
            "coaching classes website developer",
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
            "interior designer website developer",
            "salon website redesign",
            "event planner website developer",
            "architect portfolio website developer",
        ],
        "hinglish_variants": [
            "interior design portfolio website banwani",
            "service booking website developer",
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
            "MVP developer needed",
            "SaaS landing page developer",
            "React developer needed",
            "FastAPI backend developer needed",
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

# Curated Search Groups with Independent Intent Profiles
SEARCH_GROUPS_CATALOG: Dict[str, Dict[str, Any]] = {
    "GROUP_A": {
        "id": "GROUP_A",
        "name": "Group A: Explicit Hiring Intent",
        "description": "High-intent queries explicitly searching to hire a developer, agency, or get recommendations.",
        "is_indirect": False,
        "default_positive_keywords": [
            "looking for a web developer",
            "need a website developer",
            "seeking a web development agency",
            "can anyone recommend a web developer",
            "looking for someone to build our website",
            "need a developer for our website",
        ],
        "default_hinglish_keywords": [
            "website developer chahiye",
            "website banwani hai",
            "koi website bana sakta hai",
        ],
        "default_negative_exclusions": [
            "I am a developer",
            "hire me",
            "my portfolio",
            "course",
        ],
    },
    "GROUP_B": {
        "id": "GROUP_B",
        "name": "Group B: Project & Quotation Requests",
        "description": "Direct requests for website proposals, estimates, RFP, or specific redesign / e-commerce specs.",
        "is_indirect": False,
        "default_positive_keywords": [
            "website development project",
            "looking for website development proposals",
            "need a quote for a website",
            "looking for a website design agency",
            "need an ecommerce website",
            "website redesign project",
        ],
        "default_hinglish_keywords": [
            "website proposal chahiye",
            "ecommerce website quote",
        ],
        "default_negative_exclusions": [
            "I build websites",
            "our services",
            "free tutorial",
        ],
    },
    "GROUP_C": {
        "id": "GROUP_C",
        "name": "Group C: Existing Website Problems",
        "description": "Businesses actively complaining about outdated, broken, slow, or non-responsive websites.",
        "is_indirect": False,
        "default_positive_keywords": [
            "our website needs a redesign",
            "looking to rebuild our website",
            "our website is not working",
            "need help improving our website",
            "looking for website maintenance",
        ],
        "default_hinglish_keywords": [
            "website rebuild karwani hai",
            "website revamp karwana hai",
        ],
        "default_negative_exclusions": [
            "how to fix",
            "wordpress tutorial",
        ],
    },
    "GROUP_D": {
        "id": "GROUP_D",
        "name": "Group D: Business Opportunities (Indirect)",
        "description": "Indirect opportunities: businesses with legacy copyright, insecure HTTP, or missing mobile viewports. Requires manual qualification.",
        "is_indirect": True,
        "default_positive_keywords": [
            "clinic without website",
            "restaurant online booking system",
            "store needing website redesign",
        ],
        "default_hinglish_keywords": [],
        "default_negative_exclusions": [
            "course",
            "template free download",
        ],
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


def get_search_groups() -> List[SearchGroupPreset]:
    """Returns the list of configured search groups."""
    groups = []
    for g_id, data in SEARCH_GROUPS_CATALOG.items():
        groups.append(
            SearchGroupPreset(
                id=data["id"],
                name=data["name"],
                description=data["description"],
                is_indirect=data["is_indirect"],
                default_positive_keywords=data["default_positive_keywords"],
                default_hinglish_keywords=data.get("default_hinglish_keywords", []),
                default_negative_exclusions=data.get("default_negative_exclusions", []),
            )
        )
    return groups


def chunk_list(items: List[str], chunk_size: int) -> List[List[str]]:
    """Splits a list into smaller chunks of at most chunk_size items."""
    return [items[i : i + chunk_size] for i in range(0, len(items), chunk_size)]


def compile_search_query(req: QueryCompileRequest) -> CompiledQueryResponse:
    """
    Compiles positive phrases, negative exclusions, industry context, and geo-tokens
    into platform-aware Boolean search strings with query-splitting support.
    """
    platform = req.platform.lower().strip()
    group_key = (req.search_group or "GROUP_A").upper()
    search_group_info = SEARCH_GROUPS_CATALOG.get(group_key)

    # 1. Gather Positive Clauses
    positives: List[str] = [clean_phrase(p) for p in req.positive_keywords if clean_phrase(p)]

    # If empty, populate from selected Search Group defaults
    if not positives:
        if search_group_info:
            if req.language in ("hi", "hinglish") and search_group_info.get("default_hinglish_keywords"):
                positives = list(search_group_info["default_hinglish_keywords"])
            else:
                positives = list(search_group_info["default_positive_keywords"])
        else:
            if req.language in ("hi", "hinglish"):
                positives = ["website developer chahiye", "website banwani hai"]
            else:
                positives = ["need a website", "looking for a web developer"]

    # Inject industry buying intents if selected
    if req.industry_id and req.industry_id in INDUSTRY_CATALOG:
        ind = INDUSTRY_CATALOG[req.industry_id]
        if req.language in ("en", "all"):
            for p in ind["buying_intents"][:2]:
                clean_p = clean_phrase(p)
                if clean_p not in positives:
                    positives.append(clean_p)
        if req.language in ("hi", "hinglish", "all"):
            for p in ind["hinglish_variants"][:2]:
                clean_p = clean_phrase(p)
                if clean_p not in positives:
                    positives.append(clean_p)

    # Inject service type intents if specified
    if req.service_type == "redesign":
        if "website redesign" not in positives:
            positives.append("website redesign")
    elif req.service_type == "ecommerce":
        if "Shopify store" not in positives:
            positives.append("Shopify store")
        if "ecommerce website" not in positives:
            positives.append("ecommerce website")
    elif req.service_type == "mvp":
        if "MVP web app" not in positives:
            positives.append("MVP web app")
    elif req.service_type == "maintenance":
        if "website maintenance" not in positives:
            positives.append("website maintenance")

    # Inject budget signals if enabled
    if req.require_budget_signals:
        if "budget" not in positives:
            positives.append("budget")

    # 2. Gather Negative Clauses
    negatives: List[str] = [clean_phrase(n) for n in req.negative_keywords if clean_phrase(n)]
    if req.industry_id and req.industry_id in INDUSTRY_CATALOG:
        for rec_neg in INDUSTRY_CATALOG[req.industry_id]["recommended_negatives"]:
            clean_n = clean_phrase(rec_neg)
            if clean_n not in negatives and clean_n not in positives:
                negatives.append(clean_n)

    # Prevent conflict: remove any negative that is also in positives
    negatives = [n for n in negatives if n not in positives]

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

    # 4. Platform-Specific Compilation with Query Splitting
    sub_queries: List[SubQueryItem] = []
    raw_query = ""
    url = ""
    notes = ""
    status = "AVAILABLE_VIA_SEARCH"

    # --- Platform: X (Twitter) ---
    if platform in ("twitter", "x"):
        # Twitter handles chunks of 3 positive keywords well without truncation
        chunks = chunk_list(positives, 3) if len(positives) > 3 else [positives]
        neg_grouped = " ".join(f'-"{n}"' for n in negatives[:6]) if negatives else ""

        for idx, chunk in enumerate(chunks, 1):
            pos_grouped = " OR ".join(f'"{p}"' for p in chunk)
            q_text = f"({pos_grouped})"
            if loc_clause:
                q_text += f" ({loc_clause})"
            if neg_grouped:
                q_text += f" {neg_grouped}"
            q_text += " -is:retweet -filter:replies"

            encoded = quote(q_text)
            sub_url = f"https://twitter.com/search?q={encoded}&f=live"
            sub_queries.append(
                SubQueryItem(
                    label=f"Query {idx}: {' / '.join(chunk[:2])}",
                    raw_query=q_text,
                    generated_url=sub_url,
                    operator_notes="Live real-time tweets with retweets and replies excluded.",
                )
            )

        raw_query = sub_queries[0].raw_query if sub_queries else ""
        url = sub_queries[0].generated_url if sub_queries else ""
        notes = f"Generated {len(sub_queries)} targeted search queries. Live real-time feed with retweets/replies excluded."

    # --- Platform: LinkedIn ---
    elif platform == "linkedin":
        # LinkedIn web search parser chokes on complex nested booleans or long queries > 200 chars.
        # Split into clean queries of 2 phrases each. Flat ORs and flat NOT.
        chunks = chunk_list(positives, 2) if len(positives) > 2 else [positives]
        clean_negs = [clean_phrase(n) for n in negatives[:2] if clean_phrase(n)]
        quoted_negs = " OR ".join(f'"{n}"' for n in clean_negs)
        neg_part = f" NOT ({quoted_negs})" if len(clean_negs) > 1 else (f' NOT "{clean_negs[0]}"' if clean_negs else "")

        for idx, chunk in enumerate(chunks, 1):
            pos_grouped = " OR ".join(f'"{p}"' for p in chunk)
            q_text = f"{pos_grouped}"
            if loc_tokens:
                q_text += f' "{loc_tokens[0]}"'
            if neg_part:
                q_text += neg_part

            encoded = quote(q_text)
            sub_url = f"https://www.linkedin.com/search/results/content/?keywords={encoded}&sortBy=%22date_posted%22"
            sub_queries.append(
                SubQueryItem(
                    label=f"Query {idx}: {' / '.join(chunk)}",
                    raw_query=q_text,
                    generated_url=sub_url,
                    operator_notes="Sorted by date_posted. LinkedIn query kept flat to prevent parser truncation.",
                )
            )

        raw_query = sub_queries[0].raw_query if sub_queries else ""
        url = sub_queries[0].generated_url if sub_queries else ""
        notes = f"Generated {len(sub_queries)} queries sorted by date_posted. LinkedIn queries kept flat to avoid parser truncation."

    # --- Platform: Reddit ---
    elif platform == "reddit":
        target_subs = req.subreddits or ["forhire", "freelance_forhire", "smallbusiness"]
        sub_clause = " OR ".join(f"subreddit:{s}" for s in target_subs)
        chunks = chunk_list(positives, 3) if len(positives) > 3 else [positives]

        for idx, chunk in enumerate(chunks, 1):
            pos_grouped = " OR ".join(f'"{p}"' for p in chunk)
            q_text = f"({sub_clause}) ({pos_grouped}) -title:\"[For Hire]\""
            if "forhire" in target_subs:
                q_text += ' flair:"Hiring"'

            encoded = quote(q_text)
            sub_url = f"https://www.reddit.com/search/?q={encoded}&sort=new"
            sub_queries.append(
                SubQueryItem(
                    label=f"Query {idx}: {', '.join(chunk[:2])}",
                    raw_query=q_text,
                    generated_url=sub_url,
                    operator_notes="Vetted freelancing/business subreddits sorted by newest first. Excludes [For Hire] ads.",
                )
            )

        raw_query = sub_queries[0].raw_query if sub_queries else ""
        url = sub_queries[0].generated_url if sub_queries else ""
        notes = f"Generated {len(sub_queries)} Reddit queries scoped to client hiring subreddits."

    # --- Platform: Upwork ---
    elif platform == "upwork":
        chunks = chunk_list(positives, 2) if len(positives) > 2 else [positives]

        for idx, chunk in enumerate(chunks, 1):
            main_keywords = " ".join(f'"{p}"' for p in chunk)
            encoded = quote_plus(main_keywords)
            sub_url = f"https://www.upwork.com/nx/search/jobs/?q={encoded}&payment_verified=1&proposals=0-4&sort=recency"
            sub_queries.append(
                SubQueryItem(
                    label=f"Query {idx}: {' / '.join(chunk)}",
                    raw_query=main_keywords,
                    generated_url=sub_url,
                    operator_notes="Filtered to payment-verified clients with 0-4 competing proposals, sorted by newest.",
                )
            )

        raw_query = sub_queries[0].raw_query if sub_queries else ""
        url = sub_queries[0].generated_url if sub_queries else ""
        notes = f"Generated {len(sub_queries)} Upwork job searches with payment verified filter."

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
        sub_queries.append(
            SubQueryItem(
                label=f"Dork: {dork_mode}",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

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
        sub_queries.append(
            SubQueryItem(
                label="Facebook Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Instagram ---
    elif platform == "instagram":
        tag = positives[0].replace(" ", "").replace("#", "")
        raw_query = f"#{tag}"
        url = f"https://www.instagram.com/explore/tags/{tag}/"
        notes = "Explores emerging store launches, brand announcements, and creator accounts via tags."
        status = "LIMITED"
        sub_queries.append(
            SubQueryItem(
                label="Instagram Tag",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Threads ---
    elif platform == "threads":
        pos_grouped = " ".join(positives[:3])
        raw_query = pos_grouped
        if loc_tokens:
            raw_query += f" {loc_tokens[0]}"
        encoded = quote_plus(raw_query)
        url = f"https://www.threads.net/search?q={encoded}&serp_type=default"
        notes = "Searches Meta Threads discussions for client website requests and project inquiries."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Threads Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Bluesky ---
    elif platform == "bluesky":
        pos_grouped = " OR ".join(f'"{p}"' for p in positives[:2])
        raw_query = pos_grouped
        if loc_tokens:
            raw_query += f' "{loc_tokens[0]}"'
        encoded = quote(raw_query)
        url = f"https://bsky.app/search?q={encoded}"
        notes = "Searches Bluesky social network for tech and startup website discussions."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Bluesky Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Mastodon ---
    elif platform == "mastodon":
        pos_grouped = " ".join(positives[:2])
        raw_query = pos_grouped
        encoded = quote(raw_query)
        url = f"https://mastodon.social/search?q={encoded}"
        notes = "Searches Mastodon fediverse public timeline for website inquiries."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Mastodon Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: YouTube ---
    elif platform == "youtube":
        pos_grouped = " ".join(positives[:2])
        if loc_tokens:
            pos_grouped += f" {loc_tokens[0]}"
        raw_query = pos_grouped
        encoded = quote_plus(raw_query)
        url = f"https://www.youtube.com/results?search_query={encoded}&sp=CAI%253D"
        notes = "YouTube search filtered by upload date (newest first) to catch recent website review & help requests."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="YouTube Search (Newest)",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: TikTok ---
    elif platform == "tiktok":
        pos_grouped = " ".join(positives[:2])
        raw_query = pos_grouped
        encoded = quote_plus(raw_query)
        url = f"https://www.tiktok.com/search?q={encoded}"
        notes = "Searches TikTok for business creators seeking online store help."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="TikTok Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Pinterest ---
    elif platform == "pinterest":
        pos_grouped = " ".join(positives[:2])
        raw_query = pos_grouped
        encoded = quote_plus(raw_query)
        url = f"https://www.pinterest.com/search/pins/?q={encoded}"
        notes = "Searches Pinterest pins for boutique, wedding, and interior design store launches."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Pinterest Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Freelancer.com ---
    elif platform == "freelancer":
        main_keywords = " ".join(positives[:2])
        raw_query = main_keywords
        encoded = quote_plus(main_keywords)
        url = f"https://www.freelancer.com/search/projects?q={encoded}"
        notes = "Searches active client-published projects on Freelancer.com."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Freelancer.com Projects",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Fiverr ---
    elif platform == "fiverr":
        main_keywords = " ".join(positives[:2])
        raw_query = main_keywords
        encoded = quote_plus(main_keywords)
        url = f"https://www.fiverr.com/search/gigs?query={encoded}"
        notes = "Searches public project briefs and buyer requests on Fiverr."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Fiverr Briefs",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: PeoplePerHour ---
    elif platform == "peopleperhour":
        main_keywords = " ".join(positives[:2])
        raw_query = main_keywords
        encoded = quote_plus(main_keywords)
        url = f"https://www.peopleperhour.com/freelance-jobs?q={encoded}"
        notes = "Searches active client jobs on PeoplePerHour."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="PeoplePerHour Jobs",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Guru ---
    elif platform == "guru":
        slug = "-".join(clean_phrase(p).replace(" ", "-") for p in positives[:2])
        raw_query = " ".join(positives[:2])
        url = f"https://www.guru.com/d/jobs/q/{quote_plus(slug)}/"
        notes = "Searches active client proposals on Guru.com."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Guru.com Jobs",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Contra ---
    elif platform == "contra":
        main_keywords = " ".join(positives[:2])
        raw_query = main_keywords
        encoded = quote_plus(main_keywords)
        url = f"https://contra.com/search/opportunities?query={encoded}"
        notes = "Searches commission-free client opportunities on Contra."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Contra Opportunities",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Truelancer ---
    elif platform == "truelancer":
        main_keywords = " ".join(positives[:2])
        raw_query = main_keywords
        encoded = quote_plus(main_keywords)
        url = f"https://www.truelancer.com/freelance-jobs?search={encoded}"
        notes = "Searches Indian and South Asian client job listings on Truelancer."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Truelancer Jobs",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Workana ---
    elif platform == "workana":
        main_keywords = " ".join(positives[:2])
        raw_query = main_keywords
        encoded = quote_plus(main_keywords)
        url = f"https://www.workana.com/jobs?query={encoded}"
        notes = "Searches global client projects on Workana."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Workana Projects",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Google Places / Maps ---
    elif platform == "google_places":
        term = positives[0] if positives else "businesses"
        loc = loc_tokens[0] if loc_tokens else "India"
        raw_query = f"{term} in {loc}"
        encoded = quote_plus(raw_query)
        url = f"https://www.google.com/maps/search/{encoded}"
        notes = "Google Places API integrated with cost-controlled field masking. Maps deep link provided for assisted manual search."
        status = "CONNECTED"
        sub_queries.append(
            SubQueryItem(
                label="Google Maps Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Justdial ---
    elif platform == "justdial":
        term = positives[0] if positives else "Dental-Clinics"
        city = loc_tokens[0] if loc_tokens else "Delhi"
        clean_city = city.replace(" ", "-")
        clean_term = term.replace(" ", "-")
        raw_query = f"{term} in {city}"
        url = f"https://www.justdial.com/{quote(clean_city)}/{quote(clean_term)}"
        notes = "Justdial local business directory query. Labeled as Indirect Business Opportunity requiring technical audit."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Justdial City Directory",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Sulekha ---
    elif platform == "sulekha":
        term = positives[0] if positives else "interior-designers"
        city = loc_tokens[0] if loc_tokens else "bangalore"
        clean_city = city.lower().replace(" ", "-")
        clean_term = term.lower().replace(" ", "-")
        raw_query = f"{term} {city}"
        url = f"https://www.sulekha.com/{quote(clean_term)}/{quote(clean_city)}"
        notes = "Sulekha directory search. Indirect opportunity: target businesses lacking modern websites."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Sulekha Directory",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: IndiaMART ---
    elif platform == "indiamart":
        term = positives[0] if positives else "manufacturer"
        if loc_tokens:
            term += f" {loc_tokens[0]}"
        raw_query = term
        encoded = quote_plus(term)
        url = f"https://dir.indiamart.com/search.mp?ss={encoded}"
        notes = "IndiaMART B2B catalog search. Target manufacturers with outdated HTML/legacy sites."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="IndiaMART B2B Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: TradeIndia ---
    elif platform == "tradeindia":
        term = positives[0] if positives else "suppliers"
        if loc_tokens:
            term += f" {loc_tokens[0]}"
        raw_query = term
        encoded = quote_plus(term)
        url = f"https://www.tradeindia.com/search.html?keyword={encoded}"
        notes = "TradeIndia manufacturer search. Indirect opportunity."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="TradeIndia Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Yelp ---
    elif platform == "yelp":
        term = positives[0] if positives else "restaurants"
        loc = loc_tokens[0] if loc_tokens else "USA"
        raw_query = f"{term} in {loc}"
        url = f"https://www.yelp.com/search?find_desc={quote_plus(term)}&find_loc={quote_plus(loc)}"
        notes = "Yelp local business search. Discover establishments needing modern online ordering or booking."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Yelp Local Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Yellow Pages ---
    elif platform == "yellowpages":
        term = positives[0] if positives else "clinics"
        loc = loc_tokens[0] if loc_tokens else "California"
        raw_query = f"{term} in {loc}"
        url = f"https://www.yellowpages.com/search?search_terms={quote_plus(term)}&geo_location_terms={quote_plus(loc)}"
        notes = "Yellow Pages commercial directory query."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Yellow Pages Directory",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Clutch ---
    elif platform == "clutch":
        term = positives[0] if positives else "web design"
        raw_query = term
        url = f"https://clutch.co/search?query={quote_plus(term)}"
        notes = "Clutch directory search for mid-market businesses and agency clients."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Clutch Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: GoodFirms ---
    elif platform == "goodfirms":
        term = positives[0] if positives else "ecommerce"
        raw_query = term
        url = f"https://www.goodfirms.co/search?query={quote_plus(term)}"
        notes = "GoodFirms search for companies exploring agency partnerships."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="GoodFirms Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: DesignRush ---
    elif platform == "designrush":
        term = positives[0] if positives else "website"
        raw_query = term
        url = f"https://www.designrush.com/search?query={quote_plus(term)}"
        notes = "DesignRush directory search."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="DesignRush Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Hacker News ---
    elif platform == "hackernews":
        term = positives[0] if positives else "web developer"
        raw_query = term
        url = f"https://hn.algolia.com/?q={quote_plus(term)}&sort=byDate&type=story"
        notes = "Official Algolia HN Search API integrated for automated lead ingestion. Live web search link also provided."
        status = "CONNECTED"
        sub_queries.append(
            SubQueryItem(
                label="Hacker News Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Product Hunt ---
    elif platform == "producthunt":
        term = positives[0] if positives else "website"
        raw_query = term
        url = f"https://www.producthunt.com/search?q={quote_plus(term)}"
        notes = "Product Hunt discovery for newly launched products and MVPs."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Product Hunt Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Indie Hackers ---
    elif platform == "indiehackers":
        term = positives[0] if positives else "need a developer"
        raw_query = term
        url = f"https://www.indiehackers.com/search?q={quote_plus(term)}"
        notes = "Searches Indie Hackers founder discussions for hiring and contract opportunities."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Indie Hackers Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Wellfound ---
    elif platform == "wellfound":
        term = positives[0] if positives else "web developer"
        raw_query = term
        url = f"https://wellfound.com/jobs?q={quote_plus(term)}"
        notes = "Wellfound (AngelList Talent) startup contract roles."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Wellfound Jobs",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Google Web Search ---
    elif platform == "google_search":
        pos_grouped = " OR ".join(f'"{p}"' for p in positives)
        raw_query = f"({pos_grouped})"
        if loc_clause:
            raw_query += f" ({loc_clause})"
        encoded = quote(raw_query)
        url = f"https://www.google.com/search?q={encoded}"
        notes = "Google Web Search with exact Boolean quotes and exclusions."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Google Web Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: Bing Web Search ---
    elif platform == "bing_search":
        pos_grouped = " OR ".join(f'"{p}"' for p in positives)
        raw_query = f"({pos_grouped})"
        if loc_clause:
            raw_query += f" ({loc_clause})"
        encoded = quote(raw_query)
        url = f"https://www.bing.com/search?q={encoded}"
        notes = "Microsoft Bing Search index targeting commercial quotation requests."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="Bing Web Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: RemoteOK ---
    elif platform == "remoteok":
        term = positives[0] if positives else "web developer"
        raw_query = term
        url = f"https://remoteok.com/remote-contract-jobs?search={quote_plus(term)}"
        notes = "RemoteOK contract and freelance web developer listings."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="RemoteOK Contract Jobs",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    # --- Platform: WeWorkRemotely ---
    elif platform == "weworkremotely":
        term = positives[0] if positives else "website"
        raw_query = term
        url = f"https://weworkremotely.com/remote-jobs/search?term={quote_plus(term)}"
        notes = "WeWorkRemotely employer contract listings."
        status = "AVAILABLE_VIA_SEARCH"
        sub_queries.append(
            SubQueryItem(
                label="WeWorkRemotely Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    else:
        # Fallback Google Web Search
        pos_grouped = " OR ".join(f'"{p}"' for p in positives)
        raw_query = f"({pos_grouped})"
        if loc_clause:
            raw_query += f" ({loc_clause})"
        encoded = quote(raw_query)
        url = f"https://www.google.com/search?q={encoded}"
        notes = "Standard web search query."
        sub_queries.append(
            SubQueryItem(
                label="Google Web Search",
                raw_query=raw_query,
                generated_url=url,
                operator_notes=notes,
            )
        )

    return CompiledQueryResponse(
        platform=platform,
        raw_query=raw_query,
        generated_url=url,
        positive_clauses=positives,
        negative_clauses=negatives,
        location_clause=loc_clause,
        operator_notes=notes,
        integration_status=status,
        search_group=group_key,
        sub_queries=sub_queries,
    )


def compile_multi_queries(req: MultiQueryCompileRequest) -> MultiQueryCompileResponse:
    """
    Compiles queries for multiple selected sources simultaneously.
    Allows users to run cross-platform searches in one action.
    """
    compiled_list: List[CompiledQueryResponse] = []
    total_sub_q = 0
    for src in req.sources:
        single_req = QueryCompileRequest(
            platform=src,
            positive_keywords=req.positive_keywords,
            negative_keywords=req.negative_keywords,
            industry_id=req.industry_id,
            location_target=req.location_target,
            service_type=req.service_type,
            recency=req.recency,
            require_budget_signals=req.require_budget_signals,
            language=req.language,
            search_group=req.search_group,
            subreddits=req.subreddits,
            dork_mode=req.dork_mode,
        )
        res = compile_search_query(single_req)
        compiled_list.append(res)
        total_sub_q += len(res.sub_queries)

    return MultiQueryCompileResponse(
        queries=compiled_list,
        total_sources=len(compiled_list),
        total_sub_queries=total_sub_q,
    )

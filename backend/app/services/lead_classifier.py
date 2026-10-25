import re
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field


class IntentCategory(str, Enum):
    ACTIVE_BUYER = "ACTIVE_BUYER"
    PROJECT_REQUEST = "PROJECT_REQUEST"
    BUSINESS_OPPORTUNITY = "BUSINESS_OPPORTUNITY"
    DEVELOPER_PROMOTION = "DEVELOPER_PROMOTION"
    GENERAL_DISCUSSION = "GENERAL_DISCUSSION"
    UNCERTAIN = "UNCERTAIN"


class ReviewStatus(str, Enum):
    HIGH_PRIORITY = "HIGH_PRIORITY"  # 80-100
    NEEDS_REVIEW = "NEEDS_REVIEW"    # 50-79
    LOW_PRIORITY = "LOW_PRIORITY"    # 0-49


class FeedbackLabel(str, Enum):
    REAL_BUYER = "REAL_BUYER"
    DEVELOPER_PROMOTION = "DEVELOPER_PROMOTION"
    NOT_RELEVANT = "NOT_RELEVANT"


class ClassificationResult(BaseModel):
    intent_category: IntentCategory
    lead_score: int = Field(ge=0, le=100)
    positive_evidence: List[str] = Field(default_factory=list)
    negative_evidence: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)
    explanation: str
    review_status: ReviewStatus
    is_indirect_opportunity: bool = False


# Curated signal patterns for deterministic matching

# 1. Explicit Hiring Phrases (Looking for someone to hire)
EXPLICIT_HIRING_PATTERNS = [
    r"\b(?:looking\s+for|need\s+to\s+hire|need|seeking|want\s+to\s+hire|hiring)\s+(?:a\s+|an\s+)?(?:[a-z0-9\-./]+\s+){0,4}(?:developer|dev|engineer|designer|freelancer|agency|contractor|someone\s+to\s+build\s+(?:our|a|my)\s+website)\b",
    r"\bcan\s+anyone\s+recommend\s+(?:a\s+|an\s+)?(?:[a-z0-9\-./]+\s+){0,4}(?:developer|dev|designer|agency|contractor)\b",
    r"\b(?:recommendations?\s+for|in\s+search\s+of)\s+(?:a\s+|an\s+)?(?:[a-z0-9\-./]+\s+){0,4}(?:developer|dev|designer|freelancer)\b",
    r"\bneed\s+to\s+hire\s+(?:a\s+|an\s+)?(?:[a-z0-9\-./]+\s+){0,4}(?:developer|designer|freelancer|engineer|dev|contractor)\b",
    r"\b(?:website|web)\s+developer\s+(?:needed|required|wanted)\b",
    r"\bdeveloper\s+for\s+(?:our|a|my)\s+(?:new\s+)?(?:website|portal|app|store)\b",
    r"\blooking\s+for\s+someone\s+to\s+build\s+(?:our|a|my)\s+website\b",
    r"\bneed\s+a\s+developer\s+for\s+(?:our|a|my)\s+website\b",
    # Hindi / Hinglish patterns
    r"\bwebsite\s+(?:developer|designer)\s+chahiye\b",
    r"\bwebsite\s+banwani\s+hai\b",
    r"\bkoi\s+website\s+bana\s+sakta\s+hai\b",
    r"\bwebsite\s+ke\s+liye\s+developer\s+chahiye\b",
]

# 2. Quotation and Proposal Requests
QUOTE_AND_PROPOSAL_PATTERNS = [
    r"\b(?:share|send|provide)\s+(?:your\s+)?(?:proposal|proposals|quote|quotes|quotation|rate\s+card|pricing|estimated\s+cost)\b",
    r"\b(?:need|looking\s+for)\s+(?:a\s+)?(?:quote|quotation|proposals?)\s+for\s+(?:a\s+|our\s+)?(?:website|web\s+app|portal|redesign)\b",
    r"\brequest\s+for\s+proposals?\b",
    r"\brfp\s+for\s+(?:website|web\s+development)\b",
    r"\bneed\s+a\s+quote\s+for\s+a\s+website\b",
    r"\blooking\s+for\s+website\s+development\s+proposals\b",
    r"\blooking\s+for\s+a\s+website\s+design\s+agency\b",
    r"\bestimated\s+cost\s+(?:for|to\s+build)\b",
]

# 3. Concrete Project, Redesign, or Feature Requirements
PROJECT_REQUIREMENT_PATTERNS = [
    r"\b(?:rebuild|redesign|revamp|re-architect|modernize|build|create|develop)\s+(?:a|an|the|our|my)?\s*(?:[a-z0-9\-]+\s+){0,3}(?:website|web\s+app|portal|store|platform)\b",
    r"\b(?:website|web\s+app|portal)\s+(?:redesign|rebuild|revamp|development)\s+project\b",
    r"\bneed\s+(?:an?\s+)?(?:ecommerce|e-commerce|shopify|woocommerce|booking|appointment)\s+(?:website|store|system|portal)\b",
    r"\b(?:our|the)\s+website\s+(?:needs\s+a\s+redesign|is\s+outdated|needs\s+work|is\s+not\s+working|is\s+broken)\b",
    r"\blooking\s+to\s+rebuild\s+our\s+website\b",
    r"\bneed\s+help\s+improving\s+our\s+website\b",
    r"\blooking\s+for\s+website\s+maintenance\b",
    r"\b(?:customer|client|patient)\s+portal\b",
    r"\be-?commerce\s+website\b",
]

# 4. Budget, Timeline, or Detailed Requirements
BUDGET_TIMELINE_PATTERNS = [
    r"\bbudget\s*(?:is|:|\bof\b)?\s*[\$₹€£]?\s*[0-9]+[kKmM]?",
    r"\bbudget\b",
    r"\b(?:paid\s+project|fixed\s+price|hourly\s+rate|compensation)\b",
    r"\b(?:estimated\s+cost|cost\s+estimate|pricing\s+estimate)\b",
    r"\bdeadline\s*(?::|is|\bby\b|\bwithin\b)?\s*(?:[0-9]+\s*(?:days?|weeks?|months?)|asap|immediate|end\s+of\s+month)\b",
    r"\btimeline\s*(?::|is|\bof\b)?\s*[0-9]+\s*(?:days?|weeks?|months?)\b",
    r"\bscope\s+of\s+work\b",
]

# 5. Evidence Author Represents Buying Business (Client Voice)
BUYING_BUSINESS_PATTERNS = [
    r"\b(?:our\s+(?:clinic|company|business|brand|clothing\s+brand|practice|firm|startup|team|hospital|restaurant|shop|store)|my\s+(?:clinic|business|practice|store|firm|brand|company))\b",
    r"\bwe\s+are\s+(?:a\s+|an\s+)?(?:clinic|dental|medical|healthcare|law\s+firm|restaurant|brand|clothing\s+brand|business|company|retailer|startup)\b",
    r"\bfor\s+our\s+(?:new\s+)?(?:customer\s+portal|client\s+portal|patients|customers|users|website)\b",
    r"\b(?:i\s+run|we\s+run|i\s+own|we\s+own)\s+(?:a\s+|an\s+)?(?:clinic|business|company|store|shop|software\s+business|practice|brand)\b",
]

# 6. Developer Self-Promotion (Advertising services to others)
DEVELOPER_PROMO_PATTERNS = [
    r"\b(?:i|we)\s+build\s+(?:modern\s+)?(?:websites|web\s+apps|landing\s+pages|stores|applications)\b",
    r"\b(?:i\s+am|i'm|we\s+are|we're)\s+(?:a\s+)?(?:freelance\s+)?(?:web\s+developer|web\s+designer|software\s+developer|full-?stack\s+developer|frontend\s+developer|agency)\b",
    r"\bavailable\s+for\s+(?:freelance|new|contract|client|remote)\s+(?:projects?|work|opportunities|gigs?)\b",
    r"\boffering\s+(?:web\s+development|web\s+design|website\s+creation|seo)\s+services\b",
    r"\bhire\s+me\b",
    r"\bcheck\s+out\s+my\s+(?:portfolio|work|github|latest\s+project|recent\s+design)\b",
    r"\b(?:dm|inbox|contact)\s+me\s+(?:for|to\s+hire|for\s+website|if\s+you\s+need|to\s+build|for\s+your\s+website)\b",
    r"\blooking\s+for\s+clients\b",
    r"\b(?:my|our)\s+(?:web\s+development|design)\s+services\b",
    r"\b(?:i|we)\s+create\s+(?:professional|high-converting|modern|responsive)\s+websites\s+for\s+(?:businesses|clients|startups|clinics)\b",
    r"\bopen\s+for\s+(?:commissions|freelance\s+projects|gigs)\b",
    r"\bmy\s+portfolio\s*(?::|at|link|\.com|\.dev|\.io|\.design)\b",
]

# 7. Generic Educational / Discussion (No buyer intent)
GENERIC_DISCUSSION_PATTERNS = [
    r"\b(?:every|all|any)\s+(?:healthcare\s+business|business|clinic|startup|company)\s+(?:should|must|needs\s+to)\s+have\s+a\s+(?:professional\s+)?website\b",
    r"\bwhy\s+(?:you\s+need|businesses\s+need|a\s+website\s+is\s+important)\b",
    r"\bhere\s+are\s+[0-9]+\s+(?:tips|reasons|steps|tools)\s+for\b",
    r"\bhow\s+to\s+build\s+a\s+website\b",
    r"\bweb\s+development\s+(?:tutorial|course|tips|tricks|trends)\b",
    r"\bfree\s+(?:course|notes|template|guide|ebook)\b",
]

# 8. Developer Job Titles in Author Profiles
DEV_TITLE_PATTERNS = [
    r"\b(?:web|frontend|backend|full-?stack|software|ui/ux)\s+(?:developer|engineer|designer)\b",
    r"\bfreelance\s+(?:web\s+developer|designer|programmer)\b",
    r"\b(?:agency|studio)\s+(?:owner|founder|director)\b",
    r"\bwordpress\s+developer\b",
    r"\bshopify\s+expert\b",
]


def classify_lead_intent(
    text: str,
    business_or_title: Optional[str] = None,
    author_role: Optional[str] = None,
    audit_issues: Optional[List[str]] = None,
    website_url: Optional[str] = None,
    has_website: Optional[bool] = None,
    search_group: Optional[str] = None,
) -> ClassificationResult:
    """
    Deterministic, explainable lead intelligence classifier and scoring engine.
    Analyzes post content, title, author signals, technical audit findings, and metadata.
    """
    combined_text = f"{business_or_title or ''} {text or ''}".strip()
    text_lower = combined_text.lower()
    author_lower = (author_role or "").lower().strip()

    positive_evidence: List[str] = []
    negative_evidence: List[str] = []
    matched_flags: Dict[str, bool] = {}

    # --- Step 1: Detect Positive Signals ---

    # 1.1 Explicit request to hire a developer/agency (+30)
    for pattern in EXPLICIT_HIRING_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            matched_flags["explicit_hiring"] = True
            positive_evidence.append(f"Explicit request to hire developer/agency: '{match.group(0)}'")
            break

    # 1.2 Explicit request for recommendations or quotes (+20)
    for pattern in QUOTE_AND_PROPOSAL_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            matched_flags["quote_proposal"] = True
            positive_evidence.append(f"Request for proposals/quotes/pricing: '{match.group(0)}'")
            break

    # 1.3 Concrete project, redesign, or feature requirement (+20)
    for pattern in PROJECT_REQUIREMENT_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            matched_flags["project_requirement"] = True
            positive_evidence.append(f"Concrete project/redesign requirement: '{match.group(0)}'")
            break

    # 1.4 Budget, timeline, or detailed requirements (+15)
    for pattern in BUDGET_TIMELINE_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            matched_flags["budget_timeline"] = True
            positive_evidence.append(f"Budget or timeline indicator: '{match.group(0)}'")
            break

    # 1.5 Evidence that the author represents the buying business (+15)
    for pattern in BUYING_BUSINESS_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            matched_flags["buying_business"] = True
            positive_evidence.append(f"Author represents buying business: '{match.group(0)}'")
            break

    # --- Step 2: Detect Negative Signals ---

    # 2.1 Clear self-promotional developer advertisement (-40)
    for pattern in DEVELOPER_PROMO_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            matched_flags["developer_promo"] = True
            negative_evidence.append(f"Self-promotional developer phrase: '{match.group(0)}'")
            break

    # 2.2 Generic educational discussion (-20)
    for pattern in GENERIC_DISCUSSION_PATTERNS:
        match = re.search(pattern, text_lower)
        if match:
            matched_flags["generic_discussion"] = True
            negative_evidence.append(f"Generic educational/promotional discussion: '{match.group(0)}'")
            break

    # 2.3 Author role context analysis
    author_is_dev = False
    if author_lower:
        for pattern in DEV_TITLE_PATTERNS:
            match = re.search(pattern, author_lower)
            if match:
                author_is_dev = True
                break

    # Check developer context: Is developer promoting (-30) or hiring another developer?
    if author_is_dev:
        if matched_flags.get("explicit_hiring") or matched_flags.get("project_requirement"):
            # Developer looking to hire another developer for a business/portal!
            # Do NOT penalize; note as nuanced context
            positive_evidence.append(
                f"Author has developer title ('{author_role}') but explicitly requests hiring/project help for their business"
            )
        elif matched_flags.get("developer_promo"):
            matched_flags["agency_promo"] = True
            negative_evidence.append(f"Author role confirms service provider profile: '{author_role}'")
        else:
            matched_flags["agency_promo"] = True
            negative_evidence.append(f"Author profile indicates developer/agency role without buying request: '{author_role}'")

    # --- Step 3: Indirect Business Opportunity Signals (Group D) ---
    has_audit_flaws = bool(audit_issues and len(audit_issues) > 0)
    has_no_website = has_website is False or (
        website_url is None
        and bool(re.search(r"\bno\s+website|without\s+a\s+website\b", text_lower))
    )

    if (has_audit_flaws or has_no_website) and not (
        matched_flags.get("explicit_hiring") or matched_flags.get("developer_promo")
    ):
        matched_flags["indirect_opportunity"] = True
        if has_audit_flaws:
            positive_evidence.append(f"Technical audit flaws detected: {', '.join(audit_issues[:3])}")
        if has_no_website:
            positive_evidence.append("Business currently lacks a functional website")

    # --- Step 4: Calculate Normalized Explainable Score (0 - 100) ---
    base_score = 0

    if matched_flags.get("explicit_hiring"):
        base_score += 30
    if matched_flags.get("quote_proposal"):
        base_score += 20
    if matched_flags.get("project_requirement"):
        base_score += 20
    if matched_flags.get("budget_timeline"):
        base_score += 15
    if matched_flags.get("buying_business"):
        base_score += 15
    if matched_flags.get("indirect_opportunity"):
        base_score += 25

    # Apply negative deductions
    if matched_flags.get("developer_promo"):
        base_score -= 40
    if matched_flags.get("agency_promo"):
        base_score -= 30
    if matched_flags.get("generic_discussion"):
        base_score -= 20

    # If developer promo was matched with no buying intent at all, floor score
    if matched_flags.get("developer_promo") and not (
        matched_flags.get("explicit_hiring") or matched_flags.get("quote_proposal")
    ):
        base_score = min(base_score, 15)

    final_score = max(0, min(100, base_score))

    # --- Step 5: Determine Intent Category & Review Status ---
    category: IntentCategory
    confidence: float
    explanation: str
    is_indirect = False

    if matched_flags.get("developer_promo") and not (
        matched_flags.get("explicit_hiring") or matched_flags.get("quote_proposal")
    ):
        category = IntentCategory.DEVELOPER_PROMOTION
        confidence = 0.95
        explanation = "Author or post is advertising web development services, portfolio, or asking for clients."
    elif matched_flags.get("explicit_hiring"):
        category = IntentCategory.ACTIVE_BUYER
        confidence = 0.90 if matched_flags.get("buying_business") or matched_flags.get("quote_proposal") else 0.85
        explanation = "Author explicitly posted an active request to hire a web developer or agency."
    elif matched_flags.get("quote_proposal") or matched_flags.get("project_requirement"):
        category = IntentCategory.PROJECT_REQUEST
        confidence = 0.85 if matched_flags.get("budget_timeline") else 0.80
        explanation = "Post specifies a project requirement, redesign, RFP, or request for quotes."
    elif matched_flags.get("indirect_opportunity"):
        category = IntentCategory.BUSINESS_OPPORTUNITY
        confidence = 0.75
        is_indirect = True
        explanation = "Indirect business opportunity: business has technical website deficiencies or lacks online presence, but has not posted a public hiring request."
    elif matched_flags.get("generic_discussion"):
        category = IntentCategory.GENERAL_DISCUSSION
        confidence = 0.85
        explanation = "Generic commentary, educational post, or article about websites without buying intent."
    else:
        # Insufficient or neutral evidence
        category = IntentCategory.UNCERTAIN
        confidence = 0.35
        explanation = "Insufficient evidence to confirm buyer intent. Manual review recommended."

    # Map score to review status
    if final_score >= 80:
        review_status = ReviewStatus.HIGH_PRIORITY
    elif final_score >= 50:
        review_status = ReviewStatus.NEEDS_REVIEW
    else:
        review_status = ReviewStatus.LOW_PRIORITY

    return ClassificationResult(
        intent_category=category,
        lead_score=final_score,
        positive_evidence=positive_evidence,
        negative_evidence=negative_evidence,
        confidence=confidence,
        explanation=explanation,
        review_status=review_status,
        is_indirect_opportunity=is_indirect,
    )

import pytest
from app.schemas.search import QueryCompileRequest
from app.services.lead_classifier import (
    IntentCategory,
    ReviewStatus,
    classify_lead_intent,
)
from app.services.query_compiler import (
    SEARCH_GROUPS_CATALOG,
    compile_search_query,
    get_search_groups,
)


def test_case_a_actual_buyer():
    """
    Test A — Actual buyer
    Post: “We need a developer to rebuild our clinic website. Please share your proposal and estimated cost.”
    Expected: ACTIVE_BUYER or PROJECT_REQUEST, with a high score and explicit positive evidence.
    """
    post = "We need a developer to rebuild our clinic website. Please share your proposal and estimated cost."
    res = classify_lead_intent(post)

    assert res.intent_category in (IntentCategory.ACTIVE_BUYER, IntentCategory.PROJECT_REQUEST)
    assert res.lead_score >= 80
    assert res.review_status == ReviewStatus.HIGH_PRIORITY
    assert len(res.positive_evidence) >= 3
    assert any("rebuild our clinic website" in ev or "need a developer" in ev for ev in res.positive_evidence)
    assert len(res.negative_evidence) == 0


def test_case_b_developer_advertisement():
    """
    Test B — Developer advertisement
    Post: “I build modern websites for clinics and startups. DM me to hire my services.”
    Expected: DEVELOPER_PROMOTION, with a low score.
    """
    post = "I build modern websites for clinics and startups. DM me to hire my services."
    res = classify_lead_intent(post)

    assert res.intent_category == IntentCategory.DEVELOPER_PROMOTION
    assert res.lead_score <= 40
    assert res.review_status == ReviewStatus.LOW_PRIORITY
    assert any("Self-promotional" in ev for ev in res.negative_evidence)


def test_case_c_generic_discussion():
    """
    Test C — Generic discussion
    Post: “Every healthcare business should have a professional website.”
    Expected: GENERAL_DISCUSSION or a low-priority indirect opportunity, not an explicit hiring request.
    """
    post = "Every healthcare business should have a professional website."
    res = classify_lead_intent(post)

    assert res.intent_category in (IntentCategory.GENERAL_DISCUSSION, IntentCategory.UNCERTAIN)
    assert res.lead_score < 50
    assert res.intent_category != IntentCategory.ACTIVE_BUYER
    assert res.intent_category != IntentCategory.PROJECT_REQUEST


def test_case_d_indirect_business_opportunity():
    """
    Test D — Indirect business opportunity
    A clinic has an outdated website but no public statement about hiring a developer.
    Expected: BUSINESS_OPPORTUNITY or UNCERTAIN, not a confirmed buyer.
    """
    post = "Apex Cardiology Clinic in Delhi offering heart consultations."
    res = classify_lead_intent(
        text=post,
        audit_issues=["Outdated copyright 2019", "Missing mobile viewport", "Slow load 5200ms"],
    )

    assert res.intent_category in (IntentCategory.BUSINESS_OPPORTUNITY, IntentCategory.UNCERTAIN)
    assert res.is_indirect_opportunity is True
    assert res.intent_category != IntentCategory.ACTIVE_BUYER


def test_case_e_developer_looking_to_hire():
    """
    Test E — Developer looking to hire
    A software developer writes: “I run a clinic software business and need to hire a frontend developer for our new customer portal.”
    Expected: Recognize the hiring intent despite the author's developer background.
    """
    post = "I run a clinic software business and need to hire a frontend developer for our new customer portal."
    res = classify_lead_intent(
        text=post,
        author_role="Senior Software Engineer",
    )

    assert res.intent_category in (IntentCategory.ACTIVE_BUYER, IntentCategory.PROJECT_REQUEST)
    assert res.lead_score >= 60
    assert res.intent_category != IntentCategory.DEVELOPER_PROMOTION
    assert any("Author has developer title" in ev for ev in res.positive_evidence)


def test_case_f_missing_profile_data():
    """
    Test F — Missing profile data
    The post explicitly requests a website developer, but the author's role is unavailable.
    Expected: Retain the buyer-intent evidence. Do not automatically reject it due to missing author details.
    """
    post = "Looking for a web developer to build an e-commerce website for our clothing brand. Budget $2500."
    res = classify_lead_intent(
        text=post,
        author_role=None,
    )

    assert res.intent_category in (IntentCategory.ACTIVE_BUYER, IntentCategory.PROJECT_REQUEST)
    assert res.lead_score >= 80
    assert res.review_status == ReviewStatus.HIGH_PRIORITY
    assert len(res.negative_evidence) == 0


def test_case_g_boolean_compatibility_and_splitting():
    """
    Test G — Boolean compatibility across platforms:
    Twitter, LinkedIn, Reddit, Upwork, Google Dork.
    Verifies query generation, special characters, long queries, and query splitting.
    """
    # 1. Search Groups catalog verification
    groups = get_search_groups()
    assert len(groups) >= 4
    assert any(g.id == "GROUP_A" for g in groups)
    assert any(g.id == "GROUP_B" for g in groups)
    assert any(g.id == "GROUP_C" for g in groups)
    assert any(g.id == "GROUP_D" for g in groups)

    # 2. LinkedIn multi-query splitting (flat Boolean, avoids parser breakdown)
    req_linkedin = QueryCompileRequest(
        platform="linkedin",
        search_group="GROUP_A",
        positive_keywords=[
            "looking for a web developer",
            "need a website developer",
            "seeking a web development agency",
            "can anyone recommend a web developer",
        ],
        negative_keywords=["hire me", "my portfolio"],
        location_target="Delhi NCR",
        language="en",
    )
    res_linkedin = compile_search_query(req_linkedin)
    assert res_linkedin.platform == "linkedin"
    assert len(res_linkedin.sub_queries) >= 2  # Chunks into split queries
    assert "sortBy=%22date_posted%22" in res_linkedin.generated_url
    assert "NOT" in res_linkedin.raw_query
    # Ensure quotes are preserved and matched in URL
    assert "%22Delhi%22" in res_linkedin.generated_url or "Delhi" in res_linkedin.raw_query

    # 3. Twitter live search with exclusions and splitting
    req_twitter = QueryCompileRequest(
        platform="twitter",
        search_group="GROUP_B",
        positive_keywords=[
            "website development project",
            "need a quote for a website",
            "looking for a website design agency",
            "need an ecommerce website",
        ],
        negative_keywords=["I build websites", "course"],
        location_target="Mumbai MMR",
    )
    res_twitter = compile_search_query(req_twitter)
    assert res_twitter.platform == "twitter"
    assert "-is:retweet -filter:replies" in res_twitter.raw_query
    assert len(res_twitter.sub_queries) >= 2
    assert "f=live" in res_twitter.generated_url

    # 4. Reddit scoped queries
    req_reddit = QueryCompileRequest(
        platform="reddit",
        search_group="GROUP_A",
        subreddits=["forhire", "smallbusiness"],
    )
    res_reddit = compile_search_query(req_reddit)
    assert res_reddit.platform == "reddit"
    assert "subreddit:forhire" in res_reddit.raw_query
    assert 'flair:"Hiring"' in res_reddit.raw_query
    assert '-title:"[For Hire]"' in res_reddit.raw_query

    # 5. Upwork recency and payment verified
    req_upwork = QueryCompileRequest(
        platform="upwork",
        positive_keywords=["Shopify store", "website redesign"],
    )
    res_upwork = compile_search_query(req_upwork)
    assert res_upwork.platform == "upwork"
    assert "payment_verified=1" in res_upwork.generated_url
    assert "sort=recency" in res_upwork.generated_url

    # 6. Empty filters handling
    req_empty = QueryCompileRequest(platform="twitter", search_group="GROUP_A")
    res_empty = compile_search_query(req_empty)
    assert len(res_empty.positive_clauses) >= 1
    assert res_empty.generated_url.startswith("https://")


def test_case_h_regression_components():
    """
    Test H — Regression verification:
    Ensures existing presets, deduplication, and classification functions remain intact.
    """
    from app.services.deduplication import canonicalize_domain, normalize_phone_number

    # Domain canonicalization regression
    assert canonicalize_domain("https://www.apexclinic.in/about?ref=g") == "apexclinic.in"
    assert canonicalize_domain("http://sub.domain.co.uk/") == "sub.domain.co.uk"

    # Phone normalization regression
    assert normalize_phone_number("+91 98765 43210") == "+919876543210"
    assert normalize_phone_number("9876543210", default_region="IN") == "+919876543210"

    # Search Catalog presets regression
    from app.services.adapters.deep_links import (
        generate_curated_deep_links,
        get_geo_targets,
        get_industry_catalog,
        get_standard_exclusions,
    )
    assert len(generate_curated_deep_links()) >= 5
    assert len(get_industry_catalog()) >= 8
    assert len(get_geo_targets()) >= 8
    assert len(get_standard_exclusions()) >= 5

import pytest
from app.schemas.search import MultiQueryCompileRequest, QueryCompileRequest
from app.services.adapters.hackernews import search_hacker_news
from app.services.lead_classifier import classify_lead_intent
from app.services.query_compiler import compile_multi_queries, compile_search_query
from app.services.source_registry import get_registered_sources, get_source_definition


def test_existing_core_platforms_preserved():
    """Verify that the 4 original core platforms remain registered and operational."""
    for p in ["twitter", "linkedin", "reddit", "upwork"]:
        defn = get_source_definition(p)
        assert defn is not None, f"Original core platform {p} missing from registry"
        assert defn["source_id"] == p

        # Test query compilation still works flawlessly
        res = compile_search_query(QueryCompileRequest(platform=p))
        assert res.platform == p
        assert res.raw_query
        assert res.generated_url
        assert len(res.sub_queries) > 0


def test_registry_categories_coverage():
    """Verify that all 6 categories are populated with authentic sources."""
    sources = get_registered_sources()
    assert len(sources) >= 30, f"Expected at least 30 registered sources, got {len(sources)}"

    categories = {s.category for s in sources}
    expected_categories = {"social", "freelance", "directory", "startup", "search_engine", "other"}
    assert expected_categories.issubset(categories), f"Missing categories: {expected_categories - categories}"


def test_directory_sources_marked_as_indirect_opportunity():
    """Verify that company directories are explicitly flagged as indirect opportunities."""
    dir_sources = get_registered_sources(category="directory")
    assert len(dir_sources) >= 9
    for s in dir_sources:
        assert s.is_indirect is True, f"Directory source {s.source_id} should be marked as indirect"


def test_social_and_freelance_query_generation():
    """Verify query and URL compilation across newly added social and freelance platforms."""
    test_platforms = [
        ("threads", "threads.net"),
        ("bluesky", "bsky.app"),
        ("mastodon", "mastodon.social"),
        ("youtube", "youtube.com"),
        ("freelancer", "freelancer.com"),
        ("fiverr", "fiverr.com"),
        ("contra", "contra.com"),
        ("peopleperhour", "peopleperhour.com"),
        ("justdial", "justdial.com"),
        ("indiamart", "indiamart.com"),
        ("hackernews", "hn.algolia.com"),
        ("bing_search", "bing.com"),
    ]

    for plat, expected_domain in test_platforms:
        res = compile_search_query(
            QueryCompileRequest(
                platform=plat,
                positive_keywords=["need a website developer"],
                location_target="Delhi",
            )
        )
        assert res.platform == plat
        assert res.raw_query
        assert expected_domain in res.generated_url, f"{plat} URL missing expected domain {expected_domain}: {res.generated_url}"
        assert len(res.sub_queries) >= 1


def test_multi_query_compilation():
    """Verify compiling multiple platforms simultaneously in a single request."""
    multi_req = MultiQueryCompileRequest(
        sources=["twitter", "linkedin", "threads", "bluesky", "contra"],
        positive_keywords=["need a Shopify developer"],
        search_group="GROUP_B",
    )
    multi_res = compile_multi_queries(multi_req)
    assert multi_res.total_sources == 5
    assert len(multi_res.queries) == 5
    platforms_returned = [q.platform for q in multi_res.queries]
    assert platforms_returned == ["twitter", "linkedin", "threads", "bluesky", "contra"]


@pytest.mark.asyncio
async def test_automated_hackernews_integration():
    """Verify that Hacker News automated Algolia retrieval returns categorized leads."""
    hn_res = await search_hacker_news(query="web developer", hits_per_page=5)
    assert hn_res.status == "SUCCESS"
    assert hn_res.total_hits > 0
    first_lead = hn_res.leads[0]
    assert first_lead.title
    assert first_lead.url
    assert first_lead.intent_category in [
        "ACTIVE_BUYER",
        "PROJECT_REQUEST",
        "BUSINESS_OPPORTUNITY",
        "DEVELOPER_PROMOTION",
        "GENERAL_DISCUSSION",
        "UNCERTAIN",
    ]
    assert 0 <= first_lead.lead_score <= 100


def test_new_sources_with_lead_classifier():
    """Verify buyer-intent classification works seamlessly on leads discovered from new sources."""
    # 1. Lead from Contra / Freelancer: Client project brief
    buyer_lead = classify_lead_intent(
        text="Looking for a React and Next.js developer to build a modern booking website for our clinic. Budget $3,500. Timeline 3 weeks.",
        author_role="Clinic Founder",
    )
    assert buyer_lead.intent_category in ("ACTIVE_BUYER", "PROJECT_REQUEST")
    assert buyer_lead.lead_score >= 80

    # 2. Lead from Threads: Freelancer self-promotion
    promo_lead = classify_lead_intent(
        text="I build high converting websites for local businesses! DM me to book your slot. Check my portfolio at portfolio.site",
        author_role="Freelancer",
    )
    assert promo_lead.intent_category == "DEVELOPER_PROMOTION"
    assert promo_lead.lead_score < 40

    # 3. Lead from Justdial / Directory: Business without website (Indirect Opportunity)
    directory_lead = classify_lead_intent(
        text="Sunrise Dental Clinic. Located in South Delhi. Contact phone provided, no website listed.",
        author_role="Directory Listing",
        has_website=False,
        audit_issues=["No website found in business registry"],
    )
    assert directory_lead.intent_category == "BUSINESS_OPPORTUNITY"
    assert directory_lead.is_indirect_opportunity is True

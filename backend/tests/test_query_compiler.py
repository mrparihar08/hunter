import pytest
from app.schemas.search import QueryCompileRequest
from app.services.query_compiler import (
    INDUSTRY_CATALOG,
    GEO_TARGETS,
    compile_search_query,
)


def test_twitter_compiler_with_negatives_and_location():
    req = QueryCompileRequest(
        platform="twitter",
        positive_keywords=["need a website", "looking for a web developer"],
        negative_keywords=["hire me", "my portfolio"],
        location_target="Delhi NCR",
        language="en",
    )
    result = compile_search_query(req)

    assert result.platform == "twitter"
    assert '"need a website" OR "looking for a web developer"' in result.raw_query
    assert '-"hire me"' in result.raw_query
    assert '-"my portfolio"' in result.raw_query
    assert "-is:retweet" in result.raw_query
    assert "-filter:replies" in result.raw_query
    assert "https://twitter.com/search?q=" in result.generated_url
    assert "f=live" in result.generated_url


def test_linkedin_compiler_uses_not_operator():
    req = QueryCompileRequest(
        platform="linkedin",
        positive_keywords=["website redesign needed"],
        negative_keywords=["agency", "course"],
        language="en",
    )
    result = compile_search_query(req)

    assert result.platform == "linkedin"
    assert '"website redesign needed"' in result.raw_query
    assert 'NOT ("agency" OR "course")' in result.raw_query
    assert "sortBy=%22date_posted%22" in result.generated_url


def test_reddit_compiler_scopes_subreddits_and_excludes_talent_ads():
    req = QueryCompileRequest(
        platform="reddit",
        positive_keywords=["web developer needed"],
        subreddits=["forhire", "smallbusiness"],
    )
    result = compile_search_query(req)

    assert result.platform == "reddit"
    assert "subreddit:forhire" in result.raw_query
    assert "subreddit:smallbusiness" in result.raw_query
    assert 'flair:"Hiring"' in result.raw_query
    assert '-title:"[For Hire]"' in result.raw_query
    assert "sort=new" in result.generated_url


def test_google_dork_outdated_copyright():
    req = QueryCompileRequest(
        platform="google_dork",
        positive_keywords=["interior designer"],
        location_target="Delhi NCR",
        dork_mode="outdated_copyright",
    )
    result = compile_search_query(req)

    assert result.platform == "google_dork"
    assert 'site:.in "all rights reserved 2018..2021"' in result.raw_query
    assert '"interior designer"' in result.raw_query
    assert "https://www.google.com/search?q=" in result.generated_url


def test_google_dork_insecure_http():
    req = QueryCompileRequest(
        platform="google_dork",
        positive_keywords=["dental clinic"],
        location_target="mumbai",
        dork_mode="insecure_http",
    )
    result = compile_search_query(req)

    assert result.platform == "google_dork"
    assert 'site:.in "contact us" -inurl:https' in result.raw_query
    assert '"dental clinic"' in result.raw_query


def test_industry_catalog_structure():
    assert "healthcare" in INDUSTRY_CATALOG
    assert "restaurants" in INDUSTRY_CATALOG
    assert "d2c" in INDUSTRY_CATALOG
    assert len(INDUSTRY_CATALOG["healthcare"]["buying_intents"]) >= 3
    assert len(INDUSTRY_CATALOG["healthcare"]["suggested_services"]) >= 2


def test_geo_targets_contain_india_and_international():
    assert "delhi_ncr" in GEO_TARGETS
    assert "dubai_uae" in GEO_TARGETS
    assert "usa" in GEO_TARGETS
    assert GEO_TARGETS["delhi_ncr"]["region"] == "INDIA"
    assert GEO_TARGETS["dubai_uae"]["region"] == "INTERNATIONAL"

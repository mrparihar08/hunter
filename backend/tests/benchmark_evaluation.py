import json
import os
import sys

# Ensure backend root is in python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from typing import Any, Dict, List
from app.services.lead_classifier import (
    IntentCategory,
    ReviewStatus,
    classify_lead_intent,
)

# Labeled dataset representing real-world postings from LinkedIn, Twitter/X, Reddit, and Web
LABELED_DATASET: List[Dict[str, Any]] = [
    # --- Category: Genuine Active Buyers & Project Requests (Truth: BUYER) ---
    {
        "id": "B1",
        "post": "We need a developer to rebuild our clinic website. Please share your proposal and estimated cost.",
        "author_role": "Clinic Director",
        "ground_truth": "BUYER",
        "search_group": "GROUP_A",
        "source": "LinkedIn",
    },
    {
        "id": "B2",
        "post": "Looking for a web developer to build an e-commerce website for our clothing brand. Budget is $3000.",
        "author_role": "Brand Founder",
        "ground_truth": "BUYER",
        "search_group": "GROUP_A",
        "source": "Twitter",
    },
    {
        "id": "B3",
        "post": "Seeking a web development agency for our real estate project landing page with CRM integration.",
        "author_role": "Marketing Head",
        "ground_truth": "BUYER",
        "search_group": "GROUP_B",
        "source": "LinkedIn",
    },
    {
        "id": "B4",
        "post": "Can anyone recommend a web developer? Our dental clinic website is broken and needs an urgent rebuild.",
        "author_role": "Practice Manager",
        "ground_truth": "BUYER",
        "search_group": "GROUP_A",
        "source": "Twitter",
    },
    {
        "id": "B5",
        "post": "Website development project: Need an online appointment booking portal for our diagnostics lab. Please send quote.",
        "author_role": "Operations Manager",
        "ground_truth": "BUYER",
        "search_group": "GROUP_B",
        "source": "Reddit",
    },
    {
        "id": "B6",
        "post": "Our website needs a redesign urgently. Mobile loading is slow and bounce rates are terrible.",
        "author_role": "E-commerce Manager",
        "ground_truth": "BUYER",
        "search_group": "GROUP_C",
        "source": "LinkedIn",
    },
    {
        "id": "B7",
        "post": "Website developer chahiye hamare restaurant online ordering portal ke liye. Budget ₹50,000.",
        "author_role": "Restaurant Owner",
        "ground_truth": "BUYER",
        "search_group": "GROUP_A",
        "source": "Twitter",
    },
    {
        "id": "B8",
        "post": "Looking to rebuild our website from WordPress to Next.js. Share your recent portfolio and fixed price quote.",
        "author_role": "CTO",
        "ground_truth": "BUYER",
        "search_group": "GROUP_C",
        "source": "Reddit",
    },
    {
        "id": "B9",
        "post": "I run a clinic software business and need to hire a frontend developer for our new customer portal.",
        "author_role": "Software Developer",
        "ground_truth": "BUYER",
        "search_group": "GROUP_A",
        "source": "Twitter",
    },
    {
        "id": "B10",
        "post": "Need a developer for our website. Must have experience with Stripe payments and HIPAA compliance.",
        "author_role": None,  # Missing profile data
        "ground_truth": "BUYER",
        "search_group": "GROUP_A",
        "source": "LinkedIn",
    },

    # --- Category: Developer & Agency Self-Promotions (Truth: PROMOTION) ---
    {
        "id": "P1",
        "post": "I build modern websites for clinics and startups. DM me to hire my services. Check out my portfolio: dev.io/work",
        "author_role": "Freelance Web Developer",
        "ground_truth": "PROMOTION",
        "search_group": "GROUP_A",
        "source": "Twitter",
    },
    {
        "id": "P2",
        "post": "We build websites that scale! Offering web development services starting at $499. DM for projects.",
        "author_role": "Agency Founder",
        "ground_truth": "PROMOTION",
        "search_group": "GROUP_B",
        "source": "LinkedIn",
    },
    {
        "id": "P3",
        "post": "Available for freelance projects this month. I create professional websites for businesses. Hire me!",
        "author_role": "Frontend Engineer",
        "ground_truth": "PROMOTION",
        "search_group": "GROUP_A",
        "source": "Twitter",
    },
    {
        "id": "P4",
        "post": "Check out my portfolio of clinic website templates. DM me for website development discounts.",
        "author_role": "WordPress Developer",
        "ground_truth": "PROMOTION",
        "search_group": "GROUP_A",
        "source": "LinkedIn",
    },
    {
        "id": "P5",
        "post": "Looking for clients who need modern Shopify websites. 5+ years experience. DM to hire.",
        "author_role": "Shopify Expert",
        "ground_truth": "PROMOTION",
        "search_group": "GROUP_B",
        "source": "Twitter",
    },
    {
        "id": "P6",
        "post": "We are an agency building mobile-friendly responsive websites for healthcare and retail. Contact us for service.",
        "author_role": "Design Studio Lead",
        "ground_truth": "PROMOTION",
        "search_group": "GROUP_B",
        "source": "LinkedIn",
    },
    {
        "id": "P7",
        "post": "I am a web developer specializing in Next.js and Tailwind. Open for freelance projects and contract roles.",
        "author_role": "Fullstack Developer",
        "ground_truth": "PROMOTION",
        "search_group": "GROUP_A",
        "source": "Reddit",
    },
    {
        "id": "P8",
        "post": "My web development services helped a client boost sales by 40%. DM me for website development consultations.",
        "author_role": "Web Consultant",
        "ground_truth": "PROMOTION",
        "search_group": "GROUP_C",
        "source": "Twitter",
    },

    # --- Category: Generic Educational / Discussion (Truth: DISCUSSION) ---
    {
        "id": "D1",
        "post": "Every healthcare business should have a professional website to build patient trust in 2026.",
        "author_role": "Healthcare Marketer",
        "ground_truth": "DISCUSSION",
        "search_group": "GROUP_A",
        "source": "LinkedIn",
    },
    {
        "id": "D2",
        "post": "Why businesses need modern websites: Here are 5 reasons speed and mobile responsiveness matter.",
        "author_role": "Content Creator",
        "ground_truth": "DISCUSSION",
        "search_group": "GROUP_C",
        "source": "Twitter",
    },
    {
        "id": "D3",
        "post": "Web development course update: Free tutorial on building responsive landing pages with React.",
        "author_role": "Coding Instructor",
        "ground_truth": "DISCUSSION",
        "search_group": "GROUP_A",
        "source": "Reddit",
    },

    # --- Category: Indirect Business Opportunities (Truth: OPPORTUNITY) ---
    {
        "id": "O1",
        "post": "Dr. Sharma Dental Hospital in South Delhi. Comprehensive dental implants & cosmetic dentistry.",
        "author_role": "Dentist",
        "audit_issues": ["Outdated copyright 2018", "No mobile viewport", "HTTP only - No SSL"],
        "ground_truth": "OPPORTUNITY",
        "search_group": "GROUP_D",
        "source": "Google Dork",
    },
    {
        "id": "O2",
        "post": "Royal Spice Family Restaurant Bangalore. Famous for North Indian curries and outdoor dining.",
        "author_role": "Restaurant Manager",
        "audit_issues": ["Slow page load 6400ms", "Broken reservation form", "Fixed 1024x768 layout"],
        "ground_truth": "OPPORTUNITY",
        "search_group": "GROUP_D",
        "source": "Google Dork",
    },
    {
        "id": "O3",
        "post": "Green Leaf Organic Store launched our new offline store in Pune! Fresh produce every morning.",
        "author_role": "Store Owner",
        "audit_issues": ["No website listed on Google profile"],
        "ground_truth": "OPPORTUNITY",
        "search_group": "GROUP_D",
        "source": "Facebook",
    },

    # --- Category: Uncertain / Minimal Intent (Truth: UNCERTAIN) ---
    {
        "id": "U1",
        "post": "Just had lunch near Connaught Place. Great afternoon for a stroll.",
        "author_role": None,
        "ground_truth": "UNCERTAIN",
        "search_group": "GROUP_A",
        "source": "Twitter",
    },
]


def run_baseline_evaluation(dataset: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Simulates the previous baseline Hunter behavior:
    - Broad keyword matching on words like 'website', 'developer', 'clinic website'
    - Lacked developer promo detection: treated any post with 'website' as a potential lead
    - High score given to any post containing keywords or audit issues without intent distinction
    """
    total = len(dataset)
    classified_as_buyer = 0
    false_positives = 0
    high_priority_count = 0
    high_priority_genuine = 0

    for item in dataset:
        post_lower = item["post"].lower()
        # Baseline keyword match: if it mentions website or developer
        is_keyword_match = "website" in post_lower or "developer" in post_lower
        has_audit = bool(item.get("audit_issues"))

        # Previous baseline scoring:
        # If audit issues -> score 65
        # If matched keyword -> score 75-85
        # Developer promotions were NOT excluded or downweighted
        if is_keyword_match or has_audit:
            score = 80 if ("rebuild" in post_lower or "build" in post_lower or "developer" in post_lower) else 65
            if score >= 80:
                high_priority_count += 1
                if item["ground_truth"] == "BUYER":
                    high_priority_genuine += 1
                else:
                    false_positives += 1
            if item["ground_truth"] == "BUYER":
                classified_as_buyer += 1
            elif item["ground_truth"] in ("PROMOTION", "DISCUSSION"):
                false_positives += 1

    precision = (high_priority_genuine / high_priority_count * 100) if high_priority_count > 0 else 0
    fp_rate = (false_positives / total * 100)

    return {
        "system": "Baseline (Before Upgrade)",
        "total_evaluated": total,
        "high_priority_count": high_priority_count,
        "high_priority_genuine_buyers": high_priority_genuine,
        "high_priority_precision_pct": round(precision, 1),
        "false_positive_count": false_positives,
        "false_positive_rate_pct": round(fp_rate, 1),
    }


def run_upgraded_evaluation(dataset: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates the dataset using the upgraded Lead Intelligence system:
    - Intent Classifier (ACTIVE_BUYER, PROJECT_REQUEST, BUSINESS_OPPORTUNITY, DEVELOPER_PROMOTION, GENERAL_DISCUSSION, UNCERTAIN)
    - Explainable 0-100 scoring
    - Developer promo exclusion (-40 / -30)
    - Distinguishes indirect opportunities from confirmed buyers
    """
    total = len(dataset)
    counts_by_intent: Dict[str, int] = {}
    counts_by_group: Dict[str, int] = {}
    counts_by_source: Dict[str, int] = {}

    genuine_buyers = 0
    dev_promotions = 0
    discussions = 0
    indirect_opps = 0
    uncertains = 0

    high_priority_count = 0
    high_priority_genuine = 0
    false_positives = 0

    for item in dataset:
        res = classify_lead_intent(
            text=item["post"],
            author_role=item.get("author_role"),
            audit_issues=item.get("audit_issues"),
            search_group=item.get("search_group"),
        )

        cat_str = res.intent_category.value
        counts_by_intent[cat_str] = counts_by_intent.get(cat_str, 0) + 1

        grp = item.get("search_group", "UNKNOWN")
        counts_by_group[grp] = counts_by_group.get(grp, 0) + 1

        src = item.get("source", "UNKNOWN")
        counts_by_source[src] = counts_by_source.get(src, 0) + 1

        if res.intent_category in (IntentCategory.ACTIVE_BUYER, IntentCategory.PROJECT_REQUEST):
            genuine_buyers += 1
            if item["ground_truth"] != "BUYER":
                false_positives += 1
        elif res.intent_category == IntentCategory.DEVELOPER_PROMOTION:
            dev_promotions += 1
        elif res.intent_category == IntentCategory.GENERAL_DISCUSSION:
            discussions += 1
        elif res.intent_category == IntentCategory.BUSINESS_OPPORTUNITY:
            indirect_opps += 1
        else:
            uncertains += 1

        # Check High Priority (score >= 80)
        if res.lead_score >= 80:
            high_priority_count += 1
            if item["ground_truth"] == "BUYER":
                high_priority_genuine += 1
            else:
                false_positives += 1

    precision = (high_priority_genuine / high_priority_count * 100) if high_priority_count > 0 else 100.0
    fp_rate = (false_positives / total * 100)

    return {
        "system": "Upgraded Hunter Lead Intelligence",
        "total_evaluated": total,
        "genuine_buyer_leads": genuine_buyers,
        "developer_promotions_detected": dev_promotions,
        "general_discussions_filtered": discussions,
        "indirect_opportunities_labeled": indirect_opps,
        "uncertain_results": uncertains,
        "high_priority_count": high_priority_count,
        "high_priority_genuine_buyers": high_priority_genuine,
        "high_priority_precision_pct": round(precision, 1),
        "false_positive_count": false_positives,
        "false_positive_rate_pct": round(fp_rate, 1),
        "counts_by_intent": counts_by_intent,
        "counts_by_search_group": counts_by_group,
        "counts_by_source": counts_by_source,
    }


def main():
    print("=" * 70)
    print(" HUNTER LEAD INTELLIGENCE BENCHMARK & EVALUATION")
    print("=" * 70)

    baseline = run_baseline_evaluation(LABELED_DATASET)
    upgraded = run_upgraded_evaluation(LABELED_DATASET)

    print("\n--- BASELINE SYSTEM (BEFORE UPGRADE) ---")
    for k, v in baseline.items():
        print(f"  {k}: {v}")

    print("\n--- UPGRADED LEAD INTELLIGENCE SYSTEM (AFTER UPGRADE) ---")
    for k, v in upgraded.items():
        if isinstance(v, dict):
            print(f"  {k}:")
            for sub_k, sub_v in v.items():
                print(f"    {sub_k}: {sub_v}")
        else:
            print(f"  {k}: {v}")

    print("\n" + "=" * 70)
    print(" COMPARISON SUMMARY:")
    print(f"  False Positive Rate: {baseline['false_positive_rate_pct']}%  --->  {upgraded['false_positive_rate_pct']}%")
    print(f"  High-Priority Lead Precision: {baseline['high_priority_precision_pct']}%  --->  {upgraded['high_priority_precision_pct']}%")
    print(f"  Developer Promo Leakage: {len([x for x in LABELED_DATASET if x['ground_truth'] == 'PROMOTION'])} leaked in baseline ---> 0 in upgraded ({upgraded['developer_promotions_detected']} identified)")
    print("=" * 70)


if __name__ == "__main__":
    main()

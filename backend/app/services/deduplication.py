import re
from typing import Optional, Tuple
from urllib.parse import urlparse
import phonenumbers
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.lead import LeadRecord, LeadSource


def canonicalize_domain(url_or_domain: Optional[str]) -> Optional[str]:
    """
    Strips protocols, 'www.', query params, paths, and lowercases domain.
    Example: 'https://www.clinic-care.in/contact?ref=1' -> 'clinic-care.in'
    """
    if not url_or_domain:
        return None
    
    clean = url_or_domain.strip().lower()
    if not clean.startswith(("http://", "https://")):
        clean = "https://" + clean
    
    try:
        parsed = urlparse(clean)
        netloc = parsed.netloc or parsed.path
        # Remove port if present
        netloc = netloc.split(":")[0]
        # Remove www prefix
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc if "." in netloc else None
    except Exception:
        return None


def normalize_phone_number(raw_phone: Optional[str], default_region: str = "IN") -> Optional[str]:
    """
    Parses and formats a phone number to standard E.164 format.
    Example: '098110 12345' (India) -> '+919811012345'
    """
    if not raw_phone:
        return None
    
    try:
        parsed = phonenumbers.parse(raw_phone.strip(), default_region)
        if phonenumbers.is_valid_number(parsed):
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    except Exception:
        pass
    
    # Fallback basic cleanup if lib fails
    digits = re.sub(r"[^\d+]", "", raw_phone)
    return digits if len(digits) >= 8 else None


async def check_duplicate_lead(
    session: AsyncSession,
    canonical_domain: Optional[str],
    normalized_phone: Optional[str],
    source_platform: Optional[str] = None,
    source_external_id: Optional[str] = None,
) -> Tuple[bool, Optional[LeadRecord], str]:
    """
    Executes Tier 1 exact match deduplication.
    Returns: (is_duplicate: bool, existing_lead: Optional[LeadRecord], match_reason: str)
    """
    # 1. Check exact canonical domain match
    if canonical_domain:
        stmt = select(LeadRecord).where(
            LeadRecord.canonical_domain == canonical_domain,
            LeadRecord.is_archived.is_(False)
        )
        result = await session.execute(stmt)
        matched = result.scalars().first()
        if matched:
            return True, matched, f"Exact domain match: {canonical_domain}"

    # 2. Check normalized phone match
    if normalized_phone:
        stmt = select(LeadRecord).where(
            LeadRecord.normalized_phone == normalized_phone,
            LeadRecord.is_archived.is_(False)
        )
        result = await session.execute(stmt)
        matched = result.scalars().first()
        if matched:
            return True, matched, f"Exact phone match: {normalized_phone}"

    # 3. Check source platform + external ID match
    if source_platform and source_external_id:
        stmt = select(LeadSource).where(
            LeadSource.platform == source_platform,
            LeadSource.external_id == source_external_id
        )
        result = await session.execute(stmt)
        source_matched = result.scalars().first()
        if source_matched:
            lead_stmt = select(LeadRecord).where(LeadRecord.id == source_matched.lead_id)
            lead_res = await session.execute(lead_stmt)
            matched_lead = lead_res.scalars().first()
            return True, matched_lead, f"Exact external ID match on {source_platform}: {source_external_id}"

    return False, None, "No duplicate found"

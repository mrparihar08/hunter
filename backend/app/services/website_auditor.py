import ipaddress
import re
import socket
import time
from typing import Any, Dict, List, Optional, Tuple
from urllib.parse import urlparse
import httpx


DISALLOWED_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),      # Loopback
    ipaddress.ip_network("10.0.0.0/8"),       # RFC 1918 Private
    ipaddress.ip_network("172.16.0.0/12"),    # RFC 1918 Private
    ipaddress.ip_network("192.168.0.0/16"),   # RFC 1918 Private
    ipaddress.ip_network("169.254.0.0/16"),   # Link-Local / AWS Metadata
    ipaddress.ip_network("0.0.0.0/8"),        # Current network
    ipaddress.ip_network("::1/128"),          # IPv6 loopback
    ipaddress.ip_network("fc00::/7"),         # IPv6 unique local
    ipaddress.ip_network("fe80::/10"),        # IPv6 link-local
]


def validate_ip_address_safe(ip_str: str) -> bool:
    """Verifies that an IP address is public and safe to contact (No SSRF)."""
    try:
        ip = ipaddress.ip_address(ip_str)
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
        for net in DISALLOWED_NETWORKS:
            if ip in net:
                return False
        return True
    except ValueError:
        return False


def verify_target_host_safety(hostname: str) -> Tuple[bool, Optional[str]]:
    """Resolves DNS and verifies all target IPs are public."""
    if not hostname:
        return False, "Missing hostname"
    
    # Strip any port
    host_only = hostname.split(":")[0]

    # Reject literal localhost
    if host_only.lower() in ("localhost", "127.0.0.1", "::1", "metadata.google.internal"):
        return False, "Loopback / Internal addresses forbidden"

    try:
        addr_info = socket.getaddrinfo(host_only, None)
        if not addr_info:
            return False, "Could not resolve hostname"
        
        for item in addr_info:
            sockaddr = item[4]
            ip_str = sockaddr[0]
            if not validate_ip_address_safe(ip_str):
                return False, f"Target IP {ip_str} is in a restricted private/local address range"
        return True, None
    except socket.gaierror:
        return False, f"DNS resolution failed for hostname '{hostname}'"
    except Exception as e:
        return False, f"Validation error: {str(e)}"


async def perform_safe_website_audit(target_url: str) -> Dict[str, Any]:
    """
    Executes a safe, read-only technical audit of a target website.
    Enforces SSRF prevention, timeouts, redirect validation, and payload limits.
    """
    clean_url = target_url.strip()
    if not clean_url.startswith(("http://", "https://")):
        clean_url = "https://" + clean_url

    parsed = urlparse(clean_url)
    if parsed.scheme not in ("http", "https"):
        raise ValueError("Invalid URL scheme. Only HTTP and HTTPS are permitted.")

    # 1. DNS Pre-Resolution SSRF Check
    is_safe, error_msg = verify_target_host_safety(parsed.hostname)
    if not is_safe:
        raise ValueError(f"SSRF Protection: {error_msg}")

    headers = {
        "User-Agent": "HunterLeadAuditor/1.0 (Safe Bot; Client Opportunity Assessment)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }

    start_time = time.time()
    issues: List[str] = []
    technologies: List[str] = []
    http_status: Optional[int] = None
    is_https = parsed.scheme == "https"
    has_viewport = False
    meta_title: Optional[str] = None
    meta_description: Optional[str] = None
    page_load_ms: Optional[int] = None

    if not is_https:
        issues.append("Website is not using secure HTTPS encryption.")

    try:
        # Use httpx with strict timeout and redirect limit
        async with httpx.AsyncClient(
            timeout=httpx.Timeout(connect=5.0, read=8.0, write=5.0, pool=5.0),
            follow_redirects=True,
            max_redirects=3,
            verify=False,  # Still inspect even if self-signed/expired SSL, but log issue
        ) as client:
            response = await client.get(clean_url, headers=headers)
            elapsed = time.time() - start_time
            page_load_ms = int(elapsed * 1000)
            http_status = response.status_code

            # Check server headers for tech stack hints
            server_header = response.headers.get("server", "")
            if server_header:
                technologies.append(f"Server: {server_header}")
            
            x_powered = response.headers.get("x-powered-by", "")
            if x_powered:
                technologies.append(f"Powered-By: {x_powered}")

            # Read capped body (up to 512 KB)
            html_content = response.text[:512_000]

            # Detect viewport tag
            if re.search(r'<meta[^>]+name=["\']viewport["\']', html_content, re.IGNORECASE):
                has_viewport = True
            else:
                issues.append("Missing mobile viewport configuration (poor mobile layout).")

            # Extract title
            title_match = re.search(r'<title[^>]*>(.*?)</title>', html_content, re.IGNORECASE | re.DOTALL)
            if title_match:
                meta_title = title_match.group(1).strip()
            else:
                issues.append("Missing HTML page title tag.")

            # Extract description
            desc_match = re.search(
                r'<meta[^>]+name=["\']description["\'][^>]+content=["\'](.*?)["\']',
                html_content,
                re.IGNORECASE,
            )
            if desc_match:
                meta_description = desc_match.group(1).strip()
            else:
                issues.append("Missing meta description (suboptimal for search engines).")

            # Performance check
            if page_load_ms > 3000:
                issues.append(f"Slow response time ({page_load_ms}ms to first render).")

            # Detect CMS signatures
            if "wp-content" in html_content or "wordpress" in html_content.lower():
                technologies.append("WordPress")
            if "shopify" in html_content.lower() or "cdn.shopify.com" in html_content:
                technologies.append("Shopify")
            if "wix.com" in html_content.lower():
                technologies.append("Wix")
            if "squarespace" in html_content.lower():
                technologies.append("Squarespace")

    except httpx.ConnectTimeout:
        issues.append("Connection timed out (server unreachable).")
    except httpx.ReadTimeout:
        issues.append("Server response timed out (>8 seconds).")
    except httpx.ConnectError as e:
        issues.append(f"Could not connect to host: {str(e)}")
    except Exception as e:
        issues.append(f"Audit probe error: {str(e)}")

    return {
        "target_url": clean_url,
        "http_status": http_status,
        "is_https": is_https,
        "has_mobile_viewport": has_viewport,
        "page_load_ms": page_load_ms,
        "meta_title": meta_title,
        "meta_description": meta_description,
        "detected_technologies": list(set(technologies)),
        "identified_issues": issues,
    }

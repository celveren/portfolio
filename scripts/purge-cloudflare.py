#!/usr/bin/env python3
"""Purge only celveren.dev after activation; never roll back the VPS."""

import json
import os
import re
import sys
import time
import urllib.error
import urllib.request


def purge():
    token = os.environ.get("CLOUDFLARE_API_TOKEN", "")
    zone = os.environ.get("CLOUDFLARE_ZONE_ID", "")
    if not token or not re.fullmatch(r"[a-fA-F0-9]{32}", zone):
        raise RuntimeError("Configure CLOUDFLARE_API_TOKEN and a valid CLOUDFLARE_ZONE_ID in production.")
    request = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/zones/{zone}/purge_cache",
        data=json.dumps({"hosts": ["celveren.dev"]}).encode(),
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        method="POST",
    )
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=20) as response:
                result = json.load(response)
            if not isinstance(result, dict) or result.get("success") is not True:
                raise RuntimeError("Cloudflare did not confirm the cache purge.")
            print("Cloudflare accepted the cache purge for celveren.dev.")
            return
        except urllib.error.HTTPError as error:
            # Never print credentials or arbitrary API response bodies.
            retryable = error.code == 429 or 500 <= error.code <= 599
            if not retryable or attempt == 2:
                raise RuntimeError(f"Cloudflare cache purge returned HTTP {error.code}.") from None
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == 2:
                raise RuntimeError("Cloudflare cache purge failed after three network attempts.") from None
        except (ValueError, OSError):
            raise RuntimeError("Cloudflare returned an unreadable cache purge response.") from None
        # Bounded retries fit within the step timeout; purges are safe to repeat.
        time.sleep(5 * (attempt + 1))


if __name__ == "__main__":
    try:
        purge()
    except RuntimeError as error:
        print(f"::warning title=Cloudflare cache refresh failed::{error}")
        sys.exit(1)

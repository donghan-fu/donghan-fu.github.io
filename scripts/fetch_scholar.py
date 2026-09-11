#!/usr/bin/env python3
"""Fetch Google Scholar statistics for a given author and write JSON.

Runs in GitHub Actions on a daily schedule (see
.github/workflows/update-scholar.yml). Uses the `scholarly` package.

Output: assets/data/scholar-stats.json with total citations, h-index,
i10-index, and per-publication citation counts.

Google Scholar sometimes throttles requests. If SCRAPER_API_KEY or a
similar env variable is set, `scholarly` can be configured to route
through a proxy — see comments below.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

from scholarly import ProxyGenerator, scholarly

SCHOLAR_USER_ID = os.environ.get("SCHOLAR_USER_ID", "MIEcV3oAAAAJ")
OUTPUT_PATH = Path(
    os.environ.get("SCHOLAR_OUTPUT", "assets/data/scholar-stats.json")
)


def configure_proxy() -> None:
    """Optionally route through a scraper proxy to avoid rate limits."""
    api_key = os.environ.get("SCRAPER_API_KEY")
    if not api_key:
        return
    pg = ProxyGenerator()
    ok = pg.ScraperAPI(api_key)
    if ok:
        scholarly.use_proxy(pg)
        print("Using ScraperAPI proxy for Scholar requests")
    else:
        print("ScraperAPI proxy failed to initialize; continuing without proxy",
              file=sys.stderr)


def fetch_author(user_id: str) -> dict:
    author = scholarly.search_author_id(user_id)
    filled = scholarly.fill(
        author,
        sections=["basics", "indices", "counts", "publications"],
    )
    publications = []
    for pub in filled.get("publications", []):
        try:
            bib = pub.get("bib", {})
            publications.append(
                {
                    "title": bib.get("title", ""),
                    "year": bib.get("pub_year") or bib.get("year"),
                    "author": bib.get("author", ""),
                    "venue": bib.get("citation", ""),
                    "citedby": pub.get("num_citations", 0),
                    "url": pub.get("pub_url")
                    or pub.get("eprint_url")
                    or pub.get("author_pub_id"),
                }
            )
        except Exception as exc:  # noqa: BLE001
            print(f"Skipping publication due to error: {exc}", file=sys.stderr)

    return {
        "user_id": user_id,
        "name": filled.get("name"),
        "affiliation": filled.get("affiliation"),
        "citedby": filled.get("citedby", 0),
        "citedby_5y": filled.get("citedby5y", 0),
        "hindex": filled.get("hindex", 0),
        "hindex_5y": filled.get("hindex5y", 0),
        "i10index": filled.get("i10index", 0),
        "i10index_5y": filled.get("i10index5y", 0),
        "publications": publications,
        "updated": datetime.now(timezone.utc).isoformat(),
    }


def write_output(data: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {path}")


def main() -> int:
    configure_proxy()
    try:
        data = fetch_author(SCHOLAR_USER_ID)
    except Exception as exc:  # noqa: BLE001
        print(f"Failed to fetch Scholar data: {exc}", file=sys.stderr)
        return 1
    write_output(data, OUTPUT_PATH)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

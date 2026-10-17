#!/usr/bin/env python3
"""Announcement caption/optimized poster URL; never reads private originals."""
import argparse
from pathlib import Path
from urllib.parse import urlsplit
import json
from persiantools import digits
from persiantools.jdatetime import JalaliDate, WEEKDAY_NAMES_FA, MONTH_NAMES_FA
from itertools import zip_longest
from content import ROOT, frontmatter

def format_time(date, hour):
    date = JalaliDate.fromisoformat(str(date))
    return digits.en_to_fa(f"{WEEKDAY_NAMES_FA[date.weekday()]} {date.day} {MONTH_NAMES_FA[date.month]} {date.year} - ساعت {hour}")

def format_presentations(speakers, topics):
    return "\n\n".join(f"- ‏{topic or ''}\n  ‏ارائه‌دهنده: {speaker}" if speaker else f"- ‏{topic}" for topic, speaker in zip_longest(topics, speakers))

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--event", required=True)
    parser.add_argument("--poster-url", action="store_true")
    parser.add_argument("--media-base", default="https://birlug.github.io")
    args = parser.parse_args()
    import re
    if not re.fullmatch(r"[a-zA-Z0-9_-]+", args.event):
        parser.error("Invalid event slug")
    meta = frontmatter(ROOT / "content/events" / args.event / "info.md")
    if args.poster_url:
        base = urlsplit(args.media_base)
        if base.scheme != "https" or not base.netloc or base.username or base.query or base.fragment:
            parser.error("Media base must be an HTTPS URL")
        catalog = json.loads((ROOT / "data/media.json").read_text())
        posters = catalog["events"].get(args.event, {}).get("posters", [])
        if posters:
            print(args.media_base.rstrip("/") + "/" + posters[0]["variants"][-1]["jpg"])
        return
    presentations = format_presentations(meta.get("speakers", []), meta.get("topics", []))
    # Preserve custom historic routes such as /sfd-1404/.
    route = meta.get("url", f"/events/{args.event}/info/")
    links = [meta["registerLink"]] if meta.get("registerLink") else []
    links.append("https://birlug.github.io" + route)
    print(f"{meta['title']} [لاگ بیرجند](https://t.me/birlug)\n\n{presentations}\n\n📅 {format_time(meta['eventDate'], meta['startTime'])}\n📍{meta.get('address', '')}\n\nاطلاعات بیشتر:\n\n" + "\n".join("- " + link for link in links))

if __name__ == "__main__":
    main()

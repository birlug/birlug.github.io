#!/usr/bin/env python3
"""Fail on broken local HTML references, unsafe media, or oversized first-party assets."""
import argparse
from html.parser import HTMLParser
import json
import os
import xml.etree.ElementTree as ET
from pathlib import Path
from urllib.parse import urljoin, urlsplit, unquote

class HTML(HTMLParser):
    def __init__(self):
        super().__init__()
        self.references = []
        self.ids = set()
        self.images = []
        self.icons = []
        self.root = None
        self.canonical = None
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.root = attrs
        if tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href")
        if attrs.get("id"):
            self.ids.add(attrs["id"])
        for key in ("href", "src", "data-index"):
            if attrs.get(key):
                self.references.append(attrs[key])
        if attrs.get("srcset"):
            self.references.extend(item.strip().split()[0] for item in attrs["srcset"].split(",") if item.strip())
        if tag == "img":
            self.images.append(attrs)
        if tag == "svg" and "icon" in attrs.get("class", "").split():
            self.icons.append(attrs)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("public", type=Path)
    parser.add_argument("--base-url", help="Deployment root; defaults to homepage canonical URL")
    args = parser.parse_args()
    root = args.public.resolve()
    errors = []
    pages = {}
    svg_ids = {}
    for file in root.rglob("*.html"):
        html = HTML()
        html.feed(file.read_text())
        pages[file] = html
    home = pages.get(root / "index.html")
    site = urlsplit(args.base_url or (home.canonical if home else None) or "http://localhost/")
    if site.scheme not in ("http", "https") or not site.netloc or site.query or site.fragment:
        parser.error("Base URL must be an HTTP(S) site root without query or fragment")
    prefix = site.path.rstrip("/") + "/"
    if home and home.canonical and home.canonical.rstrip("/") != site.geturl().rstrip("/"):
        parser.error("Homepage canonical URL does not match deployment root")
    media = urlsplit(os.environ.get("HUGO_PARAMS_MEDIABASEURL", ""))
    for file, html in pages.items():
        relative = file.relative_to(root).as_posix()
        # Historical standalone games/pages are deliberately byte-preserved.
        if relative in ("nowruz.html", "hackathon/index.html"):
            continue
        if not html.root or html.root.get("dir") != "rtl" or html.root.get("lang") != "fa":
            errors.append(f"{relative}: missing Persian RTL root")
        base = prefix + relative
        for reference in html.references:
            url = urlsplit(urljoin(base, reference))
            if url.scheme not in ("", "http", "https") or (url.netloc and url.netloc != site.netloc):
                continue
            # Same-origin media can belong to a separate Pages deployment.
            if (media.netloc and (url.scheme or site.scheme, url.netloc or site.netloc) == (media.scheme, media.netloc)
                    and url.path.startswith(media.path.rstrip("/") + "/media/")):
                continue
            if not url.path.startswith(prefix):
                errors.append(f"{relative}: reference outside deployment root: {reference}")
                continue
            path = root / unquote(url.path[len(prefix):])
            if path.is_dir():
                path /= "index.html"
            if not path.is_file():
                errors.append(f"{relative}: missing {reference}")
            elif url.fragment and path in pages and unquote(url.fragment) not in pages[path].ids:
                errors.append(f"{relative}: missing anchor {reference}")
            elif url.fragment and path.suffix == ".svg":
                if path not in svg_ids:
                    svg_ids[path] = {element.get("id") for element in ET.parse(path).iter() if element.get("id")}
                if unquote(url.fragment) not in svg_ids[path]:
                    errors.append(f"{relative}: missing SVG symbol {reference}")
        for icon in html.icons:
            if icon.get("aria-hidden") != "true" or icon.get("focusable") != "false" or not icon.get("width") or not icon.get("height"):
                errors.append(f"{relative}: decorative icon missing accessibility/dimension attributes")
        for image in html.images:
            if "/media/" in image.get("src", ""):
                if not all(image.get(key) for key in ("alt", "width", "height", "loading", "decoding", "srcset", "sizes")):
                    errors.append(f"{relative}: media missing accessibility/performance attributes")
    for name, budget in [("css", 30 * 1024), ("js", 15 * 1024)]:
        import gzip
        for file in (root / name).glob("*"):
            if len(gzip.compress(file.read_bytes())) > budget:
                errors.append(f"Asset exceeds compressed budget: {file.name}")
    records = json.loads((root / "search-index.json").read_text())
    if not records or not all(record.get("title") and record.get("url") for record in records):
        errors.append("Empty/invalid search index")
    calendar = (root / "calendar.ics").read_bytes()
    expected = len(json.loads((Path(__file__).resolve().parents[1] / "data/events.json").read_text()))
    if calendar.count(b"BEGIN:VEVENT") != expected:
        errors.append("Calendar missing events")
    for file in root.rglob("*.ics"):
        payload = file.read_bytes()
        if b"DTEND:" in payload or b"DURATION:" in payload:
            errors.append(f"{file.relative_to(root)}: calendar must export start time only")
    if errors:
        raise SystemExit("\n".join(sorted(set(errors))))
    print(f"PASS: {len(pages)} HTML pages, local links, media attributes, asset budgets, calendar/search")

if __name__ == "__main__":
    main()

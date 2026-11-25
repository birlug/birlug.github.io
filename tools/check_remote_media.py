#!/usr/bin/env python3
"""Explicit pre-cutover check. HEAD public image URLs; never mutates hosting."""
import argparse
from concurrent.futures import ThreadPoolExecutor
import json
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

parser = argparse.ArgumentParser()
parser.add_argument("base_url")
args = parser.parse_args()
url = urlsplit(args.base_url)
if url.scheme != "https" or not url.netloc or url.query or url.fragment or url.username:
    parser.error("Use public HTTPS media root without credentials/query/fragment")
catalog = json.loads((Path(__file__).resolve().parents[1] / "data/media.json").read_text())
paths = {variant[kind] for image in catalog["files"].values() for variant in image["variants"] for kind in ("jpg", "webp")}
def check(path):
    try:
        with urlopen(Request(args.base_url.rstrip("/") + "/" + path, method="HEAD"), timeout=20) as response:
            if response.status != 200 or not response.headers.get("Content-Type", "").startswith("image/"):
                return f"{path}: HTTP {response.status}, wrong/unknown image type"
    except Exception as error:
        return f"{path}: {error}"
errors = []
with ThreadPoolExecutor(max_workers=4) as pool:
    errors = [error for error in pool.map(check, sorted(paths)) if error]
if errors:
    raise SystemExit("\n".join(errors))
print(f"PASS: {len(paths)} remote image URLs; safe to configure media base after publication review")

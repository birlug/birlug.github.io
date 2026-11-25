#!/usr/bin/env python3
"""Validate existing front matter and derive calendar metadata (never publication dates)."""
import datetime as dt
import json
import re
from pathlib import Path
from zoneinfo import ZoneInfo
from persiantools.jdatetime import JalaliDate
from ruamel.yaml import YAML

ROOT = Path(__file__).resolve().parents[1]
YAML_READER = YAML(typ="safe", pure=True)
# Jalali YYYY-MM-DD is not a Gregorian YAML timestamp (e.g. 1404-06-31).
YAML_READER.constructor.add_constructor("tag:yaml.org,2002:timestamp", lambda reader, node: reader.construct_scalar(node))
TEHRAN = ZoneInfo("Asia/Tehran")

def frontmatter(path):
    text = path.read_text()
    match = re.match(r"\A---\n(.*?)\n---(?:\n|$)", text, re.S)
    if not match:
        raise ValueError(f"{path}: missing YAML front matter")
    return YAML_READER.load(match[1])

def is_published(meta, now):
    if meta.get("draft") is True:
        return False
    if not meta.get("date"):
        return True
    published = dt.datetime.fromisoformat(str(meta["date"]).replace("Z", "+00:00"))
    if published.tzinfo is None:
        published = published.replace(tzinfo=TEHRAN)
    return published <= now

def event_times(meta):
    if not meta.get("eventDate") or not meta.get("startTime"):
        return None
    date = JalaliDate.fromisoformat(str(meta["eventDate"])).to_gregorian()
    start = dt.datetime.combine(date, dt.time.fromisoformat(str(meta["startTime"])), TEHRAN)
    end = None
    if meta.get("endTime"):
        end = dt.datetime.combine(date, dt.time.fromisoformat(str(meta["endTime"])), TEHRAN)
        if end <= start:
            end += dt.timedelta(days=1)
    return start, end

def ics_escape(value):
    return str(value).replace("\\", "\\\\").replace("\n", "\\n").replace(",", "\\,").replace(";", "\\;").replace("\r", "")

def calendar(lines):
    # RFC 5545: fold at 75 UTF-8 octets without splitting Persian characters.
    output = []
    for line in lines:
        current = ""
        for char in line:
            if len((current + char).encode()) > 75:
                output.append(current)
                current = " "
            current += char
        output.append(current)
    return ("\r\n".join(output) + "\r\n").encode()

def build():
    events = {}
    entries = []
    header = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//BirLUG//Sessions//FA", "CALSCALE:GREGORIAN", "METHOD:PUBLISH"]
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    numbers = set()
    for path in sorted((ROOT / "content").rglob("*.md")):
        meta = frontmatter(path)
        if path.parent.parent.name != "events" or path.name != "info.md":
            continue
        if not is_published(meta, dt.datetime.now(dt.timezone.utc)):
            continue  # Draft/scheduled metadata must not leak through calendars.
        number = path.parent.name  # Stable URL identity; eventNumber can be a Persian label.
        if not re.fullmatch(r"[a-zA-Z0-9_-]+", number):
            raise ValueError(f"Unsafe event number: {number}")
        if number in numbers:
            raise ValueError(f"Duplicate event number: {number}")
        numbers.add(number)
        times = event_times(meta)
        if not times:
            raise ValueError(f"{path}: eventDate and startTime required")
        start, end = times
        utc = lambda time: time.astimezone(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        events[number] = {"start": start.isoformat(), "end": end.isoformat() if end else "",
                          "utc_start": utc(start), "utc_end": utc(end) if end else "",
                          "label": str(meta["eventDate"]), "time": str(meta["startTime"]),
                          "end_time": str(meta.get("endTime", ""))}
        entry = ["BEGIN:VEVENT", f"UID:event-{number}@birlug.github.io",
                 f"DTSTAMP:{stamp}", f"DTSTART:{utc(start)}"]
        # Calendar downloads intentionally specify the event start only.
        entry.extend(["SUMMARY:" + ics_escape(meta["title"]),
                      "LOCATION:" + ics_escape(meta.get("address", "")), "END:VEVENT"])
        entries.extend(entry)
        directory = ROOT / "static/events" / number
        directory.mkdir(parents=True, exist_ok=True)
        (directory / "calendar.ics").write_bytes(calendar(header + entry + ["END:VCALENDAR"]))
    for old in (ROOT / "static/events").glob("*/calendar.ics"):
        if old.parent.name not in events:
            old.unlink()  # Remove stale downloads when an event becomes draft/scheduled.
    (ROOT / "static/calendar.ics").write_bytes(calendar(header + entries + ["END:VCALENDAR"]))
    target = ROOT / "data/events.json"
    target.parent.mkdir(exist_ok=True)
    target.write_text(json.dumps(events, ensure_ascii=False, indent=2) + "\n")
    print(f"Validated content; derived {len(events)} event dates")

if __name__ == "__main__":
    build()

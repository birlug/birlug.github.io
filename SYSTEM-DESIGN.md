# LUG Website — System Design

**Scope:** the public website of a Linux users group. It has 7 pages:
- Sessions (the entry page)
- Session detail + gallery
- Challenges
- Blog
- Speakers
- Topics
- Sponsors

**Status:** static redesign implemented locally (2026-10-11); backend/VPS sections remain future proposals, NOT deployed features. Implementation decisions and verification in §14 supersede earlier alternatives. Bracketed organisational facts still need approval.

---

## 1. Goals and constraints

**Goals**
- Publishing a session, post or challenge should be a pull request, not a CMS login.
- Visitors can register for a session, submit challenge answers, and subscribe to the newsletter.
- The site is fast on slow connections and works without JavaScript for everything except forms.
- Persian-first: RTL, Jalali dates, Persian search.
- Everything is free software and self-hostable, as you'd expect from a LUG.

**Constraints**
- It's run by volunteers, so operations must be near-zero: one small VPS, no Kubernetes.
- Traffic is low (hundreds to low thousands of visits a month) with spikes on session announcements.
- Personal data is minimal: name, email, and optionally a phone number for registration.

**Non-goals (v1):** user accounts and profiles, comments, live streaming, payments on-site (link out to a donation page instead).

---

## 2. Architecture overview

```
                 ┌──────────────────────────────┐
  Git repo ─────▶│  CI (build static site)      │──▶ static files (HTML/CSS/img)
 (content +      └──────────────────────────────┘          │
  code)                                                     ▼
                                                   ┌─────────────────┐
  Browser ───────────── HTTPS ───────────────────▶ │ Caddy / Nginx   │
                                                   │  • serves /     │
                                                   │  • proxies /api │
                                                   └───────┬─────────┘
                                                           │
                                                   ┌───────▼─────────┐     ┌──────────────┐
                                                   │ API service     │────▶│ PostgreSQL   │
                                                   │ (forms only)    │     └──────────────┘
                                                   └───────┬─────────┘
                                                           │ SMTP
                                                           ▼
                                                     Email (confirmations, newsletter)
```

There are two halves:
1. **A static site** built from Markdown in git. This covers about 95% of the site: every page and every gallery.
2. **A tiny API** for the dynamic parts: registrations, challenge submissions and the leaderboard, newsletter sign-up, and the "Propose a talk" form.

If the API is down, the site still reads perfectly; only the forms fail.

---

## 3. Technology choices

| Layer | Recommendation | Why | Alternatives |
|---|---|---|---|
| Static site generator | **Astro** or **Hugo** | Markdown collections, built-in image pipeline, zero-JS by default. Hugo is a single binary. | Eleventy, Zola |
| Content | Markdown + YAML front-matter in the repo | Review via PR, history for free | Decap CMS on top of git for non-technical editors |
| API | **Go** (net/http + sqlc) or **Python FastAPI** | Small, one binary or one container | Node + Fastify |
| Database | **PostgreSQL** | Constraints, unique indexes for registrations, simple backups | SQLite (fine at this scale; simpler ops) |
| Web server / TLS | **Caddy** | Automatic HTTPS, static files and a reverse proxy in ~10 lines | Nginx + certbot |
| Email | SMTP relay plus **listmonk** for the newsletter | Self-hosted, FOSS | Any transactional SMTP |
| Search | **Pagefind** (static index built at build time) | No server and handles Persian text | Client-side lunr |
| Analytics | **Plausible** / **Umami** self-hosted, or none | Privacy-respecting | GoAccess on logs |
| CI/CD | Forgejo/Gitea Actions or GitHub Actions | Build on push to `main`, rsync to the server | — |

> [Resolved] Keep Hugo, upgraded to 0.167.0. Site owns local templates and CSS, no frontend framework or theme runtime. Node is used only for a small regression check in CI.

---

## 4. Content model (git, Markdown)

```
content/
  sessions/
    024-intro-to-systemd/
      index.md          # front-matter + description
      gallery/          # original photos (processed at build)
      slides.pdf
  challenges/
    010-read-the-logs/
      index.md          # statement, rules (NO answer here)
      files/logs.tar.gz
  posts/
    2026-10-podman-report.md
  speakers/
    <slug>.md
  topics/
    <slug>.md
  sponsors/
    <slug>.md
```

**Session front-matter**
```yaml
number: 24
title: "مقدمه‌ای بر systemd"
slug: intro-to-systemd
date: 2026-10-23T17:00:00+03:30   # stored in ISO; rendered as Jalali
end: 2026-10-23T19:00:00+03:30
topic: kernel-os                   # → topics/kernel-os.md
level: beginner                    # beginner | intermediate | advanced
speakers: [speaker-slug]
venue:
  name: "[نام مکان]"
  address: "[آدرس]"
  map: "https://www.openstreetmap.org/…"
capacity: 40
registration: open                 # open | closed | none
agenda:
  - { time: "17:00", item: "خوش‌آمد و آشنایی" }
resources:
  slides: slides.pdf
  video: "https://…"
  repo: "https://…"
gallery_credit: "[نام عکاس]"
```

**Challenge front-matter**
```yaml
number: 10
title: "لاگ‌ها را بخوان، مقصر را پیدا کن"
level: intermediate
topic: networking
opens: 2026-10-01T00:00:00+03:30
closes: 2026-10-31T23:59:00+03:30
points: 100
solution_post: posts/2026-11-challenge-10-solution.md   # published after close
```
The **answer is never stored in git.** Only its hash is stored in the database (see §6.2).

**Derived pages:** topic pages and speaker pages are generated by collecting sessions, posts and challenges that reference their slug. Nothing is hand-maintained twice.

---

## 5. Pages and routes

| Route | Source | Notes |
|---|---|---|
| `/` | sessions collection | Next upcoming session (date ≥ now) and the archive, newest first |
| `/sessions/024-intro-to-systemd/` | session | Includes the gallery |
| `/challenges/` | challenges | The active challenge is the one with `opens ≤ now < closes` |
| `/challenges/010-…/` | challenge | Answer form posts to the API |
| `/blog/`, `/blog/<slug>/` | posts | Category pages at `/blog/category/<cat>/` |
| `/topics/`, `/topics/<slug>/` | topics + backlinks | |
| `/speakers/`, `/speakers/<slug>/` | speakers + backlinks | Call for talks on the index |
| `/sponsors/` | sponsors | |
| `/feed.xml` | posts + sessions | RSS / Atom |
| `/calendar.ics` | sessions | Subscribable calendar feed |
| `/sessions/<n>.ics` | session | "Add to calendar" button |
| `/code-of-conduct/`, `/about/` | pages | Linked from the sidebar footer |

**"Next session" freshness:** the static site is rebuilt by a nightly CI cron, plus on every push, so "next" stays correct without runtime logic. The seats-left count is fetched from the API with progressive enhancement; if JavaScript is off, the page just shows the capacity.

---

## 6. Dynamic features (API)

Base path: `/api/v1`. JSON in and out, CSRF-safe via same-origin plus a SameSite cookie or a form token. Rate limited per IP.

### 6.1 Session registration
```
POST /api/v1/sessions/{number}/registrations
{ "name": "…", "email": "…", "phone": "…?" , "consent_newsletter": false }
→ 201 { "status": "pending_confirmation" }

GET  /api/v1/sessions/{number}/seats   → { "capacity": 40, "taken": 31 }
GET  /api/v1/registrations/confirm?token=…   → 302 to /sessions/…?confirmed=1
GET  /api/v1/registrations/cancel?token=…    → frees the seat
```
**Flow**
1. A registration is created as `pending`.
2. An email with a confirm link is sent; the token is random and expires in 48 hours.
3. Clicking it moves the registration to `confirmed`.
4. When the session is full, new registrations go on a `waitlist` and are promoted automatically when someone cancels.

**Concurrency:** the seat check and insert happen in one transaction (`SELECT … FOR UPDATE` on the session row, or a count against capacity under a serializable transaction).

**Duplicates:** there's a unique index on `(session_id, lower(email))`.

**Organiser export:** a CLI command or protected endpoint produces a CSV of confirmed attendees for check-in.

### 6.2 Challenge submissions and leaderboard
```
POST /api/v1/challenges/{number}/submissions
{ "handle": "…", "email": "…", "answer": "LUG{…}", "writeup_url": "…?" }
→ 200 { "correct": true|false }      // or "received" if manual review

GET /api/v1/leaderboard?range=challenge:{n}|season:{id}
```
- **Answers:** the server stores `answer_hash = argon2id(normalize(answer), per-challenge salt)` and compares in constant time. The plaintext answer never reaches git, the CI logs or the database.
- **Limits:** at most 10 attempts per hour per email and IP. Every attempt is stored so the organisers can review them.
- **Scoring:** points are added on the first correct submission. A tie is broken by the earliest correct time.
- **When the challenge closes:** the endpoint returns 409. The solution post goes live with the next build, because `closes` has passed.
- **Write-ups:** a write-up link is optional, and organisers can mark one as "featured" for the blog.

### 6.3 Newsletter
`POST /api/v1/newsletter` creates a double-opt-in subscriber in **listmonk** through its API, so the main API stores nothing itself. Every email carries a one-click unsubscribe link.

### 6.4 Call for talks
```
POST /api/v1/talk-proposals
{ "name", "email", "title", "abstract", "topic", "length": "lightning|full" }
```
The proposal is saved and posted to the organisers' chat (Telegram or Matrix webhook) and email. Triage happens outside the site.

---

## 7. Data model (PostgreSQL)

```sql
create table sessions (            -- mirror of content, synced at build/deploy
  id          serial primary key,
  number      int unique not null,
  slug        text unique not null,
  starts_at   timestamptz not null,
  capacity    int not null default 0,
  registration text not null default 'open'   -- open|closed|none
);

create table registrations (
  id          bigserial primary key,
  session_id  int not null references sessions(id) on delete cascade,
  name        text not null,
  email       citext not null,
  phone       text,
  status      text not null default 'pending',  -- pending|confirmed|waitlist|cancelled|attended
  token_hash  bytea not null,
  created_at  timestamptz not null default now(),
  confirmed_at timestamptz,
  unique (session_id, email)
);

create table challenges (
  id          serial primary key,
  number      int unique not null,
  opens_at    timestamptz not null,
  closes_at   timestamptz not null,
  points      int not null default 100,
  answer_hash text not null                    -- argon2id encoded string
);

create table participants (
  id          bigserial primary key,
  handle      text unique not null,
  email       citext unique not null
);

create table submissions (
  id            bigserial primary key,
  challenge_id  int not null references challenges(id),
  participant_id bigint not null references participants(id),
  correct       boolean not null,
  writeup_url   text,
  ip_hash       bytea,                          -- for rate limiting, not tracking
  created_at    timestamptz not null default now()
);
create index on submissions (challenge_id, participant_id, created_at);

create view leaderboard as
select p.handle,
       c.id as challenge_id,
       min(s.created_at) filter (where s.correct) as solved_at,
       max(c.points)     filter (where s.correct) as points
from submissions s
join participants p on p.id = s.participant_id
join challenges   c on c.id = s.challenge_id
group by p.handle, c.id;

create table talk_proposals (
  id bigserial primary key, name text, email citext, title text,
  abstract text, topic text, length text, created_at timestamptz default now()
);
```

**Content-to-database sync:** a deploy step reads session and challenge front-matter and upserts `sessions` and `challenges` (number, dates, capacity, points). Answer hashes are set separately by an organiser using `lugctl challenge set-answer 10`, so they never come from git.

---

## 8. Media and the gallery pipeline

- Organisers drop original photos into `sessions/<n>/gallery/`, or into object storage if the repo grows too big. Use Git LFS or a separate `media` bucket once it passes a few hundred MB.
- At build time:
  1. Strip EXIF location data.
  2. Generate AVIF and WebP at 480, 960 and 1600 px widths.
  3. Generate a blurred placeholder.
  4. Write `width`/`height` attributes so the layout doesn't shift.
- **Featured photo:** front-matter `featured: photo-03.jpg` decides which photo is the large 2×2 tile.
- **Lightbox:** a small progressive-enhancement script. Without JavaScript, each tile is a link to the full image.
- **Consent:** follow a "no-photo" lanyard or sticker policy at events, and offer a takedown contact on the gallery page.

---

## 9. Internationalisation and RTL

- `lang="fa" dir="rtl"` site-wide. Code, handles, emails and flag inputs are marked `dir="ltr"`.
- **Dates:** store ISO/UTC and render as **Jalali** at build time (Intl `fa-IR-u-ca-persian` or a Hugo/Go Jalali library). The `.ics` feeds use standard UTC.
- **Digits:** Persian digits in prose, Latin digits in code and mono.
- **Search:** Pagefind handles Persian well. Normalise Arabic and Persian letter variants (ي/ی, ك/ک) when building the index.
- **Optional English:** `/en/` can be added later via the generator's i18n; it's not in v1.

---

## 10. Security and privacy

| Concern | Mitigation |
|---|---|
| Spam on forms | Rate limits per IP and per email; a hidden honeypot field; optional self-hosted captcha (e.g. ALTCHA, proof-of-work) only if abused |
| Brute-forcing challenge answers | Attempt limits, argon2id hashes, constant-time compare, per-challenge salt |
| Personal data in registrations | Collect the minimum, delete registrations 90 days after the session ([decision]), keep emails encrypted at rest (disk-level) |
| Injection | Parameterised queries (sqlc/SQLAlchemy); the static site never renders form data |
| XSS | Content comes from trusted Markdown via PR; the API returns JSON only; strict CSP: `default-src 'self'; img-src 'self' data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com` (or self-host the fonts and drop both Google entries) |
| Transport | HTTPS only (Caddy), HSTS |
| Secrets | Environment file on the server, not in the repo; SMTP and listmonk keys are scoped |
| Admin access | No web admin in v1; organisers use `lugctl` over SSH |

**Privacy page:** state what is collected, why, and how long it's kept, plus a contact for deletion.

---

## 11. Deployment and operations

**Server:** one 1 vCPU / 1–2 GB VPS. It runs Caddy, the API container or binary, PostgreSQL, and listmonk (optional, can share Postgres).

```
/srv/lug/
  site/          # static build output (rsync target)
  api/           # binary + .env
  backups/
Caddyfile:
  lug.example {
    root * /srv/lug/site
    encode zstd gzip
    handle /api/* { reverse_proxy 127.0.0.1:8080 }
    file_server
  }
```

**CI pipeline** (on push to `main`, plus a nightly run):
1. Install the generator.
2. Lint the Markdown and validate front-matter against a JSON schema.
3. Build the site, the image derivatives and the Pagefind index.
4. Run link-check.
5. Rsync to `/srv/lug/site`.
6. Run `lugctl sync-content` to upsert sessions and challenges.

**Backups:** a nightly `pg_dump` to an off-site location, kept 14 days. Git is the backup for content. Media should be mirrored to a second location.

**Monitoring:**
- An uptime check on `/` and `/api/v1/health`.
- Caddy access logs, with GoAccess for traffic.
- An email alert if the API's error rate climbs.

**Cost:** one small VPS and a domain. No paid services are required.

---

## 12. Roadmap

| Phase | Scope |
|---|---|
| **v0 — static** | All 7 pages from Markdown, gallery pipeline, RSS + ICS, search, code of conduct and about pages. Registration through an external form link. |
| **v1 — forms** | API + Postgres: registration with confirmation and waitlist, newsletter (listmonk), talk proposals. |
| **v1.1 — challenges** | Submissions, hashed answers, leaderboard, solution posts published automatically on close. |
| **v2 — nice to have** | Check-in QR codes, attendance history per participant, English mirror, Decap CMS for non-git editors, Matrix/Telegram bot announcing new sessions. |

---

## 13. Open decisions

1. Hugo selected (0.167.0); no Astro migration.
2. PostgreSQL or SQLite. SQLite is enough below a few thousand registrations a year.
3. Whether a phone number is needed for registration at all.
4. Retention period for registration data.
5. Domain name, and where to host (in-country vs abroad) given latency and availability for members.
6. Who holds organiser SSH access, and the rotation and handover process (only if future API/VPS adopted).

---

## 14. Implemented static system — 2026-10-11

This section is current implementation; API/DB/VPS/listmonk sections above remain proposals.

### Selected architecture

- Hugo 0.167.0, repo-owned templates/CSS, GitHub Pages. Old theme remains untouched but is not used at runtime.
- Existing content model and public URLs preserved. No wholesale migration to sessions/posts collections.
- Homepage next-session selection uses generated ISO start time from Jalali eventDate + startTime in Asia/Tehran, not publication date.
- Python requirements updated to persiantools 6.2.0, pytz 2026.5, ruamel.yaml 0.19.1. Jalali YAML dates stay strings to avoid Gregorian parser errors.
- Per-event/aggregate ICS uses UTC DTSTART only (no DTEND/DURATION), stable event UID, CRLF/75-octet folding. Site end-time metadata stays unchanged; calendar clients can apply their own default duration. Draft/scheduled content excluded; stale per-event downloads removed.
- RSS combines sessions/blog. Topics/speakers derive from current taxonomies.
- Static search uses small JSON index and native JS, Persian/Arabic letter normalization. Index fetched only after query; no Pagefind/Node application dependency at current archive size.
- All normal reading/navigation works without JS. Search and lightbox are enhancements; historic challenge scripts may need JS/external services.

### Separate media repository

Media dataset transferred into existing `../birlug-media/` repository, preserving its main branch and origin git@github.com:birlug/media.git. Old assetsBirlug Git metadata left untouched. No push/deployment performed.
139 original JPG/PNG event files moved after byte-hash verification.
Private originals and source-font backups ignored by Git; historic website Git history still contains old media.

ImageMagick pipeline auto-orients, strips EXIF, generates JPEG/WebP at 480/960/1600 (no upscale, unique srcset descriptors), exports dimensions/catalog.
Content-hashed immutable derivatives kept for old references. Alt/credit/featured overrides supported.
Published tree never includes originals. Verification checks existence, dimensions and EXIF removal.

Website `data/media.json` contains relative derivative paths; one HTTPS mediaBaseURL switches hosts.
Hugo static mounts read ../birlug-media/public/media directly. The verified duplicate ~92 MiB website static/media tree was removed and ignored; original gallery paths were removed from Git index only. Historic Git blobs remain until separately approved history cleanup.
Unchanged derivative pairs reuse cache; --force is required after encoder/preset changes. --site syncs only small catalog, not image files.
External hosting is optional: verify actual HTTPS media root with tools/check_remote_media.py before setting MEDIA_BASE_URL. Never configure a placeholder host.
Challenge image/VM binaries and presentation files deliberately remain unchanged.

### CI / operational changes

- Current GitHub Actions, Hugo pinned, Python 3.13, Node 24 for regression check only.
- Push/master, manual and nightly Pages build; PR runs validation without deploying. Source is checked out under site/, birlug/media under sibling birlug-media/; the latter's prepared main branch must be published before CI can fetch it. Optional MEDIA_READ_TOKEN enables private checkout.
- Build validates content, dates/calendars/search and local links/anchors; compressed asset budgets.
- Announcement flow accepts explicit event slug, fetches optimized public poster URL, preserves custom event URL. Dry-run tested; no messages sent.
- UI icons use pinned @iconify-json/lucide through build-time Node SVG subset generation; npm ci --ignore-scripts + npm run icons required before Hugo. One fingerprinted local sprite, no Iconify network/runtime dependency; visible labels and decorative aria-hidden SVGs. Lucide ISC/Feather MIT notices retained.
- Self-hosted fonts; SIL OFL licenses retained. Source Code Pro subset renamed BirLUG Mono to respect reserved name.
- Existing Databuddy analytics retained/configurable. No blanket CSP added because preserved historic challenge scripts require a separate audit. Website prose must come from original source content: added About/privacy pages, intros, promotional text, descriptive alts and duplicate CTAs removed; UI/accessibility labels retained.

### Verification / remaining work

- Hugo build with panicOnWarning, date/publication/calendar and Persian search checks pass.
- All baseline HTML routes retained. Existing content, challenge assets and presentation files byte-identical; images index moved without URL change.
- Browser: 9 pages × 4 viewport widths, RTL/overflow/nav, no-JS reading/direct photos, lightbox keyboard/Escape/backdrop/focus/error, deferred full images, search results/no-results. Compact rounded popup has no close button; portrait/wide images additionally tested across five desktop/mobile/landscape viewports for bounds, aspect ratio, no scroll and no accidental inside-drag dismissal. Native keyboard supports right-arrow next / left-arrow previous, Home/End/Enter/Space/Tab/Escape with focus recovery; image-only touch swipe has distance/direction/cancel/multitouch guards and button alternatives. Original-image icon opens current public gallery URL in a new tab with noopener/noreferrer; private originals remain private. Real Chromium CDP touch checks cover left/right, bounds, ignored gestures, cancellation and stationary two-finger input (not a physical-device/pinch-zoom certification).
- Media pipeline/EXIF checked locally. Remote media availability cannot be verified until host exists.
- Local Lighthouse is lab evidence, not field Core Web Vitals. Last homepage result (analytics blocked, Python server): 97 performance, 100 accessibility/best-practices/SEO, LCP 2.6s, CLS 0, TBT 0ms.
- No API/database/forms/newsletter/leaderboard/payments built. Registration remains external.
- Code-of-conduct text and new publication permissions require organiser approval; no invented policy/sponsors.
- Before adopting backend proposal: review verified participant identity, scoring races, pending-seat expiry, token storage/retention, safe POST confirmation/cancellation (not mutating GET), CSRF, consent and backup restore. Proposed schema is not production-ready.
- No commits, pushes, deployment, announcements or history rewrite performed.

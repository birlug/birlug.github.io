# BirLUG

Hugo site. Existing Markdown remains source of published text; templates provide layout and UI labels only.
No Astro migration. Current design/CSS remains in this repository.

## Run

Hugo 0.167.0 is pinned in CI; Python 3.13+ prepares calendars. Node 24/npm prepares local Iconify SVGs (build time only).

```sh
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r tools/requirements.txt
npm ci --ignore-scripts
npm run icons
python tools/content.py
hugo server
```

CI reads the actual site URL with actions/configure-pages and passes it to Hugo, supporting both custom-domain roots and fork project paths such as https://saeed0920.github.io/birlug.github.io/. Hugo canonifies generated HTML links; published Markdown stays unchanged. The site checker infers this root from the homepage canonical URL, or accepts --base-url explicitly.
Historical embedded JavaScript/CSS (for example the challenge 11 VM) retains its original root-only paths; this does not claim full VM compatibility on fork subpaths.

The sibling media checkout is required before building:

```text
project/
  birlug.github.io/     content, templates, CSS, scripts, small media catalog
  birlug-media/         origin: git@github.com:birlug/media.git
    originals/         private originals/font backups, ignored by Git
    public/media/      optimized public photos/posters
    public/catalog.json
    tools/
```

For a fresh checkout, clone https://github.com/birlug/media.git into ../birlug-media.
That remote must first receive the prepared public files; no push/deploy was performed here.
Private repositories require suitable read access.

## Content/layout

- Existing event/blog/challenge Markdown and public URLs preserved.
- Events: content/events/<slug>/info.md; standalone gallery metadata alongside it.
- Blog/challenges: existing content/~blog/ and content/~challenge/ paths retained.
- Stable event identity is directory slug, not eventNumber; custom URL overrides preserved.
- Session43 links directly to https://birlug.ir/sfd-1404/ through externalURL metadata; local /sfd-1404/ remains a no-JS redirect/fallback. Homepage/archive/search/RSS/related-event links use the same destination, without importing dedicated-site content.
- Empty images index moved to content/images/_index.md for native Hugo pagination.
- Original paragraphs, instructions, captions and challenge code are not rewritten.
- Assistant-added About/privacy pages, introductions, promotional paragraphs, photo descriptions and duplicate CTAs removed at owner's request.
- Search/form/error labels and generic image alt labels remain for navigation/accessibility.
- Technical design/system documentation remains; it is not published prose.

Date preparation preserves Jalali strings, uses Asia/Tehran event start times (not publication date), excludes draft/scheduled content and removes stale calendar downloads. Calendar exports include DTSTART only, never DTEND/DURATION; clients may choose their own default duration. Original endTime fields/site metadata are unchanged.
Calendar/registration action buttons show only for upcoming event start times. Past event pages have no empty action wrapper.
Rerun tools/content.py after event edits. RSS, search and calendars remain static.
Historical darft:true typo is not silently converted into draft:true.

## Media ownership / Git cache

139 original event photos/posters were transferred, hash-verified, from the earlier local assetsBirlug directory into ../birlug-media/.
Its existing .git and remote were preserved. The previous directory retains its old Git metadata/cache only, not the photo dataset.

Hugo mounts ../birlug-media/public/media at /media/; no duplicate photo tree is needed in this website.
Images are not downloaded/re-encoded during normal website builds.
CI checks out source as site/ and birlug/media as sibling birlug-media/, then syncs the small catalog.
MEDIA_READ_TOKEN is optional for private-media checkout; never store credentials in content.

```sh
python3 ../birlug-media/tools/build.py --site .
python3 ../birlug-media/tools/check.py
```

--site syncs only data/media.json. Unchanged encoded widths are reused; use --force after changing encoder/preset.
Photo outputs: EXIF stripped, auto-orient, WebP/JPEG, responsive widths 480/960/1600, no upscale, immutable hashed filenames.
Originals remain private; public Git history may still contain old originals from before this split.

Website Git index no longer tracks original gallery paths; assets/events/ and static/media/ are ignored.
Verified duplicate static/media files were removed from working tree.
This is Git-index cleanup, NOT Git-history rewriting. Historic blobs still consume history storage; purging them needs separate coordinated approval.
Puzzle images/binaries, charts, downloads, icons and fonts remain in the site; never recompress steganographic/pixel-based challenge files.

Optional external serving: set MEDIA_BASE_URL to verified HTTPS media site root, above media/.
Without it, local mount serves identical relative links. For this remote, expected Pages root would be https://birlug.github.io/media/ only AFTER publication is verified.
Check actual deployment first:

```sh
python3 tools/check_remote_media.py https://your-live-media-site-root.example
```

No placeholders are configured in production. Publishing media and configuring external serving remain explicit deployment steps.

The media repository already has a GitHub Pages Actions workflow. Push media first, select GitHub Actions in its Settings → Pages, and verify the actual deployed HTTPS URL. A custom domain such as media.birlug.ir is optional; setup instructions live in ../birlug-media/README.md.
Website public/ is ignored build output; media-repository public/ is deliberately tracked sanitized publication input. Current Hugo mounts also bundle media into website output. Setting MEDIA_BASE_URL changes image links, but does not remove that copy: switch the production mount only after standalone media hosting is verified.

## Build validation

```sh
npm run icons
python tools/content.py
hugo --gc --minify --panicOnWarning
python tools/check_site.py public
```

Optional test/browser/review helpers were removed during cleanup. Content validation and generated-site checks remain in CI.
The supplied `LUG Website.html` reference stays local/ignored; design decisions are recorded in DESIGN.md.

## Icons

Icon source: @iconify-json/lucide (pinned in package-lock.json), browsable at https://icones.js.org/collection/lucide.
tools/build-icons.mjs emits only selected symbols into generated assets/icons/ui.svg.
Hugo fingerprints one local SVG sprite; no Iconify CDN/API/runtime or icon font.
Licenses included in sprite metadata and static/licenses/lucide.txt.

Add a Lucide name to tools/build-icons.mjs, run npm run icons, then use:
`{{ partial "icon.html" "arrow-left" }}`
Keep navigation text visible; helper icons are decorative/non-focusable. Compact popup icon-only controls require accessible labels and 44px targets; new-tab action also has a tooltip.
RTL next/previous arrows are explicitly chosen, not globally mirrored.
Lightbox markup lives in layouts/partials/lightbox.html so client JS clones the same server-rendered icons. Compact rounded image popup has no close button/caption row. Escape/backdrop closes; Right-arrow next / left-arrow previous / Home / End navigate, native Enter/Space/Tab remain functional, focus returns. Touch/pen horizontal swipes navigate on photo only; short/vertical/cancelled/multitouch gestures do not. Small new-tab icon opens current largest public image (not private camera originals). Image aspect ratio fits desktop/mobile/landscape viewports without popup/background scrolling.

## Existing scripts

tools/notify.sh remains manual; --dry-run prints only:
```sh
EVENT=41 bash tools/notify.sh --dry-run
```
Actual test broadcasts still send real Telegram messages. Broadcasts, pushes, deployments and history rewrites require separate approval.

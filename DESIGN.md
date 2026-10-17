# LUG Website — Design System

> A dark, text-first reading room for a Linux users group: charcoal canvas, grey type, and one phosphor-green signal.

**Theme:** dark only · **Direction:** RTL (Persian, `lang="fa"`, `dir="rtl"`) · **Style lineage:** Zen-style vertical sidebar + a Supabase-inspired monochrome palette, applied as a classic, unboxed layout.

---

## 1. Principles

1. **Text first, no boxes.** Content sits directly on the canvas. Hierarchy comes from size, weight, color and whitespace — not from cards, panels or bordered containers.
2. **One color.** The page is ~99% grayscale. Green is rationed: the logo, the active nav item, small mono labels, and primary actions. One green focal point per region.
3. **Terminal-native details.** Mono path crumbs (`~/lug/sessions`), `#24` session numbers, `$` prompts in code — a quiet nod to the shell, never a costume.
4. **Calm weight.** Only 400 and 500. Emphasis comes from size or green, never bold.
5. **Readable Persian.** Generous line-height (≈2.0 for body), no letter-spacing on Persian script, mono reserved for Latin/code fragments.

---

## 2. Color tokens

| Token | Value | Role |
|---|---|---|
| `--color-canvas` | `#121212` | Page background. The only background. |
| `--color-surface` | `#242424` | Image/avatar/logo placeholders, subtle fills. Not for containers. |
| `--color-text` | `#FAFAFA` | Primary text, titles, links in content. |
| `--color-text-2` | `#B4B4B4` | Secondary text, body copy, inactive nav. |
| `--color-text-3` | `#898989` | Metadata, captions, dates, labels. |
| `--color-line` | `#2E2E2E` | Pill-filter outlines, hairlines (use sparingly). |
| `--color-line-strong` | `#393939` | Input borders, ghost-button borders. |
| `--color-accent` | `#3ECF8E` | Phosphor green — primary actions, active states, logo, mono labels. |
| `--color-accent-alt` | `#00C573` | Optional cooler green for inline links. |
| `--color-on-accent` | `#121212` | Text on green fills. |

**Contrast (on `#121212`):** `#FAFAFA` ≈ 18:1 · `#B4B4B4` ≈ 9.5:1 · `#898989` ≈ 5.6:1 · `#3ECF8E` ≈ 10:1. All pass WCAG AA for body text.

**Rule:** text on a green fill is always `#121212` — white on `#3ECF8E` is ≈ 1.9:1 and fails.

**Never:** a second hue, gradients, shadows, or green as a large background.

---

## 3. Typography

| Family | Use | Weights | Source |
|---|---|---|---|
| **Vazirmatn** | All UI and content (Persian + Latin) | 400, 500 | Self-hosted SIL OFL WOFF2 |
| **Source Code Pro** derived **BirLUG Mono** | Paths, session numbers, times, code | 400, 500 | Self-hosted SIL OFL Latin subset; renamed to respect Adobe reserved font name |

```html
<!-- Fonts loaded by local @font-face; no Google Fonts request. -->
<link rel="preload" href="/fonts/Vazirmatn.woff2" as="font" type="font/woff2" crossorigin>
```

### Type scale

| Role | Size | Weight | Line height | Color | Example |
|---|---|---|---|---|---|
| Page title (h1) | 36px | 500 | 1.4 | text | جلسات |
| Feature title | 30px | 500 | 1.5 | text | Next-session title, active challenge |
| Section (h2) | 22px | 500 | 1.5 | text | آرشیو جلسات |
| Post title | 22px | 500 | 1.7 | text | Blog list item |
| Item title | 17px | 400–500 | 1.8 | text | Session row |
| Body | 16px | 400 | 2.1 | text-2 | Paragraphs |
| Body small / nav | 15px | 400 | 2.0 | text-2 | Sidebar links, lists |
| UI / buttons | 14px | 500 | 1.5 | — | Pills, filters |
| Meta / caption | 13px | 400 | 1.8 | text-3 | Dates, presenter |
| Mono label | 13px | 400 | 1.5 | accent or text-3 | `#24`, `~/lug/blog` |

**Persian rules**
- No `letter-spacing` on Persian text: it breaks letter joining.
- Use the zero-width non-joiner (ZWNJ, U+200C) correctly: `جلسه‌ی`, `ارائه‌دهندگان`.
- Mark Latin/code islands with `dir="ltr"` (handles, paths, inputs for flags or emails).
- Persian digits in prose (`۲۴`) are fine. Use Latin digits inside mono/code (`17:00`, `#24`).

---

## 4. Spacing, radius, layout

**Base unit:** 8px. Scale: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48 · 56 · 64 · 72.

| Context | Value |
|---|---|
| Page padding | 48px top/bottom, 40px sides (16px on phones) |
| Sidebar ↔ content gap | 72px (48px when stacked) |
| Between sections | 56–64px |
| Heading → content | 12–20px |
| List rows | 10–12px vertical padding, no dividers |

**Radius vocabulary (only these):**
- `9999px` for buttons, filter pills and status dots
- `8px` for inputs and the image popup (`--radius-input`, `--radius-dialog`)
- `6px` for prepared photo images, gallery tiles and album previews (`--radius-media`)
- `50%` for avatars
- `0` remains valid for code and original puzzle imagery; never round/crop away clues

**Layout**

```
┌───────────────────────────────────────────────┐
│  [content column, max 760px] │ [sidebar 200–260px] │   ← RTL: sidebar on the right
└───────────────────────────────────────────────┘
```

- Root: `display:flex; flex-wrap:wrap; gap:48px 72px`.
- Sidebar: `flex: 1 1 200px; max-width: 260px`. It is not sticky and has no background or border.
- Content: `flex: 999 1 520px; min-width: 0; max-width: 760px` (860px when a gallery is present).
- **Stacked layout (<880px):** the sidebar stacks above the content and everything stays single-column.

---

## 5. Components

### 5.1 Sidebar
- **Wordmark:** `BirLUG` with Iconify `lucide:terminal`, self-hosted mono 20px/500, colored green. The Birjand subtitle sits below it at 13px in text-3.
- **Nav items:** 15px in text-2, `padding: 10px 16px 10px 0`, with hover changing the color to text.
- **Active item:** a 6px green dot plus 10px gap, text color, weight 500. The dot is the only indicator — no background.
- **Order:** جلسات · گالری · چالش‌ها · بلاگ · موضوعات · ارائه‌دهندگان · حمایت مالی
- **Footer:** a "جامعه" label above the Telegram · Matrix · GitHub · RSS links, then کد رفتاری · درباره‌ی ما. All at 13px in text-2.

### 5.2 Primary button (pill)
```css
background: var(--color-accent); color: #121212;
border-radius: 9999px; padding: 12px 22px;
font: 500 14px Vazirmatn; text-decoration: none;
```
Use one per region, for Register, Submit answer, Sponsor, or Propose a talk. Labels end with `←` (forward in RTL).

### 5.3 Ghost button (pill)
```css
background: transparent; color: #FAFAFA;
border: 1px solid #393939; border-radius: 9999px; padding: 11px 22px;
font: 400 14px Vazirmatn;
```
On hover the border becomes `#4D4D4D` and the background `rgba(255,255,255,.04)`.

### 5.4 Filter pills (topic / category / range)
- **Idle:** transparent background, a 1px `#2E2E2E` border, text-2, `8px 16px` padding, min-height 40px.
- **Selected:** a green fill with a green border, `#121212` text, weight 500.
- **Group:** `display:flex; flex-wrap:wrap; gap:8px` with `role="group"` and an `aria-label`.

### 5.5 Text input
```css
background: #121212; border: 1px solid #393939; border-radius: 8px;
height: 44–46px; padding: 0 12px; color: #FAFAFA;
```
- Focus: the border turns green, with no glow.
- Every input has a `<label>`, which may be visually hidden.
- Flag and email inputs use `dir="ltr"`.

### 5.6 Meta list (key–value)
Use a `<dl>` with `grid-template-columns: 110px 1fr; gap: 10–12px 16px`. Labels (`<dt>`) are text-3 and values (`<dd>`) are text. It's used for date, time, place, presenter and capacity.

### 5.7 Session row
A grid of `52px 1fr auto`:
- **First column:** the number in mono, text-3.
- **Second column:** the title link (17px, no underline) with "topic · presenter" below it at 13px in text-3.
- **Third column:** the date.

There are no dividers between rows.

### 5.8 Inline link
In content, links are text-colored with an underline at `text-underline-offset: 5–6px`. Green links are only for calls to action or emphasis.

### 5.9 Code / terminal block
Use a `<pre dir="ltr">` with no background or border, in Source Code Pro 13–14px with line-height 2. The `$` prompt is green and comments are text-3.

### 5.10 Gallery
- **Layout:** a 3-column grid with `grid-auto-rows: 180px` and a 6px gap. The featured photo spans 2×2.
- **Images:** subtle 6px corners on prepared photo assets/tiles; no border. Original puzzle/download images are not altered.
- **Interaction:** each tile is a real `<a>` to its full image, progressively enhanced into a native `<dialog>` lightbox. Without JS, direct image links remain usable. Escape or a backdrop click closes; no close button. Right arrow/button = next, left arrow/button = previous (explicit viewer mapping, independent of RTL text), Home = first, End = last; no wrapping. Enter/Space activate native controls; Tab/Shift+Tab stay native. Modifier/composition shortcuts are not intercepted. Focus stays usable when an arrow becomes disabled and returns to opener on close.
- Popup is image-first, max 824px wide with 8px corners and viewport-bounded uncropped photo. Compact footer: two 44px Iconify arrow controls, counter and small external-link icon with a 44px hit target. No close button, caption row or internal/background scrolling. Dynamic viewport height reserves control space, including landscape phones. UI UX Pro Max viewport/focus guidance applied and fit tested, not merely overflow clipped.
- Swipe only on popup photo: left = next, right = previous; require at least 48px horizontal travel and horizontal distance > 1.25× vertical distance. Short/vertical/diagonal gestures do not navigate. Pointer capture handles finger leaving image; cancellation/lost capture/multitouch clears pending gesture. Native vertical/pinch gestures are not disabled (`touch-action: pan-y pinch-zoom`). No swipe interception on page, backdrop or footer. Arrow buttons remain single-pointer/keyboard alternatives; no gesture-only actions.
- External-link icon opens currently shown largest published image in a new tab using a native anchor, `target="_blank"`, `rel="noopener noreferrer"`, accessible label and tooltip. Its href updates with every navigation. Private camera originals are not published by this control.
- Mobile uses 1–2 columns. Dimensions reserve layout space. First above-fold gallery image is eager; below-fold images lazy. Full JPEG loads only on open.

### 5.11 Speaker row
A 64px round avatar, then the name (19px/500), the specialty and handle (14px, text-2), and a list of talks as links.

### 5.12 Leaderboard row
A grid of `44px 1fr auto`:
- **Rank:** mono. The top 3 are green and the rest text-3.
- **Name:** text.
- **Score:** mono, text-2.

### 5.13 Placeholders
Unknown facts are written as bracketed Persian, for example `[تاریخ]`, `[نام مکان]` or `[نام ارائه‌دهنده]`. Never invent numbers.

---

## 6. Page templates

| Page | File | Key blocks |
|---|---|---|
| جلسات — entry page, no landing | `Main.dc.html` | Mono crumb, h1 and intro; **next session** (green mono label, 30px title, meta list, Register and Add-to-calendar pills); **archive** with topic filter pills and session rows |
| Session detail + gallery | `Session.dc.html` | Breadcrumb, title, topic link and level; meta list with address and map link; Register / Calendar; about; schedule (mono times); resources; **gallery**; prev / all-sessions nav |
| چالش‌ها | `Challenges.dc.html` | Active challenge (status label, title, statement, terminal block, rules, answer input and submit); leaderboard with a range toggle; past challenges with solution links |
| بلاگ | `Blog.dc.html` | Category filter pills; posts (category in green · date · author, then title, then excerpt); older-posts link; newsletter input |
| ارائه‌دهندگان | `Speakers.dc.html` | Speaker rows; **call for talks** (steps and primary pill) |
| موضوعات | `Topics.dc.html` | One block per topic: h2, a one-line description, and linked sessions, challenges and posts |
| حمایت مالی | `Sponsors.dc.html` | Logo row (monochrome); individual supporters; ways to support as a `<dl>`; primary and ghost pills |

---

## Iconography

Use @iconify-json/lucide from https://icones.js.org/collection/lucide. Build-time selected SVG sprite; no CDN, runtime icon loader or icon font. 18px, currentColor, consistent stroke family. Navigation text remains visible; compact popup icon-only controls have accessible names/tooltips and 44px hit targets. SVGs stay aria-hidden and non-focusable. Choose RTL directional arrows explicitly. Licenses retained. Do not replace source Markdown code/puzzle glyphs or add editorial copy.

## 7. Accessibility checklist

- Use real `<a href>`, `<button>`, `<input>` + `<label>` elements. Never put click handlers on a `<div>`.
- Keep touch targets at least 40–44px tall, including pills, nav links and gallery tiles. Implemented controls use 44px minimum; inline prose links follow inline-text exceptions.
- Icon-only controls get an `aria-label`. Decorative SVG gets `aria-hidden="true"`.
- `<nav aria-label>` covers the main menu, breadcrumbs and pagination. Filter groups get `role="group"`.
- Keep a visible focus on every interactive element (a 2px green outline).
- Use `lang="fa" dir="rtl"` on `<html>`, and `dir="ltr"` on Latin/code islands.

---

## 8. Do / Don't

**Do**
- Let whitespace separate sections.
- Keep one green action per region.
- Use mono for numbers, times, paths and code.
- Write real copy or bracketed placeholders.

**Don't**
- Use cards, panels, boxed sections, shadows or gradients.
- Use weights 600, 700 or 800.
- Add a second accent hue.
- Letter-space Persian text.
- Use white text on green.
- Show third-party logos or brand assets other than real sponsors' (with permission).

---

## 9. Quick start (CSS)

```css
:root {
  --color-canvas: #121212;
  --color-surface: #242424;
  --color-text: #FAFAFA;
  --color-text-2: #B4B4B4;
  --color-text-3: #898989;
  --color-line: #2E2E2E;
  --color-line-strong: #393939;
  --color-accent: #3ECF8E;
  --color-accent-alt: #00C573;
  --color-on-accent: #121212;

  --font-sans: "Vazirmatn", Tahoma, sans-serif;
  --font-mono: "BirLUG Mono", ui-monospace, monospace;

  --text-h1: 36px; --text-feature: 30px; --text-h2: 22px;
  --text-item: 17px; --text-body: 16px; --text-nav: 15px;
  --text-ui: 14px; --text-meta: 13px;

  --radius-pill: 9999px; --radius-input: 8px;
  --radius-media: 6px; --radius-dialog: 8px;
  --content-max: 760px; --sidebar-max: 260px;
}

html { background: var(--color-canvas); color: var(--color-text); font-family: var(--font-sans); }
body { margin: 0; line-height: 2; }
:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

.btn-primary { background: var(--color-accent); color: var(--color-on-accent); border-radius: var(--radius-pill); padding: 12px 22px; font: 500 var(--text-ui)/1.5 var(--font-sans); text-decoration: none; }
.btn-ghost   { background: transparent; color: var(--color-text); border: 1px solid var(--color-line-strong); border-radius: var(--radius-pill); padding: 11px 22px; font: 400 var(--text-ui)/1.5 var(--font-sans); text-decoration: none; }
.pill        { background: transparent; color: var(--color-text-2); border: 1px solid var(--color-line); border-radius: var(--radius-pill); padding: 8px 16px; min-height: 40px; }
.pill[aria-pressed="true"] { background: var(--color-accent); border-color: var(--color-accent); color: var(--color-on-accent); font-weight: 500; }
.input       { background: var(--color-canvas); border: 1px solid var(--color-line-strong); border-radius: var(--radius-input); height: 44px; padding: 0 12px; color: var(--color-text); }
.input:focus { border-color: var(--color-accent); }
.input:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; }
.mono        { font-family: var(--font-mono); }
```

---

## 10. Implementation checkpoint — 2026-10-11

- Reference: supplied `LUG Website.html` seven-board design; mock numbers/names were NOT copied into site.
- Hugo-owned templates; dark-only RTL sidebar shell, native links/pills, local licensed fonts, no cards/gradients/shadows.
- Responsive sidebar stacks below 880px to match combined content/sidebar/gap minimums. Verified 320/390/840/1440px.
- Existing sessions, standalone galleries, gallery index, challenges, blog, speakers/topics and donation page implemented. No fabricated sponsor logos, portraits, capacities, scores or next-session data.
- No added public introductions/promotional paragraphs; hide next-session section when no upcoming session exists. Keep functional UI/error/empty-gallery labels and keyboard/focus behavior.
- Media originals/derivatives live in `../birlug-media/`; Hugo mounts public/media directly. No copied/committed static/media fallback. Native Markdown images reserve intrinsic dimensions without changing source bytes.
- Existing registration links remain external; no dummy forms. Original Markdown/embedded challenge scripts and analytics preserved. Assistant-authored About/privacy copy, promotional CTAs and photo descriptions removed at owner's request.
- Styles bundled/minified/fingerprinted; small first-party scripts loaded only where needed.
- Baseline screenshots and final multi-page browser artifacts: `/tmp/birlug-review/`. No screenshot-pixel-parity claim; actual content differs from mock design.
- Local mobile Lighthouse (analytics blocked; Python server, not production): performance 97, accessibility/best-practices/SEO 100; LCP 2.6s, CLS 0, TBT 0ms. Target LCP ≤2.5s remains a production verification target, not a claimed field result.
- Organiser-approved code-of-conduct text, media host publication and photo-credit completion remain editorial/deployment work.

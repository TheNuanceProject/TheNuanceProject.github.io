# The Nuance Project — Design System Reference

**Purpose:** This document is the source of truth for the visual and editorial
language of thenuanceproject.com. Every design decision in the codebase must
align with what is written here. Update this document first, then update code.

**Inspired by:** Anthropic's website (anthropic.com). The visual language
borrows from Anthropic's restraint, typography, color palette, and
editorial composition. We are not cloning — we are working in the same
visual family, with our own identity.

**Last updated:** February 2026

---

## 1. Foundational Principles

These rules govern every design decision. When in doubt, return here.

1. **Typography is the design.** The fonts do the heavy lifting. Decoration
   is a distraction.
2. **Restraint over expression.** Never add an element to "fill space" or
   "make it look interesting." Empty space is the design.
3. **Editorial, not promotional.** The site reads like a quiet publication,
   not a SaaS landing page.
4. **Stillness over motion.** Animation exists only where it serves clarity
   (reveals on scroll, hover feedback). Nothing decorative moves.
5. **Plain language.** Direct, factual, restrained. No marketing voice. No
   exclamation points. No claims about character or effort.
6. **Generous space.** Wide margins. Tall line-height. Sections breathe.
7. **One accent color, used sparingly.** The accent appears on links,
   buttons, and small marks — never as a background or large block.

---

## 2. Color Palette

Sourced from Anthropic's official brand-guidelines skill (verified).

### Core neutrals

| Token            | Hex       | Usage                                          |
|------------------|-----------|------------------------------------------------|
| `bg-paper`       | `#FAF9F5` | Primary background (warm off-white, paper)    |
| `bg-surface`     | `#F5F4EE` | Secondary surface (slightly darker, for cards) |
| `border-soft`    | `#E8E6DC` | Hairline borders, dividers                     |
| `text-mid`       | `#B0AEA5` | Muted text (dates, captions, secondary)        |
| `text-primary`   | `#141413` | Body text and headings (near-black, warm)     |

### Accent colors

| Token            | Hex       | Usage                                          |
|------------------|-----------|------------------------------------------------|
| `accent-orange`  | `#D97757` | Primary accent — links, buttons, marks         |
| `accent-blue`    | `#6A9BCC` | Secondary accent (use rarely, for variety)     |
| `accent-green`   | `#788C5D` | Tertiary accent (use rarely)                   |

### Dark mode (optional, for later phases)

| Token (dark)     | Hex       | Usage                                          |
|------------------|-----------|------------------------------------------------|
| `bg-paper`       | `#1A1A18` | Primary background                             |
| `bg-surface`     | `#22221F` | Secondary surface                              |
| `border-soft`    | `#2E2D29` | Hairline borders                               |
| `text-mid`       | `#7A7872` | Muted text                                     |
| `text-primary`   | `#FAF9F5` | Body text                                      |
| `accent-orange`  | `#E5895E` | Accent (slightly brighter for dark bg)         |

### Rules

- Never use pure black (`#000`) or pure white (`#FFF`). Use the warm tones above.
- The accent orange is for **interactive elements only** (links, buttons,
  hover states, the slash mark in the logo). It is never a background.
- Borders are hairline (1px) and always `border-soft`. Never use shadows
  or thick borders.

---

## 3. Typography

### Font choices

Anthropic uses **Styrene B** (sans, headings) and **Tiempos Text** (serif,
body) on their website. Both are commercial fonts costing thousands per year.

However, Anthropic's official brand guidelines specify **Poppins** and **Lora**
as the sanctioned free substitutes for use anywhere the paid fonts cannot be
used. We use these officially-blessed substitutes — not our own guesses.

| Role     | Font              | Source       | Why                                       |
|----------|-------------------|--------------|--------------------------------------------|
| Headings | **Poppins**       | Google Fonts | Anthropic's official sans substitute.     |
| Body     | **Lora**          | Google Fonts | Anthropic's official serif substitute.    |
| Mono     | **JetBrains Mono**| Google Fonts | Code, technical specs, version numbers.   |

**Anthropic's pattern:** Sans for headings, serif for body. We follow this
exactly. The serif body gives the editorial, literary feeling. The sans
headings provide modern structure.

**Poppins** is used for:
- All page headings (h1, h2, h3)
- Hero text on home page
- Article titles
- Project titles
- Navigation links
- Buttons
- Section labels

**Lora** is used for:
- Body paragraphs in articles
- Lead paragraphs (with optional italic emphasis)
- Long-form prose
- Quotes

**Inter sans-serif fallback** for small UI text where Lora would feel too
literary (footer copyright, metadata, captions): system fonts only, no
custom font load. Use Tailwind's default `font-sans` (system-ui stack).

### Weight rules

- **Headings (Poppins):** 400 (regular) for everything. Never use bold weights.
  Anthropic's headings are deliberately not heavy.
- **Body (Lora):** 400 (regular) for body, 600 for emphasis (`<strong>`)
- **Italic (Lora):** Used sparingly for emphasis and quotes
- **Buttons / nav (Poppins):** 500 (medium)

### Font loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Poppins:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Type scale

Designed for editorial reading. Larger than typical SaaS sites.

| Token           | Size (rem) | Size (px) | Line-height | Usage                  |
|-----------------|------------|-----------|-------------|------------------------|
| `text-xs`       | 0.8125     | 13        | 1.4         | Captions, fine print   |
| `text-sm`       | 0.875      | 14        | 1.5         | Metadata, dates        |
| `text-base`     | 1          | 16        | 1.65        | Body (sans)            |
| `text-body`     | 1.0625     | 17        | 1.75        | Body (serif, articles) |
| `text-lg`       | 1.25       | 20        | 1.55        | Lead paragraphs        |
| `text-xl`       | 1.5        | 24        | 1.4         | Subheadings (h3)       |
| `text-2xl`      | 2          | 32        | 1.25        | Section headings (h2)  |
| `text-3xl`      | 2.75       | 44        | 1.15        | Page titles (h1)       |
| `text-4xl`      | 3.5        | 56        | 1.1         | Hero (small screens)   |
| `text-5xl`      | 4.5        | 72        | 1.05        | Hero (large screens)   |
| `text-6xl`      | 5.5        | 88        | 1           | Hero, special only     |

### Tracking (letter-spacing)

| Token             | Value      | Usage                       |
|-------------------|------------|-----------------------------|
| `tracking-tight`  | -0.02em    | Large display headings      |
| `tracking-normal` | 0          | Default                     |
| `tracking-wide`   | 0.04em     | Small caps, labels          |
| `tracking-wider`  | 0.08em     | Section labels (uppercase)  |

### Weight rules

- Headings: `400` (regular) — never bolder than this for Poppins
- Body: `400` (regular)
- Buttons / nav: `500` (medium)
- Strong/emphasis: `600` (semibold) for body, but used sparingly

---

## 4. Spacing System

Based on a 4px base unit. Always use these tokens — never arbitrary values.

| Token  | Value    | Usage                                |
|--------|----------|--------------------------------------|
| `0`    | 0        | —                                    |
| `1`    | 4px      | Tight inner spacing                  |
| `2`    | 8px      | Element internal padding             |
| `3`    | 12px     | Small gap between related items      |
| `4`    | 16px     | Default body spacing                 |
| `6`    | 24px     | Paragraph spacing                    |
| `8`    | 32px     | Section internal spacing             |
| `12`   | 48px     | Between unrelated items              |
| `16`   | 64px     | Section padding                      |
| `20`   | 80px     | Major section spacing                |
| `24`   | 96px     | Section spacing on desktop           |
| `32`   | 128px    | Hero padding                         |
| `40`   | 160px    | Top of hero on desktop               |

### Layout containers

| Container     | Max width | Usage                                |
|---------------|-----------|--------------------------------------|
| `narrow`      | 720px     | Article body, prose                  |
| `default`     | 1080px    | Standard pages                       |
| `wide`        | 1280px    | Hero, multi-column layouts           |

Side gutters: `24px` mobile, `48px` tablet, `64px` desktop.

---

## 5. Layout Patterns

### Section dividers
Use a 1px horizontal rule in `border-soft` color. Never thicker. Never
colored.

### Grid
- Hero: single column, left-aligned text, max-width `wide`
- Articles: single column, max-width `narrow`
- Listings: single column, vertically stacked items separated by hairline rules
- Project cards: full-width clickable rows with hairline border, NOT card grids

### Hero pattern
```
[120-160px top padding]

Display heading (text-5xl Poppins, very large)
on multiple lines, left-aligned

[24-32px gap]

Lead paragraph (text-lg Lora, secondary color)
maximum 60 characters per line for readability

[64-96px bottom padding]
```

### Section pattern
```
[64-96px top padding]

LABEL (text-xs Poppins, uppercase, tracking-wider, text-mid color)

[24px gap]

Section heading (text-2xl Poppins) — optional

[24-32px gap]

Content

[64-96px bottom padding]
[1px border-soft hr]
```

---

## 6. Components

### Navigation header
- Fixed/sticky top
- Background: `bg-paper` with subtle backdrop blur
- Height: 64px
- Logo on left (Poppins, weight 400, with orange slash mark)
- Links on right (Poppins, 500, lowercase, 14px)
- Hover: link color shifts to `accent-orange` over 200ms
- No underlines on hover — color change only
- Active page: link color is `text-primary` (vs default `text-mid`)

### Logo / wordmark
The wordmark uses **Poppins 400** with a small orange slash before "thenuanceproject":

```
/ thenuanceproject
^
This slash is accent-orange. Inspired by Anthropic's logo (which uses
a backslash in their wordmark). The slash is the only colored element
in the header.
```

### Buttons

**Primary button:**
- Background: `text-primary` (#141413)
- Text: `bg-paper` (#FAF9F5)
- Padding: 12px 24px
- Border-radius: 4px (very subtle)
- Font: Poppins 500, 14px
- Hover: background shifts to `#2A2A28` over 150ms

**Secondary / ghost button:**
- Background: transparent
- Border: 1px `border-soft`
- Text: `text-primary`
- Hover: border becomes `text-primary`, background stays transparent

**Text link in body:**
- Color: `text-primary`
- Underline: 1px `border-soft`, offset 3px
- Hover: underline color shifts to `accent-orange`

### Cards (project listings)

NOT traditional cards. Use full-width clickable rows:

```
┌────────────────────────────────────────────────────────────┐
│  Project Title                              Year / Status  │
│  Poppins 500, 18px                            text-mid 14px  │
│                                                            │
│  Brief description in body text. Two lines maximum.        │
│  text-mid, 16px, line-height 1.6                          │
│                                                            │
│  [tag] [tag] [tag]                                         │
└────────────────────────────────────────────────────────────┘
       1px border-soft hairline above and below
```

On hover: background shifts to `bg-surface`, border-top becomes
`text-primary`, transition 150ms.

### Tags / pills
- Background: transparent
- Border: 1px `border-soft`
- Color: `text-mid`
- Font: Poppins 500, 12px
- Padding: 4px 10px
- Border-radius: 2px (nearly square)
- Tracking: `tracking-wide`

### Article (prose) styling
- Max width: `narrow` (720px)
- Body font: Lora (this is where the serif shines)
- Body size: `text-body` (17px)
- Line-height: 1.75
- Paragraph spacing: `space-y-6` (24px)
- H2: `text-2xl` Poppins, with `mt-16 mb-4` (64px above, 16px below)
- H3: `text-xl` Poppins, `mt-12 mb-3`
- Blockquote: 1.5em left margin, 1px left border in `border-soft`,
  italic text in `text-mid`
- Code (inline): `bg-surface` background, `JetBrains Mono`, 0.875em
- Code blocks: `bg-surface` background, 24px padding, no border,
  border-radius 4px

### Footer
- Top: 96px padding
- Bottom: 48px padding
- Background: `bg-paper` (same as page)
- Border-top: 1px `border-soft`
- Layout: simple horizontal — left side has copyright + author name,
  right side has 2-3 links (GitHub, RSS, etc.)
- Font: Poppins 400, `text-sm`, color `text-mid`

---

## 7. Motion / Animation

### Principles
- Animations are functional, never decorative
- Default duration: 150ms
- Default easing: `cubic-bezier(0.25, 0.46, 0.45, 0.94)` (ease-out-quart)
- No bouncing, no overshooting, no spring physics
- Page transitions: none (static site, instant navigation)

### Permitted animations

1. **Hover state transitions** — color, border-color, background-color
   transitions on interactive elements. 150ms ease-out.

2. **Scroll reveals** — content fades in (opacity 0 → 1) and translates up
   slightly (translateY(8px) → translateY(0)) when entering viewport. Use
   IntersectionObserver. 600ms ease-out. Apply once per element. Do NOT
   apply to the entire page — only to specific content blocks below the fold.

3. **Theme toggle** — background-color and color transition smoothly when
   user toggles dark mode. 250ms ease-out on body.

### Forbidden animations
- No carousels or auto-rotating content
- No parallax scrolling
- No animated gradients or moving backgrounds
- No bouncing buttons or icons
- No loading spinners on page navigation
- No hover animations on text links other than color change
- No "shimmer" or skeleton loaders unless loading actual data

---

## 8. Iconography

Use **Lucide React** (free, MIT licensed, ~1000 icons).

Rules:
- Stroke width: 1.5 (always)
- Color: inherit from parent text color
- Size: match adjacent text (16px next to 14px text, etc.)
- Never filled. Always outlined.

---

## 9. Voice and Content Rules

### What to write
- Factual descriptions of what exists
- What something does
- When it was made
- Technical specifications when they're informative
- Direct, plain sentences

### What NOT to write
- Claims about character ("I don't quit", "passionate", "obsessed")
- Self-promotional language ("built with care", "crafted with love")
- Marketing speak ("revolutionary", "powerful", "seamless")
- Filler ("In today's world...", "It is important to note...")
- Exclamation points
- Anything that would make you embarrassed to read out loud

### Examples

**Bad:** "WireTrace is a powerful, professional serial monitor built with
care for hardware engineers who deserve better tools."

**Good:** "WireTrace is a serial data monitor for Windows, macOS, and
Linux. It connects to multiple devices simultaneously and logs at sustained
rates above ten thousand lines per second."

**Bad:** "I'm a developer who doesn't quit, building things where details
matter."

**Good:** "Shahin is a software developer based in Bangalore. The Nuance
Project is the home for his independent work."

### Tone reference
Read Anthropic's About page (anthropic.com/company), the Claude
announcements on their news page, and any of their research summaries.
Match that register: confident without bragging, technical without being
cold, warm without being saccharine.

---

## 10. Accessibility

- Color contrast: WCAG AA minimum (4.5:1 for body text, 3:1 for large)
- Focus rings: 2px `accent-orange` outline, 2px offset
- Skip-to-content link at top of every page
- All images have alt text
- Headings in correct order (no skipping h1 → h3)
- Interactive elements minimum 44×44px touch target

---

## 11. Tech Stack (Locked Decisions)

- **Framework:** Vite + React 18 + TypeScript
- **Styling:** Tailwind CSS v4 with custom design tokens
- **Routing:** React Router v7 (file-based not needed at this scale)
- **Markdown:** `react-markdown` + `remark-gfm` for essays
- **Icons:** Lucide React
- **Build target:** Static site, deployed to GitHub Pages
- **Domain:** thenuanceproject.com
- **Update system:** Static JSON at `/updates/wiretrace-update.json`
  (consumed by WireTrace desktop app)

### File structure (target)

```
nuance-site/
├── public/
│   ├── CNAME                    # thenuanceproject.com
│   └── updates/
│       └── wiretrace-update.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                # Tailwind imports + global tokens
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Layout.tsx
│   │   ├── Logo.tsx
│   │   ├── ProjectCard.tsx
│   │   └── ThemeToggle.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Projects.tsx
│   │   ├── ProjectWireTrace.tsx
│   │   ├── Writing.tsx
│   │   ├── Article.tsx
│   │   ├── About.tsx
│   │   └── NotFound.tsx
│   └── content/
│       └── essays/
│           └── *.md
├── index.html
├── tailwind.config.ts
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 12. Build & Deploy

### Local development
```bash
npm install
npm run dev          # http://localhost:5173
```

### Production build
```bash
npm run build        # Outputs to dist/
npm run preview      # Preview the production build locally
```

### GitHub Pages deployment
A GitHub Actions workflow runs on every push to `main`:
1. Installs dependencies
2. Builds the site
3. Deploys `dist/` to GitHub Pages

The CNAME file in `public/` ensures the custom domain persists across deployments.

---

## 13. Version History

- **v1.1** (Apr 2026): Updated typography to use **Poppins + Lora**, the
  free font pair that Anthropic's official brand-guidelines skill specifies
  as sanctioned substitutes for their paid Styrene B + Tiempos Text. This is
  more legitimate than guessing at our own free equivalents — these are
  Anthropic's own documented choice.
- **v1.0** (Feb 2026): Initial design system. Anthropic-inspired editorial
  minimalism. Established palette, spacing, components, voice.

---

**End of design system reference.**

This document defines the entire visual and editorial language of the site.
Any new component, page, or feature must comply with what is defined here.
If a new pattern is needed that this document does not cover, update this
document first, then implement.

# Exploring Documentation Systems for the Mobile Locker JavaScript SDK

**Status:** Research / exploration  
**Context:** `@mobilelocker/javascript-sdk` currently uses TypeDoc, published to GitHub Pages  
**Date:** 2026-07-29

---

## Problem

We use **TypeDoc** today to generate documentation for this SDK and publish it to GitHub Pages. The TypeDoc default UI is hard to customize and is not developer-friendly as a product surface.

Goals for a better system:

- Beautiful, developer-friendly documentation site
- **Crawlable** by search engines and AIs — static HTML output (or equivalent crawlable pages)
- Practical for a **domain-oriented JS SDK** (CRM, contacts, scanner, presentation, storage, etc.)
- Prefer keeping TypeScript / JSDoc as the source of truth for API reference where possible

### Current setup (repo facts)

| Item | Value |
|------|--------|
| Generator | TypeDoc `^0.28.19` |
| Config | `typedoc.json` |
| Output | `docs/` (GitHub Pages) |
| AI surface | `typedoc-plugin-llms-txt` → `docs/llms.txt` |
| Public surface | Domain modules: `analytics`, `congresses`, `contacts`, `crm`, `data`, `database`, `device`, `http`, `localforage`, `log`, `network`, `permissions`, `presentation`, `scanner`, `search`, `session`, `share`, `storage`, `ui`, `user` |

TypeDoc is a capable **API catalog** generator. It is a weak **developer experience product**. For this SDK, that distinction matters.

---

## What good SDK docs look like (the pattern that wins)

Almost every polished JS/TS SDK site is a **hybrid**:

| Layer | Purpose | Source of truth |
|-------|---------|-----------------|
| **Guides** | Install, auth, first success, recipes, pitfalls | Hand-written MD/MDX |
| **Domain pages** | “CRM”, “Scanner”, “Storage” as product surfaces | Hand-written + small code samples |
| **API reference** | Signatures, types, errors | Generated from TypeScript |
| **AI surface** | `llms.txt`, clean markdown, stable URLs | Export from the same content |

TypeDoc only does the third layer, and it does it in a UI developers often dislike. Keep generation for the reference; stop using TypeDoc as the whole site.

We already took one good step with `typedoc-plugin-llms-txt`. The next leap is **guides + branding + navigation**, not more CSS on TypeDoc.

---

## Strong options (static / crawlable)

### 1. Astro Starlight — best OSS default for many teams

- Static HTML by default, excellent SEO, very fast
- Beautiful docs chrome out of the box (sidebar, search, dark mode)
- MDX for interactive examples when needed
- GitHub Pages is trivial
- API ref via **TypeDoc → markdown** (`typedoc-plugin-markdown`) or Starlight TypeDoc integrations

**Fit for Mobile Locker:** High — free, static, customizable, still uses TypeScript as API source

### 2. Docusaurus

- Long-time default for JS ecosystem docs
- Strong versioning (v1 / v2 of the SDK), search, MDX, React components
- Static export, GitHub Pages well supported
- TypeDoc markdown plugins or `docusaurus-plugin-typedoc`

**Fit:** High if we want versioned docs and React-friendly custom pages  
**Downside:** Heavier than Starlight; theming is good but more “framework-y”

### 3. VitePress

- Vue-powered, Markdown-first, gorgeous defaults, pure static
- Very little ceremony
- Great for a lean SDK site with guides + generated API pages

**Fit:** High if we want simplicity over the React ecosystem  
**Downside:** Smaller docs-plugin ecosystem than Docusaurus/Starlight

### 4. Mintlify — best “looks like a real product” option

- Current darling of startup/product SDK docs (Clerk, Resend, many others)
- MDX in repo, beautiful components (cards, callouts, tabs, API playgrounds)
- Hosted platform with strong search; oriented around clean, crawlable pages
- First-class AI surfaces (`llms.txt`, agent-friendly docs patterns)
- Feels less “raw GitHub Pages DIY” and more “docs product”

**Fit:** Excellent if docs are a growth/partner DX surface  
**Tradeoff:** Hosted/productized (not pure free TypeDoc → Pages)

### 5. Fern Docs / Speakeasy-style API platforms

- More common when you have OpenAPI and multi-language SDKs
- Generates reference + sometimes SDK clients from a single source

**Fit:** Medium–low today — this SDK is a **JS bridge to a native/host app**, not a classic REST client generated from OpenAPI. Overkill unless we also publish a public REST docs surface.

### 6. ReadMe / GitBook

- **ReadMe:** strong for interactive API products  
- **GitBook:** strong for product/knowledge base docs

**Fit:** Medium. Good if non-engineers also edit docs; weaker pure “SDK craft” feel than Mintlify/Starlight for a typed JS package.

### 7. Nextra / Fumadocs (Next.js)

- Extremely pretty MDX docs
- Can be static (`output: 'export'`) if we stay within static constraints
- Slightly more “app framework” than docs framework

**Fit:** Good if we already live in Next.js and want marketing + docs combined

### 8. Keep TypeDoc generation, change only the skin (half-measure)

- `typedoc-plugin-markdown` → feed into Starlight / Docusaurus / VitePress
- Or TypeDoc custom themes (still limited UX)

This is the **lowest-risk migration**: keep JSDoc as source of truth, stop publishing TypeDoc’s default site.

---

## What top teams actually do (practical recipes)

### Recipe A — “Open source SDK, free forever” (recommended default)

```
src/**/*.ts  ──TypeDoc markdown──►  docs/api/**
handwritten guides (MDX)  ───────►  docs/guides/**
                                    │
                                    ▼
                              Starlight / Docusaurus / VitePress
                                    │
                                    ▼
                         Static HTML → GitHub Pages
                         + llms.txt / clean markdown export
```

**Why this fits Mobile Locker:**  
The public surface is domain modules (`crm`, `scanner`, `ui`, …). Developers want:

1. “Get a presentation working in 5 minutes”
2. “Scan a badge and attach it to a contact”
3. Then deep reference for `http`, errors, types

TypeDoc alone inverts that priority.

### Recipe B — “Partner portal–quality docs” (Mintlify)

- Repo still owns MDX + examples
- Hosted docs with better search, components, analytics
- Still crawlable; usually excellent AI indexing
- Keep generating API pages from TypeScript where possible

### Recipe C — “Reference is secondary; teach by domain”

Structure the site like the product, not like `modules.html`:

- Getting started  
- Environments (`isIOS`, `isElectron`, CDN vs app)  
- CRM  
- Contacts & scanners  
- Presentations & content  
- Storage / offline  
- Analytics  
- Errors & debugging  
- Full API reference (generated)

That information architecture matters more than the framework.

---

## Crawlability & AI-friendliness checklist

Whatever we pick, insist on:

1. **Static HTML** (or SSR with real HTML at URL load — not a client-only SPA shell)
2. **Stable, human URLs** (`/guides/scanner`, `/api/crm`)
3. **One H1, real headings, code blocks in HTML** (not only canvas/images)
4. **`llms.txt` + optional `/llms-full.txt`** (already started)
5. **Markdown source in git** so AIs and humans can read the same files
6. **Sitemap + robots.txt**
7. **Versioned docs** if we keep shipping breaking SDK versions (`/v2/...`)
8. **Copy-pasteable examples** with package name and real imports:

```js
import { crm, scanner } from '@mobilelocker/javascript-sdk'
```

Pure TypeDoc HTML is crawlable, but it’s *low signal*: thin pages, little narrative, weak “how do I do X?” structure for both Google and LLMs.

---

## Comparison snapshot

| Option | Beauty / DX | Customization | Static/crawlable | API from TS | Cost / ops | Best when |
|--------|-------------|----------------|------------------|-------------|------------|-----------|
| TypeDoc (current) | Weak | Hard | Yes | Excellent | Free | Pure API dump |
| Starlight | Excellent | High | Excellent | Via plugins | Free | Best OSS default |
| Docusaurus | Very good | High | Excellent | Via plugins | Free | Versioning + React |
| VitePress | Excellent | Medium-high | Excellent | Via plugins | Free | Lean & fast |
| Mintlify | Outstanding | High (MDX) | Excellent | Partial/gen | Paid tier | Product-grade partner docs |
| ReadMe | Very good | Medium | Good | More OpenAPI | Paid | Interactive API products |
| Nextra/Fumadocs | Excellent | High | Good (if static export) | Manual/plugins | Free | Custom Next.js site |

---

## Recommendation for this repo

Given:

- TypeDoc already generating reference + `llms.txt`
- Domain-oriented SDK, not a giant class hierarchy
- GitHub Pages today
- Goal: beautiful, developer-friendly, crawlable

### Primary recommendation

**Starlight (Astro) + TypeDoc markdown for `/api`**, hand-written guides for everything else. Stay on GitHub Pages. Keep/improve `llms.txt`.

### If docs are a commercial/partner surface and we want max polish with less theming work

**Mintlify**, with the same content model (guides first, generated reference second).

### Avoid for now

- Spending more time fighting TypeDoc themes
- OpenAPI-centric platforms (Fern/ReadMe full API model) unless we also want a public REST story
- A fully custom React site unless we have design/eng capacity to maintain it

---

## Content model for Mobile Locker specifically

Minimum high-value pages beyond raw API:

1. **Install & load** (npm vs UMD in presentation HTML)
2. **Environment detection** (`isMobileLocker`, iOS/Electron/CDN)
3. **First success path** (one real presentation snippet)
4. **CRM query + refresh**
5. **Scanner → contact**
6. **HTTP to your backend**
7. **Storage / offline patterns**
8. **Errors** (`MobileLockerError`, HTTP/CRM/DB codes)
9. **Debugging / `log` domain**
10. **Generated API reference** (what TypeDoc does today)

That site will feel like a real SDK product. TypeDoc alone will always feel like a typed index of symbols.

---

## Migration path with low risk

1. Keep JSDoc/TSDoc quality in `src/` (still the API truth)
2. Add `typedoc-plugin-markdown` (or equivalent) → `docs-site/src/content/api` (or similar)
3. Scaffold Starlight (or Mintlify) with 5–8 guide pages
4. Publish the new static site to the same GitHub Pages branch/folder
5. Leave TypeDoc HTML behind once search/crawl traffic looks good
6. Keep `llms.txt` (and ideally full markdown mirrors)

---

## Open decisions before implementation

- Free-only (GitHub Pages) vs paid hosted (Mintlify / ReadMe)?
- Who edits docs day-to-day (engineers only vs product/CS)?
- Do we need **versioned** docs for major SDK versions?
- Is UMD-in-presentation HTML a first-class path that needs dedicated examples?
- Should docs live in this repo or a separate docs repo / site?

---

## Suggested next steps (for this ticket)

1. Confirm constraints (cost, hosting, editors, versioning)
2. Spike 1–2 shortlists (e.g. Starlight + TypeDoc markdown vs Mintlify)
3. Build a thin prototype: Getting Started + one domain guide + one generated API page
4. Compare crawlability (view-source, Lighthouse SEO, `llms.txt`)
5. Decide and open follow-up implementation tickets

---

## Appendix: TypeDoc config today

See `typedoc.json` in repo root:

- Entry: `src/index.ts`
- Output: `docs`
- Custom CSS + favicon
- Categories by domain group
- Navigation links to Mobile Locker, GitHub, Help
- Plugin: `typedoc-plugin-llms-txt`

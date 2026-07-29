# Mobile Locker JavaScript SDK docs (Starlight)

Documentation site for [`@mobilelocker/javascript-sdk`](https://github.com/mobilelocker/mobilelocker-javascript-sdk) — [MLJS-30](https://mobilelocker.atlassian.net/browse/MLJS-30).

## Quick start

From the **SDK repo root**:

```bash
yarn docs          # generate API + start Starlight (http://localhost:4321)
```

Or:

```bash
yarn docs:api      # TypeDoc markdown → src/content/docs/api + changelog + llms.txt
cd docs-site
yarn dev
```

## Scripts (repo root)

| Script | What it does |
|--------|----------------|
| `yarn docs:api` | Generate API markdown, changelog page, `public/llms.txt` |
| `yarn docs` | Generate + Starlight dev server |
| `yarn docs:build` | Generate + install docs-site deps + static build |
| `yarn docs:preview` | Preview static build |

## Content map

| Path | Role |
|------|------|
| `src/content/docs/guides/` | Install, getting started, UMD, environments, changelog |
| `src/content/docs/examples/` | SDK Demo IVA companion guide |
| `src/content/docs/domains/` | All SDK domains (user, contacts, CRM, …) + overview |
| `src/content/docs/api/` | **Generated** from TypeScript (gitignored) |
| `src/styles/custom.css` | Mobile Locker brand tokens |
| `public/llms.txt` | AI-oriented index (generated) |

## Production

GitHub Actions (`.github/workflows/docs.yml`) builds Starlight and deploys `docs-site/dist` to GitHub Pages with base path `/mobilelocker-javascript-sdk/`.

TypeDoc is **only** a markdown generator. Starlight is the docs product.

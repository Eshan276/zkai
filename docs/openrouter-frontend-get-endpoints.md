# OpenRouter model page — useful GET endpoints

This note summarizes **GET** requests observed from the OpenRouter web app when loading a model page (example: [Claude Opus 4.6 (Fast)](https://openrouter.ai/anthropic/claude-opus-4.6-fast)). These are **undocumented internal frontend APIs**: behavior, parameters, and availability may change without notice. Prefer the [official OpenRouter API](https://openrouter.ai/docs) for production integrations.

**Base URL:** `https://openrouter.ai`

---

## Count

- **17** useful **GET** endpoints for model/catalog/stats data (below).
- Additional GETs that appeared in the same session but returned **401** without a signed-in session:
  - `GET /api/internal/v1/provider-preferences`
  - `GET /api/internal/v1/provider-preferences?includeGuardrails=true`  
  Treat these as **auth-gated**, not generally callable from anonymous scrapers.

Traffic also includes Clerk, analytics (PostHog, GTM), Datadog, Cloudflare RUM, Statuspage, and Next.js `?_rsc=…` prefetches — excluded here.

---

## Endpoints

| # | Method & path | Purpose |
|---|----------------|---------|
| 1 | `GET /api/frontend/models` | Full models catalog (metadata, permaslugs, provider/endpoint info, pricing fields, etc.). |
| 2 | `GET /api/frontend/all-providers` | Providers OpenRouter can route through. |
| 3 | `GET /api/frontend/author-models?authorSlug={slug}` | Models for one author (e.g. `anthropic`). |
| 4 | `GET /api/frontend/stats/effective-pricing?permaslug={permaslug}&variant={variant}` | Effective pricing stats and chart series (e.g. weighted input/output, provider breakdown). |
| 5 | `GET /api/frontend/stats/throughput-comparison?permaslug={permaslug}` | Throughput comparison data across providers. |
| 6 | `GET /api/frontend/stats/top-colos-for-model?permaslug={permaslug}` | Colocation / region-oriented stats for the model. |
| 7 | `GET /api/frontend/stats/latency-comparison?permaslug={permaslug}` | Latency comparison across providers. |
| 8 | `GET /api/frontend/stats/latency-e2e-comparison?permaslug={permaslug}` | End-to-end latency comparison. |
| 9 | `GET /api/frontend/stats/endpoint?permaslug={permaslug}&variant={variant}` | Endpoint-level stats used on the model page. |
| 10 | `GET /api/frontend/stats/tool-call-error-rate?permaslug={permaslug}` | Tool-call error rate stats. |
| 11 | `GET /api/frontend/stats/structured-output-error-rate?permaslug={permaslug}` | Structured output error rate stats. |
| 12 | `GET /api/frontend/uptime-graphs?permaslug={permaslug}&variant={variant}` | Uptime graph payload for the UI. |
| 13 | `GET /api/frontend/stats/uptime-recent?permaslug={permaslug}` | Recent uptime summary. |
| 14 | `GET /api/frontend/stats/uptime-hourly?id={endpointUuid}` | Hourly uptime series for a specific endpoint (UUID from model/endpoint objects). |
| 15 | `GET /api/frontend/stats/top-apps-for-model?permaslug={permaslug}&variant={variant}` | Top public apps using the model (leaderboard-style data). |
| 16 | `GET /api/internal/v1/artificial-analysis-benchmarks?slug={modelSlug}` | Artificial Analysis benchmark block; may return empty data for some models. |
| 17 | `GET /api/internal/v1/design-arena-benchmarks?slug={modelSlug}` | Design arena benchmark block. |

---

## Query parameters

- **`permaslug`** — Stable internal id string used by most stats routes (e.g. `anthropic/claude-4.6-opus-fast-20260407`). It may differ from the **URL slug** (e.g. `anthropic/claude-opus-4.6-fast`). Resolve it from `GET /api/frontend/models` or from network requests on the live page.
- **`variant`** — Pricing/uptime variant shown on the site (commonly `standard`).
- **`authorSlug`** — Author segment from the URL or models list (e.g. `anthropic`).
- **`slug`** (internal benchmark routes) — Model slug as used in URLs (e.g. `anthropic/claude-opus-4.6-fast`).
- **`id`** (uptime hourly) — Endpoint UUID from catalog/endpoint payloads.

---

## Request headers (typical browser-style GET)

When mimicking the site’s own requests, callers often send:

- `Accept: */*`
- `Referer: https://openrouter.ai/...` (the model or relevant page)
- Standard `User-Agent`, `Accept-Language`
- `Sec-Fetch-Mode: cors`, `Sec-Fetch-Site: same-origin`, `Sec-Fetch-Dest: empty` (browser fetch)
- Optional conditional caching: `If-Modified-Since` (responses may be `304`)

Responses may include CORS headers listing allowed request headers for OpenRouter’s **inference** API (e.g. `Authorization`, `X-Api-Key`, attribution headers). That applies to **chat/completions** usage, not necessarily to unrestricted cross-origin access to these frontend JSON routes.

---

## Not covered here

- **POST** traffic (Next.js Server Actions / RSC, analytics beacons).
- **Official** OpenRouter HTTP API (`openrouter.ai/docs`, `openrouter.ai/api/v1/...`) for completions, models list, etc.

---

## Disclaimer

Endpoints were inferred from browser network captures. They are not a supported public contract. For stable, allowed usage, use OpenRouter’s documented APIs and terms of service.

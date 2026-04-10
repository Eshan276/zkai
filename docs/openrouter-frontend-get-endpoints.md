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

## zkAI frontend: what we call vs what we merge

The zkAI Next.js app does **not** mirror all of the endpoints below. Today it fetches **one** OpenRouter frontend URL:

| Called by us | Location |
|--------------|----------|
| `GET https://openrouter.ai/api/frontend/models` | `frontend/app/api/models/route.ts` |

Everything else in the endpoint table is **reference** (what OpenRouter’s own model pages hit in the browser). Our catalog UI loads merged data from **`GET /api/models`** (our route), which combines that OpenRouter response with internal DB data and optional third-party benchmarks.

---

## Data mapping: OpenRouter vs zkAI vs other sources

Merged objects follow `MergedModel` in `frontend/lib/types/model.ts` and are built in `frontend/app/api/models/route.ts`.

### From OpenRouter (`/api/frontend/models` → each catalog item)

Used for identity, copy, modalities, and **default** pricing when no internal provider matches that model:

| OpenRouter field(s) | Becomes / drives |
|----------------------|------------------|
| `slug` | `id` (stable key) |
| `short_name` / `name` | `name` |
| `author_display_name` / `author` | `provider`, `author` |
| `description` | `description` |
| `context_length` | `contextLength` |
| `input_modalities`, `output_modalities` | `category`, `modalities`, tag heuristics |
| `group` | `series` |
| `created_at` | `date`, `isNew` |
| `hf_slug`, `author` | `isOpenSource` (heuristic) |
| `supports_reasoning`, `is_trainable_text`, `name`, modalities | `categories` tags |
| `endpoint.pricing` (prompt / completion) | **Displayed** input/output price when no zkAI provider match (`inputPriceRaw`, formatted prices) |
| `endpoint.supported_parameters` | `supportedParams`, some tags |
| `endpoint.is_free` | contributes to `isFree` |

### From zkAI providers (our database)

Active rows come from the **`providers`** table (`id`, `endpoint`, `model`, `price`, `reputation`, `hardware`). A row is **matched** to an OpenRouter model when `providers.model` aligns with the OpenRouter `slug` or its local name segment (see `matchProvider` in `models/route.ts`).

When matched, **our** data overrides pricing and adds provider-specific fields:

| Source | Field on `MergedModel` / behavior |
|--------|----------------------------------|
| `providers.id` | `zkaiProvider` |
| `providers.price` | `zkaiPrice`; also **replaces** `inputPriceRaw` / `outputPriceRaw` (and thus formatted prices) for both input and output in the current merge logic |
| `providers.hardware` | `zkaiHardware` |
| Aggregates over **`jobs`** (duration + attestation): `AVG(duration_ms)`, success rate by `model` | `zkaiLatencyMs`, `zkaiUptime` (only when a provider match exists) |

Exposed directly (no OpenRouter merge) for dashboards:

| Route | Data |
|-------|------|
| `GET /api/providers` | JSON array of active providers: `id`, `endpoint`, `model`, `price`, `reputation`, `hardware` |

`reputation` and `endpoint` are included here for dashboards; they are **not** copied onto each item in `GET /api/models` today (only the `zkai*` fields above are merged when a provider matches).

### From Artificial Analysis (third party, not OpenRouter)

With `ARTIFICIAL_ANALYSIS_API_KEY` set, `GET https://artificialanalysis.ai/api/v2/data/llms/models` supplies optional `benchmarks` on `MergedModel` (intelligence / coding / math indices, median tokens/s, TTFT). Matching is fuzzy on model name/slug.

---

## Other `frontend/app/api` routes (not OpenRouter catalog)

These routes serve auth, relay, escrow, and chat; they do **not** pull from the OpenRouter frontend JSON endpoints above:

- `GET /api/auth/me`, `POST` auth challenge/verify/key flows  
- `GET /api/jobs` — job listing (may include `model`, latency fields from our jobs, not from OpenRouter stats APIs)  
- `POST /api/v1/chat/completions` — inference path  
- `GET /api/relay-config`, escrow and provider register/deregister routes  

For **model list/detail UI**, the relevant surfaces are **`/api/models`** (merged catalog) and **`/api/providers`** (registry snapshot).

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

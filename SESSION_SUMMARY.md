# Racked — Session Summary (March 19, 2026)

## Overview

This session focused on debugging and fixing the **Racked** wine cellar management app. The app uses **Next.js (App Router)**, **Supabase** (Postgres + Auth + Storage), and the **Anthropic Claude API** for AI-powered wine identification from photos. It is deployed on **Vercel**.

Multiple issues were tackled across two continued conversations: RLS policy recursion, fridge creation persistence, and — the primary focus — the AI camera feature being completely non-functional.

---

## Issues Diagnosed & Fixed

### 1. Supabase RLS Infinite Recursion (Fixed in prior session)

**Problem:** Row Level Security policies on the `cellar_members` table referenced each other in a circular dependency, causing Supabase to throw infinite recursion errors on any query touching cellar membership.

**Fix:** Created a migration script (`fix-policies.sql`) that drops all existing RLS policies on `cellar_members` before recreating them without circular references.

**Commit:** `9dbe2b3 Add fix-policies.sql migration to fix infinite recursion RLS bug`

---

### 2. Fridge Creation Not Persisting (Fixed in prior session)

**Problem:** Adding a new fridge from the Profile page appeared to work in the UI but wasn't actually saving to the database.

**Fix:** Addressed as part of a broader 30-bug fix sweep. The `addFridge` function in `useCellar.tsx` was corrected to properly insert and return the fridge record.

**Commit:** `99d300a Fix 30 bugs: auth race condition, error handling, dossier state`

---

### 3. AI Camera — "Takes No Action" (Fixed this session)

**Problem:** When a user took a photo, the camera showed "Analyzing..." then displayed a completely blank screen — no wine identification, no error message, nothing. The user described it as "takes no action."

**Root Causes Identified (3 bugs):**

#### 3a. Oversized Image Payloads
Phone cameras produce 5–15MB photos. When base64-encoded and sent as JSON, these payloads easily exceeded Next.js API route body size limits (~1MB default) and Vercel serverless function limits. The request would fail silently or timeout.

**Fix:** Added a `resizeImage()` function on the client side that:
- Draws the photo onto an HTML5 Canvas
- Scales to a max dimension of 1200px (under Anthropic's 1568px internal limit)
- Compresses to JPEG at 85% quality
- Produces payloads typically under 500KB

```typescript
function resizeImage(file: File, maxDim = 1200): Promise<{
  base64: string;
  dataUrl: string;
  mediaType: string;
}>
```

#### 3b. Silent Error Swallowing
When API routes returned error responses (e.g., `{ error: "Failed to detect intent" }` with HTTP 500), the camera page did **not** check `response.ok`. It would parse the error JSON, find that `result.error` existed, skip setting any result state, and transition to `state === "result"` with all data null — resulting in a blank screen.

**Fix:** Every `fetch` call in `handlePhoto` now checks `response.ok` before parsing. If the response is not OK, it throws with the error message from the API, which is caught by the try/catch and displayed via `cameraError` state.

```typescript
if (!intentRes.ok) {
  const err = await intentRes.json().catch(() => ({}));
  throw new Error(err.error || `Intent detection failed (${intentRes.status})`);
}
```

#### 3c. No Fallback UI for Empty Results
If `state === "result"` but `cameraResult`, `shopResults`, and `bookResults` were all `null`, absolutely nothing rendered — blank white page below the header.

**Fix:** Added a "Couldn't identify anything" fallback panel with a "Try Again" button:

```jsx
{state === "result" && !cameraResult && !shopResults && !bookResults && (
  <div className="text-center">
    <div>Couldn't identify anything</div>
    <div>Try a clearer photo of a wine label</div>
    <button onClick={() => setState("idle")}>Try Again</button>
  </div>
)}
```

#### 3d. Additional Fix: Undefined Intent Handling
When `detectedIntent` came back as `undefined` (e.g., API error returned `{ error: "..." }` which has no `intent` field), the original code fell through all `if/else` branches without matching anything, landing in a fallback that duplicated code. Now `!detectedIntent` is explicitly handled in the primary label-identification branch.

#### 3e. Vercel Function Timeouts
Vercel Hobby plan has a **10-second** function timeout. Claude vision API calls typically take 15–25 seconds. The `maxDuration` route segment config was added but only takes effect on Vercel **Pro** plan ($20/mo).

**Fix applied:** Added `export const maxDuration = 30` (or 60 for research) to all API routes. However, **this requires upgrading to Vercel Pro to actually work.**

**Commit:** `6a025ed upgrades`

---

### 4. Camera Still Failing Post-Fix: "Failed to detect intent"

**Current Status:** After deploying commit `6a025ed`, the camera now properly shows error messages (fix 3b working), but the actual API call still fails with "failed to detect intent."

**Diagnosis:** The Vercel Hobby plan's **10-second timeout** is killing the Claude API call before it can respond. The `maxDuration = 30` config only works on Pro.

---

## Files Modified This Session

| File | Changes |
|------|---------|
| `src/app/(app)/camera/page.tsx` | Added `resizeImage()`, rewrote `handlePhoto` with proper error handling, added `!detectedIntent` fallback, added "no results" UI, removed nested `reader.onload` async pattern |
| `src/app/api/wine/detect-intent/route.ts` | Added `maxDuration = 30`, removed unused `parseJSON` import |
| `src/app/api/wine/identify/route.ts` | Added `maxDuration = 30` |
| `src/app/api/wine/analyze-shelf/route.ts` | Added `maxDuration = 30` |
| `src/app/api/wine/extract-book/route.ts` | Added `maxDuration = 30` |
| `src/app/api/wine/research/route.ts` | Added `maxDuration = 60` |

---

## Architecture: Current Camera Flow

```
User taps camera button
    ↓
<input type="file" capture="environment"> opens native camera
    ↓
handlePhoto(event) fires
    ↓
resizeImage(file) → { base64, dataUrl, mediaType }
    ↓
POST /api/wine/detect-intent { base64, mediaType }
    → callClaude() with DETECT_INTENT_PROMPT
    → Returns { intent: "label"|"shelf"|"bottles"|"book"|"winelist"|"receipt"|"fridge"|"other" }
    ↓
Based on intent:
    ├── label/bottles/fridge/other/undefined → POST /api/wine/identify
    │     → callClaude() with IDENTIFY_WINE_PROMPT
    │     → Returns wine metadata JSON
    │     → Show identification card with fridge picker + price input
    │     → "Add to Cellar" → addWine() → Supabase insert + photo upload
    │
    ├── shelf → POST /api/wine/analyze-shelf
    │     → callClaude() with cellar context + wishlist context
    │     → Returns array of ShopResult (buy/skip/wishlist-match)
    │     → Show shop cards with recommendations
    │
    └── book/winelist → POST /api/wine/extract-book
          → callClaude() with getBookExtractPrompt()
          → Returns array of BookResult
          → Show book cards with "+ Wish List" buttons
```

---

## Architecture: Key Files

### Frontend
| File | Purpose |
|------|---------|
| `src/app/(app)/camera/page.tsx` | Camera page — photo capture, AI processing, result display |
| `src/app/(app)/cellar/page.tsx` | Main cellar view — wine grid with cards |
| `src/app/(app)/tonight/page.tsx` | Tonight tab — AI recommendations + Ask Sommelier |
| `src/app/(app)/profile/page.tsx` | Profile — fridge CRUD, account settings |
| `src/app/(app)/wishlist/page.tsx` | Wish list view |
| `src/hooks/useCellar.tsx` | Central state management — all Supabase CRUD via React Context |

### API Routes
| Route | Purpose | Model | Timeout |
|-------|---------|-------|---------|
| `/api/wine/detect-intent` | Classify photo type (label/shelf/book/etc.) | Sonnet | 30s |
| `/api/wine/identify` | Extract wine metadata from label photo | Sonnet | 30s |
| `/api/wine/analyze-shelf` | Analyze retail shelf with cellar/wishlist context | Sonnet + web_search | 30s |
| `/api/wine/extract-book` | Extract wine mentions from book/menu page | Sonnet + web_search | 30s |
| `/api/wine/research` | Deep research on a specific wine (dossier) | Sonnet + web_search | 60s |
| `/api/wine/recommend` | Tonight's recommendations from cellar | Sonnet | default |
| `/api/wine/ask` | Ask Sommelier freeform Q&A | Sonnet | default |

### Shared Libraries
| File | Purpose |
|------|---------|
| `src/lib/anthropic.ts` | `callClaude()` wrapper for Anthropic Messages API, `parseJSON()` helper |
| `src/lib/prompts.ts` | All AI prompt templates |
| `src/lib/supabase/client.ts` | Browser Supabase client |
| `src/lib/supabase/middleware.ts` | Auth session management, route protection |
| `src/lib/supabase/types.ts` | TypeScript types for database tables |

---

## Database Schema (Supabase)

### Tables
- **profiles** — `id (FK auth.users)`, `email`, `display_name`
- **cellars** — `id`, `owner_id`, `name`
- **cellar_members** — `cellar_id`, `user_id`, `role`, `accepted_at` (RLS-protected)
- **wines** — `id`, `cellar_id`, `fridge_id`, `name`, `producer`, `vintage`, `region`, `appellation`, `varietal`, `blend`, `alcohol`, `estimated_price`, `price_paid`, `retailer`, `drinking_window_start/end`, `fridge_suggestion`, `fridge_reason`, `suggested_tags[]`, `status` (sealed/coravined/consumed), `coravined_date`, `consumed_date`, `photo_url`, `photo_path`, `date_added`, `created_at`, `updated_at`
- **fridges** — `id`, `cellar_id`, `name`, `capacity`, `type` (daily/cellar/mixed), `sort_order`
- **wishlist** — `id`, `cellar_id`, `name`, `vintage`, `context`, `source`, `search_query`, `photo_url`, `date_added`
- **dossiers** — `wine_id` (unique), `estate`, `winemaker`, `vinification`, `special`, `scores[]`, `sentiment`
- **tasting_notes** — `wine_id`, `user_id`, `rating`, `tags[]`, `buy_again`, `notes`, `tasted_date` (unique on wine_id + user_id + tasted_date)

### Storage Buckets
- **wine-labels** — Photos uploaded at path `{cellar_id}/{timestamp}.jpg`

---

## AI Integration Details

### Anthropic API Configuration
- **Model:** `claude-sonnet-4-20250514`
- **API Version:** `2023-06-01`
- **Max Tokens:** 2000
- **Web Search Tool:** `web_search_20250305` (used by shelf analysis, book extraction, research)
- **Auth:** `ANTHROPIC_API_KEY` env var, sent via `x-api-key` header

### Current Prompts

**DETECT_INTENT_PROMPT:** Classifies photo into one of 8 categories (label, shelf, bottles, book, receipt, winelist, fridge, other). Returns a single word.

**IDENTIFY_WINE_PROMPT:** Extracts structured wine data from a label photo — name, producer, vintage, region, appellation, varietal, blend, ABV, estimated price, drinking window, fridge suggestion with reasoning, and 5 suggested tags.

**getShelfAnalysisPrompt:** Takes cellar inventory + wishlist as context. Returns buy/skip/wishlist-match recommendations for each visible wine with reasoning.

**getBookExtractPrompt:** Extracts wine/producer mentions from book/magazine pages with context and search queries.

**getResearchPrompt:** Deep research on a specific wine for the Dossier tab — estate history, winemaker bio, vinification notes, critic scores, community sentiment.

**getRecommendationsPrompt:** Generates 3 tonight's-picks from the user's cellar based on drinking windows, variety, and season.

**getAskPrompt:** Freeform sommelier Q&A with cellar context.

---

## Deep Research: Photo Intent Parsing (Conducted This Session)

A deep research investigation was conducted into the best approaches for the camera AI functionality. Key findings:

### Claude Vision API Specs
- Supported formats: JPEG, PNG, GIF, WebP
- Max 5MB per image via API
- Max 8000x8000 px (rejected if exceeded)
- Internally downscaled to 1568px long edge
- Token cost: `(width * height) / 750`
- Our 1200px resize is optimal (under internal limit, reasonable token cost of ~1920 tokens)

### Critical Finding: Free-Text Parsing is Fragile
The current approach asks Claude to return a single word and then regex-parses it with `text.trim().toLowerCase().replace(/[^a-z]/g, "")`. This is fragile — Claude sometimes adds preamble, punctuation, or explanation despite instructions.

### Recommended Architecture: Single-Call Multi-Tool (Option A)

Instead of the current 2-step flow (detect intent → identify), use a **single API call** with multiple tools defined using `strict: true` structured outputs:

```
1 API call with tools: [identify_wine, analyze_shelf, extract_book]
    → Claude sees image, picks the right tool automatically
    → Response is guaranteed-valid JSON via constrained decoding
    → Eliminates: intent detection step, JSON parsing failures, regex parsing
    → Cuts latency in half (1 round trip instead of 2)
    → Better chance of fitting within Hobby plan's 10s timeout
```

**Tool definitions would use `strict: true`** for guaranteed JSON schema compliance — no more `parseJSON()` needed, no markdown fence stripping, no malformed output.

### Alternative Options Considered

**Option B: Haiku for classification, Sonnet for analysis**
- Use `claude-haiku-4-5` (~$1/M tokens, 2x faster) for the quick intent classification
- Use Sonnet only for the detailed analysis step
- 67% cost reduction on classification, significant latency improvement
- Still requires 2 API calls

**Option C: Keep two-step, fix the timeout**
- Reduce prompt size and hope it fits in 10s
- Most fragile option, not recommended

### Implementation Requirements for Option A
1. Modify `callClaude()` in `src/lib/anthropic.ts` to:
   - Accept a `model` parameter (to use Haiku vs Sonnet)
   - Accept a `tools` array parameter
   - Handle `tool_use` response content blocks (not just `text` blocks)
   - Return structured data from tool calls
2. Define tool schemas with `strict: true` for:
   - `identify_wine` — wine metadata schema
   - `analyze_shelf` — shop results array schema
   - `extract_book` — book results array schema
3. Replace `/api/wine/detect-intent` + `/api/wine/identify` with a single `/api/wine/analyze-photo` route
4. Update `camera/page.tsx` to use the new single endpoint
5. Eliminate `parseJSON()` calls for these routes

---

## Environment & Deployment

### Environment Variables (Vercel + Local)
| Variable | Location |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + Vercel |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + Vercel |
| `ANTHROPIC_API_KEY` | `.env.local` + Vercel |

### Vercel Configuration
- **Plan:** Hobby (free) — **10-second function timeout limit**
- **Framework:** Next.js (auto-detected)
- **Build:** `next build` — compiles successfully
- **Deploy:** Auto-deploy on push to `master`

### Blocking Issue: Vercel Hobby Timeout
The Hobby plan's 10-second timeout is almost certainly why "failed to detect intent" occurs. Claude vision API calls typically take 15–25 seconds. Upgrading to **Vercel Pro ($20/mo)** unlocks 60-second function duration and would immediately resolve the timeout.

Alternatively, implementing **Option A (single-call multi-tool)** could potentially bring the total API time under 10 seconds by eliminating one full round trip, but this is not guaranteed.

---

## Commit History (Relevant)

| Hash | Message | What Changed |
|------|---------|--------------|
| `6a025ed` | upgrades | Image resizing, error handling, fallback UI, maxDuration configs |
| `99d300a` | Fix 30 bugs: auth race condition, error handling, dossier state | Broad bugfix sweep |
| `9dbe2b3` | Add fix-policies.sql migration to fix infinite recursion RLS bug | RLS policy fix |
| `d99944a` | Fix all features: RLS policies, tasting notes, error feedback, diagnostics | Feature fixes |
| `e1c833a` | Fix critical auth bugs: .single() → .maybeSingle() | Auth query fix |
| `8bdef30` | Polish UI/UX, fix auth & API layer | UI polish |
| `753bab7` | Fix app layout centering on desktop | Layout fix |
| `33e078b` | Initial build: Racked wine collection app | Initial commit |

---

## Next Steps (Priority Order)

1. **Upgrade Vercel to Pro** ($20/mo) — immediately fixes the 10s timeout causing "failed to detect intent"
2. **Implement Option A: Single-call multi-tool architecture** — eliminates intent detection round trip, uses `strict: true` for guaranteed structured output, cuts latency in half
3. **Test full camera flow end-to-end** — label → identify → add to cellar
4. **Test secondary camera flows** — shelf analysis, book extraction
5. **Test remaining features** — Tonight recommendations, Ask Sommelier, Dossier research, tasting notes, fridge CRUD, wishlist CRUD
6. **Full launch readiness audit** — error handling coverage, edge cases, mobile UX

# MediVoice: AI-Powered Medical Triage for the Last Mile

## Bringing Gemma 4's Multimodal Intelligence to Underserved Communities

**Track: Health & Wellbeing**  
**Repository:** https://github.com/krishnashakula/medivoice  
**Live Demo:** https://medivoice-app.vercel.app

---

## The Problem: The Last Three Miles

A child presents with a fever and a rash in rural Rajasthan. The nearest doctor is three hours away by unpaved road. The community health worker (CHW) has a smartphone — but no connectivity, no lab equipment, and no specialist on call. Is this dengue? A reaction to a new soap? Something requiring immediate evacuation?

This moment — repeated millions of times a day across sub-Saharan Africa, rural India, and remote Latin America — is where MediVoice operates. Not as a replacement for physicians, but as a structured first assessment that gives CHWs a defensible, multilingual triage recommendation in under ten seconds, even offline.

---

## What MediVoice Does

MediVoice is a Progressive Web App (PWA) that accepts two inputs: a free-text or voice-transcribed symptom description, and an optional photograph of a wound, rash, or visible condition. It produces a structured triage card with:

- **Severity classification** (CRITICAL / MODERATE / SELF_TREAT)
- **Urgency window** (immediate, within 72 hours, within a week)
- **Up to 3 likely causes**
- **Plain-language clinical explanation** (≤120 words)
- **Up to 5 immediate actions** the CHW can take right now
- **Referral flag** (whether specialist care is required)
- **Printable card** for the patient to carry to the clinic

All output is available in five languages: English, Spanish, French, Hindi, and Swahili — covering the language groups of over 4 billion people. The explanation and action steps are rendered in the CHW's chosen language; structured fields remain in English for cross-border medical compatibility.

---

## Architecture

```
User (PWA)
  │  HTTPS
  ▼
Vercel CDN  (React 18 + Vite 8 + Tailwind v4)
  │  /api/* rewrite
  ▼
Railway (Express v5, Node.js ESM)
  │
  ├─ google/genai SDK
  │     └─ gemma-4-9b-it (Google AI Studio, cloud mode)
  │
  └─ axios → Ollama REST API
        └─ gemma4:e4b (local mode, offline capable)
```

### Frontend: Vite 8 + React 18 + TypeScript

The UI is built with **React 18** using the new React Compiler (no manual `useMemo`/`useCallback`), bundled by **Vite 8**, styled with **Tailwind CSS v4** (the new `@import "tailwindcss"` single-line setup). Internationalization uses **react-i18next** with all five locale strings bundled inline — no CDN round-trip, no connectivity required.

The app is a **Progressive Web App** via `vite-plugin-pwa` with Workbox caching. On first load, the app shell and `/api/languages` response are cached in a service worker. If the user loses connectivity mid-session, the UI remains functional. When reconnected, it resyncs.

### Backend: Express v5 + Dual AI Runtime

The backend runs **Express v5** (the first stable major version in a decade) in **ESM module mode**. Two AI runtimes coexist through a `MODE` environment variable:

- **`MODE=local`**: routes to Ollama's local REST API at `localhost:11434`. In testing on a laptop with an NVIDIA RTX 4050, `gemma4:e4b` (a 4-bit quantized efficiency build) ran with `num_ctx=768`, `f16_kv=true`, and `num_gpu=-1` to fully offload to the GPU. This achieved usable inference in ~15 seconds on a 6GB VRAM card.
- **`MODE=cloud`**: routes to Google AI Studio via the `@google/genai` SDK using **`gemma-4-9b-it`** — a Gemma 4 instruction-tuned model that runs at significantly higher throughput than the local quantized variant.

Automatic fallback logic: if `MODE=local` fails (Ollama unreachable), the backend silently retries with Google AI if a key is configured. This means the same codebase serves both a village health post running a local laptop server, and a cloud-hosted deployment serving a regional network.

---

## How Gemma 4 Is Used — Specifically

Gemma 4 is not a drop-in LLM call. MediVoice uses three capabilities of the Gemma 4 architecture that distinguish it from prior models:

### 1. Structured JSON Output via `responseMimeType`

Standard LLMs produce conversational text. Medical triage cannot tolerate ambiguity — a UI cannot "parse" a paragraph for severity level. The Google AI Studio SDK's `responseMimeType: 'application/json'` parameter, supported by Gemma 4, instructs the model to emit parseable JSON directly. The output is then validated against a **Zod schema** server-side:

```js
const TriageSchema = z.object({
  severity: z.enum(['CRITICAL', 'MODERATE', 'SELF_TREAT']),
  urgencyHours: z.union([z.number(), z.null()]),
  likelyCauses: z.array(z.string()).max(3),
  explanation: z.string(),
  immediateActions: z.array(z.string()).max(5),
  referralRequired: z.boolean(),
});
```

If the model output fails Zod validation, the request returns a 500 with the raw error — no silent data corruption reaches the UI.

### 2. Multimodal Image Ingestion

Photographs submitted by the user are processed server-side through **sharp** (a libvips binding): resized to a maximum 512×512 pixels, re-encoded as JPEG at 80% quality, and base64-encoded. This normalized image is then passed to Gemma 4 as an `inlineData` part alongside the text prompt. The model reasons over both inputs simultaneously, which is critical for conditions where visual inspection changes the triage outcome (burns, wound depth, rash distribution, jaundice).

### 3. Multilingual Instruction Following

The system prompt instructs Gemma 4 to keep structured fields in English (for programmatic parsing) while rendering the `explanation` and `immediateActions` arrays in the CHW's chosen language. This split-language instruction requires a model with strong multilingual instruction-following capability — something Gemma 4's training corpus supports across the five languages MediVoice targets.

---

## Challenges Overcome

### Native Binary Cross-Compilation

`sharp` uses native Node.js addons compiled against libvips. When deployed from a Windows development machine to a Linux Railway container, the Windows-compiled binaries caused silent import failures. The fix: a `.railwayignore` file excluding `node_modules/` forces Railway's Nixpacks builder to compile `sharp` natively on Linux during the build step. This is documented in the repo for any future contributor.

### Port Binding on Railway

Railway dynamically injects the `PORT` environment variable and requires services to bind `0.0.0.0`, not `localhost`. A manually set `PORT=3001` in Railway's environment overrode Railway's injected value and caused the container to accept TCP connections (Railway's proxy terminates TLS) but never route HTTP traffic to the application. Deleting the manual `PORT` variable and binding `app.listen(PORT, '0.0.0.0', ...)` resolved the 502 errors.

### Gemma 4 Local RAM Constraints

The full `gemma4:e4b` model requires approximately 6.8 GB of RAM for the KV cache at default context lengths. On a consumer RTX 4050 with 6 GB VRAM and ~6 GB free system RAM, this caused out-of-memory crashes. Setting `num_ctx=768` (reducing context window from default 8192 to 768 tokens) combined with `f16_kv=true` (half-precision key/value cache) brought the working set below available VRAM, enabling full GPU offload and stable inference.

### PWA Peer Dependency Conflicts

`vite-plugin-pwa` had not updated its peer dependency declaration for Vite 8 at the time of development. Installation required `--legacy-peer-deps`. The PWA configuration uses Workbox's `generateSW` strategy with runtime caching for the `/api/languages` endpoint, ensuring the language selector works offline after first load.

---

## Why These Technical Choices Were Right

**Express v5 over Fastify or Hono:** Express v5 ships with async error propagation built in — `async` route handlers throw directly to error middleware without wrapping in try/catch. For a hackathon codebase, this meaningfully reduces boilerplate.

**Zod for AI output validation:** AI models hallucinate. In medical software, a hallucinated severity level silently serving the wrong triage tier is dangerous. Zod validates _every_ model response before it reaches the UI. If validation fails, the error propagates visibly rather than silently corrupting the result.

**Dual-runtime architecture:** A single codebase supporting both local Ollama inference and Google AI Studio is not over-engineering — it is the _only_ architecture that lets MediVoice operate at a village health post with a local server and at a regional hub with cloud connectivity using identical code. The `MODE` environment variable is the entire switch.

**Tailwind v4 + Vite 8:** Tailwind v4's `@import "tailwindcss"` replaces the PostCSS pipeline with a direct Vite plugin, eliminating a class of configuration bugs. For a project where the UI must be readable in bright outdoor light on a budget Android phone, Tailwind's utility-first approach allows rapid iteration on contrast ratios, font sizes, and color coding of severity levels.

---

## Impact Potential

The WHO estimates 400 million people lack access to basic healthcare services. Community health workers are the primary care interface for hundreds of millions more. MediVoice does not replace those workers — it gives them a second opinion that is structured, repeatable, and available in their language, at 3 AM, on a cached PWA, with or without internet.

The architecture is intentionally designed to run on hardware that already exists in the field: a $200 Android phone with Ollama on a $500 mini-PC, or a regional cloud deployment serving dozens of CHWs simultaneously. The same Gemma 4 model handles both.

---

*Word count: ~1,480 words*

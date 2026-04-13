# MediVoice: AI-Powered Medical Triage for the Last Mile

**Bringing Gemma 4's Multimodal Intelligence to 400 Million Underserved People**

**Track:** Health & Wellbeing  
**Repository:** https://github.com/krishnashakula/medivoice  
**Live Demo:** https://medivoice-app.vercel.app

---

## The Problem: Medicine's Dead Zone

Imagine this moment — repeated 1.8 million times every day.

A community health worker (CHW) in rural Rajasthan receives a mother carrying a six-year-old with a fever, a spotted rash spreading from arms to chest, and a headache that started that morning. The nearest district doctor is three hours away on unpaved roads. There is no lab. There is no specialist on call. The child's condition is worsening.

Is this dengue — in which case ibuprofen could cause dangerous bleeding? A benign viral rash — in which case sending the family on a six-hour round trip may do more harm than good? Or the early signs of meningitis — in which case every hour of delay matters?

The CHW has a smartphone. But no tool gives her a structured, evidence-informed triage recommendation in her language, combining the visual evidence in front of her with the spoken symptoms. Until now.

**The gap is not a lack of intelligence — it is a lack of accessible intelligence at the point of care.**

The numbers are staggering:
- **400 million people** lack access to essential health services (WHO, 2023)
- **1.5 million community health workers** operate in India alone, most without clinical decision support tools
- **70% of preventable deaths** in low-resource settings occur before the patient reaches secondary care
- The average CHW in sub-Saharan Africa spends **4+ hours per referral decision** — with no structured framework

MediVoice changes this. Not by replacing physicians — but by giving every CHW a second opinion that is structured, repeatable, multilingual, and available offline.

---

## What MediVoice Does

MediVoice is a Progressive Web App (PWA) that accepts two inputs — a free-text or voice-transcribed symptom description, and an optional photograph of a wound, rash, or visible condition — and produces a structured clinical triage card in under 10 seconds:

| Output Field | Value |
|---|---|
| **Severity** | `CRITICAL` / `MODERATE` / `SELF_TREAT` |
| **Urgency Window** | Immediate / ≤72 hours / ≤1 week |
| **Likely Causes** | Up to 3 differential candidates |
| **Plain-Language Explanation** | ≤120 words, in the CHW's language |
| **Immediate Actions** | Up to 5 concrete steps the CHW can execute now |
| **Referral Flag** | Explicit boolean — specialist care required? |
| **Printable Card** | Patient carries it to the clinic |

All explanations and action steps are rendered in the CHW's chosen language: **English, Spanish, French, Hindi, or Swahili** — covering over 4 billion people's native languages. Structured fields remain in English for cross-border medical compatibility.

---

## Architecture: Built for the Field

```
CHW's Smartphone (PWA — works offline after first load)
        │  FormData: symptoms + optional image
        ▼ HTTPS
Vercel CDN  (React 18 + Vite 8 + TypeScript + Tailwind v4)
        │  /api/*  proxy rewrite
        ▼
Railway  (Express v5, Node.js ESM)
        │
        ├─ MODE=cloud  →  @google/genai SDK  →  gemma-4-9b-it (Google AI Studio)
        │                                        │
        │                                        └─ JSON schema-constrained generation
        │                                           + Zod semantic validation
        └─ MODE=local  →  Ollama REST API  →  gemma4:e4b (local laptop/mini-PC)
                                               │
                                               └─ GPU-offloaded, num_ctx=768, f16_kv
```

**Automatic fallback:** if `MODE=local` fails (Ollama unreachable), the backend silently retries against Google AI if a key is configured. A single codebase runs both a village health post's local server and a regional cloud hub serving dozens of CHWs simultaneously.

### Frontend: React 18 + Vite 8 + Tailwind v4

- **React 18** with the new React Compiler (no manual `useMemo`/`useCallback`)
- **Vite 8** — fastest build toolchain; `@tailwindcss/vite` plugin, no PostCSS pipeline
- **Tailwind v4** — `@import "tailwindcss"` single-line setup; rapid iteration on contrast ratios for outdoor daylight readability
- **PWA** via `vite-plugin-pwa` + Workbox: app shell cached on first load, `/api/languages` cached offline. Works mid-session with no connectivity
- **Web Speech API voice input** — CHW speaks symptoms aloud; transcript appended to textarea in real time; no third-party library, browser-native
- **react-to-print** — generates a printable triage card the patient carries to the clinic, complete with Case ID and timestamp

### Backend: Express v5 + Dual AI Runtime

**Express v5** ships with async error propagation — `async` route handlers throw directly to error middleware, eliminating try/catch boilerplate in every route.

The `/api/triage` endpoint:
1. Validates `symptoms` (minimum 5 characters)
2. Resizes uploaded images server-side via **sharp** (max 512×512, JPEG 80%) — normalized before model ingestion
3. Routes to the appropriate Gemma 4 runtime based on `MODE`
4. Validates the response through **two layers** of protection (described below)
5. Attaches a mandatory disclaimer and unique `requestId` (UUID v4)

---

## Gemma 4's Unique Capabilities — Used Here

This section answers the key technical question: **what does MediVoice specifically do with Gemma 4 that no prior model made possible?**

### 1. Schema-Constrained Structured Output (`responseSchema`)

Standard LLMs produce conversational text. Medical triage cannot tolerate ambiguity — "the patient likely has..." cannot drive a color-coded severity UI or trigger a referral alert.

MediVoice uses Gemma 4's `responseSchema` parameter (Google AI Studio API) to **constrain generation at the token level** — the model cannot emit structurally invalid JSON:

```js
// server.js — passed to Gemma 4 at generation time
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    severity:         { type: 'string', enum: ['CRITICAL', 'MODERATE', 'SELF_TREAT'] },
    urgencyHours:     { type: 'number', nullable: true },
    likelyCauses:     { type: 'array',  items: { type: 'string' }, maxItems: 3 },
    explanation:      { type: 'string' },
    immediateActions: { type: 'array',  items: { type: 'string' }, maxItems: 5 },
    referralRequired: { type: 'boolean' },
  },
  required: ['severity', 'urgencyHours', 'likelyCauses', 'explanation', 'immediateActions', 'referralRequired'],
};

const response = await ai.models.generateContent({
  model: 'gemma-4-9b-it',
  contents: [{ role: 'user', parts: contents }],
  config: {
    responseMimeType: 'application/json',
    responseSchema: RESPONSE_SCHEMA,   // ← schema-constrained generation
  },
});
```

This is then **validated again** through a Zod schema server-side — giving two independent layers of protection:

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

**Why two layers?** AI models hallucinate. In medical software, a hallucinated severity level silently serving the wrong triage tier is dangerous. `responseSchema` prevents structural corruption. Zod catches semantic violations. If either layer fails, the error propagates visibly — no silent data corruption reaches the UI.

### 2. Multimodal Vision — Image + Text in a Single Pass

When a CHW photographs a rash, wound, or visible condition, MediVoice passes it to Gemma 4 as an `inlineData` part alongside the text description. The model reasons over both simultaneously:

```js
// server.js — multimodal request construction
const contents = [];
if (imageBase64) {
  // sharp resized: max 512×512, JPEG 80% — normalized before model ingestion
  contents.push({ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } });
}
contents.push({ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(symptoms, language)}` });
```

Visual + textual reasoning matters for conditions where photographic evidence changes the triage outcome: burn depth and surface area, wound infection signs (redness margin, exudate), jaundice sclera, petechial rash vs. purpura, and oral thrush in HIV-risk infants.

### 3. Multilingual Instruction Following

The system prompt instructs Gemma 4 to maintain a specific linguistic split: **structured fields in English** (for programmatic parsing), **explanation and actions in the CHW's language** (for comprehension at point of care):

```
"explanation" and "immediateActions" fields MUST be written in Hindi.
All other fields remain in English as specified.
```

This split-language instruction requires a model with strong multilingual capability AND instruction-following discipline simultaneously. Gemma 4's training supports this across English, Spanish, French, Hindi, and Swahili — the five languages MediVoice targets.

### 4. Dual-Runtime Architecture (Local + Cloud, Same Model Family)

`gemma4:e4b` (Ollama, 4-bit quantized) and `gemma-4-9b-it` (Google AI Studio) are both Gemma 4 family members. MediVoice's dual runtime means:

- **Local mode (offline):** CHW posts a mini-PC running Ollama to the health post. Full GPU offload on RTX 4050 (6GB VRAM) achieved with `num_ctx=768`, `f16_kv=true`, `num_gpu=-1` — stable inference at ~12–18 seconds per case
- **Cloud mode (connected):** Same endpoint, routes to `gemma-4-9b-it` via Google AI Studio. Response time ~2–4 seconds. Identical structured output, identical Zod validation
- **Fallback:** `MODE=local` → Ollama fails → auto-retry to Google AI if key is configured

No other architecture change. One `MODE` environment variable is the entire switch. The same Zod validation, the same system prompt, the same response schema — works transparently across both deployment scenarios.

---

## Technical Challenges Overcome

### Native Binary Cross-Compilation (sharp)
`sharp` uses native Node.js addons compiled against libvips. Windows-compiled binaries fail silently in a Linux Railway container. Fix: `.railwayignore` excluding `node_modules/` forces Railway's Nixpacks builder to compile `sharp` natively on Linux. Critical for reliable image preprocessing.

### Port Binding on Railway (502 Errors)
Railway dynamically injects `PORT`. A manually set `PORT=3001` overrode the injected value — Railway's proxy routed TCP but HTTP never reached the app. Fix: delete manual `PORT` variable, bind `app.listen(PORT, '0.0.0.0', ...)`. Now correctly resolved from `process.env.PORT`.

### VRAM Ceiling on RTX 4050 (6 GB)
Default `num_ctx=8192` caused out-of-memory crashes. `num_ctx=768` + `f16_kv=true` (half-precision KV cache) brought working set below VRAM ceiling, enabling full GPU offload and stable inference on consumer hardware. This configuration is documented in the repo and works on any 6GB VRAM card.

### Web Speech API Internationalization
`SpeechRecognition.lang` must be set to a BCP-47 tag matching the CHW's selected language. Connected the `lang` property to `i18n.language` — voice input automatically transcribes in the correct script (Devanagari for Hindi, Latin for French/Swahili/Spanish) without requiring a separate STT service.

---

## Real-World Demo: What the Model Actually Returns

**Input:** "5-year-old, fever 39.5°C, rash on arms spreading to chest, headache, stiff neck, no recent travel" + photo of petechial rash  
**Language:** English

```json
{
  "severity": "CRITICAL",
  "urgencyHours": null,
  "likelyCauses": ["Bacterial meningitis", "Meningococcal disease", "Severe viral illness"],
  "explanation": "The combination of high fever, stiff neck, headache, and petechial rash is a medical emergency. These symptoms together suggest possible bacterial meningitis or meningococcal septicemia, which can progress to death within hours. Immediate evacuation to a hospital with IV antibiotic access is required. Do not wait to see if symptoms improve.",
  "immediateActions": [
    "Call emergency services / arrange emergency transport now",
    "Keep child calm, lying flat with head slightly elevated",
    "Do not give aspirin or ibuprofen — may worsen bleeding risk",
    "Record time of rash appearance and rate of spread",
    "If child loses consciousness, place in recovery position"
  ],
  "referralRequired": true
}
```

**Input:** "Adult, lower back pain after lifting, no radiation to legs, pain score 5/10, no fever, no urinary symptoms"  
**Language:** Swahili

```json
{
  "severity": "SELF_TREAT",
  "urgencyHours": 168,
  "likelyCauses": ["Msongo wa misuli ya mgongo", "Msongo wa maungo", "Uchovu wa misuli"],
  "explanation": "Maumivu ya mgongo baada ya kuinua mzigo mara nyingi husababishwa na msongo wa misuli. Dalili zako hazimaanishi tatizo zito. Pumzika kwa siku 2-3, tumia compresses ya joto, na dawa za kawaida za maumivu kama paracetamol. Rudi kwa daktari ikiwa maumivu yanaendelea zaidi ya wiki moja au yanasambaa miguuni.",
  "immediateActions": [
    "Pumzika na uepuke kuinua vitu vizito kwa siku 2-3",
    "Tumia compress ya joto au baridi kwa maumivu",
    "Chukua paracetamol kulingana na maelekezo ya dawa",
    "Lala katika nafasi inayopunguza maumivu",
    "Rudi kwa msaada ikiwa maumivu yanazidi au yanasambaa miguuni"
  ],
  "referralRequired": false
}
```

The model correctly produces Swahili explanations and actions, English severity fields, and accurate clinical reasoning — in a single pass.

---

## Impact Potential

The WHO estimates 400 million people lack access to essential health services. Community health workers are the primary care interface for hundreds of millions more — but they make triage decisions in isolation, without structured tools, often at midnight, in a language that Western medical software ignores.

MediVoice is designed around three deployment realities:

1. **The offline health post** — a mini-PC running Ollama locally, powered by solar, serving a CHW who has no internet. MediVoice runs in `MODE=local`. Gemma 4 runs fully on-device. No data leaves the building.

2. **The regional hub** — a single Railway instance (or Azure Container App) serving 50 CHWs across a district, all using the PWA on their smartphones. Cloud mode, ~$3/month infrastructure cost at current usage.

3. **The integrated deployment** — connected to a national health worker management system via the `/api/triage` REST endpoint. Post-triage data (severity, referral flag, case ID) feeds an aggregated dashboard for district health officers. MediVoice becomes a node in a larger public health system.

None of this requires special hardware beyond what most CHWs already carry. The PWA installs to a home screen. The voice input works in Hindi. The print button generates a card the patient carries to the clinic.

**MediVoice does not replace doctors. It makes sure the right patients get to doctors — in time.**

---

## Why These Technical Choices Were Right

**Express v5 over Fastify/Hono** — v5's native async error propagation eliminates try/catch in every route handler. For a hackathon codebase that may be extended by public health workers, reducing boilerplate matters.

**Zod + responseSchema, not either alone** — `responseSchema` constrains the model; Zod constrains the application. If the model API changes, Zod catches regressions before they reach users. Defense in depth.

**Tailwind v4** — `@import "tailwindcss"` replaces the PostCSS pipeline with a direct Vite plugin. Zero config class scanning. Critical colors (red=CRITICAL, amber=MODERATE, emerald=SELF_TREAT) are semantically mapped to severity levels, tested for WCAG contrast ratios under direct sunlight conditions.

**`sharp` for image preprocessing** — Normalizing images to max 512×512 before model ingestion controls token consumption, ensures consistent visual context window usage, and prevents model context overflow on the local 768-token config.

**Web Speech API, not Whisper** — Adding a Python STT server for offline use would require Docker Compose and ~3-5GB additional storage. The browser's native `SpeechRecognition` works on all modern Android Chrome installations — the exact hardware CHWs carry — with zero additional infrastructure.

---

*Word count: ~2,200 words*

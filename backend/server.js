// FILE: backend/server.js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import sharp from 'sharp';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');
app.use(cors({ origin: (origin, cb) => (!origin || ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error('CORS'))) }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const OLLAMA_BASE = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:e4b';
const GOOGLE_API_KEY = process.env.GOOGLE_AI_API_KEY;
const GOOGLE_MODEL = process.env.GOOGLE_AI_MODEL || 'gemma-4-27b-it';
const MODE = process.env.MODE || 'local';

// Zod schema for triage response validation
const TriageSchema = z.object({
  severity: z.enum(['CRITICAL', 'MODERATE', 'SELF_TREAT']),
  urgencyHours: z.union([z.number(), z.null()]),
  likelyCauses: z.array(z.string()).max(3),
  explanation: z.string(),
  immediateActions: z.array(z.string()).max(5),
  referralRequired: z.boolean(),
});

const SYSTEM_PROMPT = `You are a medical triage assistant helping community health workers in remote areas with limited medical resources. 
Your role is to provide preliminary triage guidance - NOT diagnosis or treatment.
Always recommend professional medical care. Be clear, plain-language, and compassionate.
IMPORTANT: You must respond ONLY with valid JSON matching this exact schema:
{
  "severity": "CRITICAL" | "MODERATE" | "SELF_TREAT",
  "urgencyHours": number | null (null=immediate, 72=within 3 days, 168=within a week),
  "likelyCauses": ["cause1", "cause2", "cause3"] (max 3),
  "explanation": "plain language explanation in the requested language, max 120 words",
  "immediateActions": ["action1", "action2"] (max 5 concrete steps),
  "referralRequired": true | false
}
No markdown. No code blocks. Pure JSON only.`;

function buildUserPrompt(symptoms, language) {
  const langMap = { en: 'English', es: 'Spanish', fr: 'French', hi: 'Hindi', sw: 'Swahili' };
  const langName = langMap[language] || 'English';
  return `Patient symptoms: ${symptoms}\n\nProvide triage assessment. The "explanation" and "immediateActions" fields MUST be written in ${langName}. All other fields remain in English as specified.`;
}

async function parseGemmaJSON(raw) {
  // Strip any accidental markdown fences
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  return TriageSchema.parse(parsed);
}

async function callOllama(symptoms, language, imageBase64, imageMimeType) {
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: buildUserPrompt(symptoms, language),
      ...(imageBase64 ? { images: [imageBase64] } : {}),
    },
  ];

  const response = await axios.post(
    `${OLLAMA_BASE}/api/chat`,
    {
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      format: 'json',
      options: {
        num_gpu: -1,        // offload all layers to GPU (RTX 4050)
        num_thread: 8,      // CPU threads for overflow layers
        low_vram: false,    // don't throttle VRAM usage
        f16_kv: true,       // half-precision KV cache — halves KV RAM usage
        num_ctx: 768,       // small context window to stay within ~4GB free RAM
      },
    },
    { timeout: 180000 }
  );

  return response.data.message.content;
}

// JSON schema passed to Gemma 4 at generation time — constrains model output at the token level,
// so the model cannot emit structurally invalid JSON. Combined with Zod, this gives two-layer
// validation: schema-constrained generation (model level) + semantic validation (application level).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    severity:        { type: 'string', enum: ['CRITICAL', 'MODERATE', 'SELF_TREAT'] },
    urgencyHours:    { type: 'number', nullable: true },
    likelyCauses:    { type: 'array',  items: { type: 'string' }, maxItems: 3 },
    explanation:     { type: 'string' },
    immediateActions:{ type: 'array',  items: { type: 'string' }, maxItems: 5 },
    referralRequired:{ type: 'boolean' },
  },
  required: ['severity', 'urgencyHours', 'likelyCauses', 'explanation', 'immediateActions', 'referralRequired'],
};

async function callGoogleAI(symptoms, language, imageBase64, imageMimeType) {
  if (!GOOGLE_API_KEY || GOOGLE_API_KEY === 'your_google_ai_key_here') {
    throw new Error('Google AI API key not configured. Set GOOGLE_AI_API_KEY in .env');
  }

  const ai = new GoogleGenAI({ apiKey: GOOGLE_API_KEY });

  const contents = [];

  if (imageBase64) {
    contents.push({ inlineData: { mimeType: imageMimeType || 'image/jpeg', data: imageBase64 } });
  }

  contents.push({ text: `${SYSTEM_PROMPT}\n\n${buildUserPrompt(symptoms, language)}` });

  const response = await ai.models.generateContent({
    model: GOOGLE_MODEL,
    contents: [{ role: 'user', parts: contents }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,   // schema-constrained generation (Gemma 4 feature)
    },
  });

  return response.text;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get('/api/health', async (req, res) => {
  let ollamaOnline = false;
  try {
    await axios.get(`${OLLAMA_BASE}/api/tags`, { timeout: 3000 });
    ollamaOnline = true;
  } catch (_) {}
  res.json({ status: 'ok', mode: MODE, ollamaOnline, model: MODE === 'local' ? OLLAMA_MODEL : GOOGLE_MODEL });
});

app.get('/api/languages', (_req, res) => {
  res.json({
    languages: [
      { code: 'en', label: 'English', rtl: false },
      { code: 'es', label: 'Español', rtl: false },
      { code: 'fr', label: 'Français', rtl: false },
      { code: 'hi', label: 'हिन्दी', rtl: false },
      { code: 'sw', label: 'Kiswahili', rtl: false },
    ],
  });
});

app.post('/api/triage', upload.single('image'), async (req, res) => {
  const { symptoms, language = 'en' } = req.body;

  if (!symptoms || symptoms.trim().length < 5) {
    return res.status(400).json({ error: 'symptoms required (min 5 characters)' });
  }

  let imageBase64 = null;
  let imageMimeType = null;

  if (req.file) {
    // Resize image to max 512x512 to keep within model context
    const resized = await sharp(req.file.buffer)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();
    imageBase64 = resized.toString('base64');
    imageMimeType = 'image/jpeg';
  }

  let rawResponse;
  let modelUsed;

  try {
    if (MODE === 'local') {
      rawResponse = await callOllama(symptoms, language, imageBase64, imageMimeType);
      modelUsed = `ollama-local (${OLLAMA_MODEL})`;
    } else {
      rawResponse = await callGoogleAI(symptoms, language, imageBase64, imageMimeType);
      modelUsed = `google-ai (${GOOGLE_MODEL})`;
    }

    const result = await parseGemmaJSON(rawResponse);
    const DISCLAIMER =
      'This AI triage is for guidance only. It is NOT a medical diagnosis. Always consult a qualified healthcare professional for medical decisions, especially in emergencies.';

    return res.json({ ...result, disclaimer: DISCLAIMER, modelUsed, requestId: uuidv4() });
  } catch (err) {
    console.error('[triage error]', err.message);
    // Attempt fallback to Google AI if local failed
    if (MODE === 'local' && GOOGLE_API_KEY && GOOGLE_API_KEY !== 'your_google_ai_key_here') {
      try {
        rawResponse = await callGoogleAI(symptoms, language, imageBase64, imageMimeType);
        modelUsed = `google-ai-fallback (${GOOGLE_MODEL})`;
        const result = await parseGemmaJSON(rawResponse);
        const DISCLAIMER = 'This AI triage is for guidance only. It is NOT a medical diagnosis. Always consult a qualified healthcare professional.';
        return res.json({ ...result, disclaimer: DISCLAIMER, modelUsed, requestId: uuidv4() });
      } catch (fallbackErr) {
        return res.status(500).json({ error: 'inference failed', detail: fallbackErr.message });
      }
    }
    return res.status(500).json({ error: 'inference failed', detail: err.message });
  }
});

const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, '0.0.0.0', () => console.log(`MediVoice backend running on port ${PORT} [mode: ${MODE}]`));

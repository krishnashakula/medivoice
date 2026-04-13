# MediVoice 🏥

> AI-powered offline medical triage for community health workers in remote areas.  
> Built with **Gemma 4** (local via Ollama or cloud via Google AI Studio).

**Live Demo:** https://medivoice-app.vercel.app  
**Kaggle Hackathon:** Gemma 4 Good 2026

---

## Features

- 📸 **Photo capture** — upload or snap wound/rash photos
- 🌍 **5 languages** — English, Español, Français, Hindi, Kiswahili
- 🔴🟡🟢 **Severity triage** — CRITICAL / MODERATE / SELF-TREAT
- 🖨️ **Print referral card** — for patients without smartphones
- 📴 **PWA / offline** — installable, works without network
- 🔒 **Local-first** — Gemma 4 runs on-device via Ollama (RTX GPU)

---

## Quick Start

### Prerequisites
- [Ollama](https://ollama.com) installed + `ollama pull gemma4:e4b`
- Node.js 20+

### Backend
```bash
cd backend
cp .env.example .env          # add GOOGLE_AI_API_KEY if using cloud mode
npm install
npm run dev                   # http://localhost:3001
```

### Frontend
```bash
cd frontend
npm install --legacy-peer-deps
npm run dev                   # http://localhost:5173
```

---

## Deploy

### Frontend → Vercel
```bash
cd frontend
npx vercel --prod
```

### Backend → Railway
1. Go to https://railway.app/new
2. **Deploy from GitHub repo** → select `krishnashakula/medivoice`
3. Set **Root Directory** → `backend`
4. Add env vars:
   ```
   MODE=cloud
   GOOGLE_AI_API_KEY=<your key>
   GOOGLE_AI_MODEL=gemma-2-9b-it
   ALLOWED_ORIGINS=https://medivoice-app.vercel.app
   ```
5. Set **Start Command** → `node server.js`

---

## Architecture

```
Browser (PWA)
    │  /api/*
    ▼
Vercel (frontend) ─── proxy ──► Railway (backend :3001)
                                    │
                         ┌──────────┴──────────┐
                    Ollama :11434          Google AI Studio
                  gemma4:e4b (local)    gemma-4-27b-it (cloud)
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite 8 + React 18 + TypeScript + React Compiler |
| Styling | Tailwind CSS v4 |
| i18n | react-i18next (5 languages inline) |
| PWA | vite-plugin-pwa + Workbox |
| Backend | Express v5 (ESM) + Multer + Sharp |
| AI | Gemma 4 via Ollama (local) or Google AI Studio (cloud) |
| Validation | Zod schema on Gemma 4 JSON output |
| Print | react-to-print referral card |

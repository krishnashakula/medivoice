# MediVoice — Video Pitch Script
**Target runtime: 2:30 — 3:00**  
**Format: Screen recording + voiceover + subtitles strongly recommended**

---

## SCENE 1: COLD OPEN (0:00 – 0:18)
*[Visual: Dark background. A single sentence fades in, word by word.]*

**VOICEOVER:**  
"The nearest doctor…"  
*pause*  
"…is three hours away."

*[Visual: Map dot blinking in rural Rajasthan — no roads, no clinic icon within 100km.]*

**VOICEOVER:**  
"For 400 million people, this is not a statistic. It's today."

*[Fade to black. MediVoice logo appears.]*

---

## SCENE 2: THE PROBLEM (0:18 – 0:45)
*[Visual: Montage — a community health worker at a doorstep, a child with visible illness, a smartphone screen with nothing useful on it. No narration. Music only — quiet, serious.]*

**VOICEOVER:**  
"Community health workers see thousands of patients a year. They are trained, dedicated, and carry the only health infrastructure these communities will ever know.

But when a child presents with a rash and a stiff neck at 2 AM, they face a decision with no tools to support it. Is this safe to manage here — or is this a race against meningococcal septicemia?

Without structured support, they guess. And sometimes, the wrong guess kills."

---

## SCENE 3: INTRODUCING MEDIVOICE (0:45 – 1:10)
*[Visual: App opens on a smartphone. Clean, modern UI. Step indicator: Photo / Symptoms / Result.]*

**VOICEOVER:**  
"MediVoice is a medical triage assistant built for the last mile. It runs as a Progressive Web App — no app store, no installation. It works offline. It works in Hindi. It works in Swahili.

And it runs on Gemma 4."

*[Visual: User taps the language selector → switches to Hindi. UI instantly updates.]*

---

## SCENE 4: LIVE DEMO (1:10 – 2:00)
*[Screen recording — no cuts, continuous flow.]*

**[Beat 1: Photo Capture]**  
*[Visual: Camera captures a wound photo → attachment confirmed with green indicator.]*

**VOICEOVER:**  
"The health worker photographs the patient's condition. MediVoice accepts it alongside the symptom description."

**[Beat 2: Voice Input]**  
*[Visual: Mic button tapped → red pulse → health worker speaks → transcript appears in real time.]*  
*[Spoken in demo]: "Patient has fever 39.8 degrees, rash spreading from arms to chest, headache, stiff neck, started this morning."*

**VOICEOVER:**  
"Voice input. No typing required in the field. Powered by the browser's native speech engine — no external API, no data sent to a third party."

**[Beat 3: Triage in Progress]**  
*[Visual: Spinner + "Analyzing via Gemma 4 cloud" message.]*

**[Beat 4: Result Card appears — CRITICAL, red banner, immediate actions listed.]*  
*[Visual: Hold for 4 seconds — let judges read it.]*

**VOICEOVER:**  
"CRITICAL. Immediate evacuation. Possible meningococcal disease. Five immediate actions — written in the health worker's language, ready to act on right now."

**[Beat 5: Print Card]**  
*[Visual: Print button → browser print dialog → clean triage card with Case ID.]*

**VOICEOVER:**  
"Print. The patient carries this to the district clinic. No clipboard, no handwritten note, no lost information."

---

## SCENE 5: UNDER THE HOOD — GEMMA 4 (2:00 – 2:25)
*[Visual: Split screen — code on the left, result on the right. Light syntax highlighting.]*

**VOICEOVER:**  
"MediVoice uses three Gemma 4 capabilities that no prior open model made practical in a field deployment.

First: **schema-constrained generation**. We pass a `responseSchema` directly to the model — Gemma 4 cannot emit structurally invalid JSON. Combined with Zod server-side validation, we have two independent layers between the model and the UI. In medical software, silent data corruption is not an option.

Second: **multimodal vision**. The photograph and symptoms are passed to Gemma 4 together. A rash that looks viral in text looks petechial in the image — Gemma 4 sees both.

Third: **split-language instruction following**. The system prompt instructs Gemma 4 to write the explanation in Hindi but keep structured fields in English for programmatic parsing. One instruction. Two languages. Reliable every time."

---

## SCENE 6: IMPACT VISION (2:25 – 2:45)
*[Visual: Three scenarios shown as simple card graphics, no text-heavy animations.]*

**Card 1:** Mini-PC at a rural health post → offline → Gemma 4 running locally → no data leaves the village  
**Card 2:** 50 CHWs on smartphones across a district → single Railway deployment → $3/month  
**Card 3:** MediVoice REST API → connected to national health worker system → triage data aggregated for district health officers

**VOICEOVER:**  
"MediVoice runs where it needs to — offline on solar-powered hardware, cloud-connected for a regional hub, or as an API node in a national health system.

Same code. Same model family. One environment variable."

---

## SCENE 7: CLOSE (2:45 – 3:00)
*[Visual: Live app URL. GitHub repo URL. Logo.]*

**VOICEOVER:**  
"MediVoice doesn't replace doctors.

It makes sure the right patients get to doctors — in time.

Try it now: medivoice-app.vercel.app"

*[Fade to black. MediVoice logo holds for 3 seconds.]*

---

## PRODUCTION NOTES

**Voice:** Calm, measured, deliberate. Not a product pitch — a human story with a technical spine.  
**Music:** Minimal. Recommended: sparse piano or acoustic instrumental. Drop music entirely during the demo segment.  
**Subtitles:** Required. Some judges will watch without sound.  
**Runtime target:** 2:45 — never exceed 3:00.  
**Demo device:** Record on a real Android phone OR use a phone frame in browser DevTools (mobile responsive view). Authenticity matters.  
**No slides:** The app IS the demo. Let the UI do the work. Judges can fast-forward slides; they cannot ignore a working product.

## KEY MESSAGES TO LAND (one per scene)
1. Cold open → **The problem is real and enormous** (400M people)
2. Montage → **CHWs are the last line — without tools** (emotional gravity)
3. Intro → **This runs offline, in their language, on their phone** (feasibility)
4. Demo → **It's real, it works, it's fast** (technical credibility)
5. Under the hood → **Three Gemma 4 features, used specifically** (technical depth)
6. Impact → **Three deployment realities, one codebase** (scalability)
7. Close → **Mission statement in 11 words** (memorability)

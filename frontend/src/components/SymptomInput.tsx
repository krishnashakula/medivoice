// FILE: src/components/SymptomInput.tsx
import { useState, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Stethoscope, Loader2, Mic, MicOff } from 'lucide-react';
import type { TriageResult } from '../types';

interface SymptomInputProps {
  imageFile: File | null;
  modelMode: 'local' | 'cloud';
  onBack: () => void;
  onResult: (result: TriageResult) => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
  interface SpeechRecognition extends EventTarget {
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start(): void;
    stop(): void;
    onresult: ((e: SpeechRecognitionEvent) => void) | null;
    onerror: ((e: Event) => void) | null;
    onend: (() => void) | null;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
  }
}

export function SymptomInput({ imageFile, modelMode, onBack, onResult }: SymptomInputProps) {
  const { t, i18n } = useTranslation();
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const MAX = 500;

  const toggleVoice = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setError('Voice input not supported in this browser.');
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const rec = new SR();
    rec.lang = i18n.language || 'en-US';
    rec.continuous = true;
    rec.interimResults = false;

    rec.onresult = (e) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
        .join(' ');
      setSymptoms((prev) => (prev + ' ' + transcript).trim().slice(0, MAX));
    };

    rec.onerror = () => { setListening(false); };
    rec.onend = () => { setListening(false); };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [listening, i18n.language]);

  const handleAnalyze = async () => {
    if (!symptoms.trim()) { setError(t('errorRequired')); return; }
    if (symptoms.trim().length < 10) { setError(t('errorMinLength')); return; }
    setError('');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('symptoms', symptoms.trim());
      formData.append('language', i18n.language);
      if (imageFile) formData.append('image', imageFile);

      const res = await fetch('/api/triage', { method: 'POST', body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      const data: TriageResult = await res.json();
      onResult(data);
    } catch (err) {
      console.error(err);
      setError(t('errorServer'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{t('step2Title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('step2Sub')}</p>
      </div>

      {imageFile && (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm px-3 py-2 rounded-lg">
          <span>📷</span>
          <span className="font-medium">{imageFile.name}</span>
          <span className="text-emerald-500">attached</span>
        </div>
      )}

      {/* Voice button + textarea */}
      <div className="relative">
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value.slice(0, MAX))}
          placeholder={listening ? '🎤 Listening… speak now' : t('symptomsPlaceholder')}
          rows={5}
          disabled={loading}
          className={`w-full border-2 rounded-xl p-4 pr-14 text-gray-800 text-sm placeholder-gray-400 focus:outline-none resize-none transition-colors disabled:opacity-60 ${
            listening ? 'border-red-400 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500'
          }`}
        />
        {/* char count */}
        <span className={`absolute bottom-3 right-3 text-xs ${symptoms.length > MAX * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
          {symptoms.length}/{MAX}
        </span>
        {/* mic button */}
        <button
          type="button"
          onClick={toggleVoice}
          disabled={loading}
          title={listening ? 'Stop recording' : 'Speak symptoms'}
          className={`absolute top-3 right-3 p-2 rounded-lg transition-colors disabled:opacity-40 ${
            listening
              ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
              : 'bg-gray-100 text-gray-500 hover:bg-emerald-100 hover:text-emerald-600'
          }`}
        >
          {listening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      </div>

      {listening && (
        <div className="flex items-center gap-2 text-red-600 text-xs font-medium">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          Recording… tap mic again to stop
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {loading && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-4 flex items-center gap-3">
          <Loader2 size={20} className="text-emerald-600 animate-spin flex-shrink-0" />
          <div>
            <p className="text-emerald-800 font-semibold text-sm">{t('analyzing')}</p>
            <p className="text-emerald-600 text-xs mt-0.5">
              {modelMode === 'local'
                ? 'Gemma 4 running locally — no data leaves this device'
                : 'Analyzing via Gemma 4 cloud — results sent securely over HTTPS'}
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-3.5 border-2 border-gray-200 text-gray-600 font-semibold rounded-xl hover:border-gray-300 hover:bg-gray-50 disabled:opacity-40 transition-colors"
        >
          <ArrowLeft size={18} />
          {t('backBtn')}
        </button>
        <button
          onClick={handleAnalyze}
          disabled={loading || symptoms.trim().length < 10}
          className="flex-1 bg-emerald-600 text-white font-semibold py-3.5 rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Stethoscope size={18} />
          )}
          {t('analyzeBtn')}
        </button>
      </div>
    </div>
  );
}

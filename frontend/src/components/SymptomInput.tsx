// FILE: src/components/SymptomInput.tsx
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Stethoscope, Loader2 } from 'lucide-react';
import type { TriageResult } from '../types';

interface SymptomInputProps {
  imageFile: File | null;
  onBack: () => void;
  onResult: (result: TriageResult) => void;
}

export function SymptomInput({ imageFile, onBack, onResult }: SymptomInputProps) {
  const { t, i18n } = useTranslation();
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const MAX = 500;

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

      <div className="relative">
        <textarea
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value.slice(0, MAX))}
          placeholder={t('symptomsPlaceholder')}
          rows={5}
          disabled={loading}
          className="w-full border-2 border-gray-200 rounded-xl p-4 text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:border-emerald-500 resize-none transition-colors disabled:opacity-60"
        />
        <span className={`absolute bottom-3 right-3 text-xs ${symptoms.length > MAX * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
          {symptoms.length}/{MAX}
        </span>
      </div>

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
            <p className="text-emerald-600 text-xs mt-0.5">Gemma 4 running locally — no data leaves this device</p>
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

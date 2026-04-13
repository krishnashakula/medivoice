// FILE: src/App.tsx
import { useState, useEffect } from 'react';
import './i18n';
import { Header } from './components/Header';
import { PhotoCapture } from './components/PhotoCapture';
import { SymptomInput } from './components/SymptomInput';
import { TriageResult } from './components/TriageResult';
import type { WizardStep, TriageResult as TriageResultType } from './types';

function StepIndicator({ current }: { current: WizardStep }) {
  const steps: WizardStep[] = ['capture', 'symptoms', 'result'];
  const labels = ['Photo', 'Symptoms', 'Result'];
  const currentIdx = steps.indexOf(current);

  return (
    <div className="flex items-center gap-1 py-4">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center flex-1">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              i < currentIdx
                ? 'bg-emerald-600 text-white'
                : i === currentIdx
                ? 'bg-emerald-600 text-white ring-4 ring-emerald-100'
                : 'bg-gray-200 text-gray-500'
            }`}
          >
            {i < currentIdx ? '✓' : i + 1}
          </div>
          <span className={`ml-1.5 text-xs font-medium hidden sm:block ${i === currentIdx ? 'text-emerald-700' : 'text-gray-400'}`}>
            {labels[i]}
          </span>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-px mx-2 ${i < currentIdx ? 'bg-emerald-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [step, setStep] = useState<WizardStep>('capture');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [result, setResult] = useState<TriageResultType | null>(null);
  const [modelMode, setModelMode] = useState<'local' | 'cloud'>('local');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setModelMode(d.mode === 'local' ? 'local' : 'cloud'))
      .catch(() => {});
  }, []);

  const handleReset = () => {
    setStep('capture');
    setImageFile(null);
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header isOnline={isOnline} modelMode={modelMode} />

      <main className="max-w-2xl mx-auto px-4 pb-12">
        <StepIndicator current={step} />

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          {step === 'capture' && (
            <PhotoCapture
              onCapture={setImageFile}
              onNext={() => setStep('symptoms')}
            />
          )}
          {step === 'symptoms' && (
            <SymptomInput
              imageFile={imageFile}
              modelMode={modelMode}
              onBack={() => setStep('capture')}
              onResult={(r) => { setResult(r); setStep('result'); }}
            />
          )}
          {step === 'result' && result && (
            <TriageResult result={result} onReset={handleReset} />
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          MediVoice · Gemma 4 Good Hackathon · Health &amp; Sciences Track
        </p>
      </main>
    </div>
  );
}


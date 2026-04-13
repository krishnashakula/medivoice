// FILE: src/components/TriageResult.tsx
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useReactToPrint } from 'react-to-print';
import { AlertTriangle, AlertCircle, CheckCircle, Printer, RotateCcw, Info } from 'lucide-react';
import { clsx } from 'clsx';
import type { TriageResult as TriageResultType, Severity } from '../types';

interface TriageResultProps {
  result: TriageResultType;
  onReset: () => void;
}

const SEVERITY_CONFIG: Record<Severity, { bg: string; border: string; text: string; icon: typeof AlertTriangle; badgeBg: string; badgeText: string }> = {
  CRITICAL: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    text: 'text-red-800',
    icon: AlertTriangle,
    badgeBg: 'bg-red-600',
    badgeText: 'text-white',
  },
  MODERATE: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    text: 'text-amber-800',
    icon: AlertCircle,
    badgeBg: 'bg-amber-500',
    badgeText: 'text-white',
  },
  SELF_TREAT: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    text: 'text-emerald-800',
    icon: CheckCircle,
    badgeBg: 'bg-emerald-600',
    badgeText: 'text-white',
  },
};

function UrgencyLabel({ urgencyHours }: { urgencyHours: number | null }) {
  const { t } = useTranslation();
  if (urgencyHours === null) return <span>{t('urgency_immediate')}</span>;
  if (urgencyHours <= 24) return <span>{t('urgency_hours', { hours: urgencyHours })}</span>;
  return <span>{t('urgency_week')}</span>;
}

export function TriageResult({ result, onReset }: TriageResultProps) {
  const { t } = useTranslation();
  const printRef = useRef<HTMLDivElement>(null);
  const config = SEVERITY_CONFIG[result.severity];
  const SeverityIcon = config.icon;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `MediVoice-Triage-${result.requestId.slice(0, 8)}`,
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Printable content */}
      <div ref={printRef}>
        {/* Severity Banner */}
        <div className={clsx('rounded-2xl border-2 p-5', config.bg, config.border)}>
          <div className="flex items-center gap-3 mb-3">
            <SeverityIcon size={28} className={config.text} />
            <div>
              <span className={clsx('text-xs font-bold uppercase tracking-widest', config.text)}>Triage Result</span>
              <div className={clsx('text-2xl font-black mt-0.5', config.text)}>
                {t(`severity_${result.severity}`)}
              </div>
            </div>
          </div>
          <div className={clsx('font-semibold text-base', config.text)}>
            <UrgencyLabel urgencyHours={result.urgencyHours} />
          </div>
          {result.referralRequired && (
            <div className={clsx('mt-2 text-sm font-medium flex items-center gap-1.5', config.text)}>
              <Info size={14} />
              {t('referralRequired')}
            </div>
          )}
        </div>

        {/* Likely Causes */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-4">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">{t('likelyCauses')}</h3>
          <ul className="flex flex-wrap gap-2">
            {result.likelyCauses.map((cause, i) => (
              <li key={i} className="bg-gray-100 text-gray-700 text-sm px-3 py-1.5 rounded-full font-medium">
                {cause}
              </li>
            ))}
          </ul>
        </div>

        {/* Explanation */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2">{t('explanation')}</h3>
          <p className="text-gray-700 text-sm leading-relaxed">{result.explanation}</p>
        </div>

        {/* Immediate Actions */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 mt-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3">{t('immediateActions')}</h3>
          <ol className="flex flex-col gap-2">
            {result.immediateActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="flex-shrink-0 bg-emerald-100 text-emerald-700 font-bold text-xs w-5 h-5 rounded-full flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                {action}
              </li>
            ))}
          </ol>
        </div>

        {/* Disclaimer */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3 flex gap-2">
          <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-amber-800 text-xs leading-relaxed">{result.disclaimer}</p>
        </div>

        {/* Print footer — only visible when printing */}
        <div className="hidden print:block mt-6 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
          MediVoice · Powered by Gemma 4 · Case ID: {result.requestId.slice(0, 8)} ·{' '}
          {new Date().toLocaleDateString()} · {result.modelUsed}
        </div>
      </div>

      {/* Action buttons (not printed) */}
      <div className="flex gap-3 print:hidden">
        <button
          onClick={() => handlePrint()}
          className="flex-1 flex items-center justify-center gap-2 border-2 border-emerald-600 text-emerald-700 font-semibold py-3.5 rounded-xl hover:bg-emerald-50 transition-colors"
        >
          <Printer size={18} />
          {t('printCard')}
        </button>
        <button
          onClick={onReset}
          className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 font-semibold py-3.5 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <RotateCcw size={18} />
          {t('newCase')}
        </button>
      </div>

      {/* Model attribution */}
      <p className="text-center text-xs text-gray-400 print:hidden">
        Analyzed by <span className="font-mono">{result.modelUsed}</span>
      </p>
    </div>
  );
}

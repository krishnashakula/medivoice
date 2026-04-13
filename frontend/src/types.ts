// FILE: src/types.ts
export type Severity = 'CRITICAL' | 'MODERATE' | 'SELF_TREAT';

export interface TriageResult {
  requestId: string;
  severity: Severity;
  urgencyHours: number | null;
  likelyCauses: string[];
  explanation: string;
  immediateActions: string[];
  referralRequired: boolean;
  disclaimer: string;
  modelUsed: string;
}

export interface Language {
  code: string;
  label: string;
  rtl: boolean;
}

export type WizardStep = 'capture' | 'symptoms' | 'result';

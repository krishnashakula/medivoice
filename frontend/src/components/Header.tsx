// FILE: src/components/Header.tsx
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { clsx } from 'clsx';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'sw', label: 'Kiswahili' },
];

interface HeaderProps {
  isOnline: boolean;
  modelMode: 'local' | 'cloud';
}

export function Header({ isOnline: _isOnline, modelMode }: HeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 text-white p-1.5 rounded-lg">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none">{t('appName')}</h1>
            <p className="text-xs text-gray-500 leading-none mt-0.5">Gemma 4 · Health &amp; Sciences</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode badge */}
          <div
            className={clsx(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              modelMode === 'local'
                ? 'bg-amber-100 text-amber-800'
                : 'bg-blue-100 text-blue-800'
            )}
          >
            {modelMode === 'local' ? <WifiOff size={12} /> : <Wifi size={12} />}
            {modelMode === 'local' ? 'LOCAL' : 'CLOUD'}
          </div>

          {/* Language selector */}
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </header>
  );
}

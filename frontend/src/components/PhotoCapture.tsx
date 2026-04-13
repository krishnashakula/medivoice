// FILE: src/components/PhotoCapture.tsx
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Upload, RotateCcw, ArrowRight, X } from 'lucide-react';

interface PhotoCaptureProps {
  onCapture: (file: File | null) => void;
  onNext: () => void;
}

export function PhotoCapture({ onCapture, onNext }: PhotoCaptureProps) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
    setCapturedFile(file);
    onCapture(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleCameraCapture = () => {
    // Trigger file input with camera capture on mobile
    if (fileInputRef.current) {
      fileInputRef.current.setAttribute('capture', 'environment');
      fileInputRef.current.click();
    }
  };

  const handleUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.removeAttribute('capture');
      fileInputRef.current.click();
    }
  };

  const handleClear = () => {
    setPreview(null);
    setCapturedFile(null);
    onCapture(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSkip = () => {
    onCapture(null);
    onNext();
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{t('step1Title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('step1Sub')}</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInput}
      />

      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt="Captured"
            className="w-full max-h-72 object-contain rounded-2xl border-2 border-emerald-200 bg-gray-50"
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 bg-white rounded-full p-1.5 shadow-md text-gray-500 hover:text-red-500 transition-colors"
          >
            <X size={16} />
          </button>
          <div className="absolute bottom-2 left-2 right-2 flex gap-2 justify-center">
            <button
              onClick={handleUpload}
              className="flex items-center gap-1.5 bg-white/90 backdrop-blur text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full shadow hover:bg-white transition-colors"
            >
              <RotateCcw size={14} />
              {t('retakePhoto')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCameraCapture}
            className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all group"
          >
            <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full group-hover:bg-emerald-200 transition-colors">
              <Camera size={24} />
            </div>
            <span className="text-sm font-medium text-gray-700">{t('takePhoto')}</span>
          </button>

          <button
            onClick={handleUpload}
            className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-gray-300 rounded-2xl hover:border-blue-400 hover:bg-blue-50 transition-all group"
          >
            <div className="bg-blue-100 text-blue-600 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
              <Upload size={24} />
            </div>
            <span className="text-sm font-medium text-gray-700">{t('uploadPhoto')}</span>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <button
          onClick={onNext}
          disabled={!capturedFile}
          className="w-full bg-emerald-600 text-white font-semibold py-3.5 rounded-xl hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {t('continueBtn')} <ArrowRight size={18} />
        </button>
        <button
          onClick={handleSkip}
          className="w-full text-gray-500 text-sm py-2 hover:text-gray-700 transition-colors"
        >
          {t('skipPhoto')}
        </button>
      </div>
    </div>
  );
}

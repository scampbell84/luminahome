import React, { useState } from 'react';
import { Lock, X, Check, Delete } from 'lucide-react';
import { playErrorBuzzer } from '../../utils/soundEffects';

interface ParentPinModalProps {
  title?: string;
  description?: string;
  expectedPin: string;
  parentNames?: string[];
  activeParent?: string;
  onSuccess: (approvedByParent?: string) => void;
  onCancel: () => void;
}

export const ParentPinModal: React.FC<ParentPinModalProps> = ({
  title = 'Parent Approval Required',
  description = 'Enter your 4-digit Parent PIN to approve this action.',
  expectedPin,
  parentNames = ['Mom', 'Dad'],
  activeParent,
  onSuccess,
  onCancel,
}) => {
  const [pin, setPin] = useState<string>('');
  const [errorShake, setErrorShake] = useState<boolean>(false);
  const [selectedParent, setSelectedParent] = useState<string>(activeParent || parentNames[0] || 'Mom');

  const handleDigit = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);

    // Auto-verify once 4 digits entered
    if (newPin.length === 4) {
      if (newPin === (expectedPin || '1234')) {
        setTimeout(() => onSuccess(selectedParent), 150);
      } else {
        playErrorBuzzer();
        setErrorShake(true);
        setTimeout(() => {
          setPin('');
          setErrorShake(false);
        }, 600);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className={`w-full max-w-sm bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center ${
          errorShake ? 'animate-shake' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 mb-3 shadow-lg">
          <Lock className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
        <p className="text-xs text-slate-300 mt-1 max-w-xs">{description}</p>

        {/* Approving Parent Selector */}
        {parentNames && parentNames.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3 px-2 py-1 rounded-xl bg-white/5 border border-white/10 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">Approving:</span>
            {parentNames.map((pName) => {
              const isSelected = selectedParent === pName;
              return (
                <button
                  key={pName}
                  type="button"
                  onClick={() => setSelectedParent(pName)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {pName}
                </button>
              );
            })}
          </div>
        )}

        {/* PIN Indicators */}
        <div className="flex items-center gap-3 my-4">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = idx < pin.length;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  isFilled
                    ? 'bg-amber-400 scale-125 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                    : 'bg-white/20 border border-white/30'
                }`}
              />
            );
          })}
        </div>

        {/* Touch Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-amber-500/40 border border-white/10 text-white font-bold text-2xl flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
            >
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-slate-400 text-xs font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-amber-500/40 border border-white/10 text-white font-bold text-2xl flex items-center justify-center transition-all cursor-pointer shadow-md active:scale-95"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 active:bg-white/20 border border-white/10 text-slate-400 flex items-center justify-center transition-all cursor-pointer active:scale-95"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Cancel Button */}
        <button
          type="button"
          onClick={onCancel}
          className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white/80 hover:text-white font-semibold text-xs tracking-wide transition-colors cursor-pointer"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

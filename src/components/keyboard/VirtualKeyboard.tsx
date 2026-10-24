import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Delete,
  CornerDownLeft,
  ArrowUp,
  Lock,
  Globe,
  Sparkles,
  Volume2,
  VolumeX,
  Keyboard as KeyboardIcon,
} from 'lucide-react';

/**
 * Safely updates an input or textarea value in a way that React's synthetic
 * event system recognizes (overcoming React's controlled input value overriding).
 */
export function setNativeInputValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string
) {
  const valueSetter = Object.getOwnPropertyDescriptor(element, 'value')?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  // Dispatch standard events that React listens to
  element.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
  element.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
}

/**
 * Synthesize a soft tactile keyboard click sound using Web Audio API
 */
let audioCtx: AudioContext | null = null;
function playKeyClickSound(frequency = 1200, duration = 0.012) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, audioCtx.currentTime + duration);

    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch {
    // Audio context not allowed or failed
  }
}

/**
 * Infer human-friendly label for the focused input field
 */
function inferFieldLabel(element: HTMLInputElement | HTMLTextAreaElement): string {
  // 1. Explicit aria-label or title
  if (element.getAttribute('aria-label')) {
    return element.getAttribute('aria-label')!;
  }
  if (element.title) {
    return element.title;
  }

  // 2. Associated label[for="..."]
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label && label.textContent?.trim()) {
      return label.textContent.trim();
    }
  }

  // 3. Parent label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    const textNodes = Array.from(parentLabel.childNodes)
      .filter((n) => n.nodeType === Node.TEXT_NODE)
      .map((n) => n.textContent?.trim())
      .filter(Boolean)
      .join(' ');
    if (textNodes) return textNodes;
  }

  // 4. Preceding sibling label or span
  const prev = element.previousElementSibling;
  if (prev && ['LABEL', 'SPAN', 'DIV', 'H3', 'H4', 'P'].includes(prev.tagName)) {
    const txt = prev.textContent?.trim();
    if (txt && txt.length < 35) return txt;
  }

  // 5. Placeholder
  if (element.placeholder) {
    return element.placeholder;
  }

  // 6. Name or ID formatted
  const rawId = element.name || element.id;
  if (rawId) {
    const formatted = rawId
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2');
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }

  return element.tagName === 'TEXTAREA' ? 'Text Note' : 'Text Field';
}

interface VirtualKeyboardProps {
  enabled?: boolean;
  soundEnabled?: boolean;
}

export const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({
  enabled = true,
  soundEnabled = true,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeElement, setActiveElement] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [fieldLabel, setFieldLabel] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');
  const [isShift, setIsShift] = useState<boolean>(false);
  const [isCapsLock, setIsCapsLock] = useState<boolean>(false);
  const [mode, setMode] = useState<'alpha' | 'symbols' | 'more_symbols'>('alpha');
  const [soundOn, setSoundOn] = useState<boolean>(soundEnabled);
  const [lastShiftClickTime, setLastShiftClickTime] = useState<number>(0);

  const keyboardRef = useRef<HTMLDivElement | null>(null);
  const backspaceTimerRef = useRef<any>(null);

  // Keep track of sound state
  useEffect(() => {
    setSoundOn(soundEnabled);
  }, [soundEnabled]);

  // Handle focusin on any input or textarea on the page
  useEffect(() => {
    if (!enabled) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore if clicking inside the keyboard itself
      if (keyboardRef.current && keyboardRef.current.contains(target)) {
        return;
      }

      const isInput = target instanceof HTMLInputElement;
      const isTextArea = target instanceof HTMLTextAreaElement;

      if (!isInput && !isTextArea) return;

      const input = target as HTMLInputElement | HTMLTextAreaElement;

      // Filter out non-text inputs
      if (isInput) {
        const inputType = (input as HTMLInputElement).type?.toLowerCase();
        const nonTextTypes = ['checkbox', 'radio', 'file', 'button', 'submit', 'reset', 'color', 'range', 'hidden'];
        if (nonTextTypes.includes(inputType)) {
          return;
        }
      }

      // Check if disabled or readonly
      if (input.disabled || input.readOnly) return;

      // Set active field and open keyboard
      setActiveElement(input);
      setFieldLabel(inferFieldLabel(input));
      setCurrentValue(input.value || '');
      setIsOpen(true);

      // Auto-switch mode based on input type
      if (isInput) {
        const inputType = (input as HTMLInputElement).type?.toLowerCase();
        if (inputType === 'number' || inputType === 'tel') {
          setMode('symbols');
        } else {
          setMode('alpha');
        }
      }

      // Smoothly scroll the input into view if needed
      setTimeout(() => {
        try {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {}
      }, 120);
    };

    // Keep current value synchronized when external typing happens
    const handleInputSync = (e: Event) => {
      if (activeElement && e.target === activeElement) {
        setCurrentValue(activeElement.value || '');
      }
    };

    document.addEventListener('focusin', handleFocusIn, true);
    document.addEventListener('input', handleInputSync, true);

    return () => {
      document.removeEventListener('focusin', handleFocusIn, true);
      document.removeEventListener('input', handleInputSync, true);
    };
  }, [enabled, activeElement]);

  // Click outside detection: close keyboard if tapping outside inputs & keyboard
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // If clicking inside the keyboard container, do nothing
      if (keyboardRef.current && keyboardRef.current.contains(target)) {
        return;
      }

      // If clicking on an input or textarea, let the focusin handler manage it
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        return;
      }

      // If clicking outside, close keyboard
      setIsOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen]);

  // Key press sound
  const playClick = useCallback(
    (freq = 1200) => {
      if (soundOn) {
        playKeyClickSound(freq);
      }
    },
    [soundOn]
  );

  // Insert text at cursor position
  const insertText = useCallback(
    (str: string) => {
      playClick(1300);
      if (!activeElement) return;

      const el = activeElement;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const current = el.value || '';
      const next = current.slice(0, start) + str + current.slice(end);

      setNativeInputValue(el, next);
      setCurrentValue(next);

      const nextPos = start + str.length;
      try {
        el.setSelectionRange(nextPos, nextPos);
      } catch {}

      // If Shift was on (and not Caps Lock), turn off Shift after 1 character
      if (isShift && !isCapsLock) {
        setIsShift(false);
      }
    },
    [activeElement, isShift, isCapsLock, playClick]
  );

  // Backspace handler
  const handleBackspace = useCallback(() => {
    playClick(850);
    if (!activeElement) return;

    const el = activeElement;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const current = el.value || '';

    if (start === end) {
      if (start === 0) return;
      const next = current.slice(0, start - 1) + current.slice(end);
      setNativeInputValue(el, next);
      setCurrentValue(next);
      const nextPos = start - 1;
      try {
        el.setSelectionRange(nextPos, nextPos);
      } catch {}
    } else {
      const next = current.slice(0, start) + current.slice(end);
      setNativeInputValue(el, next);
      setCurrentValue(next);
      try {
        el.setSelectionRange(start, start);
      } catch {}
    }
  }, [activeElement, playClick]);

  // Continuous backspace on long press
  const startBackspaceRepeat = () => {
    handleBackspace();
    backspaceTimerRef.current = setTimeout(() => {
      backspaceTimerRef.current = setInterval(() => {
        handleBackspace();
      }, 80);
    }, 400);
  };

  const stopBackspaceRepeat = () => {
    if (backspaceTimerRef.current) {
      clearTimeout(backspaceTimerRef.current);
      clearInterval(backspaceTimerRef.current);
      backspaceTimerRef.current = null;
    }
  };

  // Clear entire field
  const handleClear = () => {
    playClick(700);
    if (!activeElement) return;
    setNativeInputValue(activeElement, '');
    setCurrentValue('');
    try {
      activeElement.setSelectionRange(0, 0);
    } catch {}
  };

  // Shift & Caps Lock toggle
  const handleShiftClick = () => {
    playClick(1500);
    const now = Date.now();
    // Double click within 350ms triggers Caps Lock
    if (now - lastShiftClickTime < 350) {
      setIsCapsLock(!isCapsLock);
      setIsShift(!isCapsLock);
    } else {
      if (isCapsLock) {
        setIsCapsLock(false);
        setIsShift(false);
      } else {
        setIsShift(!isShift);
      }
    }
    setLastShiftClickTime(now);
  };

  // Form field navigation (Previous / Next)
  const navigateField = (direction: 'prev' | 'next') => {
    playClick(1100);
    const inputs = Array.from(
      document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
        'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]):not([type="color"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
      )
    ).filter((i) => i.offsetParent !== null && window.getComputedStyle(i).display !== 'none');

    if (inputs.length === 0) return;

    const currentIndex = activeElement ? inputs.indexOf(activeElement) : -1;
    let nextIndex: number;

    if (direction === 'next') {
      nextIndex = currentIndex >= 0 && currentIndex < inputs.length - 1 ? currentIndex + 1 : 0;
    } else {
      nextIndex = currentIndex > 0 ? currentIndex - 1 : inputs.length - 1;
    }

    const target = inputs[nextIndex];
    if (target) {
      target.focus();
      setActiveElement(target);
      setFieldLabel(inferFieldLabel(target));
      setCurrentValue(target.value || '');
      setTimeout(() => {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {}
      }, 100);
    }
  };

  // Enter / Submit handler
  const handleEnter = () => {
    playClick(1000);
    if (!activeElement) return;

    if (activeElement instanceof HTMLTextAreaElement) {
      insertText('\n');
      return;
    }

    // Try submitting enclosing form
    const form = activeElement.closest('form');
    if (form) {
      const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement | null;
      if (submitBtn) {
        submitBtn.click();
        setIsOpen(false);
        return;
      }
    }

    // Otherwise navigate to next field or dismiss
    navigateField('next');
  };

  // If globally disabled, don't render anything
  if (!enabled) return null;

  // Key arrays
  const alphaRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
  ];

  const symbolsRows = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['@', '#', '$', '%', '&', '*', '-', '+', '(', ')'],
    ['!', '"', "'", ':', ';', '/', '\\', '?', '~', '='],
    ['<', '>', '[', ']', '{', '}', '^', '_', '|'],
  ];

  const moreSymbolsRows = [
    ['`', '•', '√', 'π', '÷', '×', '§', 'Δ', '£', '€'],
    ['¥', '¢', '©', '®', '™', '°', '±', '≠', '≈', '∞'],
    ['¿', '¡', '«', '»', '¬', '…', '‰', '§', '¶', '·'],
    ['≤', '≥', '∫', '∑', '∏', '√', '¬', 'ƒ', 'Ω'],
  ];

  const currentRows =
    mode === 'alpha' ? alphaRows : mode === 'symbols' ? symbolsRows : moreSymbolsRows;

  const isUpper = isShift || isCapsLock;

  return (
    <>
      {/* Floating Action Button: allows opening the keyboard manually anytime on touchscreens */}
      {!isOpen && (
        <button
          onClick={() => {
            playClick(1200);
            // If there's an active or last input, focus it; else just open keyboard
            if (activeElement) {
              activeElement.focus();
            } else {
              const firstInput = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
                'input:not([type="hidden"]):not([disabled]):not([readonly]), textarea:not([disabled]):not([readonly])'
              );
              if (firstInput) {
                firstInput.focus();
              }
            }
            setIsOpen(true);
          }}
          className="fixed bottom-14 right-4 z-40 p-3 bg-slate-900/90 hover:bg-slate-800 text-sky-400 hover:text-white rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2 group cursor-pointer"
          title="Open On-Screen Virtual Keyboard"
          aria-label="Open On-Screen Keyboard"
        >
          <KeyboardIcon className="w-5 h-5 text-sky-400 group-hover:text-sky-300" />
          <span className="text-xs font-bold text-white hidden sm:inline">Keyboard</span>
        </button>
      )}

      {/* Virtual Keyboard Bottom Drawer */}
      {isOpen && (
        <div
          ref={keyboardRef}
          onMouseDown={(e) => {
            // Prevent taking focus away from input
            e.preventDefault();
          }}
          className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/95 backdrop-blur-2xl border-t border-white/25 shadow-[0_-15px_40px_rgba(0,0,0,0.8)] flex flex-col select-none animate-in slide-in-from-bottom-6 duration-200"
        >
          {/* Top Status & Control Bar */}
          <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2 border-b border-white/10 text-xs">
            {/* Left: Active field indicator */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="shrink-0 px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 font-bold border border-sky-400/30 flex items-center gap-1.5 truncate max-w-[200px] sm:max-w-[260px]">
                <KeyboardIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{fieldLabel || 'Editing Field'}</span>
              </span>

              {/* Text Preview Display with Clear Button */}
              <div className="relative flex-1 min-w-0 max-w-md hidden sm:flex items-center bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-slate-200 font-mono text-xs">
                <span className="truncate flex-1">
                  {activeElement instanceof HTMLInputElement && activeElement.type === 'password'
                    ? '•'.repeat(currentValue.length)
                    : currentValue || (
                        <span className="text-slate-500 italic">Empty...</span>
                      )}
                </span>
                {currentValue && (
                  <button
                    onClick={handleClear}
                    className="ml-1 p-0.5 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-colors cursor-pointer"
                    title="Clear field"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Right: Sound toggle, Prev/Next navigation, Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundOn(!soundOn)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  soundOn
                    ? 'bg-white/10 text-sky-300 border-white/15'
                    : 'bg-white/5 text-slate-500 border-white/5'
                }`}
                title={soundOn ? 'Key click sound enabled' : 'Key click sound muted'}
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Prev Field */}
              <button
                onClick={() => navigateField('prev')}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg border border-white/15 font-semibold transition-all flex items-center gap-1 cursor-pointer"
                title="Go to previous field"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Prev</span>
              </button>

              {/* Next Field */}
              <button
                onClick={() => navigateField('next')}
                className="px-2.5 py-1 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg border border-white/15 font-semibold transition-all flex items-center gap-1 cursor-pointer"
                title="Go to next field"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Close / Hide Keyboard */}
              <button
                onClick={() => {
                  playClick(900);
                  setIsOpen(false);
                }}
                className="ml-1 px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 active:bg-rose-500/40 text-rose-300 hover:text-white rounded-lg border border-rose-500/30 font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Close on-screen keyboard"
              >
                <ChevronDown className="w-4 h-4" />
                <span>Hide</span>
              </button>
            </div>
          </div>

          {/* Main Keyboard Grid */}
          <div className="w-full max-w-4xl mx-auto p-2 sm:p-3 flex flex-col gap-1.5 sm:gap-2">
            {/* Row 1: Numbers / Symbols Row 1 */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
              {currentRows[0].map((key) => (
                <button
                  key={key}
                  onClick={() => insertText(key)}
                  className="flex-1 max-w-[56px] h-10 sm:h-12 bg-slate-800/90 hover:bg-slate-700/90 active:bg-sky-600 text-white font-medium text-base sm:text-lg rounded-xl shadow border border-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                >
                  {key}
                </button>
              ))}
              {/* Backspace Key */}
              <button
                onMouseDown={startBackspaceRepeat}
                onMouseUp={stopBackspaceRepeat}
                onMouseLeave={stopBackspaceRepeat}
                onTouchStart={startBackspaceRepeat}
                onTouchEnd={stopBackspaceRepeat}
                className="w-14 sm:w-16 h-10 sm:h-12 bg-rose-950/50 hover:bg-rose-900/60 active:bg-rose-800 text-rose-200 hover:text-white font-bold rounded-xl shadow border border-rose-500/30 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                title="Backspace (hold to delete rapidly)"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>

            {/* Row 2 */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
              {currentRows[1].map((key) => {
                const displayKey = isUpper ? key.toUpperCase() : key;
                return (
                  <button
                    key={key}
                    onClick={() => insertText(displayKey)}
                    className="flex-1 max-w-[62px] h-11 sm:h-13 bg-slate-800/90 hover:bg-slate-700/90 active:bg-sky-600 text-white font-semibold text-base sm:text-lg rounded-xl shadow border border-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  >
                    {displayKey}
                  </button>
                );
              })}
            </div>

            {/* Row 3 */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-center px-2 sm:px-4">
              {currentRows[2].map((key) => {
                const displayKey = isUpper ? key.toUpperCase() : key;
                return (
                  <button
                    key={key}
                    onClick={() => insertText(displayKey)}
                    className="flex-1 max-w-[64px] h-11 sm:h-13 bg-slate-800/90 hover:bg-slate-700/90 active:bg-sky-600 text-white font-semibold text-base sm:text-lg rounded-xl shadow border border-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  >
                    {displayKey}
                  </button>
                );
              })}
            </div>

            {/* Row 4: Shift + Letters/Symbols + Enter */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
              {/* Shift / Mode Toggle */}
              {mode === 'alpha' ? (
                <button
                  onClick={handleShiftClick}
                  className={`w-14 sm:w-18 h-11 sm:h-13 font-bold rounded-xl shadow border active:scale-95 transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    isCapsLock
                      ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-amber-500/30'
                      : isShift
                      ? 'bg-sky-600 text-white border-sky-400'
                      : 'bg-slate-700/80 hover:bg-slate-600/90 text-white/90 border-white/10'
                  }`}
                  title={isCapsLock ? 'Caps Lock Active' : isShift ? 'Shift Active' : 'Shift (double tap for Caps Lock)'}
                >
                  {isCapsLock ? <Lock className="w-4 h-4" /> : <ArrowUp className="w-5 h-5" />}
                </button>
              ) : (
                <button
                  onClick={() => {
                    playClick(1200);
                    setMode(mode === 'symbols' ? 'more_symbols' : 'symbols');
                  }}
                  className="w-14 sm:w-18 h-11 sm:h-13 bg-slate-700/80 hover:bg-slate-600/90 text-amber-300 font-bold rounded-xl shadow border border-amber-400/30 active:scale-95 transition-all flex items-center justify-center text-xs sm:text-sm cursor-pointer"
                >
                  {mode === 'symbols' ? '#+=' : '123'}
                </button>
              )}

              {/* Row 4 Characters */}
              {currentRows[3].map((key) => {
                const displayKey = isUpper ? key.toUpperCase() : key;
                return (
                  <button
                    key={key}
                    onClick={() => insertText(displayKey)}
                    className="flex-1 max-w-[62px] h-11 sm:h-13 bg-slate-800/90 hover:bg-slate-700/90 active:bg-sky-600 text-white font-semibold text-base sm:text-lg rounded-xl shadow border border-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                  >
                    {displayKey}
                  </button>
                );
              })}

              {/* Enter / Done Key */}
              <button
                onClick={handleEnter}
                className="w-18 sm:w-24 h-11 sm:h-13 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-bold rounded-xl shadow border border-sky-400/40 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm"
                title="Enter / Return"
              >
                <span>Enter</span>
                <CornerDownLeft className="w-4 h-4" />
              </button>
            </div>

            {/* Row 5: Mode, Special Keys, Spacebar, Shortcuts */}
            <div className="flex items-center gap-1 sm:gap-1.5 justify-center">
              {/* Toggle Mode: ABC vs ?123 */}
              <button
                onClick={() => {
                  playClick(1100);
                  setMode(mode === 'alpha' ? 'symbols' : 'alpha');
                }}
                className="w-16 sm:w-20 h-10 sm:h-12 bg-slate-700 hover:bg-slate-600 text-amber-300 font-bold rounded-xl shadow border border-amber-400/30 active:scale-95 transition-all flex items-center justify-center text-xs sm:text-sm cursor-pointer"
              >
                {mode === 'alpha' ? '?123' : 'ABC'}
              </button>

              {/* Common URL & Special Keys */}
              <button
                onClick={() => insertText('/')}
                className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800/90 hover:bg-slate-700 text-white font-semibold rounded-xl shadow border border-white/10 active:scale-95 transition-all flex items-center justify-center text-base cursor-pointer"
              >
                /
              </button>

              <button
                onClick={() => insertText('@')}
                className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800/90 hover:bg-slate-700 text-white font-semibold rounded-xl shadow border border-white/10 active:scale-95 transition-all flex items-center justify-center text-base cursor-pointer"
              >
                @
              </button>

              {/* Spacebar */}
              <button
                onClick={() => insertText(' ')}
                className="flex-1 max-w-sm h-10 sm:h-12 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-300 font-medium rounded-xl shadow border border-white/15 active:scale-98 transition-all flex items-center justify-center tracking-wider text-xs sm:text-sm cursor-pointer"
              >
                Space
              </button>

              {/* Period & Dash */}
              <button
                onClick={() => insertText('.')}
                className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800/90 hover:bg-slate-700 text-white font-bold rounded-xl shadow border border-white/10 active:scale-95 transition-all flex items-center justify-center text-base cursor-pointer"
              >
                .
              </button>

              <button
                onClick={() => insertText('-')}
                className="w-10 sm:w-12 h-10 sm:h-12 bg-slate-800/90 hover:bg-slate-700 text-white font-bold rounded-xl shadow border border-white/10 active:scale-95 transition-all flex items-center justify-center text-base cursor-pointer"
              >
                -
              </button>

              {/* Quick web extension shortcut */}
              <button
                onClick={() => insertText('.com')}
                className="hidden xs:flex w-14 sm:w-16 h-10 sm:h-12 bg-slate-700/80 hover:bg-slate-600 text-emerald-300 font-semibold rounded-xl shadow border border-emerald-400/25 active:scale-95 transition-all items-center justify-center text-xs cursor-pointer"
                title="Insert .com"
              >
                .com
              </button>

              {/* Quick https shortcut */}
              <button
                onClick={() => insertText('https://')}
                className="hidden sm:flex px-2 h-10 sm:h-12 bg-slate-700/80 hover:bg-slate-600 text-emerald-300 font-semibold rounded-xl shadow border border-emerald-400/25 active:scale-95 transition-all items-center justify-center text-xs cursor-pointer"
                title="Insert https://"
              >
                https://
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

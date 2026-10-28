import React from 'react';
import { AlertCircle, Star, X } from 'lucide-react';

interface StarRemovalModalProps {
  childName: string;
  taskTitle: string;
  dateStr: string;
  starsDeducted?: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export const StarRemovalModal: React.FC<StarRemovalModalProps> = ({
  childName,
  taskTitle,
  dateStr,
  starsDeducted = 1,
  onConfirm,
  onCancel,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fadeIn"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm bg-slate-900 border border-white/20 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300 mb-3 shadow-lg">
          <Star className="w-6 h-6 fill-rose-400 text-rose-400" />
        </div>

        <h3 className="text-xl font-black text-white tracking-tight">Remove Star?</h3>
        
        <p className="text-xs text-slate-300 mt-2 leading-relaxed">
          Are you sure you want to remove the star for <strong className="text-white">{childName}</strong> for{' '}
          <strong className="text-amber-300">{taskTitle}</strong> on{' '}
          <span className="font-mono text-slate-300">{dateStr}</span>?
        </p>

        <p className="text-[11px] text-slate-400 mt-1 mb-5">
          This will deduct {starsDeducted} star{starsDeducted > 1 ? 's' : ''} from their Star Bank balance.
        </p>

        <div className="flex items-center gap-3 w-full">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Keep Star
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-rose-950/50"
          >
            Remove Star
          </button>
        </div>
      </div>
    </div>
  );
};

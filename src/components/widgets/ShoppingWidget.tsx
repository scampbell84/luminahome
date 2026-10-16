import React from 'react';
import { ShoppingItem } from '../../types/shopping';
import { ShoppingCart, ChevronRight } from 'lucide-react';

interface ShoppingWidgetProps {
  items: ShoppingItem[];
  onOpenShopping?: () => void;
}

export const ShoppingWidget: React.FC<ShoppingWidgetProps> = ({ items, onOpenShopping }) => {
  const pendingItems = items.filter((i) => !i.completed);

  return (
    <div
      onClick={onOpenShopping}
      className="bg-black/35 backdrop-blur-md rounded-xl p-3.5 border border-white/10 text-white select-none text-kiosk-shadow cursor-pointer hover:bg-black/45 transition-all group"
    >
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
            Shopping List
          </span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-white/50 group-hover:text-amber-300 transition-colors">
          <span>Open</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-extrabold text-white tracking-tight">
          {pendingItems.length}
        </span>
        <span className="text-xs text-white/70 font-medium">
          items to get
        </span>
      </div>

      {pendingItems.length === 0 ? (
        <p className="text-xs text-white/50 italic">All items purchased!</p>
      ) : (
        <ul className="space-y-1 text-xs text-white/90">
          {pendingItems.slice(0, 3).map((item) => (
            <li key={item.id} className="flex items-center gap-2 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
              <span className="truncate">{item.text}</span>
              {item.quantity && (
                <span className="text-[10px] text-white/50 font-mono shrink-0">
                  ({item.quantity})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

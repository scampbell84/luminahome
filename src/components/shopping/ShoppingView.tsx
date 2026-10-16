import React, { useState } from 'react';
import { ShoppingItem, ShoppingCategory } from '../../types/shopping';
import { 
  ShoppingCart, 
  Plus, 
  Check, 
  Trash2, 
  RotateCcw, 
  Sparkles, 
  Tag, 
  CheckCircle2, 
  Circle,
  ShoppingBag
} from 'lucide-react';

interface ShoppingViewProps {
  items: ShoppingItem[];
  onAddItem: (text: string, category: ShoppingCategory, quantity?: string) => Promise<void>;
  onToggleItem: (id: string, completed: boolean) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onClearCompleted: () => Promise<void>;
}

const CATEGORIES: ShoppingCategory[] = [
  'Produce',
  'Dairy & Eggs',
  'Bakery',
  'Meat & Seafood',
  'Pantry',
  'Snacks & Drinks',
  'Household',
  'Other',
];

const QUICK_SUGGESTIONS = [
  { text: 'Organic Milk', category: 'Dairy & Eggs' as ShoppingCategory },
  { text: 'Eggs (dozen)', category: 'Dairy & Eggs' as ShoppingCategory },
  { text: 'Sourdough Bread', category: 'Bakery' as ShoppingCategory },
  { text: 'Bananas', category: 'Produce' as ShoppingCategory },
  { text: 'Avocados', category: 'Produce' as ShoppingCategory },
  { text: 'Coffee Beans', category: 'Pantry' as ShoppingCategory },
  { text: 'Olive Oil', category: 'Pantry' as ShoppingCategory },
  { text: 'Paper Towels', category: 'Household' as ShoppingCategory },
  { text: 'Dish Soap', category: 'Household' as ShoppingCategory },
  { text: 'Granola Bars', category: 'Snacks & Drinks' as ShoppingCategory },
];

export const ShoppingView: React.FC<ShoppingViewProps> = ({
  items,
  onAddItem,
  onToggleItem,
  onDeleteItem,
  onClearCompleted,
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ShoppingCategory>('Other');
  const [quantityInput, setQuantityInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'to-buy' | 'completed'>('to-buy');
  const [submitting, setSubmitting] = useState(false);

  const pendingItems = items.filter((i) => !i.completed);
  const completedItems = items.filter((i) => i.completed);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setSubmitting(true);
    try {
      await onAddItem(inputText.trim(), selectedCategory, quantityInput.trim() || undefined);
      setInputText('');
      setQuantityInput('');
      setSelectedCategory('Other');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAdd = async (suggestion: { text: string; category: ShoppingCategory }) => {
    // Avoid rapid duplicates
    if (items.some((i) => i.text.toLowerCase() === suggestion.text.toLowerCase() && !i.completed)) {
      return;
    }
    await onAddItem(suggestion.text, suggestion.category);
  };

  // Group items by category for clear view
  const displayItems = activeFilter === 'all' 
    ? items 
    : activeFilter === 'to-buy' 
    ? pendingItems 
    : completedItems;

  const getCategoryColor = (cat: ShoppingCategory) => {
    switch (cat) {
      case 'Produce': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Dairy & Eggs': return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'Bakery': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'Meat & Seafood': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'Pantry': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'Snacks & Drinks': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Household': return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans pb-28 pt-6 px-4 md:px-8 max-w-7xl 2xl:max-w-[1780px] mx-auto">
      {/* Top Header Card */}
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-2xl p-5 md:p-7 shadow-2xl mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-lg">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                <span>Family Shopping List</span>
                <span className="text-xs bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-black font-mono">
                  {pendingItems.length} TO BUY
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Shared household list synchronized across all screens and devices
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {completedItems.length > 0 && (
              <button
                onClick={onClearCompleted}
                className="px-3.5 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors border border-slate-700 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear Completed ({completedItems.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Input Add Form */}
        <form onSubmit={handleFormSubmit} className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Add item (e.g. Sourdough bread, Dish soap, Milk)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors shadow-inner"
              />
            </div>

            <div className="w-full sm:w-28">
              <input
                type="text"
                value={quantityInput}
                onChange={(e) => setQuantityInput(e.target.value)}
                placeholder="Qty / notes"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-colors text-center shadow-inner"
              />
            </div>

            <div className="w-full sm:w-44">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ShoppingCategory)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-3 text-xs md:text-sm text-white focus:outline-none focus:border-amber-400 transition-colors"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting || !inputText.trim()}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Item</span>
            </button>
          </div>
        </form>

        {/* Quick Suggestion Chips */}
        <div className="mt-4 pt-3 flex items-center gap-2 overflow-x-auto scrollbar-none">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Quick Add:
          </span>
          <div className="flex items-center gap-1.5 flex-nowrap">
            {QUICK_SUGGESTIONS.map((sugg, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickAdd(sugg)}
                className="px-2.5 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-medium shrink-0 border border-slate-700/60 transition-colors flex items-center gap-1 active:scale-95"
              >
                <span>+</span>
                <span>{sugg.text}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Tabs & Content Section */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveFilter('to-buy')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'to-buy'
                ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            To Buy ({pendingItems.length})
          </button>
          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'completed'
                ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Completed ({completedItems.length})
          </button>
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeFilter === 'all'
                ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Items ({items.length})
          </button>
        </div>

        <span className="text-xs text-slate-400 font-mono hidden sm:inline">
          Tap items to check off
        </span>
      </div>

      {/* Items List */}
      {displayItems.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-12 text-center text-slate-400">
          <ShoppingBag className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="text-base font-semibold text-slate-300">
            {activeFilter === 'to-buy' ? 'All caught up! Nothing on the shopping list.' : 'No items found.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Use the input bar above or quick add suggestions to add groceries and household essentials.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3.5">
          {displayItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onToggleItem(item.id, !item.completed)}
              className={`group flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
                item.completed
                  ? 'bg-slate-900/40 border-slate-800/50 opacity-60 hover:opacity-80'
                  : 'bg-slate-900/90 border-slate-800 hover:border-amber-400/50 hover:bg-slate-850 shadow-md'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <button
                  type="button"
                  className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-colors shrink-0 ${
                    item.completed
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : 'border-slate-600 hover:border-amber-400 bg-slate-950/60'
                  }`}
                >
                  {item.completed && <Check className="w-4 h-4 stroke-[3]" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm md:text-base font-medium truncate ${
                      item.completed ? 'line-through text-slate-500' : 'text-white'
                    }`}>
                      {item.text}
                    </span>

                    {item.quantity && (
                      <span className="text-xs bg-slate-800 text-amber-300 font-mono px-2 py-0.5 rounded-md border border-slate-700 shrink-0">
                        {item.quantity}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryColor(item.category)}`}>
                      {item.category}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delete button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteItem(item.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-rose-400 transition-all rounded-lg hover:bg-slate-800"
                title="Delete item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

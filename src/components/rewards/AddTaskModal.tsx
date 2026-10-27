import React, { useState, useMemo } from 'react';
import { RewardTask } from '../../types/config';
import { SUGGESTED_TASKS, TASK_CATEGORIES, SuggestedTask } from '../../constants/suggestedTasks';
import {
  X,
  Plus,
  Check,
  Search,
  Sparkles,
  Star,
  Bed,
  BookOpen,
  Utensils,
  Heart,
  Gamepad2,
  Music,
  Apple,
  Droplets,
  Shirt,
  Brain,
  Sun,
  Trash2,
  ThumbsUp,
  Activity,
  Clock,
  Layers,
} from 'lucide-react';

interface AddTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTasks: RewardTask[];
  onAddTask: (task: {
    title: string;
    category: 'routine' | 'chore' | 'learning' | 'behaviour' | 'health';
    icon: string;
    points: number;
  }) => void;
}

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  onClose,
  existingTasks,
  onAddTask,
}) => {
  const [activeTab, setActiveTab] = useState<'suggested' | 'custom'>('suggested');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Per-suggested-task star value overrides: suggestedTaskId -> points
  const [taskPointsMap, setTaskPointsMap] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    for (const t of SUGGESTED_TASKS) {
      initial[t.id] = t.defaultPoints;
    }
    return initial;
  });

  // Custom task form state
  const [customTitle, setCustomTitle] = useState('');
  const [customCategory, setCustomCategory] = useState<'routine' | 'chore' | 'learning' | 'behaviour' | 'health'>('routine');
  const [customIcon, setCustomIcon] = useState('sparkles');
  const [customPoints, setCustomPoints] = useState(1);

  // Set of existing task titles (lowercased) for instant duplicate detection
  const existingTitles = useMemo(() => {
    return new Set(existingTasks.map((t) => t.title.toLowerCase().trim()));
  }, [existingTasks]);

  // Filtered suggested tasks
  const filteredSuggestions = useMemo(() => {
    return SUGGESTED_TASKS.filter((task) => {
      const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        task.title.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase().trim());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  const getTaskIcon = (iconName: string) => {
    switch (iconName?.toLowerCase()) {
      case 'bed':
        return <Bed className="w-4 h-4 text-sky-400" />;
      case 'book':
        return <BookOpen className="w-4 h-4 text-emerald-400" />;
      case 'utensils':
        return <Utensils className="w-4 h-4 text-orange-400" />;
      case 'heart':
        return <Heart className="w-4 h-4 text-rose-400" />;
      case 'gamepad':
        return <Gamepad2 className="w-4 h-4 text-indigo-400" />;
      case 'music':
        return <Music className="w-4 h-4 text-pink-400" />;
      case 'apple':
        return <Apple className="w-4 h-4 text-red-400" />;
      case 'droplets':
        return <Droplets className="w-4 h-4 text-cyan-400" />;
      case 'shirt':
        return <Shirt className="w-4 h-4 text-purple-400" />;
      case 'brain':
        return <Brain className="w-4 h-4 text-violet-400" />;
      case 'sun':
        return <Sun className="w-4 h-4 text-yellow-400" />;
      case 'trash':
        return <Trash2 className="w-4 h-4 text-slate-400" />;
      case 'thumbs-up':
      case 'thumbsup':
        return <ThumbsUp className="w-4 h-4 text-emerald-400" />;
      case 'activity':
        return <Activity className="w-4 h-4 text-lime-400" />;
      case 'clock':
        return <Clock className="w-4 h-4 text-teal-400" />;
      case 'star':
        return <Star className="w-4 h-4 text-amber-400" />;
      case 'sparkles':
      default:
        return <Sparkles className="w-4 h-4 text-amber-300" />;
    }
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'routine':
        return <span className="text-[10px] font-bold text-sky-300 bg-sky-500/15 border border-sky-400/30 px-2 py-0.5 rounded-full">Routine</span>;
      case 'chore':
        return <span className="text-[10px] font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 px-2 py-0.5 rounded-full">Chore</span>;
      case 'learning':
        return <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-2 py-0.5 rounded-full">Learning</span>;
      case 'behaviour':
        return <span className="text-[10px] font-bold text-rose-300 bg-rose-500/15 border border-rose-400/30 px-2 py-0.5 rounded-full">Manners</span>;
      case 'health':
        return <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-400/30 px-2 py-0.5 rounded-full">Health</span>;
      default:
        return null;
    }
  };

  const handleAddSuggested = (task: SuggestedTask) => {
    const points = taskPointsMap[task.id] ?? task.defaultPoints;
    onAddTask({
      title: task.title,
      category: task.category,
      icon: task.icon,
      points,
    });
  };

  const handlePointsChange = (taskId: string, newPoints: number) => {
    setTaskPointsMap((prev) => ({
      ...prev,
      [taskId]: Math.max(1, Math.min(10, newPoints)),
    }));
  };

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    onAddTask({
      title: customTitle.trim(),
      category: customCategory,
      icon: customIcon,
      points: Math.max(1, customPoints),
    });
    setCustomTitle('');
    setCustomPoints(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-4xl max-h-[92vh] bg-slate-900 border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Add Tasks to Reward Chart
              </h3>
              <p className="text-xs text-slate-400">
                Choose from suggested positive habits or create your own custom tasks with star values
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Suggestions vs Custom */}
        <div className="px-4 sm:px-6 pt-3 pb-2 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-950/30 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-white/5 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('suggested')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'suggested'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Suggested Collection ({SUGGESTED_TASKS.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('custom')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Custom Task</span>
            </button>
          </div>

          {activeTab === 'suggested' && (
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search habits (e.g. bed, teeth)..."
                className="w-full pl-8 pr-3 py-1.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400 font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {activeTab === 'suggested' ? (
            /* TAB 1: SUGGESTED TASKS BROWSER */
            <>
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                {TASK_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  const count =
                    cat.id === 'all'
                      ? SUGGESTED_TASKS.length
                      : SUGGESTED_TASKS.filter((t) => t.category === cat.id).length;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border ${
                        isSelected
                          ? 'bg-white text-slate-950 border-white shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <span>{cat.label}</span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-slate-200 text-slate-900 font-bold' : 'bg-white/10 text-slate-400'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Suggestions Grid */}
              {filteredSuggestions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No suggested habits found matching &ldquo;{searchQuery}&rdquo;. Try another search or create a custom task.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredSuggestions.map((item) => {
                    const isAlreadyOnChart = existingTitles.has(item.title.toLowerCase().trim());
                    const currentPoints = taskPointsMap[item.id] ?? item.defaultPoints;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                          isAlreadyOnChart
                            ? 'bg-white/[0.02] border-white/10 opacity-75'
                            : 'bg-slate-800/80 hover:bg-slate-800 border-white/10 hover:border-emerald-400/50 shadow-md'
                        }`}
                      >
                        {/* Top: Category & Icon & Title */}
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0 mt-0.5">
                            {getTaskIcon(item.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {getCategoryBadge(item.category)}
                              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 px-1.5 py-0.2 rounded-full">
                                {currentPoints}⭐ per completion
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-white tracking-wide">
                              {item.title}
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Bottom: Star Points Stepper & Add Button */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-3">
                          {/* Star Value Configurator */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-semibold text-slate-300">Stars:</span>
                            <div className="flex items-center gap-1 bg-black/40 rounded-xl border border-white/15 p-0.5">
                              {[1, 2, 3, 5].map((pts) => (
                                <button
                                  key={pts}
                                  type="button"
                                  onClick={() => handlePointsChange(item.id, pts)}
                                  className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                    currentPoints === pts
                                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                                      : 'text-slate-400 hover:text-white'
                                  }`}
                                  title={`Award ${pts} star${pts > 1 ? 's' : ''}`}
                                >
                                  {pts}⭐
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Action Button */}
                          {isAlreadyOnChart ? (
                            <span className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                              <span>On Chart</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleAddSuggested(item)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Add to Chart</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            /* TAB 2: CREATE CUSTOM TASK */
            <form onSubmit={handleSaveCustom} className="max-w-2xl mx-auto space-y-5 py-2">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Task / Habit Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="e.g. Water Garden Plants, Practice Typing, Tidy Shoes..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/20 text-white font-bold text-sm focus:outline-none focus:border-emerald-400 placeholder-slate-500"
                    autoFocus
                  />
                </div>

                {/* Category & Star Value */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      Category
                    </label>
                    <select
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white text-xs font-bold focus:outline-none focus:border-emerald-400"
                    >
                      <option value="routine">Daily Routine 🛏️</option>
                      <option value="chore">Household Chore 🧹</option>
                      <option value="learning">Learning & School 📖</option>
                      <option value="behaviour">Manners & Kindness ❤️</option>
                      <option value="health">Health & Activity 🏃</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      Star Reward Value (Points)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 5].map((pts) => (
                        <button
                          key={pts}
                          type="button"
                          onClick={() => setCustomPoints(pts)}
                          className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer border ${
                            customPoints === pts
                              ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md font-black'
                              : 'bg-black/40 border-white/15 text-slate-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {pts}⭐
                        </button>
                      ))}
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={customPoints}
                        onChange={(e) => setCustomPoints(Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                        className="w-16 px-2 py-2 rounded-xl bg-slate-950 border border-white/20 text-center text-amber-300 font-mono font-bold text-xs"
                        title="Custom points value"
                      />
                    </div>
                  </div>
                </div>

                {/* Icon Picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    Icon Symbol
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    {[
                      { id: 'sparkles', label: 'Sparkles', icon: <Sparkles className="w-4 h-4 text-amber-300" /> },
                      { id: 'bed', label: 'Bed', icon: <Bed className="w-4 h-4 text-sky-400" /> },
                      { id: 'book', label: 'Book', icon: <BookOpen className="w-4 h-4 text-emerald-400" /> },
                      { id: 'utensils', label: 'Dishes', icon: <Utensils className="w-4 h-4 text-orange-400" /> },
                      { id: 'heart', label: 'Heart', icon: <Heart className="w-4 h-4 text-rose-400" /> },
                      { id: 'brain', label: 'Brain', icon: <Brain className="w-4 h-4 text-violet-400" /> },
                      { id: 'music', label: 'Music', icon: <Music className="w-4 h-4 text-pink-400" /> },
                      { id: 'apple', label: 'Apple', icon: <Apple className="w-4 h-4 text-red-400" /> },
                      { id: 'droplets', label: 'Water', icon: <Droplets className="w-4 h-4 text-cyan-400" /> },
                      { id: 'shirt', label: 'Clothes', icon: <Shirt className="w-4 h-4 text-purple-400" /> },
                      { id: 'sun', label: 'Sun', icon: <Sun className="w-4 h-4 text-yellow-400" /> },
                      { id: 'trash', label: 'Trash', icon: <Trash2 className="w-4 h-4 text-slate-400" /> },
                      { id: 'thumbs-up', label: 'Thumbs', icon: <ThumbsUp className="w-4 h-4 text-emerald-400" /> },
                      { id: 'activity', label: 'Active', icon: <Activity className="w-4 h-4 text-lime-400" /> },
                      { id: 'clock', label: 'Clock', icon: <Clock className="w-4 h-4 text-teal-400" /> },
                      { id: 'gamepad', label: 'Game', icon: <Gamepad2 className="w-4 h-4 text-indigo-400" /> },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setCustomIcon(item.id)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          customIcon === item.id
                            ? 'bg-emerald-500/20 border-emerald-400 shadow-sm'
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                        title={item.label}
                      >
                        {item.icon}
                        <span className="text-[10px] text-slate-400 truncate max-w-full">
                          {item.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!customTitle.trim()}
                  className="flex items-center gap-2 px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Save Custom Task</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Currently {existingTasks.length} active tasks on chart</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

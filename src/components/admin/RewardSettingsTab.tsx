import React, { useState } from 'react';
import { AppConfig, RewardConfig, ChildProfile, RewardTask, RewardShopItem } from '../../types/config';
import { DEFAULT_REWARD_CONFIG } from '../../constants/defaultConfig';
import { AVATAR_ICON_OPTIONS, AVATAR_ICON_MAP, getAvatarEmoji } from '../../constants/avatarIcons';
import {
  Star,
  Gift,
  Plus,
  Trash2,
  Lock,
  Unlock,
  Volume2,
  Sparkles,
  Users,
  CheckSquare,
  Shield,
  Smile,
  Rocket,
  Crown,
  Heart,
  History,
  Edit2,
  Check,
  X,
  UserCheck,
  Eye,
  EyeOff,
} from 'lucide-react';
import { AddTaskModal } from '../rewards/AddTaskModal';
import { RewardAuditLogTab } from '../rewards/RewardAuditLogTab';

interface RewardSettingsTabProps {
  config: AppConfig;
  onChange: (updatedConfig: AppConfig) => void;
}

export const RewardSettingsTab: React.FC<RewardSettingsTabProps> = ({ config, onChange }) => {
  const rewards: RewardConfig = config.rewards || DEFAULT_REWARD_CONFIG;

  const updateRewards = (partial: Partial<RewardConfig>) => {
    onChange({
      ...config,
      rewards: {
        ...rewards,
        ...partial,
      },
    });
  };

  // Sub-tab navigation: 'config' (default) vs 'audit_log' (hidden audit trail)
  const [settingsSubTab, setSettingsSubTab] = useState<'config' | 'audit_log'>('config');
  const [isAuditLogUnlocked, setIsAuditLogUnlocked] = useState<boolean>(false);

  // Add Child form state
  const [showAddChild, setShowAddChild] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildIcon, setNewChildIcon] = useState('donut'); // Default to fun food emoji!
  const [newChildColor, setNewChildColor] = useState('amber');
  const [newChildStars, setNewChildStars] = useState(0);
  const [avatarCategoryFilter, setAvatarCategoryFilter] = useState<string>('all');

  // Edit Child state
  const [editingChildId, setEditingChildId] = useState<string | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildIcon, setEditChildIcon] = useState('donut');
  const [editChildColor, setEditChildColor] = useState('amber');
  const [editAvatarCategory, setEditAvatarCategory] = useState<string>('all');

  // Add Task Modal state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);

  // Add Reward Item form state
  const [showAddShopItem, setShowAddShopItem] = useState(false);
  const [newShopTitle, setNewShopTitle] = useState('');
  const [newShopCost, setNewShopCost] = useState(10);
  const [newShopCategory, setNewShopCategory] = useState<'treat' | 'activity' | 'privilege' | 'toy'>('treat');
  const [newShopIcon, setNewShopIcon] = useState('gift');
  const [newShopDesc, setNewShopDesc] = useState('');

  // Parent names state
  const [newParentName, setNewParentName] = useState('');
  const [showAddParent, setShowAddParent] = useState(false);
  const parentNames = rewards.parentNames || ['Mom', 'Dad'];
  const activeParent = rewards.activeParent || parentNames[0] || 'Mom';

  // Child handlers
  const handleAddChild = () => {
    if (!newChildName.trim()) return;
    const newChild: ChildProfile = {
      id: `child-${Date.now()}`,
      name: newChildName.trim(),
      avatarIcon: newChildIcon,
      avatarColor: newChildColor,
      currentStars: Math.max(0, newChildStars),
      lifetimeStars: Math.max(0, newChildStars),
    };
    updateRewards({
      children: [...rewards.children, newChild],
    });
    setNewChildName('');
    setNewChildStars(0);
    setNewChildIcon('donut');
    setShowAddChild(false);
  };

  const handleStartEditChild = (child: ChildProfile) => {
    setEditingChildId(child.id);
    setEditChildName(child.name);
    setEditChildIcon(child.avatarIcon || 'smile');
    setEditChildColor(child.avatarColor || 'amber');
  };

  const handleSaveEditChild = () => {
    if (!editingChildId || !editChildName.trim()) return;
    updateRewards({
      children: rewards.children.map((c) =>
        c.id === editingChildId
          ? {
              ...c,
              name: editChildName.trim(),
              avatarIcon: editChildIcon,
              avatarColor: editChildColor,
            }
          : c
      ),
    });
    setEditingChildId(null);
  };

  const handleDeleteChild = (id: string) => {
    if (rewards.children.length <= 1) {
      alert('You must have at least one child on the chart.');
      return;
    }
    updateRewards({
      children: rewards.children.filter((c) => c.id !== id),
      starLogs: (rewards.starLogs || []).filter((l) => l.childId !== id),
    });
  };

  const handleUpdateChildStars = (id: string, stars: number) => {
    const target = rewards.children.find((c) => c.id === id);
    const oldStars = target?.currentStars || 0;
    const newStars = Math.max(0, stars);

    // If manual adjustment, log an audit event
    const auditAdjustment = {
      id: `audit_man_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'manual_adjustment' as const,
      timestamp: new Date().toISOString(),
      childId: id,
      childName: target?.name || 'Child',
      childAvatar: target?.avatarIcon,
      actionTitle: `Manual Balance Adjustment (${oldStars} ⭐ → ${newStars} ⭐)`,
      starsDelta: newStars - oldStars,
      approvedBy: `${activeParent} (Parent Settings)`,
      notes: `Manually set balance in Admin Settings`,
    };

    updateRewards({
      children: rewards.children.map((c) => (c.id === id ? { ...c, currentStars: newStars } : c)),
      auditLogs: [auditAdjustment, ...(rewards.auditLogs || [])],
    });
  };

  // Task handlers
  const handleAddCreatedTask = (taskData: {
    title: string;
    category: 'routine' | 'chore' | 'learning' | 'behaviour' | 'health';
    icon: string;
    points: number;
  }) => {
    const newTask: RewardTask = {
      id: `task-${Date.now()}`,
      ...taskData,
    };
    updateRewards({
      tasks: [...rewards.tasks, newTask],
    });
  };

  const handleUpdateTaskPoints = (taskId: string, points: number) => {
    updateRewards({
      tasks: rewards.tasks.map((t) => (t.id === taskId ? { ...t, points: Math.max(1, points) } : t)),
    });
  };

  const handleDeleteTask = (id: string) => {
    if (rewards.tasks.length <= 1) {
      alert('You must keep at least one habit or task on the chart.');
      return;
    }
    updateRewards({
      tasks: rewards.tasks.filter((t) => t.id !== id),
      starLogs: (rewards.starLogs || []).filter((l) => l.taskId !== id),
    });
  };

  // Reward Shop handlers
  const handleAddShopItem = () => {
    if (!newShopTitle.trim()) return;
    const newItem: RewardShopItem = {
      id: `shop-${Date.now()}`,
      title: newShopTitle.trim(),
      cost: Math.max(1, newShopCost),
      category: newShopCategory,
      icon: newShopIcon,
      description: newShopDesc.trim() || undefined,
      enabled: true,
    };
    updateRewards({
      shopItems: [...rewards.shopItems, newItem],
    });
    setNewShopTitle('');
    setNewShopDesc('');
    setShowAddShopItem(false);
  };

  const handleDeleteShopItem = (id: string) => {
    updateRewards({
      shopItems: rewards.shopItems.filter((i) => i.id !== id),
    });
  };

  // Parent names handlers
  const handleAddParent = () => {
    if (!newParentName.trim()) return;
    const clean = newParentName.trim();
    if (parentNames.includes(clean)) return;
    updateRewards({
      parentNames: [...parentNames, clean],
    });
    setNewParentName('');
    setShowAddParent(false);
  };

  const handleDeleteParent = (nameToDelete: string) => {
    if (parentNames.length <= 1) {
      alert('You must keep at least one approving parent.');
      return;
    }
    const updated = parentNames.filter((p) => p !== nameToDelete);
    updateRewards({
      parentNames: updated,
      activeParent: activeParent === nameToDelete ? updated[0] : activeParent,
    });
  };

  // Filtered avatar icons by category
  const filteredAvatarOptions = (catFilter: string) => {
    if (catFilter === 'all') return AVATAR_ICON_OPTIONS;
    return AVATAR_ICON_OPTIONS.filter((o) => o.category === catFilter);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Sub-Tab Switcher: General Setup vs Hidden Audit Log */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-3xl bg-slate-900 border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Star className="w-6 h-6 fill-slate-950" />
          </div>
          <div>
            <h3 className="text-xl font-black text-white tracking-tight">Reward Chart & Star Bank</h3>
            <p className="text-xs text-slate-400">
              Manage children profiles, habit tasks, shop treats, and audit activity trail
            </p>
          </div>
        </div>

        {/* Sub-Tabs Button Strip */}
        <div className="flex items-center gap-1.5 p-1 bg-white/5 border border-white/10 rounded-2xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setSettingsSubTab('config')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              settingsSubTab === 'config'
                ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Chart Setup</span>
          </button>

          <button
            type="button"
            onClick={() => setSettingsSubTab('audit_log')}
            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              settingsSubTab === 'audit_log'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black shadow-md shadow-indigo-500/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Hidden Audit Log for parent activity tracking"
          >
            <Shield className="w-3.5 h-3.5 text-indigo-400" />
            <span>Hidden Audit Log</span>
            {isAuditLogUnlocked ? (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            ) : (
              <span title="Protected by PIN">
                <Lock className="w-3 h-3 text-amber-400" />
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Render Hidden Audit Log Sub-Tab */}
      {settingsSubTab === 'audit_log' ? (
        <RewardAuditLogTab
          rewards={rewards}
          onUpdateRewards={updateRewards}
          isUnlocked={isAuditLogUnlocked}
          onUnlock={() => setIsAuditLogUnlocked(true)}
          onLock={() => {
            setIsAuditLogUnlocked(false);
            setSettingsSubTab('config');
          }}
        />
      ) : (
        /* Render Standard Chart Configuration Sub-Tab */
        <div className="space-y-8 animate-fadeIn">
          {/* 2. Children Profiles Management */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-amber-300" />
                <h4 className="text-base font-black text-white tracking-tight">Children Profiles</h4>
                <span className="text-[11px] font-mono text-amber-300 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full font-bold">
                  {rewards.children.length} Active
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddChild(!showAddChild);
                  setEditingChildId(null);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Child</span>
              </button>
            </div>

            {/* Add Child Form with Rich Emoji Picker */}
            {showAddChild && (
              <div className="p-4 sm:p-5 rounded-2xl bg-white/5 border border-white/15 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Add New Child Profile
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAddChild(false)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Child Name</label>
                    <input
                      type="text"
                      value={newChildName}
                      onChange={(e) => setNewChildName(e.target.value)}
                      placeholder="e.g. Leo or Mia"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white font-bold text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Theme Color</label>
                    <select
                      value={newChildColor}
                      onChange={(e) => setNewChildColor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="amber">Amber / Gold</option>
                      <option value="sky">Sky Blue</option>
                      <option value="rose">Rose Pink</option>
                      <option value="emerald">Emerald Green</option>
                      <option value="purple">Purple</option>
                      <option value="orange">Sunset Orange</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Starting Stars in Bank</label>
                    <input
                      type="number"
                      min="0"
                      value={newChildStars}
                      onChange={(e) => setNewChildStars(parseInt(e.target.value, 10) || 0)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white font-mono font-bold text-xs focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Avatar Emoji Picker with Category Filter Chips (Including Food Items!) */}
                <div className="space-y-2 pt-1 border-t border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-slate-300 font-bold text-xs">
                      Choose Avatar Emoji (Including Food Treats like Donuts & Pizza!):
                    </label>

                    {/* Category Filter Chips */}
                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'food', label: '🍕 Food & Treats' },
                        { id: 'fun', label: '🚀 Fun' },
                        { id: 'animals', label: '🦖 Animals' },
                        { id: 'magic', label: '✨ Magic' },
                        { id: 'sports', label: '⚽ Sports' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setAvatarCategoryFilter(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                            avatarCategoryFilter === cat.id
                              ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Emoji Grid */}
                  <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5 p-2 rounded-xl bg-black/40 border border-white/10 max-h-36 overflow-y-auto scrollbar-thin">
                    {filteredAvatarOptions(avatarCategoryFilter).map((opt) => {
                      const isSelected = newChildIcon === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setNewChildIcon(opt.id)}
                          className={`p-2 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-amber-400/25 border-2 border-amber-400 scale-110 shadow-lg shadow-amber-400/30'
                              : 'bg-white/5 hover:bg-white/15 border border-white/10 hover:scale-105'
                          }`}
                          title={opt.label}
                        >
                          {opt.emoji}
                        </button>
                      );
                    })}
                  </div>

                  {/* Live Avatar Preview */}
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-xs text-slate-400 font-bold">Avatar Preview:</span>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-xl shadow-md">
                      {getAvatarEmoji(newChildIcon)}
                    </div>
                    <span className="text-xs font-bold text-white">
                      {newChildName.trim() || 'Leo'} &bull;{' '}
                      <span className="text-amber-300 font-mono">
                        {AVATAR_ICON_OPTIONS.find((o) => o.id === newChildIcon)?.label || 'Emoji'}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowAddChild(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddChild}
                    className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    Save Child
                  </button>
                </div>
              </div>
            )}

            {/* Edit Child Form */}
            {editingChildId && (
              <div className="p-4 sm:p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 space-y-4 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-indigo-300">
                    Edit Child Profile & Avatar Emoji
                  </span>
                  <button
                    type="button"
                    onClick={() => setEditingChildId(null)}
                    className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Child Name</label>
                    <input
                      type="text"
                      value={editChildName}
                      onChange={(e) => setEditChildName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white font-bold text-xs focus:outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Theme Color</label>
                    <select
                      value={editChildColor}
                      onChange={(e) => setEditChildColor(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white font-bold text-xs focus:outline-none cursor-pointer"
                    >
                      <option value="amber">Amber / Gold</option>
                      <option value="sky">Sky Blue</option>
                      <option value="rose">Rose Pink</option>
                      <option value="emerald">Emerald Green</option>
                      <option value="purple">Purple</option>
                      <option value="orange">Sunset Orange</option>
                    </select>
                  </div>
                </div>

                {/* Edit Emoji Picker */}
                <div className="space-y-2 pt-1 border-t border-indigo-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block text-slate-300 font-bold text-xs">
                      Select Emoji (Choose Donuts, Pizza, Dino, etc.):
                    </label>

                    <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'food', label: '🍕 Food & Treats' },
                        { id: 'fun', label: '🚀 Fun' },
                        { id: 'animals', label: '🦖 Animals' },
                        { id: 'magic', label: '✨ Magic' },
                        { id: 'sports', label: '⚽ Sports' },
                      ].map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setEditAvatarCategory(cat.id)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 ${
                            editAvatarCategory === cat.id
                              ? 'bg-indigo-400 text-slate-950 font-black shadow-sm'
                              : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-12 gap-1.5 p-2 rounded-xl bg-black/40 border border-white/10 max-h-36 overflow-y-auto scrollbar-thin">
                    {filteredAvatarOptions(editAvatarCategory).map((opt) => {
                      const isSelected = editChildIcon === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setEditChildIcon(opt.id)}
                          className={`p-2 rounded-xl text-xl flex items-center justify-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-500/30 border-2 border-indigo-400 scale-110 shadow-lg shadow-indigo-400/30'
                              : 'bg-white/5 hover:bg-white/15 border border-white/10 hover:scale-105'
                          }`}
                          title={opt.label}
                        >
                          {opt.emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-indigo-500/20">
                  <button
                    type="button"
                    onClick={() => setEditingChildId(null)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditChild}
                    className="px-5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-black shadow-lg shadow-indigo-500/20 cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Existing Children Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {rewards.children.map((child) => (
                <div
                  key={child.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 hover:border-white/20 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-xl shrink-0 shadow-md">
                      {getAvatarEmoji(child.avatarIcon)}
                    </div>
                    <div className="min-w-0">
                      <h5 className="font-bold text-white text-sm truncate">{child.name}</h5>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-400 font-mono">Bank:</span>
                        <input
                          type="number"
                          min="0"
                          value={child.currentStars}
                          onChange={(e) => handleUpdateChildStars(child.id, parseInt(e.target.value, 10) || 0)}
                          className="w-14 px-1.5 py-0.5 rounded bg-black/40 border border-white/20 text-amber-300 font-mono font-bold text-xs"
                        />
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleStartEditChild(child)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Edit Child Profile & Emoji"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteChild(child.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Delete Child"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Tasks & Behaviours Management */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <CheckSquare className="w-5 h-5 text-emerald-400" />
                  <h4 className="text-base font-black text-white tracking-tight">Tracked Habits & Tasks</h4>
                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                    {rewards.tasks.length} Active
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Select from over 30 suggested habits or create custom tasks. Assign different star values to tasks worth more effort!
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddTaskModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Add Tasks (Suggestions & Custom)</span>
              </button>
            </div>

            {/* Tasks List with Star Value Configurator */}
            <div className="divide-y divide-white/5 pt-1">
              {rewards.tasks.map((task) => (
                <div
                  key={task.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-white/[0.02] px-2 rounded-xl transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center font-bold text-base shrink-0">
                      {task.icon === 'bed' && '🛏️'}
                      {task.icon === 'book' && '📖'}
                      {task.icon === 'utensils' && '🍽️'}
                      {task.icon === 'heart' && '❤️'}
                      {task.icon === 'sparkles' && '✨'}
                      {task.icon === 'gamepad' && '🎮'}
                      {task.icon === 'music' && '🎵'}
                      {task.icon === 'apple' && '🍎'}
                      {task.icon === 'droplets' && '💧'}
                      {task.icon === 'shirt' && '👕'}
                      {task.icon === 'brain' && '🧠'}
                      {task.icon === 'sun' && '☀️'}
                      {task.icon === 'trash' && '🗑️'}
                      {(task.icon === 'thumbs-up' || task.icon === 'thumbsup') && '👍'}
                      {task.icon === 'activity' && '🏃'}
                      {task.icon === 'clock' && '⏰'}
                      {task.icon === 'star' && '⭐'}
                      {!['bed', 'book', 'utensils', 'heart', 'sparkles', 'gamepad', 'music', 'apple', 'droplets', 'shirt', 'brain', 'sun', 'trash', 'thumbs-up', 'thumbsup', 'activity', 'clock', 'star'].includes(task.icon || '') && '✨'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white text-sm">{task.title}</span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border bg-white/5 text-slate-300 border-white/10">
                          {task.category || 'habit'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Awards <strong className="text-amber-300 font-mono">+{task.points || 1} star{(task.points || 1) > 1 ? 's' : ''}</strong> when earned
                      </span>
                    </div>
                  </div>

                  {/* Star Value Assigner & Actions */}
                  <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0">
                    <div className="flex items-center gap-1.5 bg-black/40 border border-white/15 rounded-xl px-2 py-1">
                      <span className="text-[11px] font-bold text-slate-400 mr-0.5">Value:</span>
                      {[1, 2, 3, 5].map((pts) => {
                        const isSelected = (task.points || 1) === pts;
                        return (
                          <button
                            key={pts}
                            type="button"
                            onClick={() => handleUpdateTaskPoints(task.id, pts)}
                            className={`px-2 py-0.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                                : 'text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                            title={`Set to award ${pts} star${pts > 1 ? 's' : ''}`}
                          >
                            {pts}⭐
                          </button>
                        );
                      })}
                      {/* Custom Number Input */}
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={task.points || 1}
                        onChange={(e) => handleUpdateTaskPoints(task.id, Math.max(1, Math.min(10, parseInt(e.target.value, 10) || 1)))}
                        className="w-12 px-1 py-0.5 rounded bg-slate-950 border border-white/20 text-amber-300 font-mono font-bold text-xs text-center"
                        title="Custom star points"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                      title="Delete Task"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Reward Shop Catalog */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Gift className="w-5 h-5 text-yellow-400" />
                <h4 className="text-base font-black text-white tracking-tight">Reward Shop Treats & Prizes</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowAddShopItem(!showAddShopItem)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-400/20 hover:bg-yellow-400/30 border border-yellow-400/40 text-yellow-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Reward</span>
              </button>
            </div>

            {/* Add Shop Item Form */}
            {showAddShopItem && (
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-3 animate-fadeIn">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Prize Title</label>
                    <input
                      type="text"
                      value={newShopTitle}
                      onChange={(e) => setNewShopTitle(e.target.value)}
                      placeholder="e.g. Trampoline Park Trip"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Star Cost</label>
                    <input
                      type="number"
                      min="1"
                      value={newShopCost}
                      onChange={(e) => setNewShopCost(parseInt(e.target.value, 10) || 1)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Category</label>
                    <select
                      value={newShopCategory}
                      onChange={(e) => setNewShopCategory(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white font-bold"
                    >
                      <option value="treat">Treat</option>
                      <option value="activity">Activity</option>
                      <option value="privilege">Privilege</option>
                      <option value="toy">Toy / Gift</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-300 font-bold mb-1">Description (Optional)</label>
                    <input
                      type="text"
                      value={newShopDesc}
                      onChange={(e) => setNewShopDesc(e.target.value)}
                      placeholder="e.g. Saturday afternoon"
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowAddShopItem(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 text-white text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddShopItem}
                    className="px-4 py-1.5 rounded-xl bg-yellow-400 text-slate-950 text-xs font-black"
                  >
                    Save Reward
                  </button>
                </div>
              </div>
            )}

            {/* Reward Shop Items List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rewards.shopItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.title}</span>
                      <span className="font-mono font-bold text-amber-300 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/30 text-[11px]">
                        {item.cost}⭐
                      </span>
                    </div>
                    {item.description && <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteShopItem(item.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                    title="Delete Reward"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 5. Parent Security, Approvers & Audit Access */}
          <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-indigo-400" />
                <h4 className="text-base font-black text-white tracking-tight">Parent Security & Approvers</h4>
              </div>

              {/* Quick shortcut to Hidden Audit Log */}
              <button
                type="button"
                onClick={() => setSettingsSubTab('audit_log')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/30 text-indigo-300 font-bold text-xs transition-colors cursor-pointer"
              >
                <History className="w-3.5 h-3.5" />
                <span>Open Audit Log</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              {/* Approving Parents Profiles */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-slate-200 font-bold">Approving Parent Profiles</label>
                    <p className="text-[11px] text-slate-400">
                      These parent names appear on approval prompts and in the Audit Log
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddParent(!showAddParent)}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
                    title="Add Parent Name"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {showAddParent && (
                  <div className="flex items-center gap-2 animate-fadeIn pt-1">
                    <input
                      type="text"
                      value={newParentName}
                      onChange={(e) => setNewParentName(e.target.value)}
                      placeholder="e.g. Sarah or Dad"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-white/20 text-white font-bold text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddParent}
                      className="px-3 py-1.5 rounded-xl bg-indigo-500 text-white font-bold text-xs hover:bg-indigo-400 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {parentNames.map((p) => {
                    const isActive = activeParent === p;
                    return (
                      <div
                        key={p}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-indigo-500/25 border-indigo-400 text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-slate-300'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => updateRewards({ activeParent: p })}
                          className="flex items-center gap-1.5 cursor-pointer"
                          title={`Click to set ${p} as default approving parent`}
                        >
                          <UserCheck className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                          <span>{p}</span>
                          {isActive && (
                            <span className="text-[10px] text-indigo-300 font-mono font-bold">(Default)</span>
                          )}
                        </button>

                        {parentNames.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteParent(p)}
                            className="text-slate-500 hover:text-rose-400 ml-1"
                            title={`Remove ${p}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* PIN and Security Toggles */}
              <div className="space-y-3 p-4 rounded-2xl bg-white/[0.03] border border-white/10">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Parent 4-Digit PIN</label>
                  <input
                    type="password"
                    maxLength={4}
                    value={rewards.parentPin || '1234'}
                    onChange={(e) => updateRewards({ parentPin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                    className="w-32 px-3 py-2 rounded-xl bg-slate-950 border border-white/20 text-amber-300 font-mono font-bold tracking-widest text-base text-center"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Used to unlock the Audit Log and approve shop prize redemptions.
                  </p>
                </div>

                <div className="space-y-2.5 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rewards.showWidget !== false}
                      onChange={(e) => updateRewards({ showWidget: e.target.checked })}
                      className="rounded border-white/20 text-amber-500 focus:ring-0"
                    />
                    <span className="font-bold text-white">Show Star Bank Widget on Home Screen</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rewards.requirePinForRedemption !== false}
                      onChange={(e) => updateRewards({ requirePinForRedemption: e.target.checked })}
                      className="rounded border-white/20 text-amber-500 focus:ring-0"
                    />
                    <span className="font-bold text-white">Require PIN to redeem rewards</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rewards.enableSoundEffects !== false}
                      onChange={(e) => updateRewards({ enableSoundEffects: e.target.checked })}
                      className="rounded border-white/20 text-amber-500 focus:ring-0"
                    />
                    <span className="font-bold text-white">Play chime sounds when stars are earned</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal with Suggestions & Custom Creator */}
      <AddTaskModal
        isOpen={isAddTaskModalOpen}
        onClose={() => setIsAddTaskModalOpen(false)}
        existingTasks={rewards.tasks}
        onAddTask={handleAddCreatedTask}
      />
    </div>
  );
};

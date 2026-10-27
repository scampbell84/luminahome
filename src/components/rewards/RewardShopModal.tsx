import React, { useState } from 'react';
import { ChildProfile, RewardShopItem, RewardRedemption } from '../../types/config';
import { getAvatarEmoji } from '../../constants/avatarIcons';
import {
  X,
  Star,
  Gift,
  Film,
  Gamepad2,
  IceCream,
  Moon,
  Pizza,
  Sparkles,
  CheckCircle,
  History,
  Lock,
  ChevronRight,
} from 'lucide-react';
import { playRedeemFanfare } from '../../utils/soundEffects';
import { ParentPinModal } from './ParentPinModal';

interface RewardShopModalProps {
  childrenList: ChildProfile[];
  shopItems: RewardShopItem[];
  selectedChildId: string;
  onSelectChild: (id: string) => void;
  parentPin: string;
  requirePin: boolean;
  parentNames?: string[];
  activeParent?: string;
  redemptions: RewardRedemption[];
  onRedeem: (childId: string, item: RewardShopItem, approvedBy?: string) => void;
  onClose: () => void;
}

export const RewardShopModal: React.FC<RewardShopModalProps> = ({
  childrenList,
  shopItems,
  selectedChildId,
  onSelectChild,
  parentPin,
  requirePin,
  parentNames = ['Mom', 'Dad'],
  activeParent = 'Mom',
  redemptions,
  onRedeem,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [pendingRedeemItem, setPendingRedeemItem] = useState<RewardShopItem | null>(null);
  const [successCelebration, setSuccessCelebration] = useState<{ childName: string; itemTitle: string } | null>(null);
  const [showHistory, setShowHistory] = useState<boolean>(false);

  const activeChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  const getRewardIcon = (iconName?: string) => {
    switch (iconName?.toLowerCase()) {
      case 'film':
        return <Film className="w-6 h-6 text-indigo-400" />;
      case 'gamepad':
        return <Gamepad2 className="w-6 h-6 text-emerald-400" />;
      case 'ice-cream':
        return <IceCream className="w-6 h-6 text-pink-400" />;
      case 'moon':
        return <Moon className="w-6 h-6 text-amber-300" />;
      case 'pizza':
        return <Pizza className="w-6 h-6 text-orange-400" />;
      case 'gift':
      default:
        return <Gift className="w-6 h-6 text-yellow-400" />;
    }
  };

  const filteredItems = shopItems.filter((item) => {
    if (!item.enabled) return false;
    if (activeCategory === 'all') return true;
    return item.category === activeCategory;
  });

  const handleRedeemClick = (item: RewardShopItem) => {
    if (!activeChild || activeChild.currentStars < item.cost) return;
    if (requirePin) {
      setPendingRedeemItem(item);
    } else {
      executeRedemption(item, activeParent);
    }
  };

  const executeRedemption = (item: RewardShopItem, approvedBy?: string) => {
    if (!activeChild) return;
    onRedeem(activeChild.id, item, approvedBy || activeParent);
    playRedeemFanfare();
    setSuccessCelebration({ childName: activeChild.name, itemTitle: item.title });
    setTimeout(() => {
      setSuccessCelebration(null);
    }, 3500);
  };

  const childRedemptions = redemptions.filter((r) => r.childId === activeChild?.id);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-slate-900 border border-white/20 rounded-3xl p-5 sm:p-7 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Strip */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-lg">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Reward Shop</h2>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  Treats & Prizes
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Redeem your hard-earned stars for exciting real-world treats!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all cursor-pointer ${
                showHistory
                  ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                  : 'bg-white/10 border-white/15 text-slate-300 hover:text-white hover:bg-white/15'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Past Rewards</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 active:bg-white/30 text-white/70 hover:text-white transition-colors cursor-pointer"
              title="Close Shop"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Child Selector & Bank Balance Bar */}
        <div className="py-3 px-4 bg-slate-950/60 rounded-2xl border border-white/10 my-3 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Child Switcher */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Shopper:</span>
            {childrenList.map((c) => {
              const isSelected = c.id === activeChild?.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectChild(c.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/25 border-amber-400/60 text-white shadow-md'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-sm leading-none">{getAvatarEmoji(c.avatarIcon)}</span>
                  <span>{c.name}</span>
                </button>
              );
            })}
          </div>

          {/* Active Child's Star Bank Display */}
          {activeChild && (
            <div className="flex items-center gap-2.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-400/40 shadow-inner">
              <Star className="w-5 h-5 fill-amber-400 text-amber-400 animate-pulse" />
              <div className="text-left font-mono">
                <span className="text-base font-black text-amber-300">
                  {activeChild.currentStars}
                </span>{' '}
                <span className="text-xs font-semibold text-white/90">Stars in Bank</span>
              </div>
            </div>
          )}
        </div>

        {/* Category Filters */}
        {!showHistory && (
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-2 shrink-0">
            {[
              { id: 'all', label: 'All Rewards' },
              { id: 'privilege', label: 'Privileges' },
              { id: 'treat', label: 'Treats & Outings' },
              { id: 'toy', label: 'Toys & Surprises' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'bg-white/10 hover:bg-white/15 text-slate-300'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-0 pt-1">
          {showHistory ? (
            /* History View */
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Redemption History for {activeChild?.name}
              </h4>
              {childRedemptions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No rewards redeemed yet. Complete daily tasks and earn stars to shop!
                </div>
              ) : (
                childRedemptions.map((r) => (
                  <div
                    key={r.id}
                    className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{r.rewardTitle}</div>
                        <div className="text-[11px] text-slate-400">
                          {new Date(r.date).toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 font-mono font-bold text-amber-300">
                      <span>-{r.starCost}</span>
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            /* Rewards Grid */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pb-2">
              {filteredItems.map((item) => {
                const canAfford = Boolean(activeChild && activeChild.currentStars >= item.cost);
                const progressPct = activeChild
                  ? Math.min(100, Math.round((activeChild.currentStars / item.cost) * 100))
                  : 0;
                const deficit = activeChild ? Math.max(0, item.cost - activeChild.currentStars) : item.cost;

                return (
                  <div
                    key={item.id}
                    className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-3 ${
                      canAfford
                        ? 'bg-slate-800/90 hover:bg-slate-800 border-amber-400/40 shadow-lg hover:border-amber-300'
                        : 'bg-white/[0.04] border-white/10 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center shrink-0">
                            {getRewardIcon(item.icon)}
                          </div>
                          <div>
                            <h4 className="text-base font-black text-white tracking-tight">{item.title}</h4>
                            {item.description && (
                              <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">{item.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Cost Badge */}
                        <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono font-bold text-xs shrink-0 shadow-sm">
                          <span>{item.cost}</span>
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                          <span>
                            {activeChild?.currentStars || 0} / {item.cost} stars
                          </span>
                          <span className={canAfford ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                            {canAfford ? 'Ready to Redeem!' : `Need ${deficit} more`}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-400 to-yellow-300 shadow-[0_0_8px_#fbbf24]'
                                : 'bg-slate-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => handleRedeemClick(item)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs tracking-wide transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 active:scale-98 text-slate-950 font-black'
                          : 'bg-white/10 text-slate-500 cursor-not-allowed border border-white/5'
                      }`}
                    >
                      {canAfford ? (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Redeem for {item.cost} Stars</span>
                          {requirePin && <Lock className="w-3 h-3 opacity-60 ml-1" />}
                        </>
                      ) : (
                        <span>Needs {deficit} More Stars</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Celebration Toast Banner */}
        {successCelebration && (
          <div className="absolute inset-x-6 top-16 z-30 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-2xl flex items-center justify-center gap-3 animate-bounce border-2 border-emerald-300">
            <Sparkles className="w-6 h-6 text-yellow-300" />
            <div className="text-center">
              <div className="text-base font-black">Woohoo! Reward Approved! 🎉</div>
              <div className="text-xs text-white/90">
                {successCelebration.childName} redeemed &quot;{successCelebration.itemTitle}&quot;! Enjoy your prize!
              </div>
            </div>
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
        )}

        {/* Parent PIN Approval Modal */}
        {pendingRedeemItem && (
          <ParentPinModal
            title="Approve Reward Redemption"
            description={`Enter Parent PIN to approve ${activeChild?.name}'s redemption of "${pendingRedeemItem.title}" (${pendingRedeemItem.cost} stars).`}
            expectedPin={parentPin}
            parentNames={parentNames}
            activeParent={activeParent}
            onSuccess={(approver) => {
              const item = pendingRedeemItem;
              setPendingRedeemItem(null);
              executeRedemption(item, approver || activeParent);
            }}
            onCancel={() => setPendingRedeemItem(null)}
          />
        )}
      </div>
    </div>
  );
};

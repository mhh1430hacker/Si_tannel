"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { getAvailableRewards, claimReward, getUserClaimedRewards, isSupabaseConfigured } from "@/lib/supabase-api";
import type { Reward } from "@/lib/supabase-api";
import { getLeague } from "@/lib/league-system";
import { launchConfetti, playLevelUpSound } from "@/lib/effects";

export default function RewardsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [claimed, setClaimed] = useState<string[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(true);
  const [claimMessage, setClaimMessage] = useState("");
  const [revealedCoupon, setRevealedCoupon] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    if (!user) return;
    setLoadingRewards(true);

    if (isSupabaseConfigured()) {
      const [rewardsList, claimedList] = await Promise.all([
        getAvailableRewards(),
        getUserClaimedRewards(user.profile.id),
      ]);
      setRewards(rewardsList);
      setClaimed(claimedList);
    } else {
      // Fallback rewards
      setRewards([
        { id: "r1", title: "شارة المتميز", description: "حصلت على أكثر من 500 نقطة!", icon: "⭐", type: "badge", coupon_code: null, coupon_url: null, points_required: 500, league_required: null, is_active: true, max_claims: 999, current_claims: 0 },
        { id: "r2", title: "شارة البطل", description: "وصلت إلى الرتبة الفضية!", icon: "🥈", type: "badge", coupon_code: null, coupon_url: null, points_required: 1000, league_required: "silver", is_active: true, max_claims: 999, current_claims: 0 },
        { id: "r3", title: "شارة الأسطورة", description: "وصلت إلى الرتبة الذهبية!", icon: "🥇", type: "badge", coupon_code: null, coupon_url: null, points_required: 2000, league_required: "gold", is_active: true, max_claims: 999, current_claims: 0 },
        { id: "r4", title: "جائزة الماسي", description: "حققت الرتبة الماسية!", icon: "💎", type: "badge", coupon_code: null, coupon_url: null, points_required: 5000, league_required: "diamond", is_active: true, max_claims: 999, current_claims: 0 },
      ]);
    }
    setLoadingRewards(false);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (user) loadRewards();
  }, [user, loadRewards]);

  async function handleClaim(rewardId: string) {
    if (!user) return;

    if (isSupabaseConfigured()) {
      const result = await claimReward(user.profile.id, rewardId);
      setClaimMessage(result.message);
      if (result.success) {
        launchConfetti(3000);
        playLevelUpSound();
        setClaimed((prev) => [...prev, rewardId]);
        if (result.coupon_code) setRevealedCoupon(result.coupon_code);
      }
    } else {
      setClaimed((prev) => [...prev, rewardId]);
      launchConfetti(3000);
      playLevelUpSound();
      setClaimMessage("تم الحصول على الجائزة! 🎉");
    }

    setTimeout(() => setClaimMessage(""), 5000);
  }

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-indigo-950"><div className="animate-pulse text-indigo-300">جارٍ التحميل...</div></div>;
  }

  const userLeague = getLeague(user.total_points);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-indigo-950 to-purple-950 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        <a href="/dashboard" className="text-indigo-300 hover:text-white text-sm mb-6 inline-block">→ العودة</a>
        <h1 className="text-2xl font-bold text-white text-center mb-2">🎁 الجوائز والمكافآت</h1>
        <p className="text-indigo-300 text-center text-sm mb-8">اجمع النقاط واحصل على جوائز حقيقية!</p>

        {/* Current status */}
        <div className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-6 text-center">
          <span className="text-4xl">{userLeague.icon}</span>
          <p className="text-white font-bold">{user.total_points} نقطة</p>
          <p className="text-indigo-400 text-xs">{userLeague.nameAr}</p>
        </div>

        {claimMessage && (
          <div className="bg-green-600/20 border border-green-500/30 text-green-300 rounded-xl p-4 mb-4 text-center">
            {claimMessage}
          </div>
        )}

        {revealedCoupon && (
          <div className="bg-yellow-600/20 border border-yellow-500/30 rounded-xl p-4 mb-4 text-center">
            <p className="text-yellow-300 text-sm mb-1">🎟️ كود الكوبون:</p>
            <p className="text-white font-mono font-bold text-xl">{revealedCoupon}</p>
            <button
              onClick={() => { navigator.clipboard.writeText(revealedCoupon); setClaimMessage("تم النسخ!"); }}
              className="mt-2 px-4 py-1 bg-yellow-600/30 text-yellow-300 rounded-lg text-xs"
            >
              📋 نسخ
            </button>
          </div>
        )}

        {/* Rewards grid */}
        {loadingRewards ? (
          <div className="text-center text-indigo-300 animate-pulse">جارٍ تحميل الجوائز...</div>
        ) : (
          <div className="space-y-4">
            {rewards.map((reward) => {
              const isClaimed = claimed.includes(reward.id);
              const canClaim = user.total_points >= reward.points_required && !isClaimed;
              const leagueOk = !reward.league_required || getLeagueOrder(userLeague.id) >= getLeagueOrder(reward.league_required);
              const isLocked = user.total_points < reward.points_required || !leagueOk;

              return (
                <div key={reward.id} className={`rounded-2xl p-5 border transition-all ${isClaimed ? "bg-green-600/10 border-green-500/20" : isLocked ? "bg-white/5 border-white/5 opacity-60" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{reward.icon}</span>
                    <div className="flex-1">
                      <h3 className="text-white font-bold">{reward.title}</h3>
                      <p className="text-indigo-300 text-xs">{reward.description}</p>
                      <div className="flex gap-2 mt-1">
                        <span className="text-yellow-400 text-xs">{reward.points_required} نقطة</span>
                        {reward.league_required && (
                          <span className="text-indigo-400 text-xs">• {getLeague(getLeagueMinPoints(reward.league_required)).nameAr}</span>
                        )}
                        {reward.type === "coupon" && <span className="text-green-400 text-xs">🎟️ كوبون</span>}
                      </div>
                    </div>
                    <div>
                      {isClaimed ? (
                        <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-lg text-xs">تم الاستلام</span>
                      ) : canClaim && leagueOk ? (
                        <button onClick={() => handleClaim(reward.id)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-bold transition-all">
                          استلام
                        </button>
                      ) : (
                        <span className="px-3 py-1 bg-white/10 text-indigo-400 rounded-lg text-xs">🔒 مغلق</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getLeagueOrder(id: string): number {
  const order: Record<string, number> = { bronze: 0, silver: 1, gold: 2, diamond: 3, legendary: 4 };
  return order[id] ?? 0;
}

function getLeagueMinPoints(id: string): number {
  const pts: Record<string, number> = { bronze: 0, silver: 1000, gold: 2500, diamond: 5000, legendary: 10000 };
  return pts[id] ?? 0;
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  Sparkles, Fingerprint, Users, Zap, Brain, Radio, Loader2,
  Heart, Crown, MessageCircle, TrendingUp
} from "lucide-react";

// ─── 가치관 키워드 매핑 ───
const VALUE_TO_KEYWORD: Record<string, string> = {
  "원하는 것을 살 수 있는 풍요": "풍요",
  "사랑하는 사람과 함께하는 시간": "사랑",
  "지금 당장 누리는 확실한 행복": "현재",
  "더 큰 미래를 위한 인내": "미래",
  "안정적이고 평온한 일상": "안정",
  "새로운 경험과 짜릿한 도전": "도전",
  "모두에게 인정받는 성공": "성공",
  "나만의 속도로 걷는 여유": "여유",
  "냉철하고 합리적인 판단": "이성",
  "깊이 공감하는 따뜻한 마음": "공감",
  "눈에 보이는 압도적 성과": "성과",
  "함께 걷는 과정의 유대감": "과정",
  "누구와도 차별화된 나만의 개성": "개성",
  "모두와 어우러지는 소속감": "소속",
  "오롯이 나에게 집중하는 자유": "자유",
  "소중한 사람을 위한 헌신": "헌신",
};

// ─── Aura 정의 (top value 기반) ───
const AURA_MAP: Record<string, { aura: string; description: string; gradient: string }> = {
  "풍요": { aura: "Golden Pulse", description: "풍요를 향한 본능이 세상을 움직이는 힘이 됩니다", gradient: "from-amber-400 to-yellow-500" },
  "사랑": { aura: "Warm Gravity", description: "사랑을 향한 중력이 모든 인연을 끌어당깁니다", gradient: "from-rose-400 to-pink-500" },
  "현재": { aura: "Present Flame", description: "지금 이 순간을 태우는 불꽃, 당신의 에너지입니다", gradient: "from-orange-400 to-red-500" },
  "미래": { aura: "Horizon Seeker", description: "먼 미래를 응시하는 눈, 인내가 곧 무기입니다", gradient: "from-blue-400 to-indigo-500" },
  "안정": { aura: "Still Water", description: "고요한 수면 아래 단단한 신념이 흐릅니다", gradient: "from-teal-400 to-cyan-500" },
  "도전": { aura: "Storm Rider", description: "폭풍 속에서 웃는 사람, 도전이 곧 산소입니다", gradient: "from-violet-400 to-purple-500" },
  "성공": { aura: "Crown Bearer", description: "정상을 향한 열망이 당신의 날개입니다", gradient: "from-amber-500 to-orange-500" },
  "여유": { aura: "Slow Orbit", description: "나만의 속도로 우주를 유영하는 자유로운 영혼", gradient: "from-emerald-400 to-teal-500" },
  "이성": { aura: "Crystal Mind", description: "냉철한 논리 속에 빛나는 다이아몬드 같은 판단력", gradient: "from-slate-400 to-zinc-500" },
  "공감": { aura: "Echo Heart", description: "타인의 마음을 비추는 거울, 공감의 주파수", gradient: "from-pink-400 to-rose-500" },
  "성과": { aura: "Impact Zone", description: "눈에 보이는 증거를 만드는 실행가의 힘", gradient: "from-red-400 to-orange-500" },
  "과정": { aura: "Bond Weaver", description: "함께 걷는 여정 속에서 유대를 짜는 장인", gradient: "from-sky-400 to-blue-500" },
  "개성": { aura: "Lone Star", description: "누구도 따라올 수 없는 나만의 빛을 발합니다", gradient: "from-fuchsia-400 to-pink-500" },
  "소속": { aura: "Magnetic Field", description: "사람들을 이어주는 보이지 않는 자기장", gradient: "from-blue-400 to-sky-500" },
  "자유": { aura: "Wild Wind", description: "어떤 것에도 묶이지 않는 바람 같은 존재", gradient: "from-cyan-400 to-teal-500" },
  "헌신": { aura: "Silent Guardian", description: "소중한 것을 지키는 조용하고 강한 빛", gradient: "from-amber-400 to-rose-500" },
};

// ─── 매력 키워드 → 인상 카테고리 매핑 ───
const CHARM_TO_IMPRESSION: Record<string, string> = {
  "다정다감": "따뜻한",
  "세심한 배려": "섬세한",
  "예쁜 말투": "부드러운",
  "매력적 외모": "시각적",
  "깊은 가치관": "깊이있는",
  "유머러스함": "유쾌한",
};

const VIBE_INFO: Record<string, { emoji: string; label: string }> = {
  "spark": { emoji: "\u{1F525}", label: "불꽃이 튀었어요" },
  "calm": { emoji: "\u{1F60A}", label: "편안하고 좋았어요" },
  "cold": { emoji: "\u{1F9CA}", label: "아쉬웠어요" },
};

// ─── 타입 ───
interface BidWithItem {
  itemName: string;
  keyword: string;
  amount: number;
}

interface FeedbackReceived {
  vibe: string;
  charms: string[];
  round: number;
}

interface ReportData {
  // Section 1: Aura Card
  topValues: BidWithItem[];
  aura: { aura: string; description: string; gradient: string } | null;
  totalSpent: number;

  // Section 2: Lone Pioneer
  rareValues: { keyword: string; fullName: string; myAmount: number; bidderCount: number; totalUsers: number }[];

  // Section 3: Feedback
  feedbacks: FeedbackReceived[];
  charmRanking: { charm: string; count: number }[];
  vibeBreakdown: { vibe: string; count: number }[];

  // Section 4: Paradox
  selfIdentity: string;   // 내가 가장 많이 투자한 가치 키워드
  perceivedCharm: string;  // 남들이 가장 많이 선택한 매력 키워드
  isPardoxFound: boolean;

  // Section 5: Instinct
  likedUserValues: { keyword: string; count: number }[];
  totalLikes: number;
}

export default function FinalReportPage({ params }: { params: any }) {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    if (params) {
      params.then((p: any) => setUserId(p.id));
    }
  }, [params]);

  const buildReport = useCallback(async (uid: string) => {
    // 모든 데이터 병렬 fetch
    const [usersRes, bidsRes, itemsRes, feedbackRes, feedLikesRes] = await Promise.all([
      supabase.from("users").select("*"),
      supabase.from("bids").select("*"),
      supabase.from("auction_items").select("*"),
      supabase.from("conversation_feedback").select("*").eq("partner_id", uid),
      supabase.from("feed_likes").select("user_id, target_user_id"),
    ]);

    const allUsers = usersRes.data || [];
    const allBids = bidsRes.data || [];
    const items = itemsRes.data || [];
    const feedbacks = feedbackRes.data || [];
    const allFeedLikes = feedLikesRes.data || [];

    const me = allUsers.find(u => String(u.id) === String(uid));
    if (me) setUser(me);

    // ─── Section 1: Aura Card - 내 bid 집계 ───
    const myBids = allBids.filter(b => String(b.user_id) === String(uid));
    const bidMap = new Map<string, number>();
    myBids.forEach(b => {
      const item = items.find(i => i.id === b.auction_item_id);
      const name = item?.title || "";
      if (name) bidMap.set(name, (bidMap.get(name) || 0) + (b.amount || 0));
    });

    const topValues: BidWithItem[] = Array.from(bidMap, ([itemName, amount]) => ({
      itemName,
      keyword: VALUE_TO_KEYWORD[itemName] || itemName,
      amount,
    })).sort((a, b) => b.amount - a.amount);

    const totalSpent = topValues.reduce((sum, v) => sum + v.amount, 0);
    const topKeyword = topValues[0]?.keyword || "";
    const aura = AURA_MAP[topKeyword] || null;

    // ─── Section 2: Lone Pioneer - 희소 가치관 ───
    // 각 아이템별 입찰자 수 계산
    const itemBidderMap = new Map<string, Set<string>>();
    allBids.forEach(b => {
      const item = items.find(i => i.id === b.auction_item_id);
      const name = item?.title || "";
      if (!name) return;
      if (!itemBidderMap.has(name)) itemBidderMap.set(name, new Set());
      itemBidderMap.get(name)!.add(String(b.user_id));
    });

    const rareValues = topValues
      .filter(v => {
        const bidders = itemBidderMap.get(v.itemName);
        return bidders && bidders.has(String(uid));
      })
      .map(v => ({
        keyword: v.keyword,
        fullName: v.itemName,
        myAmount: v.amount,
        bidderCount: itemBidderMap.get(v.itemName)?.size || 0,
        totalUsers: allUsers.length,
      }))
      .sort((a, b) => a.bidderCount - b.bidderCount)
      .slice(0, 3);

    // ─── Section 3: Feedback - 인연의 잔상 ───
    const feedbackData: FeedbackReceived[] = feedbacks.map(f => ({
      vibe: f.vibe,
      charms: f.charms || [],
      round: f.round,
    }));

    // 매력 키워드 집계
    const charmCount = new Map<string, number>();
    feedbackData.forEach(f => {
      f.charms.forEach(c => {
        charmCount.set(c, (charmCount.get(c) || 0) + 1);
      });
    });
    const charmRanking = Array.from(charmCount, ([charm, count]) => ({ charm, count }))
      .sort((a, b) => b.count - a.count);

    // 바이브 집계
    const vibeCount = new Map<string, number>();
    feedbackData.forEach(f => {
      vibeCount.set(f.vibe, (vibeCount.get(f.vibe) || 0) + 1);
    });
    const vibeBreakdown = Array.from(vibeCount, ([vibe, count]) => ({ vibe, count }))
      .sort((a, b) => b.count - a.count);

    // ─── Section 4: Paradox ───
    const selfIdentity = topKeyword;
    const perceivedCharm = charmRanking[0]?.charm || "";
    // 자기표현 vs 타인인식 불일치 판별
    const WARM_CHARMS = ["다정다감", "세심한 배려", "예쁜 말투"];
    const COOL_VALUES = ["이성", "성과", "성공", "자유", "개성"];
    const COOL_CHARMS = ["깊은 가치관", "매력적 외모"];
    const WARM_VALUES = ["사랑", "공감", "헌신", "과정", "소속"];

    const isPardoxFound = (
      (COOL_VALUES.includes(selfIdentity) && WARM_CHARMS.includes(perceivedCharm)) ||
      (WARM_VALUES.includes(selfIdentity) && COOL_CHARMS.includes(perceivedCharm))
    );

    // ─── Section 5: Instinct - 내가 좋아한 사람들의 가치관 분석 ───
    const myLikes = allFeedLikes.filter(l => String(l.user_id) === String(uid));
    const likedUserIds = [...new Set(myLikes.map(l => String(l.target_user_id)))];

    // 좋아한 사람들의 top value 집계
    const likedValueCount = new Map<string, number>();
    likedUserIds.forEach(likedUid => {
      const theirBids = allBids.filter(b => String(b.user_id) === likedUid);
      const theirBidMap = new Map<string, number>();
      theirBids.forEach(b => {
        const item = items.find(i => i.id === b.auction_item_id);
        const name = item?.title || "";
        if (name) theirBidMap.set(name, (theirBidMap.get(name) || 0) + (b.amount || 0));
      });
      // top value
      let topItem = "";
      let topAmount = 0;
      theirBidMap.forEach((amount, name) => {
        if (amount > topAmount) { topAmount = amount; topItem = name; }
      });
      if (topItem) {
        const kw = VALUE_TO_KEYWORD[topItem] || topItem;
        likedValueCount.set(kw, (likedValueCount.get(kw) || 0) + 1);
      }
    });

    const likedUserValues = Array.from(likedValueCount, ([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    setReportData({
      topValues: topValues.slice(0, 5),
      aura,
      totalSpent,
      rareValues,
      feedbacks: feedbackData,
      charmRanking,
      vibeBreakdown,
      selfIdentity,
      perceivedCharm,
      isPardoxFound,
      likedUserValues,
      totalLikes: myLikes.length,
    });
  }, []);

  // Check access + build report
  useEffect(() => {
    if (!userId) return;

    const init = async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'is_final_report_open')
        .single();

      if (data?.value !== 'true') {
        router.replace(`/1on1/report/${userId}`);
        return;
      }

      await buildReport(userId);
      setIsLoading(false);
    };

    init();

    // Realtime: if admin closes, redirect back
    const channel = supabase
      .channel('final_report_access')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_settings',
      }, (payload) => {
        const row = payload.new as { key: string; value: string };
        if (row.key === 'is_final_report_open' && row.value !== 'true') {
          router.replace(`/1on1/report/${userId}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router, buildReport]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-amber-400 animate-spin" size={40} />
      </div>
    );
  }

  const d = reportData;

  return (
    <div className="min-h-screen font-serif pb-24 antialiased select-none bg-black text-white">
      {/* Header */}
      <motion.header
        className="text-center pt-20 pb-12 px-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-400 to-yellow-500 rounded-full mb-6 shadow-[0_0_40px_rgba(245,158,11,0.3)]"
        >
          <Sparkles size={28} className="text-white" />
        </motion.div>
        <p className="text-[10px] font-sans font-black tracking-[0.4em] uppercase mb-3 text-amber-400">The Signature</p>
        <h1 className="text-3xl italic font-bold tracking-tight mb-2 text-white">{user?.nickname}님의 시그니처</h1>
        <p className="text-sm text-amber-200/50 mt-4 leading-relaxed max-w-md mx-auto">
          오늘 이 공간에서 당신이 증명한 가치를<br />가장 아름다운 방식으로 복원했습니다.
        </p>
        <div className="h-px w-12 mx-auto bg-amber-500/30 mt-6" />
      </motion.header>

      <section className="max-w-xl mx-auto px-6 space-y-6">

        {/* ═══════ Section 1: The Aura Card ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-stone-900 to-stone-950 border border-amber-500/20 rounded-[2rem] p-7 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="flex items-center gap-2 mb-3">
            <Fingerprint size={20} className="text-amber-400" />
            <span className="text-[9px] font-sans font-black uppercase tracking-[0.3em] text-amber-500/70">IDENTITY</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">The Aura Card</h3>
          <p className="text-sm text-amber-200/40 mb-5">당신만의 시그니처 아우라</p>

          {d?.aura ? (
            <div className="space-y-5">
              {/* Aura Badge */}
              <div className={`bg-gradient-to-r ${d.aura.gradient} rounded-2xl p-6 text-center`}>
                <p className="text-[10px] font-sans font-black uppercase tracking-[0.4em] text-white/70 mb-2">Your Aura</p>
                <h4 className="text-2xl font-black text-white mb-2">{d.aura.aura}</h4>
                <p className="text-sm text-white/80 leading-relaxed break-keep">{d.aura.description}</p>
              </div>

              {/* Top Values */}
              <div className="space-y-2">
                <p className="text-[10px] font-sans font-black uppercase tracking-widest text-amber-500/50 mb-3">Value Ranking</p>
                {d.topValues.map((v, i) => {
                  const pct = d.totalSpent > 0 ? Math.round((v.amount / d.totalSpent) * 100) : 0;
                  return (
                    <motion.div
                      key={v.itemName}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.08 }}
                      className="flex items-center gap-3"
                    >
                      <span className="text-amber-500/50 text-xs font-bold w-5 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-white/90">{v.keyword}</span>
                          <span className="text-xs text-amber-400/60">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-500/40 text-center py-8">경매 데이터가 없습니다</p>
          )}
        </motion.div>

        {/* ═══════ Section 2: The Lone Pioneer ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-br from-stone-900 to-stone-950 border border-amber-500/20 rounded-[2rem] p-7 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="flex items-center gap-2 mb-3">
            <Zap size={20} className="text-amber-400" />
            <span className="text-[9px] font-sans font-black uppercase tracking-[0.3em] text-amber-500/70">SCARCITY</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">The Lone Pioneer</h3>
          <p className="text-sm text-amber-200/40 mb-5">당신만이 선택한 독보적 가치관</p>

          {d && d.rareValues.length > 0 ? (
            <div className="space-y-3">
              {d.rareValues.map((rv, i) => {
                const ratio = Math.round((rv.bidderCount / rv.totalUsers) * 100);
                return (
                  <motion.div
                    key={rv.keyword}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                    className="bg-white/5 border border-amber-500/10 rounded-2xl p-5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {rv.bidderCount <= 2 && <Crown size={14} className="text-amber-400" />}
                        <span className="text-base font-bold text-white">{rv.keyword}</span>
                      </div>
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">
                        {rv.bidderCount}/{rv.totalUsers}명
                      </span>
                    </div>
                    <p className="text-xs text-white/40 mb-2 break-keep">{rv.fullName}</p>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${rv.bidderCount <= 2 ? 'bg-gradient-to-r from-amber-400 to-yellow-400' : 'bg-amber-500/50'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${ratio}%` }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                      />
                    </div>
                    <p className="text-[10px] text-amber-400/50 mt-2">
                      {rv.bidderCount <= 2
                        ? `전체 ${rv.totalUsers}명 중 오직 ${rv.bidderCount}명만 선택`
                        : `참가자의 ${ratio}%가 선택`
                      }
                    </p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-amber-500/40 text-center py-8">데이터를 분석 중입니다</p>
          )}
        </motion.div>

        {/* ═══════ Section 3: The Feedback ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-gradient-to-br from-stone-900 to-stone-950 border border-amber-500/20 rounded-[2rem] p-7 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="flex items-center gap-2 mb-3">
            <Radio size={20} className="text-amber-400" />
            <span className="text-[9px] font-sans font-black uppercase tracking-[0.3em] text-amber-500/70">THE ECHO</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">The Feedback</h3>
          <p className="text-sm text-amber-200/40 mb-5">대화 상대가 남긴 당신의 온도</p>

          {d && d.feedbacks.length > 0 ? (
            <div className="space-y-5">
              {/* Vibe Summary */}
              <div className="flex gap-2">
                {d.vibeBreakdown.map(v => {
                  const info = VIBE_INFO[v.vibe];
                  if (!info) return null;
                  return (
                    <div key={v.vibe} className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                      <span className="text-xl">{info.emoji}</span>
                      <p className="text-lg font-black text-white mt-1">{v.count}</p>
                      <p className="text-[10px] text-white/40 break-keep">{info.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Charm Keywords */}
              {d.charmRanking.length > 0 && (
                <div>
                  <p className="text-[10px] font-sans font-black uppercase tracking-widest text-amber-500/50 mb-3">매력 키워드</p>
                  <div className="flex flex-wrap gap-2">
                    {d.charmRanking.map((c, i) => (
                      <motion.div
                        key={c.charm}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.08 }}
                        className={`px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-1.5 ${
                          i === 0
                            ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black'
                            : 'bg-white/10 text-white/80 border border-white/10'
                        }`}
                      >
                        {i === 0 && <Crown size={12} />}
                        {c.charm}
                        <span className={`text-xs ${i === 0 ? 'text-black/50' : 'text-white/40'}`}>x{c.count}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-amber-200/30 text-center">
                총 {d.feedbacks.length}명의 대화 상대가 평가
              </p>
            </div>
          ) : (
            <p className="text-sm text-amber-500/40 text-center py-8">아직 수집된 피드백이 없습니다</p>
          )}
        </motion.div>

        {/* ═══════ Section 4: Persona Paradox ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gradient-to-br from-stone-900 to-stone-950 border border-amber-500/20 rounded-[2rem] p-7 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="flex items-center gap-2 mb-3">
            <Brain size={20} className="text-amber-400" />
            <span className="text-[9px] font-sans font-black uppercase tracking-[0.3em] text-amber-500/70">PARADOX</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Persona Paradox</h3>
          <p className="text-sm text-amber-200/40 mb-5">의도와 인상 사이, 반전 매력의 증명</p>

          {d && d.selfIdentity && d.perceivedCharm ? (
            <div className="space-y-5">
              {/* VS Card */}
              <div className="flex items-center gap-3">
                {/* Self */}
                <div className="flex-1 bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 rounded-2xl p-5 text-center">
                  <p className="text-[9px] font-sans font-black uppercase tracking-widest text-violet-400/70 mb-2">내가 표현한 나</p>
                  <p className="text-2xl font-black text-violet-300">{d.selfIdentity}</p>
                  <p className="text-[10px] text-violet-400/50 mt-1">최고 입찰 가치관</p>
                </div>

                <div className="text-amber-500/50 font-black text-xs shrink-0">VS</div>

                {/* Perceived */}
                <div className="flex-1 bg-gradient-to-br from-rose-500/20 to-pink-500/10 border border-rose-500/20 rounded-2xl p-5 text-center">
                  <p className="text-[9px] font-sans font-black uppercase tracking-widest text-rose-400/70 mb-2">상대가 느낀 나</p>
                  <p className="text-2xl font-black text-rose-300">{d.perceivedCharm}</p>
                  <p className="text-[10px] text-rose-400/50 mt-1">가장 많이 받은 매력</p>
                </div>
              </div>

              {/* Verdict */}
              <div className={`rounded-2xl p-5 text-center ${d.isPardoxFound ? 'bg-amber-400/10 border border-amber-400/20' : 'bg-white/5 border border-white/10'}`}>
                {d.isPardoxFound ? (
                  <>
                    <Sparkles size={20} className="text-amber-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-amber-300 mb-1">반전 매력 발견!</p>
                    <p className="text-xs text-amber-200/60 leading-relaxed break-keep">
                      &ldquo;{d.selfIdentity}&rdquo;을 추구하는 당신에게서 사람들은 &ldquo;{d.perceivedCharm}&rdquo;을 느꼈습니다.<br />
                      의외의 갭이 만드는 매력, 그것이 당신의 시그니처입니다.
                    </p>
                  </>
                ) : (
                  <>
                    <Heart size={20} className="text-white/40 mx-auto mb-2" />
                    <p className="text-sm font-bold text-white/70 mb-1">일관된 매력</p>
                    <p className="text-xs text-white/40 leading-relaxed break-keep">
                      당신이 표현한 가치와 상대방이 느낀 인상이 일치합니다.<br />
                      진정성 있는 매력, 그 자체가 경쟁력입니다.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-amber-500/40 text-center py-8">
              {!d?.selfIdentity ? "경매 데이터가 필요합니다" : "피드백 데이터가 필요합니다"}
            </p>
          )}
        </motion.div>

        {/* ═══════ Section 5: Subconscious Frequency ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-br from-stone-900 to-stone-950 border border-amber-500/20 rounded-[2rem] p-7 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

          <div className="flex items-center gap-2 mb-3">
            <Users size={20} className="text-amber-400" />
            <span className="text-[9px] font-sans font-black uppercase tracking-[0.3em] text-amber-500/70">INSTINCT</span>
          </div>
          <h3 className="text-lg font-bold text-white mb-1">Subconscious Frequency</h3>
          <p className="text-sm text-amber-200/40 mb-5">당신의 본능이 향한 이상형 분석</p>

          {d && d.likedUserValues.length > 0 ? (
            <div className="space-y-5">
              <p className="text-xs text-white/40 leading-relaxed break-keep">
                피드에서 하트를 보낸 <span className="text-amber-400 font-bold">{d.totalLikes}번</span>의 선택을 분석한 결과,
                당신의 무의식이 끌린 가치관 패턴입니다.
              </p>

              <div className="space-y-2.5">
                {d.likedUserValues.map((lv, i) => {
                  const maxCount = d.likedUserValues[0]?.count || 1;
                  const pct = Math.round((lv.count / maxCount) * 100);
                  return (
                    <motion.div
                      key={lv.keyword}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.08 }}
                      className="flex items-center gap-3"
                    >
                      <span className={`text-xs font-bold w-5 text-right ${i === 0 ? 'text-amber-400' : 'text-white/30'}`}>{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-white/90 flex items-center gap-1.5">
                            {i === 0 && <Heart size={12} className="text-rose-400" fill="#fb7185" />}
                            {lv.keyword}
                          </span>
                          <span className="text-xs text-white/40">{lv.count}명</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-rose-400 to-pink-500' : 'bg-white/20'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ delay: 0.9 + i * 0.08, duration: 0.5 }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {d.likedUserValues[0] && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                  <p className="text-xs text-white/50 break-keep">
                    당신의 본능은 <span className="text-amber-400 font-bold">&ldquo;{d.likedUserValues[0].keyword}&rdquo;</span>을
                    가진 사람에게 가장 강하게 반응합니다.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-amber-500/40 text-center py-8">피드 활동 데이터가 없습니다</p>
          )}
        </motion.div>

      </section>
    </div>
  );
}

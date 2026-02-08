"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { getAuth } from "@/lib/utils/auth-storage";
import { toPng } from "html-to-image";
import {
  Sparkles, Fingerprint, Users, Zap, Brain, Radio, Loader2,
  Heart, Crown, MessageCircle, TrendingUp, Share2, Check, Download, Link, X
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
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (params) {
      params.then((p: any) => setUserId(p.id));
    }
  }, [params]);

  // 스냅샷에서 데이터 로드 시도
  const loadFromSnapshot = useCallback(async (uid: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/report/${uid}`);
      const data = await res.json();
      if (data.success && data.snapshots?.signature?.data) {
        const snap = data.snapshots.signature.data;
        if (snap.user) setUser(snap.user);
        setReportData({
          topValues: snap.topValues || [],
          aura: snap.aura || null,
          totalSpent: snap.totalSpent || 0,
          rareValues: snap.rareValues || [],
          feedbacks: snap.feedbacks || [],
          charmRanking: snap.charmRanking || [],
          vibeBreakdown: snap.vibeBreakdown || [],
          selfIdentity: snap.selfIdentity || "",
          perceivedCharm: snap.perceivedCharm || "",
          isPardoxFound: snap.isParadoxFound ?? snap.isPardoxFound ?? false,
          likedUserValues: snap.likedUserValues || [],
          totalLikes: snap.totalLikes || 0,
        });
        // 공유 토큰이 있으면 shareUrl도 설정
        if (data.snapshots.signature.share_token) {
          setShareUrl(`${window.location.origin}/share/${data.snapshots.signature.share_token}`);
        }
        return true;
      }
    } catch {}
    return false;
  }, []);

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
      // API를 통해 phase 확인 (RLS 우회)
      let settings: any = null;
      try {
        const res = await fetch('/api/admin/phase', { cache: 'no-store' });
        const result = await res.json();
        if (result.success) settings = result.settings;
      } catch {}

      // 이전 회차 유저는 항상 접근 허용
      const auth = getAuth();
      const currentSession = settings?.current_session || "";
      const isPreviousSession = !!(auth?.session_id && currentSession && auth.session_id !== currentSession);

      if (!isPreviousSession) {
        const isOpen = settings?.is_final_report_open === 'true';
        const isCompleted = settings?.current_phase === 'completed';

        if (!isOpen && !isCompleted) {
          router.replace(`/1on1/report/${userId}`);
          return;
        }
      }

      // 스냅샷 우선 로드, 없으면 라이브 데이터
      const snapshotLoaded = await loadFromSnapshot(userId);
      if (!snapshotLoaded) {
        await buildReport(userId);
      }
      setIsLoading(false);
    };

    init();

    // Realtime: if admin closes and not in completed phase, redirect back
    const channel = supabase
      .channel('final_report_access')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'system_settings',
      }, async (payload) => {
        const row = payload.new as { key: string; value: string };
        if (row.key === 'is_final_report_open' && row.value !== 'true') {
          // completed phase 또는 이전 회차 유저이면 유지
          try {
            const res = await fetch('/api/admin/phase', { cache: 'no-store' });
            const result = await res.json();
            if (result.settings?.current_phase === 'completed') return;

            const currentAuth = getAuth();
            const currentSession = result.settings?.current_session || "";
            if (currentAuth?.session_id && currentAuth.session_id !== currentSession) return;
          } catch { return; }
          router.replace(`/1on1/report/${userId}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, router, buildReport, loadFromSnapshot]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center">
        <Loader2 className="text-indigo-400 animate-spin" size={40} />
      </div>
    );
  }

  const d = reportData;

  return (
    <div className="min-h-screen font-serif pb-24 antialiased select-none bg-gradient-to-b from-sky-50/50 to-[#FAF9F6]">
      <div ref={reportRef}>
      {/* Header — 딥스페이스 */}
      <motion.header
        className="text-center pt-16 pb-10 px-6 bg-[#070714] rounded-b-[2.5rem] relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* 별 파티클 */}
        {[
          { top: "12%", left: "8%", size: 2, delay: 0.3, dur: 3 },
          { top: "20%", left: "85%", size: 1.5, delay: 0.8, dur: 4 },
          { top: "35%", left: "15%", size: 1, delay: 1.2, dur: 3.5 },
          { top: "18%", left: "72%", size: 2.5, delay: 0.5, dur: 2.8 },
          { top: "55%", left: "90%", size: 1, delay: 1.5, dur: 3.2 },
          { top: "65%", left: "5%", size: 1.5, delay: 0.2, dur: 4.2 },
          { top: "45%", left: "25%", size: 1, delay: 1.8, dur: 3.8 },
          { top: "30%", left: "60%", size: 2, delay: 0.7, dur: 3 },
          { top: "70%", left: "40%", size: 1.5, delay: 1.0, dur: 2.5 },
          { top: "50%", left: "78%", size: 1, delay: 1.4, dur: 3.6 },
          { top: "8%", left: "45%", size: 1.5, delay: 0.4, dur: 4.5 },
          { top: "75%", left: "68%", size: 2, delay: 0.9, dur: 3.3 },
        ].map((s, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white"
            style={{ top: s.top, left: s.left, width: s.size, height: s.size }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.2, 0.9, 0] }}
            transition={{ delay: s.delay, duration: s.dur, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring" }}
          className="relative inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full mb-5 shadow-[0_0_40px_rgba(129,140,248,0.3)]"
        >
          <Sparkles size={24} className="text-white" />
        </motion.div>
        <p className="relative text-[9px] font-sans font-black tracking-[0.4em] uppercase mb-3 text-indigo-300">The Signature</p>
        <h1 className="relative text-2xl italic font-bold tracking-tight mb-2 text-white">{user?.nickname}님의 시그니처</h1>
        <p className="relative text-xs text-indigo-200/50 mt-4 leading-relaxed max-w-md mx-auto">
          오늘 이 공간에서 당신이 증명한 가치를<br />가장 아름다운 방식으로 복원했습니다.
        </p>
        <div className="relative h-px w-12 mx-auto bg-indigo-400/30 mt-6" />
      </motion.header>

      <section className="max-w-xl mx-auto px-5 space-y-5 pt-6">

        {/* ═══════ Section 1: The Aura Card ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-indigo-100/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <Fingerprint size={16} className="text-indigo-500" />
            <span className="text-[8px] font-sans font-black uppercase tracking-[0.3em] text-indigo-400">IDENTITY</span>
          </div>
          <h3 className="text-base font-bold text-stone-900 mb-1">The Aura Card</h3>
          <p className="text-xs text-stone-900 mb-4">당신만의 시그니처 아우라</p>

          {d?.aura ? (
            <div className="space-y-5">
              {/* Aura Badge */}
              <div className={`bg-gradient-to-r ${d.aura.gradient} rounded-2xl p-5 text-center shadow-lg`}>
                <p className="text-[9px] font-sans font-black uppercase tracking-[0.4em] text-white/70 mb-1.5">Your Aura</p>
                <h4 className="text-xl font-black text-white mb-1.5">{d.aura.aura}</h4>
                <p className="text-xs text-white/80 leading-relaxed break-keep">{d.aura.description}</p>
              </div>

              {/* Top Values */}
              <div className="space-y-2">
                <p className="text-[10px] font-sans font-black uppercase tracking-widest text-stone-900 mb-3">Value Ranking</p>
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
                      <span className="text-indigo-300 text-xs font-bold w-5 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-stone-800">{v.keyword}</span>
                          <span className="text-[10px] text-stone-900">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full"
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
            <p className="text-sm text-stone-900 text-center py-8">경매 데이터가 없습니다</p>
          )}
        </motion.div>

        {/* ═══════ Section 2: The Lone Pioneer ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-indigo-100/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <Zap size={16} className="text-indigo-500" />
            <span className="text-[8px] font-sans font-black uppercase tracking-[0.3em] text-indigo-400">SCARCITY</span>
          </div>
          <h3 className="text-base font-bold text-stone-900 mb-1">The Lone Pioneer</h3>
          <p className="text-xs text-stone-900 mb-0.5">절대 포기할 수 없는 내 가치관</p>
          <p className="text-[10px] text-stone-800 mb-4">&ldquo;나는 어느 위치에?&rdquo;</p>

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
                    className="bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {rv.bidderCount <= 2 && <Crown size={12} className="text-indigo-500" />}
                        <span className="text-sm font-bold text-stone-900">{rv.keyword}</span>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-500 bg-indigo-100 px-2 py-0.5 rounded-full">
                        {rv.bidderCount}/{rv.totalUsers}명
                      </span>
                    </div>
                    <p className="text-xs text-stone-900 mb-2 break-keep">{rv.fullName}</p>
                    <div className="w-full h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${rv.bidderCount <= 2 ? 'bg-gradient-to-r from-indigo-400 to-purple-400' : 'bg-indigo-300'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${ratio}%` }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                      />
                    </div>
                    <p className="text-[10px] text-indigo-400 mt-2">
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
            <p className="text-sm text-stone-900 text-center py-8">데이터를 분석 중입니다</p>
          )}
        </motion.div>

        {/* ═══════ Section 3: The Feedback ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-indigo-100/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <Radio size={16} className="text-indigo-500" />
            <span className="text-[8px] font-sans font-black uppercase tracking-[0.3em] text-indigo-400">THE ECHO</span>
          </div>
          <h3 className="text-base font-bold text-stone-900 mb-1">The Feedback</h3>
          <p className="text-xs text-stone-900 mb-4">대화 상대가 남긴 당신의 온도</p>

          {d && d.feedbacks.length > 0 ? (
            <div className="space-y-5">
              {/* Vibe Summary */}
              <div className="flex gap-2">
                {d.vibeBreakdown.map(v => {
                  const info = VIBE_INFO[v.vibe];
                  if (!info) return null;
                  return (
                    <div key={v.vibe} className="flex-1 bg-indigo-50/80 border border-indigo-100 rounded-xl p-3 text-center">
                      <span className="text-lg">{info.emoji}</span>
                      <p className="text-base font-black text-stone-900 mt-1">{v.count}</p>
                      <p className="text-[9px] text-stone-900 break-keep">{info.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Charm Keywords */}
              {d.charmRanking.length > 0 && (
                <div>
                  <p className="text-[10px] font-sans font-black uppercase tracking-widest text-stone-900 mb-3">매력 키워드</p>
                  <div className="flex flex-wrap gap-2">
                    {d.charmRanking.map((c, i) => (
                      <motion.div
                        key={c.charm}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + i * 0.08 }}
                        className={`px-3 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 ${
                          i === 0
                            ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-purple-200/50'
                            : 'bg-stone-100 text-stone-800 border border-stone-200'
                        }`}
                      >
                        {i === 0 && <Crown size={12} />}
                        {c.charm}
                        <span className={`text-[10px] ${i === 0 ? 'text-white/60' : 'text-stone-900'}`}>x{c.count}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-stone-900 text-center">
                총 {d.feedbacks.length}명의 대화 상대가 평가
              </p>

              {/* spark 있을 때: 연결 유도 */}
              {d.vibeBreakdown.some(v => v.vibe === "spark") ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-5 text-center"
                >
                  <p className="text-xs text-stone-800 leading-relaxed break-keep">
                    이 공간에서 당신은 누군가의<br />심장을 뛰게 했어요.
                  </p>
                  <p className="text-[10px] text-rose-500 font-bold mt-2 break-keep">
                    그분과의 연결을 원하면 주최자에게 알려주세요.
                  </p>
                </motion.div>
              ) : (
                /* 재방문 유도: spark 없이 calm/cold만 있을 때 */
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 text-center"
                >
                  <p className="text-[10px] text-stone-900 leading-relaxed break-keep mb-2">
                    불꽃이 없었던 건 매력이 부족해서가 아니에요.<br />
                    짧은 시간 안에 서로의 결을 온전히 느끼긴 어려우니까요.
                  </p>
                  <p className="text-xs font-bold text-indigo-600 break-keep">
                    더 좋은 타이밍에 다시 인연을 찾아봐요
                  </p>
                </motion.div>
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-900 text-center py-8">아직 수집된 피드백이 없습니다</p>
          )}
        </motion.div>

        {/* ═══════ Section 4: Persona Paradox ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-indigo-100/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <Brain size={16} className="text-indigo-500" />
            <span className="text-[8px] font-sans font-black uppercase tracking-[0.3em] text-indigo-400">PARADOX</span>
          </div>
          <h3 className="text-base font-bold text-stone-900 mb-1">Persona Paradox</h3>
          <p className="text-xs text-stone-900 mb-4">의도와 인상 사이, 반전 매력의 증명</p>

          {d && d.selfIdentity && d.perceivedCharm ? (
            <div className="space-y-4">
              {/* VS Card — grid로 양쪽 동일 크기 */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2.5">
                {/* Self */}
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-4 text-center flex flex-col justify-center">
                  <p className="text-[8px] font-sans font-black uppercase tracking-widest text-indigo-400 mb-1.5">내가 표현한 나</p>
                  <p className="text-xl font-black text-indigo-700">{d.selfIdentity}</p>
                  <p className="text-[9px] text-stone-900 mt-1">최고 입찰 가치관</p>
                </div>

                <div className="flex items-center text-stone-900 font-black text-[10px] shrink-0 px-0.5">VS</div>

                {/* Perceived */}
                <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-4 text-center flex flex-col justify-center">
                  <p className="text-[8px] font-sans font-black uppercase tracking-widest text-rose-400 mb-1.5">상대가 느낀 나</p>
                  <p className="text-xl font-black text-rose-600">{d.perceivedCharm}</p>
                  <p className="text-[9px] text-stone-900 mt-1">가장 많이 받은 매력</p>
                </div>
              </div>

              {/* Verdict */}
              <div className={`rounded-2xl p-4 text-center ${d.isPardoxFound ? 'bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200' : 'bg-stone-50 border border-stone-100'}`}>
                {d.isPardoxFound ? (
                  <>
                    <Sparkles size={16} className="text-indigo-500 mx-auto mb-2" />
                    <p className="text-xs font-bold text-indigo-700 mb-2">반전 매력 발견!</p>
                    <p className="text-[10px] text-stone-900 leading-relaxed break-keep">
                      당신은 경매에서 &ldquo;{d.selfIdentity}&rdquo;에 가장 많은 코인을 걸었습니다.<br />
                      하지만 대화 상대들은 당신에게서 &ldquo;{d.perceivedCharm}&rdquo;을 가장 강하게 느꼈어요.
                    </p>
                    <p className="text-[10px] text-stone-900 leading-relaxed break-keep mt-2">
                      스스로 의식하지 못한 매력이 대화 속에서 자연스럽게 드러난 거예요.<br />
                      이 의외의 갭이야말로 사람을 끌어당기는 가장 강력한 무기입니다.
                    </p>
                  </>
                ) : (
                  <>
                    <Heart size={16} className="text-stone-900 mx-auto mb-2" />
                    <p className="text-xs font-bold text-stone-800 mb-2">흔들리지 않는 매력</p>
                    <p className="text-[10px] text-stone-900 leading-relaxed break-keep">
                      당신이 중요하게 여기는 가치 &ldquo;{d.selfIdentity}&rdquo;과<br />
                      상대방이 실제로 느낀 인상 &ldquo;{d.perceivedCharm}&rdquo;이 같은 결을 가리킵니다.
                    </p>
                    <p className="text-[10px] text-stone-900 leading-relaxed break-keep mt-2">
                      꾸미지 않아도 자연스럽게 전해지는 진정성 —<br />
                      그게 가장 오래 기억에 남는 매력이에요.
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-stone-900 text-center py-8">
              {!d?.selfIdentity ? "경매 데이터가 필요합니다" : "피드백 데이터가 필요합니다"}
            </p>
          )}
        </motion.div>

        {/* ═══════ Section 5: Subconscious Frequency ═══════ */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white/90 backdrop-blur-xl border border-white/60 rounded-[2rem] p-6 shadow-xl shadow-indigo-100/30"
        >
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-indigo-500" />
            <span className="text-[8px] font-sans font-black uppercase tracking-[0.3em] text-indigo-400">INSTINCT</span>
          </div>
          <h3 className="text-base font-bold text-stone-900 mb-1">Subconscious Frequency</h3>
          <p className="text-xs text-stone-900 mb-4">당신의 본능이 향한 이상형 분석</p>

          {d && d.likedUserValues.length > 0 ? (
            <div className="space-y-5">
              <p className="text-xs text-stone-900 leading-relaxed break-keep">
                피드에서 하트를 보낸 <span className="text-indigo-500 font-bold">{d.totalLikes}번</span>의 선택을 분석한 결과,
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
                      <span className={`text-xs font-bold w-5 text-right ${i === 0 ? 'text-rose-500' : 'text-stone-900'}`}>{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                            {i === 0 && <Heart size={11} className="text-rose-400" fill="#fb7185" />}
                            {lv.keyword}
                          </span>
                          <span className="text-[10px] text-stone-900">{lv.count}명</span>
                        </div>
                        <div className="w-full h-1.5 bg-rose-100 rounded-full overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-rose-400 to-pink-500' : 'bg-rose-200'}`}
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
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] text-stone-900 break-keep">
                    당신의 본능은 <span className="text-rose-500 font-bold">&ldquo;{d.likedUserValues[0].keyword}&rdquo;</span>을
                    가진 사람에게 가장 강하게 반응합니다.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-900 text-center py-8">피드 활동 데이터가 없습니다</p>
          )}
        </motion.div>

        </section>
        </div>

        {/* Share Button */}
        <section className="max-w-xl mx-auto px-5 pt-4 pb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <motion.button
              onClick={() => setIsShareOpen(true)}
              className="w-full py-4 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-[2rem] font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-200/50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Share2 size={16} />
              공유하기
            </motion.button>
          </motion.div>
        </section>

        {/* Share Bottom Sheet */}
        <AnimatePresence>
          {isShareOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-50"
                onClick={() => setIsShareOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 rounded-t-3xl px-6 pt-5 pb-8"
              >
                <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-5" />
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-stone-900">공유하기</h3>
                  <button onClick={() => setIsShareOpen(false)} className="text-stone-900 p-1">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {/* URL 복사 */}
                  <motion.button
                    onClick={async () => {
                      setIsLoadingShare(true);
                      try {
                        const res = await fetch(`/api/report/${userId}`);
                        const data = await res.json();
                        let token = data.success && data.snapshots?.signature?.share_token;

                        if (!token && reportData) {
                          const postRes = await fetch(`/api/report/${userId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ snapshot_data: reportData, user }),
                          });
                          const postData = await postRes.json();
                          if (postData.success) token = postData.share_token;
                        }

                        if (token) {
                          const url = `${window.location.origin}/share/${token}`;
                          setShareUrl(url);
                          await navigator.clipboard.writeText(url);
                          setIsCopied(true);
                          setTimeout(() => { setIsCopied(false); setIsShareOpen(false); }, 1500);
                        } else {
                          alert("공유 링크를 생성할 수 없습니다.");
                        }
                      } catch {
                        alert("공유 링크 생성 중 오류가 발생했습니다.");
                      } finally {
                        setIsLoadingShare(false);
                      }
                    }}
                    disabled={isLoadingShare}
                    className="w-full flex items-center gap-4 p-4 bg-stone-50 border border-stone-100 rounded-2xl text-left disabled:opacity-50"
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                      {isLoadingShare ? <Loader2 size={18} className="text-indigo-500 animate-spin" /> :
                       isCopied ? <Check size={18} className="text-emerald-500" /> :
                       <Link size={18} className="text-indigo-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">{isCopied ? "링크가 복사되었습니다!" : "URL 복사하기"}</p>
                      <p className="text-xs text-stone-900 mt-0.5">링크를 통해 누구나 볼 수 있어요</p>
                    </div>
                  </motion.button>

                  {/* 이미지 저장 */}
                  <motion.button
                    onClick={async () => {
                      if (!reportRef.current) return;
                      setIsSavingImage(true);
                      try {
                        const dataUrl = await toPng(reportRef.current, {
                          backgroundColor: "#FAF9F6",
                          pixelRatio: 2,
                          filter: (node) => {
                            if (node instanceof HTMLElement && node.getAttribute?.("aria-hidden") === "true") return false;
                            return true;
                          },
                        });
                        const link = document.createElement("a");
                        link.download = `${user?.nickname || "signature"}_report.png`;
                        link.href = dataUrl;
                        link.click();
                        setTimeout(() => setIsShareOpen(false), 500);
                      } catch {
                        alert("이미지 저장 중 오류가 발생했습니다.");
                      } finally {
                        setIsSavingImage(false);
                      }
                    }}
                    disabled={isSavingImage}
                    className="w-full flex items-center gap-4 p-4 bg-stone-50 border border-stone-100 rounded-2xl text-left disabled:opacity-50"
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                      {isSavingImage ? <Loader2 size={18} className="text-indigo-500 animate-spin" /> :
                       <Download size={18} className="text-indigo-500" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">사진으로 저장하기</p>
                      <p className="text-xs text-stone-900 mt-0.5">리포트를 이미지로 다운로드</p>
                    </div>
                  </motion.button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
    </div>
  );
}

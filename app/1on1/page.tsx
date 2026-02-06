"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import { Sparkles, Activity, Search, Heart, ShieldCheck, AlertCircle, RefreshCcw, Quote } from "lucide-react";
import { DESIGN_TOKENS } from "@/lib/design-tokens";

const { colors, borderRadius, transitions } = DESIGN_TOKENS;

export default function UserReportPage({ params }: { params: any }) {
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [targetGender, setTargetGender] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const isCalculating = useRef(false);
  const hasFinished = useRef(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    { icon: <Search size={20} />, text: "경매 데이터를 정밀 분석 중..." },
    { icon: <Heart size={20} />, text: "피드 시그널 교차 검증 중..." },
    { icon: <Activity size={20} />, text: "7:3 가중치 알고리즘 적용 중..." },
    { icon: <ShieldCheck size={20} />, text: "맞춤형 리포트 생성 완료..." }
  ];

  const calculateMatches = useCallback(async (uid: string) => {
    if (isCalculating.current || hasFinished.current) return;
    isCalculating.current = true;

    try {
      setIsLoading(true);
      setError(null);

      for (let i = 0; i < loadingMessages.length; i++) {
        setLoadingStep(i);
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      // ─── 데이터 소스 일원화: matches 테이블에서 공식 결과 조회 ───
      const [usersRes, matchesRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("matches").select("*").eq("user1_id", uid).order("compatibility_score", { ascending: false })
      ]);

      if (usersRes.error) throw new Error("데이터 연결 실패");

      const allUsers = usersRes.data || [];
      const matchRows = matchesRes.data || [];

      if (matchRows.length === 0) throw new Error("아직 매칭 결과가 생성되지 않았습니다.");

      const me = allUsers.find(u => String(u.id) === String(uid));
      if (!me) throw new Error("내 정보를 찾을 수 없습니다.");
      setUser(me);

      const myGender = me.gender?.trim() || "";
      const target = (myGender === "여성" || myGender === "여") ? "남성" : "여성";
      setTargetGender(target);

      const usersMap = new Map(allUsers.map(u => [u.id, u]));
      const scoredMatches = matchRows.map(row => {
        const matchedUser = usersMap.get(row.user2_id);
        const md = row.match_data || {};
        return {
          id: row.user2_id,
          nickname: matchedUser?.nickname || "알 수 없음",
          final_score: row.compatibility_score,
          auction_detail: md.auction_score ?? 0,
          feed_detail: md.feed_score ?? 0,
          isMutual: md.is_mutual ?? false
        };
      });

      setMatches(scoredMatches);
      hasFinished.current = true;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
      isCalculating.current = false;
    }
  }, []);

  useEffect(() => {
    params.then((p: any) => setUserId(p.id));
  }, [params]);

  usePhaseRedirect({
    currentPage: "report",
    onSettingsFetched: () => {
      if (userId && matches.length === 0 && !isCalculating.current && !hasFinished.current) {
        calculateMatches(userId);
      }
    }
  });

  if (isLoading) return <LoadingScreen step={loadingStep} messages={loadingMessages} />;

  if (error) return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={{ backgroundColor: colors.primary }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring" }}
      >
        <AlertCircle style={{ color: colors.accent }} size={48} />
      </motion.div>
      <h2 className="text-white font-serif italic my-6">{error}</h2>
      <motion.button
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-white/10 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <RefreshCcw size={14} /> Retry
      </motion.button>
    </motion.div>
  );

  return (
    <div className="min-h-screen font-serif pb-24 antialiased select-none" style={{ backgroundColor: colors.background, color: colors.primary }}>
      <motion.header
        className="text-center pt-16 pb-12 px-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-[10px] font-sans font-black tracking-[0.4em] uppercase mb-3" style={{ color: colors.accent }}>Matching Intelligence</p>
        <h1 className="text-4xl italic tracking-tighter leading-tight mb-2">{user?.nickname}님의 인연 리포트</h1>
        <motion.div
          className="h-px w-12 mx-auto opacity-30"
          style={{ backgroundColor: colors.accent }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />
      </motion.header>

      <section className="max-w-xl mx-auto px-6 space-y-12">
        <motion.div
          className="bg-white p-10 border shadow-[0_20px_60px_rgba(0,0,0,0.02)] relative overflow-hidden"
          style={{ borderRadius: borderRadius.onboarding, borderColor: colors.soft }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Quote className="absolute -top-2 -left-2 opacity-40" style={{ color: colors.soft }} size={60} />
          <p className="text-sm leading-[1.9] font-light break-keep text-center relative z-10" style={{ color: colors.muted }}>
            가치관 경매의 데이터와 사진 피드의 시그널을 교차 분석한 결과, <br />
            {user?.nickname}님과 가장 깊은 영혼의 울림을 보인 <span className="font-bold underline" style={{ color: colors.accent }}>{targetGender}</span> 세 분을 찾았습니다.
          </p>
        </motion.div>

        <div className="space-y-8">
          <h3 className="text-[10px] font-sans font-black tracking-[0.3em] uppercase text-center italic" style={{ color: colors.muted }}>Top 3 Destined Connections</h3>

          {matches.map((match, idx) => (
            <motion.div
              key={match.id}
              className="bg-white overflow-hidden p-8 space-y-6"
              style={{
                borderRadius: "2.5rem",
                border: `1px solid ${colors.soft}`,
                boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.05)"
              }}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.15, duration: 0.5 }}
              whileHover={{ y: -4, boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.1)" }}
            >
              <div className="flex justify-between items-end">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-sans font-black uppercase tracking-widest" style={{ color: colors.accent }}>Rank {idx + 1}</span>
                    {match.isMutual && (
                      <span className="text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-tighter flex items-center gap-1" style={{
                        backgroundColor: `${colors.accent}08`,
                        color: colors.accent,
                        borderColor: `${colors.accent}10`
                      }}>
                        <Heart size={8} fill={colors.accent} /> Mutual
                      </span>
                    )}
                  </div>
                  <h4 className="text-3xl font-bold tracking-tighter">{match.nickname}</h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-sans font-black uppercase tracking-widest" style={{ color: colors.muted }}>Match Rate</p>
                  <p className="text-4xl font-black italic" style={{ color: colors.accent }}>{match.final_score}%</p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-gray-50">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-sans font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
                    <span>Values Fit (Auction)</span>
                    <span>{match.auction_detail} / 70</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: colors.primary }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(match.auction_detail / 70) * 100}%` }}
                      transition={{ delay: 0.5 + idx * 0.15, duration: 0.8, ease: transitions.default.ease }}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-sans font-bold uppercase tracking-wider" style={{ color: colors.muted }}>
                    <span>Visual Harmony (Feed)</span>
                    <span>{match.feed_detail} / 30</span>
                  </div>
                  <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: colors.accent }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(match.feed_detail / 30) * 100}%` }}
                      transition={{ delay: 0.6 + idx * 0.15, duration: 0.8, ease: transitions.default.ease }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}

function LoadingScreen({ step, messages }: any) {
  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12"
      style={{ backgroundColor: colors.primary }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <div className="relative w-24 h-24">
        <motion.div
          className="absolute inset-0 border-2 rounded-full"
          style={{ borderColor: `${colors.accent}20` }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <motion.div
          className="absolute inset-0 border-t-2 rounded-full flex items-center justify-center"
          style={{ borderColor: colors.accent }}
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Sparkles style={{ color: colors.accent }} size={32} />
        </motion.div>
      </div>
      <div className="space-y-4">
        <motion.div
          className="flex items-center justify-center gap-2"
          style={{ color: colors.accent }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {messages[step].icon}
          <span className="text-[10px] font-sans font-black uppercase tracking-[0.4em]">Phase {step + 1}</span>
        </motion.div>
        <motion.h2
          key={step}
          className="text-xl text-white italic font-serif leading-relaxed h-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {messages[step].text}
        </motion.h2>
      </div>
    </motion.div>
  );
}

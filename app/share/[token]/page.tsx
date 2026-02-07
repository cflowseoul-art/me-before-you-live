"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, Fingerprint, Zap, Brain, Users, Radio,
  Loader2, Heart, Crown, AlertCircle
} from "lucide-react";

const VIBE_INFO: Record<string, { emoji: string; label: string }> = {
  "spark": { emoji: "\u{1F525}", label: "불꽃이 튀었어요" },
  "calm": { emoji: "\u{1F60A}", label: "편안하고 좋았어요" },
  "cold": { emoji: "\u{1F9CA}", label: "아쉬웠어요" },
};

interface ShareData {
  user: { nickname: string; real_name: string };
  topValues: { itemName: string; keyword: string; amount: number }[];
  aura: { aura: string; description: string; gradient: string } | null;
  totalSpent: number;
  rareValues: { keyword: string; fullName: string; myAmount: number; bidderCount: number; totalUsers: number }[];
  feedbacks: { vibe: string; charms: string[]; round: number }[];
  charmRanking: { charm: string; count: number }[];
  vibeBreakdown: { vibe: string; count: number }[];
  selfIdentity: string;
  perceivedCharm: string;
  isParadoxFound: boolean;
  likedUserValues: { keyword: string; count: number }[];
  totalLikes: number;
}

export default function SharePage({ params }: { params: any }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ShareData | null>(null);

  useEffect(() => {
    if (params) {
      params.then((p: any) => setToken(p.token));
    }
  }, [params]);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "리포트를 불러올 수 없습니다.");
          return;
        }
        setData(json.snapshot_data);
      } catch {
        setError("네트워크 오류가 발생했습니다.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-amber-400 animate-spin" size={40} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="text-amber-400 mb-6" size={48} />
        <h2 className="text-xl italic font-bold text-white mb-3">{error || "리포트를 찾을 수 없습니다"}</h2>
        <p className="text-sm text-amber-200/50">링크가 만료되었거나 유효하지 않습니다.</p>
      </div>
    );
  }

  const d = data;

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
        <h1 className="text-3xl italic font-bold tracking-tight mb-2 text-white">{d.user.nickname}님의 시그니처</h1>
        <p className="text-sm text-amber-200/50 mt-4 leading-relaxed max-w-md mx-auto">
          오늘 이 공간에서 당신이 증명한 가치를<br />가장 아름다운 방식으로 복원했습니다.
        </p>
        <div className="h-px w-12 mx-auto bg-amber-500/30 mt-6" />
      </motion.header>

      <section className="max-w-xl mx-auto px-6 space-y-6">
        {/* Section 1: The Aura Card */}
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
          {d.aura ? (
            <div className="space-y-5">
              <div className={`bg-gradient-to-r ${d.aura.gradient} rounded-2xl p-6 text-center`}>
                <p className="text-[10px] font-sans font-black uppercase tracking-[0.4em] text-white/70 mb-2">Your Aura</p>
                <h4 className="text-2xl font-black text-white mb-2">{d.aura.aura}</h4>
                <p className="text-sm text-white/80 leading-relaxed break-keep">{d.aura.description}</p>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-sans font-black uppercase tracking-widest text-amber-500/50 mb-3">Value Ranking</p>
                {d.topValues.map((v, i) => {
                  const pct = d.totalSpent > 0 ? Math.round((v.amount / d.totalSpent) * 100) : 0;
                  return (
                    <motion.div key={v.itemName} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.08 }} className="flex items-center gap-3">
                      <span className="text-amber-500/50 text-xs font-bold w-5 text-right">{i + 1}</span>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-bold text-white/90">{v.keyword}</span>
                          <span className="text-xs text-amber-400/60">{pct}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <motion.div className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.6 + i * 0.08, duration: 0.5 }} />
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

        {/* Section 2: The Lone Pioneer */}
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
          {d.rareValues.length > 0 ? (
            <div className="space-y-3">
              {d.rareValues.map((rv, i) => {
                const ratio = Math.round((rv.bidderCount / rv.totalUsers) * 100);
                return (
                  <motion.div key={rv.keyword} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="bg-white/5 border border-amber-500/10 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {rv.bidderCount <= 2 && <Crown size={14} className="text-amber-400" />}
                        <span className="text-base font-bold text-white">{rv.keyword}</span>
                      </div>
                      <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">{rv.bidderCount}/{rv.totalUsers}명</span>
                    </div>
                    <p className="text-xs text-white/40 mb-2 break-keep">{rv.fullName}</p>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div className={`h-full rounded-full ${rv.bidderCount <= 2 ? 'bg-gradient-to-r from-amber-400 to-yellow-400' : 'bg-amber-500/50'}`} initial={{ width: 0 }} animate={{ width: `${ratio}%` }} transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }} />
                    </div>
                    <p className="text-[10px] text-amber-400/50 mt-2">
                      {rv.bidderCount <= 2 ? `전체 ${rv.totalUsers}명 중 오직 ${rv.bidderCount}명만 선택` : `참가자의 ${ratio}%가 선택`}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-amber-500/40 text-center py-8">데이터를 분석 중입니다</p>
          )}
        </motion.div>

        {/* Section 3: The Feedback */}
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
          {d.feedbacks.length > 0 ? (
            <div className="space-y-5">
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
              {d.charmRanking.length > 0 && (
                <div>
                  <p className="text-[10px] font-sans font-black uppercase tracking-widest text-amber-500/50 mb-3">매력 키워드</p>
                  <div className="flex flex-wrap gap-2">
                    {d.charmRanking.map((c, i) => (
                      <motion.div key={c.charm} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 + i * 0.08 }} className={`px-4 py-2.5 rounded-full font-bold text-sm flex items-center gap-1.5 ${i === 0 ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black' : 'bg-white/10 text-white/80 border border-white/10'}`}>
                        {i === 0 && <Crown size={12} />}
                        {c.charm}
                        <span className={`text-xs ${i === 0 ? 'text-black/50' : 'text-white/40'}`}>x{c.count}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs text-amber-200/30 text-center">총 {d.feedbacks.length}명의 대화 상대가 평가</p>
            </div>
          ) : (
            <p className="text-sm text-amber-500/40 text-center py-8">아직 수집된 피드백이 없습니다</p>
          )}
        </motion.div>

        {/* Section 4: Persona Paradox */}
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
          {d.selfIdentity && d.perceivedCharm ? (
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20 rounded-2xl p-5 text-center">
                  <p className="text-[9px] font-sans font-black uppercase tracking-widest text-violet-400/70 mb-2">내가 표현한 나</p>
                  <p className="text-2xl font-black text-violet-300">{d.selfIdentity}</p>
                  <p className="text-[10px] text-violet-400/50 mt-1">최고 입찰 가치관</p>
                </div>
                <div className="text-amber-500/50 font-black text-xs shrink-0">VS</div>
                <div className="flex-1 bg-gradient-to-br from-rose-500/20 to-pink-500/10 border border-rose-500/20 rounded-2xl p-5 text-center">
                  <p className="text-[9px] font-sans font-black uppercase tracking-widest text-rose-400/70 mb-2">상대가 느낀 나</p>
                  <p className="text-2xl font-black text-rose-300">{d.perceivedCharm}</p>
                  <p className="text-[10px] text-rose-400/50 mt-1">가장 많이 받은 매력</p>
                </div>
              </div>
              <div className={`rounded-2xl p-5 text-center ${d.isParadoxFound ? 'bg-amber-400/10 border border-amber-400/20' : 'bg-white/5 border border-white/10'}`}>
                {d.isParadoxFound ? (
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
              {!d.selfIdentity ? "경매 데이터가 필요합니다" : "피드백 데이터가 필요합니다"}
            </p>
          )}
        </motion.div>

        {/* Section 5: Subconscious Frequency */}
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
          {d.likedUserValues.length > 0 ? (
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
                    <motion.div key={lv.keyword} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.8 + i * 0.08 }} className="flex items-center gap-3">
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
                          <motion.div className={`h-full rounded-full ${i === 0 ? 'bg-gradient-to-r from-rose-400 to-pink-500' : 'bg-white/20'}`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ delay: 0.9 + i * 0.08, duration: 0.5 }} />
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

      {/* Footer */}
      <motion.footer
        className="text-center mt-12 px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0 }}
      >
        <p className="text-[10px] font-sans text-amber-500/30 tracking-widest uppercase">
          Before We Meet &middot; The Signature
        </p>
      </motion.footer>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, Loader2, Users, Settings, Heart, X,
  MessageCircle, Crown, Star, Sparkles, Volume2
} from "lucide-react";

interface User {
  id: string;
  nickname: string;
  gender: string;
}

interface Match {
  id: string;
  user1_id: string;
  user2_id: string;
  compatibility_score: number;
  rank?: number;
  user2?: User;
  insight?: string;
}

interface GroupedMatch {
  user: User;
  matches: Match[];
  stableMatch?: Match; // Gale-Shapley 1:1 매칭 결과
}

// 사회자 멘트 가이드 생성
const generateMCGuide = (female: User, male: User | undefined, score: number, rank: number) => {
  if (!male) return { intro: "", talking_points: [], icebreaker: "" };

  const scoreLevel = score >= 85 ? "최고" : score >= 75 ? "높은" : score >= 65 ? "좋은" : "흥미로운";

  return {
    intro: `${female.nickname}님과 ${male.nickname}님! 두 분은 ${score}%의 ${scoreLevel} 호환도를 보여주셨습니다.`,
    talking_points: [
      rank === 1 ? "🎯 알고리즘이 추천한 최적의 파트너입니다!" : `📊 ${rank}순위 매칭 상대입니다.`,
      score >= 80 ? "💕 가치관과 시각적 호감 모두 높은 편이에요!" :
        score >= 70 ? "🤝 가치관이 잘 맞는 것으로 분석되었어요." :
        "💬 대화를 통해 서로를 더 알아가보세요!",
      score >= 85 ? "✨ 오늘 가장 기대되는 매칭 중 하나입니다!" : ""
    ].filter(Boolean),
    icebreaker: getRandomIcebreaker()
  };
};

const getRandomIcebreaker = () => {
  const questions = [
    "첫인상이랑 실제 성격이 다른 편이에요?",
    "스트레스 받을 때 주로 어떻게 풀어요?",
    "요즘 가장 관심 있는 게 뭐예요?",
    "주말에 주로 뭐 하면서 보내요?",
    "최근에 가장 행복했던 순간이 있어요?",
    "여행 간다면 어디로 가고 싶어요?",
    "맛집 탐방 좋아하세요? 추천할 곳 있어요?"
  ];
  return questions[Math.floor(Math.random() * questions.length)];
};

export default function MatchResultsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [groupedMatches, setGroupedMatches] = useState<GroupedMatch[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<{
    female: User;
    male: User | undefined;
    score: number;
    rank: number;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);

      const { data: usersData } = await supabase.from("users").select("*");
      const users = usersData || [];
      const usersMap = new Map(users.map(u => [u.id, u]));

      const { data: matchesData, error } = await supabase
        .from("matches")
        .select("*")
        .order("compatibility_score", { ascending: false });

      if (!error && matchesData) {
        const femaleUsers = users.filter(u =>
          u.gender === '여성' || u.gender === '여' || u.gender === 'F'
        );

        const generateInsight = (score: number, rank: number): string | undefined => {
          if (score >= 85) return "가치관과 시각적 호감 모두 높은 최고의 매칭!";
          if (score >= 75 && rank === 1) return "안정적 매칭 알고리즘이 추천한 파트너입니다.";
          if (score >= 70 && score < 80) return "가치관은 잘 맞지만 시각적 시그널이 조금 부족했어요.";
          if (score < 70) return "가치관 일치도를 더 높일 수 있는 대화가 필요해요.";
          return undefined;
        };

        const grouped: GroupedMatch[] = femaleUsers.map(female => {
          const userMatches = matchesData
            .filter(m => m.user1_id === female.id)
            .map(m => ({
              ...m,
              user2: usersMap.get(m.user2_id)
            }))
            .sort((a, b) => b.compatibility_score - a.compatibility_score)
            .map((m, idx) => ({
              ...m,
              rank: idx + 1,
              insight: generateInsight(m.compatibility_score, idx + 1)
            }));

          return {
            user: female,
            matches: userMatches,
            stableMatch: userMatches[0] // 1순위가 Gale-Shapley 안정적 매칭
          };
        }).filter(g => g.matches.length > 0);

        setGroupedMatches(grouped);
      }
      setIsLoading(false);
    };

    fetchData();

    const channel = supabase
      .channel("admin_match_results_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "matches" }, fetchData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-br from-amber-100 to-yellow-50 border-amber-300 text-amber-800";
    if (rank === 2) return "bg-gradient-to-br from-slate-100 to-gray-50 border-slate-300 text-slate-700";
    if (rank === 3) return "bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 text-orange-700";
    return "bg-gradient-to-br from-rose-50 to-pink-50 border-rose-200 text-rose-700";
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={14} className="text-amber-500" />;
    if (rank === 2) return <Star size={14} className="text-slate-400" />;
    if (rank === 3) return <Star size={12} className="text-orange-400" />;
    return <Star size={12} className="text-rose-400" />;
  };

  if (isLoading) {
    return (
      <main className="h-screen w-full bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="text-amber-400 animate-spin" size={40} />
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#0A0A0F] text-white antialiased flex flex-col font-serif overflow-x-hidden">
      {/* Navigation - Deep Navy 배경 */}
      <nav className="h-[70px] border-b border-amber-900/30 px-4 md:px-10 flex justify-between items-center bg-[#0D0D12] sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => router.push("/admin/dashboard/1on1")}>
            <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform text-amber-400" />
            <h1 className="text-lg md:text-xl italic font-black text-amber-400">MC Master Board</h1>
          </div>
          <span className="hidden sm:inline text-[9px] font-bold uppercase tracking-[0.3em] text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">Admin Only</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 px-3 md:px-4 py-2 rounded-full">
            <Users size={14} className="text-amber-400" />
            <span className="text-[10px] font-black uppercase font-sans tracking-widest text-amber-400">
              {groupedMatches.length} Couples
            </span>
          </div>
          <button onClick={() => router.push("/admin/settings")} className="p-2.5 rounded-full border border-amber-900/30 hover:bg-amber-500/10 transition-all">
            <Settings size={18} className="text-amber-400" />
          </button>
        </div>
      </nav>

      <div className="flex-1 px-4 md:px-6 py-6 max-w-7xl mx-auto w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-5 mb-6 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Heart size={24} className="text-amber-400" fill="#F59E0B" />
            <div>
              <h2 className="text-xl font-black text-amber-400">1:1 매칭 마스터 보드</h2>
              <p className="text-xs text-amber-400/60">셀을 클릭하면 사회자 멘트 가이드가 표시됩니다</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-amber-400">{groupedMatches.length}</p>
            <p className="text-[10px] text-amber-400/60 uppercase tracking-wider">Total Matches</p>
          </div>
        </motion.div>

        {/* 테이블 형태 매칭 보드 */}
        <div className="bg-[#0D0D12] border border-amber-900/30 rounded-2xl overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="grid grid-cols-5 bg-amber-500/10 border-b border-amber-900/30">
            <div className="p-4 text-center">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">여성</span>
            </div>
            <div className="p-4 text-center border-l border-amber-900/30">
              <div className="flex items-center justify-center gap-1">
                <Crown size={14} className="text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">1순위</span>
              </div>
            </div>
            <div className="p-4 text-center border-l border-amber-900/30">
              <div className="flex items-center justify-center gap-1">
                <Star size={14} className="text-slate-400" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-400">2순위</span>
              </div>
            </div>
            <div className="p-4 text-center border-l border-amber-900/30">
              <div className="flex items-center justify-center gap-1">
                <Star size={12} className="text-orange-400" />
                <span className="text-xs font-black uppercase tracking-wider text-orange-400">3순위</span>
              </div>
            </div>
            <div className="p-4 text-center border-l border-amber-900/30">
              <div className="flex items-center justify-center gap-1">
                <Star size={12} className="text-rose-400" />
                <span className="text-xs font-black uppercase tracking-wider text-rose-400">4순위</span>
              </div>
            </div>
          </div>

          {/* 테이블 바디 */}
          {groupedMatches.length === 0 ? (
            <div className="p-10 text-center text-amber-400/40">
              아직 매칭 결과가 없습니다.
            </div>
          ) : (
            groupedMatches.map((group, idx) => (
              <motion.div
                key={group.user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.05 }}
                className="grid grid-cols-5 border-b border-amber-900/20 last:border-b-0 hover:bg-amber-500/5 transition-colors"
              >
                {/* 여성 닉네임 */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500/20 to-rose-500/20 flex items-center justify-center border border-pink-500/30">
                    <span className="text-sm">👩</span>
                  </div>
                  <div>
                    <p className="font-bold text-base text-white">{group.user.nickname}</p>
                    <p className="text-[10px] text-amber-400/50">{group.matches.length}명 매칭</p>
                  </div>
                </div>

                {/* 1, 2, 3, 4순위 남성 */}
                {[0, 1, 2, 3].map(rankIdx => {
                  const match = group.matches[rankIdx];
                  return (
                    <div
                      key={rankIdx}
                      className="p-3 border-l border-amber-900/20"
                    >
                      {match ? (
                        <button
                          onClick={() => setSelectedMatch({
                            female: group.user,
                            male: match.user2,
                            score: match.compatibility_score,
                            rank: rankIdx + 1
                          })}
                          className={`w-full p-3 rounded-xl border transition-all hover:scale-[1.02] active:scale-[0.98] ${getRankStyle(rankIdx + 1)}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-1.5">
                              {getRankIcon(rankIdx + 1)}
                              <span className="text-sm">👨</span>
                            </div>
                            <span className="text-lg font-black">{match.compatibility_score}%</span>
                          </div>
                          <p className="font-bold text-sm truncate">{match.user2?.nickname || '-'}</p>
                          <p className="text-[9px] opacity-60 mt-1">클릭하여 가이드 보기</p>
                        </button>
                      ) : (
                        <div className="w-full p-3 rounded-xl border border-dashed border-amber-900/20 text-center text-amber-400/30 text-xs">
                          없음
                        </div>
                      )}
                    </div>
                  );
                })}
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* 확대 모달 - 사회자 멘트 가이드 */}
      <AnimatePresence>
        {selectedMatch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedMatch(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#0D0D12] border border-amber-500/30 rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className="p-6 border-b border-amber-900/30 flex items-center justify-between sticky top-0 bg-[#0D0D12] z-10">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-amber-500/20">
                    <MessageCircle size={24} className="text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-amber-400">사회자 멘트 가이드</h3>
                    <p className="text-xs text-amber-400/60">{selectedMatch.rank}순위 매칭</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="p-2 rounded-full hover:bg-amber-500/20 transition-colors"
                >
                  <X size={24} className="text-amber-400" />
                </button>
              </div>

              {/* 모달 컨텐츠 - 큰 폰트 */}
              <div className="p-8 space-y-8">
                {/* 커플 정보 */}
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-500/30 to-rose-500/30 flex items-center justify-center border-2 border-pink-500/50 mx-auto mb-3">
                      <span className="text-3xl">👩</span>
                    </div>
                    <p className="text-2xl font-black text-white">{selectedMatch.female.nickname}</p>
                    <p className="text-sm text-pink-400">여성</p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <Heart size={32} className="text-amber-400" fill="#F59E0B" />
                    <div className="text-center">
                      <p className="text-4xl font-black text-amber-400">{selectedMatch.score}%</p>
                      <p className="text-xs text-amber-400/60 uppercase tracking-wider">호환도</p>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-500/30 to-blue-500/30 flex items-center justify-center border-2 border-sky-500/50 mx-auto mb-3">
                      <span className="text-3xl">👨</span>
                    </div>
                    <p className="text-2xl font-black text-white">{selectedMatch.male?.nickname || '알 수 없음'}</p>
                    <p className="text-sm text-sky-400">남성</p>
                  </div>
                </div>

                {/* 오프닝 멘트 */}
                <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Volume2 size={20} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">오프닝 멘트</span>
                  </div>
                  <p className="text-2xl leading-relaxed text-white font-medium">
                    "{generateMCGuide(selectedMatch.female, selectedMatch.male, selectedMatch.score, selectedMatch.rank).intro}"
                  </p>
                </div>

                {/* 토킹 포인트 */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-amber-400" />
                    <span className="text-sm font-bold text-amber-400 uppercase tracking-wider">토킹 포인트</span>
                  </div>
                  {generateMCGuide(selectedMatch.female, selectedMatch.male, selectedMatch.score, selectedMatch.rank).talking_points.map((point, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5">
                      <p className="text-xl text-white">{point}</p>
                    </div>
                  ))}
                </div>

                {/* 추천 첫 대화 */}
                <div className="bg-gradient-to-r from-sky-500/10 to-blue-500/5 border border-sky-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <MessageCircle size={20} className="text-sky-400" />
                    <span className="text-sm font-bold text-sky-400 uppercase tracking-wider">추천 첫 대화</span>
                  </div>
                  <p className="text-xl leading-relaxed text-white">
                    "첫 대화로 <span className="text-sky-400 font-bold">'{generateMCGuide(selectedMatch.female, selectedMatch.male, selectedMatch.score, selectedMatch.rank).icebreaker}'</span>을 가볍게 얘기 나눠보시는 건 어떨까요? 😊"
                  </p>
                </div>

                {/* 닫기 버튼 */}
                <button
                  onClick={() => setSelectedMatch(null)}
                  className="w-full py-4 rounded-2xl bg-amber-500 text-black font-bold text-lg hover:bg-amber-400 transition-colors"
                >
                  확인
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

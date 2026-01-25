"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import {
  Sparkles, Activity, Search, Heart, ShieldCheck, AlertCircle, RefreshCcw,
  Quote, User, MessageCircle, Gem, Fingerprint, Zap, Star, TrendingUp
} from "lucide-react";

// 가치관 쌍 정의 (대비되는 가치관들)
const VALUE_PAIRS = [
  { a: "원하는 것을 살 수 있는 풍요", b: "사랑하는 사람과 함께하는 시간", category: "삶의 우선순위" },
  { a: "안정적이고 평온한 일상", b: "새로운 경험과 짜릿한 도전", category: "라이프스타일" },
  { a: "모두에게 인정받는 성공", b: "나만의 속도로 걷는 여유", category: "성취 방식" },
  { a: "지금 당장 누리는 확실한 행복", b: "더 큰 미래를 위한 인내", category: "시간 관점" },
  { a: "냉철하고 합리적인 판단", b: "깊이 공감하는 따뜻한 마음", category: "의사결정" },
  { a: "눈에 보이는 압도적 성과", b: "함께 걷는 과정의 유대감", category: "목표 지향" },
  { a: "누구와도 차별화된 나만의 개성", b: "모두와 어우러지는 소속감", category: "정체성" },
  { a: "오롯이 나에게 집중하는 자유", b: "소중한 사람을 위한 헌신", category: "관계 방식" },
];

// 페르소나 타입 정의
const PERSONA_TYPES = {
  romantic_realist: {
    title: "낭만적 현실주의자",
    desc: "꿈을 꾸되 발은 땅에 딛고 있는 당신",
    emoji: "🌙"
  },
  passionate_stabilizer: {
    title: "열정적 안정주의자",
    desc: "안정 속에서 불꽃을 피우는 당신",
    emoji: "🔥"
  },
  gentle_achiever: {
    title: "온유한 성취자",
    desc: "부드러움으로 세상을 정복하는 당신",
    emoji: "🦋"
  },
  free_connector: {
    title: "자유로운 연결자",
    desc: "독립적이면서도 깊이 사랑하는 당신",
    emoji: "🌊"
  },
  empathic_strategist: {
    title: "공감하는 전략가",
    desc: "마음을 읽으며 길을 찾는 당신",
    emoji: "🧭"
  },
  unique_harmonizer: {
    title: "유니크한 조화자",
    desc: "개성 속에서 어울림을 만드는 당신",
    emoji: "✨"
  }
};

// 아이스브레이킹 질문 생성기
const generateIcebreakerQuestions = (
  myTopValues: string[],
  partnerTopValues: string[],
  commonValues: string[]
): string[] => {
  const questions: string[] = [];

  // 공통 가치관 기반 질문
  if (commonValues.length > 0) {
    const valueQuestions: Record<string, string[]> = {
      "원하는 것을 살 수 있는 풍요": ["요즘 가장 갖고 싶은 게 있어요?", "버킷리스트 중 가장 이루고 싶은 건 뭐예요?"],
      "사랑하는 사람과 함께하는 시간": ["주말에 주로 누구랑 시간 보내세요?", "소중한 사람과 함께하면 꼭 하고 싶은 일이 있어요?"],
      "안정적이고 평온한 일상": ["일상에서 가장 좋아하는 루틴이 있어요?", "편안함을 느끼는 장소가 있다면 어디예요?"],
      "새로운 경험과 짜릿한 도전": ["최근에 도전해본 것 중 기억나는 거 있어요?", "언젠가 꼭 해보고 싶은 도전이 있어요?"],
      "모두에게 인정받는 성공": ["어떤 순간에 가장 뿌듯함을 느끼세요?", "주변에서 인정받았던 경험 얘기해줄 수 있어요?"],
      "나만의 속도로 걷는 여유": ["바쁜 일상에서 여유를 찾는 나만의 방법이 있어요?", "혼자만의 시간에 주로 뭐 하세요?"],
      "지금 당장 누리는 확실한 행복": ["오늘 가장 행복했던 순간이 있었어요?", "소확행이 있다면 뭐예요?"],
      "더 큰 미래를 위한 인내": ["요즘 열심히 준비하고 있는 게 있어요?", "미래의 자신에게 선물하고 싶은 게 있다면요?"],
      "냉철하고 합리적인 판단": ["중요한 결정을 내릴 때 어떤 기준을 가장 중요하게 생각해요?", "최근에 고민 끝에 내린 결정이 있어요?"],
      "깊이 공감하는 따뜻한 마음": ["누군가의 말에 크게 공감했던 적 있어요?", "친구들이 고민 상담을 자주 해오는 편이에요?"],
      "눈에 보이는 압도적 성과": ["최근에 이뤄낸 성과 중 자랑하고 싶은 게 있어요?", "목표를 이뤘을 때 어떻게 자축하세요?"],
      "함께 걷는 과정의 유대감": ["팀으로 뭔가를 해낸 경험이 있어요?", "함께여서 좋았던 순간이 있다면요?"],
      "누구와도 차별화된 나만의 개성": ["나만의 특별한 취미나 관심사가 있어요?", "주변에서 독특하다는 말 들어본 적 있어요?"],
      "모두와 어우러지는 소속감": ["어떤 커뮤니티나 모임에 속해 있어요?", "소속감을 느낄 때 가장 편안한 것 같아요?"],
      "오롯이 나에게 집중하는 자유": ["나만의 시간이 왜 중요하다고 생각해요?", "자유롭다고 느낄 때가 언제예요?"],
      "소중한 사람을 위한 헌신": ["소중한 사람을 위해 해준 것 중 기억나는 게 있어요?", "누군가를 위해 희생한 경험이 있어요?"],
    };

    commonValues.slice(0, 2).forEach(value => {
      if (valueQuestions[value]) {
        const qs = valueQuestions[value];
        questions.push(qs[Math.floor(Math.random() * qs.length)]);
      }
    });
  }

  // 상대방 상위 가치관 기반 질문
  if (partnerTopValues.length > 0 && questions.length < 3) {
    const curiosityQuestions = [
      `${partnerTopValues[0]}을(를) 중요하게 생각하시는 것 같은데, 특별한 이유가 있어요?`,
      "가치관에 영향을 준 경험이나 사람이 있어요?",
      "어떤 계기로 그런 생각을 하게 됐어요?"
    ];
    questions.push(curiosityQuestions[Math.floor(Math.random() * curiosityQuestions.length)]);
  }

  // 기본 질문 추가
  const defaultQuestions = [
    "첫인상이랑 실제 성격이 다른 편이에요?",
    "스트레스 받을 때 주로 어떻게 풀어요?",
    "요즘 가장 관심 있는 게 뭐예요?",
    "주말에 주로 뭐 하면서 보내요?",
    "MBTI가 뭐예요? 잘 맞는 것 같아요?"
  ];

  while (questions.length < 3) {
    const q = defaultQuestions[Math.floor(Math.random() * defaultQuestions.length)];
    if (!questions.includes(q)) questions.push(q);
  }

  return questions.slice(0, 3);
};

// 페르소나 분석 함수
const analyzePersona = (
  myBids: any[],
  allBids: any[],
  allUsers: any[],
  auctionItems: any[]
) => {
  const contradictions: string[] = [];
  const rareValues: string[] = [];
  let personaType = "romantic_realist";

  // 내 상위 입찰 가치관 추출
  const myTopBids = [...myBids].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const myTopValueNames = myTopBids.map(b => {
    const item = auctionItems.find(i => i.id === b.item_id);
    return item?.name || "";
  }).filter(Boolean);

  // 매력적 모순 분석 (대비되는 가치에 모두 높은 입찰)
  VALUE_PAIRS.forEach(pair => {
    const bidA = myBids.find(b => {
      const item = auctionItems.find(i => i.id === b.item_id);
      return item?.name === pair.a;
    });
    const bidB = myBids.find(b => {
      const item = auctionItems.find(i => i.id === b.item_id);
      return item?.name === pair.b;
    });

    if (bidA && bidB) {
      const avgBid = myBids.reduce((sum, b) => sum + b.amount, 0) / myBids.length;
      if (bidA.amount > avgBid * 0.8 && bidB.amount > avgBid * 0.8) {
        contradictions.push(`${pair.category}: ${pair.a.slice(0, 10)}... & ${pair.b.slice(0, 10)}...`);
      }
    }
  });

  // 희소 가치 분석 (전체 유저 중 상위 10%만 선택한 가치)
  const totalUsers = allUsers.length;
  const itemBidCounts: Record<string, number> = {};

  allBids.forEach(bid => {
    if (!itemBidCounts[bid.item_id]) itemBidCounts[bid.item_id] = 0;
    itemBidCounts[bid.item_id]++;
  });

  myTopBids.forEach(myBid => {
    const bidCount = itemBidCounts[myBid.item_id] || 0;
    const bidRatio = bidCount / totalUsers;
    if (bidRatio < 0.3 && myBid.amount > 500) {
      const item = auctionItems.find(i => i.id === myBid.item_id);
      if (item) rareValues.push(item.name);
    }
  });

  // 가치관 조합에 따른 페르소나 결정
  const hasStability = myTopValueNames.some(v => v.includes("안정") || v.includes("평온"));
  const hasChallenge = myTopValueNames.some(v => v.includes("도전") || v.includes("경험"));
  const hasEmpathy = myTopValueNames.some(v => v.includes("공감") || v.includes("따뜻"));
  const hasFreedom = myTopValueNames.some(v => v.includes("자유") || v.includes("나에게"));
  const hasConnection = myTopValueNames.some(v => v.includes("함께") || v.includes("헌신"));
  const hasUnique = myTopValueNames.some(v => v.includes("개성") || v.includes("차별화"));

  if (hasStability && hasChallenge) personaType = "passionate_stabilizer";
  else if (hasEmpathy && myTopValueNames.some(v => v.includes("성공") || v.includes("성과"))) personaType = "gentle_achiever";
  else if (hasFreedom && hasConnection) personaType = "free_connector";
  else if (hasEmpathy && myTopValueNames.some(v => v.includes("판단") || v.includes("합리"))) personaType = "empathic_strategist";
  else if (hasUnique && myTopValueNames.some(v => v.includes("소속") || v.includes("어우러"))) personaType = "unique_harmonizer";
  else personaType = "romantic_realist";

  return {
    contradictions,
    rareValues,
    personaType,
    topValues: myTopValueNames.slice(0, 3)
  };
};

// 비딩 펄스 데이터 생성 (심박수 그래프용)
const generateBiddingPulseData = (myBids: any[], auctionItems: any[]) => {
  const sortedBids = [...myBids].sort((a, b) => {
    const aTime = new Date(a.created_at || 0).getTime();
    const bTime = new Date(b.created_at || 0).getTime();
    return aTime - bTime;
  });

  // 각 입찰의 intensity 계산 (입찰액 기준)
  const maxBid = Math.max(...myBids.map(b => b.amount), 1);

  return sortedBids.slice(0, 8).map((bid, idx) => {
    const item = auctionItems.find(i => i.id === bid.item_id);
    const intensity = (bid.amount / maxBid) * 100;
    return {
      name: item?.name?.slice(0, 6) || `항목${idx + 1}`,
      amount: bid.amount,
      intensity: Math.round(intensity),
      isPeak: intensity > 80
    };
  });
};

export default function UserReportPage({ params }: { params: any }) {
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [targetGender, setTargetGender] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // 고도화 데이터
  const [persona, setPersona] = useState<any>(null);
  const [icebreakers, setIcebreakers] = useState<string[]>([]);
  const [myTopValues, setMyTopValues] = useState<string[]>([]);
  const [biddingPulse, setBiddingPulse] = useState<any[]>([]);
  const [constellationData, setConstellationData] = useState<any[]>([]);

  const isCalculating = useRef(false);
  const hasFinished = useRef(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    { icon: <Search size={20} />, text: "경매 데이터를 정밀 분석 중..." },
    { icon: <Heart size={20} />, text: "피드 시그널 교차 검증 중..." },
    { icon: <Fingerprint size={20} />, text: "당신만의 페르소나 분석 중..." },
    { icon: <Activity size={20} />, text: "가중치 매칭 알고리즘 적용 중..." },
    { icon: <Star size={20} />, text: "가치관 성좌 생성 중..." },
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
        await new Promise(resolve => setTimeout(resolve, 600));
      }

      // 데이터 호출
      const [usersRes, bidsRes, likesRes, itemsRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("bids").select("*"),
        supabase.from("feed_likes").select("*"),
        supabase.from("auction_items").select("*")
      ]);

      if (usersRes.error) throw new Error("데이터를 연동할 수 없습니다.");

      const allUsers = usersRes.data || [];
      const allBids = bidsRes.data || [];
      const allLikes = likesRes.data || [];
      const items = itemsRes.data || [];

      const me = allUsers.find(u => String(u.id) === String(uid));
      if (!me) throw new Error("회원 정보를 찾을 수 없습니다.");
      setUser(me);

      const myGender = me.gender?.trim() || "";
      const target = (myGender === "여성" || myGender === "여" || myGender === "F") ? "남성" : "여성";
      setTargetGender(target);

      const myBids = allBids.filter(b => String(b.user_id) === String(uid));
      const myLikes = allLikes.filter(l => String(l.user_id) === String(uid));

      // 비딩 펄스 데이터 생성
      const pulseData = generateBiddingPulseData(myBids, items);
      setBiddingPulse(pulseData);

      // 페르소나 분석
      const personaResult = analyzePersona(myBids, allBids, allUsers, items);
      setPersona(personaResult);
      setMyTopValues(personaResult.topValues);

      // 이성 참가자 필터링
      const oppositeGenderUsers = allUsers.filter(u =>
        String(u.id) !== String(uid) && (u.gender?.includes(target.charAt(0)) || u.gender === target)
      );

      // === V4.2 고도화 매칭 알고리즘 ===
      const scoredMatches = oppositeGenderUsers
        .map(other => {
          const otherBids = allBids.filter(b => String(b.user_id) === String(other.id));
          const commonValues: string[] = [];

          // === [2.1] 가치관 정합성 (70%) ===
          let auctionScore = 0;
          if (myBids.length > 0 && otherBids.length > 0) {
            let matchRatioSum = 0;
            let overlapCount = 0;

            myBids.forEach(myBid => {
              const partnerBid = otherBids.find(ob => ob.item_id === myBid.item_id);
              if (partnerBid) {
                // 기본 비율 계산
                const ratio = Math.min(myBid.amount, partnerBid.amount) / Math.max(myBid.amount, partnerBid.amount);

                // 해당 아이템 총 입찰자 수로 가중치 적용 (희소 가치)
                const itemBidders = allBids.filter(b => b.item_id === myBid.item_id).length;
                const scarcityBonus = itemBidders <= 3 ? 1.3 : itemBidders <= 5 ? 1.15 : 1;

                matchRatioSum += ratio * scarcityBonus;
                overlapCount++;

                // 공통 가치관 추출 (비율 50% 이상인 경우)
                if (ratio > 0.5) {
                  const item = items.find(i => i.id === myBid.item_id);
                  if (item) commonValues.push(item.name);
                }
              }
            });

            if (overlapCount > 0) {
              auctionScore = (matchRatioSum / overlapCount) * 70;
            }
          }

          // === [2.2] 시각적 호감도 (30%) - 지수형 배점 ===
          const heartsToOther = myLikes.filter(l => String(l.target_user_id) === String(other.id)).length;
          // 공식: 30 × (선택한 하트 수 / 5)^1.2
          const feedScore = 30 * Math.pow(Math.min(heartsToOther, 5) / 5, 1.2);

          // === [2.3] 시너지 보너스 ===
          const receivedLike = allLikes.some(l => String(l.user_id) === String(other.id) && String(l.target_user_id) === String(uid));
          const isMutual = heartsToOther > 0 && receivedLike;

          let finalScore = auctionScore + feedScore;

          // Mutual Like 1.5배 승수
          if (isMutual) finalScore *= 1.5;

          // 무관심 페널티: 가치관 점수가 높아도 하트가 0개면 15% 감산
          if (heartsToOther === 0 && auctionScore > 30) {
            finalScore *= 0.85;
          }

          // 상대방 상위 가치관
          const otherTopBids = [...otherBids].sort((a, b) => b.amount - a.amount).slice(0, 3);
          const otherTopValues = otherTopBids.map(b => {
            const item = items.find(i => i.id === b.item_id);
            return item?.name || "";
          }).filter(Boolean);

          return {
            id: other.id,
            nickname: other.nickname,
            final_score: Math.round(Math.min(finalScore, 100)),
            auctionScore: Math.round(auctionScore),
            feedScore: Math.round(feedScore),
            isMutual,
            commonValues: commonValues.slice(0, 3),
            otherTopValues,
            heartsReceived: heartsToOther
          };
        })
        .sort((a, b) => {
          // Mutual은 1순위로 강제 고정
          if (a.isMutual && !b.isMutual) return -1;
          if (!a.isMutual && b.isMutual) return 1;
          return b.final_score - a.final_score;
        })
        .slice(0, 3);

      setMatches(scoredMatches);

      // 성좌(Constellation) 데이터 생성
      const constellations = oppositeGenderUsers.map(other => {
        const otherBids = allBids.filter(b => String(b.user_id) === String(other.id));
        let compatibility = 0;
        const sharedValues: string[] = [];

        myBids.forEach(myBid => {
          const partnerBid = otherBids.find(ob => ob.item_id === myBid.item_id);
          if (partnerBid) {
            compatibility += Math.min(myBid.amount, partnerBid.amount) / Math.max(myBid.amount, partnerBid.amount);
            const item = items.find(i => i.id === myBid.item_id);
            if (item) sharedValues.push(item.name.slice(0, 8));
          }
        });

        const isTop3 = scoredMatches.some(m => m.id === other.id);

        return {
          id: other.id,
          nickname: other.nickname,
          compatibility: Math.min(compatibility * 25, 100),
          sharedValues: sharedValues.slice(0, 2),
          isTop3,
          isMutual: allLikes.some(l => String(l.user_id) === String(other.id) && String(l.target_user_id) === String(uid))
        };
      });

      setConstellationData(constellations.sort((a, b) => b.compatibility - a.compatibility));

      // 1등 매칭 상대와의 아이스브레이커 생성
      if (scoredMatches.length > 0) {
        const topMatch = scoredMatches[0];
        const questions = generateIcebreakerQuestions(
          personaResult.topValues,
          topMatch.otherTopValues,
          topMatch.commonValues
        );
        setIcebreakers(questions);
      }

      hasFinished.current = true;
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setIsLoading(false);
      isCalculating.current = false;
    }
  }, []);

  useEffect(() => {
    if (params) {
      params.then((p: any) => setUserId(p.id));
    }
  }, [params]);

  usePhaseRedirect({
    currentPage: "report",
    onSettingsFetched: () => {
      if (userId && matches.length === 0 && !isCalculating.current && !hasFinished.current) {
        calculateMatches(userId);
      }
    }
  });

  if (isLoading) return <LoadingScreen step={loadingStep} messages={loadingMessages} nickname={user?.nickname} />;

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[#FAF9F6]">
      <AlertCircle className="text-sky-400 mb-6" size={48} />
      <h2 className="text-xl italic font-bold mb-6">{error}</h2>
      <button onClick={() => window.location.reload()} className="px-8 py-3 bg-sky-400 text-white rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
        <RefreshCcw size={14} className="inline mr-2" /> 다시 시도
      </button>
    </div>
  );

  const personaInfo = persona ? PERSONA_TYPES[persona.personaType as keyof typeof PERSONA_TYPES] : null;

  return (
    <div className="min-h-screen font-serif pb-24 antialiased select-none bg-gradient-to-b from-sky-50/50 to-[#FAF9F6] text-stone-700">
      {/* Header */}
      <motion.header
        className="text-center pt-20 pb-12 px-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-[10px] font-sans font-black tracking-[0.4em] uppercase mb-3 text-sky-500">1:1 Matching Report</p>
        <h1 className="text-3xl italic font-bold tracking-tight mb-2">{user?.nickname}님의 인연 리포트</h1>
        <div className="h-px w-12 mx-auto bg-sky-200 mt-6" />
      </motion.header>

      <section className="max-w-xl mx-auto px-6 space-y-10">
        {/* 페르소나 카드 */}
        {personaInfo && (
          <motion.div
            className="bg-white border border-sky-200 rounded-[2.5rem] p-8 shadow-[0_8px_30px_rgb(125,211,252,0.12)] relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-sky-100/50 to-transparent rounded-bl-full" />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Fingerprint size={16} className="text-sky-500" />
                <span className="text-[10px] font-sans font-black uppercase tracking-widest text-sky-500">Your Persona</span>
              </div>

              <div className="flex items-start gap-4 mb-6">
                <span className="text-5xl">{personaInfo.emoji}</span>
                <div>
                  <h3 className="text-2xl font-bold mb-1">{personaInfo.title}</h3>
                  <p className="text-sm text-stone-500 italic">{personaInfo.desc}</p>
                </div>
              </div>

              {/* 상위 가치관 시각화 */}
              <div className="space-y-3 mb-6">
                <p className="text-[10px] font-sans font-black uppercase tracking-widest text-stone-400">Top Values</p>
                <div className="flex flex-wrap gap-2">
                  {myTopValues.map((value, i) => (
                    <motion.span
                      key={value}
                      className="px-4 py-2 bg-sky-50 border border-sky-200 rounded-full text-sm font-medium text-sky-700"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.1 }}
                    >
                      {value.length > 12 ? value.slice(0, 12) + "..." : value}
                    </motion.span>
                  ))}
                </div>
              </div>

              {/* 매력적 모순 */}
              {persona.contradictions.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-2xl mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-purple-500" />
                    <span className="text-[10px] font-sans font-black uppercase tracking-widest text-purple-500">매력적 모순</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    상반된 가치를 동시에 추구하는 당신은 다면적 매력의 소유자예요
                  </p>
                </div>
              )}

              {/* 희소 가치 */}
              {persona.rareValues.length > 0 && (
                <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Gem size={14} className="text-amber-600" />
                    <span className="text-[10px] font-sans font-black uppercase tracking-widest text-amber-600">희소 가치</span>
                  </div>
                  <p className="text-sm text-amber-700">
                    "{persona.rareValues[0].slice(0, 15)}..." - 소수만 선택한 특별한 가치관
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* V8.5 비딩 펄스 그래프 (심박수) */}
        {biddingPulse.length > 0 && (
          <motion.div
            className="bg-white border border-sky-200 rounded-[2.5rem] p-8 shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Activity size={18} className="text-rose-500" />
              <span className="text-[10px] font-sans font-black uppercase tracking-widest text-rose-500">Bidding Pulse</span>
            </div>
            <h3 className="text-xl font-bold mb-2">당신의 비딩 심박수</h3>
            <p className="text-sm text-stone-500 mb-6">경매 중 느낀 긴장감을 심박수로 재구성했어요</p>

            <div className="relative h-32">
              {/* 심박수 그래프 라인 */}
              <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#f43f5e" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                <motion.path
                  d={`M 0,50 ${biddingPulse.map((p, i) => {
                    const x = (i / (biddingPulse.length - 1)) * 400;
                    const y = 100 - p.intensity;
                    const peakOffset = p.isPeak ? -15 : 0;
                    return `L ${x},${y + peakOffset}`;
                  }).join(' ')}`}
                  fill="none"
                  stroke="url(#pulseGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, ease: "easeOut" }}
                />
                {/* Peak 포인트 표시 */}
                {biddingPulse.map((p, i) => p.isPeak && (
                  <motion.circle
                    key={i}
                    cx={(i / (biddingPulse.length - 1)) * 400}
                    cy={100 - p.intensity - 15}
                    r="6"
                    fill="#f43f5e"
                    initial={{ scale: 0 }}
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ delay: 2 + i * 0.2, duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                  />
                ))}
              </svg>

              {/* X축 레이블 */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 text-[9px] text-stone-400 font-sans">
                {biddingPulse.map((p, i) => (
                  <span key={i} className={p.isPeak ? "text-rose-500 font-bold" : ""}>
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Peak 설명 */}
            {biddingPulse.some(p => p.isPeak) && (
              <div className="mt-6 p-3 bg-rose-50 border border-rose-100 rounded-xl">
                <p className="text-xs text-rose-600">
                  <TrendingUp size={12} className="inline mr-1" />
                  Peak 지점에서 당신의 '쟁취 본능'이 가장 강하게 발현되었어요
                </p>
              </div>
            )}
          </motion.div>
        )}

        {/* V8.5 가치관 성좌 (Constellation Map) */}
        {constellationData.length > 0 && (
          <motion.div
            className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-indigo-800 rounded-[2.5rem] p-8 shadow-lg overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <Star size={18} className="text-amber-300" />
              <span className="text-[10px] font-sans font-black uppercase tracking-widest text-amber-300">Value Constellation</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">가치관 성좌</h3>
            <p className="text-sm text-indigo-300 mb-6">가치관이 가까울수록 별이 밝게 빛나요</p>

            <div className="relative h-64 rounded-2xl overflow-hidden">
              {/* 별 배경 */}
              <div className="absolute inset-0">
                {[...Array(30)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-0.5 h-0.5 bg-white rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      opacity: Math.random() * 0.5 + 0.2
                    }}
                    animate={{ opacity: [0.2, 0.8, 0.2] }}
                    transition={{ duration: 2 + Math.random() * 2, repeat: Infinity, delay: Math.random() * 2 }}
                  />
                ))}
              </div>

              {/* 나의 별 (중앙) */}
              <motion.div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <div className="relative">
                  <motion.div
                    className="w-10 h-10 bg-amber-400 rounded-full shadow-[0_0_30px_rgba(251,191,36,0.8)]"
                    animate={{ boxShadow: ["0 0 20px rgba(251,191,36,0.6)", "0 0 40px rgba(251,191,36,0.9)", "0 0 20px rgba(251,191,36,0.6)"] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-amber-300 font-bold whitespace-nowrap">나</span>
                </div>
              </motion.div>

              {/* 다른 참가자 별들 */}
              {constellationData.slice(0, 6).map((star, i) => {
                const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
                const distance = star.isTop3 ? 80 : 100 + (100 - star.compatibility);
                const x = 50 + Math.cos(angle) * (distance / 3);
                const y = 50 + Math.sin(angle) * (distance / 3);
                const size = star.isTop3 ? 24 : 16;
                const brightness = star.compatibility / 100;

                return (
                  <motion.div
                    key={star.id}
                    className="absolute z-10"
                    style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8 + i * 0.15 }}
                  >
                    {/* 연결선 */}
                    {star.isTop3 && (
                      <motion.svg
                        className="absolute left-1/2 top-1/2 pointer-events-none"
                        style={{
                          width: '200px',
                          height: '200px',
                          transform: 'translate(-50%, -50%)',
                          overflow: 'visible'
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.4 }}
                        transition={{ delay: 1 + i * 0.1 }}
                      >
                        <line
                          x1="100"
                          y1="100"
                          x2={100 + (50 - x) * 2}
                          y2={100 + (50 - y) * 2}
                          stroke={star.isMutual ? "#f472b6" : "#60a5fa"}
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      </motion.svg>
                    )}

                    {/* 별 */}
                    <motion.div
                      className={`rounded-full ${star.isTop3 ? 'bg-sky-400' : 'bg-indigo-400'} ${star.isMutual ? 'ring-2 ring-pink-400 ring-offset-1 ring-offset-transparent' : ''}`}
                      style={{
                        width: size,
                        height: size,
                        opacity: 0.5 + brightness * 0.5,
                        boxShadow: star.isTop3
                          ? `0 0 ${20 * brightness}px rgba(56,189,248,${brightness})`
                          : `0 0 ${10 * brightness}px rgba(129,140,248,${brightness * 0.5})`
                      }}
                      whileHover={{ scale: 1.3 }}
                      animate={star.isMutual ? { scale: [1, 1.1, 1] } : {}}
                      transition={star.isMutual ? { duration: 1.5, repeat: Infinity } : {}}
                    />

                    {/* 이름 */}
                    <span className={`absolute -bottom-5 left-1/2 -translate-x-1/2 text-[9px] whitespace-nowrap ${star.isTop3 ? 'text-sky-300 font-bold' : 'text-indigo-400'}`}>
                      {star.nickname}
                    </span>

                    {/* 공통 가치관 (Top3만) */}
                    {star.isTop3 && star.sharedValues.length > 0 && (
                      <motion.div
                        className="absolute -top-7 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-sm px-2 py-0.5 rounded-full"
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.5 + i * 0.1 }}
                      >
                        <span className="text-[8px] text-sky-200">{star.sharedValues[0]}...</span>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* 범례 */}
            <div className="mt-6 flex justify-center gap-6 text-[10px]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-amber-400 rounded-full" />
                <span className="text-amber-300">나</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-sky-400 rounded-full" />
                <span className="text-sky-300">Top3</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-pink-400 rounded-full ring-1 ring-pink-300" />
                <span className="text-pink-300">Mutual</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* 소개 카드 */}
        <motion.div
          className="bg-white p-8 border border-sky-200 shadow-sm relative overflow-hidden rounded-[2.5rem]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Quote className="absolute -top-2 -left-2 opacity-5" size={100} />
          <div className="relative z-10 text-center">
            <p className="text-sm leading-[1.8] text-stone-500 font-medium break-keep">
              가치관 데이터(70%)와 시각적 시그널(30%)을 <br />
              교차 분석한 결과, 가장 깊은 공명을 보인 <br />
              <span className="font-bold text-sky-500">{targetGender}</span> 세 분을 찾았습니다.
            </p>
          </div>
        </motion.div>

        {/* 매칭 결과 */}
        <div className="space-y-6">
          <h3 className="text-[10px] font-sans font-black tracking-[0.3em] uppercase text-center italic opacity-30">Top 3 Destined Connections</h3>

          {matches.map((match, idx) => (
            <motion.div
              key={match.id}
              className="bg-white border border-sky-200 rounded-[2.5rem] p-8 shadow-sm relative overflow-hidden group"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + idx * 0.15 }}
            >
              {/* 순위 표시 */}
              <div className={`absolute top-0 right-0 px-6 py-2.5 rounded-bl-[1.5rem] font-sans text-[10px] font-black italic tracking-widest ${
                idx === 0 ? 'bg-sky-400 text-white' : 'bg-sky-50 text-sky-300 border-l border-b border-sky-200'
              }`}>
                RANK {idx + 1}
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-end">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <User size={14} className="text-sky-500" />
                      <span className="text-[10px] font-sans font-black uppercase tracking-widest opacity-30">Identity</span>
                    </div>
                    <h4 className="text-3xl font-bold tracking-tight">{match.nickname}</h4>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-sans font-black uppercase tracking-widest opacity-30">Match Score</span>
                    <p className="text-4xl font-black italic text-sky-500">{match.final_score}%</p>
                  </div>
                </div>

                {/* 인터랙티브 점수 바 */}
                <div className="space-y-4 pt-6 border-t border-sky-50">
                  <ScoreBar
                    label="Values Compatibility (70%)"
                    score={match.auctionScore}
                    maxScore={70}
                    color="sky"
                    delay={0.5 + idx * 0.1}
                  />
                  <ScoreBar
                    label="Visual Signal (30%)"
                    score={match.feedScore}
                    maxScore={30}
                    color="rose"
                    delay={0.7 + idx * 0.1}
                  />
                </div>

                {/* 공통 가치관 태그 */}
                {match.commonValues.length > 0 && (
                  <div className="pt-4">
                    <p className="text-[10px] font-sans font-black uppercase tracking-widest opacity-30 mb-3">공통 가치관</p>
                    <div className="flex flex-wrap gap-2">
                      {match.commonValues.map((value: string, i: number) => (
                        <motion.span
                          key={i}
                          className="px-3 py-1.5 bg-sky-50 border border-sky-100 rounded-full text-xs text-sky-600"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                        >
                          {value.length > 10 ? value.slice(0, 10) + "..." : value}
                        </motion.span>
                      ))}
                    </div>
                  </div>
                )}

                {/* 상호 호감 시그널 */}
                {match.isMutual && (
                  <motion.div
                    className="py-3 rounded-2xl flex items-center justify-center gap-2 border border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.9, type: "spring" }}
                  >
                    <Heart size={12} fill="#f43f5e" className="text-rose-400" />
                    <span className="text-[9px] font-sans font-black uppercase tracking-widest text-rose-500">Mutual Signal Detected - 1.5x Boost!</span>
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        {/* 아이스브레이커 섹션 */}
        {icebreakers.length > 0 && (
          <motion.div
            className="bg-gradient-to-br from-white to-sky-50/50 border border-sky-200 rounded-[2.5rem] p-8 shadow-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center gap-2 mb-6">
              <MessageCircle size={18} className="text-sky-500" />
              <span className="text-[10px] font-sans font-black uppercase tracking-widest text-sky-500">Ice Breaker</span>
            </div>

            <h3 className="text-xl font-bold mb-2">첫 대화로 이런 질문은 어때요?</h3>
            <p className="text-sm text-stone-500 mb-6">
              {matches[0]?.nickname}님과 공통 가치관을 기반으로 생성된 맞춤형 질문이에요
            </p>

            <div className="space-y-4">
              {icebreakers.map((question, i) => (
                <motion.div
                  key={i}
                  className="flex gap-3 items-start"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1 + i * 0.15 }}
                >
                  <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-sky-600">{i + 1}</span>
                  </div>
                  <p className="text-base leading-relaxed text-stone-600 pt-0.5">"{question}"</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* 인터랙티브 가치관 스펙트럼 */}
        <motion.div
          className="bg-white border border-sky-200 rounded-[2.5rem] p-8 shadow-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Star size={18} className="text-sky-500" />
            <span className="text-[10px] font-sans font-black uppercase tracking-widest text-sky-500">Value Spectrum</span>
          </div>

          <h3 className="text-xl font-bold mb-6">당신의 가치관 스펙트럼</h3>

          <div className="space-y-6">
            {VALUE_PAIRS.slice(0, 4).map((pair, i) => (
              <ValueSpectrum
                key={i}
                pair={pair}
                myTopValues={myTopValues}
                delay={1.2 + i * 0.1}
              />
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
}

// 점수 바 컴포넌트
function ScoreBar({ label, score, maxScore, color, delay }: {
  label: string;
  score: number;
  maxScore: number;
  color: "sky" | "stone" | "rose";
  delay: number;
}) {
  const percentage = Math.min((score / maxScore) * 100, 100);
  const bgColors = {
    sky: "bg-sky-400",
    stone: "bg-stone-300",
    rose: "bg-rose-400"
  };

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-sans font-black uppercase tracking-widest opacity-40">
        <span>{label}</span>
        <span>{score}/{maxScore}</span>
      </div>
      <div className="h-2 w-full bg-sky-50 rounded-full overflow-hidden border border-sky-100">
        <motion.div
          className={`h-full rounded-full ${bgColors[color]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ delay, duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// 가치관 스펙트럼 컴포넌트
function ValueSpectrum({ pair, myTopValues, delay }: {
  pair: { a: string; b: string; category: string };
  myTopValues: string[];
  delay: number;
}) {
  const hasA = myTopValues.some(v => v === pair.a);
  const hasB = myTopValues.some(v => v === pair.b);

  // 0 = 완전 A, 100 = 완전 B, 50 = 중립
  let position = 50;
  if (hasA && !hasB) position = 25;
  else if (hasB && !hasA) position = 75;
  else if (hasA && hasB) position = 50;

  return (
    <motion.div
      className="space-y-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <p className="text-[10px] font-sans font-black uppercase tracking-widest text-stone-400 text-center">
        {pair.category}
      </p>
      <div className="flex items-center gap-3">
        <span className={`text-xs flex-1 text-right ${hasA ? 'text-sky-600 font-bold' : 'text-stone-400'}`}>
          {pair.a.length > 12 ? pair.a.slice(0, 12) + "..." : pair.a}
        </span>
        <div className="w-24 h-2 bg-gradient-to-r from-sky-200 via-stone-100 to-purple-200 rounded-full relative">
          <motion.div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white border-2 border-sky-400 rounded-full shadow-sm"
            initial={{ left: "50%" }}
            animate={{ left: `${position}%` }}
            transition={{ delay: delay + 0.2, duration: 0.5, type: "spring" }}
            style={{ marginLeft: "-6px" }}
          />
        </div>
        <span className={`text-xs flex-1 ${hasB ? 'text-purple-600 font-bold' : 'text-stone-400'}`}>
          {pair.b.length > 12 ? pair.b.slice(0, 12) + "..." : pair.b}
        </span>
      </div>
    </motion.div>
  );
}

// 로딩 화면
function LoadingScreen({ step, messages, nickname }: { step: number; messages: any[]; nickname?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12 bg-gradient-to-b from-sky-50 to-[#FAF9F6]">
      {/* 닉네임 표시 */}
      {nickname && (
        <motion.p
          className="text-sm text-stone-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {nickname}님의 리포트를 생성하고 있어요
        </motion.p>
      )}

      {/* 로딩 애니메이션 */}
      <div className="relative w-28 h-28">
        <motion.div
          className="absolute inset-0 border-2 border-sky-200 rounded-full"
          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
        <motion.div
          className="absolute inset-2 border-2 border-sky-300 rounded-full"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 2, delay: 0.3 }}
        />
        <motion.div
          className="absolute inset-0 border-t-2 border-sky-400 rounded-full"
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="text-sky-500" size={32} />
        </div>
      </div>

      {/* 단계 표시 */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-2 text-sky-500">
          {messages[step]?.icon}
          <span className="text-[10px] font-sans font-black uppercase tracking-[0.4em]">Phase {step + 1} / {messages.length}</span>
        </div>
        <AnimatePresence mode="wait">
          <motion.h2
            key={step}
            className="text-xl font-serif italic text-stone-600"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {messages[step]?.text}
          </motion.h2>
        </AnimatePresence>
      </div>

      {/* 프로그레스 바 */}
      <div className="w-48 h-1 bg-sky-100 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-sky-400 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${((step + 1) / messages.length) * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}

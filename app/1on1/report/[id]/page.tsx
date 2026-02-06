"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { usePhaseRedirect } from "@/lib/hooks/usePhaseRedirect";
import {
  Sparkles, Search, Heart, ShieldCheck, AlertCircle, RefreshCcw,
  MessageCircle, Users, Link2, Fingerprint, Star
} from "lucide-react";
import dynamic from "next/dynamic";

const SolarSystem3D = dynamic(() => import("./SolarSystem3D"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[420px] bg-[#070714] rounded-[2rem] flex items-center justify-center">
      <div className="text-indigo-400 text-sm animate-pulse">우주를 생성하는 중...</div>
    </div>
  ),
});

// [V6.4] 가치관 축 정의 (Keyword Polarity - 4글자 이내)
const VALUE_AXES = [
  { a: "원하는 것을 살 수 있는 풍요", b: "사랑하는 사람과 함께하는 시간", labelA: "풍요", labelB: "사랑", axis: "우선순위" },
  { a: "지금 당장 누리는 확실한 행복", b: "더 큰 미래를 위한 인내", labelA: "지금", labelB: "미래", axis: "시간관" },
  { a: "안정적이고 평온한 일상", b: "새로운 경험과 짜릿한 도전", labelA: "안정", labelB: "도전", axis: "라이프" },
  { a: "모두에게 인정받는 성공", b: "나만의 속도로 걷는 여유", labelA: "성공", labelB: "여유", axis: "성취" },
  { a: "냉철하고 합리적인 판단", b: "깊이 공감하는 따뜻한 마음", labelA: "이성", labelB: "공감", axis: "판단" },
  { a: "눈에 보이는 압도적 성과", b: "함께 걷는 과정의 유대감", labelA: "성과", labelB: "과정", axis: "목표" },
  { a: "누구와도 차별화된 나만의 개성", b: "모두와 어우러지는 소속감", labelA: "개성", labelB: "소속", axis: "정체성" },
  { a: "오롯이 나에게 집중하는 자유", b: "소중한 사람을 위한 헌신", labelA: "자유", labelB: "헌신", axis: "관계" },
];

// [V6.5] 가치관 → 4글자 키워드 매핑
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

// [V6.5] 맞춤 대화 가이드 - 상대방의 top_value 기반 질문
const CHEAT_SHEET: Record<string, string> = {
  "원하는 것을 살 수 있는 풍요": "'호캉스' vs '명품', 두 분의 취향은 어디인가요?",
  "사랑하는 사람과 함께하는 시간": "바쁜 평일 30분 번개 데이트, 보너스인가요 숙제인가요?",
  "지금 당장 누리는 확실한 행복": "'맛있으면 일단 먹는다' vs '참고 다음에', 소확행 스타일은?",
  "더 큰 미래를 위한 인내": "미래를 위해 지금 기쁘게 참고 있는 게 있나요?",
  "안정적이고 평온한 일상": "'예고 없는 번개 데이트', 감동인가요 기 빨림인가요?",
  "새로운 경험과 짜릿한 도전": "한 번도 안 먹어본 이색 음식 도전, 완전 가능하세요?",
  "모두에게 인정받는 성공": "서로 바쁠 때, 커리어를 위해 어디까지 이해해 줄 수 있을까요?",
  "나만의 속도로 걷는 여유": "조용한 골목 산책과 느린 대화, 상상만 해도 완벽하지 않아요?",
  "냉철하고 합리적인 판단": "싸웠을 때 '감정 가라앉히기' vs '바로 논리적으로 풀기'?",
  "깊이 공감하는 따뜻한 마음": "말 없는 따뜻한 포옹이 백 마디보다 중요하다는 것, 동의하세요?",
  "눈에 보이는 압도적 성과": "함께 게임할 때 '즐기기'와 '이기기' 중 뭐가 더 짜릿해요?",
  "함께 걷는 과정의 유대감": "'너랑 있어서 즐거웠어'라는 말, 얼마나 자주 해주세요?",
  "누구와도 차별화된 나만의 개성": "남들은 모르는 두 분만의 숨겨진 아지트나 취향이 있다면?",
  "모두와 어우러지는 소속감": "연인의 친구들과 함께하는 자리, 두 분에게는 활력소인가요?",
  "오롯이 나에게 집중하는 자유": "'각자의 시간이 보장되는 연애', 어디까지 허용 가능하세요?",
  "소중한 사람을 위한 헌신": "상대방을 위한 서프라이즈가 성공했을 때의 희열, 함께 나눠보세요!",
};

const CHEAT_SHEET_2: Record<string, string> = {
  "원하는 것을 살 수 있는 풍요": "인생에서 가장 만족스러운 소비 하나만 꼽는다면요?",
  "사랑하는 사람과 함께하는 시간": "가장 기억에 남는 '같이 보낸 시간'은 어떤 순간이었어요?",
  "지금 당장 누리는 확실한 행복": "오늘 하루 중 가장 행복한 순간은 보통 언제인가요?",
  "더 큰 미래를 위한 인내": "10년 뒤의 나에게 편지를 쓴다면 뭐라고 할 것 같아요?",
  "안정적이고 평온한 일상": "가장 편안함을 느끼는 장소나 루틴이 있나요?",
  "새로운 경험과 짜릿한 도전": "최근에 해봐서 좋았던 새로운 경험이 있어요?",
  "모두에게 인정받는 성공": "지금까지 가장 뿌듯했던 나만의 성취가 있다면?",
  "나만의 속도로 걷는 여유": "혼자만의 시간이 생기면 가장 먼저 뭘 하세요?",
  "냉철하고 합리적인 판단": "최근에 내린 가장 현명한 결정은 뭐였어요?",
  "깊이 공감하는 따뜻한 마음": "누군가의 작은 배려에 감동받은 적 있어요?",
  "눈에 보이는 압도적 성과": "남몰래 자랑스러운 나만의 기록이 있나요?",
  "함께 걷는 과정의 유대감": "함께라서 더 즐거웠던 경험이 있다면 들려주세요!",
  "누구와도 차별화된 나만의 개성": "친구들이 '너답다'라고 말하는 순간이 있다면?",
  "모두와 어우러지는 소속감": "소속감이 가장 크게 느껴졌던 순간은 언제였어요?",
  "오롯이 나에게 집중하는 자유": "온전히 나만의 하루가 주어진다면 어떻게 보낼 거예요?",
  "소중한 사람을 위한 헌신": "누군가를 위해 기꺼이 포기할 수 있는 게 있다면?",
};

export default function UserReportPage({ params }: { params: any }) {
  const [user, setUser] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  // [V6.0] 솔라 시스템 파트너 데이터 구조
  const [solarPartners, setSolarPartners] = useState<{
    id: string;
    nickname: string;
    score: number;
    orbitDistance: number; // 1 = closest, 3 = farthest
    pullFactor: {
      coreFact: string;      // 희소 공통 가치관 기반
      coreValue: string;     // 해당 가치관명 (키워드)
    };
    topValue: string;        // [V6.5] 상대방의 top_value (가장 높은 bid)
    topValueKeyword: string; // [V6.5] top_value의 4글자 키워드
    cheatSheet: string;      // [V6.5] 맞춤 대화 질문
    cheatSheet2: string;     // 맞춤 대화 질문 2
    commonValues: string[];
    isMutual: boolean;
    rareCount?: number;      // 희소성 카운트
    partnerBids: { itemName: string; amount: number }[];  // [V6.4] 파트너 bid 데이터
    feedScore: number;       // [V6.6] Visual Score (0점 처리용)
    myHeartsToPartner: number;       // 내가 상대방에게 보낸 하트 수
    partnerLikedMyPhotos: string[];  // 상대방이 좋아한 내 사진 photo_id (Drive file ID)
  }[]>([]);
  const [myBidsData, setMyBidsData] = useState<{ itemName: string; amount: number }[]>([]);  // [V6.4] 내 bid 데이터
  const [selectedPlanet, setSelectedPlanet] = useState<{ index: number; isMatch: boolean } | null>(null);
  // [V6.1] 외행성 (Top 3 외 나머지 인원)
  const [outerPlanets, setOuterPlanets] = useState<{ id: string; nickname: string }[]>([]);

  const isCalculating = useRef(false);
  const hasFinished = useRef(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingMessages = [
    { icon: <Search size={20} />, text: "경매 데이터를 정밀 분석 중..." },
    { icon: <Heart size={20} />, text: "피드 시그널 교차 검증 중..." },
    { icon: <Fingerprint size={20} />, text: "당신만의 페르소나 분석 중..." },
    { icon: <Sparkles size={20} />, text: "솔라 시스템 생성 중..." },
    { icon: <ShieldCheck size={20} />, text: "맞춤형 리포트 생성 완료..." }
  ];

  // ─── coreFact 생성: 희소성 vs 대중성 비율 판별 (V6.7) ───
  const generateCoreFact = (commonValues: string[], rarestCommonValue: string, rarestCount: number, totalUsers: number): string => {
    const rarestKeyword = VALUE_TO_KEYWORD[rarestCommonValue] || rarestCommonValue;

    if (commonValues.length === 0 || !rarestCommonValue) {
      return `데이터가 발견한 특별한 연결고리입니다.`;
    }

    const bidderRatio = rarestCount / totalUsers;

    if (rarestCount <= 2) {
      return `오늘 이 방에서 **오직 두 분만이** "${rarestKeyword}"에 공명했습니다.`;
    } else if (bidderRatio >= 0.7) {
      return `오늘 참가자 대부분이 열광한 "${rarestKeyword}", 두 분은 그중에서도 가장 닮은 안목을 가졌네요.`;
    } else {
      return `오늘 ${totalUsers}명 중 ${rarestCount}명이 선택한 "${rarestKeyword}", 두 분만의 특별한 교집합입니다.`;
    }
  };

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

      // ─── 데이터 소스 일원화: matches 테이블에서 공식 결과 조회 ───
      const [usersRes, matchesRes, bidsRes, itemsRes, feedLikesRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("matches").select("*").eq("user1_id", uid).order("compatibility_score", { ascending: false }),
        supabase.from("bids").select("*"),
        supabase.from("auction_items").select("*"),
        supabase.from("feed_likes").select("user_id, target_user_id, photo_id")
      ]);

      if (usersRes.error) throw new Error("데이터를 연동할 수 없습니다.");

      const allUsers = usersRes.data || [];
      const matchRows = matchesRes.data || [];
      const allBids = bidsRes.data || [];
      const items = itemsRes.data || [];
      const allFeedLikes = feedLikesRes.data || [];

      if (matchRows.length === 0) throw new Error("아직 매칭 결과가 생성되지 않았습니다. 관리자에게 문의하세요.");

      const me = allUsers.find(u => String(u.id) === String(uid));
      if (!me) throw new Error("회원 정보를 찾을 수 없습니다.");
      setUser(me);

      const myGender = me.gender?.trim() || "";
      const target = (myGender === "여성" || myGender === "여" || myGender === "F") ? "남성" : "여성";

      // [V6.4] 내 전체 bid 데이터 저장 (Value Spectrum용) - 아이템별 누적 합산
      const myBids = allBids.filter(b => String(b.user_id) === String(uid));
      const myBidsMap = new Map<string, number>();
      myBids.forEach(b => {
        const item = items.find(i => i.id === b.auction_item_id);
        const name = item?.title || "";
        if (name) myBidsMap.set(name, (myBidsMap.get(name) || 0) + (b.amount || 0));
      });
      const myBidsWithNames = Array.from(myBidsMap, ([itemName, amount]) => ({ itemName, amount }));
      setMyBidsData(myBidsWithNames);

      // ─── matches 테이블 → scoredMatches 변환 ───
      const usersMap = new Map(allUsers.map(u => [u.id, u]));
      const scoredMatches = matchRows.map(row => {
        const matchedUser = usersMap.get(row.user2_id);
        const md = row.match_data || {};
        return {
          id: row.user2_id,
          nickname: matchedUser?.nickname || "알 수 없음",
          final_score: row.compatibility_score,
          auctionScore: md.auction_score ?? 0,
          feedScore: md.feed_score ?? 0,
          isMutual: md.is_mutual ?? false,
          commonValues: md.common_values ?? [],
          rarestCommonValue: md.rarest_common_value ?? "",
          rarestCount: md.rarest_count ?? allUsers.length,
          totalUsers: md.total_users ?? allUsers.length,
          partnerTopValue: md.partner_top_value ?? "",
        };
      });

      setMatches(scoredMatches);

      // ─── 솔라 시스템 파트너 데이터 생성 (match_data 기반) ───
      if (scoredMatches.length > 0) {
        const solarData = scoredMatches.map((match, idx) => {
          // 파트너 bid 데이터 추출 (Value Spectrum용) - 아이템별 누적 합산
          const partnerBidsRaw = allBids.filter(b => String(b.user_id) === String(match.id));
          const partnerBidsMap = new Map<string, number>();
          partnerBidsRaw.forEach(b => {
            const item = items.find(i => i.id === b.auction_item_id);
            const name = item?.title || "";
            if (name) partnerBidsMap.set(name, (partnerBidsMap.get(name) || 0) + (b.amount || 0));
          });
          const partnerBidsWithNames = Array.from(partnerBidsMap, ([itemName, amount]) => ({ itemName, amount }));

          // top_value: 서버 저장값 우선, 없으면 bids에서 계산
          const topValue = match.partnerTopValue ||
            ([...partnerBidsWithNames].sort((a, b) => b.amount - a.amount)[0]?.itemName || "");
          const topValueKeyword = VALUE_TO_KEYWORD[topValue] || "";
          const cheatSheet = CHEAT_SHEET[topValue] || "";
          const cheatSheet2 = CHEAT_SHEET_2[topValue] || "";

          // V6.7 coreFact: 희소성 vs 대중성 비율 판별
          const coreFact = generateCoreFact(
            match.commonValues,
            match.rarestCommonValue,
            match.rarestCount,
            match.totalUsers
          );
          const rarestKeyword = VALUE_TO_KEYWORD[match.rarestCommonValue] || match.rarestCommonValue;

          // 상대방이 좋아한 내 사진 (feed_likes에서 user_id=partner, target_user_id=me)
          const partnerLikedMyPhotos = allFeedLikes
            .filter(l => String(l.user_id) === String(match.id) && String(l.target_user_id) === String(uid))
            .map(l => l.photo_id);

          // 내가 상대방에게 보낸 하트 수
          const myHeartsToPartner = allFeedLikes
            .filter(l => String(l.user_id) === String(uid) && String(l.target_user_id) === String(match.id))
            .length;

          return {
            id: match.id,
            nickname: match.nickname,
            score: match.final_score,
            orbitDistance: idx + 1,
            pullFactor: {
              coreFact,
              coreValue: rarestKeyword,
            },
            topValue,
            topValueKeyword,
            cheatSheet,
            cheatSheet2,
            commonValues: match.commonValues,
            isMutual: match.isMutual,
            rareCount: match.rarestCount,
            partnerBids: partnerBidsWithNames,
            feedScore: match.feedScore,
            myHeartsToPartner,
            partnerLikedMyPhotos,
          };
        });

        setSolarPartners(solarData);
      }

      // ─── 외행성 데이터 생성 (내행성 외 이성 참가자) ───
      const innerIds = scoredMatches.map(m => m.id);
      const oppositeGenderUsers = allUsers.filter(u =>
        String(u.id) !== String(uid) && (u.gender?.includes(target.charAt(0)) || u.gender === target)
      );
      const outerPlanetData = oppositeGenderUsers
        .filter(u => !innerIds.includes(u.id))
        .map(u => ({ id: u.id, nickname: u.nickname }));
      setOuterPlanets(outerPlanetData);

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
        {/* [V7] 3D 솔라 시스템 - Three.js */}
        <motion.div
          className="rounded-[2.5rem] shadow-2xl overflow-hidden bg-[#070714]"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-[#070714] px-6 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={18} className="text-amber-300" />
              <span className="text-[10px] font-sans font-black uppercase tracking-widest text-amber-300">The Solar System</span>
            </div>
            <h3 className="text-xl font-bold mb-2 text-white">{user?.nickname}님의 인력</h3>
            <p className="text-sm text-indigo-300 mb-4">드래그하여 우주를 둘러보세요. 행성을 탭하면 상세 리포트가 열립니다.</p>
          </div>

          <SolarSystem3D
            solarPartners={solarPartners}
            outerPlanets={outerPlanets}
            selectedPlanet={selectedPlanet}
            setSelectedPlanet={setSelectedPlanet}
            nickname={user?.nickname}
          />

          {/* 범례 */}
          <div className="flex justify-center gap-4 text-[10px] py-4 bg-[#070714]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gradient-to-br from-amber-300 to-orange-400 rounded-full" />
              <span className="text-amber-300">나</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gradient-to-br from-sky-400 to-blue-500 rounded-full" />
              <span className="text-sky-300">내행성</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-indigo-400/50 rounded-full" />
              <span className="text-indigo-400/50">외행성</span>
            </div>
          </div>
        </motion.div>

      </section>

      {/* [V6.1] 미니 리포트 모달 (Fixed Position Glassmorphism) */}
      <AnimatePresence>
        {selectedPlanet !== null && selectedPlanet.isMatch && solarPartners[selectedPlanet.index] && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlanet(null)}
            />
            {/* Modal */}
            <motion.div
              className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-50 bg-white/95 backdrop-blur-xl border border-white/50 rounded-[2rem] p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25 }}
            >
              {/* 헤더 */}
              <div className="flex justify-between items-start mb-5">
                <div>
                  <p className="text-[10px] font-sans font-black uppercase tracking-widest text-sky-500 mb-1">
                    {solarPartners[selectedPlanet.index].nickname}님과의 중력
                  </p>
                  <h4 className="text-2xl font-bold">{solarPartners[selectedPlanet.index].nickname}</h4>
                </div>
                <div className="text-right">
                  {solarPartners[selectedPlanet.index].feedScore > 0 ? (
                    <p className="text-3xl font-black text-sky-500">{solarPartners[selectedPlanet.index].score}%</p>
                  ) : (
                    <span className="inline-block px-3 py-1.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white text-xs font-bold rounded-full shadow-sm">
                      가치관 올인원 매칭
                    </span>
                  )}
                  {solarPartners[selectedPlanet.index].isMutual && (
                    <span className="text-[9px] font-bold text-rose-500 flex items-center gap-1 justify-end mt-1">
                      <Heart size={10} fill="#f43f5e" /> Mutual
                    </span>
                  )}
                </div>
              </div>

              {/* [중력의 근거] - bid_logs 기반 희소 가치관 */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 rounded-2xl p-5 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Link2 size={14} className="text-indigo-500" />
                  <span className="text-[10px] font-sans font-black uppercase tracking-widest text-indigo-500">중력의 근거</span>
                </div>
                <p className="text-sm text-indigo-700 leading-relaxed break-keep font-medium">
                  {solarPartners[selectedPlanet.index].pullFactor.coreFact}
                </p>
                <ul className="text-xs text-indigo-400 mt-3 space-y-1 list-none">
                  <li className="flex items-start gap-1.5">
                    <span className="mt-[3px] w-1 h-1 rounded-full bg-indigo-300 shrink-0" />
                    가치관 {solarPartners[selectedPlanet.index].commonValues?.length ?? 0}개 일치
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-[3px] w-1 h-1 rounded-full bg-indigo-300 shrink-0" />
                    나→상대 하트 {solarPartners[selectedPlanet.index].myHeartsToPartner ?? 0}개
                  </li>
                  <li className="flex items-start gap-1.5">
                    <span className="mt-[3px] w-1 h-1 rounded-full bg-indigo-300 shrink-0" />
                    상대→나 하트 {solarPartners[selectedPlanet.index].partnerLikedMyPhotos?.length ?? 0}개
                  </li>
                </ul>
                {solarPartners[selectedPlanet.index].commonValues.length === 0 && (
                  <p className="text-xs text-indigo-500 mt-2">
                    {(solarPartners[selectedPlanet.index].myHeartsToPartner > 0 || (solarPartners[selectedPlanet.index].partnerLikedMyPhotos?.length ?? 0) > 0)
                      ? "같은 취향 다른 가치관을 가진 상대네요! 맞춰갈 수 있을 지 대화를 통해 알아가봐요."
                      : "오늘 이 테이블에서 가장 닮은 취향을 가진 분이에요."}
                  </p>
                )}
              </div>

              {/* [유저별 맞춤 대화] - 상대방의 top_value 기반 */}
              {solarPartners[selectedPlanet.index].cheatSheet && (
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle size={14} className="text-emerald-600" />
                    <span className="text-[10px] font-sans font-black uppercase tracking-widest text-emerald-600">맞춤 대화 가이드</span>
                  </div>
                  <p className="text-xs text-emerald-600 mb-3">
                    상대방의 "{solarPartners[selectedPlanet.index].topValueKeyword}" 가치를 공략할 질문:
                  </p>
                  <div className="space-y-2">
                    <div className="bg-white/80 border border-emerald-100 rounded-xl p-4">
                      <p className="text-base text-emerald-800 font-medium leading-relaxed break-keep">
                        "{solarPartners[selectedPlanet.index].cheatSheet}"
                      </p>
                    </div>
                    <div className="bg-white/80 border border-emerald-100 rounded-xl p-4">
                      <p className="text-base text-emerald-800 font-medium leading-relaxed break-keep">
                        "{solarPartners[selectedPlanet.index].cheatSheet2}"
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 상대방이 좋아한 내 사진 */}
              {(solarPartners[selectedPlanet.index].partnerLikedMyPhotos?.length ?? 0) > 0 && (
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-100 rounded-2xl p-5 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Heart size={14} className="text-rose-400" />
                    <span className="text-[10px] font-sans font-black uppercase tracking-widest text-rose-400">LIKED PHOTOS</span>
                  </div>
                  <p className="text-xs text-rose-400 mb-3">
                    {solarPartners[selectedPlanet.index].nickname}님이 피드에서 좋아한 내 사진
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {solarPartners[selectedPlanet.index].partnerLikedMyPhotos.map((photoId) => (
                      <div key={photoId} className="relative aspect-square rounded-xl overflow-hidden border-2 border-white shadow-sm">
                        <img
                          src={`https://drive.google.com/thumbnail?id=${photoId}&sz=w400`}
                          alt="liked photo"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-1 right-1 bg-white/80 rounded-full p-1">
                          <Heart size={12} className="text-rose-500" fill="#f43f5e" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* [V6.4] Value Spectrum: Keyword Polarity */}
              <div className="bg-white border border-sky-200 rounded-2xl p-5 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <Star size={14} className="text-sky-500" />
                  <span className="text-[10px] font-sans font-black uppercase tracking-widest text-sky-500">Value Spectrum</span>
                </div>

                <p className="text-xs text-stone-400 mb-4">
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full" /> 나</span>
                  <span className="mx-2">vs</span>
                  <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-sky-400 rounded-full" /> {solarPartners[selectedPlanet.index].nickname}</span>
                </p>

                <div className="space-y-3">
                  {VALUE_AXES.map((axis, i) => {
                    // 내 bid에서 해당 가치관 점수 찾기
                    const myBidA = myBidsData.find(b => b.itemName === axis.a);
                    const myBidB = myBidsData.find(b => b.itemName === axis.b);
                    // 파트너 bid에서 해당 가치관 점수 찾기
                    const partnerBids = solarPartners[selectedPlanet.index].partnerBids || [];
                    const partnerBidA = partnerBids.find(b => b.itemName === axis.a);
                    const partnerBidB = partnerBids.find(b => b.itemName === axis.b);

                    // 합집합: 나 또는 파트너 중 하나라도 입찰한 축만 표시
                    const hasMyData = myBidA || myBidB;
                    const hasPartnerData = partnerBidA || partnerBidB;
                    if (!hasMyData && !hasPartnerData) return null;

                    // 점수 계산 (절대 금액 기반 - 많이 쓸수록 해당 방향으로 더 이동)
                    const myScoreA = myBidA?.amount || 0;
                    const myScoreB = myBidB?.amount || 0;
                    const myMaxBid = Math.max(...myBidsData.map(b => b.amount), 1);
                    const myPosition = 50 + ((myScoreB - myScoreA) / (2 * myMaxBid)) * 100;

                    const partnerScoreA = partnerBidA?.amount || 0;
                    const partnerScoreB = partnerBidB?.amount || 0;
                    const partnerMaxBid = Math.max(...partnerBids.map(b => b.amount), 1);
                    const partnerPosition = 50 + ((partnerScoreB - partnerScoreA) / (2 * partnerMaxBid)) * 100;

                    // Resonance: 같은 항목에 양쪽 모두 입찰했으면 공명
                    const bothBidOnA = (myBidA?.amount ?? 0) > 0 && (partnerBidA?.amount ?? 0) > 0;
                    const bothBidOnB = (myBidB?.amount ?? 0) > 0 && (partnerBidB?.amount ?? 0) > 0;
                    const isResonance = bothBidOnA || bothBidOnB;

                    return (
                      <motion.div
                        key={i}
                        className={`p-2 rounded-lg ${isResonance ? 'bg-amber-50 border border-amber-200' : ''}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                      >
                        <p className="text-[9px] font-sans font-black uppercase tracking-widest text-stone-400 text-center mb-1">
                          {axis.axis}
                          {isResonance && <span className="ml-1 text-[#C9A227]">✦ 공명</span>}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-semibold w-6 text-right ${myPosition < 50 ? 'text-[#C9A227]' : 'text-stone-400'}`}>
                            {axis.labelA}
                          </span>
                          <div className="flex-1 h-2.5 bg-gradient-to-r from-sky-100 via-stone-50 to-purple-100 rounded-full relative">
                            {/* 내 위치 (Sun) */}
                            <motion.div
                              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-amber-400 rounded-full shadow-md border-2 border-white flex items-center justify-center z-10"
                              initial={{ left: "50%" }}
                              animate={{ left: `${Math.max(5, Math.min(95, myPosition))}%` }}
                              transition={{ delay: 0.15 + i * 0.05, duration: 0.4, type: "spring" }}
                              style={{ marginLeft: "-7px" }}
                              title="나"
                            >
                              <span className="text-[7px]">☀️</span>
                            </motion.div>
                            {/* 파트너 위치 (Planet) */}
                            <motion.div
                              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-sky-400 rounded-full shadow-md border-2 border-white flex items-center justify-center z-10"
                              initial={{ left: "50%" }}
                              animate={{ left: `${Math.max(5, Math.min(95, partnerPosition))}%` }}
                              transition={{ delay: 0.2 + i * 0.05, duration: 0.4, type: "spring" }}
                              style={{ marginLeft: "-7px" }}
                              title={solarPartners[selectedPlanet.index].nickname}
                            >
                              <span className="text-[7px]">🪐</span>
                            </motion.div>
                          </div>
                          <span className={`text-[10px] font-semibold w-6 ${myPosition > 50 ? 'text-[#C9A227]' : 'text-stone-400'}`}>
                            {axis.labelB}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* 닫기 버튼 */}
              <motion.button
                onClick={() => setSelectedPlanet(null)}
                className="mt-5 w-full py-3 bg-sky-500 text-white rounded-2xl text-sm font-bold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                닫기
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* [V6.1] 외행성 클릭 시 에러 메시지 모달 */}
      <AnimatePresence>
        {selectedPlanet !== null && !selectedPlanet.isMatch && (
          <>
            {/* Overlay */}
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPlanet(null)}
            />
            {/* Modal */}
            <motion.div
              className="fixed inset-x-4 bottom-4 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-sm z-50 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/30 rounded-[2rem] p-8 shadow-2xl text-center"
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25 }}
            >
              <div className="mb-4">
                <motion.div
                  className="w-16 h-16 mx-auto bg-indigo-900/50 rounded-full flex items-center justify-center"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Sparkles size={32} className="text-indigo-400" />
                </motion.div>
              </div>
              <h4 className="text-xl font-bold text-white mb-2">아직 중력이 닿지 않았습니다</h4>
              <p className="text-sm text-indigo-300 mb-6 break-keep">
                이분과는 인연이 아닌 것 같아요.
              </p>
              <motion.button
                onClick={() => setSelectedPlanet(null)}
                className="w-full py-3 bg-indigo-500 text-white rounded-2xl text-sm font-bold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                돌아가기
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
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

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// 16가지 가치관별 딥토크 가이드 (1on1-spec.md 기준)
const VALUE_ICEBREAKERS: Record<string, { intro: string; questions: string[] }> = {
  "원하는 것을 살 수 있는 풍요": {
    intro: "경제적 자유를 꿈꾸는 스마트한 두 분! 💸",
    questions: [
      "'명품이나 가전 같은 실물' vs '최고급 호텔 호캉스 같은 경험', 어느 쪽이 더 짜릿하신가요?",
      "사고 싶은 게 생기면 바로 지르는 '스피드파'인가요, 아니면 최저가와 후기를 꼼꼼히 따지는 '신중파'인가요?",
      "버킷리스트 중 가장 이루고 싶은 건 뭐예요?"
    ]
  },
  "사랑하는 사람과 함께하는 시간": {
    intro: "무엇보다 '우리'가 소중한 따뜻한 분들! 👩‍❤️‍👨",
    questions: [
      "바쁜 평일 저녁의 30분 번개 데이트 vs 여유로운 주말의 종일 데이트, 하나만 고른다면?",
      "서로 각자 할 일을 하면서 같은 공간에 있는 것도 '함께하는 시간'이라고 생각하시나요?",
      "소중한 사람과 함께하면 꼭 하고 싶은 일이 있어요?"
    ]
  },
  "안정적이고 평온한 일상": {
    intro: "평화주의자 두 분의 만남! 잔잔한 호수 같은 연애를 꿈꾸시나요? 🌊",
    questions: [
      "가장 행복한 휴식은 '집에서 넷플릭스 보기'인가요, 아니면 '익숙한 단골 카페 가기'인가요?",
      "예상치 못한 깜짝 이벤트보다는, 미리 약속된 안정적인 데이트가 더 마음 편하신가요?",
      "일상에서 가장 좋아하는 루틴이 있어요?"
    ]
  },
  "새로운 경험과 짜릿한 도전": {
    intro: "에너지가 넘치는 모험가 듀오! 다음 정복지는 어디인가요? 🏄‍♂️",
    questions: [
      "한 번도 안 먹어본 이색 음식 도전하기! '완전 설레요' vs '그래도 익숙한 게 최고'?",
      "여행을 간다면 '모든 일정을 액티비티로 채우기' vs '하루에 딱 한 가지만 제대로 도전하기'?",
      "최근에 도전해본 것 중 기억나는 거 있어요?"
    ]
  },
  "모두에게 인정받는 성공": {
    intro: "열정 가득한 야망가 두 분! 서로의 가장 든든한 서포터가 되어줄 준비 되셨나요? 🏆",
    questions: [
      "나의 성과를 축하받을 때, '둘만의 조촐한 파티'가 좋으세요, 아니면 '주변 지인들의 떠들썩한 축하'가 더 기쁘신가요?",
      "서로 바빠서 연락이 조금 뜸해지더라도, 상대방의 커리어 성장을 위해 어디까지 이해해 줄 수 있을까요?",
      "어떤 순간에 가장 뿌듯함을 느끼세요?"
    ]
  },
  "나만의 속도로 걷는 여유": {
    intro: "속도전 같은 세상에서 나만의 템포를 지키는 멋쟁이들! 🐢",
    questions: [
      "약속 시간보다 일찍 도착했을 때, 혼자만의 여유를 즐기시나요, 아니면 상대방이 빨리 오길 기다리시나요?",
      "복잡한 핫플보다는 조용한 골목 산책을 선호하시나요?",
      "바쁜 일상에서 여유를 찾는 나만의 방법이 있어요?"
    ]
  },
  "지금 당장 누리는 확실한 행복": {
    intro: "오늘의 행복을 내일로 미루지 않는 멋진 분들! 🍰",
    questions: [
      "지나가는 길에 발견한 맛있어 보이는 디저트 집! '배불러도 일단 먹는다' vs '다음에 배고플 때 다시 온다'?",
      "평소 가보고 싶던 공연 티켓이 오늘 딱 떴다면? '일단 예매하고 연차를 고민한다' vs '스케줄을 확인하고 예매한다'?",
      "오늘 가장 행복했던 순간이 있었어요?"
    ]
  },
  "더 큰 미래를 위한 인내": {
    intro: "탄탄한 미래를 설계하는 갓생러 두 분! 📈",
    questions: [
      "미래를 위해 지금 가장 기쁘게 참고 있는 '최애템'이나 '취미'가 있다면 무엇인가요?",
      "계획했던 목표를 달성했을 때, 나 자신에게 주는 보상은 어느 정도 수준이 적당하다고 생각하시나요?",
      "요즘 열심히 준비하고 있는 게 있어요?"
    ]
  },
  "냉철하고 합리적인 판단": {
    intro: "논리적인 대화가 통하는 뇌섹 커플! 🤖",
    questions: [
      "고민 상담을 할 때, '무조건적인 내 편'이 필요한가요, 아니면 '정확한 상황 판단과 솔루션'이 더 도움이 되나요?",
      "데이트 중 의견 차이가 생기면, '감정이 가라앉을 때까지 기다리기' vs '그 자리에서 논리적으로 풀기'?",
      "중요한 결정을 내릴 때 어떤 기준을 가장 중요하게 생각해요?"
    ]
  },
  "깊이 공감하는 따뜻한 마음": {
    intro: "세상의 온도를 높이는 프로 공감러 두 분! 🧸",
    questions: [
      "상대방이 속상한 일을 겪었을 때, 말로 하는 위로보다 '따뜻한 포옹이나 눈맞춤'이 더 중요하다고 생각하시나요?",
      "영화나 드라마를 보며 함께 눈물을 흘리는 커플, 상상만 해도 몽글몽글하지 않나요?",
      "누군가의 말에 크게 공감했던 적 있어요?"
    ]
  },
  "눈에 보이는 압도적 성과": {
    intro: "결과로 증명하는 능력자들! 🥇",
    questions: [
      "함께 운동이나 게임을 할 때, '즐기는 것'보다 '이기는 것'이 더 중요하신가요? (선의의 경쟁!)",
      "우리가 함께 이뤄내고 싶은 첫 번째 공동 목표가 있다면 무엇일까요?",
      "최근에 이뤄낸 성과 중 자랑하고 싶은 게 있어요?"
    ]
  },
  "함께 걷는 과정의 유대감": {
    intro: "결과보다 '우리'의 서사를 중요하게 여기는 분들! 🤝",
    questions: [
      "데이트가 계획대로 안 풀려도 '너랑 있어서 즐거웠어'라고 웃어 넘길 수 있는 여유, 서로에게 기대해도 될까요?",
      "서로를 알아가는 과정에서 '가장 중요하게 생각하는 대화의 주제'는 무엇인가요?",
      "팀으로 뭔가를 해낸 경험이 있어요?"
    ]
  },
  "누구와도 차별화된 나만의 개성": {
    intro: "유니크한 매력의 소유자들! 🌈",
    questions: [
      "연인과 '커플 아이템'을 맞춘다면, 대놓고 티 나는 것보다 '우리만 아는 디테일'이 있는 게 더 좋으신가요?",
      "남들이 다 하는 데이트 코스 말고, 두 분만이 아는 숨겨진 아지트나 취향이 있다면 알려주세요!",
      "나만의 특별한 취미나 관심사가 있어요?"
    ]
  },
  "모두와 어우러지는 소속감": {
    intro: "친화력 만렙! 주변 사람들과 함께 행복을 나누는 따뜻한 커플 예고입니다. 🎻",
    questions: [
      "연인의 친구들과 함께 만나는 자리, '완전 즐거워요'인가요, 아니면 '조금은 기 빨려요'인가요? 😂",
      "가족이나 가까운 지인들에게 우리 관계를 당당하게 소개하는 시점은 언제쯤이 적당할까요?",
      "어떤 커뮤니티나 모임에 속해 있어요?"
    ]
  },
  "오롯이 나에게 집중하는 자유": {
    intro: "서로의 독립성을 지켜주는 쿨한 관계! 🧘‍♂️",
    questions: [
      "연락이 조금 늦더라도 '개인 시간 중이구나' 하고 쿨하게 넘어가 줄 수 있는 믿음, 우리 사이의 필수 조건일까요?",
      "각자의 취미 생활을 존중하기 위해 주말 중 하루는 '개인 정비의 날'로 정하는 것에 대해 어떻게 생각하세요?",
      "나만의 시간이 왜 중요하다고 생각해요?"
    ]
  },
  "소중한 사람을 위한 헌신": {
    intro: "사랑을 아낌없이 주는 나무 같은 두 분! 🌳",
    questions: [
      "내가 조금 피곤하더라도 상대방이 가고 싶어 하는 곳에 기꺼이 함께 가주는 것, 사랑의 증거라고 생각하시나요?",
      "상대방을 위해 정성껏 준비한 서프라이즈가 성공했을 때, 그때의 희열을 함께 나누고 싶으신가요?",
      "소중한 사람을 위해 해준 것 중 기억나는 게 있어요?"
    ]
  }
};

// ============================================
// Gale-Shapley Stable Matching Algorithm
// ============================================
interface Preference {
  userId: string;
  preferenceList: { candidateId: string; score: number }[];
}

function galeShapleyMatching(
  proposers: Preference[],
  acceptors: Preference[]
): Map<string, string> {
  const matches = new Map<string, string>(); // acceptor -> proposer
  const proposerMatches = new Map<string, string>(); // proposer -> acceptor
  const proposerNextIndex = new Map<string, number>(); // 각 proposer가 다음에 propose할 인덱스

  // 초기화
  proposers.forEach(p => proposerNextIndex.set(p.userId, 0));

  // acceptor의 선호도 맵 생성 (빠른 비교를 위해)
  const acceptorRanking = new Map<string, Map<string, number>>();
  acceptors.forEach(a => {
    const ranking = new Map<string, number>();
    a.preferenceList.forEach((pref, idx) => {
      ranking.set(pref.candidateId, idx);
    });
    acceptorRanking.set(a.userId, ranking);
  });

  // 매칭되지 않은 proposer 찾기
  const getUnmatchedProposer = (): Preference | null => {
    for (const p of proposers) {
      if (!proposerMatches.has(p.userId)) {
        const nextIdx = proposerNextIndex.get(p.userId) || 0;
        if (nextIdx < p.preferenceList.length) {
          return p;
        }
      }
    }
    return null;
  };

  let unmatchedProposer = getUnmatchedProposer();

  while (unmatchedProposer) {
    const proposerId = unmatchedProposer.userId;
    const nextIdx = proposerNextIndex.get(proposerId) || 0;

    if (nextIdx >= unmatchedProposer.preferenceList.length) {
      unmatchedProposer = getUnmatchedProposer();
      continue;
    }

    const targetAcceptorId = unmatchedProposer.preferenceList[nextIdx].candidateId;
    proposerNextIndex.set(proposerId, nextIdx + 1);

    const currentMatch = matches.get(targetAcceptorId);
    const acceptorRank = acceptorRanking.get(targetAcceptorId);

    if (!acceptorRank) {
      unmatchedProposer = getUnmatchedProposer();
      continue;
    }

    if (!currentMatch) {
      // acceptor가 아직 매칭되지 않음
      matches.set(targetAcceptorId, proposerId);
      proposerMatches.set(proposerId, targetAcceptorId);
    } else {
      // 현재 매칭과 비교
      const currentRank = acceptorRank.get(currentMatch) ?? Infinity;
      const proposerRank = acceptorRank.get(proposerId) ?? Infinity;

      if (proposerRank < currentRank) {
        // 새 proposer가 더 선호됨
        proposerMatches.delete(currentMatch);
        matches.set(targetAcceptorId, proposerId);
        proposerMatches.set(proposerId, targetAcceptorId);
      }
    }

    unmatchedProposer = getUnmatchedProposer();
  }

  return matches;
}

// 점수 정규화 함수 (60~95% 구간)
function normalizeScore(rawScore: number, minRaw: number, maxRaw: number): number {
  if (maxRaw === minRaw) return 77; // 중간값
  const normalized = (rawScore - minRaw) / (maxRaw - minRaw);
  return Math.round(60 + normalized * 35); // 60~95 구간
}

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // 1. 해당 세션의 유저 ID 목록 조회
    const { data: sessionUsers } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('session_id', sessionId);
    const sessionUserIds = (sessionUsers || []).map(u => u.id);

    // 2. 해당 세션 유저의 기존 매칭만 삭제 (이전 세션 매칭 보존)
    if (sessionUserIds.length > 0) {
      await supabaseAdmin.from('matches').delete().in('user1_id', sessionUserIds);
    }

    // 3. 해당 세션 데이터만 조회
    const [usersRes, itemsRes, bidsRes, likesRes] = await Promise.all([
      supabaseAdmin.from('users').select('*').eq('session_id', sessionId),
      supabaseAdmin.from('auction_items').select('*').order('created_at', { ascending: true }),
      supabaseAdmin.from('bids').select('*').in('user_id', sessionUserIds.length > 0 ? sessionUserIds : ['none']),
      supabaseAdmin.from('feed_likes').select('*').in('user_id', sessionUserIds.length > 0 ? sessionUserIds : ['none'])
    ]);

    const users = usersRes.data || [];
    const items = itemsRes.data || [];
    const bids = bidsRes.data || [];
    const likes = likesRes.data || [];

    if (users.length === 0) {
      return NextResponse.json({ success: true, matches_created: 0, session_id: sessionId });
    }

    // 3. 성별 분리
    const females = users.filter(u => u.gender === '여성' || u.gender === '여' || u.gender === 'F');
    const males = users.filter(u => u.gender === '남성' || u.gender === '남' || u.gender === 'M');

    // 4. 각 유저별 경매 벡터 생성
    const itemIds = items.map(item => item.id);
    const userVectors: Record<string, number[]> = {};
    const userTopValues: Record<string, string[]> = {}; // 상위 가치관 저장

    users.forEach(user => {
      const userBidsForItems: { itemId: string; amount: number; itemName: string }[] = [];

      const vector = itemIds.map(itemId => {
        const userBidsForItem = bids.filter(bid =>
          String(bid.user_id) === String(user.id) &&
          (String(bid.auction_item_id) === String(itemId) || String(bid.item_id) === String(itemId))
        );
        const total = userBidsForItem.reduce((sum, bid) => sum + (bid.amount || 0), 0);

        if (total > 0) {
          const item = items.find(i => i.id === itemId);
          userBidsForItems.push({ itemId, amount: total, itemName: item?.title || '' });
        }

        return total;
      });

      userVectors[user.id] = vector;

      // 상위 3개 가치관 추출
      userBidsForItems.sort((a, b) => b.amount - a.amount);
      userTopValues[user.id] = userBidsForItems.slice(0, 3).map(b => b.itemName);
    });

    // 5. 모든 점수 계산 (고도화된 알고리즘)
    const MAX_HEARTS = 5;

    // Tie-breaker용: 각 유저의 첫 액션 시간 계산
    const userFirstActionTime: Record<string, number> = {};
    users.forEach(user => {
      const userBidTimes = bids
        .filter(b => String(b.user_id) === String(user.id))
        .map(b => new Date(b.created_at || b.timestamp || 0).getTime())
        .filter(t => t > 0);

      const userLikeTimes = likes
        .filter(l => String(l.user_id) === String(user.id))
        .map(l => new Date(l.created_at || 0).getTime())
        .filter(t => t > 0);

      const allTimes = [...userBidTimes, ...userLikeTimes];
      userFirstActionTime[user.id] = allTimes.length > 0 ? Math.min(...allTimes) : Infinity;
    });

    // 각 가치관별 입찰자 수 사전 계산 (희소성 판단용)
    const valueBidderCounts: Record<string, number> = {};
    items.forEach(item => {
      const bidders = new Set(
        bids
          .filter(b => String(b.auction_item_id) === String(item.id) || String(b.item_id) === String(item.id))
          .map(b => String(b.user_id))
      );
      valueBidderCounts[item.title] = bidders.size;
    });

    const allScores: {
      from: string;
      to: string;
      rawScore: number;
      auctionScore: number;
      feedScore: number;
      isMutual: boolean;
      commonValues: string[];
      hasVisualPenalty: boolean; // 무관심 페널티 적용 여부
      firstActionTime: number;   // Tie-breaker용
      partnerTopValue: string;   // 파트너 최고 입찰 가치관
    }[] = [];

    for (const user of users) {
      const oppositeCandidates = users.filter(u =>
        String(u.id) !== String(user.id) && u.gender !== user.gender
      );

      for (const candidate of oppositeCandidates) {
        // [2.1] 가치관 정합성 (70%)
        let auctionScore = 0;
        const commonValues: string[] = [];
        const myVector = userVectors[user.id] || [];
        const otherVector = userVectors[candidate.id] || [];

        for (let i = 0; i < itemIds.length; i++) {
          const myBid = myVector[i];
          const otherBid = otherVector[i];

          if (myBid > 0 && otherBid > 0) {
            // 공식: Min(A입찰가, B입찰가) / 해당 아이템 총 입찰자 수
            const itemBidders = bids.filter(b =>
              String(b.auction_item_id) === String(itemIds[i]) ||
              String(b.item_id) === String(itemIds[i])
            ).length;
            const scarcityBonus = itemBidders <= 3 ? 1.3 : itemBidders <= 5 ? 1.15 : 1;

            const ratio = Math.min(myBid, otherBid) / Math.max(myBid, otherBid);
            auctionScore += ratio * scarcityBonus;

            // 공통 가치관 추출: 양쪽 모두 입찰했으면 공통 가치관
            const item = items.find(it => it.id === itemIds[i]);
            if (item?.title) commonValues.push(item.title);
          }
        }

        // 정규화 (최대값 기준)
        const maxPossibleOverlap = Math.min(
          myVector.filter(v => v > 0).length,
          otherVector.filter(v => v > 0).length
        );
        if (maxPossibleOverlap > 0) {
          auctionScore = (auctionScore / maxPossibleOverlap) * 70;
        }

        // [2.2] 시각적 호감도 (30%) - 지수형 배점
        const myLikesToCandidate = likes.filter(l =>
          String(l.user_id) === String(user.id) &&
          String(l.target_user_id) === String(candidate.id)
        ).length;

        const candidateLikesToMe = likes.filter(l =>
          String(l.user_id) === String(candidate.id) &&
          String(l.target_user_id) === String(user.id)
        ).length;

        // 공식: 30 × (선택한 하트 수 / 5)^1.2
        const feedScore = 30 * Math.pow(Math.min(myLikesToCandidate, MAX_HEARTS) / MAX_HEARTS, 1.2);

        // [2.3] 상호 보너스
        const isMutual = myLikesToCandidate > 0 && candidateLikesToMe > 0;
        let rawScore = auctionScore + feedScore;

        // Mutual Like 1.5배 승수
        if (isMutual) {
          rawScore *= 1.5;
        }

        // 무관심 페널티: 하트 0개면 15% 감산
        const hasVisualPenalty = myLikesToCandidate === 0 && auctionScore > 30;
        if (hasVisualPenalty) {
          rawScore *= 0.85;
        }

        // Tie-breaker: 두 유저 중 먼저 액션한 시간
        const firstActionTime = Math.min(
          userFirstActionTime[user.id] || Infinity,
          userFirstActionTime[candidate.id] || Infinity
        );

        // 파트너(candidate)의 최고 입찰 가치관
        const partnerTopValue = userTopValues[candidate.id]?.[0] || '';

        allScores.push({
          from: user.id,
          to: candidate.id,
          rawScore,
          auctionScore,
          feedScore,
          isMutual,
          commonValues: commonValues,
          hasVisualPenalty,
          firstActionTime,
          partnerTopValue
        });
      }
    }

    // 6. 점수 정규화 (60~95% 구간)
    const rawScores = allScores.map(s => s.rawScore);
    const minRaw = Math.min(...rawScores);
    const maxRaw = Math.max(...rawScores);

    // 7. 선호도 리스트 생성
    const femalePreferences: Preference[] = females.map(f => {
      const prefs = allScores
        .filter(s => s.from === f.id)
        .sort((a, b) => b.rawScore - a.rawScore)
        .map(s => ({
          candidateId: s.to,
          score: normalizeScore(s.rawScore, minRaw, maxRaw)
        }));
      return { userId: f.id, preferenceList: prefs };
    });

    const malePreferences: Preference[] = males.map(m => {
      const prefs = allScores
        .filter(s => s.from === m.id)
        .sort((a, b) => b.rawScore - a.rawScore)
        .map(s => ({
          candidateId: s.to,
          score: normalizeScore(s.rawScore, minRaw, maxRaw)
        }));
      return { userId: m.id, preferenceList: prefs };
    });

    // 8. Gale-Shapley 알고리즘 실행 (여성 제안, 남성 수락)
    const stableMatches = galeShapleyMatching(femalePreferences, malePreferences);

    // 9. 매칭 결과 생성 (Gale-Shapley 결과 반영 + 상위 3명)
    const matchesToInsert: any[] = [];
    let matchesCreated = 0;

    // Gale-Shapley 결과를 역방향 매핑 (male -> female)
    const stableMatchReverse = new Map<string, string>();
    stableMatches.forEach((femaleId, maleId) => {
      stableMatchReverse.set(femaleId, maleId);
    });

    for (const user of users) {
      const userScores = allScores
        .filter(s => s.from === user.id)
        .sort((a, b) => {
          // 1. Mutual은 최우선
          if (a.isMutual && !b.isMutual) return -1;
          if (!a.isMutual && b.isMutual) return 1;

          // 2. 점수 비교
          const scoreDiff = b.rawScore - a.rawScore;
          if (Math.abs(scoreDiff) > 0.001) return scoreDiff;

          // 3. Tie-breaker: 먼저 액션한 쪽이 우선
          return a.firstActionTime - b.firstActionTime;
        });

      // Gale-Shapley 안정적 매칭 파트너 확인
      const isFemale = user.gender === '여성' || user.gender === '여' || user.gender === 'F';
      let stablePartnerId: string | undefined;

      if (isFemale) {
        // 여성의 경우: stableMatches에서 이 여성을 선택한 남성 찾기
        stableMatches.forEach((femaleId, maleId) => {
          if (femaleId === user.id) stablePartnerId = maleId;
        });
      } else {
        // 남성의 경우: 이 남성이 매칭된 여성 찾기
        stablePartnerId = stableMatches.get(user.id);
      }

      // 상위 4명 선정 (안정적 매칭 파트너가 있으면 1순위로 보장)
      let topN = userScores.slice(0, 4);

      if (stablePartnerId) {
        const stableMatch = userScores.find(s => s.to === stablePartnerId);
        if (stableMatch) {
          // 안정적 매칭 파트너를 1순위로 이동
          topN = [stableMatch, ...userScores.filter(s => s.to !== stablePartnerId).slice(0, 3)];
        }
      }

      topN.forEach((match) => {
        const normalizedScore = normalizeScore(match.rawScore, minRaw, maxRaw);

        // 희소 공통 가치관 계산 (가장 입찰자 수가 적은 공통 항목)
        let rarestCommonValue = match.commonValues[0] || match.partnerTopValue || '';
        let rarestCount = users.length;

        match.commonValues.forEach(val => {
          const count = valueBidderCounts[val] || users.length;
          if (count < rarestCount) {
            rarestCount = count;
            rarestCommonValue = val;
          }
        });

        matchesToInsert.push({
          user1_id: user.id,
          user2_id: match.to,
          compatibility_score: normalizedScore,
          match_data: {
            auction_score: Math.round(match.auctionScore),
            feed_score: Math.round(match.feedScore),
            is_mutual: match.isMutual,
            common_values: match.commonValues,
            rarest_common_value: rarestCommonValue,
            rarest_count: rarestCount,
            total_users: users.length,
            partner_top_value: match.partnerTopValue
          }
        });
        matchesCreated++;
      });
    }

    // 10. 매칭 결과 일괄 삽입
    if (matchesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('matches')
        .insert(matchesToInsert);

      if (insertError) {
        console.error('매칭 삽입 오류:', insertError);
        return NextResponse.json(
          { success: false, error: `매칭 저장 오류: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      matches_created: matchesCreated,
      session_id: sessionId,
      stable_pairs: stableMatches.size
    });

  } catch (err: any) {
    console.error('API 서버 에러:', err);
    return NextResponse.json(
      { success: false, error: err.message || '알 수 없는 서버 오류' },
      { status: 500 }
    );
  }
}

// 아이스브레이커 생성 함수 (DB 컬럼 추가 시 활성화)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function generateIcebreakers(commonValues: string[], partnerTopValues: string[]): string[] {
  const questions: string[] = [];

  // 공통 가치관 기반 질문
  for (const value of commonValues) {
    const guide = VALUE_ICEBREAKERS[value];
    if (guide && questions.length < 3) {
      const randomQ = guide.questions[Math.floor(Math.random() * guide.questions.length)];
      if (!questions.includes(randomQ)) {
        questions.push(randomQ);
      }
    }
  }

  // 파트너 가치관 기반 질문 추가
  for (const value of partnerTopValues) {
    if (questions.length >= 3) break;
    const guide = VALUE_ICEBREAKERS[value];
    if (guide) {
      const randomQ = guide.questions[Math.floor(Math.random() * guide.questions.length)];
      if (!questions.includes(randomQ)) {
        questions.push(randomQ);
      }
    }
  }

  // 기본 질문으로 채우기
  const defaultQuestions = [
    "첫인상이랑 실제 성격이 다른 편이에요?",
    "스트레스 받을 때 주로 어떻게 풀어요?",
    "요즘 가장 관심 있는 게 뭐예요?",
    "MBTI가 뭐예요? 잘 맞는 것 같아요?",
    "주말에 주로 뭐 하면서 보내요?"
  ];

  while (questions.length < 3) {
    const q = defaultQuestions[Math.floor(Math.random() * defaultQuestions.length)];
    if (!questions.includes(q)) questions.push(q);
  }

  return questions.slice(0, 3);
}

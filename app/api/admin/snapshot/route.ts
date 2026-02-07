import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

// 가치관 키워드 매핑
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

const VIBE_INFO: Record<string, { emoji: string; label: string }> = {
  "spark": { emoji: "\u{1F525}", label: "불꽃이 튀었어요" },
  "calm": { emoji: "\u{1F60A}", label: "편안하고 좋았어요" },
  "cold": { emoji: "\u{1F9CA}", label: "아쉬웠어요" },
};

const WARM_CHARMS = ["다정다감", "세심한 배려", "예쁜 말투"];
const COOL_VALUES = ["이성", "성과", "성공", "자유", "개성"];
const COOL_CHARMS = ["깊은 가치관", "매력적 외모"];
const WARM_VALUES = ["사랑", "공감", "헌신", "과정", "소속"];

function generateShareToken(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 12);
}

function generateCoreFact(commonValues: string[], rarestCommonValue: string, rarestCount: number, totalUsers: number): string {
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
}

export async function POST() {
  try {
    // Lazy cleanup: 24시간 지난 스냅샷 삭제
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('report_snapshots').delete().lt('created_at', cutoff);

    // 세션 ID 조회
    const { data: sessionRow } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'current_session')
      .single();
    const sessionId = sessionRow?.value || '01';

    // 모든 소스 데이터 일괄 조회
    const [usersRes, bidsRes, itemsRes, matchesRes, feedbackRes, feedLikesRes] = await Promise.all([
      supabaseAdmin.from('users').select('*'),
      supabaseAdmin.from('bids').select('*'),
      supabaseAdmin.from('auction_items').select('*'),
      supabaseAdmin.from('matches').select('*'),
      supabaseAdmin.from('conversation_feedback').select('*'),
      supabaseAdmin.from('feed_likes').select('user_id, target_user_id, photo_id'),
    ]);

    const allUsers = usersRes.data || [];
    const allBids = bidsRes.data || [];
    const items = itemsRes.data || [];
    const allMatches = matchesRes.data || [];
    const allFeedback = feedbackRes.data || [];
    const allFeedLikes = feedLikesRes.data || [];

    const snapshots: { user_id: string; session_id: string; report_type: string; snapshot_data: any; share_token?: string }[] = [];

    for (const user of allUsers) {
      const uid = user.id;

      // ━━━ 1on1 리포트 스냅샷 ━━━
      const userMatches = allMatches
        .filter(m => String(m.user1_id) === String(uid))
        .sort((a, b) => (b.compatibility_score || 0) - (a.compatibility_score || 0));

      const myBids = allBids.filter(b => String(b.user_id) === String(uid));
      const myBidsMap = new Map<string, number>();
      myBids.forEach(b => {
        const item = items.find(i => i.id === b.auction_item_id);
        const name = item?.title || "";
        if (name) myBidsMap.set(name, (myBidsMap.get(name) || 0) + (b.amount || 0));
      });
      const myBidsData = Array.from(myBidsMap, ([itemName, amount]) => ({ itemName, amount }));

      const solarPartners = userMatches.map((row, idx) => {
        const matchedUser = allUsers.find(u => u.id === row.user2_id);
        const md = row.match_data || {};

        const partnerBidsRaw = allBids.filter(b => String(b.user_id) === String(row.user2_id));
        const partnerBidsMap = new Map<string, number>();
        partnerBidsRaw.forEach(b => {
          const item = items.find(i => i.id === b.auction_item_id);
          const name = item?.title || "";
          if (name) partnerBidsMap.set(name, (partnerBidsMap.get(name) || 0) + (b.amount || 0));
        });
        const partnerBids = Array.from(partnerBidsMap, ([itemName, amount]) => ({ itemName, amount }));

        const topValue = md.partner_top_value ||
          ([...partnerBids].sort((a, b) => b.amount - a.amount)[0]?.itemName || "");
        const topValueKeyword = VALUE_TO_KEYWORD[topValue] || "";
        const rarestKeyword = VALUE_TO_KEYWORD[md.rarest_common_value || ""] || (md.rarest_common_value || "");

        const partnerLikedMyPhotos = allFeedLikes
          .filter(l => String(l.user_id) === String(row.user2_id) && String(l.target_user_id) === String(uid))
          .map(l => l.photo_id);
        const myHeartsToPartner = allFeedLikes
          .filter(l => String(l.user_id) === String(uid) && String(l.target_user_id) === String(row.user2_id))
          .length;

        return {
          id: row.user2_id,
          nickname: matchedUser?.nickname || "알 수 없음",
          score: row.compatibility_score,
          orbitDistance: idx + 1,
          pullFactor: {
            coreFact: generateCoreFact(
              md.common_values || [],
              md.rarest_common_value || "",
              md.rarest_count || allUsers.length,
              md.total_users || allUsers.length
            ),
            coreValue: rarestKeyword,
          },
          topValue,
          topValueKeyword,
          cheatSheet: CHEAT_SHEET[topValue] || "",
          cheatSheet2: CHEAT_SHEET_2[topValue] || "",
          commonValues: md.common_values || [],
          isMutual: md.is_mutual ?? false,
          rareCount: md.rarest_count,
          partnerBids,
          feedScore: md.feed_score ?? 0,
          myHeartsToPartner,
          partnerLikedMyPhotos,
        };
      });

      // 외행성
      const myGender = user.gender?.trim() || "";
      const target = (myGender === "여성" || myGender === "여" || myGender === "F") ? "남성" : "여성";
      const innerIds = solarPartners.map(p => p.id);
      const outerPlanets = allUsers
        .filter(u => String(u.id) !== String(uid) && (u.gender?.includes(target.charAt(0)) || u.gender === target))
        .filter(u => !innerIds.includes(u.id))
        .map(u => ({ id: u.id, nickname: u.nickname }));

      snapshots.push({
        user_id: uid,
        session_id: sessionId,
        report_type: '1on1',
        snapshot_data: {
          user: { id: user.id, nickname: user.nickname, real_name: user.real_name },
          solarPartners,
          outerPlanets,
          myBidsData,
        },
      });

      // ━━━ 시그니처 리포트 스냅샷 ━━━
      const bidMap = new Map<string, number>();
      myBids.forEach(b => {
        const item = items.find(i => i.id === b.auction_item_id);
        const name = item?.title || "";
        if (name) bidMap.set(name, (bidMap.get(name) || 0) + (b.amount || 0));
      });
      const topValues = Array.from(bidMap, ([itemName, amount]) => ({
        itemName,
        keyword: VALUE_TO_KEYWORD[itemName] || itemName,
        amount,
      })).sort((a, b) => b.amount - a.amount);

      const totalSpent = topValues.reduce((sum, v) => sum + v.amount, 0);
      const topKeyword = topValues[0]?.keyword || "";
      const aura = AURA_MAP[topKeyword] || null;

      // Lone Pioneer
      const itemBidderMap = new Map<string, Set<string>>();
      allBids.forEach(b => {
        const item = items.find(i => i.id === b.auction_item_id);
        const name = item?.title || "";
        if (!name) return;
        if (!itemBidderMap.has(name)) itemBidderMap.set(name, new Set());
        itemBidderMap.get(name)!.add(String(b.user_id));
      });
      const rareValues = topValues
        .filter(v => itemBidderMap.get(v.itemName)?.has(String(uid)))
        .map(v => ({
          keyword: v.keyword,
          fullName: v.itemName,
          myAmount: v.amount,
          bidderCount: itemBidderMap.get(v.itemName)?.size || 0,
          totalUsers: allUsers.length,
        }))
        .sort((a, b) => a.bidderCount - b.bidderCount)
        .slice(0, 3);

      // Feedback
      const userFeedbacks = allFeedback.filter(f => String(f.partner_id) === String(uid));
      const feedbackData = userFeedbacks.map(f => ({ vibe: f.vibe, charms: f.charms || [], round: f.round }));
      const charmCount = new Map<string, number>();
      feedbackData.forEach(f => f.charms.forEach((c: string) => charmCount.set(c, (charmCount.get(c) || 0) + 1)));
      const charmRanking = Array.from(charmCount, ([charm, count]) => ({ charm, count })).sort((a, b) => b.count - a.count);
      const vibeCount = new Map<string, number>();
      feedbackData.forEach(f => vibeCount.set(f.vibe, (vibeCount.get(f.vibe) || 0) + 1));
      const vibeBreakdown = Array.from(vibeCount, ([vibe, count]) => ({ vibe, count })).sort((a, b) => b.count - a.count);

      // Paradox
      const selfIdentity = topKeyword;
      const perceivedCharm = charmRanking[0]?.charm || "";
      const isParadoxFound = (
        (COOL_VALUES.includes(selfIdentity) && WARM_CHARMS.includes(perceivedCharm)) ||
        (WARM_VALUES.includes(selfIdentity) && COOL_CHARMS.includes(perceivedCharm))
      );

      // Instinct
      const myLikes = allFeedLikes.filter(l => String(l.user_id) === String(uid));
      const likedUserIds = [...new Set(myLikes.map(l => String(l.target_user_id)))];
      const likedValueCount = new Map<string, number>();
      likedUserIds.forEach(likedUid => {
        const theirBids = allBids.filter(b => String(b.user_id) === likedUid);
        const theirBidMap = new Map<string, number>();
        theirBids.forEach(b => {
          const item = items.find(i => i.id === b.auction_item_id);
          const name = item?.title || "";
          if (name) theirBidMap.set(name, (theirBidMap.get(name) || 0) + (b.amount || 0));
        });
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

      snapshots.push({
        user_id: uid,
        session_id: sessionId,
        report_type: 'signature',
        snapshot_data: {
          user: { id: user.id, nickname: user.nickname, real_name: user.real_name },
          topValues: topValues.slice(0, 5),
          aura,
          totalSpent,
          rareValues,
          feedbacks: feedbackData,
          charmRanking,
          vibeBreakdown,
          selfIdentity,
          perceivedCharm,
          isParadoxFound,
          likedUserValues,
          totalLikes: myLikes.length,
        },
        share_token: generateShareToken(),
      });
    }

    // Upsert all snapshots
    const { error } = await supabaseAdmin
      .from('report_snapshots')
      .upsert(snapshots, { onConflict: 'user_id,session_id,report_type' });

    if (error) {
      console.error('Snapshot upsert error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${allUsers.length}명의 스냅샷이 생성되었습니다.`,
      count: snapshots.length,
    });
  } catch (err: any) {
    console.error('Snapshot API error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Unknown error' }, { status: 500 });
  }
}

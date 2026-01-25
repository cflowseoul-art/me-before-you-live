import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// 코사인 유사도 계산
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length || vecA.length === 0) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
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

    // 1. 기존 매칭 삭제
    await supabaseAdmin.from('matches').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 2. 필요한 데이터 조회
    const [usersRes, itemsRes, bidsRes, likesRes] = await Promise.all([
      supabaseAdmin.from('users').select('*'),
      supabaseAdmin.from('auction_items').select('*').order('created_at', { ascending: true }),
      supabaseAdmin.from('bids').select('*'),
      supabaseAdmin.from('feed_likes').select('*')
    ]);

    const users = usersRes.data || [];
    const items = itemsRes.data || [];
    const bids = bidsRes.data || [];
    const likes = likesRes.data || [];

    if (users.length === 0) {
      return NextResponse.json({ success: true, matches_created: 0, session_id: sessionId });
    }

    // 3. 각 유저별 경매 벡터 생성 (아이템별 총 입찰 금액)
    const itemIds = items.map(item => item.id);
    const userVectors: Record<string, number[]> = {};

    users.forEach(user => {
      const vector = itemIds.map(itemId => {
        const userBids = bids.filter(bid =>
          String(bid.user_id) === String(user.id) &&
          String(bid.auction_item_id) === String(itemId)
        );
        return userBids.reduce((sum, bid) => sum + (bid.amount || 0), 0);
      });
      userVectors[user.id] = vector;
    });

    // 4. 각 유저에 대해 이성 후보 점수 계산 및 상위 3명 매칭
    const MAX_LIKES = 3;
    let matchesCreated = 0;
    const matchesToInsert: any[] = [];

    for (const user of users) {
      const candidates: { candidateId: string; auctionSim: number; feedScore: number; finalScore: number }[] = [];

      // 이성 후보 찾기
      const oppositeCandidates = users.filter(u =>
        String(u.id) !== String(user.id) && u.gender !== user.gender
      );

      for (const candidate of oppositeCandidates) {
        // 경매 유사도 (70%)
        const auctionSim = cosineSimilarity(
          userVectors[user.id] || [],
          userVectors[candidate.id] || []
        );

        // 피드 점수 (30%) - 상호 좋아요
        const myLikesToCandidate = likes.filter(l =>
          String(l.user_id) === String(user.id) &&
          String(l.target_user_id) === String(candidate.id)
        ).length;

        const candidateLikesToMe = likes.filter(l =>
          String(l.user_id) === String(candidate.id) &&
          String(l.target_user_id) === String(user.id)
        ).length;

        const feedScore = (myLikesToCandidate + candidateLikesToMe) / (2 * MAX_LIKES);

        // 최종 점수
        const finalScore = (auctionSim * 0.7) + (feedScore * 0.3);

        candidates.push({
          candidateId: candidate.id,
          auctionSim,
          feedScore,
          finalScore
        });
      }

      // 점수 내림차순 정렬 후 상위 3명
      candidates.sort((a, b) => b.finalScore - a.finalScore);
      const top3 = candidates.slice(0, 3);

      // 매칭 데이터 준비 (실제 테이블 스키마에 맞춤: user1_id, user2_id, compatibility_score)
      top3.forEach((match) => {
        matchesToInsert.push({
          user1_id: user.id,
          user2_id: match.candidateId,
          compatibility_score: Math.round(match.finalScore * 100) // 0~100% 변환
        });
        matchesCreated++;
      });
    }

    // 5. 매칭 결과 일괄 삽입
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
      session_id: sessionId
    });

  } catch (err: any) {
    console.error('API 서버 에러:', err);
    return NextResponse.json(
      { success: false, error: err.message || '알 수 없는 서버 오류' },
      { status: 500 }
    );
  }
}

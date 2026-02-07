import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: '초기화할 세션 ID가 필요합니다. (예: 2026-02-07_01)' },
        { status: 400 }
      );
    }

    // 1. 해당 세션의 유저 ID 목록 조회
    const { data: sessionUsers, error: usersQueryError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('session_id', sessionId);

    if (usersQueryError) {
      return NextResponse.json(
        { success: false, error: `유저 조회 실패: ${usersQueryError.message}` },
        { status: 500 }
      );
    }

    const userIds = (sessionUsers || []).map(u => u.id);
    const results: Record<string, any> = {};
    const deletedCount = userIds.length;

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        message: `세션 [${sessionId}]에 해당하는 유저가 없습니다.`,
        session_id: sessionId,
        deleted_users: 0,
        results: {}
      });
    }

    // 2. 해당 유저들의 관련 데이터 삭제 (외래 키 순서)

    // report_snapshots
    const { error: snapshotsErr } = await supabaseAdmin
      .from('report_snapshots')
      .delete()
      .in('user_id', userIds);
    results.report_snapshots = { success: !snapshotsErr, error: snapshotsErr?.message };

    // matches (user1_id 또는 user2_id)
    const { error: matches1Err } = await supabaseAdmin
      .from('matches')
      .delete()
      .in('user1_id', userIds);
    const { error: matches2Err } = await supabaseAdmin
      .from('matches')
      .delete()
      .in('user2_id', userIds);
    results.matches = { success: !matches1Err && !matches2Err, error: matches1Err?.message || matches2Err?.message };

    // bids
    const { error: bidsErr } = await supabaseAdmin
      .from('bids')
      .delete()
      .in('user_id', userIds);
    results.bids = { success: !bidsErr, error: bidsErr?.message };

    // feed_likes
    const { error: likesErr } = await supabaseAdmin
      .from('feed_likes')
      .delete()
      .in('user_id', userIds);
    results.feed_likes = { success: !likesErr, error: likesErr?.message };

    // feed_items
    const { error: feedErr } = await supabaseAdmin
      .from('feed_items')
      .delete()
      .in('user_id', userIds);
    results.feed_items = { success: !feedErr, error: feedErr?.message };

    // conversation_feedback
    const { error: fbErr } = await supabaseAdmin
      .from('conversation_feedback')
      .delete()
      .in('user_id', userIds);
    results.conversation_feedback = { success: !fbErr, error: fbErr?.message };

    // 3. auction_items: 해당 유저가 최고 입찰자인 아이템만 리셋
    const { error: auctionErr } = await supabaseAdmin
      .from('auction_items')
      .update({ status: 'pending', current_bid: 0, highest_bidder_id: null })
      .in('highest_bidder_id', userIds);
    results.auction_items = { success: !auctionErr, error: auctionErr?.message };

    // 4. 유저 삭제
    const { error: usersErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('session_id', sessionId);
    results.users = { success: !usersErr, error: usersErr?.message };

    const hasErrors = Object.values(results).some((r: any) => r.error);

    console.log(`Reset session [${sessionId}]:`, results);

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors
        ? `세션 [${sessionId}] 초기화 중 일부 오류 발생`
        : `세션 [${sessionId}] 초기화 완료 (${deletedCount}명 삭제)`,
      session_id: sessionId,
      deleted_users: deletedCount,
      results
    });

  } catch (err: any) {
    console.error('Reset API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

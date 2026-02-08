import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: '삭제할 유저 ID가 필요합니다.' },
        { status: 400 }
      );
    }

    // 외래 키 순서대로 관련 데이터 삭제

    // report_snapshots
    await supabaseAdmin
      .from('report_snapshots')
      .delete()
      .eq('user_id', userId);

    // matches (user1_id 또는 user2_id)
    await supabaseAdmin
      .from('matches')
      .delete()
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    // bids
    await supabaseAdmin
      .from('bids')
      .delete()
      .eq('user_id', userId);

    // feed_likes (본인이 누른 좋아요 + 본인을 대상으로 한 좋아요)
    await supabaseAdmin
      .from('feed_likes')
      .delete()
      .or(`user_id.eq.${userId},target_user_id.eq.${userId}`);

    // feed_items
    await supabaseAdmin
      .from('feed_items')
      .delete()
      .eq('user_id', userId);

    // conversation_feedback
    await supabaseAdmin
      .from('conversation_feedback')
      .delete()
      .eq('user_id', userId);

    // auction_items: 해당 유저가 최고 입찰자인 아이템 리셋
    await supabaseAdmin
      .from('auction_items')
      .update({ status: 'pending', current_bid: 0, highest_bidder_id: null })
      .eq('highest_bidder_id', userId);

    // 유저 삭제
    const { error: userErr } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId);

    if (userErr) {
      return NextResponse.json(
        { success: false, error: `유저 삭제 실패: ${userErr.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error('Delete user error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

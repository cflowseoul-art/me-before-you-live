import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST() {
  try {
    const results: Record<string, any> = {};

    // 순서 중요: 외래 키 제약 조건을 피하기 위해 참조하는 테이블부터 삭제

    // 1. Delete all bids first (references users and auction_items)
    const { error: bidsError } = await supabaseAdmin
      .from('bids')
      .delete()
      .not('id', 'is', null);

    if (bidsError) console.error('Bids delete error:', bidsError);
    results.bids = { success: !bidsError, error: bidsError?.message };

    // 2. Delete all feed_likes (references feed_items and possibly users)
    const { error: likesError } = await supabaseAdmin
      .from('feed_likes')
      .delete()
      .not('id', 'is', null);

    if (likesError) console.error('Feed likes delete error:', likesError);
    results.feed_likes = { success: !likesError, error: likesError?.message };

    // 3. Delete all feed_items (references users)
    const { error: feedError } = await supabaseAdmin
      .from('feed_items')
      .delete()
      .not('id', 'is', null);

    if (feedError) console.error('Feed items delete error:', feedError);
    results.feed_items = { success: !feedError, error: feedError?.message };

    // 4. Delete conversation_feedback (references users)
    const { error: feedbackError } = await supabaseAdmin
      .from('conversation_feedback')
      .delete()
      .not('id', 'is', null);

    if (feedbackError) console.error('Conversation feedback delete error:', feedbackError);
    results.conversation_feedback = { success: !feedbackError, error: feedbackError?.message };

    // 5. Reset auction_items BEFORE deleting users (clear highest_bidder_id reference)
    const { error: auctionError } = await supabaseAdmin
      .from('auction_items')
      .update({
        status: 'pending',
        current_bid: 0,
        highest_bidder_id: null
      })
      .not('id', 'is', null);

    if (auctionError) console.error('Auction items reset error:', auctionError);
    results.auction_items = { success: !auctionError, error: auctionError?.message };

    // 6. Delete all users (after clearing all references)
    const { error: usersError } = await supabaseAdmin
      .from('users')
      .delete()
      .not('id', 'is', null);

    if (usersError) console.error('Users delete error:', usersError);
    results.users = { success: !usersError, error: usersError?.message };

    // 7. Reset system_settings to initial state
    const settingsUpdates = [
      { key: 'current_phase', value: 'auction' },
      { key: 'is_feed_open', value: 'false' },
      { key: 'is_report_open', value: 'false' },
      { key: 'active_feedback_round', value: '0' },
      { key: 'is_final_report_open', value: 'false' }
    ];

    let settingsError = null;
    for (const setting of settingsUpdates) {
      const { error } = await supabaseAdmin
        .from('system_settings')
        .upsert(setting);
      if (error) settingsError = error;
    }

    results.system_settings = { success: !settingsError, error: settingsError?.message };

    // Check for any errors
    const hasErrors = Object.values(results).some((r: any) => r.error);

    console.log('Reset results:', results);

    return NextResponse.json({
      success: !hasErrors,
      message: hasErrors ? 'Some operations failed' : 'Session reset complete',
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

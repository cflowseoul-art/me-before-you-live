import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { open } = await request.json();

    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({ key: 'is_final_report_open', value: open ? 'true' : 'false' });

    if (error) {
      console.error('Final report flag update error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, is_final_report_open: open ? 'true' : 'false' });
  } catch (err: any) {
    console.error('Final report API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // 1. Get is_final_report_open flag
    const { data: flagData } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'is_final_report_open')
      .single();

    const isOpen = flagData?.value === 'true';

    // 2. Get active_feedback_round
    const { data: roundData } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'active_feedback_round')
      .single();

    const activeRound = parseInt(roundData?.value || '0') || 0;

    // 3. Count matched users (unique user1_id in matches)
    const { data: matchData } = await supabaseAdmin
      .from('matches')
      .select('user1_id');

    const matchedUserIds = new Set((matchData || []).map(m => m.user1_id));
    const matchedUserCount = matchedUserIds.size;

    // 4. Count conversation_feedback entries
    const { data: feedbackData } = await supabaseAdmin
      .from('conversation_feedback')
      .select('id');

    const feedbackCount = feedbackData?.length || 0;

    // Expected total = matched users * active_round (each user submits once per round)
    const expectedTotal = matchedUserCount * (activeRound > 0 ? activeRound : 1);
    const completionRate = expectedTotal > 0 ? Math.round((feedbackCount / expectedTotal) * 100) : 0;

    return NextResponse.json({
      success: true,
      is_final_report_open: isOpen,
      survey: {
        feedbackCount,
        matchedUserCount,
        activeRound,
        expectedTotal,
        completionRate,
      },
    });
  } catch (err: any) {
    console.error('Final report GET error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

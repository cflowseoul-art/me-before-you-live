import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { phase } = await request.json();

    if (!phase || !['auction', 'feed', 'report'].includes(phase)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phase. Must be auction, feed, or report.' },
        { status: 400 }
      );
    }

    // Calculate flag values based on phase
    const isFeedOpen = (phase === 'feed' || phase === 'report') ? 'true' : 'false';
    const isReportOpen = (phase === 'report') ? 'true' : 'false';

    // Update all settings atomically using service role (bypasses RLS)
    const results = await Promise.all([
      supabaseAdmin.from('system_settings').upsert({ key: 'current_phase', value: phase }),
      supabaseAdmin.from('system_settings').upsert({ key: 'is_feed_open', value: isFeedOpen }),
      supabaseAdmin.from('system_settings').upsert({ key: 'is_report_open', value: isReportOpen })
    ]);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Phase update errors:', errors.map(e => e.error));
      return NextResponse.json(
        { success: false, error: errors[0].error?.message || 'Failed to update phase' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      phase,
      is_feed_open: isFeedOpen,
      is_report_open: isReportOpen
    });
  } catch (err: any) {
    console.error('Phase API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('key, value')
      .in('key', ['current_phase', 'is_feed_open', 'is_report_open', 'current_session', 'active_feedback_round']);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const settings: Record<string, string> = {};
    data?.forEach(row => {
      settings[row.key] = row.value;
    });

    return NextResponse.json({ success: true, settings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

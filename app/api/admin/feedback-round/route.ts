import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { round } = await request.json();

    if (round === undefined || !['0', '1', '2', '3', '4', '5'].includes(String(round))) {
      return NextResponse.json(
        { success: false, error: 'Invalid round. Must be 0-5.' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({ key: 'active_feedback_round', value: String(round) });

    if (error) {
      console.error('Feedback round update error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, round: String(round) });
  } catch (err: any) {
    console.error('Feedback round API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

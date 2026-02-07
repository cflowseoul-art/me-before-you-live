import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const { session, ratio } = await request.json();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session value is required' },
        { status: 400 }
      );
    }

    const updates = [
      { key: 'current_session', value: session },
    ];
    if (ratio) {
      updates.push({ key: 'session_ratio', value: ratio });
    }

    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert(updates);

    if (error) {
      console.error('Session update error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, session, ratio });
  } catch (err: any) {
    console.error('Session API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

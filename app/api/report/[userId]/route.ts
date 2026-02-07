import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import crypto from 'crypto';

function generateShareToken(): string {
  return crypto.randomBytes(6).toString('base64url').slice(0, 12);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Lazy cleanup: 24시간 지난 스냅샷 삭제
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('report_snapshots').delete().lt('created_at', cutoff);

    const { data, error } = await supabaseAdmin
      .from('report_snapshots')
      .select('report_type, snapshot_data, share_token, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ success: false, error: 'No snapshots found' }, { status: 404 });
    }

    const snapshots: Record<string, any> = {};
    for (const row of data) {
      snapshots[row.report_type] = {
        data: row.snapshot_data,
        share_token: row.share_token,
        created_at: row.created_at,
      };
    }

    return NextResponse.json({ success: true, snapshots });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// 스냅샷이 없을 때 클라이언트 데이터로 스냅샷 생성 (공유용)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const body = await request.json();
    const { snapshot_data, user } = body;

    if (!snapshot_data) {
      return NextResponse.json({ success: false, error: 'snapshot_data is required' }, { status: 400 });
    }

    // 세션 ID 조회
    const { data: sessionRow } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'current_session')
      .single();
    const sessionId = sessionRow?.value || '01';

    // 이미 스냅샷이 있는지 확인
    const { data: existing } = await supabaseAdmin
      .from('report_snapshots')
      .select('share_token')
      .eq('user_id', userId)
      .eq('report_type', 'signature')
      .single();

    if (existing?.share_token) {
      return NextResponse.json({ success: true, share_token: existing.share_token });
    }

    const shareToken = generateShareToken();

    const { error } = await supabaseAdmin
      .from('report_snapshots')
      .upsert({
        user_id: userId,
        session_id: sessionId,
        report_type: 'signature',
        snapshot_data: { ...snapshot_data, user },
        share_token: shareToken,
      }, { onConflict: 'user_id,session_id,report_type' });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, share_token: shareToken });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

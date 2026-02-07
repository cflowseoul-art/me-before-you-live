import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

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

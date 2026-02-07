import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Lazy cleanup: 24시간 지난 스냅샷 삭제
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabaseAdmin.from('report_snapshots').delete().lt('created_at', cutoff);

    const { data, error } = await supabaseAdmin
      .from('report_snapshots')
      .select('snapshot_data, report_type, created_at')
      .eq('share_token', token)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { success: false, error: '유효하지 않거나 만료된 공유 링크입니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      report_type: data.report_type,
      snapshot_data: data.snapshot_data,
      created_at: data.created_at,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

-- 004_report_hub.sql
-- Report Hub: 스냅샷 기반 리포트 저장 및 공유

CREATE TABLE report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  report_type TEXT NOT NULL CHECK (report_type IN ('1on1', 'signature')),
  snapshot_data JSONB NOT NULL DEFAULT '{}',
  share_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id, report_type)
);

-- RLS 활성화
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE report_snapshots;

-- 인덱스
CREATE INDEX idx_report_snapshots_user ON report_snapshots(user_id);
CREATE INDEX idx_report_snapshots_share_token ON report_snapshots(share_token);

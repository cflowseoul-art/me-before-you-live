-- conversation_feedback: 1on1 대화 후 유저 피드백 (인연의 잔상)
CREATE TABLE conversation_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  round INT4 NOT NULL CHECK (round BETWEEN 1 AND 5),
  vibe TEXT NOT NULL CHECK (vibe IN ('spark', 'calm', 'cold')),
  charms TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, round)
);

-- RLS
ALTER TABLE conversation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read" ON conversation_feedback FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON conversation_feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service_role full access" ON conversation_feedback FOR ALL USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_feedback;

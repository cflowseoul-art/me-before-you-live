-- bids 테이블에 session_id 추가
ALTER TABLE bids ADD COLUMN IF NOT EXISTS session_id TEXT;

-- feed_likes 테이블에 session_id 추가
ALTER TABLE feed_likes ADD COLUMN IF NOT EXISTS session_id TEXT;

-- conversation_feedback 테이블에 session_id 추가
ALTER TABLE conversation_feedback ADD COLUMN IF NOT EXISTS session_id TEXT;

-- 기존 데이터 백필: 유저의 session_id를 참조하여 채움
UPDATE bids b SET session_id = u.session_id
FROM users u WHERE b.user_id = u.id AND b.session_id IS NULL;

UPDATE feed_likes fl SET session_id = u.session_id
FROM users u WHERE fl.user_id = u.id AND fl.session_id IS NULL;

UPDATE conversation_feedback cf SET session_id = u.session_id
FROM users u WHERE cf.user_id = u.id AND cf.session_id IS NULL;

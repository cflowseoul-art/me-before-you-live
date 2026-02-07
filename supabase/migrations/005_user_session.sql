-- 005: users 테이블에 session_id 컬럼 추가
-- 회차별 유저 관리를 위해 필요

ALTER TABLE users ADD COLUMN IF NOT EXISTS session_id TEXT DEFAULT '01';

-- 기존 유저들은 '01'로 설정
UPDATE users SET session_id = '01' WHERE session_id IS NULL;

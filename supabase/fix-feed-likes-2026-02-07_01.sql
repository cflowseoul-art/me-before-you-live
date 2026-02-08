-- ============================================================
-- feed_likes 더미 데이터 수정 (2026-02-07_01 세션)
-- target_user_id가 NULL인 문제 해결
-- ============================================================

-- [1] 기존 feed_likes 삭제
DELETE FROM feed_likes
WHERE user_id IN (SELECT id FROM users WHERE session_id = '2026-02-07_01');

-- [2] Feed Likes 재생성 (유저당 이성 3명, session_id 포함)
INSERT INTO feed_likes (user_id, target_user_id, session_id, created_at)
SELECT user_id, target_id, '2026-02-07_01',
  '2026-02-07 15:00:00+09'::timestamptz + (random() * interval '2 hours')
FROM (
  SELECT u.id AS user_id, t.id AS target_id,
    ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY random()) AS rn
  FROM users u
  CROSS JOIN users t
  WHERE u.session_id = '2026-02-07_01'
    AND t.session_id = '2026-02-07_01'
    AND u.id != t.id
    AND u.gender != t.gender
) sub
WHERE rn <= 3;

-- [3] 확인
SELECT
  u.nickname,
  u.gender,
  fl.target_user_id,
  t.nickname AS liked_nickname,
  t.gender AS liked_gender,
  fl.session_id
FROM feed_likes fl
JOIN users u ON fl.user_id = u.id
JOIN users t ON fl.target_user_id = t.id
WHERE u.session_id = '2026-02-07_01'
ORDER BY u.gender, u.nickname, t.nickname;

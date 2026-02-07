-- ============================================================
-- 2026-02-07_01 회차 더미 데이터 (블록별 단독 실행)
-- ============================================================

-- [1] 정리
DELETE FROM bids WHERE user_id IN (SELECT id FROM users WHERE session_id = '2026-02-07_01');
DELETE FROM feed_likes WHERE user_id IN (SELECT id FROM users WHERE session_id = '2026-02-07_01');

-- [2] Bids (유저당 5개)
INSERT INTO bids (auction_item_id, user_id, amount, created_at)
SELECT item_id, user_id, (100 + (random() * 300)::int),
  '2026-02-07 14:00:00+09'::timestamptz + (random() * interval '3 hours')
FROM (
  SELECT ai.id AS item_id, u.id AS user_id,
    ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY random()) AS rn
  FROM users u
  CROSS JOIN auction_items ai
  WHERE u.session_id = '2026-02-07_01'
) sub
WHERE rn <= 5;

-- [3] Feed Likes (유저당 이성 3명)
INSERT INTO feed_likes (user_id, target_user_id, created_at)
SELECT user_id, target_id,
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

-- [4] 잔액 업데이트
UPDATE users u
SET balance = GREATEST(0, 1000 - COALESCE(
  (SELECT SUM(b.amount) FROM bids b WHERE b.user_id = u.id), 0
))
WHERE u.session_id = '2026-02-07_01';

-- [5] 확인
SELECT u.nickname, u.gender, u.balance,
  (SELECT COUNT(*) FROM bids b WHERE b.user_id = u.id) AS bids,
  (SELECT COALESCE(SUM(b.amount),0) FROM bids b WHERE b.user_id = u.id) AS total_bid,
  (SELECT COUNT(*) FROM feed_likes fl WHERE fl.user_id = u.id) AS likes
FROM users u
WHERE u.session_id = '2026-02-07_01'
ORDER BY u.gender, u.nickname;

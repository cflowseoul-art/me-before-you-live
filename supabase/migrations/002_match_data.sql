-- ============================================
-- Migration: Add match_data JSONB column
-- Stores computed match metadata to eliminate
-- client-side recalculation inconsistencies
-- ============================================

ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_data JSONB DEFAULT '{}';

-- match_data schema:
-- {
--   "auction_score": number,        -- raw auction component (0-70)
--   "feed_score": number,           -- raw feed component (0-30)
--   "is_mutual": boolean,           -- mutual like status
--   "common_values": string[],      -- shared value titles (max 3)
--   "rarest_common_value": string,  -- rarest shared value title
--   "rarest_count": number,         -- bidder count for rarest value
--   "total_users": number,          -- total participants at finalize time
--   "partner_top_value": string     -- partner's highest bid value title
-- }

COMMENT ON COLUMN matches.match_data IS 'Server-computed match metadata (pull factors, common values, scores breakdown)';

-- Remove duplicates, keeping the oldest row per (session_id, player_name)
DELETE FROM draft_order a
USING draft_order b
WHERE a.session_id = b.session_id
  AND a.player_name = b.player_name
  AND a.created_at > b.created_at;

-- Also handle exact timestamp ties by keeping lower id
DELETE FROM draft_order a
USING draft_order b
WHERE a.session_id = b.session_id
  AND a.player_name = b.player_name
  AND a.created_at = b.created_at
  AND a.id > b.id;

-- Add unique constraint to prevent future duplicates
ALTER TABLE draft_order ADD CONSTRAINT draft_order_session_player_unique 
  UNIQUE (session_id, player_name);
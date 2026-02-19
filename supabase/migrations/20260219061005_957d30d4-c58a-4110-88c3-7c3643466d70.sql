ALTER TABLE public.game_sessions 
ADD COLUMN game_type text NOT NULL DEFAULT 'full';

ALTER TABLE public.game_sessions 
ADD CONSTRAINT game_sessions_game_type_check 
CHECK (game_type IN ('full', 'winner_takes_all'));
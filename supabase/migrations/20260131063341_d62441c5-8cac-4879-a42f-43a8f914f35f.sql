-- Create chat_messages table for league chat
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  is_bot boolean DEFAULT false NOT NULL,
  reactions jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  
  -- Ensure content is limited to 500 chars
  CONSTRAINT content_length_check CHECK (char_length(content) <= 500)
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Create index for fast queries on league_id and created_at
CREATE INDEX idx_chat_messages_league_created ON public.chat_messages (league_id, created_at);

-- RLS Policies

-- Users can view messages in leagues they belong to
CREATE POLICY "League members can view chat messages"
ON public.chat_messages
FOR SELECT
USING (is_league_member(auth.uid(), league_id));

-- Users can insert messages in leagues they belong to
CREATE POLICY "League members can insert chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  is_league_member(auth.uid(), league_id) 
  AND auth.uid() = user_id
);

-- Allow updating reactions (for emoji reactions feature)
CREATE POLICY "League members can update reactions"
ON public.chat_messages
FOR UPDATE
USING (is_league_member(auth.uid(), league_id))
WITH CHECK (is_league_member(auth.uid(), league_id));

-- Enable realtime for the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
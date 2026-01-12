-- Create table for voice call signaling
CREATE TABLE public.voice_call_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  is_muted BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

-- Create table for WebRTC signaling (offers, answers, ICE candidates)
CREATE TABLE public.voice_call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  signal_type TEXT NOT NULL, -- 'offer', 'answer', 'ice-candidate'
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.voice_call_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_call_signals ENABLE ROW LEVEL SECURITY;

-- Policies for voice_call_participants
CREATE POLICY "Room members can view call participants"
ON public.voice_call_participants
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM room_members
  WHERE room_members.room_id = voice_call_participants.room_id
  AND room_members.user_id = auth.uid()
));

CREATE POLICY "Users can join calls"
ON public.voice_call_participants
FOR INSERT
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM room_members
  WHERE room_members.room_id = voice_call_participants.room_id
  AND room_members.user_id = auth.uid()
));

CREATE POLICY "Users can update their own call status"
ON public.voice_call_participants
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can leave calls"
ON public.voice_call_participants
FOR DELETE
USING (auth.uid() = user_id);

-- Policies for voice_call_signals
CREATE POLICY "Users can view signals addressed to them"
ON public.voice_call_signals
FOR SELECT
USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

CREATE POLICY "Users can send signals"
ON public.voice_call_signals
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can delete old signals"
ON public.voice_call_signals
FOR DELETE
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Enable realtime for call tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_call_signals;
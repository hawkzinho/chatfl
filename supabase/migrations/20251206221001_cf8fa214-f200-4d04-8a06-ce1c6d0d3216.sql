-- Create room invites table for sending room invitations to friends
CREATE TABLE public.room_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, sender_id, recipient_id)
);

-- Enable RLS
ALTER TABLE public.room_invites ENABLE ROW LEVEL SECURITY;

-- Users can view invites they sent or received
CREATE POLICY "Users can view their invites"
ON public.room_invites FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send invites
CREATE POLICY "Users can send invites"
ON public.room_invites FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Recipients can update invite status
CREATE POLICY "Recipients can update invite status"
ON public.room_invites FOR UPDATE
USING (auth.uid() = recipient_id);

-- Senders can delete their invites
CREATE POLICY "Senders can delete invites"
ON public.room_invites FOR DELETE
USING (auth.uid() = sender_id);

-- Enable realtime for room_invites
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_invites;

-- Add trigger for updated_at
CREATE TRIGGER update_room_invites_updated_at
BEFORE UPDATE ON public.room_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
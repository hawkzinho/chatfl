-- Enable realtime for friendships table so friend requests update in real-time
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
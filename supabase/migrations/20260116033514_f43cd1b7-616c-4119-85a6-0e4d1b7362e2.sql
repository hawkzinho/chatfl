-- =====================================================
-- SECURITY FIX: Restrict data access to room members only
-- =====================================================

-- 1. FIX: profiles table - Allow viewing profiles of friends, room members, or self
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;

-- Create a more restrictive policy: View profiles of friends, room members, or yourself
CREATE POLICY "Profiles viewable by related users"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = id
  OR EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (friendships.requester_id = auth.uid() AND friendships.addressee_id = profiles.id AND friendships.status = 'accepted')
       OR (friendships.addressee_id = auth.uid() AND friendships.requester_id = profiles.id AND friendships.status = 'accepted')
  )
  OR EXISTS (
    SELECT 1 FROM public.room_members rm1
    JOIN public.room_members rm2 ON rm1.room_id = rm2.room_id
    WHERE rm1.user_id = auth.uid() AND rm2.user_id = profiles.id
  )
  OR EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (friendships.requester_id = auth.uid() AND friendships.addressee_id = profiles.id AND friendships.status = 'pending')
       OR (friendships.addressee_id = auth.uid() AND friendships.requester_id = profiles.id AND friendships.status = 'pending')
  )
);

-- 2. FIX: chat_rooms table - Only show rooms where user is a member
DROP POLICY IF EXISTS "Public rooms are viewable by all authenticated users" ON public.chat_rooms;

CREATE POLICY "Rooms viewable by members"
ON public.chat_rooms
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_members.room_id = chat_rooms.id
    AND room_members.user_id = auth.uid()
  )
);

-- 3. FIX: room_members table - Only show members to other room members
DROP POLICY IF EXISTS "Room members are viewable by authenticated users" ON public.room_members;

CREATE POLICY "Room members viewable by room members"
ON public.room_members
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
  )
);

-- 4. FIX: message_reactions table - Only viewable by room members
DROP POLICY IF EXISTS "Reactions are viewable by room members" ON public.message_reactions;

CREATE POLICY "Reactions viewable by room members"
ON public.message_reactions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.room_members rm ON rm.room_id = m.room_id
    WHERE m.id = message_reactions.message_id
    AND rm.user_id = auth.uid()
  )
);

-- 5. FIX: message_reads table - Only viewable by room members
DROP POLICY IF EXISTS "Read receipts are viewable by room members" ON public.message_reads;

CREATE POLICY "Read receipts viewable by room members"
ON public.message_reads
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.room_members rm ON rm.room_id = m.room_id
    WHERE m.id = message_reads.message_id
    AND rm.user_id = auth.uid()
  )
);

-- 6. Additional security: Add policy to restrict adding reactions to room members
DROP POLICY IF EXISTS "Users can add reactions" ON public.message_reactions;

CREATE POLICY "Room members can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.room_members rm ON rm.room_id = m.room_id
    WHERE m.id = message_reactions.message_id
    AND rm.user_id = auth.uid()
  )
);

-- 7. Additional security: Restrict read receipts insertion to room members
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.message_reads;

CREATE POLICY "Room members can mark messages as read"
ON public.message_reads
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.messages m
    JOIN public.room_members rm ON rm.room_id = m.room_id
    WHERE m.id = message_reads.message_id
    AND rm.user_id = auth.uid()
  )
);

-- 8. Secure voice_call_signals - Ensure signals are only for room members
DROP POLICY IF EXISTS "Users can send signals" ON public.voice_call_signals;

CREATE POLICY "Room members can send signals"
ON public.voice_call_signals
FOR INSERT
WITH CHECK (
  auth.uid() = from_user_id
  AND EXISTS (
    SELECT 1 FROM public.room_members rm1
    JOIN public.room_members rm2 ON rm1.room_id = rm2.room_id
    WHERE rm1.user_id = auth.uid()
    AND rm2.user_id = voice_call_signals.to_user_id
    AND rm1.room_id = voice_call_signals.room_id
  )
);
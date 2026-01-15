-- Allow owners and admins to update member roles in room_members
CREATE POLICY "Room owners and admins can update member roles"
ON public.room_members
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
    AND rm.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
    AND rm.role IN ('owner', 'admin')
  )
);

-- Allow admins to remove members (in addition to owners)
CREATE POLICY "Room admins can remove members"
ON public.room_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM room_members rm
    WHERE rm.room_id = room_members.room_id
    AND rm.user_id = auth.uid()
    AND rm.role = 'admin'
  )
  AND NOT EXISTS (
    SELECT 1 FROM chat_rooms cr
    WHERE cr.id = room_members.room_id
    AND cr.created_by = room_members.user_id
  )
);

-- Allow admins to delete any message in rooms they admin
CREATE POLICY "Room admins can delete messages"
ON public.messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM room_members rm
    WHERE rm.room_id = messages.room_id
    AND rm.user_id = auth.uid()
    AND rm.role IN ('owner', 'admin')
  )
);
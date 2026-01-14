-- Allow room owners to remove members from their rooms
CREATE POLICY "Room owners can remove members"
ON public.room_members
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM chat_rooms 
    WHERE chat_rooms.id = room_members.room_id 
    AND chat_rooms.created_by = auth.uid()
  )
);
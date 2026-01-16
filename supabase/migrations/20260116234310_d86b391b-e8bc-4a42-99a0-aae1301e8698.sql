-- Create a security definer function to check room membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_room_member(_user_id uuid, _room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE user_id = _user_id
      AND room_id = _room_id
  )
$$;

-- Create a security definer function to check room role
CREATE OR REPLACE FUNCTION public.has_room_role(_user_id uuid, _room_id uuid, _roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.room_members
    WHERE user_id = _user_id
      AND room_id = _room_id
      AND role = ANY(_roles)
  )
$$;

-- Drop the problematic policies
DROP POLICY IF EXISTS "Room members viewable by room members" ON public.room_members;
DROP POLICY IF EXISTS "Room owners and admins can update member roles" ON public.room_members;
DROP POLICY IF EXISTS "Room admins can remove members" ON public.room_members;

-- Recreate policies using the security definer functions
CREATE POLICY "Room members viewable by room members" 
ON public.room_members 
FOR SELECT 
USING (public.is_room_member(auth.uid(), room_id));

CREATE POLICY "Room owners and admins can update member roles" 
ON public.room_members 
FOR UPDATE 
USING (public.has_room_role(auth.uid(), room_id, ARRAY['owner', 'admin']))
WITH CHECK (public.has_room_role(auth.uid(), room_id, ARRAY['owner', 'admin']));

CREATE POLICY "Room admins can remove members" 
ON public.room_members 
FOR DELETE 
USING (
  public.has_room_role(auth.uid(), room_id, ARRAY['admin'])
  AND NOT EXISTS (
    SELECT 1 FROM public.chat_rooms cr 
    WHERE cr.id = room_members.room_id 
    AND cr.created_by = room_members.user_id
  )
);
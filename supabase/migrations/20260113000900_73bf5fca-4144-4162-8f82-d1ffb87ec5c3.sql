-- Fix PostgREST embed for participants by adding missing FK

-- 1) Clean up any orphan rows that would block the FK creation
DELETE FROM public.voice_call_participants v
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = v.user_id
);

-- 2) Add FK voice_call_participants.user_id -> profiles.id (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    WHERE c.conname = 'voice_call_participants_user_id_fkey'
      AND c.conrelid = 'public.voice_call_participants'::regclass
  ) THEN
    ALTER TABLE public.voice_call_participants
      ADD CONSTRAINT voice_call_participants_user_id_fkey
      FOREIGN KEY (user_id)
      REFERENCES public.profiles (id)
      ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Index for faster "active call in room" lookups
CREATE INDEX IF NOT EXISTS voice_call_participants_room_active_idx
  ON public.voice_call_participants (room_id)
  WHERE is_active = true;
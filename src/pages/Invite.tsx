import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, CheckCircle, XCircle, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Invite = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not-found'>('loading');
  const [roomName, setRoomName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    
    if (!user) {
      // Store the invite code and redirect to auth
      sessionStorage.setItem('pendingInvite', code || '');
      navigate('/auth');
      return;
    }

    const joinRoom = async () => {
      if (!code) {
        setStatus('not-found');
        return;
      }

      try {
        // Find the room by invite code
        const { data: room, error: findError } = await supabase
          .from('chat_rooms')
          .select('id, name')
          .eq('invite_code', code.toUpperCase())
          .maybeSingle();

        if (findError || !room) {
          setStatus('not-found');
          return;
        }

        setRoomName(room.name);

        // Check if already a member
        const { data: existing } = await supabase
          .from('room_members')
          .select('id')
          .eq('room_id', room.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (existing) {
          setStatus('success');
          setTimeout(() => navigate(`/?room=${room.id}`), 1500);
          return;
        }

        // Join the room
        const { error: joinError } = await supabase
          .from('room_members')
          .insert({
            room_id: room.id,
            user_id: user.id,
            role: 'member',
          });

        if (joinError) {
          setErrorMessage('Failed to join the room');
          setStatus('error');
          return;
        }

        setStatus('success');
        setTimeout(() => navigate(`/?room=${room.id}`), 1500);
      } catch (error) {
        console.error('Error joining room:', error);
        setErrorMessage('An unexpected error occurred');
        setStatus('error');
      }
    };

    joinRoom();
  }, [code, user, authLoading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-mesh pointer-events-none" />
      
      <div className="relative w-full max-w-md p-8 rounded-3xl glass-strong border border-border/50 text-center animate-fade-in">
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-primary flex items-center justify-center animate-pulse">
              <Loader2 className="w-10 h-10 animate-spin text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Joining Room...</h1>
            <p className="text-muted-foreground">Please wait while we add you to the room</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary/20 flex items-center justify-center animate-bounce-in">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Welcome!</h1>
            <p className="text-muted-foreground mb-4">
              You've joined <span className="text-primary font-semibold">{roomName}</span>
            </p>
            <p className="text-sm text-muted-foreground">Redirecting you to the chat...</p>
          </>
        )}

        {status === 'not-found' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Invite</h1>
            <p className="text-muted-foreground mb-6">
              This invite link is invalid or has expired
            </p>
            <Button onClick={() => navigate('/')} className="w-full h-12 rounded-xl bg-gradient-primary">
              Go to Home
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Error</h1>
            <p className="text-muted-foreground mb-6">{errorMessage}</p>
            <Button onClick={() => navigate('/')} className="w-full h-12 rounded-xl bg-gradient-primary">
              Go to Home
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default Invite;

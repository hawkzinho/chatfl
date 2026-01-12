import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

interface Participant {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  is_muted: boolean;
  is_active: boolean;
}

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  audioStream?: MediaStream;
}

interface SignalInsert {
  room_id: string;
  from_user_id: string;
  to_user_id: string;
  signal_type: string;
  signal_data: Record<string, unknown>;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

export const useVoiceCall = (roomId: string | null) => {
  const { user } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Fetch current participants
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return;
    
    const { data, error } = await supabase
      .from('voice_call_participants')
      .select(`
        id,
        user_id,
        is_muted,
        is_active,
        profiles:user_id (username, avatar_url)
      `)
      .eq('room_id', roomId)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching participants:', error);
      return;
    }

    const formattedParticipants: Participant[] = (data || []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      username: p.profiles?.username || 'Unknown',
      avatar_url: p.profiles?.avatar_url,
      is_muted: p.is_muted,
      is_active: p.is_active,
    }));

    setParticipants(formattedParticipants);
  }, [roomId]);

  // Create peer connection for a user
  const createPeerConnection = useCallback(async (peerId: string, initiator: boolean) => {
    if (!user || !roomId || peerConnectionsRef.current.has(peerId)) return;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming audio
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        let audioEl = audioElementsRef.current.get(peerId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          audioElementsRef.current.set(peerId, audioEl);
        }
        audioEl.srcObject = remoteStream;
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        await supabase.from('voice_call_signals').insert({
          room_id: roomId,
          from_user_id: user.id,
          to_user_id: peerId,
          signal_type: 'ice-candidate',
          signal_data: { candidate: event.candidate },
        } as any);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
    };

    peerConnectionsRef.current.set(peerId, { peerId, connection: pc });

    // If initiator, create and send offer
    if (initiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        await supabase.from('voice_call_signals').insert({
          room_id: roomId,
          from_user_id: user.id,
          to_user_id: peerId,
          signal_type: 'offer',
          signal_data: { offer: pc.localDescription },
        } as any);
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    }

    return pc;
  }, [user, roomId]);

  // Handle incoming signal
  const handleSignal = useCallback(async (signal: any) => {
    if (!user) return;
    
    const { from_user_id, signal_type, signal_data } = signal;
    
    if (from_user_id === user.id) return;

    let pc = peerConnectionsRef.current.get(from_user_id)?.connection;

    if (signal_type === 'offer') {
      // Create connection if not exists
      if (!pc) {
        pc = await createPeerConnection(from_user_id, false);
      }
      if (!pc) return;

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(signal_data.offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await supabase.from('voice_call_signals').insert({
          room_id: roomId,
          from_user_id: user.id,
          to_user_id: from_user_id,
          signal_type: 'answer',
          signal_data: { answer: pc.localDescription },
        } as any);
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    } else if (signal_type === 'answer') {
      if (pc && pc.signalingState !== 'stable') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal_data.answer));
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    } else if (signal_type === 'ice-candidate') {
      if (pc && signal_data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal_data.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    }
  }, [user, roomId, createPeerConnection]);

  // Join call
  const joinCall = useCallback(async () => {
    if (!user || !roomId) return false;

    try {
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      localStreamRef.current = stream;

      // Add participant to database
      const { error } = await supabase.from('voice_call_participants').insert({
        room_id: roomId,
        user_id: user.id,
        is_muted: false,
        is_active: true,
      } as any);

      if (error) {
        // If already in call, update to active
        if (error.code === '23505') {
          await supabase
            .from('voice_call_participants')
            .update({ is_active: true, left_at: null, is_muted: false })
            .eq('room_id', roomId)
            .eq('user_id', user.id);
        } else {
          throw error;
        }
      }

      setIsInCall(true);
      setIsMuted(false);
      setCallDuration(0);

      // Start duration timer
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Fetch existing participants and connect to them
      await fetchParticipants();

      // Create connections to existing participants
      for (const participant of participants) {
        if (participant.user_id !== user.id) {
          await createPeerConnection(participant.user_id, true);
        }
      }

      toast.success('Você entrou na chamada');
      return true;
    } catch (err: any) {
      console.error('Error joining call:', err);
      toast.error('Não foi possível entrar na chamada');
      return false;
    }
  }, [user, roomId, fetchParticipants, participants, createPeerConnection]);

  // Leave call
  const leaveCall = useCallback(async () => {
    if (!user || !roomId) return;

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Close all peer connections
    peerConnectionsRef.current.forEach(({ connection }) => {
      connection.close();
    });
    peerConnectionsRef.current.clear();

    // Stop audio elements
    audioElementsRef.current.forEach(audio => {
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();

    // Update database
    await supabase
      .from('voice_call_participants')
      .update({ is_active: false, left_at: new Date().toISOString() })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    // Clear signals
    await supabase
      .from('voice_call_signals')
      .delete()
      .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
      .eq('room_id', roomId);

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsInCall(false);
    setCallDuration(0);
    toast.info('Você saiu da chamada');
  }, [user, roomId]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!localStreamRef.current || !user || !roomId) return;

    const newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(track => {
      track.enabled = !newMuted;
    });

    await supabase
      .from('voice_call_participants')
      .update({ is_muted: newMuted })
      .eq('room_id', roomId)
      .eq('user_id', user.id);

    setIsMuted(newMuted);
  }, [isMuted, user, roomId]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roomId || !user || !isInCall) return;

    // Subscribe to participant changes
    channelRef.current = supabase
      .channel(`voice_participants_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'voice_call_participants',
          filter: `room_id=eq.${roomId}`,
        },
        async (payload) => {
          await fetchParticipants();
          
          // Handle new participant joining
          if (payload.eventType === 'INSERT' && (payload.new as any).user_id !== user.id) {
            // Create connection to new participant
            await createPeerConnection((payload.new as any).user_id, true);
          }
          
          // Handle participant leaving
          if (payload.eventType === 'UPDATE' && !(payload.new as any).is_active) {
            const peerId = (payload.new as any).user_id;
            const peerConn = peerConnectionsRef.current.get(peerId);
            if (peerConn) {
              peerConn.connection.close();
              peerConnectionsRef.current.delete(peerId);
            }
            const audioEl = audioElementsRef.current.get(peerId);
            if (audioEl) {
              audioEl.srcObject = null;
              audioElementsRef.current.delete(peerId);
            }
          }
        }
      )
      .subscribe();

    // Subscribe to signaling
    signalChannelRef.current = supabase
      .channel(`voice_signals_${roomId}_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'voice_call_signals',
          filter: `to_user_id=eq.${user.id}`,
        },
        (payload) => {
          handleSignal(payload.new);
        }
      )
      .subscribe();

    return () => {
      channelRef.current?.unsubscribe();
      signalChannelRef.current?.unsubscribe();
    };
  }, [roomId, user, isInCall, fetchParticipants, createPeerConnection, handleSignal]);

  // Check if user is already in call on mount
  useEffect(() => {
    if (!roomId || !user) return;

    const checkExistingCall = async () => {
      const { data } = await supabase
        .from('voice_call_participants')
        .select('*')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (data) {
        // User was in call, reconnect
        setIsInCall(true);
        setIsMuted(data.is_muted);
      }
    };

    checkExistingCall();
    fetchParticipants();
  }, [roomId, user, fetchParticipants]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      peerConnectionsRef.current.forEach(({ connection }) => {
        connection.close();
      });
      audioElementsRef.current.forEach(audio => {
        audio.srcObject = null;
      });
    };
  }, []);

  return {
    isInCall,
    isMuted,
    participants,
    callDuration,
    joinCall,
    leaveCall,
    toggleMute,
    fetchParticipants,
  };
};

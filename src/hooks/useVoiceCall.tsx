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

interface ActiveCallInfo {
  hasActiveCall: boolean;
  starterName?: string;
  participantCount: number;
}

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  audioStream?: MediaStream;
}

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

// System messages are marked with a special prefix
const SYSTEM_MESSAGE_PREFIX = '🔔 SISTEMA: ';

// Send system message to chat using the acting user's ID
const sendSystemMessage = async (roomId: string, userId: string, content: string) => {
  await supabase.from('messages').insert({
    room_id: roomId,
    sender_id: userId,
    content: SYSTEM_MESSAGE_PREFIX + content,
  });
};

export const useVoiceCall = (roomId: string | null) => {
  const { user, profile } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [activeCallInfo, setActiveCallInfo] = useState<ActiveCallInfo>({ hasActiveCall: false, participantCount: 0 });
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const isJoiningRef = useRef(false);

  // Fetch current participants and update active call info
  const fetchParticipants = useCallback(async () => {
    if (!roomId) return [];
    
    const { data, error } = await supabase
      .from('voice_call_participants')
      .select(`
        id,
        user_id,
        is_muted,
        is_active,
        joined_at,
        profiles:user_id (username, avatar_url)
      `)
      .eq('room_id', roomId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching participants:', error);
      return [];
    }

    const formattedParticipants: Participant[] = (data || []).map((p: any) => ({
      id: p.id,
      user_id: p.user_id,
      username: p.profiles?.username || 'Desconhecido',
      avatar_url: p.profiles?.avatar_url,
      is_muted: p.is_muted,
      is_active: p.is_active,
    }));

    setParticipants(formattedParticipants);
    
    // Update active call info
    const hasActive = formattedParticipants.length > 0;
    const starterName = formattedParticipants[0]?.username;
    setActiveCallInfo({
      hasActiveCall: hasActive,
      starterName,
      participantCount: formattedParticipants.length,
    });

    return formattedParticipants;
  }, [roomId]);

  // Check for active call on mount and periodically
  useEffect(() => {
    if (roomId) {
      fetchParticipants();
    }
  }, [roomId, fetchParticipants]);

  // Create peer connection for a user
  const createPeerConnection = useCallback(async (peerId: string, initiator: boolean) => {
    if (!user || !roomId) return null;
    
    // Check if connection already exists
    const existingConn = peerConnectionsRef.current.get(peerId);
    if (existingConn && existingConn.connection.connectionState !== 'failed' && existingConn.connection.connectionState !== 'closed') {
      return existingConn.connection;
    }

    console.log(`Creating peer connection with ${peerId}, initiator: ${initiator}`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        console.log(`Adding track to peer connection: ${track.kind}`);
        pc.addTrack(track, localStreamRef.current!);
      });
    }

    // Handle incoming audio
    pc.ontrack = (event) => {
      console.log(`Received track from ${peerId}:`, event.track.kind);
      const [remoteStream] = event.streams;
      if (remoteStream) {
        let audioEl = audioElementsRef.current.get(peerId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          audioEl.volume = 1;
          audioElementsRef.current.set(peerId, audioEl);
        }
        audioEl.srcObject = remoteStream;
        audioEl.play().catch(e => console.log('Audio play error:', e));
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        console.log(`Sending ICE candidate to ${peerId}`);
        await supabase.from('voice_call_signals').insert({
          room_id: roomId,
          from_user_id: user.id,
          to_user_id: peerId,
          signal_type: 'ice-candidate',
          signal_data: { candidate: event.candidate.toJSON() },
        } as any);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${peerId}: ${pc.connectionState}`);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        console.log(`Connection ${pc.connectionState} with ${peerId}, will attempt reconnect on next signal`);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE connection state with ${peerId}: ${pc.iceConnectionState}`);
    };

    peerConnectionsRef.current.set(peerId, { peerId, connection: pc });

    // If initiator, create and send offer
    if (initiator) {
      try {
        console.log(`Creating offer for ${peerId}`);
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
        });
        await pc.setLocalDescription(offer);
        
        await supabase.from('voice_call_signals').insert({
          room_id: roomId,
          from_user_id: user.id,
          to_user_id: peerId,
          signal_type: 'offer',
          signal_data: { offer: pc.localDescription?.toJSON() },
        } as any);
      } catch (err) {
        console.error('Error creating offer:', err);
      }
    }

    return pc;
  }, [user, roomId]);

  // Handle incoming signal
  const handleSignal = useCallback(async (signal: any) => {
    if (!user || !localStreamRef.current) return;
    
    const { from_user_id, signal_type, signal_data } = signal;
    
    if (from_user_id === user.id) return;

    console.log(`Received signal ${signal_type} from ${from_user_id}`);

    let peerConn = peerConnectionsRef.current.get(from_user_id);
    let pc = peerConn?.connection;

    if (signal_type === 'offer') {
      // Always create a new connection for offers (in case old one is stale)
      if (pc && (pc.signalingState === 'closed' || pc.connectionState === 'failed')) {
        pc.close();
        peerConnectionsRef.current.delete(from_user_id);
        pc = undefined;
      }
      
      if (!pc) {
        pc = await createPeerConnection(from_user_id, false);
      }
      if (!pc) return;

      try {
        if (pc.signalingState !== 'stable') {
          console.log('Signaling state not stable, rolling back...');
          await pc.setLocalDescription({ type: 'rollback' });
        }
        
        await pc.setRemoteDescription(new RTCSessionDescription(signal_data.offer));
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await supabase.from('voice_call_signals').insert({
          room_id: roomId,
          from_user_id: user.id,
          to_user_id: from_user_id,
          signal_type: 'answer',
          signal_data: { answer: pc.localDescription?.toJSON() },
        } as any);
        console.log(`Sent answer to ${from_user_id}`);
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    } else if (signal_type === 'answer') {
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal_data.answer));
          console.log(`Set remote description from ${from_user_id}`);
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    } else if (signal_type === 'ice-candidate') {
      if (pc && pc.remoteDescription && signal_data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal_data.candidate));
          console.log(`Added ICE candidate from ${from_user_id}`);
        } catch (err) {
          console.error('Error adding ICE candidate:', err);
        }
      }
    }
  }, [user, roomId, createPeerConnection]);

  // Join call
  const joinCall = useCallback(async () => {
    if (!user || !roomId || isJoiningRef.current) return false;

    isJoiningRef.current = true;

    try {
      // Get microphone access
      console.log('Getting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      localStreamRef.current = stream;
      console.log('Got local stream:', stream.getTracks().map(t => t.kind).join(', '));

      // Check if this is the first participant (starting the call)
      const existingParticipants = await fetchParticipants();
      const isStartingCall = existingParticipants.length === 0;

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
            .update({ is_active: true, left_at: null, is_muted: false, joined_at: new Date().toISOString() })
            .eq('room_id', roomId)
            .eq('user_id', user.id);
        } else {
          throw error;
        }
      }

      setIsInCall(true);
      setIsMuted(false);
      setCallDuration(0);
      setCallStartTime(new Date());

      // Start duration timer
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Send system message
      const username = profile?.username || 'Alguém';
      if (isStartingCall) {
        await sendSystemMessage(roomId, user.id, `📞 ${username} iniciou uma chamada de voz`);
      } else {
        await sendSystemMessage(roomId, user.id, `📞 ${username} entrou na chamada`);
      }

      // Fetch updated participants
      const updatedParticipants = await fetchParticipants();

      // Create connections to existing participants (excluding self)
      for (const participant of updatedParticipants) {
        if (participant.user_id !== user.id) {
          console.log(`Creating connection to existing participant: ${participant.username}`);
          await createPeerConnection(participant.user_id, true);
        }
      }

      toast.success('Você entrou na chamada');
      isJoiningRef.current = false;
      return true;
    } catch (err: any) {
      console.error('Error joining call:', err);
      if (err.name === 'NotAllowedError') {
        toast.error('Permissão do microfone negada');
      } else {
        toast.error('Não foi possível entrar na chamada');
      }
      isJoiningRef.current = false;
      return false;
    }
  }, [user, profile, roomId, fetchParticipants, createPeerConnection]);

  // Leave call
  const leaveCall = useCallback(async () => {
    if (!user || !roomId) return;

    const username = profile?.username || 'Alguém';

    // Check how many participants will remain
    const remainingParticipants = participants.filter(p => p.user_id !== user.id);
    const wasLastPerson = remainingParticipants.length === 0;

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

    // Send system message
    if (wasLastPerson && callStartTime) {
      const durationMinutes = Math.round((new Date().getTime() - callStartTime.getTime()) / 60000);
      const durationText = durationMinutes < 1 ? 'menos de 1 minuto' : `${durationMinutes} minuto${durationMinutes !== 1 ? 's' : ''}`;
      await sendSystemMessage(roomId, user.id, `📞 ${username} saiu da chamada. A chamada durou ${durationText}`);
    } else {
      await sendSystemMessage(roomId, user.id, `📞 ${username} saiu da chamada`);
    }

    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsInCall(false);
    setCallDuration(0);
    setCallStartTime(null);
    
    // Update active call info
    await fetchParticipants();
    
    toast.info('Você saiu da chamada');
  }, [user, profile, roomId, participants, callStartTime, fetchParticipants]);

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
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && (payload.new as any).is_active && !(payload.old as any)?.is_active)) {
            const newUserId = (payload.new as any).user_id;
            if (newUserId !== user.id && localStreamRef.current) {
              console.log(`New participant joined: ${newUserId}`);
              // Small delay to ensure both sides are ready
              setTimeout(async () => {
                await createPeerConnection(newUserId, true);
              }, 500);
            }
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
    activeCallInfo,
    joinCall,
    leaveCall,
    toggleMute,
    fetchParticipants,
  };
};

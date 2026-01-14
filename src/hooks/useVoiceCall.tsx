import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Participant {
  id: string;
  user_id: string;
  username: string;
  avatar_url?: string;
  is_muted: boolean;
  is_active: boolean;
  isSpeaking?: boolean;
  isScreenSharing?: boolean;
}

export interface ScreenShareInfo {
  peerId: string;
  username: string;
  videoElement: HTMLVideoElement;
}

interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  isConnected: boolean;
  connectionAttempts: number;
  lastAudioCheck?: number;
}

// More robust ICE servers including free TURN servers for better connectivity
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    // Free TURN servers for better NAT traversal
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

// Audio health check interval (ms)
const AUDIO_HEALTH_CHECK_INTERVAL = 5000;
// Maximum time without audio activity before attempting reconnection (ms)
const AUDIO_STALE_THRESHOLD = 15000;

export const useVoiceCall = (roomId: string | null) => {
  const { user, profile } = useAuth();
  const [isInCall, setIsInCall] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [callDuration, setCallDuration] = useState(0);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [remoteScreenShares, setRemoteScreenShares] = useState<ScreenShareInfo[]>([]);
  
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionsRef = useRef<Map<string, PeerConnection>>(new Map());
  const channelRef = useRef<RealtimeChannel | null>(null);
  const signalChannelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserNodesRef = useRef<Map<string, { analyser: AnalyserNode; dataArray: Uint8Array<ArrayBuffer> }>>(new Map());
  const speakingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isJoiningRef = useRef(false);
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidate[]>>(new Map());
  const processedSignalsRef = useRef<Set<string>>(new Set());
  const connectionRetryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const audioHealthCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioActivityRef = useRef<Map<string, number>>(new Map());
  const streamReadyRef = useRef(false);

  // Fetch current participants
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

    // Dedupe participants by user_id to avoid showing same user multiple times
    const seenUserIds = new Set<string>();
    const formattedParticipants: Participant[] = [];
    
    for (const p of (data || [])) {
      if (!seenUserIds.has(p.user_id)) {
        seenUserIds.add(p.user_id);
        formattedParticipants.push({
          id: p.id,
          user_id: p.user_id,
          username: p.profiles?.username || 'Desconhecido',
          avatar_url: p.profiles?.avatar_url,
          is_muted: p.is_muted,
          is_active: p.is_active,
          isSpeaking: false,
        });
      }
    }

    setParticipants(formattedParticipants);
    return formattedParticipants;
  }, [roomId]);

  // Check for active call on mount and periodically
  useEffect(() => {
    if (roomId) {
      fetchParticipants();
      
      // Poll for participants every 3 seconds when not in call
      const pollInterval = setInterval(() => {
        if (!isInCall) {
          fetchParticipants();
        }
      }, 3000);
      
      return () => clearInterval(pollInterval);
    }
  }, [roomId, fetchParticipants, isInCall]);

  // Setup audio level detection for speaking indicator
  const setupAudioAnalyser = useCallback((peerId: string, stream: MediaStream) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    
    const audioContext = audioContextRef.current;
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    analyserNodesRef.current.set(peerId, { analyser, dataArray });
  }, []);

  // Monitor speaking levels
  useEffect(() => {
    if (!isInCall) return;
    
    speakingIntervalRef.current = setInterval(() => {
      const speakingUpdates: Record<string, boolean> = {};
      
      // Check local audio
      if (localStreamRef.current && !isMuted && user) {
        const localAnalyser = analyserNodesRef.current.get('local');
        if (localAnalyser) {
          localAnalyser.analyser.getByteFrequencyData(localAnalyser.dataArray);
          const average = localAnalyser.dataArray.reduce((a, b) => a + b, 0) / localAnalyser.dataArray.length;
          speakingUpdates[user.id] = average > 20;
        }
      }
      
      // Check remote audio
      analyserNodesRef.current.forEach((analyserData, peerId) => {
        if (peerId === 'local') return;
        analyserData.analyser.getByteFrequencyData(analyserData.dataArray);
        const average = analyserData.dataArray.reduce((a, b) => a + b, 0) / analyserData.dataArray.length;
        speakingUpdates[peerId] = average > 20;
      });
      
      // Update participants with speaking status
      setParticipants(prev => prev.map(p => ({
        ...p,
        isSpeaking: speakingUpdates[p.user_id] || false,
      })));
    }, 100);
    
    return () => {
      if (speakingIntervalRef.current) {
        clearInterval(speakingIntervalRef.current);
      }
    };
  }, [isInCall, isMuted, user]);

  // Retry connection with exponential backoff
  const retryConnection = useCallback((peerId: string, attempt: number = 1) => {
    if (attempt > 3) {
      console.log(`Max retry attempts reached for ${peerId}`);
      return;
    }
    
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
    console.log(`Scheduling retry ${attempt} for ${peerId} in ${delay}ms`);
    
    const timeout = setTimeout(async () => {
      const peerConn = peerConnectionsRef.current.get(peerId);
      if (!peerConn || peerConn.connection.connectionState === 'failed' || 
          peerConn.connection.connectionState === 'disconnected') {
        peerConnectionsRef.current.delete(peerId);
        await createPeerConnection(peerId, true);
      }
    }, delay);
    
    connectionRetryTimeoutsRef.current.set(peerId, timeout);
  }, []);

  // Create peer connection for a user
  const createPeerConnection = useCallback(async (peerId: string, initiator: boolean) => {
    if (!user || !roomId) return null;
    
    // Wait for stream to be ready if we're the initiator
    if (initiator && !streamReadyRef.current) {
      console.log(`Waiting for stream to be ready before connecting to ${peerId}`);
      // Wait up to 2 seconds for stream to be ready
      let waitTime = 0;
      while (!streamReadyRef.current && waitTime < 2000) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitTime += 100;
      }
      if (!streamReadyRef.current) {
        console.error(`Stream not ready after waiting, aborting connection to ${peerId}`);
        return null;
      }
    }
    
    // Check if connection already exists and is healthy
    const existingConn = peerConnectionsRef.current.get(peerId);
    if (existingConn && 
        existingConn.isConnected &&
        existingConn.connection.connectionState === 'connected') {
      console.log(`Reusing existing healthy connection to ${peerId}`);
      return existingConn.connection;
    }

    // Close old connection if exists
    if (existingConn) {
      console.log(`Closing stale connection to ${peerId}`);
      existingConn.connection.close();
      peerConnectionsRef.current.delete(peerId);
    }

    // Clear any pending retry
    const pendingRetry = connectionRetryTimeoutsRef.current.get(peerId);
    if (pendingRetry) {
      clearTimeout(pendingRetry);
      connectionRetryTimeoutsRef.current.delete(peerId);
    }

    console.log(`Creating new peer connection with ${peerId}, initiator: ${initiator}`);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    
    const peerConnData: PeerConnection = { 
      peerId, 
      connection: pc, 
      isConnected: false,
      connectionAttempts: (existingConn?.connectionAttempts || 0) + 1,
      lastAudioCheck: Date.now()
    };
    peerConnectionsRef.current.set(peerId, peerConnData);
    
    // Add local stream tracks - with verification
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      console.log(`Adding ${audioTracks.length} audio tracks to connection with ${peerId}`);
      
      audioTracks.forEach(track => {
        if (track.readyState === 'live') {
          pc.addTrack(track, localStreamRef.current!);
          console.log(`Added audio track to ${peerId}: ${track.label}, enabled: ${track.enabled}`);
        } else {
          console.warn(`Skipping non-live track for ${peerId}: ${track.readyState}`);
        }
      });
    } else {
      console.warn(`No local stream available when connecting to ${peerId}`);
    }

    // Add screen share tracks if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, screenStreamRef.current!);
      });
    }

    // Handle incoming tracks (audio and video)
    pc.ontrack = (event) => {
      console.log(`Received remote track from ${peerId}, kind: ${event.track.kind}`);
      const [remoteStream] = event.streams;
      
      if (event.track.kind === 'audio') {
        // Mark audio activity
        lastAudioActivityRef.current.set(peerId, Date.now());
        
        let audioEl = audioElementsRef.current.get(peerId);
        if (!audioEl) {
          audioEl = new Audio();
          audioEl.autoplay = true;
          audioEl.volume = 1;
          audioElementsRef.current.set(peerId, audioEl);
        }
        
        // Always update srcObject to ensure fresh stream
        audioEl.srcObject = remoteStream;
        
        // Force play with multiple retry attempts
        const playAudio = async (retries = 3) => {
          try {
            await audioEl!.play();
            console.log(`✓ Audio playing for ${peerId}`);
            lastAudioActivityRef.current.set(peerId, Date.now());
          } catch (err) {
            console.log(`Audio play attempt failed for ${peerId}, retries left: ${retries}`);
            if (retries > 0) {
              setTimeout(() => playAudio(retries - 1), 500);
            } else {
              // Final fallback: wait for user interaction
              const resumeAudio = () => {
                audioEl?.play().catch(() => {});
                audioContextRef.current?.resume();
                document.removeEventListener('click', resumeAudio);
              };
              document.addEventListener('click', resumeAudio);
            }
          }
        };
        
        playAudio();
        setupAudioAnalyser(peerId, remoteStream);
        
        // Monitor track state
        event.track.onended = () => {
          console.log(`Audio track ended for ${peerId}`);
          // Attempt to recover connection
          scheduleReconnection(peerId);
        };
        
        event.track.onmute = () => {
          console.log(`Audio track muted for ${peerId}`);
        };
        
        event.track.onunmute = () => {
          console.log(`Audio track unmuted for ${peerId}`);
          lastAudioActivityRef.current.set(peerId, Date.now());
          // Ensure audio is playing after unmute
          audioEl?.play().catch(() => {});
        };
      } else if (event.track.kind === 'video') {
        // Handle incoming screen share
        let videoEl = videoElementsRef.current.get(peerId);
        if (!videoEl) {
          videoEl = document.createElement('video');
          videoEl.autoplay = true;
          videoEl.playsInline = true;
          videoEl.muted = true;
          videoElementsRef.current.set(peerId, videoEl);
        }
        videoEl.srcObject = remoteStream;
        
        // Find participant username for display
        const participant = participants.find(p => p.user_id === peerId);
        const username = participant?.username || 'Desconhecido';
        
        // Add to remote screen shares state
        setRemoteScreenShares(prev => {
          // Remove existing if any
          const filtered = prev.filter(s => s.peerId !== peerId);
          return [...filtered, { peerId, username, videoElement: videoEl! }];
        });
        
        // Handle track ended
        event.track.onended = () => {
          console.log(`Screen share track ended from ${peerId}`);
          setRemoteScreenShares(prev => prev.filter(s => s.peerId !== peerId));
          videoElementsRef.current.delete(peerId);
        };
        
        event.track.onmute = () => {
          console.log(`Screen share track muted from ${peerId}`);
          setRemoteScreenShares(prev => prev.filter(s => s.peerId !== peerId));
        };
        
        event.track.onunmute = () => {
          console.log(`Screen share track unmuted from ${peerId}`);
          const participant = participants.find(p => p.user_id === peerId);
          const username = participant?.username || 'Desconhecido';
          setRemoteScreenShares(prev => {
            const filtered = prev.filter(s => s.peerId !== peerId);
            return [...filtered, { peerId, username, videoElement: videoEl! }];
          });
        };
      }
    };
    
    // Schedule reconnection helper
    const scheduleReconnection = (targetPeerId: string) => {
      const existingTimeout = connectionRetryTimeoutsRef.current.get(targetPeerId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }
      
      const timeout = setTimeout(async () => {
        console.log(`Attempting reconnection with ${targetPeerId}`);
        const peerConn = peerConnectionsRef.current.get(targetPeerId);
        if (peerConn && localStreamRef.current) {
          // Close and recreate connection
          peerConn.connection.close();
          peerConnectionsRef.current.delete(targetPeerId);
          await createPeerConnection(targetPeerId, true);
        }
      }, 2000);
      
      connectionRetryTimeoutsRef.current.set(targetPeerId, timeout);
    };

    // Handle ICE candidates - batch them for better performance
    let iceCandidateBuffer: RTCIceCandidate[] = [];
    let iceSendTimeout: NodeJS.Timeout | null = null;
    
    pc.onicecandidate = async (event) => {
      if (event.candidate) {
        iceCandidateBuffer.push(event.candidate);
        
        // Debounce sending ICE candidates
        if (iceSendTimeout) clearTimeout(iceSendTimeout);
        iceSendTimeout = setTimeout(async () => {
          const candidates = [...iceCandidateBuffer];
          iceCandidateBuffer = [];
          
          for (const candidate of candidates) {
            await supabase.from('voice_call_signals').insert({
              room_id: roomId,
              from_user_id: user.id,
              to_user_id: peerId,
              signal_type: 'ice-candidate',
              signal_data: { candidate: candidate.toJSON() },
            } as any);
          }
        }, 100);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`ICE state for ${peerId}: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        console.log(`ICE failed for ${peerId}, restarting...`);
        pc.restartIce();
      } else if (pc.iceConnectionState === 'disconnected') {
        // Schedule retry
        retryConnection(peerId, peerConnData.connectionAttempts);
      }
    };

    pc.onconnectionstatechange = () => {
      console.log(`Connection state for ${peerId}: ${pc.connectionState}`);
      const peerData = peerConnectionsRef.current.get(peerId);
      if (peerData) {
        if (pc.connectionState === 'connected') {
          peerData.isConnected = true;
          peerData.connectionAttempts = 0;
          console.log(`✓ Connected with ${peerId}`);
        } else if (pc.connectionState === 'failed') {
          peerData.isConnected = false;
          retryConnection(peerId, peerData.connectionAttempts);
        }
      }
    };

    // If initiator, create and send offer
    if (initiator) {
      try {
        const offer = await pc.createOffer({ 
          offerToReceiveAudio: true,
          offerToReceiveVideo: true 
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
  }, [user, roomId, setupAudioAnalyser, retryConnection]);

  // Handle incoming signal
  const handleSignal = useCallback(async (signal: any) => {
    if (!user || !localStreamRef.current) return;
    
    const { from_user_id, signal_type, signal_data } = signal;
    if (from_user_id === user.id) return;

    let peerConn = peerConnectionsRef.current.get(from_user_id);
    let pc = peerConn?.connection;

    if (signal_type === 'offer') {
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
          if (user.id > from_user_id) {
            await Promise.all([
              pc.setLocalDescription({ type: 'rollback' }),
              pc.setRemoteDescription(new RTCSessionDescription(signal_data.offer))
            ]);
          } else {
            return;
          }
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(signal_data.offer));
        }
        
        const pendingCandidates = pendingCandidatesRef.current.get(from_user_id) || [];
        for (const candidate of pendingCandidates) {
          await pc.addIceCandidate(candidate);
        }
        pendingCandidatesRef.current.delete(from_user_id);
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await supabase.from('voice_call_signals').insert({
          room_id: roomId,
          from_user_id: user.id,
          to_user_id: from_user_id,
          signal_type: 'answer',
          signal_data: { answer: pc.localDescription?.toJSON() },
        } as any);
      } catch (err) {
        console.error('Error handling offer:', err);
      }
    } else if (signal_type === 'answer') {
      if (pc && pc.signalingState === 'have-local-offer') {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(signal_data.answer));
          
          const pendingCandidates = pendingCandidatesRef.current.get(from_user_id) || [];
          for (const candidate of pendingCandidates) {
            await pc.addIceCandidate(candidate);
          }
          pendingCandidatesRef.current.delete(from_user_id);
        } catch (err) {
          console.error('Error handling answer:', err);
        }
      }
    } else if (signal_type === 'ice-candidate') {
      if (pc && signal_data.candidate) {
        try {
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(signal_data.candidate));
          } else {
            const pending = pendingCandidatesRef.current.get(from_user_id) || [];
            pending.push(new RTCIceCandidate(signal_data.candidate));
            pendingCandidatesRef.current.set(from_user_id, pending);
          }
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
    streamReadyRef.current = false;

    try {
      // Get microphone access with robust error handling
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      } catch (mediaErr: any) {
        console.error('Failed to get media stream:', mediaErr);
        isJoiningRef.current = false;
        if (mediaErr.name === 'NotAllowedError') {
          toast.error('Permissão do microfone negada');
        } else if (mediaErr.name === 'NotFoundError') {
          toast.error('Microfone não encontrado');
        } else {
          toast.error('Não foi possível acessar o microfone');
        }
        return false;
      }

      localStreamRef.current = stream;
      
      // Verify the stream is active and has audio tracks
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error('No audio tracks in stream');
        toast.error('Nenhuma faixa de áudio disponível');
        isJoiningRef.current = false;
        return false;
      }
      
      // Ensure audio tracks are enabled
      audioTracks.forEach(track => {
        track.enabled = true;
        console.log(`Audio track ready: ${track.label}, enabled: ${track.enabled}, readyState: ${track.readyState}`);
      });
      
      // Mark stream as ready BEFORE any peer connections
      streamReadyRef.current = true;

      // Setup local audio analyser
      setupAudioAnalyser('local', stream);

      // Add participant to database
      const { error } = await supabase.from('voice_call_participants').insert({
        room_id: roomId,
        user_id: user.id,
        is_muted: false,
        is_active: true,
      } as any);

      if (error) {
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

      // Start duration timer
      timerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      // Start audio health monitoring
      startAudioHealthCheck();

      // Wait a bit longer to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Fetch updated participants
      const updatedParticipants = await fetchParticipants();
      
      // Connect to each participant with staggered timing for better reliability
      const otherParticipants = updatedParticipants.filter(p => p.user_id !== user.id);
      console.log(`Connecting to ${otherParticipants.length} other participants`);
      
      for (let i = 0; i < otherParticipants.length; i++) {
        const participant = otherParticipants[i];
        // Stagger connections by 300ms each for better reliability with 3+ participants
        await new Promise(resolve => setTimeout(resolve, i * 300));
        console.log(`Creating connection to ${participant.username} (${participant.user_id})`);
        await createPeerConnection(participant.user_id, true);
      }

      toast.success('Você entrou na chamada');
      isJoiningRef.current = false;
      return true;
    } catch (err: any) {
      console.error('Error joining call:', err);
      streamReadyRef.current = false;
      toast.error('Não foi possível entrar na chamada');
      isJoiningRef.current = false;
      return false;
    }
  }, [user, roomId, fetchParticipants, createPeerConnection, setupAudioAnalyser]);
  
  // Audio health monitoring - check for stale connections
  const startAudioHealthCheck = useCallback(() => {
    if (audioHealthCheckRef.current) {
      clearInterval(audioHealthCheckRef.current);
    }
    
    audioHealthCheckRef.current = setInterval(() => {
      if (!isInCall || !localStreamRef.current) return;
      
      const now = Date.now();
      
      // Check each peer connection
      peerConnectionsRef.current.forEach(async (peerData, peerId) => {
        const { connection } = peerData;
        
        // Check connection state
        if (connection.connectionState === 'failed' || connection.connectionState === 'disconnected') {
          console.log(`Connection to ${peerId} is ${connection.connectionState}, attempting recovery`);
          // Close and recreate
          connection.close();
          peerConnectionsRef.current.delete(peerId);
          await createPeerConnection(peerId, true);
          return;
        }
        
        // Check if audio element exists and is healthy
        const audioEl = audioElementsRef.current.get(peerId);
        if (audioEl) {
          // Try to resume audio if it got paused somehow
          if (audioEl.paused && audioEl.srcObject) {
            console.log(`Audio for ${peerId} is paused, attempting to resume`);
            audioEl.play().catch(() => {});
          }
        }
        
        // Check local stream health
        const audioTracks = localStreamRef.current?.getAudioTracks() || [];
        for (const track of audioTracks) {
          if (track.readyState === 'ended') {
            console.log('Local audio track ended, attempting to recover');
            // Request new microphone stream
            try {
              const newStream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
              });
              localStreamRef.current = newStream;
              streamReadyRef.current = true;
              
              // Replace tracks on all peer connections
              const newAudioTrack = newStream.getAudioTracks()[0];
              peerConnectionsRef.current.forEach(({ connection }) => {
                const senders = connection.getSenders();
                const audioSender = senders.find(s => s.track?.kind === 'audio');
                if (audioSender && newAudioTrack) {
                  audioSender.replaceTrack(newAudioTrack);
                }
              });
              
              console.log('Local audio track recovered');
              toast.info('Microfone reconectado');
            } catch (err) {
              console.error('Failed to recover local audio:', err);
            }
            break;
          }
        }
      });
    }, AUDIO_HEALTH_CHECK_INTERVAL);
  }, [isInCall, createPeerConnection]);

  // Leave call
  const leaveCall = useCallback(async () => {
    if (!user || !roomId) return;

    // Clear stream ready flag
    streamReadyRef.current = false;

    // Stop audio health check
    if (audioHealthCheckRef.current) {
      clearInterval(audioHealthCheckRef.current);
      audioHealthCheckRef.current = null;
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }

    // Stop screen share if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    // Close all peer connections
    peerConnectionsRef.current.forEach(({ connection }) => connection.close());
    peerConnectionsRef.current.clear();

    // Clear retry timeouts
    connectionRetryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    connectionRetryTimeoutsRef.current.clear();

    // Stop audio elements
    audioElementsRef.current.forEach(audio => {
      audio.pause();
      audio.srcObject = null;
    });
    audioElementsRef.current.clear();
    
    // Clear audio activity tracking
    lastAudioActivityRef.current.clear();
    
    // Stop video elements and clear remote screen shares
    videoElementsRef.current.forEach(video => {
      video.pause();
      video.srcObject = null;
    });
    videoElementsRef.current.clear();
    setRemoteScreenShares([]);
    
    analyserNodesRef.current.clear();
    pendingCandidatesRef.current.clear();
    processedSignalsRef.current.clear();

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

    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }

    setIsInCall(false);
    setCallDuration(0);
    await fetchParticipants();
    
    toast.info('Você saiu da chamada');
  }, [user, roomId, fetchParticipants]);

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
    toast.info(newMuted ? 'Microfone desativado' : 'Microfone ativado');
  }, [isMuted, user, roomId]);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    if (!user || !roomId || !isInCall) return false;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' } as any,
        audio: false,
      });
      
      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      // Add screen track to all existing peer connections
      const videoTrack = stream.getVideoTracks()[0];
      
      peerConnectionsRef.current.forEach(async ({ connection, peerId }) => {
        const sender = connection.addTrack(videoTrack, stream);
        
        // Renegotiate connection
        try {
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          
          await supabase.from('voice_call_signals').insert({
            room_id: roomId,
            from_user_id: user.id,
            to_user_id: peerId,
            signal_type: 'offer',
            signal_data: { offer: connection.localDescription?.toJSON() },
          } as any);
        } catch (err) {
          console.error('Error renegotiating for screen share:', err);
        }
      });

      // Handle track ended (user clicked "Stop sharing")
      videoTrack.onended = () => {
        stopScreenShare();
      };

      toast.success('Compartilhamento de tela iniciado');
      return true;
    } catch (err: any) {
      if (err.name !== 'NotAllowedError') {
        console.error('Error starting screen share:', err);
        toast.error('Não foi possível compartilhar a tela');
      }
      return false;
    }
  }, [user, roomId, isInCall]);

  // Stop screen sharing
  const stopScreenShare = useCallback(async () => {
    if (!screenStreamRef.current) return;

    // Stop the screen stream
    screenStreamRef.current.getTracks().forEach(track => track.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);

    // Remove video tracks from all peer connections and renegotiate
    peerConnectionsRef.current.forEach(async ({ connection, peerId }) => {
      const senders = connection.getSenders();
      const videoSender = senders.find(s => s.track?.kind === 'video');
      if (videoSender) {
        connection.removeTrack(videoSender);
        
        // Renegotiate
        try {
          const offer = await connection.createOffer();
          await connection.setLocalDescription(offer);
          
          await supabase.from('voice_call_signals').insert({
            room_id: roomId,
            from_user_id: user!.id,
            to_user_id: peerId,
            signal_type: 'offer',
            signal_data: { offer: connection.localDescription?.toJSON() },
          } as any);
        } catch (err) {
          console.error('Error renegotiating after stopping screen share:', err);
        }
      }
    });

    toast.info('Compartilhamento de tela encerrado');
  }, [roomId, user]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!roomId || !user || !isInCall) return;

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
          
          // New participant joined - create connection if we have a stream ready
          if (payload.eventType === 'INSERT' || 
              (payload.eventType === 'UPDATE' && (payload.new as any).is_active && !(payload.old as any)?.is_active)) {
            const newUserId = (payload.new as any).user_id;
            if (newUserId !== user.id) {
              console.log(`New participant detected: ${newUserId}`);
              
              // Wait for stream to be ready before connecting
              if (!streamReadyRef.current || !localStreamRef.current) {
                console.log(`Waiting for local stream before connecting to ${newUserId}`);
                // Wait up to 3 seconds for stream
                let waited = 0;
                while ((!streamReadyRef.current || !localStreamRef.current) && waited < 3000) {
                  await new Promise(r => setTimeout(r, 200));
                  waited += 200;
                }
              }
              
              if (streamReadyRef.current && localStreamRef.current) {
                // Delay connection to avoid race conditions
                setTimeout(async () => {
                  console.log(`Creating connection to new participant ${newUserId}`);
                  await createPeerConnection(newUserId, true);
                }, 800);
              } else {
                console.warn(`Could not connect to ${newUserId} - stream not ready`);
              }
            }
          }
          
          if (payload.eventType === 'UPDATE' && !(payload.new as any).is_active) {
            const peerId = (payload.new as any).user_id;
            const peerConn = peerConnectionsRef.current.get(peerId);
            if (peerConn) {
              peerConn.connection.close();
              peerConnectionsRef.current.delete(peerId);
            }
            const audioEl = audioElementsRef.current.get(peerId);
            if (audioEl) {
              audioEl.pause();
              audioEl.srcObject = null;
              audioElementsRef.current.delete(peerId);
            }
            analyserNodesRef.current.delete(peerId);
          }
        }
      )
      .subscribe();

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
      if (timerRef.current) clearInterval(timerRef.current);
      if (speakingIntervalRef.current) clearInterval(speakingIntervalRef.current);
      if (audioHealthCheckRef.current) clearInterval(audioHealthCheckRef.current);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      streamReadyRef.current = false;
      peerConnectionsRef.current.forEach(({ connection }) => connection.close());
      audioElementsRef.current.forEach(audio => {
        audio.pause();
        audio.srcObject = null;
      });
      lastAudioActivityRef.current.clear();
      connectionRetryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
    };
  }, []);

  // Check if call is active (any participants)
  const hasActiveCall = participants.length > 0;
  const callStarterName = participants[0]?.username;

  // Get remote video elements for screen sharing
  const getRemoteScreenShare = useCallback((peerId: string) => {
    return videoElementsRef.current.get(peerId);
  }, []);

  return {
    isInCall,
    isMuted,
    isScreenSharing,
    remoteScreenShares,
    participants,
    callDuration,
    hasActiveCall,
    callStarterName,
    joinCall,
    leaveCall,
    toggleMute,
    startScreenShare,
    stopScreenShare,
    getRemoteScreenShare,
    fetchParticipants,
  };
};

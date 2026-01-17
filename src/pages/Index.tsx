import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { useMessages, Message } from '@/hooks/useMessages';
import { useFriendships } from '@/hooks/useFriendships';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useRoomInvites } from '@/hooks/useRoomInvites';
import { useNotifications } from '@/hooks/useNotifications';
import { useMicrophonePermission } from '@/hooks/useMicrophonePermission';
import { useDirectMessages } from '@/hooks/useDirectMessages';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatView } from '@/components/chat/ChatView';
import { Loader2 } from 'lucide-react';
import { toast } from '@/lib/notifications';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { rooms, createRoom, refreshRooms, joinByCode, deleteRoom, updateRoom, regenerateInviteCode, leaveRoom, removeMember, updateMemberRole, getCurrentUserRole } = useRooms();
  const { friends, pendingRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend } = useFriendships();
  const { pendingInvites, sendInvite, acceptInvite, rejectInvite } = useRoomInvites();
  const { directMessages, getOrCreateDM, refreshDMs } = useDirectMessages();
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeDMId, setActiveDMId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  // Determine which room to show messages for
  const activeConversationId = activeDMId || activeRoomId;
  
  const { messages, loading: messagesLoading, sendMessage, editMessage, deleteMessage, addReaction, removeReaction } = useMessages(activeConversationId);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(activeConversationId);
  
  // Initialize notifications (sound and browser notifications for regular messages only)
  useNotifications(activeConversationId, profile?.username);
  
  // Request microphone permission on site load
  const { requestPermission: requestMicPermission, permissionState } = useMicrophonePermission();
  
  useEffect(() => {
    if (permissionState === 'prompt' || permissionState === 'unknown') {
      requestMicPermission();
    }
  }, [permissionState, requestMicPermission]);

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [authLoading, user, navigate]);

  // Set first room as active if none selected
  useEffect(() => {
    if (!activeRoomId && rooms.length > 0) {
      setActiveRoomId(rooms[0].id);
    }
  }, [rooms, activeRoomId]);

  const activeRoom = rooms.find(r => r.id === activeRoomId);
  const activeDM = directMessages.find(dm => dm.id === activeDMId);

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setActiveDMId(null); // Clear DM when selecting a room
    setReplyingTo(null);
  };

  const handleSelectDM = (dmId: string) => {
    setActiveDMId(dmId);
    setActiveRoomId(null); // Clear room when selecting a DM
    setReplyingTo(null);
  };

  const handleStartDM = async (friendId: string): Promise<string | null> => {
    const dmId = await getOrCreateDM(friendId);
    return dmId;
  };

  const handleSendMessage = async (content: string, files?: File[]) => {
    stopTyping();
    await sendMessage(content, replyingTo?.id, files);
    setReplyingTo(null);
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
  };

  const handleReact = async (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    const existingReaction = message?.reactions.find(r => r.emoji === emoji && r.users.includes(user?.id || ''));
    
    if (existingReaction) {
      await removeReaction(messageId, emoji);
    } else {
      await addReaction(messageId, emoji);
    }
  };

  const handleCreateRoom = async (name: string, description?: string) => {
    const room = await createRoom(name, description);
    if (room) {
      setActiveRoomId(room.id);
    }
  };

  const handleJoinByCode = async (code: string) => {
    const roomId = await joinByCode(code);
    if (roomId) {
      setActiveRoomId(roomId);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    await deleteRoom(roomId);
    if (activeRoomId === roomId) {
      setActiveRoomId(rooms.length > 1 ? rooms.find(r => r.id !== roomId)?.id || null : null);
    }
  };

  const handleLeaveRoom = async (roomId: string) => {
    await leaveRoom(roomId);
    if (activeRoomId === roomId) {
      setActiveRoomId(rooms.length > 1 ? rooms.find(r => r.id !== roomId)?.id || null : null);
    }
  };

  const handleRemoveMember = async (roomId: string, userId: string) => {
    await removeMember(roomId, userId);
  };

  const handleUpdateMemberRole = async (roomId: string, userId: string, role: 'admin' | 'member') => {
    await updateMemberRole(roomId, userId, role);
  };

  const handleInviteAccepted = async (roomId: string) => {
    await refreshRooms();
    setActiveRoomId(roomId);
  };

  const handleSendRoomInvite = async (friendId: string) => {
    if (!activeRoomId) return false;
    return await sendInvite(activeRoomId, friendId);
  };

  const handleInviteFriendToRoom = async (friendId: string, roomId: string) => {
    return await sendInvite(roomId, friendId);
  };

  const isAppLoading = authLoading || (user && !profile);

  if (isAppLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (!profile) {
    return (
      <div className="h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-foreground font-medium">Não foi possível carregar seu perfil.</p>
          <p className="text-sm text-muted-foreground">Tente recarregar a página. Se continuar, saia e entre novamente.</p>
          <div className="flex items-center justify-center gap-3">
            <button
              className="px-4 py-2 rounded-md border border-border bg-card"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
            <button
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground"
              onClick={() => signOut()}
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = {
    id: profile.id,
    username: profile.username,
    avatar: profile.avatar_url || undefined,
    status: profile.status as 'online' | 'offline' | 'away' | 'busy',
  };

  // Transform rooms for sidebar (channels only - no DMs)
  const sidebarRooms = rooms.map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || undefined,
    type: r.type as 'public' | 'private',
    avatar: r.avatar_url || undefined,
    inviteCode: r.invite_code || undefined,
    createdBy: r.created_by || undefined,
    members: r.members?.map(m => ({
      id: m.id,
      username: m.username,
      avatar: m.avatar_url || undefined,
      status: m.status as 'online' | 'offline' | 'away' | 'busy',
      role: m.role,
    })) || [],
    lastMessage: r.last_message ? {
      id: 'last',
      content: r.last_message.content,
      senderId: '',
      sender: { id: '', username: r.last_message.sender_username, status: 'online' as const },
      roomId: r.id,
      createdAt: new Date(r.last_message.created_at),
    } : undefined,
    unreadCount: 0,
    createdAt: new Date(r.created_at),
  }));

  // Transform messages for chat
  const chatMessages = messages.map(m => {
    const sender = (m.sender as any) ?? {
      id: m.sender_id,
      username: 'Unknown',
      avatar_url: null,
      status: 'offline',
    };

    return {
      id: m.id,
      content: m.content,
      senderId: m.sender_id,
      sender: {
        id: sender.id,
        username: sender.username || 'Unknown',
        avatar: sender.avatar_url || undefined,
        status: (sender.status || 'offline') as 'online' | 'offline' | 'away' | 'busy',
      },
      roomId: m.room_id,
      createdAt: new Date(m.created_at),
      updatedAt: m.updated_at ? new Date(m.updated_at) : undefined,
      isEdited: m.is_edited,
      reactions: (m.reactions || []) as { emoji: string; users: string[] }[],
      attachments: m.file_url ? [{
        id: m.id,
        type: m.file_type?.startsWith('image/') ? 'image' as const : 
              m.file_type?.startsWith('video/') ? 'video' as const : 
              m.file_type?.startsWith('audio/') ? 'audio' as const : 'document' as const,
        url: m.file_url,
        name: m.file_name || 'arquivo',
        size: 0,
        mimeType: m.file_type || '',
      }] : undefined,
      replyTo: m.reply_to && (m.reply_to as any).id ? {
        id: (m.reply_to as any).id,
        content: (m.reply_to as any).content || '',
        senderId: (m.reply_to as any).sender_id || '',
        sender: (m.reply_to as any).sender && (m.reply_to as any).sender.id ? {
          id: (m.reply_to as any).sender.id,
          username: (m.reply_to as any).sender.username || 'Unknown',
          avatar: (m.reply_to as any).sender.avatar_url || undefined,
          status: ((m.reply_to as any).sender.status || 'offline') as 'online' | 'offline' | 'away' | 'busy',
        } : {
          id: (m.reply_to as any).sender_id || '',
          username: 'Unknown',
          status: 'offline' as const,
        },
        roomId: (m.reply_to as any).room_id || '',
        createdAt: new Date((m.reply_to as any).created_at || Date.now()),
      } : undefined,
    };
  });

  // Transform active room/DM for chat header
  const activeChatRoom = activeDM ? {
    id: activeDM.id,
    name: activeDM.otherUser.username,
    description: undefined,
    type: 'private' as const,
    avatar: activeDM.otherUser.avatar_url || undefined,
    inviteCode: undefined,
    createdBy: undefined,
    members: [{
      id: activeDM.otherUser.id,
      username: activeDM.otherUser.username,
      avatar: activeDM.otherUser.avatar_url || undefined,
      status: activeDM.otherUser.status as 'online' | 'offline' | 'away' | 'busy',
    }, {
      id: user.id,
      username: profile.username,
      avatar: profile.avatar_url || undefined,
      status: profile.status as 'online' | 'offline' | 'away' | 'busy',
    }],
    createdAt: new Date(activeDM.created_at),
    isDM: true,
  } : activeRoom ? {
    id: activeRoom.id,
    name: activeRoom.name,
    description: activeRoom.description || undefined,
    type: activeRoom.type as 'public' | 'private',
    avatar: activeRoom.avatar_url || undefined,
    inviteCode: activeRoom.invite_code || undefined,
    createdBy: activeRoom.created_by || undefined,
    members: activeRoom.members?.map(m => ({
      id: m.id,
      username: m.username,
      avatar: m.avatar_url || undefined,
      status: m.status as 'online' | 'offline' | 'away' | 'busy',
      role: m.role,
    })) || [],
    createdAt: new Date(activeRoom.created_at),
    isDM: false,
  } : null;

  // Get current user's role in the active room
  const currentUserRole = activeRoomId ? getCurrentUserRole(activeRoomId) : 'member';

  // Transform friends for sidebar
  const friendsList = friends.map(f => ({
    id: f.friend.id,
    friendshipId: f.id,
    username: f.friend.username,
    avatar: f.friend.avatar_url || undefined,
    status: f.friend.status as 'online' | 'offline' | 'away' | 'busy',
  }));

  // Typing users for display
  const typingUsernames = typingUsers.map(u => u.username);

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      <Sidebar
        rooms={sidebarRooms}
        directMessages={directMessages}
        currentUser={currentUser}
        activeRoomId={activeConversationId || ''}
        onSelectRoom={handleSelectRoom}
        onSelectDM={handleSelectDM}
        onStartDM={handleStartDM}
        onCreateRoom={handleCreateRoom}
        onSignOut={signOut}
        friends={friendsList}
        pendingRequests={pendingRequests.map(p => ({
          id: p.id,
          friend: {
            id: p.friend.id,
            username: p.friend.username,
            avatar: p.friend.avatar_url || undefined,
            status: p.friend.status as 'online' | 'offline' | 'away' | 'busy',
          }
        }))}
        roomInvites={pendingInvites}
        onSendFriendRequest={sendFriendRequest}
        onAcceptFriendRequest={acceptFriendRequest}
        onRejectFriendRequest={rejectFriendRequest}
        onRemoveFriend={removeFriend}
        onJoinByCode={handleJoinByCode}
        onAcceptRoomInvite={acceptInvite}
        onRejectRoomInvite={rejectInvite}
        onRoomInviteAccepted={handleInviteAccepted}
        onInviteFriendToRoom={handleInviteFriendToRoom}
      />
      
      <ChatView
        room={activeChatRoom}
        messages={chatMessages}
        currentUserId={user.id}
        currentUsername={profile.username}
        currentUserRole={currentUserRole}
        typingUsers={typingUsernames}
        onSendMessage={handleSendMessage}
        onReply={handleReply}
        onReact={handleReact}
        onEditMessage={editMessage}
        onDeleteMessage={deleteMessage}
        onTyping={startTyping}
        replyingTo={replyingTo ? {
          id: replyingTo.id,
          content: replyingTo.content,
          senderId: replyingTo.sender_id,
          sender: replyingTo.sender ? {
            id: replyingTo.sender.id,
            username: replyingTo.sender.username || 'Unknown',
            avatar: replyingTo.sender.avatar_url || undefined,
            status: (replyingTo.sender.status || 'offline') as 'online' | 'offline' | 'away' | 'busy',
          } : {
            id: replyingTo.sender_id,
            username: 'Unknown',
            status: 'offline' as const,
          },
          roomId: replyingTo.room_id,
          createdAt: new Date(replyingTo.created_at),
        } : undefined}
        onCancelReply={() => setReplyingTo(null)}
        isLoading={messagesLoading}
        onDeleteRoom={handleDeleteRoom}
        onLeaveRoom={handleLeaveRoom}
        onUpdateRoom={updateRoom}
        onRegenerateCode={regenerateInviteCode}
        onRemoveMember={handleRemoveMember}
        onUpdateMemberRole={handleUpdateMemberRole}
        friends={friendsList}
        onInviteFriend={handleSendRoomInvite}
      />
    </div>
  );
};

export default Index;

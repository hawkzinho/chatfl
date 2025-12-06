import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRooms } from '@/hooks/useRooms';
import { useMessages, Message } from '@/hooks/useMessages';
import { useFriendships } from '@/hooks/useFriendships';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { Sidebar } from '@/components/chat/Sidebar';
import { ChatView } from '@/components/chat/ChatView';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, signOut } = useAuth();
  const { rooms, createRoom, refreshRooms, joinByCode, deleteRoom, updateRoom, regenerateInviteCode, leaveRoom } = useRooms();
  const { friends, pendingRequests, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend, startDirectMessage } = useFriendships();
  
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  
  const { messages, loading: messagesLoading, sendMessage, editMessage, deleteMessage, addReaction, removeReaction } = useMessages(activeRoomId);
  const { typingUsers, startTyping, stopTyping } = useTypingIndicator(activeRoomId);

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

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    setReplyingTo(null);
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

  const handleStartDM = async (friendId: string) => {
    const roomId = await startDirectMessage(friendId);
    if (roomId) {
      await refreshRooms();
      setActiveRoomId(roomId);
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

  if (authLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  const currentUser = {
    id: profile.id,
    username: profile.username,
    avatar: profile.avatar_url || undefined,
    status: profile.status as 'online' | 'offline' | 'away' | 'busy',
  };

  // Transform rooms for sidebar
  const sidebarRooms = rooms.filter(r => r.type !== 'direct').map(r => ({
    id: r.id,
    name: r.name,
    description: r.description || undefined,
    type: r.type as 'public' | 'private' | 'direct',
    avatar: r.avatar_url || undefined,
    inviteCode: r.invite_code || undefined,
    createdBy: r.created_by || undefined,
    members: r.members?.map(m => ({
      id: m.id,
      username: m.username,
      avatar: m.avatar_url || undefined,
      status: m.status as 'online' | 'offline' | 'away' | 'busy',
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

  // Transform DMs for sidebar
  const directMessages = rooms.filter(r => r.type === 'direct').map(r => {
    const otherMember = r.members?.find(m => m.id !== user.id);
    return {
      id: r.id,
      name: otherMember?.username || 'Unknown',
      type: 'direct' as const,
      avatar: otherMember?.avatar_url || undefined,
      members: r.members?.map(m => ({
        id: m.id,
        username: m.username,
        avatar: m.avatar_url || undefined,
        status: m.status as 'online' | 'offline' | 'away' | 'busy',
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
    };
  });

  // Transform messages for chat
  const chatMessages = messages.map(m => ({
    id: m.id,
    content: m.content,
    senderId: m.sender_id,
    sender: {
      id: m.sender.id,
      username: m.sender.username,
      avatar: m.sender.avatar_url || undefined,
      status: m.sender.status as 'online' | 'offline' | 'away' | 'busy',
    },
    roomId: m.room_id,
    createdAt: new Date(m.created_at),
    updatedAt: m.updated_at ? new Date(m.updated_at) : undefined,
    isEdited: m.is_edited,
    reactions: m.reactions as { emoji: string; users: string[] }[],
    attachments: m.file_url ? [{
      id: m.id,
      type: m.file_type?.startsWith('image/') ? 'image' as const : 
            m.file_type?.startsWith('video/') ? 'video' as const : 'document' as const,
      url: m.file_url,
      name: m.file_name || 'file',
      size: 0,
      mimeType: m.file_type || '',
    }] : undefined,
    replyTo: m.reply_to ? {
      id: m.reply_to.id,
      content: m.reply_to.content,
      senderId: m.reply_to.sender_id,
      sender: {
        id: m.reply_to.sender.id,
        username: m.reply_to.sender.username,
        avatar: m.reply_to.sender.avatar_url || undefined,
        status: m.reply_to.sender.status as 'online' | 'offline' | 'away' | 'busy',
      },
      roomId: m.reply_to.room_id,
      createdAt: new Date(m.reply_to.created_at),
    } : undefined,
  }));

  // Transform active room for chat header
  const activeChatRoom = activeRoom ? {
    id: activeRoom.id,
    name: activeRoom.type === 'direct' 
      ? activeRoom.members?.find(m => m.id !== user.id)?.username || 'Unknown'
      : activeRoom.name,
    description: activeRoom.description || undefined,
    type: activeRoom.type as 'public' | 'private' | 'direct',
    avatar: activeRoom.avatar_url || undefined,
    inviteCode: activeRoom.invite_code || undefined,
    createdBy: activeRoom.created_by || undefined,
    members: activeRoom.members?.map(m => ({
      id: m.id,
      username: m.username,
      avatar: m.avatar_url || undefined,
      status: m.status as 'online' | 'offline' | 'away' | 'busy',
    })) || [],
    createdAt: new Date(activeRoom.created_at),
  } : null;

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
        activeRoomId={activeRoomId || ''}
        onSelectRoom={handleSelectRoom}
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
        onSendFriendRequest={sendFriendRequest}
        onAcceptFriendRequest={acceptFriendRequest}
        onRejectFriendRequest={rejectFriendRequest}
        onRemoveFriend={removeFriend}
        onStartDM={handleStartDM}
        onJoinByCode={handleJoinByCode}
        onDeleteRoom={handleDeleteRoom}
        onLeaveRoom={handleLeaveRoom}
        onUpdateRoom={updateRoom}
        onRegenerateCode={regenerateInviteCode}
      />
      
      <ChatView
        room={activeChatRoom}
        messages={chatMessages}
        currentUserId={user.id}
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
          sender: {
            id: replyingTo.sender.id,
            username: replyingTo.sender.username,
            avatar: replyingTo.sender.avatar_url || undefined,
            status: replyingTo.sender.status as 'online' | 'offline' | 'away' | 'busy',
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
      />
    </div>
  );
};

export default Index;

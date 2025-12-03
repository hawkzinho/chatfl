import { useState, useCallback } from "react";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatView } from "@/components/chat/ChatView";
import { Message } from "@/types/chat";
import { 
  currentUser, 
  mockRooms, 
  mockDirectMessages, 
  mockMessages 
} from "@/data/mockData";
import { toast } from "sonner";

const Index = () => {
  const [activeRoomId, setActiveRoomId] = useState(mockRooms[0].id);
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const activeRoom = [...mockRooms, ...mockDirectMessages].find(
    (room) => room.id === activeRoomId
  );

  const roomMessages = messages.filter((msg) => msg.roomId === activeRoomId);

  const handleSendMessage = useCallback(
    (content: string, attachments?: File[]) => {
      const newMessage: Message = {
        id: `msg-${Date.now()}`,
        content,
        senderId: currentUser.id,
        sender: currentUser,
        roomId: activeRoomId,
        createdAt: new Date(),
        attachments: attachments?.map((file, index) => ({
          id: `att-${Date.now()}-${index}`,
          type: file.type.startsWith('image/') 
            ? 'image' 
            : file.type.startsWith('video/') 
            ? 'video' 
            : 'document',
          url: URL.createObjectURL(file),
          name: file.name,
          size: file.size,
          mimeType: file.type,
        })),
      };

      setMessages((prev) => [...prev, newMessage]);
      
      // Simulate read receipt after a short delay
      setTimeout(() => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === newMessage.id
              ? { ...msg, readBy: ['user-1'] }
              : msg
          )
        );
      }, 2000);
    },
    [activeRoomId]
  );

  const handleTyping = useCallback(() => {
    // In a real app, this would emit a typing event via WebSocket
  }, []);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id !== messageId) return msg;

        const reactions = msg.reactions || [];
        const existingReaction = reactions.find((r) => r.emoji === emoji);

        if (existingReaction) {
          const hasReacted = existingReaction.users.includes(currentUser.id);
          if (hasReacted) {
            // Remove reaction
            const updatedUsers = existingReaction.users.filter(
              (id) => id !== currentUser.id
            );
            if (updatedUsers.length === 0) {
              return {
                ...msg,
                reactions: reactions.filter((r) => r.emoji !== emoji),
              };
            }
            return {
              ...msg,
              reactions: reactions.map((r) =>
                r.emoji === emoji ? { ...r, users: updatedUsers } : r
              ),
            };
          } else {
            // Add to existing reaction
            return {
              ...msg,
              reactions: reactions.map((r) =>
                r.emoji === emoji
                  ? { ...r, users: [...r.users, currentUser.id] }
                  : r
              ),
            };
          }
        } else {
          // New reaction
          return {
            ...msg,
            reactions: [...reactions, { emoji, users: [currentUser.id] }],
          };
        }
      })
    );
  }, []);

  const handleDeleteMessage = useCallback((message: Message) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== message.id));
    toast.success('Message deleted');
  }, []);

  const handleCreateRoom = useCallback(() => {
    toast.info('Create room coming soon!');
  }, []);

  const handleStartDM = useCallback(() => {
    toast.info('Start DM coming soon!');
  }, []);

  const handleLogout = useCallback(() => {
    toast.info('Logout coming soon!');
  }, []);

  if (!activeRoom) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Select a conversation</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <Sidebar
        currentUser={currentUser}
        rooms={mockRooms}
        directMessages={mockDirectMessages}
        activeRoomId={activeRoomId}
        onRoomSelect={setActiveRoomId}
        onCreateRoom={handleCreateRoom}
        onStartDM={handleStartDM}
        onLogout={handleLogout}
      />
      <ChatView
        room={activeRoom}
        messages={roomMessages}
        currentUser={currentUser}
        typingUsers={typingUsers}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        onReact={handleReact}
        onDeleteMessage={handleDeleteMessage}
      />
    </div>
  );
};

export default Index;

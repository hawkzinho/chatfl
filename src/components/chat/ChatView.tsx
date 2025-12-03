import { useState, useCallback } from "react";
import { ChatRoom, Message, User } from "@/types/chat";
import { ChatHeader } from "./ChatHeader";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";

interface ChatViewProps {
  room: ChatRoom;
  messages: Message[];
  currentUser: User;
  typingUsers: string[];
  onSendMessage: (content: string, attachments?: File[]) => void;
  onTyping: () => void;
  onReact: (messageId: string, emoji: string) => void;
  onEditMessage?: (message: Message) => void;
  onDeleteMessage?: (message: Message) => void;
}

export function ChatView({
  room,
  messages,
  currentUser,
  typingUsers,
  onSendMessage,
  onTyping,
  onReact,
  onEditMessage,
  onDeleteMessage,
}: ChatViewProps) {
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const handleReply = useCallback((message: Message) => {
    setReplyTo(message);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleSend = useCallback(
    (content: string, attachments?: File[]) => {
      onSendMessage(content, attachments);
      setReplyTo(null);
    },
    [onSendMessage]
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background">
      <ChatHeader room={room} currentUserId={currentUser.id} />
      
      <MessageList
        messages={messages}
        currentUserId={currentUser.id}
        typingUsers={typingUsers}
        onReply={handleReply}
        onEdit={onEditMessage}
        onDelete={onDeleteMessage}
        onReact={onReact}
      />
      
      <MessageInput
        onSend={handleSend}
        onTyping={onTyping}
        replyTo={replyTo}
        onCancelReply={handleCancelReply}
        placeholder={`Message ${room.type === 'direct' ? '' : '#' + room.name}`}
      />
    </div>
  );
}

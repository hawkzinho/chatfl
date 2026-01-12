import { useEffect, useRef } from "react";
import { Message } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { TypingIndicator } from "./TypingIndicator";
import { SystemMessage } from "./SystemMessage";

const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  typingUsers: string[];
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

const isSameDay = (date1: Date, date2: Date): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
};

const formatDate = (date: Date): string => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (isSameDay(d, today)) {
    return 'Hoje';
  } else if (isSameDay(d, yesterday)) {
    return 'Ontem';
  } else {
    return new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(d);
  }
};

export function MessageList({
  messages,
  currentUserId,
  typingUsers,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const isUserScrollingRef = useRef(false);
  const lastMessageCountRef = useRef(messages.length);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // If new message added and user is near bottom, scroll to bottom
    if (messages.length > lastMessageCountRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      
      if (isNearBottom || !isUserScrollingRef.current) {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    
    lastMessageCountRef.current = messages.length;
  }, [messages.length]);

  // Initial scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      endRef.current?.scrollIntoView({ behavior: 'auto' });
    }
  }, []);

  const handleScroll = () => {
    const container = containerRef.current;
    if (!container) return;
    
    const { scrollTop, scrollHeight, clientHeight } = container;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
    isUserScrollingRef.current = !isNearBottom;
  };

  const shouldShowAvatar = (index: number): boolean => {
    if (index === 0) return true;
    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];
    
    if (currentMessage.senderId !== previousMessage.senderId) return true;
    
    const timeDiff =
      new Date(currentMessage.createdAt).getTime() -
      new Date(previousMessage.createdAt).getTime();
    return timeDiff > 5 * 60 * 1000;
  };

  const shouldShowDateSeparator = (index: number): boolean => {
    if (index === 0) return true;
    const currentMessage = messages[index];
    const previousMessage = messages[index - 1];
    return !isSameDay(currentMessage.createdAt, previousMessage.createdAt);
  };

  return (
    <div 
      ref={containerRef}
      onScroll={handleScroll}
      className="h-full overflow-y-auto"
      style={{ overflowY: 'auto' }}
    >
      {messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-muted-foreground/50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <p className="font-medium">Nenhuma mensagem ainda</p>
          <p className="text-sm">Comece a conversa!</p>
        </div>
      ) : (
        <div className="py-4">
          {messages.map((message, index) => {
            const isSystemMessage = message.senderId === SYSTEM_USER_ID;
            
            return (
              <div key={message.id}>
                {shouldShowDateSeparator(index) && (
                  <div className="flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {formatDate(message.createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}
                {isSystemMessage ? (
                  <SystemMessage 
                    content={message.content} 
                    timestamp={message.createdAt} 
                  />
                ) : (
                  <MessageItem
                    message={message}
                    isOwn={message.senderId === currentUserId}
                    showAvatar={shouldShowAvatar(index)}
                    currentUserId={currentUserId}
                    onReply={onReply}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onReact={onReact}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
      
      <TypingIndicator users={typingUsers} />
      <div ref={endRef} className="h-1" />
    </div>
  );
}
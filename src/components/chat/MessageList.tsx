import { useEffect, useRef, useLayoutEffect } from "react";
import { Message } from "@/types/chat";
import { MessageItem } from "./MessageItem";
import { TypingIndicator } from "./TypingIndicator";

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
    return 'Today';
  } else if (isSameDay(d, yesterday)) {
    return 'Yesterday';
  } else {
    return new Intl.DateTimeFormat('en-US', {
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
  const shouldScrollRef = useRef(true);

  // Scroll to bottom on initial load and new messages
  useLayoutEffect(() => {
    if (shouldScrollRef.current && endRef.current) {
      endRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);

  // Check if user is near bottom before new messages arrive
  const handleScroll = () => {
    if (!containerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    shouldScrollRef.current = isNearBottom;
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
      className="flex-1 overflow-y-auto scrollbar-thin"
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
          <p className="font-medium">No messages yet</p>
          <p className="text-sm">Start the conversation!</p>
        </div>
      ) : (
        <div className="py-4">
          {messages.map((message, index) => (
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
            </div>
          ))}
        </div>
      )}
      
      <TypingIndicator users={typingUsers} />
      <div ref={endRef} />
    </div>
  );
}

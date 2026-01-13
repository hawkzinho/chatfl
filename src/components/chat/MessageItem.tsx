import { useState } from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types/chat";
import { UserAvatar } from "./UserAvatar";
import { MessageReactions } from "./MessageReactions";
import { LinkText } from "./LinkText";
import { MentionText } from "./MentionText";
import { AudioPlayer } from "./AudioPlayer";
import {
  MoreHorizontal, 
  Reply, 
  Smile, 
  Pencil, 
  Trash2,
  FileText,
  Download
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
  showAvatar?: boolean;
  currentUserId: string;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (message: Message) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

const quickEmojis = ['👍', '❤️', '😂', '😮', '🎉', '🔥'];

const formatTime = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

const AttachmentPreview = ({ attachment }: { attachment: any }) => {
  if (attachment.type === 'audio' || attachment.mimeType?.startsWith('audio/')) {
    return (
      <div className="mt-2">
        <AudioPlayer src={attachment.url} />
      </div>
    );
  }

  if (attachment.type === 'image') {
    return (
      <a 
        href={attachment.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="mt-2 rounded-md overflow-hidden max-w-xs block"
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          className="w-full h-auto object-cover"
          loading="lazy"
        />
      </a>
    );
  }

  return (
    <a 
      href={attachment.url} 
      target="_blank" 
      rel="noopener noreferrer"
      download={attachment.name}
      className="mt-2 flex items-center gap-3 p-3 rounded-md bg-muted/50 border border-border max-w-xs hover:bg-muted transition-colors"
    >
      <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
        <FileText className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">Click to download</p>
      </div>
      <Download className="w-4 h-4 text-muted-foreground" />
    </a>
  );
};

export function MessageItem({
  message,
  isOwn,
  showAvatar = true,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onReact,
}: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);

  const handleReact = (emoji: string) => {
    onReact?.(message.id, emoji);
  };

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-1.5 transition-colors',
        'hover:bg-muted/30',
        isOwn && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar ? (
        <div className="shrink-0 pt-0.5">
          <UserAvatar
            src={message.sender.avatar}
            username={message.sender.username}
            status={message.sender.status}
            size="sm"
          />
        </div>
      ) : (
        <div className="w-8" />
      )}

      <div className={cn('flex-1 max-w-xl min-w-0', isOwn && 'flex flex-col items-end')}>
        {showAvatar && (
          <div className={cn('flex items-center gap-2 mb-0.5', isOwn && 'flex-row-reverse')}>
            <span className="font-medium text-sm">
              {message.sender.username}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className="text-xs text-muted-foreground">(edited)</span>
            )}
          </div>
        )}

        <div
          className={cn(
            'rounded-lg px-3 py-2 transition-colors',
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          {message.replyTo && (
            <div className={cn(
              "mb-2 pl-2 border-l-2 text-sm py-0.5",
              isOwn 
                ? "border-primary-foreground/50 opacity-80" 
                : "border-primary/50"
            )}>
              <span className="font-medium text-xs">{message.replyTo.sender.username}</span>
              <p className="truncate text-xs opacity-70">{message.replyTo.content}</p>
            </div>
          )}
          
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">
              <MentionText text={message.content} currentUserId={currentUserId} />
            </p>
          )}

          {message.attachments?.map((attachment) => (
            <AttachmentPreview key={attachment.id} attachment={attachment} />
          ))}
        </div>

        <MessageReactions
          reactions={message.reactions || []}
          currentUserId={currentUserId}
          onReact={handleReact}
        />
      </div>

      {/* Message Actions */}
      <div
        className={cn(
          'flex items-center gap-0.5 transition-opacity',
          showActions ? 'opacity-100' : 'opacity-0',
          isOwn ? 'order-first' : 'order-last'
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onReply?.(message)}
              className="p-1.5 rounded hover:bg-muted transition-colors"
            >
              <Reply className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">Reply</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded hover:bg-muted transition-colors">
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">React</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="center" className="flex gap-1 p-2">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="p-1.5 hover:bg-muted rounded transition-colors text-lg"
              >
                {emoji}
              </button>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {isOwn && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="p-1.5 rounded hover:bg-muted transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">More</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
              <DropdownMenuItem onClick={() => onEdit?.(message)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit Message
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(message)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

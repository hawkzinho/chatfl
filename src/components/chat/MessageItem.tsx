import { useState } from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types/chat";
import { UserAvatar } from "./UserAvatar";
import { MessageReactions } from "./MessageReactions";
import { LinkText } from "./LinkText";
import { AudioPlayer } from "./AudioPlayer";
import { 
  MoreHorizontal, 
  Reply, 
  Smile, 
  Pencil, 
  Trash2,
  FileText,
  Download,
  ExternalLink
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
  // Check if it's an audio file
  if (attachment.type === 'audio' || attachment.mimeType?.startsWith('audio/')) {
    return (
      <div className="mt-3">
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
        className="mt-3 rounded-2xl overflow-hidden max-w-sm block group relative"
      >
        <img
          src={attachment.url}
          alt={attachment.name}
          className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground bg-background/80 backdrop-blur-sm px-2.5 py-1.5 rounded-lg">
            <ExternalLink className="w-3.5 h-3.5" />
            Open
          </span>
        </div>
      </a>
    );
  }

  return (
    <a 
      href={attachment.url} 
      target="_blank" 
      rel="noopener noreferrer"
      download={attachment.name}
      className="mt-3 flex items-center gap-4 p-4 rounded-2xl bg-muted/30 border border-border/50 max-w-sm hover:bg-muted/50 hover:border-primary/30 transition-all group"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center shrink-0">
        <FileText className="w-6 h-6 text-primary-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">{attachment.name}</p>
        <p className="text-xs text-muted-foreground">Click to download</p>
      </div>
      <Download className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
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
        'group flex gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 animate-message-pop',
        'hover:bg-muted/20',
        isOwn && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar ? (
        <div className="shrink-0">
          <UserAvatar
            src={message.sender.avatar}
            username={message.sender.username}
            status={message.sender.status}
            size="md"
          />
        </div>
      ) : (
        <div className="w-10" />
      )}

      <div className={cn('flex-1 max-w-2xl min-w-0', isOwn && 'flex flex-col items-end')}>
        {showAvatar && (
          <div className={cn('flex items-center gap-2 mb-1.5', isOwn && 'flex-row-reverse')}>
            <span className="font-semibold text-sm hover:text-primary transition-colors cursor-pointer">
              {message.sender.username}
            </span>
            <span className="text-xs text-muted-foreground/70">
              {formatTime(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className="text-xs text-muted-foreground/50 italic">(edited)</span>
            )}
          </div>
        )}

        <div
          className={cn(
            'relative rounded-2xl px-4 py-3 transition-all duration-200',
            isOwn
              ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-br-md shadow-lg shadow-primary/20'
              : 'bg-muted/50 rounded-bl-md border border-border/30'
          )}
        >
          {message.replyTo && (
            <div className={cn(
              "mb-3 pl-3 border-l-2 text-sm py-1 rounded-r-lg",
              isOwn 
                ? "border-primary-foreground/40 bg-primary-foreground/10" 
                : "border-primary/50 bg-primary/5"
            )}>
              <span className="font-medium text-xs opacity-80">{message.replyTo.sender.username}</span>
              <p className="truncate opacity-70 text-xs">{message.replyTo.content}</p>
            </div>
          )}
          
          {message.content && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              <LinkText text={message.content} />
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
          'flex items-center gap-1 transition-all duration-200',
          showActions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1 pointer-events-none',
          isOwn ? 'order-first' : 'order-last'
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onReply?.(message)}
              className="p-2 rounded-xl hover:bg-muted/50 hover:text-primary transition-all hover:scale-110"
            >
              <Reply className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">Reply</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-xl hover:bg-muted/50 hover:text-primary transition-all hover:scale-110">
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">React</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="center" className="flex gap-1.5 p-3 glass-strong rounded-2xl border-border/50">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="p-2 hover:bg-muted/50 rounded-xl transition-all text-xl hover:scale-125 hover:-translate-y-1"
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
                  <button className="p-2 rounded-xl hover:bg-muted/50 hover:text-primary transition-all hover:scale-110">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">More</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align={isOwn ? 'start' : 'end'} className="glass-strong rounded-xl border-border/50">
              <DropdownMenuItem onClick={() => onEdit?.(message)} className="rounded-lg">
                <Pencil className="w-4 h-4 mr-2" />
                Edit Message
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(message)}
                className="text-destructive focus:text-destructive focus:bg-destructive/10 rounded-lg"
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

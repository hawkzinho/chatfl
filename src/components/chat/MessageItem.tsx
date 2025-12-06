import { useState } from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types/chat";
import { UserAvatar } from "./UserAvatar";
import { MessageReactions } from "./MessageReactions";
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
  if (attachment.type === 'image') {
    return (
      <a href={attachment.url} target="_blank" rel="noopener noreferrer" className="mt-2 rounded-xl overflow-hidden max-w-xs block">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="w-full h-auto object-cover hover:opacity-90 transition-opacity cursor-pointer"
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
      className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border max-w-xs hover:bg-muted transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
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
        'group flex gap-3 px-4 py-2 hover:bg-muted/30 transition-colors animate-fade-in',
        isOwn && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {showAvatar ? (
        <UserAvatar
          src={message.sender.avatar}
          username={message.sender.username}
          status={message.sender.status}
          size="md"
        />
      ) : (
        <div className="w-10" />
      )}

      <div className={cn('flex-1 max-w-2xl', isOwn && 'flex flex-col items-end')}>
        {showAvatar && (
          <div className={cn('flex items-center gap-2 mb-1', isOwn && 'flex-row-reverse')}>
            <span className="font-semibold text-sm">{message.sender.username}</span>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.createdAt)}
            </span>
            {message.isEdited && (
              <span className="text-xs text-muted-foreground/70">(edited)</span>
            )}
          </div>
        )}

        <div
          className={cn(
            'relative rounded-2xl px-4 py-2.5',
            isOwn
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-muted rounded-bl-md'
          )}
        >
          {message.replyTo && (
            <div className="mb-2 pl-3 border-l-2 border-primary/50 text-sm opacity-70">
              <span className="font-medium">{message.replyTo.sender.username}</span>
              <p className="truncate">{message.replyTo.content}</p>
            </div>
          )}
          
          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
            {message.content}
          </p>

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
          'flex items-center gap-0.5 opacity-0 transition-opacity',
          showActions && 'opacity-100',
          isOwn ? 'order-first' : 'order-last'
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onReply?.(message)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            >
              <Reply className="w-4 h-4 text-muted-foreground" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Reply</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <Smile className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>React</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="center" className="flex gap-1 p-2">
            {quickEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                className="p-1.5 hover:bg-muted rounded-lg transition-colors text-lg hover:scale-110"
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
                  <button className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>More</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align={isOwn ? 'start' : 'end'}>
              <DropdownMenuItem onClick={() => onEdit?.(message)}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(message)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types/chat";
import { 
  Send, 
  Paperclip, 
  Smile, 
  X, 
  Image as ImageIcon,
  FileText,
  Reply
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

interface MessageInputProps {
  onSend: (content: string, attachments?: File[]) => void;
  onTyping?: () => void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const quickEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '👀', '💯', '✨', '🙌'];

export function MessageInput({
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Type a message...',
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [content]);

  const handleSend = () => {
    if (!content.trim() && attachments.length === 0) return;
    onSend(content.trim(), attachments.length > 0 ? attachments : undefined);
    setContent('');
    setAttachments([]);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const insertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    textareaRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    onTyping?.();
  };

  return (
    <div className="p-4 border-t border-border bg-card/50">
      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-3 p-3 rounded-xl bg-muted/50 border border-border animate-slide-in">
          <Reply className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-primary font-medium">
              Replying to {replyTo.sender.username}
            </span>
            <p className="text-sm text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted border border-border animate-bounce-in"
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                  <FileText className="w-6 h-6 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">
                    {file.name.slice(0, 10)}
                  </span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center shadow-lg"
              >
                <X className="w-3 h-3 text-destructive-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <div className="flex-1 flex items-end gap-2 p-3 rounded-2xl bg-muted/30 border border-border focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
          {/* Attachment Button */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    disabled={disabled}
                  >
                    <Paperclip className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Attach file</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Photo or Video
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileText className="w-4 h-4 mr-2" />
                Document
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text Input */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'flex-1 bg-transparent border-none outline-none resize-none',
              'text-sm text-foreground placeholder:text-muted-foreground',
              'scrollbar-thin max-h-[150px]'
            )}
          />

          {/* Emoji Button */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                    disabled={disabled}
                  >
                    <Smile className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Emoji</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="grid grid-cols-5 gap-1 p-2">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors text-xl hover:scale-110"
                >
                  {emoji}
                </button>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Send Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleSend}
              disabled={disabled || (!content.trim() && attachments.length === 0)}
              className={cn(
                'p-3.5 rounded-2xl transition-all',
                content.trim() || attachments.length > 0
                  ? 'bg-primary text-primary-foreground glow hover:opacity-90 scale-100'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80 scale-95 opacity-50'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Send message</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
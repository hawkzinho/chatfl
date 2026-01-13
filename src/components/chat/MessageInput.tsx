import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { Message } from "@/types/chat";
import { VoiceRecorder } from "./VoiceRecorder";
import { MentionDropdown } from "./MentionDropdown";
import { useMentions } from "@/hooks/useMentions";
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

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  status?: string;
}

interface MessageInputProps {
  onSend: (content: string, attachments?: File[]) => void;
  onTyping?: () => void;
  replyTo?: Message | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  placeholder?: string;
  roomMembers?: User[];
}

const quickEmojis = ['😀', '😂', '❤️', '👍', '🎉', '🔥', '👀', '💯', '✨', '🙌'];

export function MessageInput({
  onSend,
  onTyping,
  replyTo,
  onCancelReply,
  disabled = false,
  placeholder = 'Digite uma mensagem...',
  roomMembers = [],
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMentionSelect = (user: User) => {
    const newContent = mentions.selectMention(user, content);
    setContent(newContent);
    textareaRef.current?.focus();
  };

  const mentions = useMentions({
    users: roomMembers,
    onMentionSelect: handleMentionSelect,
  });

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
    mentions.closeMentions();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Let mentions handle navigation keys first
    if (mentions.handleKeyDown(e)) {
      return;
    }
    
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
    const value = e.target.value;
    const cursorPosition = e.target.selectionStart || 0;
    
    setContent(value);
    mentions.handleInputChange(value, cursorPosition);
    onTyping?.();
  };

  const handleVoiceRecording = (blob: Blob) => {
    const mimeType = blob.type || 'audio/webm';
    let extension = 'webm';
    if (mimeType.includes('ogg')) extension = 'ogg';
    else if (mimeType.includes('mp4')) extension = 'mp4';
    else if (mimeType.includes('mpeg') || mimeType.includes('mp3')) extension = 'mp3';
    else if (mimeType.includes('wav')) extension = 'wav';
    
    const file = new File([blob], `audio-${Date.now()}.${extension}`, { type: mimeType });
    onSend('🎤 Mensagem de voz', [file]);
  };

  return (
    <div ref={containerRef} className="p-4 border-t border-border bg-card relative">
      {/* Mention Dropdown */}
      <MentionDropdown
        users={mentions.filteredUsers}
        selectedIndex={mentions.selectedIndex}
        onSelect={handleMentionSelect}
        position={{ top: 60, left: 16 }}
        isVisible={mentions.showMentions}
      />

      {/* Reply Preview */}
      {replyTo && (
        <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-muted/50 border border-border">
          <div className="w-1 h-10 rounded-full bg-primary" />
          <Reply className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-xs text-primary font-medium">
              Respondendo a {replyTo.sender.username}
            </span>
            <p className="text-sm text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="relative flex-shrink-0 w-24 h-24 rounded-lg overflow-hidden bg-muted border border-border"
            >
              {file.type.startsWith('image/') ? (
                <img
                  src={URL.createObjectURL(file)}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
              ) : file.type.startsWith('audio/') ? (
                <div className="w-full h-full flex flex-col items-center justify-center p-2 bg-primary/10">
                  <span className="text-2xl mb-1">🎤</span>
                  <span className="text-xs text-muted-foreground">Áudio</span>
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                  <FileText className="w-8 h-8 text-muted-foreground mb-1" />
                  <span className="text-xs text-muted-foreground truncate w-full text-center">
                    {file.name.slice(0, 12)}
                  </span>
                </div>
              )}
              <button
                onClick={() => removeAttachment(index)}
                className="absolute -top-1 -right-1 w-6 h-6 bg-destructive rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
              >
                <X className="w-3.5 h-3.5 text-destructive-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-3">
        <div className="flex-1 flex items-end gap-2 p-3 rounded-lg bg-muted/50 border border-border focus-within:border-primary/50 transition-colors">
          {/* Attachment Button */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    disabled={disabled}
                  >
                    <Paperclip className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Anexar arquivo</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" className="bg-popover">
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <ImageIcon className="w-4 h-4 mr-2" />
                Foto ou Vídeo
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                <FileText className="w-4 h-4 mr-2" />
                Documento
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Voice Recorder */}
          <VoiceRecorder onRecordingComplete={handleVoiceRecording} disabled={disabled} />

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
              'max-h-[150px]'
            )}
          />

          {/* Emoji Button */}
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    disabled={disabled}
                  >
                    <Smile className="w-5 h-5 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Emoji</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end" className="grid grid-cols-5 gap-1 p-3 bg-popover">
              {quickEmojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => insertEmoji(emoji)}
                  className="p-2 hover:bg-muted rounded-lg transition-all text-xl hover:scale-125"
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
                'p-3 rounded-lg transition-all',
                content.trim() || attachments.length > 0
                  ? 'bg-primary text-primary-foreground hover:opacity-90'
                  : 'bg-muted text-muted-foreground opacity-50'
              )}
            >
              <Send className="w-5 h-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Enviar mensagem</TooltipContent>
        </Tooltip>
      </div>

      {/* Hint for mentions */}
      {roomMembers.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2 opacity-60">
          💡 Digite @ para mencionar alguém
        </p>
      )}
    </div>
  );
}

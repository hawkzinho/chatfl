import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface MentionTextProps {
  text: string;
  currentUserId?: string;
  className?: string;
}

// Parse text to find @mentions
export function parseMentions(text: string): { type: "text" | "mention"; content: string }[] {
  const mentionRegex = /@(\w+)/g;
  const parts: { type: "text" | "mention"; content: string }[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    // Add the mention
    parts.push({ type: "mention", content: match[1] });
    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts;
}

// Extract mentioned usernames from text
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }

  return mentions;
}

export function MentionText({ text, currentUserId, className }: MentionTextProps) {
  const parts = parseMentions(text);

  return (
    <span className={className}>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part.type === "mention" ? (
            <span
              className={cn(
                "px-1 py-0.5 rounded font-medium",
                "bg-primary/20 text-primary"
              )}
            >
              @{part.content}
            </span>
          ) : (
            part.content
          )}
        </Fragment>
      ))}
    </span>
  );
}

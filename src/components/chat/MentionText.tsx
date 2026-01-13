import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface MentionTextProps {
  text: string;
  currentUserId?: string;
  className?: string;
}

// URL regex pattern for link detection
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

// Parse text to find @mentions and links
export function parseTextContent(text: string): { type: "text" | "mention" | "link"; content: string }[] {
  if (!text) return [];
  
  const parts: { type: "text" | "mention" | "link"; content: string }[] = [];
  
  // First split by URLs
  const urlParts = text.split(URL_REGEX);
  
  urlParts.forEach((part) => {
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex
      URL_REGEX.lastIndex = 0;
      parts.push({ type: "link", content: part });
    } else if (part) {
      // Parse mentions within non-URL parts
      const mentionRegex = /@(\w+)/g;
      let lastIndex = 0;
      let match;
      
      while ((match = mentionRegex.exec(part)) !== null) {
        // Add text before the mention
        if (match.index > lastIndex) {
          parts.push({ type: "text", content: part.slice(lastIndex, match.index) });
        }
        // Add the mention
        parts.push({ type: "mention", content: match[1] });
        lastIndex = match.index + match[0].length;
      }
      
      // Add remaining text
      if (lastIndex < part.length) {
        parts.push({ type: "text", content: part.slice(lastIndex) });
      }
    }
  });
  
  return parts;
}

// Legacy function for backward compatibility
export function parseMentions(text: string): { type: "text" | "mention"; content: string }[] {
  if (!text) return [];
  
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
  if (!text) return [];
  
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1].toLowerCase());
  }

  return mentions;
}

export function MentionText({ text, currentUserId, className }: MentionTextProps) {
  // Handle empty or undefined text gracefully - but NEVER return empty for valid strings
  if (text === null || text === undefined) {
    return <span className={className}></span>;
  }
  
  // If text is an empty string, just return empty span
  if (text === '') {
    return <span className={className}></span>;
  }
  
  // Parse the text content for mentions and links
  const parts = parseTextContent(text);
  
  // If parsing returned no parts but we have text, just render the text directly
  if (parts.length === 0 && text) {
    return <span className={className}>{text}</span>;
  }

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
          ) : part.type === "link" ? (
            <a
              href={part.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline break-all"
            >
              {part.content}
            </a>
          ) : (
            part.content
          )}
        </Fragment>
      ))}
    </span>
  );
}

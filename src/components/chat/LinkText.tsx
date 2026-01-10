import React from 'react';
import { ExternalLink } from 'lucide-react';

interface LinkTextProps {
  text: string;
  className?: string;
}

// URL regex pattern to detect links in text
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

export function LinkText({ text, className = '' }: LinkTextProps) {
  const parts = text.split(URL_REGEX);
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (URL_REGEX.test(part)) {
          // Reset regex lastIndex
          URL_REGEX.lastIndex = 0;
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/50 hover:decoration-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {part.length > 50 ? `${part.slice(0, 50)}...` : part}
              <ExternalLink className="w-3 h-3 inline-block" />
            </a>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </span>
  );
}

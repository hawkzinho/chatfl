import { useState, useCallback, useMemo } from 'react';

interface User {
  id: string;
  username: string;
  avatar_url: string | null;
  status?: string;
}

interface UseMentionsOptions {
  users: User[];
  onMentionSelect?: (user: User) => void;
}

export function useMentions({ users, onMentionSelect }: UseMentionsOptions) {
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  const filteredUsers = useMemo(() => {
    if (!mentionQuery) return users.slice(0, 8);
    return users
      .filter((user) =>
        user.username.toLowerCase().includes(mentionQuery.toLowerCase())
      )
      .slice(0, 8);
  }, [users, mentionQuery]);

  const handleInputChange = useCallback(
    (value: string, cursorPosition: number) => {
      // Find if we're in a mention context
      const textBeforeCursor = value.slice(0, cursorPosition);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');
      
      if (lastAtIndex >= 0) {
        // Check if there's a space between @ and cursor
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        const hasSpace = /\s/.test(textAfterAt);
        
        if (!hasSpace) {
          setMentionQuery(textAfterAt);
          setMentionStartIndex(lastAtIndex);
          setShowMentions(true);
          setSelectedIndex(0);
          return;
        }
      }
      
      setShowMentions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showMentions) return false;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredUsers.length - 1 ? prev + 1 : 0
          );
          return true;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredUsers.length - 1
          );
          return true;
        case 'Tab':
        case 'Enter':
          if (filteredUsers[selectedIndex]) {
            e.preventDefault();
            onMentionSelect?.(filteredUsers[selectedIndex]);
            return true;
          }
          return false;
        case 'Escape':
          e.preventDefault();
          setShowMentions(false);
          return true;
        default:
          return false;
      }
    },
    [showMentions, filteredUsers, selectedIndex, onMentionSelect]
  );

  const selectMention = useCallback(
    (user: User, currentValue: string) => {
      if (mentionStartIndex < 0) return currentValue;
      
      const beforeMention = currentValue.slice(0, mentionStartIndex);
      const afterCursor = currentValue.slice(
        mentionStartIndex + mentionQuery.length + 1
      );
      
      const newValue = `${beforeMention}@${user.username} ${afterCursor}`;
      
      setShowMentions(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
      
      return newValue;
    },
    [mentionStartIndex, mentionQuery]
  );

  const closeMentions = useCallback(() => {
    setShowMentions(false);
    setMentionQuery('');
    setSelectedIndex(0);
  }, []);

  return {
    mentionQuery,
    showMentions,
    selectedIndex,
    filteredUsers,
    handleInputChange,
    handleKeyDown,
    selectMention,
    closeMentions,
    mentionStartIndex,
  };
}

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
}

export const useAllUsers = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, status')
      .neq('id', user.id)
      .order('username');

    if (error) {
      console.error('Error fetching users:', error);
      setLoading(false);
      return;
    }

    setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const searchUsers = async (query: string) => {
    if (!user || !query.trim()) {
      await fetchUsers();
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, status')
      .neq('id', user.id)
      .ilike('username', `%${query}%`)
      .order('username');

    if (error) {
      console.error('Error searching users:', error);
      return;
    }

    setUsers(data || []);
  };

  return {
    users,
    loading,
    searchUsers,
    refreshUsers: fetchUsers,
  };
};

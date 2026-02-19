import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { UserRole } from '@/types/database';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const currentUserIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const fetchingRoleRef = useRef(false);

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }, []);

  const refreshUserRole = useCallback(async () => {
    const userId = currentUserIdRef.current;
    if (userId) {
      const role = await fetchUserRole(userId);
      setUserRole(role);
    }
  }, [fetchUserRole]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;

        if (session?.user) {
          currentUserIdRef.current = session.user.id;
          setUser(session.user);
          setSession(session);
          const role = await fetchUserRole(session.user.id);
          if (mounted) setUserRole(role);
        }
      } catch {
        // ignore
      } finally {
        if (mounted && !initializedRef.current) {
          initializedRef.current = true;
          setLoading(false);
        }
      }
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!initializedRef.current) return;

      const newUserId = session?.user?.id ?? null;

      if (event === 'TOKEN_REFRESHED' && newUserId === currentUserIdRef.current) {
        setSession(session);
        return;
      }

      const userChanged = newUserId !== currentUserIdRef.current;
      currentUserIdRef.current = newUserId;
      setSession(session);
      setUser(session?.user ?? null);

      if (!session?.user) {
        setUserRole(null);
        return;
      }

      if (userChanged && !fetchingRoleRef.current) {
        fetchingRoleRef.current = true;
        fetchUserRole(session.user.id).then((role) => {
          if (mounted) setUserRole(role);
          fetchingRoleRef.current = false;
        });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      currentUserIdRef.current = null;
      setUser(null);
      setSession(null);
      setUserRole(null);
    }
  };

  const value = {
    user,
    session,
    userRole,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUserRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

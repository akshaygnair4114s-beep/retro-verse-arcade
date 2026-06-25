import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { type User, type Session } from "@supabase/supabase-js";
import { supabase, type Profile, type PlayerStats } from "@/lib/supabase";

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  stats: PlayerStats | null;
  loading: boolean;
  error: string | null;
};

type AuthContextType = AuthState & {
  signUp: (email: string, password: string, username: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    stats: null,
    loading: true,
    error: null,
  });

  const fetchProfileAndStats = useCallback(async (userId: string) => {
    const [profileRes, statsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("player_stats").select("*").eq("user_id", userId).maybeSingle(),
    ]);

    return {
      profile: profileRes.data as Profile | null,
      stats: statsRes.data as PlayerStats | null,
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          const { profile, stats } = await fetchProfileAndStats(session.user.id);
          setState({
            user: session.user,
            session,
            profile,
            stats,
            loading: false,
            error: null,
          });
        } else {
          setState({
            user: null,
            session: null,
            profile: null,
            stats: null,
            loading: false,
            error: null,
          });
        }
      } catch {
        if (mounted) {
          setState((prev) => ({ ...prev, loading: false, error: "Failed to initialize auth" }));
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const { profile, stats } = await fetchProfileAndStats(session.user.id);
        setState({
          user: session.user,
          session,
          profile,
          stats,
          loading: false,
          error: null,
        });
      } else if (event === "SIGNED_OUT") {
        setState({
          user: null,
          session: null,
          profile: null,
          stats: null,
          loading: false,
          error: null,
        });
      } else if (event === "TOKEN_REFRESHED" && session) {
        setState((prev) => ({ ...prev, session, user: session.user }));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileAndStats]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      username: string,
    ): Promise<{ error: string | null }> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (error) {
        setState((prev) => ({ ...prev, loading: false }));
        return { error: error.message };
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").insert({
          id: data.user.id,
          username,
        });

        if (profileError) {
          if (profileError.code === "23505") {
            setState((prev) => ({ ...prev, loading: false }));
            return { error: "Username already taken" };
          }
          setState((prev) => ({ ...prev, loading: false }));
          return { error: "Failed to create profile" };
        }

        const { profile, stats } = await fetchProfileAndStats(data.user.id);
        setState({
          user: data.user,
          session: data.session,
          profile,
          stats,
          loading: false,
          error: null,
        });
      }

      return { error: null };
    },
    [fetchProfileAndStats],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setState((prev) => ({ ...prev, loading: false }));
        return { error: error.message };
      }

      if (data.user) {
        const { profile, stats } = await fetchProfileAndStats(data.user.id);
        setState({
          user: data.user,
          session: data.session,
          profile,
          stats,
          loading: false,
          error: null,
        });
      }

      return { error: null };
    },
    [fetchProfileAndStats],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      user: null,
      session: null,
      profile: null,
      stats: null,
      loading: false,
      error: null,
    });
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error: string | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error?.message ?? null };
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<{ error: string | null }> => {
      if (!state.user) return { error: "Not authenticated" };

      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", state.user.id);

      if (error) {
        if (error.code === "23505") {
          return { error: "Username already taken" };
        }
        return { error: error.message };
      }

      const { profile } = await fetchProfileAndStats(state.user.id);
      setState((prev) => ({ ...prev, profile }));

      return { error: null };
    },
    [state.user, fetchProfileAndStats],
  );

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const { profile, stats } = await fetchProfileAndStats(state.user.id);
    setState((prev) => ({ ...prev, profile, stats }));
  }, [state.user, fetchProfileAndStats]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

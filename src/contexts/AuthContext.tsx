import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react';
import { getSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  configurationError: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState<string | null>(null);
  const configurationError = isSupabaseConfigured()
    ? authError
    : 'Configura las variables de Supabase en el archivo .env.';

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabaseClient();
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });
    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });
    if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();

    supabase.auth.getSession()
      .then(({ data, error }) => {
        if (error) throw error;
        setSession(data.session);
      })
      .catch((error: unknown) => {
        setAuthError(error instanceof Error ? error.message : 'No se pudo validar la sesión.');
      })
      .finally(() => setLoading(false));

    return () => {
      authListener.subscription.unsubscribe();
      appStateListener.remove();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
    setSession(data.session);
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
    if (error) throw error;
    setSession(data.session);
    return Boolean(data.session);
  };

  const signOut = async () => {
    const { error } = await getSupabaseClient().auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ session, loading, configurationError, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider.');
  return context;
}

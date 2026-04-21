import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext(null);

const ADMIN_SECRET = process.env.REACT_APP_ADMIN_SECRET;

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      try {
        const saved = sessionStorage.getItem('mgg_session');
        if (!saved) { setLoading(false); return; }

        const parsed = JSON.parse(saved);

        // Admin session — just restore, no DB check needed
        if (parsed.role === 'admin') {
          setSession(parsed);
          setLoading(false);
          return;
        }

        // User session — re-validate against DB to catch deleted users
        if (parsed.userId) {
          const { data, error } = await supabase
            .from('users')
            .select('id, code')
            .eq('id', parsed.userId)
            .single();

          if (error || !data) {
            // User no longer exists — clear session
            sessionStorage.removeItem('mgg_session');
            setLoading(false);
            return;
          }
          setSession(parsed);
        }
      } catch {
        sessionStorage.removeItem('mgg_session');
      }
      setLoading(false);
    };

    restore();
  }, []);

  const loginAsAdmin = (secret) => {
    if (secret !== ADMIN_SECRET) return false;
    const s = { role: 'admin', userId: null, code: null };
    setSession(s);
    sessionStorage.setItem('mgg_session', JSON.stringify(s));
    return true;
  };

  const loginAsUser = async (code) => {
    const upper = code.toUpperCase().trim();
    const { data, error } = await supabase
      .from('users')
      .select('id, code')
      .eq('code', upper)
      .single();

    if (error || !data) return { success: false, message: 'Invalid code. Try again.' };

    const s = { role: 'user', userId: data.id, code: data.code };
    setSession(s);
    sessionStorage.setItem('mgg_session', JSON.stringify(s));
    return { success: true };
  };

  const logout = () => {
    setSession(null);
    sessionStorage.removeItem('mgg_session');
  };

  return (
    <AuthContext.Provider value={{ session, loading, loginAsAdmin, loginAsUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

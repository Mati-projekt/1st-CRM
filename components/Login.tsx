
import React, { useState, useEffect } from 'react';
import { Sun, Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface LoginProps {
  onLogin: () => void; 
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [identifier, setIdentifier] = useState(''); // Email or Name
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Safety timeout to reset loading state if something hangs indefinitely
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isLoading) {
      timeout = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          // Don't show error if it might have actually succeeded in background, 
          // just unlock the button so user can try again if needed.
        }
      }, 10000); // 10s safety valve
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      let emailToLogin = identifier.trim();

      // Logic: If input doesn't look like an email, try to find the email by name in 'profiles'
      if (!emailToLogin.includes('@')) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('name', emailToLogin) // Case insensitive check
          .maybeSingle();

        if (profileError || !profile) {
          throw new Error("Nie znaleziono użytkownika o takiej nazwie.");
        }
        emailToLogin = profile.email;
      }

      // Proceed with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailToLogin,
        password,
      });

      if (signInError) throw signInError;
      
      // CRITICAL CHANGE: 
      // Add a small fallback delay. If App.tsx catches the session, this component unmounts.
      // If for some reason (mobile race condition) it doesn't, force a reload to ensure fresh state.
      setTimeout(() => {
         window.location.reload();
      }, 1000);
      
    } catch (err: any) {
      console.error("Auth error:", err);
      setIsLoading(false); // Only stop loading on error
      
      if (err.message && err.message.includes("Email not confirmed")) {
        setError("Adres email nie został potwierdzony. Sprawdź skrzynkę pocztową.");
      } else if (err.message && err.message.includes("Invalid login credentials")) {
        setError("Błędne dane logowania.");
      } else {
        setError(err.message || "Błąd logowania");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md z-10 animate-fade-in">
        <div className="text-center mb-6 md:mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg mb-4">
            <Sun className="w-7 h-7 md:w-8 md:h-8 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Family CRM</h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base">
            Panel logowania pracowników
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4 md:space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2 ml-1">Email lub Nazwa Użytkownika</label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
                <input 
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
                  placeholder="nazwa@firma.pl lub Jan Kowalski"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2 ml-1">Hasło</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white pl-12 pr-4 py-3 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-3 rounded-lg flex items-center text-sm animate-shake">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                 Zaloguj się <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/10 text-center">
          <p className="text-xs text-slate-500">
             Nie masz konta? Skontaktuj się z administratorem.
          </p>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Sun, Lock, User, ArrowRight, AlertCircle, CheckSquare, Square } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { MOCK_USERS } from '../constants';
import { User as AppUser } from '../types';

interface LoginProps {
  onLogin: (user?: AppUser) => Promise<void> | void; 
  onLoginStart: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onLoginStart }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Timeout safety
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isLoading) {
      timeout = setTimeout(() => {
        if (isLoading) {
          setIsLoading(false);
          setError("Przekroczono limit czasu. Jeśli baza śpi (free tier), spróbuj ponownie za 10 sekund.");
        }
      }, 30000); // 30s timeout
    }
    return () => clearTimeout(timeout);
  }, [isLoading]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    onLoginStart();

    const emailToLogin = identifier.trim();

    try {
      let finalEmail = emailToLogin;

      // Logic: If input doesn't look like an email, try to find the email by name in 'profiles'
      if (!emailToLogin.includes('@')) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .ilike('name', emailToLogin)
          .maybeSingle();

        if (profileError || !profile) {
          throw new Error("Nie znaleziono użytkownika o takiej nazwie.");
        }
        finalEmail = profile.email;
      }

      // Proceed with Supabase Auth
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: finalEmail,
        password,
      });

      if (signInError) throw signInError;
      
      // CRITICAL FIX: Explicitly tell the parent component we succeeded
      await onLogin();
      
    } catch (err: any) {
      console.error("Auth error:", err);
      setIsLoading(false);
      
      if (err.message && err.message.includes("Email not confirmed")) {
        setError("Adres email nie został potwierdzony. Sprawdź skrzynkę pocztową.");
      } else if (err.message && err.message.includes("Invalid login credentials")) {
        setError("Błędne dane logowania.");
      } else if (err.message && err.message.includes("fetch")) {
        setError("Problem z połączeniem. Sprawdź internet lub spróbuj ponownie.");
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
            
            <div 
               className="flex items-center cursor-pointer group" 
               onClick={() => setRememberMe(!rememberMe)}
            >
               <div className={`mr-2 transition-colors ${rememberMe ? 'text-amber-400' : 'text-slate-500'}`}>
                  {rememberMe ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
               </div>
               <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Zapamiętaj mnie</span>
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
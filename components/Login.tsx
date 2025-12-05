
import React, { useState } from 'react';
import { Sun, Lock, Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { User, UserRole } from '../types';
import { MOCK_USERS } from '../constants';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('admin@solarcrm.pl');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // Simulate API delay
    setTimeout(() => {
      // Simple mock authentication logic
      const user = MOCK_USERS.find(u => u.email === email);
      
      // Hardcoded passwords for demo purposes
      // In a real app, this would be a backend validation
      const isValidPass = 
        (email === 'admin@solarcrm.pl' && password === 'admin123') ||
        (email === 'handlowiec@solarcrm.pl' && password === 'sales123') ||
        (email === 'biuro@solarcrm.pl' && password === 'office123') ||
        (email === 'ekipa1@solarcrm.pl' && password === 'team123');

      if (user && isValidPass) {
        onLogin(user);
      } else {
        setError("Nieprawidłowy email lub hasło.");
        setIsLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-amber-500/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-3xl shadow-2xl w-full max-w-md z-10 animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg mb-4">
            <Sun className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">SolarCRM</h1>
          <p className="text-slate-400 mt-2">Zaloguj się do systemu zarządzania</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2 ml-1">Adres Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-amber-400 transition-colors" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-600 text-white pl-12 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
                  placeholder="nazwa@firma.pl"
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
                  className="w-full bg-slate-800/50 border border-slate-600 text-white pl-12 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all placeholder:text-slate-500"
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
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-500/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
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
          <p className="text-xs text-slate-500 mb-2">Dostępne konta demo (Hasło: odpowiednio do roli + 123, np. admin123)</p>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="px-2 py-1 bg-slate-800/50 rounded text-[10px] text-slate-400 border border-slate-700">admin@solarcrm.pl</span>
            <span className="px-2 py-1 bg-slate-800/50 rounded text-[10px] text-slate-400 border border-slate-700">handlowiec@solarcrm.pl</span>
          </div>
        </div>
      </div>
    </div>
  );
};

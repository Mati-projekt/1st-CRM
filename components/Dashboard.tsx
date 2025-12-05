
import React, { useMemo } from 'react';
import { Installation, InstallationStatus, InventoryItem, Customer, ViewState } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Zap, Users, Wallet, ArrowRight, Sun, Calendar } from 'lucide-react';

interface DashboardProps {
  installations: Installation[];
  inventory: InventoryItem[];
  customers: Customer[];
  onChangeView: (view: ViewState) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ installations, inventory, customers, onChangeView }) => {
  const stats = useMemo(() => {
    const totalKW = installations.reduce((acc, curr) => acc + curr.systemSizeKw, 0);
    const pending = installations.filter(i => i.status !== InstallationStatus.COMPLETED && i.status !== InstallationStatus.NEW).length;
    const completed = installations.filter(i => i.status === InstallationStatus.COMPLETED).length;
    const lowStock = inventory.filter(i => i.quantity <= i.minQuantity).length;
    const estimatedRevenue = totalKW * 4500; 
    
    const statusCounts = installations.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalKW, pending, completed, lowStock, estimatedRevenue, statusCounts };
  }, [installations, inventory]);

  const getStatusColor = (status: InstallationStatus) => {
    switch (status) {
      case InstallationStatus.NEW: return 'bg-slate-300';
      case InstallationStatus.AUDIT: return 'bg-blue-400';
      case InstallationStatus.PROJECT: return 'bg-indigo-400';
      case InstallationStatus.INSTALLATION: return 'bg-amber-400';
      case InstallationStatus.GRID_CONNECTION: return 'bg-purple-400';
      case InstallationStatus.GRANT_APPLICATION: return 'bg-pink-400';
      case InstallationStatus.COMPLETED: return 'bg-green-500';
      default: return 'bg-slate-200';
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in p-4 md:p-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="mb-6 md:mb-0">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">Dzień dobry! ☀️</h2>
            <p className="text-slate-300 text-sm md:text-base">Oto podsumowanie działań w Twojej firmie.</p>
          </div>
          <div className="flex items-center bg-white/10 px-4 py-2 md:px-6 md:py-3 rounded-xl backdrop-blur-sm border border-white/10 w-full md:w-auto">
            <Sun className="text-yellow-400 w-6 h-6 md:w-8 md:h-8 mr-4" />
            <div>
              <p className="text-[10px] md:text-xs text-slate-300 uppercase tracking-wider font-bold">Prognoza pogody</p>
              <p className="text-base md:text-lg font-bold">Słonecznie, 24°C</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Zap className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12% m/m</span>
          </div>
          <div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Zainstalowana Moc</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{stats.totalKW.toFixed(1)} <span className="text-sm md:text-lg text-slate-400 font-normal">kWp</span></p>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Aktywne</span>
          </div>
          <div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Montaże w toku</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <Wallet className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Estymacja</span>
          </div>
          <div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Wartość Projektów</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{(stats.estimatedRevenue / 1000).toFixed(0)}k <span className="text-sm md:text-lg text-slate-400 font-normal">PLN</span></p>
          </div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Nowi</span>
          </div>
          <div>
            <p className="text-xs md:text-sm text-slate-500 font-medium">Liczba Klientów</p>
            <p className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{customers.length}</p>
          </div>
        </div>
      </div>

      {/* Main Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6 md:space-y-8">
          
          {/* Pipeline Visualization */}
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base md:text-lg font-bold text-slate-800">Status Realizacji</h3>
              <button 
                onClick={() => onChangeView('INSTALLATIONS')}
                className="text-xs md:text-sm text-blue-600 font-medium hover:underline"
              >
                Zobacz szczegóły
              </button>
            </div>
            
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex mb-4">
              {Object.values(InstallationStatus).map(status => {
                const count = stats.statusCounts[status] || 0;
                if (count === 0) return null;
                const widthPct = (count / installations.length) * 100;
                return (
                  <div 
                    key={status} 
                    className={`h-full ${getStatusColor(status)}`} 
                    style={{ width: `${widthPct}%` }}
                    title={`${status}: ${count}`}
                  ></div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 md:gap-3">
              {Object.values(InstallationStatus).map(status => {
                const count = stats.statusCounts[status] || 0;
                return (
                  <div key={status} className="flex items-center space-x-1.5 md:space-x-2 text-[10px] md:text-xs">
                    <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${getStatusColor(status)}`}></div>
                    <span className="text-slate-600">{status} ({count})</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Installations */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-5 md:p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="text-base md:text-lg font-bold text-slate-800">Nadchodzące Montaże</h3>
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <div className="divide-y divide-slate-50">
              {installations
                .filter(i => i.status === InstallationStatus.INSTALLATION || i.status === InstallationStatus.PROJECT)
                .slice(0, 5)
                .map(inst => (
                <div 
                  key={inst.id} 
                  className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group cursor-pointer"
                  onClick={() => onChangeView('INSTALLATIONS')}
                >
                  <div className="flex items-center space-x-3 md:space-x-4">
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs md:text-sm shrink-0">
                      {inst.systemSizeKw.toFixed(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 text-sm md:text-base truncate">{inst.address}</p>
                      <p className="text-[10px] md:text-xs text-slate-500 truncate">
                        Zespół: {inst.assignedTeam || 'Nieprzypisany'} • Termin: {inst.dateScheduled || 'Do ustalenia'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 ml-2">
                    <span className={`px-2 py-0.5 md:px-3 md:py-1 text-[10px] md:text-xs font-semibold rounded-full border ${
                      inst.status === InstallationStatus.INSTALLATION 
                        ? 'bg-amber-50 text-amber-700 border-amber-100' 
                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                    }`}>
                      {inst.status}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-300 ml-2 md:ml-3 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block" />
                  </div>
                </div>
              ))}
              {installations.filter(i => i.status === InstallationStatus.INSTALLATION || i.status === InstallationStatus.PROJECT).length === 0 && (
                <div className="p-6 md:p-8 text-center text-slate-400 text-sm">Brak zaplanowanych montaży na najbliższy czas.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6 md:space-y-8">
           {/* Alerts */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="p-4 md:p-6 bg-red-50/50 border-b border-red-50">
               <div className="flex items-center space-x-2">
                 <AlertTriangle className="w-5 h-5 text-red-500" />
                 <h3 className="text-base md:text-lg font-bold text-red-700">Wymaga Uwagi</h3>
               </div>
             </div>
             <div className="p-2">
               {stats.lowStock > 0 ? (
                 inventory.filter(i => i.quantity <= i.minQuantity).slice(0, 4).map(item => (
                   <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-red-50/30 transition-colors">
                     <div className="flex items-center space-x-3">
                       <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"></div>
                       <div className="min-w-0">
                         <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
                         <p className="text-xs text-slate-400">Stan: {item.quantity} {item.unit}</p>
                       </div>
                     </div>
                     <button 
                       onClick={() => onChangeView('INVENTORY')}
                       className="text-xs text-red-600 font-medium bg-white border border-red-100 px-2 py-1 rounded hover:bg-red-50 shrink-0"
                     >
                       Domów
                     </button>
                   </div>
                 ))
               ) : (
                 <div className="p-6 text-center text-slate-500 text-sm flex flex-col items-center">
                   <CheckCircle className="w-8 h-8 text-green-400 mb-2" />
                   Wszystko pod kontrolą.
                 </div>
               )}
               {stats.lowStock > 4 && (
                 <div className="p-3 text-center text-xs text-red-500 font-medium border-t border-slate-50">
                   + {stats.lowStock - 4} więcej alertów
                 </div>
               )}
             </div>
           </div>

           {/* Quick Actions (Mock) */}
           <div className="bg-slate-900 rounded-2xl shadow-lg p-5 md:p-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h3 className="font-bold text-base md:text-lg mb-4">Szybkie Akcje</h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => onChangeView('CUSTOMERS')}
                    className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-lg text-left text-sm font-medium transition-colors flex items-center"
                  >
                    <div className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center mr-3 font-bold">+</div>
                    Dodaj nowego klienta
                  </button>
                  <button 
                    onClick={() => onChangeView('INSTALLATIONS')}
                    className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-lg text-left text-sm font-medium transition-colors flex items-center"
                  >
                    <div className="w-6 h-6 bg-amber-500 rounded flex items-center justify-center mr-3 font-bold">+</div>
                    Zaplanuj montaż
                  </button>
                  <button 
                    onClick={() => onChangeView('CUSTOMERS')}
                    className="w-full bg-slate-800 hover:bg-slate-700 p-3 rounded-lg text-left text-sm font-medium transition-colors flex items-center"
                  >
                    <div className="w-6 h-6 bg-purple-500 rounded flex items-center justify-center mr-3 font-bold">@</div>
                    Wyślij ofertę (AI)
                  </button>
                </div>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

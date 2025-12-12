import React, { useState, useMemo } from 'react';
import { Installation, Customer, User, UserRole, InstallationStatus } from '../types';
import { ChevronLeft, ChevronRight, Filter, Calendar as CalendarIcon, MapPin, Zap, User as UserIcon, Hammer, Battery, RotateCcw, Flame } from 'lucide-react';

interface InstallationCalendarProps {
  installations: Installation[];
  customers: Customer[];
  users: User[];
  onNavigateToCustomer: (customerId: string) => void;
  currentUser: User;
}

const getInstallationType = (inst: Installation): 'PV' | 'PVME' | 'ME' | 'HEAT' => {
   const hasPV = inst.systemSizeKw > 0;
   const hasStorage = inst.storageSizeKw && inst.storageSizeKw > 0;
   
   if (hasPV && hasStorage) return 'PVME';
   if (hasPV) return 'PV';
   if (hasStorage) return 'ME';
   return 'HEAT';
};

export const InstallationCalendar: React.FC<InstallationCalendarProps> = ({
  installations,
  customers,
  users,
  onNavigateToCustomer,
  currentUser
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Default filtering for Installer: Only show their own installations
  const isInstaller = currentUser.role === UserRole.INSTALLER;
  const [selectedTeamId, setSelectedTeamId] = useState<string>(isInstaller ? currentUser.id : 'ALL');

  const installerTeams = users.filter(u => u.role === UserRole.INSTALLER);

  const holidays = ['01-01', '01-06', '05-01', '05-03', '08-15', '11-01', '11-11', '12-25', '12-26'];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const filteredInstallations = useMemo(() => {
    return installations.filter(inst => {
      // Status Check: Only scheduled jobs
      if (!inst.dateScheduled) return false;
      if (inst.status === InstallationStatus.NEW) return false;

      // Team Check
      if (selectedTeamId !== 'ALL') {
        if (inst.assignedTeam !== selectedTeamId) return false;
      }

      return true;
    });
  }, [installations, selectedTeamId]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const renderCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    let startDay = getFirstDayOfMonth(year, month);
    startDay = startDay === 0 ? 6 : startDay - 1; // Adjust for Monday start (0=Sun -> 6, 1=Mon -> 0)

    const days = [];

    // Empty slots for previous month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-slate-50/30 border border-slate-100 min-h-[120px]"></div>);
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month, d);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayInstalls = filteredInstallations.filter(i => i.dateScheduled === dateStr);
      
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const mmdd = `${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isHoliday = holidays.includes(mmdd);
      const isToday = new Date().toDateString() === dateObj.toDateString();

      let bgClass = 'bg-white';
      let textClass = 'text-slate-700';

      if (isHoliday) {
        bgClass = 'bg-red-50/80';
        textClass = 'text-red-600';
      } else if (isWeekend) {
        bgClass = 'bg-slate-50';
        textClass = 'text-slate-400';
      } else if (isToday) {
        bgClass = 'bg-blue-50/30';
      }

      days.push(
        <div 
          key={d} 
          className={`min-h-[120px] h-auto border border-slate-200 p-2 relative flex flex-col transition-colors group ${bgClass} ${isToday ? 'ring-2 ring-inset ring-blue-400' : ''}`}
        >
          <div className="flex justify-between items-start mb-2 shrink-0">
            <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : textClass}`}>
              {d}
            </span>
            {isHoliday && <span className="text-[10px] font-extrabold uppercase tracking-tighter text-red-500 bg-red-100 px-1.5 py-0.5 rounded">Święto</span>}
          </div>

          <div className="flex-1 space-y-1.5">
            {dayInstalls.map(inst => {
              const customer = customers.find(c => c.id === inst.customerId);
              const team = users.find(u => u.id === inst.assignedTeam);
              const type = getInstallationType(inst);
              let statusColor = 'bg-white border-blue-200 text-slate-700 hover:border-blue-400 hover:shadow-md';
              
              // Apply Type Colors (Override basic status)
              if (inst.status === InstallationStatus.COMPLETED) {
                 statusColor = 'bg-green-100 border-green-200 text-green-800 opacity-70';
              } else {
                 if (type === 'HEAT') statusColor = 'bg-red-50 border-red-200 text-red-900';
                 else if (type === 'PVME') statusColor = 'bg-indigo-50 border-indigo-200 text-indigo-900';
                 else if (type === 'ME') statusColor = 'bg-emerald-50 border-emerald-200 text-emerald-900';
                 else statusColor = 'bg-amber-50 border-amber-200 text-amber-900'; // PV
              }

              return (
                <div 
                  key={inst.id}
                  onClick={() => onNavigateToCustomer(inst.customerId)}
                  className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${statusColor}`}
                >
                  <div className="flex justify-between items-start mb-1">
                     <span className="font-bold truncate max-w-[100px]">{customer?.name || 'Klient'}</span>
                     <div className="flex flex-col items-end gap-0.5">
                        {type === 'HEAT' ? (
                           <span className="font-bold text-[10px] flex items-center">
                              <Flame className="w-2.5 h-2.5 mr-0.5" /> HEAT
                           </span>
                        ) : (
                           <span className="font-bold text-[10px] flex items-center bg-white/50 px-1 rounded border border-black/5">
                              <Zap className="w-2.5 h-2.5 mr-0.5 text-amber-500" />
                              {inst.systemSizeKw}
                           </span>
                        )}
                        {inst.storageSizeKw && inst.storageSizeKw > 0 && (
                           <span className="font-bold text-[10px] flex items-center bg-green-50 px-1 rounded border border-green-200 text-green-700">
                              <Battery className="w-2.5 h-2.5 mr-0.5" />
                              {inst.storageSizeKw}
                           </span>
                        )}
                     </div>
                  </div>
                  <div className="flex items-center text-[10px] opacity-80 mb-1">
                     <MapPin className="w-3 h-3 mr-1 shrink-0" />
                     <span className="truncate">{inst.address?.split(',')[0]}</span>
                  </div>
                  {!isInstaller && selectedTeamId === 'ALL' && team && (
                     <div className="flex items-center text-[9px] font-bold opacity-70 mt-1 pt-1 border-t border-black/5">
                        <Hammer className="w-2.5 h-2.5 mr-1" />
                        {team.name}
                     </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-8 animate-fade-in overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-4 rounded-2xl shadow-sm border border-slate-200 shrink-0">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
               <CalendarIcon className="w-6 h-6" />
            </div>
            <div>
               <h1 className="text-2xl font-bold text-slate-800">Kalendarz Montaży</h1>
               <p className="text-slate-500 text-sm">Planowanie i harmonogram prac ekip.</p>
            </div>
         </div>

         <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/* Team Filter */}
            <div className="relative">
               <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Filter className="w-4 h-4 text-slate-400" />
               </div>
               <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  disabled={isInstaller}
                  className={`w-full sm:w-64 pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all ${isInstaller ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:border-blue-300'}`}
               >
                  <option value="ALL">Wszystkie Ekipy</option>
                  {installerTeams.map(team => (
                     <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
               </select>
            </div>

            {/* Month Navigation */}
            <div className="flex items-center bg-slate-50 rounded-xl border border-slate-200 p-1">
               <button onClick={handlePrevMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
                  <ChevronLeft className="w-5 h-5" />
               </button>
               <span className="px-4 font-bold text-slate-800 min-w-[140px] text-center capitalize cursor-default">
                  {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
               </span>
               <button onClick={handleNextMonth} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-slate-600">
                  <ChevronRight className="w-5 h-5" />
               </button>
               <div className="w-px h-6 bg-slate-200 mx-1"></div>
               <button onClick={handleToday} className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all text-blue-600 font-bold text-xs" title="Wróć do dzisiaj">
                  <RotateCcw className="w-4 h-4" />
               </button>
            </div>
         </div>
      </div>

      {/* Calendar Grid Container - Scrollable */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-y-auto flex flex-col min-h-0 relative">
         {/* Weekday Headers - Sticky */}
         <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 sticky top-0 z-20 shadow-sm">
            {['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'].map((day, i) => (
               <div key={day} className={`p-3 text-center text-xs font-extrabold uppercase tracking-wide ${i >= 5 ? 'text-red-400' : 'text-slate-500'}`}>
                  <span className="hidden md:inline">{day}</span>
                  <span className="md:hidden">{day.slice(0, 3)}</span>
               </div>
            ))}
         </div>
         
         {/* Days Grid - Allow expanding */}
         <div className="grid grid-cols-7 auto-rows-fr">
            {renderCalendarDays()}
         </div>
      </div>
    </div>
  );
};

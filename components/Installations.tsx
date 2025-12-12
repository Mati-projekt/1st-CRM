import React, { useState } from 'react';
import { Installation, InstallationStatus, Customer, UserRole, User } from '../types';
import { Calendar, MapPin, ChevronRight, Banknote, Briefcase, Lock, Users, Clock, Hammer, Phone, Navigation, Box, Zap, CheckCircle, ArrowRight, Home, Shovel, CheckSquare, Square, List, CalendarDays, ChevronLeft, Map, ZoomIn, ZoomOut, AlertCircle, Battery, RotateCcw, Flame } from 'lucide-react';

interface InstallationsProps {
  installations: Installation[];
  customers: Customer[];
  users: User[];
  onNavigateToCustomer: (customerId: string) => void;
  onUpdateInstallation: (installation: Installation) => void;
  currentUserRole: UserRole;
}

// Reuse the helper logic from Dashboard but duplicated for independence in this context (or could be shared util)
const getInstallationType = (inst: Installation): 'PV' | 'PVME' | 'ME' | 'HEAT' => {
   const hasPV = inst.systemSizeKw > 0;
   const hasStorage = inst.storageSizeKw && inst.storageSizeKw > 0;
   
   if (hasPV && hasStorage) return 'PVME';
   if (hasPV) return 'PV';
   if (hasStorage) return 'ME';
   return 'HEAT';
};

const getTypeConfig = (type: 'PV' | 'PVME' | 'ME' | 'HEAT') => {
   switch (type) {
      case 'PVME': return { border: 'border-l-4 border-l-indigo-500', badge: 'bg-indigo-100 text-indigo-700', icon: Zap };
      case 'ME': return { border: 'border-l-4 border-l-emerald-500', badge: 'bg-emerald-100 text-emerald-700', icon: Battery };
      case 'HEAT': return { border: 'border-l-4 border-l-red-500', badge: 'bg-red-100 text-red-700', icon: Flame };
      default: return { border: 'border-l-4 border-l-amber-500', badge: 'bg-amber-100 text-amber-700', icon: Zap }; // PV
   }
};

export const Installations: React.FC<InstallationsProps> = ({ 
  installations, 
  customers, 
  users,
  onNavigateToCustomer,
  onUpdateInstallation,
  currentUserRole
}) => {
  const isInstaller = currentUserRole === UserRole.INSTALLER;

  // Zoom state for Kanban view with localStorage persistence
  const [zoomLevel, setZoomLevel] = useState(() => {
    const saved = localStorage.getItem('installations_zoom_level');
    return saved ? Number(saved) : 100;
  });

  const handleZoomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVal = Number(e.target.value);
    setZoomLevel(newVal);
    localStorage.setItem('installations_zoom_level', newVal.toString());
  };

  // Enhanced lookup with fallback debugging
  const getCustomerName = (id: string) => {
     const c = customers.find(c => c.id === id);
     return c ? c.name : `Błąd danych (ID: ${id?.slice(0,4)}...)`;
  };
  
  const getCustomerPhone = (id: string) => {
     const c = customers.find(c => c.id === id);
     return c ? c.phone : '';
  };

  const getOwnerName = (customerId: string) => {
     const customer = customers.find(c => c.id === customerId);
     if (!customer) return '-';
     if (!customer.repId) return 'Nieprzypisany';
     const owner = users.find(u => u.id === customer.repId);
     return owner ? owner.name : 'Nieznany ID';
  };

  // Helper to resolve address from Installation OR Customer fallback
  const getInstallationAddress = (inst: Installation) => {
     if (inst.address && inst.address.trim().length > 3) return inst.address;
     const c = customers.find(cust => cust.id === inst.customerId);
     return c ? c.address : '';
  };

  const canEditStatus = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE || currentUserRole === UserRole.SALES_MANAGER || isInstaller;
  const canEditDate = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;
  const canAssignTeam = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE || currentUserRole === UserRole.SALES_MANAGER;

  const installerTeams = users.filter(u => u.role === UserRole.INSTALLER);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>, inst: Installation) => {
    e.stopPropagation(); 
    const newStatus = e.target.value as InstallationStatus;
    if (newStatus !== inst.status) {
      onUpdateInstallation({ ...inst, status: newStatus });
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>, inst: Installation) => {
    e.stopPropagation();
    onUpdateInstallation({ ...inst, dateScheduled: e.target.value });
  };

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>, inst: Installation) => {
    e.stopPropagation();
    onUpdateInstallation({ ...inst, assignedTeam: e.target.value });
  };

  const openGoogleMaps = (inst: Installation) => {
     const address = getInstallationAddress(inst);
     if (!address) {
        alert("Brak adresu do nawigacji.");
        return;
     }
     const query = encodeURIComponent(address);
     // Use distinct maps URL that works better on mobile
     window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  // --- INSTALLER VIEW ---
  if (isInstaller) {
    const [viewMode, setViewMode] = useState<'LIST' | 'CALENDAR'>('LIST');
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Filter out irrelevant statuses for installers
    const activeJobs = installations.filter(i => 
       i.status === InstallationStatus.PROJECT || 
       i.status === InstallationStatus.INSTALLATION ||
       i.status === InstallationStatus.GRID_CONNECTION
    ).sort((a, b) => new Date(a.dateScheduled || '2100-01-01').getTime() - new Date(b.dateScheduled || '2100-01-01').getTime());

    const completedJobs = installations.filter(i => i.status === InstallationStatus.COMPLETED);
    const [showHistory, setShowHistory] = useState(false);

    const toggleEquipment = (inst: Installation, field: 'panelsPicked' | 'inverterPicked' | 'storagePicked' | 'mountingPicked') => {
       const currentStatus = inst.equipmentStatus || { panelsPicked: false, inverterPicked: false, storagePicked: false, mountingPicked: false };
       const newStatus = { ...currentStatus, [field]: !currentStatus[field] };
       onUpdateInstallation({ ...inst, equipmentStatus: newStatus });
    };

    const renderJobCard = (inst: Installation, isHistory = false) => {
       const isToday = inst.dateScheduled === new Date().toISOString().split('T')[0];
       const checklist = inst.equipmentStatus || { panelsPicked: false, inverterPicked: false, storagePicked: false, mountingPicked: false };
       const displayAddress = getInstallationAddress(inst);
       const type = getInstallationType(inst);
       const styleConfig = getTypeConfig(type);

       return (
          <div key={inst.id} className={`bg-white rounded-2xl p-5 shadow-sm border ${isToday ? 'border-blue-500 ring-1 ring-blue-100' : 'border-slate-200'} mb-4 relative overflow-hidden`}>
             <div className={`absolute left-0 top-0 bottom-0 w-1 ${styleConfig.border.replace('border-l-4', '').replace('border-l-', 'bg-')}`}></div>
             
             {/* Header: Date & Status */}
             <div className="flex justify-between items-start mb-4 pl-3">
                <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${isToday ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                   <Calendar className="w-4 h-4" />
                   <span className="font-bold text-sm">
                      {inst.dateScheduled || 'Do ustalenia'}
                   </span>
                   {isToday && <span className="ml-1 text-[10px] bg-blue-500 px-1.5 rounded uppercase font-bold tracking-wider">Dziś</span>}
                </div>
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={inst.status}
                      onChange={(e) => handleStatusChange(e, inst)}
                      className={`text-xs font-bold py-1.5 px-3 rounded-full border appearance-none pr-8 cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 ${
                         inst.status === InstallationStatus.COMPLETED ? 'bg-green-100 text-green-700 border-green-200 focus:ring-green-500' :
                         inst.status === InstallationStatus.INSTALLATION ? 'bg-amber-100 text-amber-700 border-amber-200 focus:ring-amber-500' :
                         inst.status === InstallationStatus.PROJECT ? 'bg-slate-100 text-slate-600 border-slate-200 focus:ring-slate-400' :
                         'bg-slate-100 text-slate-600 border-slate-200 focus:ring-slate-400'
                      }`}
                    >
                      <option value={InstallationStatus.PROJECT}>Do przygotowania</option>
                      <option value={InstallationStatus.INSTALLATION}>W trakcie montażu</option>
                      <option value={InstallationStatus.GRID_CONNECTION}>Po montażu (OSD)</option>
                      <option value={InstallationStatus.COMPLETED}>Zakończone</option>
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                       <ChevronRight className="w-3 h-3 opacity-50" />
                    </div>
                </div>
             </div>

             {/* Address & Navigation */}
             <div className="mb-6 pl-3">
                <div className="flex items-start justify-between">
                   <div>
                      <div className="flex items-center mb-1">
                         <span className={`text-[10px] font-bold px-2 py-0.5 rounded mr-2 ${styleConfig.badge}`}>{type}</span>
                         <h3 className="text-lg font-bold text-slate-800 leading-tight">{displayAddress}</h3>
                      </div>
                      <p className="text-sm text-slate-500 font-medium">{getCustomerName(inst.customerId)}</p>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); openGoogleMaps(inst); }}
                     className="bg-blue-50 text-blue-600 p-3 rounded-xl hover:bg-blue-100 transition-colors shadow-sm ml-4 shrink-0"
                   >
                      <Navigation className="w-6 h-6" />
                   </button>
                </div>
                {/* Phone Call */}
                <div className="mt-3 flex">
                   <a 
                     href={`tel:${getCustomerPhone(inst.customerId)}`}
                     className="flex items-center text-sm font-bold text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                     onClick={(e) => e.stopPropagation()}
                   >
                      <Phone className="w-4 h-4 mr-2 text-green-500" />
                      {getCustomerPhone(inst.customerId)}
                   </a>
                </div>
             </div>

             {/* Interactive Equipment Checklist */}
             <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 ml-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                   <div className="flex items-center"><Box className="w-4 h-4 mr-1" /> Lista Sprzętu</div>
                   <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600">Kliknij aby odhaczyć</span>
                </div>
                
                <div className="grid grid-cols-1 gap-3">
                   {/* Panels - Only if PV */}
                   {(type === 'PV' || type === 'PVME') && (
                   <div 
                      onClick={() => toggleEquipment(inst, 'panelsPicked')}
                      className={`flex items-center p-3 rounded-lg border shadow-sm cursor-pointer transition-all ${checklist.panelsPicked ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                   >
                      <div className={`p-2 rounded-lg mr-3 transition-colors ${checklist.panelsPicked ? 'bg-green-100 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
                         {checklist.panelsPicked ? <CheckCircle className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                         <p className={`text-[10px] font-bold uppercase ${checklist.panelsPicked ? 'text-green-600' : 'text-slate-400'}`}>Panele PV</p>
                         <p className={`text-sm font-bold ${checklist.panelsPicked ? 'text-green-800 line-through decoration-2 opacity-70' : 'text-slate-800'}`}>
                            {inst.panelModel || 'Brak modelu'}
                         </p>
                      </div>
                      <div className="text-right pl-2 border-l border-slate-100">
                         <p className="text-lg font-bold text-slate-800">{inst.systemSizeKw ? Math.ceil(inst.systemSizeKw / 0.45) : '-'}</p>
                         <p className="text-[9px] text-slate-400">szt.</p>
                      </div>
                   </div>
                   )}

                   {/* Inverter - Only if PV/PVME */}
                   {(type === 'PV' || type === 'PVME') && (
                   <div 
                      onClick={() => toggleEquipment(inst, 'inverterPicked')}
                      className={`flex items-center p-3 rounded-lg border shadow-sm cursor-pointer transition-all ${checklist.inverterPicked ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                   >
                      <div className={`p-2 rounded-lg mr-3 transition-colors ${checklist.inverterPicked ? 'bg-green-100 text-green-600' : 'bg-blue-50 text-blue-600'}`}>
                         {checklist.inverterPicked ? <CheckCircle className="w-5 h-5" /> : <Box className="w-5 h-5" />}
                      </div>
                      <div className="flex-1">
                         <p className={`text-[10px] font-bold uppercase ${checklist.inverterPicked ? 'text-green-600' : 'text-slate-400'}`}>Falownik</p>
                         <p className={`text-sm font-bold ${checklist.inverterPicked ? 'text-green-800 line-through decoration-2 opacity-70' : 'text-slate-800'}`}>
                            {inst.inverterModel || 'Brak modelu'}
                         </p>
                      </div>
                      <div className="text-right pl-2 border-l border-slate-100">
                         <p className="text-lg font-bold text-slate-800">1</p>
                         <p className="text-[9px] text-slate-400">szt.</p>
                      </div>
                   </div>
                   )}
                  
                   {/* Storage - Only show if exists */}
                   {(type === 'PVME' || type === 'ME') && (
                      <div 
                        onClick={() => toggleEquipment(inst, 'storagePicked')}
                        className={`flex items-center p-3 rounded-lg border shadow-sm cursor-pointer transition-all ${checklist.storagePicked ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 hover:border-blue-300'}`}
                      >
                        <div className={`p-2 rounded-lg mr-3 transition-colors ${checklist.storagePicked ? 'bg-green-100 text-green-600' : 'bg-purple-50 text-purple-600'}`}>
                           {checklist.storagePicked ? <CheckCircle className="w-5 h-5" /> : <Box className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                           <p className={`text-[10px] font-bold uppercase ${checklist.storagePicked ? 'text-green-600' : 'text-slate-400'}`}>Magazyn Energii</p>
                           <p className={`text-sm font-bold ${checklist.storagePicked ? 'text-green-800 line-through decoration-2 opacity-70' : 'text-slate-800'}`}>
                              {inst.storageModel || 'Brak modelu'}
                           </p>
                        </div>
                        <div className="text-right pl-2 border-l border-slate-100">
                           <p className="text-lg font-bold text-slate-800">{inst.storageSizeKw}</p>
                           <p className="text-[9px] text-slate-400">kWh</p>
                        </div>
                      </div>
                   )}

                   {/* Heat Pump - Only show if Heat */}
                   {type === 'HEAT' && (
                      <div 
                        className={`flex items-center p-3 rounded-lg border shadow-sm transition-all bg-white border-slate-200`}
                      >
                        <div className={`p-2 rounded-lg mr-3 bg-red-50 text-red-600`}>
                           <Flame className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                           <p className={`text-[10px] font-bold uppercase text-slate-400`}>Urządzenie Grzewcze</p>
                           <p className={`text-sm font-bold text-slate-800`}>
                              {inst.notes?.split('Urządzenie:')[1] || 'Szczegóły w notatce'}
                           </p>
                        </div>
                      </div>
                   )}

                   {/* Mounting / Extra */}
                   <div 
                     onClick={() => toggleEquipment(inst, 'mountingPicked')}
                     className={`flex justify-between items-center text-xs px-3 py-2 rounded border cursor-pointer transition-all ${checklist.mountingPicked ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'}`}
                   >
                      <div className="flex items-center">
                         {checklist.mountingPicked ? <CheckSquare className="w-4 h-4 mr-2" /> : <Square className="w-4 h-4 mr-2" />}
                         <div className="flex items-center">
                            {inst.trenchLength ? <Shovel className="w-4 h-4 mr-2" /> : <Home className="w-4 h-4 mr-2" />}
                            <span className={`font-medium ${checklist.mountingPicked ? 'line-through opacity-70' : ''}`}>
                               {inst.mountingSystem || (inst.trenchLength ? `System Gruntowy (${inst.trenchLength}mb)` : 'System Montażowy')}
                            </span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer Actions */}
             <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end pl-3">
                <button 
                  onClick={() => onNavigateToCustomer(inst.customerId)}
                  className="w-full flex items-center justify-center bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 transition-colors shadow-lg"
                >
                   Otwórz pełne szczegóły <ArrowRight className="w-4 h-4 ml-2" />
                </button>
             </div>
          </div>
       );
    };

    const renderCalendar = () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const startDay = new Date(year, month, 1).getDay() || 7; // 1-7 (Mon-Sun)
      
      const days = [];
      const offset = startDay - 1;

      // Polish Holidays (approximate fixed dates)
      const holidays = ['01-01', '01-06', '05-01', '05-03', '08-15', '11-01', '11-11', '12-25', '12-26'];

      // Empty slots
      for (let i = 0; i < offset; i++) {
         days.push(<div key={`empty-${i}`} className="bg-slate-50/50 border border-slate-100 flex flex-col"></div>);
      }

      for (let d = 1; d <= daysInMonth; d++) {
         const dateObj = new Date(year, month, d);
         const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
         const dayJobs = installations.filter(i => i.dateScheduled === dateStr && i.assignedTeam === users.find(u => u.role === UserRole.INSTALLER && u.id === i.assignedTeam)?.id);
         const isToday = new Date().toDateString() === dateObj.toDateString();
         
         const dayOfWeek = dateObj.getDay();
         const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
         const mmdd = `${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
         const isHoliday = holidays.includes(mmdd);

         let bgClass = 'bg-white';
         let textClass = 'text-slate-500';

         if (isHoliday) {
            bgClass = 'bg-red-100'; // Darker for visibility
            textClass = 'text-red-500';
         } else if (isWeekend) {
            bgClass = 'bg-slate-100';
            textClass = 'text-slate-400';
         } else if (isToday) {
            bgClass = 'bg-blue-50';
            textClass = 'text-blue-600';
         }

         days.push(
            <div 
               key={d} 
               className={`border border-slate-200 p-1 relative flex flex-col overflow-hidden ${bgClass}`}
               style={{ minHeight: '80px', height: 'auto' }}
            >
               <div className={`text-xs font-bold mb-1 flex justify-between px-1 shrink-0 ${textClass}`}>
                  <span>{d}</span>
                  {isHoliday && <span className="text-[9px] uppercase tracking-tighter">Święto</span>}
               </div>
               
               <div className="flex-1 space-y-1">
                 {dayJobs.map(job => {
                   const city = (getInstallationAddress(job) || '').split(',')[0].trim();
                   const type = getInstallationType(job);
                   let jobColor = 'border-blue-200';
                   if (type === 'HEAT') jobColor = 'border-red-200 bg-red-50';
                   else if (type === 'PVME') jobColor = 'border-indigo-200 bg-indigo-50';
                   else if (type === 'ME') jobColor = 'border-emerald-200 bg-emerald-50';

                   return (
                     <div 
                        key={job.id} 
                        onClick={() => onNavigateToCustomer(job.customerId)} 
                        className={`p-1.5 rounded-lg border shadow-sm cursor-pointer hover:border-blue-400 transition-all group ${jobColor}`}
                     >
                        <div className="flex items-center text-[10px] font-bold text-slate-700 truncate">
                           <MapPin className="w-3 h-3 mr-1 text-blue-500 shrink-0" />
                           {city || 'Adres'}
                        </div>
                        <div className="flex flex-col items-start mt-0.5 ml-4">
                           {type === 'HEAT' ? (
                              <div className="flex items-center text-[9px] font-medium text-red-600">
                                 <Flame className="w-2.5 h-2.5 mr-1" /> Ogrzewanie
                              </div>
                           ) : (
                              <>
                                 <div className="flex items-center text-[9px] font-medium text-slate-500">
                                    <Zap className="w-2.5 h-2.5 mr-1 text-amber-500" />
                                    {job.systemSizeKw} kWp
                                 </div>
                                 {job.storageSizeKw && job.storageSizeKw > 0 && (
                                    <div className="flex items-center text-[9px] font-medium text-green-600">
                                       <Battery className="w-2.5 h-2.5 mr-1" />
                                       {job.storageSizeKw} kWh
                                    </div>
                                 )}
                              </>
                           )}
                        </div>
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
       <div className="max-w-2xl mx-auto p-4 min-h-screen bg-slate-50 flex flex-col h-full">
          <div className="flex flex-col gap-4 mb-6">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-bold text-slate-800">Twoje Montaże</h2>
               <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                 <button 
                   onClick={() => setViewMode('LIST')}
                   className={`p-2 rounded-md ${viewMode === 'LIST' ? 'bg-slate-100 text-blue-600' : 'text-slate-400'}`}
                 >
                   <List className="w-5 h-5" />
                 </button>
                 <button 
                   onClick={() => setViewMode('CALENDAR')}
                   className={`p-2 rounded-md ${viewMode === 'CALENDAR' ? 'bg-slate-100 text-blue-600' : 'text-slate-400'}`}
                 >
                   <CalendarDays className="w-5 h-5" />
                 </button>
               </div>
             </div>

             {viewMode === 'LIST' && (
                <button 
                  onClick={() => setShowHistory(!showHistory)}
                  className="self-end text-sm font-bold text-slate-500 bg-white border border-slate-200 px-4 py-2 rounded-lg shadow-sm"
                >
                   {showHistory ? 'Pokaż Aktywne' : 'Historia'}
                </button>
             )}
          </div>

          {viewMode === 'LIST' ? (
             !showHistory ? (
                <div className="space-y-4 animate-fade-in pb-20">
                   {activeJobs.length > 0 ? (
                      activeJobs.map(job => renderJobCard(job))
                   ) : (
                      <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
                         <CheckCircle className="w-16 h-16 text-green-100 mx-auto mb-4" />
                         <p className="text-lg font-bold text-slate-700">Wszystko zrobione!</p>
                         <p className="text-slate-400">Brak zaplanowanych montaży na najbliższy czas.</p>
                      </div>
                   )}
                </div>
             ) : (
                <div className="space-y-4 animate-fade-in pb-20">
                   <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Ostatnio zakończone</h3>
                   {completedJobs.length > 0 ? (
                      completedJobs.map(job => renderJobCard(job, true))
                   ) : (
                      <p className="text-center text-slate-400 py-8">Brak historii zleceń.</p>
                   )}
                </div>
             )
          ) : (
             <div className="animate-fade-in bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
                   <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronLeft className="w-5 h-5 text-slate-600" /></button>
                   <h3 className="font-bold text-slate-800">{currentMonth.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}</h3>
                   <div className="flex items-center">
                      <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))} className="p-2 hover:bg-slate-100 rounded-lg"><ChevronRight className="w-5 h-5 text-slate-600" /></button>
                      <button onClick={() => setCurrentMonth(new Date())} className="ml-2 p-2 hover:bg-slate-100 rounded-lg text-blue-600" title="Wróć do dzisiaj"><RotateCcw className="w-4 h-4" /></button>
                   </div>
                </div>
                
                {/* Scrollable Container */}
                <div className="flex-1 overflow-y-auto relative min-h-0 flex flex-col">
                   <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0 sticky top-0 z-10">
                      {['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((d, i) => (
                         <div key={d} className={`p-2 text-center text-xs font-bold ${i >= 5 ? 'text-red-400' : 'text-slate-400'}`}>{d}</div>
                      ))}
                   </div>
                   <div className="grid grid-cols-7 bg-slate-200 gap-px auto-rows-fr">
                      {renderCalendar()}
                   </div>
                </div>
             </div>
          )}
       </div>
    );
  }

  // --- STANDARD ADMIN/OFFICE/SALES VIEW (KANBAN) ---

  // Define columns for the Kanban board
  const columns = [
    { id: InstallationStatus.NEW, title: 'Nowe', color: 'bg-slate-100 border-slate-200' },
    { id: InstallationStatus.AUDIT, title: 'Audyt', color: 'bg-blue-50 border-blue-100' },
    { id: InstallationStatus.CONTRACT, title: 'Umowa', color: 'bg-indigo-50 border-indigo-100' },
    { id: InstallationStatus.CONTRACT_RESCUE, title: 'Do Uratowania', color: 'bg-orange-50 border-orange-200 ring-2 ring-orange-100' }, // Added
    { id: InstallationStatus.PROJECT, title: 'Projekt', color: 'bg-violet-50 border-violet-100' },
    { id: InstallationStatus.INSTALLATION, title: 'Montaż', color: 'bg-amber-50 border-amber-100' },
    { id: InstallationStatus.GRID_CONNECTION, title: 'OSD', color: 'bg-purple-50 border-purple-100' },
    { id: InstallationStatus.GRANT_APPLICATION, title: 'Dotacje', color: 'bg-pink-50 border-pink-100' },
    { id: InstallationStatus.COMPLETED, title: 'Zakończone', color: 'bg-green-50 border-green-100' },
    { id: InstallationStatus.DROP, title: 'Spadek', color: 'bg-gray-100 border-gray-300 opacity-70' }, // Added
  ];

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col p-4">
       {/* Zoom Control */}
       <div className="flex justify-end mb-2">
          <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
             <ZoomOut className="w-4 h-4 text-slate-400" />
             <input 
               type="range" 
               min="60" 
               max="110" 
               value={zoomLevel} 
               onChange={handleZoomChange}
               className="h-1.5 w-24 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
             />
             <ZoomIn className="w-4 h-4 text-slate-400" />
             <span className="text-xs font-bold text-slate-500 w-8 text-right">{zoomLevel}%</span>
          </div>
       </div>

       <div className="flex-1 overflow-hidden relative bg-slate-50/50 rounded-xl border border-slate-200">
         <div 
           className="h-full overflow-x-auto overflow-y-hidden origin-top-left transition-transform duration-200 ease-out"
           style={{
              transform: `scale(${zoomLevel / 100})`,
              width: `${100 * (100 / zoomLevel)}%`,
              height: `${100 * (100 / zoomLevel)}%`
           }}
         >
           <div className="flex h-full space-x-4 min-w-[300px] md:min-w-[1200px] pb-4 px-4 pt-4">
             {columns.map(col => {
               const colInstalls = installations.filter(i => i.status === col.id);
               
               return (
                 <div key={col.id} className={`flex-1 min-w-[280px] md:min-w-[340px] rounded-xl flex flex-col border ${col.color} h-full`}>
                   <div className="p-3 border-b border-inherit bg-white/50 rounded-t-xl backdrop-blur-sm sticky top-0 z-10">
                     <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-700 text-sm md:text-base">{col.title}</h3>
                        <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
                          {colInstalls.length}
                        </span>
                     </div>
                   </div>
                   
                   <div className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                     {colInstalls.map(inst => {
                       const paymentPercent = inst.price > 0 ? (inst.paidAmount / inst.price) * 100 : 0;
                       const noDate = !inst.dateScheduled;
                       const type = getInstallationType(inst);
                       const styleConfig = getTypeConfig(type);

                       return (
                       <div 
                        key={inst.id} 
                        onClick={() => onNavigateToCustomer(inst.customerId)}
                        className={`bg-white p-4 rounded-xl shadow-sm border ${styleConfig.border} hover:shadow-md hover:border-l-8 transition-all cursor-pointer group flex flex-col gap-3 relative overflow-hidden`}
                       >
                         {/* Header Line */}
                         <div className="flex justify-between items-start">
                           <span className="text-[10px] font-bold text-slate-400 font-mono">#{inst.id.slice(0,6)}</span>
                           <div className="flex gap-1">
                              <span className={`text-[10px] font-bold px-2 py-1 rounded-md border border-slate-200 shadow-sm flex items-center ${styleConfig.badge}`}>
                                 <styleConfig.icon className="w-2.5 h-2.5 mr-1" />
                                 {type === 'HEAT' ? 'Ogrzewanie' : 
                                  type === 'PVME' ? 'Hybryda' : 
                                  type === 'ME' ? 'Magazyn' : 'PV'}
                              </span>
                           </div>
                         </div>
                         
                         {/* Main Info */}
                         <div>
                            <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors truncate leading-tight">
                                {getCustomerName(inst.customerId)}
                            </h4>
                            <div className="flex items-center text-xs text-slate-500 mt-1.5">
                                 <MapPin className="w-3 h-3 mr-1 shrink-0 text-slate-400" />
                                 <span className="truncate">{getInstallationAddress(inst)}</span>
                            </div>
                         </div>
                         
                         {/* Owner Label */}
                         <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                               <Briefcase className="w-2.5 h-2.5" />
                            </div>
                            <span className="text-[10px] font-medium text-slate-500 truncate">
                               {getOwnerName(inst.customerId)}
                            </span>
                         </div>
                         
                         {/* Modern Logistics Section (Date & Team) */}
                         <div className="bg-slate-50/80 rounded-lg p-2.5 border border-slate-100 space-y-2.5 mt-1" onClick={(e) => e.stopPropagation()}>
                            
                            {/* Date Picker (Fixed for SecurityError) */}
                            <div className="group/date relative">
                               <label className={`text-[9px] font-bold uppercase tracking-wider mb-1 flex items-center ${noDate ? 'text-red-500' : 'text-slate-400'}`}>
                                  {noDate ? <AlertCircle className="w-3 h-3 mr-1.5" /> : <Calendar className="w-3 h-3 mr-1.5 text-blue-500" />}
                                  Data Montażu
                                  {!canEditDate && <Lock className="w-2.5 h-2.5 ml-auto text-slate-300" />}
                               </label>
                               
                               <div className="relative">
                                  {/* Visual "Button" for No Date */}
                                  {noDate && (
                                     <div className={`w-full text-xs font-extrabold p-2 rounded-md border text-center uppercase tracking-wide transition-all absolute inset-0 flex items-center justify-center z-10 pointer-events-none ${
                                        canEditDate 
                                           ? 'bg-red-500 text-white border-red-600 shadow-md animate-pulse' 
                                           : 'bg-slate-200 text-slate-500 border-slate-300'
                                     }`}>
                                        DO USTALENIA
                                     </div>
                                  )}
                                  
                                  {/* Actual Input (Transparent Overlay when noDate, or Visible when hasDate) */}
                                  <input 
                                     type="date" 
                                     value={inst.dateScheduled || ''} 
                                     disabled={!canEditDate}
                                     onChange={(e) => handleDateChange(e, inst)}
                                     className={`w-full text-xs font-bold p-1.5 rounded-md border transition-all outline-none relative z-20 ${
                                       canEditDate 
                                         ? 'cursor-pointer' 
                                         : 'cursor-not-allowed'
                                     } ${
                                        noDate 
                                          ? 'opacity-0 h-8' // Make invisible but clickable over the button
                                          : 'opacity-100 bg-white border-slate-200 hover:border-blue-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 text-slate-800 shadow-sm'
                                     }`}
                                  />
                               </div>
                            </div>

                            {/* Team Picker */}
                            <div className="group/team pt-2 border-t border-slate-200/50">
                               <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center">
                                  <Users className="w-3 h-3 mr-1.5 text-amber-500" />
                                  Ekipa Montażowa
                                  {!canAssignTeam && <Lock className="w-2.5 h-2.5 ml-auto text-slate-300" />}
                               </label>
                               
                               {canAssignTeam ? (
                                  <div className="relative">
                                     <select
                                        value={inst.assignedTeam || ''}
                                        onChange={(e) => handleTeamChange(e, inst)}
                                        className="w-full text-xs font-bold p-1.5 rounded-md border border-slate-200 bg-white text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200 cursor-pointer hover:border-blue-300 shadow-sm appearance-none"
                                     >
                                        <option value="" className="text-slate-400">-- Wybierz ekipę --</option>
                                        {installerTeams.map(team => (
                                           <option key={team.id} value={team.id}>{team.name}</option>
                                        ))}
                                     </select>
                                     <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                                        <Hammer className="w-3 h-3 text-slate-400 opacity-50" />
                                     </div>
                                  </div>
                               ) : (
                                  <div className="text-xs font-medium text-slate-500 pl-0.5 pt-0.5">
                                     {inst.assignedTeam ? (
                                        <span className="flex items-center">
                                           {users.find(u => u.id === inst.assignedTeam)?.name || 'Nieznana ekipa'}
                                        </span>
                                     ) : (
                                        <span className="text-slate-400 italic">Brak przypisania</span>
                                     )}
                                  </div>
                               )}
                            </div>

                         </div>

                         {/* Payment Progress - Hidden for Installers (already covered by role check above, but extra safety) */}
                         {inst.price > 0 && (
                            <div className="mt-1">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1.5">
                                 <span className="flex items-center font-medium"><Banknote className="w-3 h-3 mr-1" /> Płatność</span>
                                 <span className={`font-bold ${paymentPercent >= 100 ? 'text-green-600' : 'text-blue-600'}`}>{paymentPercent.toFixed(0)}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
                                 <div 
                                   className={`h-full rounded-full transition-all duration-500 ${paymentPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                   style={{width: `${Math.min(100, paymentPercent)}%`}}
                                 ></div>
                              </div>
                            </div>
                         )}

                         {/* Status Footer */}
                         <div className="pt-3 border-t border-slate-50 flex items-center justify-between mt-auto">
                           <div className="relative flex-1 mr-3" onClick={(e) => e.stopPropagation()}>
                              <select
                                value={inst.status}
                                onChange={(e) => handleStatusChange(e, inst)}
                                disabled={!canEditStatus}
                                className={`w-full text-[11px] py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-700 transition-colors ${
                                   !canEditStatus ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer hover:bg-white hover:border-slate-300'
                                }`}
                              >
                                {Object.values(InstallationStatus).map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                           </div>
                           <div className="p-1.5 rounded-lg text-slate-400 bg-slate-50 border border-slate-100">
                             <ChevronRight className="w-3.5 h-3.5" />
                           </div>
                         </div>
                       </div>
                     )})}
                   </div>
                 </div>
               );
             })}
           </div>
         </div>
       </div>
    </div>
  );
};
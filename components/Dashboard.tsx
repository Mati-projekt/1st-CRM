

import React, { useMemo, useState, useEffect } from 'react';
import { Installation, InstallationStatus, InventoryItem, Customer, ViewState, User, UserRole, Task, Message, SalesSettings } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Zap, Users, Wallet, ArrowRight, Sun, Calendar, Plus, X, CloudRain, CloudSun, MapPin, Loader2, Battery, Flame, Mail, Settings, BarChart3, CalendarDays, ChevronLeft, ChevronRight, MessageSquare, Send, Save, RefreshCw } from 'lucide-react';

interface DashboardProps {
  installations: Installation[];
  inventory: InventoryItem[];
  customers: Customer[];
  onChangeView: (view: ViewState) => void;
  currentUser: User;
  onAddTask: (task: Task) => void;
  tasks: Task[];
  messages: Message[];
  onSendMessage: (msg: Message) => void;
  onUpdateSettings: (settings: SalesSettings) => void;
}

const WEATHER_API_KEY = 'c2c69b309bf74c33822224731250612';

type DashboardTab = 'OVERVIEW' | 'CALENDAR' | 'MESSAGES' | 'SETTINGS';
type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR';

export const Dashboard: React.FC<DashboardProps> = ({ 
  installations, 
  inventory, 
  customers, 
  onChangeView, 
  currentUser, 
  onAddTask,
  tasks,
  messages,
  onSendMessage,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('OVERVIEW');
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('MONTH');
  
  // Settings State
  const [userSettings, setUserSettings] = useState<SalesSettings>({
    location: currentUser.salesSettings?.location || 'Warszawa',
    marginPV: currentUser.salesSettings?.marginPV || 0,
    marginHeat: currentUser.salesSettings?.marginHeat || 0,
    marginStorage: currentUser.salesSettings?.marginStorage || 0,
  });

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Messages State
  const [newMessage, setNewMessage] = useState('');
  const [messageRecipient, setMessageRecipient] = useState<string>('ADMIN');

  // Weather State
  const [weatherData, setWeatherData] = useState<{
    temp: number;
    conditionText: string;
    location: string;
    code: number;
    loading: boolean;
  }>({
    temp: 0,
    conditionText: 'Ładowanie...',
    location: '',
    code: 1000,
    loading: true
  });

  // Fetch Weather - NOW WITH SAFE ERROR HANDLING
  useEffect(() => {
    const fetchWeather = async (query: string) => {
      try {
        const response = await fetch(`https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${query}&lang=pl`);
        if (!response.ok) throw new Error("Weather API error");
        const data = await response.json();
        setWeatherData({
          temp: data.current.temp_c,
          conditionText: data.current.condition.text,
          location: data.location.name,
          code: data.current.condition.code,
          loading: false
        });
      } catch (error) {
        console.warn("Weather fetch failed (likely blocked by sandbox). Using fallback.", error);
        // Fallback or just 'Brak danych' without crashing
        setWeatherData(prev => ({ 
           ...prev, 
           loading: false, 
           conditionText: 'Niedostępna', 
           location: 'Brak danych' 
        }));
      }
    };

    if (userSettings.location && userSettings.location !== 'Warszawa') {
       fetchWeather(userSettings.location);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeather(`${position.coords.latitude},${position.coords.longitude}`),
        () => fetchWeather('Warszawa')
      );
    } else {
      fetchWeather('Warszawa');
    }
  }, [userSettings.location]);

  // --- STATS LOGIC ---
  const stats = useMemo(() => {
    const isSalesRole = currentUser.role === UserRole.SALES || currentUser.role === UserRole.SALES_MANAGER;
    
    // Filter installations based on role and period
    let relevantInstalls = installations;
    if (isSalesRole) {
       // Filter by rep logic
       const myCustIds = customers.filter(c => c.repId === currentUser.id).map(c => c.id);
       // Manager sees team logic handles in App.tsx passing, but double check filtering here if needed
       // Assuming 'installations' prop is already filtered by App.tsx logic for permissions
       // But strictly for "My Performance" stats, usually sales reps only care about their own deals
       if (currentUser.role === UserRole.SALES) {
          relevantInstalls = installations.filter(i => myCustIds.includes(i.customerId));
       }
    }

    const now = new Date();
    let startDate = new Date();
    if (statsPeriod === 'WEEK') startDate.setDate(now.getDate() - 7);
    if (statsPeriod === 'MONTH') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (statsPeriod === 'YEAR') startDate = new Date(now.getFullYear(), 0, 1);

    const filteredInstalls = relevantInstalls.filter(i => {
       // Use dateScheduled or created date (mocking created date with scheduled for demo)
       // Fallback to checking id as timestamp if dateScheduled missing
       const dateStr = i.dateScheduled || '2023-01-01';
       return new Date(dateStr) >= startDate;
    });

    // Counts (Total Pipeline vs Completed/Settled)
    let pvCountTotal = 0;
    let pvCountSettled = 0;

    let storageCountTotal = 0;
    let storageCountSettled = 0;

    let heatCountTotal = 0;
    let heatCountSettled = 0;

    let earnedMargin = 0;
    let pendingMargin = 0;
    
    filteredInstalls.forEach(i => {
       const isCompleted = i.status === InstallationStatus.COMPLETED;
       
       // Detect types
       const hasPV = i.systemSizeKw > 0;
       const hasStorage = i.storageSizeKw && i.storageSizeKw > 0;
       const hasHeat = i.notes?.toLowerCase().includes('pompa') || i.notes?.toLowerCase().includes('heat');

       // PV Stats
       if (hasPV) {
          pvCountTotal++;
          if (isCompleted) pvCountSettled++;
       }

       // Storage Stats
       if (hasStorage) {
          storageCountTotal++;
          if (isCompleted) storageCountSettled++;
       }

       // Heat Stats
       if (hasHeat) {
          heatCountTotal++;
          if (isCompleted) heatCountSettled++;
       }

       // Margin Calculation
       // UPDATED LOGIC: Prefer saved commission value, fallback to current settings
       let dealMargin = 0;
       if (i.commissionValue !== undefined) {
           dealMargin = i.commissionValue;
       } else {
           if (hasPV) dealMargin += userSettings.marginPV;
           if (hasStorage) dealMargin += userSettings.marginStorage;
           if (hasHeat) dealMargin += userSettings.marginHeat;
       }

       if (isCompleted) {
          earnedMargin += dealMargin;
       } else {
          pendingMargin += dealMargin;
       }
    });

    const totalKW = installations.reduce((acc, curr) => acc + curr.systemSizeKw, 0);
    const pending = installations.filter(i => i.status !== InstallationStatus.COMPLETED && i.status !== InstallationStatus.NEW).length;
    const lowStock = inventory.filter(i => i.quantity <= i.minQuantity).length;
    const statusCounts = installations.reduce((acc, curr) => {
      acc[curr.status] = (acc[curr.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { 
       totalKW, pending, lowStock, statusCounts, 
       pvCountTotal, pvCountSettled,
       storageCountTotal, storageCountSettled,
       heatCountTotal, heatCountSettled,
       earnedMargin, pendingMargin
    };
  }, [installations, inventory, customers, currentUser, statsPeriod, userSettings]);

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

  const renderWeatherIcon = () => {
    if (weatherData.loading) return <Loader2 className="animate-spin text-white w-6 h-6 mr-4" />;
    const code = weatherData.code;
    if (code === 1000) return <Sun className="text-yellow-400 w-6 h-6 md:w-8 md:h-8 mr-4" />;
    if ([1003, 1006, 1009, 1030, 1135, 1147].includes(code)) return <CloudSun className="text-slate-300 w-6 h-6 md:w-8 md:h-8 mr-4" />;
    return <CloudRain className="text-blue-400 w-6 h-6 md:w-8 md:h-8 mr-4" />;
  };

  const handleCreateTask = () => {
    if (newTaskTitle) {
      onAddTask({
        id: Date.now().toString(),
        title: newTaskTitle,
        date: selectedDate,
        completed: false,
        assignedTo: currentUser.id,
        createdBy: currentUser.id
      });
      setNewTaskTitle('');
      setShowTaskModal(false);
    }
  };

  const handleSendMsg = () => {
     if (!newMessage) return;
     onSendMessage({
        id: Date.now().toString(),
        fromId: currentUser.id,
        toId: messageRecipient,
        content: newMessage,
        date: new Date().toISOString(),
        read: false
     });
     setNewMessage('');
  };

  const handleSaveSettings = () => {
     onUpdateSettings(userSettings);
     alert("Ustawienia zostały zapisane.");
  };

  // Calendar Logic
  const renderCalendar = () => {
     const year = currentDate.getFullYear();
     const month = currentDate.getMonth();
     const daysInMonth = new Date(year, month + 1, 0).getDate();
     const startDay = new Date(year, month, 1).getDay() || 7; // 1-7 (Mon-Sun)
     
     const days = [];
     const offset = startDay - 1;

     // Empty slots
     for (let i = 0; i < offset; i++) {
        days.push(<div key={`empty-${i}`} className="bg-slate-50/50 border border-slate-100 min-h-[80px]"></div>);
     }

     const holidays = ['01-01', '01-06', '05-01', '05-03', '08-15', '11-01', '11-11', '12-25', '12-26'];

     for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayTasks = tasks.filter(t => t.date === dateStr && t.assignedTo === currentUser.id);
        
        const dateObj = new Date(year, month, d);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const mmdd = `${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isHoliday = holidays.includes(mmdd);
        const isToday = new Date().toDateString() === dateObj.toDateString();

        days.push(
           <div 
             key={d} 
             onClick={() => { setSelectedDate(dateStr); setShowTaskModal(true); }}
             className={`min-h-[100px] border border-slate-100 p-2 relative hover:bg-blue-50 transition-colors cursor-pointer group flex flex-col ${isWeekend ? 'bg-slate-50' : 'bg-white'} ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
           >
              <div className="flex justify-between items-start">
                 <span className={`text-sm font-bold ${isHoliday ? 'text-red-500' : 'text-slate-700'}`}>{d}</span>
                 {isHoliday && <span className="text-[9px] text-red-500 uppercase font-bold tracking-tighter">Święto</span>}
              </div>
              <div className="mt-2 space-y-1 flex-1 overflow-y-auto">
                 {dayTasks.map(t => (
                    <div key={t.id} className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded truncate">
                       {t.title}
                    </div>
                 ))}
              </div>
           </div>
        );
     }
     return days;
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      
      {/* Header & Weather */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 md:px-8 shadow-sm z-10">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h1 className="text-2xl font-bold text-slate-800">Pulpit</h1>
               <p className="text-sm text-slate-500">Witaj, {currentUser.name}</p>
            </div>
            
            <div className="flex items-center bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
               {renderWeatherIcon()}
               <div>
                  <p className="text-[10px] text-slate-300 uppercase font-bold flex items-center">
                     <MapPin className="w-3 h-3 mr-1" /> {weatherData.location || 'Lokalizowanie...'}
                  </p>
                  <p className="text-base font-bold">
                     {weatherData.loading ? '...' : `${Math.round(weatherData.temp)}°C, ${weatherData.conditionText}`}
                  </p>
               </div>
            </div>
         </div>
         
         {/* Navigation Tabs */}
         <div className="flex space-x-1 mt-6 overflow-x-auto hide-scrollbar">
            {[
               { id: 'OVERVIEW', label: 'Przegląd', icon: BarChart3 },
               { id: 'CALENDAR', label: 'Kalendarz', icon: CalendarDays },
               { id: 'MESSAGES', label: 'Wiadomości', icon: MessageSquare },
               { id: 'SETTINGS', label: 'Ustawienia', icon: Settings }
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`flex items-center px-4 py-2.5 rounded-t-lg font-bold text-sm transition-colors border-b-2 ${activeTab === tab.id ? 'bg-slate-50 border-blue-600 text-blue-600' : 'bg-white border-transparent text-slate-500 hover:text-slate-800'}`}
               >
                  <tab.icon className="w-4 h-4 mr-2" />
                  {tab.label}
               </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
         
         {/* TAB: OVERVIEW */}
         {activeTab === 'OVERVIEW' && (
            <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
               
               {/* Period Filter */}
               <div className="flex justify-end">
                  <div className="bg-white border border-slate-200 rounded-lg p-1 inline-flex">
                     {(['WEEK', 'MONTH', 'YEAR'] as StatsPeriod[]).map(p => (
                        <button 
                           key={p} 
                           onClick={() => setStatsPeriod(p)}
                           className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${statsPeriod === p ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                           {p === 'WEEK' ? 'Tydzień' : p === 'MONTH' ? 'Miesiąc' : 'Rok'}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Sales Stats Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* PV STATS */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Sun className="w-6 h-6"/></div>
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">PV + ME</span>
                     </div>
                     <div>
                        <p className="text-sm text-slate-500 font-medium">Sprzedane (Zakończone)</p>
                        <div className="flex items-baseline space-x-2 mt-1">
                           <p className="text-3xl font-bold text-slate-800">{stats.pvCountSettled}</p>
                           <p className="text-sm font-medium text-slate-400">/ {stats.pvCountTotal} w toku</p>
                        </div>
                     </div>
                  </div>

                  {/* STORAGE STATS */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Battery className="w-6 h-6"/></div>
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Tylko ME</span>
                     </div>
                     <div>
                        <p className="text-sm text-slate-500 font-medium">Sprzedane Magazyny</p>
                         <div className="flex items-baseline space-x-2 mt-1">
                           <p className="text-3xl font-bold text-slate-800">{stats.storageCountSettled}</p>
                           <p className="text-sm font-medium text-slate-400">/ {stats.storageCountTotal} w toku</p>
                        </div>
                     </div>
                  </div>

                  {/* HEAT STATS */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-between">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Flame className="w-6 h-6"/></div>
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded">Pompy</span>
                     </div>
                     <div>
                        <p className="text-sm text-slate-500 font-medium">Systemy Grzewcze</p>
                         <div className="flex items-baseline space-x-2 mt-1">
                           <p className="text-3xl font-bold text-slate-800">{stats.heatCountSettled}</p>
                           <p className="text-sm font-medium text-slate-400">/ {stats.heatCountTotal} w toku</p>
                        </div>
                     </div>
                  </div>

                  {/* COMMISSION STATS (EARNED ONLY ON COMPLETED) */}
                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                     <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-white/20 rounded-xl"><Wallet className="w-6 h-6"/></div>
                     </div>
                     <div className="relative z-10">
                        <p className="text-sm text-blue-100 font-medium">Zrealizowana Prowizja</p>
                        <p className="text-3xl font-bold mt-1">{stats.earnedMargin.toLocaleString()} PLN</p>
                        <p className="text-[10px] text-blue-200 mt-1 flex items-center">
                           <span className="opacity-70">Prognozowana: {stats.pendingMargin.toLocaleString()} PLN</span>
                        </p>
                     </div>
                  </div>
               </div>

               {/* Pipeline & Recent */}
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pipeline */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-6">Status Realizacji</h3>
                     <div className="space-y-4">
                        {Object.values(InstallationStatus).map(status => {
                           const count = stats.statusCounts[status] || 0;
                           if (count === 0) return null;
                           const pct = (count / installations.length) * 100;
                           return (
                              <div key={status}>
                                 <div className="flex justify-between text-xs font-bold mb-1">
                                    <span className="text-slate-600">{status}</span>
                                    <span className="text-slate-800">{count}</span>
                                 </div>
                                 <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full ${getStatusColor(status)}`} style={{ width: `${pct}%` }}></div>
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  </div>
                  
                  {/* Upcoming */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-slate-800 mb-6">Nadchodzące Montaże</h3>
                     <div className="space-y-3">
                        {installations
                           .filter(i => i.status === InstallationStatus.INSTALLATION || i.status === InstallationStatus.PROJECT)
                           .slice(0, 5)
                           .map(inst => (
                              <div key={inst.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                 <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-xs">
                                       {inst.systemSizeKw.toFixed(0)}
                                    </div>
                                    <div>
                                       <p className="text-sm font-bold text-slate-700 truncate w-32 md:w-auto">{inst.address}</p>
                                       <p className="text-[10px] text-slate-500">{inst.dateScheduled || 'Do ustalenia'}</p>
                                    </div>
                                 </div>
                                 <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">
                                    {inst.status}
                                 </span>
                              </div>
                           ))
                        }
                        {installations.filter(i => i.status === InstallationStatus.INSTALLATION || i.status === InstallationStatus.PROJECT).length === 0 && (
                           <p className="text-center text-slate-400 text-sm py-4">Brak nadchodzących montaży.</p>
                        )}
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* TAB: CALENDAR */}
         {activeTab === 'CALENDAR' && (
            <div className="max-w-7xl mx-auto animate-fade-in bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center space-x-4">
                     <h2 className="text-2xl font-bold text-slate-800 capitalize">
                        {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                     </h2>
                     <div className="flex space-x-1 bg-slate-100 rounded-lg p-1">
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-white rounded shadow-sm"><ChevronLeft className="w-5 h-5"/></button>
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-white rounded shadow-sm"><ChevronRight className="w-5 h-5"/></button>
                     </div>
                  </div>
                  <button className="flex items-center bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50">
                     <RefreshCw className="w-4 h-4 mr-2" /> Synchronizuj z Google Calendar
                  </button>
               </div>
               
               <div className="p-6 overflow-x-auto">
                  <div className="min-w-[800px]">
                     <div className="grid grid-cols-7 mb-2 text-center">
                        {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'].map((day, i) => (
                           <div key={day} className={`text-xs font-bold uppercase ${i >= 5 ? 'text-red-500' : 'text-slate-400'}`}>{day}</div>
                        ))}
                     </div>
                     <div className="grid grid-cols-7 border border-slate-200 bg-slate-200 gap-px rounded-xl overflow-hidden">
                        {renderCalendar()}
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* TAB: MESSAGES */}
         {activeTab === 'MESSAGES' && (
            <div className="max-w-6xl mx-auto h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 flex overflow-hidden animate-fade-in">
               {/* Sidebar */}
               <div className="w-1/3 border-r border-slate-100 bg-slate-50 flex flex-col">
                  <div className="p-4 border-b border-slate-200">
                     <h3 className="font-bold text-slate-700 mb-2">Kontakty</h3>
                     <select 
                       value={messageRecipient} 
                       onChange={(e) => setMessageRecipient(e.target.value)}
                       className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                     >
                        <option value="ADMIN">Administrator</option>
                        <option value="OFFICE">Biuro</option>
                        {/* Mock other users */}
                        <option value="SALES_MANAGER">Kierownik Sprzedaży</option>
                     </select>
                  </div>
                  <div className="flex-1 overflow-y-auto p-2">
                     <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-sm cursor-pointer border-l-4 border-l-blue-500">
                        <p className="font-bold text-slate-800 text-sm">Biuro / Admin</p>
                        <p className="text-xs text-slate-400 truncate">Kliknij aby zobaczyć historię...</p>
                     </div>
                  </div>
               </div>
               
               {/* Chat Area */}
               <div className="flex-1 flex flex-col bg-white">
                  <div className="flex-1 p-4 overflow-y-auto space-y-4">
                     {messages.filter(m => m.toId === currentUser.id || m.fromId === currentUser.id).length === 0 ? (
                        <div className="text-center text-slate-400 mt-20">Brak wiadomości.</div>
                     ) : (
                        messages.filter(m => m.toId === currentUser.id || m.fromId === currentUser.id).map(msg => {
                           const isMe = msg.fromId === currentUser.id;
                           return (
                              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                 <div className={`max-w-[70%] p-3 rounded-xl text-sm ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                                    <p>{msg.content}</p>
                                    <p className={`text-[9px] mt-1 ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                       {new Date(msg.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                 </div>
                              </div>
                           );
                        })
                     )}
                  </div>
                  <div className="p-4 border-t border-slate-100 bg-slate-50">
                     <div className="flex space-x-2">
                        <input 
                          type="text" 
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          placeholder="Napisz wiadomość..." 
                          className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button onClick={handleSendMsg} className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 transition-colors">
                           <Send className="w-5 h-5" />
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}

         {/* TAB: SETTINGS */}
         {activeTab === 'SETTINGS' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in">
               <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                  <Settings className="w-6 h-6 mr-2 text-slate-500" /> Ustawienia Osobiste
               </h3>
               
               <div className="space-y-6">
                  {/* Location */}
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Twoja Lokalizacja (Pogoda)</label>
                     <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                        <input 
                           type="text" 
                           value={userSettings.location || ''} 
                           onChange={(e) => setUserSettings({...userSettings, location: e.target.value})}
                           className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl"
                           placeholder="np. Warszawa"
                        />
                     </div>
                  </div>

                  <div className="border-t border-slate-100 pt-6">
                     <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                        <Wallet className="w-5 h-5 mr-2 text-green-600" /> Automatyczna Marża (PLN)
                     </h4>
                     <p className="text-xs text-slate-500 mb-4">
                        Poniższe kwoty zostaną automatycznie doliczone do wyceny w kalkulatorze (niewidoczne dla klienta).
                     </p>
                     
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fotowoltaika (PV)</label>
                           <input 
                              type="number" 
                              value={userSettings.marginPV} 
                              onChange={(e) => setUserSettings({...userSettings, marginPV: Number(e.target.value)})}
                              className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-800"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Magazyn Energii</label>
                           <input 
                              type="number" 
                              value={userSettings.marginStorage} 
                              onChange={(e) => setUserSettings({...userSettings, marginStorage: Number(e.target.value)})}
                              className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-800"
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pompa Ciepła</label>
                           <input 
                              type="number" 
                              value={userSettings.marginHeat} 
                              onChange={(e) => setUserSettings({...userSettings, marginHeat: Number(e.target.value)})}
                              className="w-full p-3 border border-slate-300 rounded-xl font-bold text-slate-800"
                           />
                        </div>
                     </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                     <button 
                        onClick={handleSaveSettings}
                        className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center"
                     >
                        <Save className="w-5 h-5 mr-2" /> Zapisz Ustawienia
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>

      {/* Task Modal */}
      {showTaskModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
               <h3 className="text-lg font-bold mb-4">Dodaj Zadanie ({selectedDate})</h3>
               <input 
                  type="text" 
                  value={newTaskTitle} 
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Treść zadania..."
                  className="w-full p-3 border border-slate-300 rounded-lg mb-4"
               />
               <div className="flex justify-end space-x-2">
                  <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-500">Anuluj</button>
                  <button onClick={handleCreateTask} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Dodaj</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Installation, InstallationStatus, InventoryItem, Customer, ViewState, User, UserRole, Task, Message, SalesSettings, TaskType, AppNotification } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Zap, Users, Wallet, ArrowRight, Sun, Calendar, Plus, X, CloudRain, CloudSun, MapPin, Loader2, Battery, Flame, Mail, Settings, BarChart3, CalendarDays, ChevronLeft, ChevronRight, MessageSquare, Send, Save, RefreshCw, ToggleLeft, ToggleRight, Percent, Wrench, CheckSquare, Phone, Briefcase, FileText, UserCircle, Edit2, Trash2, UserPlus, Search, UserCheck, Eye, EyeOff, RotateCcw, Check, Bell, MoreVertical, PenBox, Clock, LogOut, Filter, Square, Globe, Banknote, Leaf } from 'lucide-react';
import { NotificationsCenter } from './NotificationsCenter';

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
  onNavigateToCustomer: (customerId: string) => void; 
  onUpdateTaskDetails?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  users?: User[]; 
  notifications?: AppNotification[];
  onMarkAsRead?: (id: string) => void;
  onMarkAsUnread?: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onDeleteNotification?: (id: string) => void;
  onNavigate?: (view: ViewState, id?: string) => void;
}

const WEATHER_API_KEY = 'c2c69b309bf74c33822224731250612';

// Message tab removed from types
type DashboardTab = 'OVERVIEW' | 'CALENDAR' | 'SETTINGS' | 'NOTIFICATIONS';
type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

interface CalendarEvent {
   id: string;
   type: 'TASK' | 'INSTALLATION';
   title: string;
   date: string;
   status?: string;
   details?: string;
   taskType?: TaskType;
   customerName?: string;
   phone?: string;
   address?: string;
   customerId?: string; 
   assignedTo?: string; 
   createdBy?: string; 
   systemSizeKw?: number;
   storageSizeKw?: number;
}

// Polish Holidays Map
const POLISH_HOLIDAYS: Record<string, string> = {
  '01-01': 'Nowy Rok',
  '01-06': 'Trzech Króli',
  '05-01': 'Święto Pracy',
  '05-03': 'Konstytucji 3 Maja',
  '08-15': 'Wniebowzięcie NMP',
  '11-01': 'Wszystkich Świętych',
  '11-11': 'Niepodległości',
  '12-25': 'Boże Narodzenie',
  '12-26': 'Drugi dzień świąt'
};

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
  onUpdateSettings,
  onNavigateToCustomer,
  onUpdateTaskDetails,
  onDeleteTask,
  users = [],
  notifications = [],
  onMarkAsRead = () => {},
  onMarkAsUnread = () => {},
  onMarkAllAsRead = () => {},
  onDeleteNotification = () => {},
  onNavigate = () => {},
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('OVERVIEW');
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('MONTH');
  const [showCommission, setShowCommission] = useState(false);
  const [showGlobalProfit, setShowGlobalProfit] = useState(false);
  const [showGlobalMargin, setShowGlobalMargin] = useState(false);

  // Admin filter state
  const [dashboardUserFilter, setDashboardUserFilter] = useState<string>(currentUser.role === UserRole.ADMIN ? 'ALL' : currentUser.id);

  // Custom Date Range
  const [customDateStart, setCustomDateStart] = useState<string>(
     new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customDateEnd, setCustomDateEnd] = useState<string>(
     new Date().toISOString().split('T')[0]
  );
  
  // Settings
  const [userSettings, setUserSettings] = useState<SalesSettings>({
    location: currentUser.salesSettings?.location || 'Warszawa',
    marginPV: currentUser.salesSettings?.marginPV || 0,
    marginHeat: currentUser.salesSettings?.marginHeat || 0,
    marginStorage: currentUser.salesSettings?.marginStorage || 0,
    marginHybrid: currentUser.salesSettings?.marginHybrid || 0, // NEW
    showRoiChart: currentUser.salesSettings?.showRoiChart ?? true, 
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Calendar
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false); 
  const [isSelfAssignMode, setIsSelfAssignMode] = useState(false);
  
  // New Task
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('TODO');
  const [newTaskCustomerName, setNewTaskCustomerName] = useState('');
  const [newTaskCustomerId, setNewTaskCustomerId] = useState<string | undefined>(undefined);
  const [newTaskPhone, setNewTaskPhone] = useState('');
  const [newTaskAddress, setNewTaskAddress] = useState('');
  
  // Autocomplete
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  // Delegation
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>(currentUser.id);
  
  // Edit Task
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Weather
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

  const canDelegate = true; // Always true as requested
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  const getCustomerName = (id: string, list: Customer[]) => {
    const c = list.find(cust => cust.id === id);
    return c ? c.name : 'Nieznany';
  };

  // Filter customers for autocomplete
  const filteredCustomerSuggestions = useMemo(() => {
     if (!newTaskCustomerName || newTaskCustomerId) return [];
     return customers
        .filter(c => c.name.toLowerCase().includes(newTaskCustomerName.toLowerCase()))
        .slice(0, 5);
  }, [customers, newTaskCustomerName, newTaskCustomerId]);

  const handleSelectCustomer = (customer: Customer) => {
     setNewTaskCustomerName(customer.name);
     setNewTaskCustomerId(customer.id);
     setNewTaskPhone(customer.phone);
     setNewTaskAddress(customer.address);
     setShowCustomerSuggestions(false);
  };

  // Weather Fetch
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
        setWeatherData(prev => ({ ...prev, loading: false, conditionText: 'Niedostępna', location: 'Brak danych' }));
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
    let relevantInstalls = installations;
    
    // Filter by User Logic (Global vs Specific)
    if (dashboardUserFilter !== 'ALL') {
       const myCustIds = customers.filter(c => c.repId === dashboardUserFilter).map(c => c.id);
       relevantInstalls = installations.filter(i => myCustIds.includes(i.customerId));
    }

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (statsPeriod === 'WEEK') startDate.setDate(now.getDate() - 7);
    else if (statsPeriod === 'MONTH') { startDate = new Date(now.getFullYear(), now.getMonth(), 1); endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); }
    else if (statsPeriod === 'YEAR') { startDate = new Date(now.getFullYear(), 0, 1); endDate = new Date(now.getFullYear(), 11, 31); }
    else if (statsPeriod === 'CUSTOM') { startDate = new Date(customDateStart); endDate = new Date(customDateEnd); endDate.setHours(23, 59, 59, 999); }

    const filteredInstalls = relevantInstalls.filter(i => {
       if (!i.dateScheduled) return false;
       const iDate = new Date(i.dateScheduled);
       return iDate >= startDate && (statsPeriod === 'CUSTOM' ? iDate <= endDate : true);
    });

    let pvOnlyCount = 0;
    let storageOnlyCount = 0;
    let hybridCount = 0; // PV + Storage
    let heatPumpCount = 0;
    let pelletCount = 0;

    let earnedMargin = 0;
    let pendingMargin = 0;
    let totalCompanyMargin = 0;
    let totalGrossRevenue = 0;
    
    // Personal split percentage (irrelevant if ALL users selected in Admin view, but useful for user view)
    const splitPercentage = (currentUser.commissionSplit || 0) / 100;

    filteredInstalls.forEach(i => {
       // --- COUNTING LOGIC ---
       const hasPV = i.systemSizeKw > 0;
       const hasStorage = i.storageSizeKw && i.storageSizeKw > 0;
       
       const notesLower = i.notes ? i.notes.toLowerCase() : '';
       const isPellet = notesLower.includes('pellet') || notesLower.includes('kocioł');
       const isHeatPump = notesLower.includes('pompa') || notesLower.includes('heat');

       if (hasPV && hasStorage) {
          hybridCount++;
       } else if (hasPV) {
          pvOnlyCount++;
       } else if (hasStorage) {
          storageOnlyCount++;
       }

       if (isPellet) pelletCount++;
       if (isHeatPump) heatPumpCount++;

       
       // --- FINANCIAL LOGIC ---
       let dealMargin = i.commissionValue !== undefined ? Number(i.commissionValue) : 0;
       
       // Fallback margin calc if not set on installation
       if (!dealMargin) { 
           if (hasPV && hasStorage) {
              dealMargin += (userSettings.marginHybrid || 0); // Use Hybrid margin if available
           } else {
              if (i.systemSizeKw > 0) dealMargin += userSettings.marginPV;
              if (i.storageSizeKw) dealMargin += userSettings.marginStorage;
           }
       }
       
       // CONTRACTED JOBS Logic
       // Consider anything past "NEW" and "AUDIT" as a signed/in-progress deal for revenue purposes
       const contractedStatuses = [
          InstallationStatus.CONTRACT,
          InstallationStatus.PROJECT,
          InstallationStatus.INSTALLATION,
          InstallationStatus.GRID_CONNECTION,
          InstallationStatus.GRANT_APPLICATION,
          InstallationStatus.COMPLETED
       ];
       
       if (contractedStatuses.includes(i.status)) {
          totalCompanyMargin += dealMargin;
          totalGrossRevenue += i.price; // Add full contract price (Wartość Umowy)
          earnedMargin += (dealMargin * splitPercentage);
       } else if (i.status !== InstallationStatus.NEW) {
          // Keep pending margin logic for non-new statuses
          pendingMargin += (dealMargin * splitPercentage);
       }
    });

    const statusCounts = filteredInstalls.reduce((acc, curr) => {
       acc[curr.status] = (acc[curr.status] || 0) + 1;
       return acc;
    }, {} as Record<string, number>);

    return { 
       pvOnlyCount, storageOnlyCount, hybridCount, heatPumpCount, pelletCount,
       earnedMargin, pendingMargin,
       totalKW: filteredInstalls.reduce((acc, curr) => acc + curr.systemSizeKw, 0),
       statusCounts,
       filteredInstalls,
       totalCompanyMargin,
       totalGrossRevenue
    };
  }, [installations, inventory, customers, currentUser, statsPeriod, userSettings, customDateStart, customDateEnd, dashboardUserFilter]);

  // --- CALENDAR LOGIC ---
  const calendarEvents = useMemo(() => {
     const events: CalendarEvent[] = [];
     // Show tasks assigned to current user OR tasks created by current user
     tasks.filter(t => t.assignedTo === currentUser.id || t.createdBy === currentUser.id).forEach(t => {
        events.push({
           id: t.id,
           type: 'TASK',
           title: t.title,
           date: t.date,
           status: t.completed ? 'COMPLETED' : 'PENDING',
           taskType: t.type || 'TODO',
           customerName: t.customerName,
           customerId: t.customerId,
           phone: t.phone,
           address: t.address,
           assignedTo: t.assignedTo,
           createdBy: t.createdBy
        });
     });
     
     const isSales = currentUser.role === UserRole.SALES;
     const myCustomerIds = customers.filter(c => c.repId === currentUser.id).map(c => c.id);

     installations.forEach(inst => {
        if (!inst.dateScheduled) return;
        if (isSales && !myCustomerIds.includes(inst.customerId)) return;
        const customer = customers.find(c => c.id === inst.customerId);
        events.push({
           id: `inst-${inst.id}`,
           type: 'INSTALLATION',
           title: `Montaż: ${customer?.name || 'Klient'}`,
           date: inst.dateScheduled,
           status: inst.status,
           customerId: inst.customerId,
           systemSizeKw: inst.systemSizeKw,
           storageSizeKw: inst.storageSizeKw
        });
     });
     return events;
  }, [tasks, installations, customers, currentUser]);

  const handleCreateTask = () => {
    if (newTaskTitle) {
      onAddTask({
        id: Date.now().toString(),
        title: newTaskTitle,
        date: selectedDate,
        completed: false,
        assignedTo: taskAssigneeId,
        createdBy: currentUser.id,
        type: newTaskType,
        customerName: newTaskCustomerName,
        customerId: newTaskCustomerId,
        phone: newTaskPhone,
        address: newTaskAddress
      });
      setNewTaskTitle('');
      setNewTaskCustomerName('');
      setNewTaskCustomerId(undefined);
      setNewTaskPhone('');
      setNewTaskAddress('');
      setShowTaskModal(false);
    }
  };

  const handleToggleTaskCompletion = (eventId: string, currentStatus: boolean) => {
     if (onUpdateTaskDetails) {
        const task = tasks.find(t => t.id === eventId);
        if (task) {
           onUpdateTaskDetails({ ...task, completed: !currentStatus });
        }
     }
  };

  const handleSaveSettings = () => {
     setIsSavingSettings(true);
     onUpdateSettings(userSettings);
     
     // Visual feedback timer
     setTimeout(() => {
        setIsSavingSettings(false);
     }, 2000);
  };

  const renderWeatherIcon = () => {
    if (weatherData.loading) return <Loader2 className="animate-spin text-white w-6 h-6 mr-4" />;
    return [1000].includes(weatherData.code) ? <Sun className="text-yellow-400 w-6 h-6 mr-4" /> : <CloudSun className="text-slate-300 w-6 h-6 mr-4" />;
  };

  const renderCalendar = () => {
     const year = currentDate.getFullYear();
     const month = currentDate.getMonth();
     const daysInMonth = new Date(year, month + 1, 0).getDate();
     const startDay = new Date(year, month, 1).getDay() || 7;
     const days = [];
     
     // Empty days
     for (let i = 0; i < startDay - 1; i++) days.push(<div key={`empty-${i}`} className="bg-slate-50/50 border-b border-r border-slate-200 min-h-[100px]"></div>);
     
     // Days
     for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const dayEvents = calendarEvents.filter(e => e.date === dateStr);
        const isToday = new Date().toISOString().split('T')[0] === dateStr;
        const dateObj = new Date(year, month, d);
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        
        const mmdd = `${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const holidayName = POLISH_HOLIDAYS[mmdd];

        let bgClass = 'bg-white hover:bg-blue-50/30';
        if (isWeekend) bgClass = 'bg-slate-50/50 hover:bg-slate-100';
        if (holidayName) bgClass = 'bg-red-50 hover:bg-red-100/50';
        if (isToday) bgClass = 'bg-blue-50/50 hover:bg-blue-100/50';

        days.push(
           <div 
              key={d} 
              onClick={() => { setSelectedDate(dateStr); setShowDayDetailsModal(true); }} 
              className={`border-b border-r border-slate-200 p-2 min-h-[100px] flex flex-col cursor-pointer transition-colors group relative ${bgClass}`}
           >
              <div className="flex justify-between items-start mb-1">
                 <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                    isToday ? 'bg-blue-600 text-white shadow-sm' : 
                    holidayName ? 'text-red-600' : 'text-slate-700'
                 }`}>
                    {d}
                 </span>
                 {holidayName && (
                    <span className="text-[9px] font-extrabold uppercase text-red-500 bg-white/80 px-1.5 rounded truncate max-w-[80px]" title={holidayName}>
                       {holidayName}
                    </span>
                 )}
                 <button 
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded text-blue-600 transition-opacity"
                    title="Szczegóły dnia"
                 >
                    <MoreVertical className="w-3 h-3" />
                 </button>
              </div>
              
              <div className="flex-1 space-y-1 overflow-hidden">
                 {dayEvents.slice(0, 3).map(ev => (
                    <div key={ev.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate border border-transparent ${
                       ev.type === 'INSTALLATION' 
                          ? 'bg-amber-100 text-amber-700 border-amber-200' 
                          : ev.status === 'COMPLETED' ? 'bg-slate-100 text-slate-400 line-through' : 'bg-blue-100 text-blue-700 border-blue-200'
                    }`}>
                       {ev.taskType === 'MEETING' ? '📅 ' : ev.taskType === 'CALL' ? '📞 ' : ''}{ev.title}
                    </div>
                 ))}
                 {dayEvents.length > 3 && (
                    <div className="text-[9px] text-slate-400 font-bold pl-1">
                       +{dayEvents.length - 3} więcej...
                    </div>
                 )}
              </div>
           </div>
        );
     }
     return days;
  };

  const StatusCard = ({ label, count, color, icon: Icon }: { label: string, count: number, color: string, icon: any }) => (
     <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
           <p className="text-xs font-bold uppercase text-slate-400 mb-1">{label}</p>
           <p className="text-2xl font-extrabold text-slate-800">{count}</p>
        </div>
        <div className={`p-3 rounded-full ${color}`}>
           <Icon className="w-5 h-5" />
        </div>
     </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 md:px-8 shadow-sm z-10 shrink-0">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h1 className="text-2xl font-bold text-slate-800">Pulpit</h1>
               <p className="text-sm text-slate-500">Witaj, {currentUser.name}</p>
            </div>
            
            <div className="flex items-center bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg">
               {renderWeatherIcon()}
               <div>
                  <p className="text-[10px] text-slate-300 uppercase font-bold flex items-center">
                     <MapPin className="w-3 h-3 mr-1" /> {weatherData.location}
                  </p>
                  <p className="text-base font-bold">{Math.round(weatherData.temp)}°C, {weatherData.conditionText}</p>
               </div>
            </div>
         </div>
         
         {/* Tabs */}
         <div className="flex space-x-1 mt-6 overflow-x-auto hide-scrollbar">
            {[
               { id: 'OVERVIEW', label: 'Przegląd', icon: BarChart3 },
               { id: 'CALENDAR', label: 'Kalendarz', icon: CalendarDays },
               { id: 'NOTIFICATIONS', label: 'Powiadomienia', icon: Bell, badge: unreadNotificationsCount },
               { id: 'SETTINGS', label: 'Ustawienia', icon: Settings }
            ].map(tab => (
               <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as DashboardTab)}
                  className={`flex items-center px-4 py-2.5 rounded-t-lg font-bold text-sm transition-all border-b-2 relative ${activeTab === tab.id ? 'bg-slate-50 border-blue-600 text-blue-600' : 'bg-white border-transparent text-slate-500 hover:text-slate-800'}`}
               >
                  <div className="relative mr-3">
                     <tab.icon className="w-4 h-4" />
                     {tab.badge !== undefined && tab.badge > 0 && <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] px-1.5 rounded-full border border-white">{tab.badge}</span>}
                  </div>
                  {tab.label}
               </button>
            ))}
         </div>
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
         
         {/* TAB: OVERVIEW */}
         {activeTab === 'OVERVIEW' && (
            <div className="h-full overflow-y-auto p-4 md:p-8 space-y-8 animate-fade-in custom-scrollbar">
               
               {/* ADMIN TILES ROW - PROMINENT & LARGE */}
               {dashboardUserFilter === 'ALL' && isAdmin && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                     {/* GROSS REVENUE TILE */}
                     <div 
                        onClick={() => setShowGlobalProfit(!showGlobalProfit)}
                        className="bg-gradient-to-br from-emerald-600 to-teal-800 p-8 rounded-3xl shadow-xl text-white cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden h-48 flex flex-col justify-center"
                     >
                        <div className="absolute top-0 right-0 p-6 opacity-10"><Banknote className="w-40 h-40"/></div>
                        <div className="relative z-10">
                           <div className="flex justify-between items-center mb-2">
                              <p className="text-sm md:text-base text-emerald-100 font-bold uppercase tracking-widest flex items-center">
                                 <Banknote className="w-5 h-5 mr-2" /> Przychód Brutto Firmy
                              </p>
                              <div className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                 {showGlobalProfit ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                              </div>
                           </div>
                           <p className="text-4xl md:text-6xl font-extrabold mt-2 tracking-tight">
                              {showGlobalProfit ? `${stats.totalGrossRevenue.toLocaleString()} PLN` : '• • • • • • PLN'}
                           </p>
                           <p className="text-xs md:text-sm text-emerald-200 mt-4 font-medium opacity-80">
                              Suma wartości wszystkich podpisanych umów (bez statusu Nowy/Audyt).
                           </p>
                        </div>
                     </div>

                     {/* TOTAL MARGIN TILE */}
                     <div 
                        onClick={() => setShowGlobalMargin(!showGlobalMargin)}
                        className="bg-gradient-to-br from-indigo-600 to-violet-800 p-8 rounded-3xl shadow-xl text-white cursor-pointer hover:scale-[1.01] transition-transform relative overflow-hidden h-48 flex flex-col justify-center"
                     >
                        <div className="absolute top-0 right-0 p-6 opacity-10"><Wallet className="w-40 h-40"/></div>
                        <div className="relative z-10">
                           <div className="flex justify-between items-center mb-2">
                              <p className="text-sm md:text-base text-indigo-100 font-bold uppercase tracking-widest flex items-center">
                                 <Wallet className="w-5 h-5 mr-2" /> Zysk Operacyjny (Marża)
                              </p>
                              <div className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                                 {showGlobalMargin ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
                              </div>
                           </div>
                           <p className="text-4xl md:text-6xl font-extrabold mt-2 tracking-tight">
                              {showGlobalMargin ? `${stats.totalCompanyMargin.toLocaleString()} PLN` : '• • • • • • PLN'}
                           </p>
                           <p className="text-xs md:text-sm text-indigo-200 mt-4 font-medium opacity-80">
                              Całkowita suma marż (zysk przed kosztami stałymi).
                           </p>
                        </div>
                     </div>
                  </div>
               )}

               {/* Date Filter Bar */}
               <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200 gap-4">
                  <div className="flex items-center gap-4">
                     <div className="text-sm font-bold text-slate-500 ml-2 flex items-center whitespace-nowrap">
                        <Filter className="w-4 h-4 mr-2" /> Filtruj dane:
                     </div>
                     <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                        {['WEEK', 'MONTH', 'YEAR'].map(period => (
                           <button
                              key={period}
                              onClick={() => setStatsPeriod(period as StatsPeriod)}
                              className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                                 statsPeriod === period ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                              }`}
                           >
                              {period === 'WEEK' ? 'Tydzień' : period === 'MONTH' ? 'Miesiąc' : 'Rok'}
                           </button>
                        ))}
                        <button
                           onClick={() => setStatsPeriod('CUSTOM')}
                           className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                              statsPeriod === 'CUSTOM' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                           }`}
                        >
                           Zakres
                        </button>
                     </div>
                  </div>

                  {/* ADMIN USER FILTER */}
                  {isAdmin && (
                     <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
                        <div className="text-sm font-bold text-slate-500 flex items-center whitespace-nowrap">
                           <Globe className="w-4 h-4 mr-2" /> Widok:
                        </div>
                        <select 
                           value={dashboardUserFilter}
                           onChange={(e) => setDashboardUserFilter(e.target.value)}
                           className="p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                           <option value="ALL">Cała Firma (Global)</option>
                           <optgroup label="Tylko ja">
                              <option value={currentUser.id}>{currentUser.name}</option>
                           </optgroup>
                           <optgroup label="Handlowcy">
                              {users?.filter(u => u.role === UserRole.SALES && u.id !== currentUser.id).map(u => (
                                 <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                           </optgroup>
                        </select>
                     </div>
                  )}
                  
                  {statsPeriod === 'CUSTOM' && (
                     <div className="flex gap-2 items-center animate-fade-in">
                        <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)} className="p-1.5 border rounded-lg text-xs" />
                        <span className="text-slate-400">-</span>
                        <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)} className="p-1.5 border rounded-lg text-xs" />
                     </div>
                  )}
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                  {/* PV Only */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Sun className="w-6 h-6"/></div>
                        <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded">Tylko PV</span>
                     </div>
                     <div>
                        <p className="text-sm text-slate-500 font-medium">Sprzedane</p>
                        <p className="text-3xl font-bold text-slate-800">{stats.pvOnlyCount}</p>
                     </div>
                  </div>

                  {/* Hybrid (PV + Storage) */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-2 opacity-5"><Zap className="w-24 h-24"/></div>
                     <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Zap className="w-6 h-6"/></div>
                        <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">PV + Magazyn</span>
                     </div>
                     <div className="relative z-10">
                        <p className="text-sm text-slate-500 font-medium">Hybrydy</p>
                        <p className="text-3xl font-bold text-slate-800">{stats.hybridCount}</p>
                     </div>
                  </div>

                  {/* Storage Only */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-xl"><Battery className="w-6 h-6"/></div>
                        <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-1 rounded">Tylko Magazyn</span>
                     </div>
                     <div>
                        <p className="text-sm text-slate-500 font-medium">Rozbudowy</p>
                        <p className="text-3xl font-bold text-slate-800">{stats.storageOnlyCount}</p>
                     </div>
                  </div>

                  {/* Heat Pumps */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Flame className="w-6 h-6"/></div>
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded">Pompy Ciepła</span>
                     </div>
                     <div>
                        <p className="text-sm text-slate-500 font-medium">Sprzedane</p>
                        <p className="text-3xl font-bold text-slate-800">{stats.heatPumpCount}</p>
                     </div>
                  </div>

                  {/* Pellet */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Leaf className="w-6 h-6"/></div>
                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded">Kotły na Pellet</span>
                     </div>
                     <div>
                        <p className="text-sm text-slate-500 font-medium">Sprzedane</p>
                        <p className="text-3xl font-bold text-slate-800">{stats.pelletCount}</p>
                     </div>
                  </div>
               </div>
                  
               {/* PERSONAL COMMISSION TILE (If not admin viewing global) */}
               {(!isAdmin || dashboardUserFilter !== 'ALL') && (
                  <div className="mt-2">
                     <div 
                        onClick={() => setShowCommission(!showCommission)}
                        className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white cursor-pointer hover:shadow-xl transition-all relative overflow-hidden"
                     >
                        <div className="flex justify-between items-start mb-4 relative z-10">
                           <div className="p-3 bg-white/20 rounded-xl"><Wallet className="w-6 h-6"/></div>
                           <div className="p-2 bg-white/10 rounded-full">{showCommission ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</div>
                        </div>
                        <div className="relative z-10">
                           <p className="text-sm text-blue-100 font-medium">Twoja Prowizja (Wypłacona)</p>
                           <p className="text-3xl font-bold mt-1">{showCommission ? `${stats.earnedMargin.toLocaleString()} PLN` : '**** PLN'}</p>
                           
                           <div className="mt-3 pt-3 border-t border-white/20">
                              <div className="flex justify-between text-xs font-medium text-blue-100">
                                 <span>W trakcie realizacji:</span>
                                 <span className="font-bold">{showCommission ? `${stats.pendingMargin.toLocaleString()} PLN` : '****'}</span>
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               )}
               
               {/* Status Breakdown Section - Better Visuals */}
               <div className="mt-8">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                     <BarChart3 className="w-5 h-5 mr-2 text-slate-500" /> Statusy Realizacji
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                     <StatusCard label="Nowe" count={stats.statusCounts[InstallationStatus.NEW] || 0} color="bg-slate-100 text-slate-600" icon={Users} />
                     <StatusCard label="Audyt" count={stats.statusCounts[InstallationStatus.AUDIT] || 0} color="bg-blue-100 text-blue-600" icon={Calendar} />
                     <StatusCard label="Projekt" count={stats.statusCounts[InstallationStatus.PROJECT] || 0} color="bg-indigo-100 text-indigo-600" icon={FileText} />
                     <StatusCard label="Montaż" count={stats.statusCounts[InstallationStatus.INSTALLATION] || 0} color="bg-amber-100 text-amber-600" icon={Wrench} />
                     <StatusCard label="OSD / Dotacje" count={(stats.statusCounts[InstallationStatus.GRID_CONNECTION] || 0) + (stats.statusCounts[InstallationStatus.GRANT_APPLICATION] || 0)} color="bg-purple-100 text-purple-600" icon={Zap} />
                     <StatusCard label="Zakończone" count={stats.statusCounts[InstallationStatus.COMPLETED] || 0} color="bg-green-100 text-green-600" icon={CheckCircle} />
                  </div>
               </div>

               {/* Recent Installs - Better Table/List */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-8 mt-8">
                  <div className="p-6 border-b border-slate-100">
                     <h3 className="font-bold text-slate-800">Nadchodzące Montaże</h3>
                  </div>
                  <div className="overflow-x-auto">
                     <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                           <tr>
                              <th className="p-4">Data</th>
                              <th className="p-4">Klient</th>
                              <th className="p-4">Adres</th>
                              <th className="p-4">Moc PV</th>
                              <th className="p-4">Magazyn</th>
                              <th className="p-4 text-right">Status</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                           {stats.filteredInstalls.filter(i => i.status === InstallationStatus.INSTALLATION || i.status === InstallationStatus.PROJECT).slice(0, 10).map(inst => (
                              <tr key={inst.id} onClick={() => onNavigateToCustomer(inst.customerId)} className="hover:bg-blue-50 cursor-pointer transition-colors">
                                 <td className="p-4 font-bold text-slate-700">{inst.dateScheduled || <span className="text-slate-400 italic">Do ustalenia</span>}</td>
                                 <td className="p-4 font-bold text-slate-800">{getCustomerName(inst.customerId, customers)}</td>
                                 <td className="p-4 text-slate-500 truncate max-w-[200px]">{inst.address}</td>
                                 <td className="p-4 font-bold text-amber-600"><span className="bg-amber-50 px-2 py-1 rounded border border-amber-100">{inst.systemSizeKw} kWp</span></td>
                                 <td className="p-4 font-bold text-green-600">
                                    {inst.storageSizeKw ? (
                                       <span className="bg-green-50 px-2 py-1 rounded border border-green-100">{inst.storageSizeKw} kWh</span>
                                    ) : (
                                       <span className="text-slate-300">-</span>
                                    )}
                                 </td>
                                 <td className="p-4 text-right">
                                    <span className={`text-[10px] uppercase font-extrabold px-2 py-1 rounded ${
                                       inst.status === InstallationStatus.INSTALLATION ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                       {inst.status}
                                    </span>
                                 </td>
                              </tr>
                           ))}
                           {stats.filteredInstalls.length === 0 && (
                              <tr>
                                 <td colSpan={6} className="p-8 text-center text-slate-400">Brak zaplanowanych montaży w wybranym okresie.</td>
                              </tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

         {/* TAB: NOTIFICATIONS */}
         {activeTab === 'NOTIFICATIONS' && (
            <NotificationsCenter 
               notifications={notifications}
               onMarkAsRead={onMarkAsRead}
               onMarkAsUnread={onMarkAsUnread}
               onMarkAllAsRead={onMarkAllAsRead}
               onDeleteNotification={onDeleteNotification}
               onNavigate={onNavigate}
            />
         )}

         {/* TAB: CALENDAR (FIXED & IMPROVED) */}
         {activeTab === 'CALENDAR' && (
            <div className="h-full flex flex-col animate-fade-in bg-white m-4 md:m-8 rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                  <div className="flex items-center space-x-4">
                     <h2 className="text-xl font-bold capitalize text-slate-800">
                        {currentDate.toLocaleDateString('pl-PL', {month:'long', year:'numeric'})}
                     </h2>
                     <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5 shadow-sm">
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronLeft className="w-5 h-5"/></button>
                        <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1))} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600"><ChevronRight className="w-5 h-5"/></button>
                     </div>
                  </div>
                  <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">Wróć do dzisiaj</button>
               </div>

               <div className="flex-1 overflow-y-auto flex flex-col min-h-0 relative">
                  <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 sticky top-0 z-10 shadow-sm">
                     {['Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota','Niedziela'].map((d, i) => (
                        <div key={d} className={`p-3 text-center text-xs font-bold uppercase tracking-wider ${i >= 5 ? 'text-red-400' : 'text-slate-500'}`}>
                           <span className="hidden md:inline">{d}</span>
                           <span className="md:hidden">{d.slice(0,3)}</span>
                        </div>
                     ))}
                  </div>
                  
                  <div className="grid grid-cols-7 bg-slate-200 gap-px auto-rows-fr">
                     {renderCalendar()}
                  </div>
               </div>
            </div>
         )}

         {/* TAB: SETTINGS (RESTORED WITH STICKY BUTTON) */}
         {activeTab === 'SETTINGS' && (
            <div className="h-full flex flex-col overflow-hidden relative">
               <div className="flex-1 overflow-y-auto p-4 md:p-8 animate-fade-in custom-scrollbar pb-48">
                  <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                     <h3 className="font-bold text-xl text-slate-800 mb-6 flex items-center">
                        <Settings className="w-6 h-6 mr-3 text-slate-500" /> Ustawienia Osobiste
                     </h3>
                     
                     {/* COMMISSION TILE */}
                     <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 rounded-2xl text-white shadow-lg mb-8">
                        <div className="flex justify-between items-center">
                           <div>
                              <p className="text-blue-100 font-bold text-sm uppercase tracking-wider mb-1">Twoja Stawka Prowizyjna</p>
                              <p className="text-4xl font-extrabold">{currentUser.commissionSplit || 0}%</p>
                              <p className="text-xs text-blue-200 mt-2 opacity-80">Procent marży naliczany do Twojego portfela.</p>
                           </div>
                           <div className="bg-white/20 p-4 rounded-full">
                              <Percent className="w-8 h-8 text-white" />
                           </div>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Location & General */}
                        <div className="space-y-6">
                           <div>
                              <label className="block text-sm font-bold text-slate-700 mb-2">Lokalizacja (Pogoda)</label>
                              <div className="flex gap-2">
                                 <input 
                                    type="text" 
                                    value={userSettings.location} 
                                    onChange={e => setUserSettings({...userSettings, location: e.target.value})} 
                                    className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="np. Warszawa"
                                 />
                              </div>
                           </div>
                           
                           <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                              <label className="flex items-center cursor-pointer">
                                 <div className="relative">
                                    <input 
                                       type="checkbox" 
                                       checked={userSettings.showRoiChart} 
                                       onChange={e => setUserSettings({...userSettings, showRoiChart: e.target.checked})}
                                       className="sr-only" 
                                    />
                                    <div className={`w-10 h-6 rounded-full shadow-inner transition-colors duration-300 ${userSettings.showRoiChart ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                    <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${userSettings.showRoiChart ? 'translate-x-4' : ''}`}></div>
                                 </div>
                                 <span className="ml-3 font-bold text-slate-700 text-sm">Pokaż wykres ROI w ofertach</span>
                              </label>
                              <p className="text-xs text-slate-500 mt-2 ml-14">
                                 Włącza widoczność wykresu zwrotu z inwestycji na podsumowaniu oferty dla klienta.
                              </p>
                           </div>
                        </div>

                        {/* Margins */}
                        <div className="space-y-6">
                           <div>
                              <h4 className="font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider">Domyślne Marże (Wycena)</h4>
                              
                              <div className="space-y-4">
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Narzut na samo PV (Panel)</label>
                                    <div className="relative">
                                       <input 
                                          type="number" 
                                          value={userSettings.marginPV === 0 ? '' : userSettings.marginPV} 
                                          onChange={e => setUserSettings({...userSettings, marginPV: e.target.value === '' ? 0 : Number(e.target.value)})}
                                          className="w-full pl-3 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                                       />
                                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">PLN</span>
                                    </div>
                                 </div>

                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Narzut na sam Magazyn Energii</label>
                                    <div className="relative">
                                       <input 
                                          type="number" 
                                          value={userSettings.marginStorage === 0 ? '' : userSettings.marginStorage} 
                                          onChange={e => setUserSettings({...userSettings, marginStorage: e.target.value === '' ? 0 : Number(e.target.value)})}
                                          className="w-full pl-3 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                                       />
                                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">PLN</span>
                                    </div>
                                 </div>

                                 <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                                    <label className="block text-xs font-bold text-indigo-700 uppercase mb-1 flex items-center">
                                       <Zap className="w-3 h-3 mr-1" /> Narzut na Zestaw PV + Magazyn
                                    </label>
                                    <div className="relative">
                                       <input 
                                          type="number" 
                                          value={userSettings.marginHybrid === 0 ? '' : userSettings.marginHybrid} 
                                          onChange={e => setUserSettings({...userSettings, marginHybrid: e.target.value === '' ? 0 : Number(e.target.value)})}
                                          className="w-full pl-3 pr-12 py-3 border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-900"
                                       />
                                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 font-bold pointer-events-none">PLN</span>
                                    </div>
                                    <p className="text-[10px] text-indigo-500 mt-1">
                                       Zastępuje sumę marż przy wyborze obu składników w kalkulatorze PV.
                                    </p>
                                 </div>

                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Narzut na Pompy Ciepła</label>
                                    <div className="relative">
                                       <input 
                                          type="number" 
                                          value={userSettings.marginHeat === 0 ? '' : userSettings.marginHeat} 
                                          onChange={e => setUserSettings({...userSettings, marginHeat: e.target.value === '' ? 0 : Number(e.target.value)})}
                                          className="w-full pl-3 pr-12 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-slate-800"
                                       />
                                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold pointer-events-none">PLN</span>
                                    </div>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                     
                     {/* Extra space at bottom to ensure last field is visible above sticky footer */}
                     <div className="h-16"></div>
                  </div>
               </div>

               {/* Sticky Footer Save Button - Always Visible */}
               <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-lg z-30 flex justify-end">
                  <div className="max-w-4xl w-full mx-auto flex justify-end">
                     <button 
                        onClick={handleSaveSettings}
                        className={`px-8 py-3 rounded-xl font-bold shadow-lg flex items-center transition-all hover:scale-105 active:scale-95 ${
                           isSavingSettings 
                              ? 'bg-green-600 text-white hover:bg-green-700' 
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                     >
                        {isSavingSettings ? (
                           <>
                              <CheckCircle className="w-5 h-5 mr-2" /> Zapisano!
                           </>
                        ) : (
                           <>
                              <Save className="w-5 h-5 mr-2" /> Zapisz Ustawienia
                           </>
                        )}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>

      {/* Task Creation Modal */}
      {showTaskModal && (
         <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg relative">
               <button onClick={() => setShowTaskModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-colors"><X className="w-6 h-6"/></button>
               
               <h3 className="text-xl font-bold text-slate-800 mb-1">Nowe Zadanie</h3>
               <p className="text-sm text-slate-500 mb-6 flex items-center">
                  <Calendar className="w-4 h-4 mr-1.5 opacity-70" />
                  {new Date(selectedDate).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
               </p>
               
               <div className="space-y-5">
                  {/* Task Types with Emojis */}
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Typ Zadania</label>
                     <div className="flex gap-2">
                        <button onClick={() => setNewTaskType('MEETING')} className={`flex-1 py-3 rounded-xl border text-sm font-bold flex items-center justify-center transition-all ${newTaskType === 'MEETING' ? 'bg-purple-50 border-purple-500 text-purple-700 ring-1 ring-purple-500 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                           <span className="mr-2 text-lg">📅</span> Spotkanie
                        </button>
                        <button onClick={() => setNewTaskType('CALL')} className={`flex-1 py-3 rounded-xl border text-sm font-bold flex items-center justify-center transition-all ${newTaskType === 'CALL' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                           <span className="mr-2 text-lg">📞</span> Telefon
                        </button>
                        <button onClick={() => setNewTaskType('TODO')} className={`flex-1 py-3 rounded-xl border text-sm font-bold flex items-center justify-center transition-all ${newTaskType === 'TODO' ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500 shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                           <span className="mr-2 text-lg">📋</span> Inne
                        </button>
                     </div>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tytuł Zadania</label>
                     <div className="relative">
                        <PenBox className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                           type="text" 
                           value={newTaskTitle} 
                           onChange={e => setNewTaskTitle(e.target.value)} 
                           className="w-full pl-9 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium bg-white shadow-sm" 
                           placeholder="np. Rozmowa o ofercie PV" 
                           autoFocus
                        />
                     </div>
                  </div>

                  {/* Customer Linking & Details */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                     <label className="block text-xs font-bold text-slate-500 uppercase">Powiązany Klient</label>
                     <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                           type="text" 
                           value={newTaskCustomerName} 
                           onChange={e => { setNewTaskCustomerName(e.target.value); setShowCustomerSuggestions(true); }}
                           className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                           placeholder="Wpisz nazwisko, aby wyszukać..."
                        />
                        {showCustomerSuggestions && filteredCustomerSuggestions.length > 0 && (
                           <div className="absolute top-full left-0 w-full bg-white border border-slate-200 shadow-xl rounded-xl mt-1 z-50 overflow-hidden max-h-48 overflow-y-auto">
                              {filteredCustomerSuggestions.map(c => (
                                 <div 
                                    key={c.id} 
                                    onClick={() => handleSelectCustomer(c)}
                                    className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                 >
                                    <p className="font-bold text-sm text-slate-800">{c.name}</p>
                                    <p className="text-xs text-slate-500 truncate">{c.address}</p>
                                 </div>
                              ))}
                           </div>
                        )}
                     </div>
                     
                     <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                           <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                           <input 
                              type="text" 
                              placeholder="Telefon"
                              value={newTaskPhone}
                              onChange={e => setNewTaskPhone(e.target.value)}
                              className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                           />
                        </div>
                        <div className="relative">
                           <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                           <input 
                              type="text" 
                              placeholder="Adres"
                              value={newTaskAddress}
                              onChange={e => setNewTaskAddress(e.target.value)}
                              className="w-full pl-8 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm bg-white"
                           />
                        </div>
                     </div>
                  </div>

                  {/* Delegation Selector - Hidden if Self Assign Mode */}
                  {!isSelfAssignMode && (
                     <div className="bg-blue-50 p-3 rounded-xl border border-blue-100 transition-all">
                        <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Przypisz zadanie do</label>
                        <div className="relative">
                           <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 pointer-events-none" />
                           <select 
                              value={taskAssigneeId} 
                              onChange={(e) => setTaskAssigneeId(e.target.value)}
                              className="w-full pl-10 pr-3 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-bold text-slate-700 cursor-pointer"
                           >
                              <option value="">-- Wybierz pracownika --</option>
                              <optgroup label="Inni pracownicy">
                                {users.filter(u => u.id !== currentUser.id).map(u => (
                                   <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                ))}
                              </optgroup>
                           </select>
                        </div>
                        <p className="text-[10px] text-blue-600 mt-1 ml-1">
                           Zadanie zostanie dodane do kalendarza wybranego pracownika.
                        </p>
                     </div>
                  )}
               </div>

               <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                  <button onClick={() => setShowTaskModal(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Anuluj</button>
                  <button onClick={handleCreateTask} disabled={!newTaskTitle} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all">Zapisz Zadanie</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

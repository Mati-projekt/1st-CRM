
// ... (imports)
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Installation, InstallationStatus, InventoryItem, Customer, ViewState, User, UserRole, Task, Message, SalesSettings, TaskType, AppNotification } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Zap, Users, Wallet, ArrowRight, Sun, Calendar, Plus, X, CloudRain, CloudSun, MapPin, Loader2, Battery, Flame, Mail, Settings, BarChart3, CalendarDays, ChevronLeft, ChevronRight, MessageSquare, Send, Save, RefreshCw, ToggleLeft, ToggleRight, Percent, Wrench, CheckSquare, Phone, Briefcase, FileText, UserCircle, Edit2, Trash2, UserPlus, Search, UserCheck, Eye, EyeOff, RotateCcw, Check, Bell, MoreVertical, PenBox, Clock, LogOut, Filter, Square, Globe, Banknote, Leaf, Shovel, AlertOctagon, XCircle, Hammer } from 'lucide-react';
import { NotificationsCenter } from './NotificationsCenter';

// ... (Interface & Constants remain same)
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

// ... (CalendarEvent interface & Holidays const)
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
   installationType?: 'PV' | 'PVME' | 'ME' | 'HEAT'; // Added for styling
}

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

const getInstallationType = (inst: Installation): 'PV' | 'PVME' | 'ME' | 'HEAT' => {
   if (inst.type === 'HEATING') return 'HEAT';
   if (inst.type === 'PV_STORAGE') return 'PVME';
   if (inst.type === 'PV') return 'PV';
   if (inst.type === 'ME') return 'ME';

   // Fallback for older records
   const hasPV = inst.systemSizeKw > 0;
   const hasStorage = inst.storageSizeKw && inst.storageSizeKw > 0;
   
   if (hasPV && hasStorage) return 'PVME';
   if (hasPV) return 'PV';
   if (hasStorage) return 'ME';
   return 'HEAT'; // Default to Heat if no PV/Storage but exists (e.g. systemSizeKw === 0)
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
    marginPellet: currentUser.salesSettings?.marginPellet || 0, // NEW field
    marginStorage: currentUser.salesSettings?.marginStorage || 0,
    marginHybrid: currentUser.salesSettings?.marginHybrid || 0, 
    showRoiChart: currentUser.salesSettings?.showRoiChart ?? true, 
    trenchCostPerMeter: currentUser.salesSettings?.trenchCostPerMeter || 40,
    trenchFreeMeters: currentUser.salesSettings?.trenchFreeMeters || 0, // NEW field for free meters
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // ... (Rest of state remains same)
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
  const isAdmin = currentUser.role === UserRole.ADMIN;

  // Filter notifications based on role before counting to fix badge discrepancy
  const unreadNotificationsCount = useMemo(() => {
     let visible = notifications;
     // Only Admin and Office can see STOCK notifications
     const canSeeStock = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OFFICE;
     if (!canSeeStock) {
        visible = visible.filter(n => n.category !== 'STOCK');
     }
     return visible.filter(n => !n.read).length;
  }, [notifications, currentUser]);

  const getCustomerName = (id: string, list: Customer[]) => {
    const c = list.find(cust => cust.id === id);
    return c ? c.name : 'Nieznany';
  };

  // ... (Filtered Customer Suggestions, Weather Fetch, Stats Logic, Calendar Logic remain the same)
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
       // Only filter NEW (Leads) out of stats. Keep Drop and others for specific counters.
       if (i.status === InstallationStatus.NEW) return false;

       // If it has a date, check range. If NO date, it means accepted but unscheduled -> INCLUDE IT.
       if (!i.dateScheduled) {
          return true; 
       }
       const iDate = new Date(i.dateScheduled);
       return iDate >= startDate && (statsPeriod === 'CUSTOM' ? iDate <= endDate : true);
    });

    let pvOnlyCount = 0;
    let storageOnlyCount = 0;
    let hybridCount = 0; 
    let heatingCount = 0; 
    
    // NEW COUNTERS
    let rescueCount = 0;
    let dropCount = 0;

    let earnedMargin = 0;
    let pendingMargin = 0;
    let totalCompanyMargin = 0;
    let totalGrossRevenue = 0;
    
    // Personal split percentage 
    const splitPercentage = (currentUser.commissionSplit || 0) / 100;

    filteredInstalls.forEach(i => {
       // --- STATUS COUNTERS FOR DASHBOARD TILES ---
       if (i.status === InstallationStatus.DROP) {
          dropCount++;
          return; // Skip revenue calc for drops
       }
       
       if (i.status === InstallationStatus.CONTRACT_RESCUE) {
          rescueCount++;
       }

       // --- COUNTING LOGIC (Prioritize Explicit Type) ---
       if (i.type === 'HEATING') {
          heatingCount++;
       } else if (i.type === 'PV_STORAGE') {
          hybridCount++;
       } else if (i.type === 'PV') {
          pvOnlyCount++;
       } else if (i.type === 'ME') {
          storageOnlyCount++;
       } else {
          // Fallback logic
          const hasPV = i.systemSizeKw > 0;
          const hasStorage = i.storageSizeKw && i.storageSizeKw > 0;
          
          if (hasPV && hasStorage) {
             hybridCount++;
          } else if (hasPV) {
             pvOnlyCount++;
          } else if (hasStorage) {
             storageOnlyCount++;
          } else {
             heatingCount++;
          }
       }

       // --- FINANCIAL LOGIC ---
       let dealMargin = i.commissionValue !== undefined ? Number(i.commissionValue) : 0;
       
       // Fallback margin calc if not set on installation
       if (!dealMargin) { 
           if (i.type === 'PV_STORAGE') {
              dealMargin += (userSettings.marginHybrid || 0); 
           } else {
              if (i.systemSizeKw > 0) dealMargin += userSettings.marginPV;
              if (i.storageSizeKw) dealMargin += userSettings.marginStorage;
           }
       }
       
       // CONTRACTED JOBS Logic
       const contractedStatuses = [
          InstallationStatus.CONTRACT,
          InstallationStatus.CONTRACT_RESCUE, // Include rescue as signed revenue (until dropped)
          InstallationStatus.PROJECT,
          InstallationStatus.INSTALLATION,
          InstallationStatus.GRID_CONNECTION,
          InstallationStatus.GRANT_APPLICATION,
          InstallationStatus.COMPLETED
       ];
       
       if (contractedStatuses.includes(i.status) || i.status === InstallationStatus.AUDIT) {
          totalCompanyMargin += dealMargin;
          totalGrossRevenue += i.price; 
          earnedMargin += (dealMargin * splitPercentage);
       } else if (i.status !== InstallationStatus.NEW) {
          pendingMargin += (dealMargin * splitPercentage);
       }
    });

    const statusCounts = filteredInstalls.reduce((acc, curr) => {
       acc[curr.status] = (acc[curr.status] || 0) + 1;
       return acc;
    }, {} as Record<string, number>);

    return { 
       pvOnlyCount, storageOnlyCount, hybridCount, heatingCount,
       rescueCount, dropCount, // Exposed for UI
       earnedMargin, pendingMargin,
       totalKW: filteredInstalls.reduce((acc, curr) => acc + curr.systemSizeKw, 0),
       statusCounts,
       filteredInstalls,
       totalCompanyMargin,
       totalGrossRevenue
    };
  }, [installations, inventory, customers, currentUser, statsPeriod, userSettings, customDateStart, customDateEnd, dashboardUserFilter]);

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
           storageSizeKw: inst.storageSizeKw,
           installationType: getInstallationType(inst)
        });
     });
     return events;
  }, [tasks, installations, customers, currentUser]);

  const upcomingInstallations = useMemo(() => {
     let relevant = installations;
     if (dashboardUserFilter !== 'ALL') {
        const myCustIds = customers.filter(c => c.repId === dashboardUserFilter).map(c => c.id);
        relevant = installations.filter(i => myCustIds.includes(i.customerId));
     }
     
     return relevant
        .filter(i => i.dateScheduled && new Date(i.dateScheduled) >= new Date(new Date().setHours(0,0,0,0)) && i.status !== InstallationStatus.COMPLETED && i.status !== InstallationStatus.DROP)
        .sort((a, b) => new Date(a.dateScheduled!).getTime() - new Date(b.dateScheduled!).getTime())
        .slice(0, 5);
  }, [installations, customers, dashboardUserFilter]);

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

  // ... (renderCalendar, StatusCard remain same)
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
                 {dayEvents.slice(0, 3).map(ev => {
                    let evClass = 'bg-blue-100 text-blue-700 border-blue-200';
                    if (ev.type === 'INSTALLATION') {
                        if (ev.installationType === 'HEAT') evClass = 'bg-red-100 text-red-800 border-red-200';
                        else if (ev.installationType === 'PVME') evClass = 'bg-indigo-100 text-indigo-800 border-indigo-200';
                        else if (ev.installationType === 'ME') evClass = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                        else evClass = 'bg-amber-100 text-amber-800 border-amber-200';
                    } else if (ev.status === 'COMPLETED') {
                        evClass = 'bg-slate-100 text-slate-400 line-through';
                    }

                    return (
                       <div key={ev.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate border border-transparent ${evClass}`}>
                          {ev.taskType === 'MEETING' ? '📅 ' : ev.taskType === 'CALL' ? '📞 ' : ''}{ev.title}
                       </div>
                    );
                 })}
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
         {/* ... (Header content) ... */}
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
               <h1 className="text-2xl font-bold text-slate-800">Pulpit</h1>
               <p className="text-sm text-slate-500">Witaj, {currentUser.name}</p>
            </div>
            
            <div className="flex items-center bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg w-full md:w-auto">
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
                  className={`flex items-center px-4 py-2.5 rounded-t-lg font-bold text-sm transition-all border-b-2 relative whitespace-nowrap ${activeTab === tab.id ? 'bg-slate-50 border-blue-600 text-blue-600' : 'bg-white border-transparent text-slate-500 hover:text-slate-800'}`}
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
            <div className="h-full overflow-y-auto p-3 md:p-8 space-y-6 md:space-y-8 animate-fade-in custom-scrollbar">
               {/* ... (Previous Overview Content) ... */}
               {/* ADMIN TILES ROW */}
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
                              Suma wartości wszystkich podpisanych umów (bez statusu Nowy/Audyt i Spadek).
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
                  {/* ... (Filters) ... */}
                  <div className="flex items-center gap-4 w-full md:w-auto overflow-x-auto">
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
                     <div className="flex items-center gap-2 border-t md:border-t-0 md:border-l border-slate-100 pt-2 md:pt-0 md:pl-4 w-full md:w-auto">
                        <div className="text-sm font-bold text-slate-500 flex items-center whitespace-nowrap">
                           <Globe className="w-4 h-4 mr-2" /> Widok:
                        </div>
                        <select 
                           value={dashboardUserFilter}
                           onChange={(e) => setDashboardUserFilter(e.target.value)}
                           className="p-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
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
                     <div className="flex gap-2 items-center animate-fade-in w-full md:w-auto justify-center">
                        <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)} className="p-1.5 border rounded-lg text-xs" />
                        <span className="text-slate-400">-</span>
                        <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)} className="p-1.5 border rounded-lg text-xs" />
                     </div>
                  )}
               </div>

               {/* Stats Grid - Same as before */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

                  {/* Heating Systems (Combined) */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl"><Flame className="w-6 h-6"/></div>
                        <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded">Systemy Grzewcze</span>
                     </div>
                     <div>
                        <p className="text-sm text-slate-500 font-medium">Sprzedane</p>
                        <p className="text-3xl font-bold text-slate-800">{stats.heatingCount}</p>
                        <p className="text-[10px] text-slate-400 mt-1">Pompy ciepła i Kotły</p>
                     </div>
                  </div>
               </div>

               {/* --- INSTALLATION STAGES (RESTORED) --- */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center">
                     <Wrench className="w-5 h-5 mr-2 text-slate-500" /> Etapy Realizacji (Aktualny Okres)
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                     <StatusCard label="Audyt" count={stats.statusCounts[InstallationStatus.AUDIT] || 0} color="bg-blue-100 text-blue-700" icon={FileText} />
                     <StatusCard label="Umowa" count={stats.statusCounts[InstallationStatus.CONTRACT] || 0} color="bg-indigo-100 text-indigo-700" icon={FileText} />
                     <StatusCard label="Projekt" count={stats.statusCounts[InstallationStatus.PROJECT] || 0} color="bg-violet-100 text-violet-700" icon={PenBox} />
                     <StatusCard label="Montaż" count={stats.statusCounts[InstallationStatus.INSTALLATION] || 0} color="bg-amber-100 text-amber-700" icon={Hammer} />
                     <StatusCard label="OSD" count={stats.statusCounts[InstallationStatus.GRID_CONNECTION] || 0} color="bg-purple-100 text-purple-700" icon={Zap} />
                     <StatusCard label="Zakończone" count={stats.statusCounts[InstallationStatus.COMPLETED] || 0} color="bg-green-100 text-green-700" icon={CheckCircle} />
                     {/* Added Rescue and Drop Tiles */}
                     <StatusCard label="Do Uratowania" count={stats.rescueCount} color="bg-orange-100 text-orange-700" icon={AlertOctagon} />
                     <StatusCard label="Spadek" count={stats.dropCount} color="bg-red-100 text-red-700" icon={XCircle} />
                  </div>
               </div>

               {/* --- UPCOMING INSTALLATIONS LIST (RESTORED) --- */}
               <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                     <h3 className="font-bold text-lg text-slate-800 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-blue-600" /> Nadchodzące Montaże
                     </h3>
                     <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Najbliższe 5</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                     {upcomingInstallations.length > 0 ? (
                        upcomingInstallations.map(inst => {
                           const customer = customers.find(c => c.id === inst.customerId);
                           const type = getInstallationType(inst);
                           return (
                              <div key={inst.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between cursor-pointer" onClick={() => onNavigateToCustomer(inst.customerId)}>
                                 <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center text-xs font-bold border ${
                                       type === 'HEAT' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
                                    }`}>
                                       <span>{inst.dateScheduled ? new Date(inst.dateScheduled).getDate() : '?'}</span>
                                       <span className="text-[10px] uppercase">{inst.dateScheduled ? new Date(inst.dateScheduled).toLocaleString('pl-PL', { month: 'short' }) : '-'}</span>
                                    </div>
                                    <div>
                                       <h4 className="font-bold text-slate-800">{customer?.name || 'Klient'}</h4>
                                       <p className="text-xs text-slate-500 flex items-center mt-1">
                                          <MapPin className="w-3 h-3 mr-1" /> {inst.address ? inst.address.split(',')[0] : 'Brak adresu'}
                                       </p>
                                    </div>
                                 </div>
                                 <div className="text-right hidden sm:block">
                                    <span className={`text-xs font-bold px-2 py-1 rounded-lg border ${
                                       type === 'HEAT' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                                    }`}>
                                       {type === 'HEAT' ? 'Ogrzewanie' : `${inst.systemSizeKw} kWp`}
                                    </span>
                                 </div>
                              </div>
                           );
                        })
                     ) : (
                        <div className="p-8 text-center text-slate-400">
                           <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                           <p className="text-sm">Brak nadchodzących montaży.</p>
                        </div>
                     )}
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
            </div>
         )}
         {/* ... (rest of Dashboard unchanged) */}

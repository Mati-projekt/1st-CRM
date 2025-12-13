
import React, { useMemo, useState, useEffect } from 'react';
import { Installation, InstallationStatus, InventoryItem, Customer, ViewState, User, UserRole, Task, Message, SalesSettings, TaskType, AppNotification } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Zap, Users, Wallet, ArrowRight, Sun, Calendar, Plus, X, CloudRain, CloudSun, MapPin, Loader2, Battery, Flame, Mail, Settings, BarChart3, CalendarDays, ChevronLeft, ChevronRight, MessageSquare, Send, Save, RefreshCw, ToggleLeft, ToggleRight, Percent, Wrench, CheckSquare, Phone, Briefcase, FileText, UserCircle, Edit2, Trash2, UserPlus, Search, UserCheck, Eye, EyeOff, RotateCcw, Check, Bell, MoreVertical, PenBox, Clock, LogOut, Filter, Square, Globe, Banknote, Leaf, Shovel, AlertOctagon, XCircle, Hammer } from 'lucide-react';
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
   installationType?: 'PV' | 'PVME' | 'ME' | 'HEAT';
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

   const hasPV = inst.systemSizeKw > 0;
   const hasStorage = inst.storageSizeKw && inst.storageSizeKw > 0;
   
   if (hasPV && hasStorage) return 'PVME';
   if (hasPV) return 'PV';
   if (hasStorage) return 'ME';
   return 'HEAT'; 
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

  const [dashboardUserFilter, setDashboardUserFilter] = useState<string>(currentUser.role === UserRole.ADMIN ? 'ALL' : currentUser.id);

  const [customDateStart, setCustomDateStart] = useState<string>(
     new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customDateEnd, setCustomDateEnd] = useState<string>(
     new Date().toISOString().split('T')[0]
  );
  
  const [userSettings, setUserSettings] = useState<SalesSettings>({
    location: currentUser.salesSettings?.location || 'Warszawa',
    marginPV: currentUser.salesSettings?.marginPV || 0,
    marginHeat: currentUser.salesSettings?.marginHeat || 0,
    marginPellet: currentUser.salesSettings?.marginPellet || 0,
    marginStorage: currentUser.salesSettings?.marginStorage || 0,
    marginHybrid: currentUser.salesSettings?.marginHybrid || 0, 
    showRoiChart: currentUser.salesSettings?.showRoiChart ?? true, 
    trenchCostPerMeter: currentUser.salesSettings?.trenchCostPerMeter || 40,
    trenchFreeMeters: currentUser.salesSettings?.trenchFreeMeters || 0,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false); 
  const [isSelfAssignMode, setIsSelfAssignMode] = useState(false);
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('TODO');
  const [newTaskCustomerName, setNewTaskCustomerName] = useState('');
  const [newTaskCustomerId, setNewTaskCustomerId] = useState<string | undefined>(undefined);
  const [newTaskPhone, setNewTaskPhone] = useState('');
  const [newTaskAddress, setNewTaskAddress] = useState('');
  
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);

  const [taskAssigneeId, setTaskAssigneeId] = useState<string>(currentUser.id);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  const canDelegate = true;
  const isAdmin = currentUser.role === UserRole.ADMIN;

  const unreadNotificationsCount = useMemo(() => {
     let visible = notifications;
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

  const stats = useMemo(() => {
    let relevantInstalls = installations;
    
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
       if (i.status === InstallationStatus.NEW) return false;

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
    
    let rescueCount = 0;
    let dropCount = 0;

    let earnedMargin = 0;
    let pendingMargin = 0;
    let totalCompanyMargin = 0;
    let totalGrossRevenue = 0;
    
    const splitPercentage = (currentUser.commissionSplit || 0) / 100;

    filteredInstalls.forEach(i => {
       if (i.status === InstallationStatus.DROP) {
          dropCount++;
          return;
       }
       
       if (i.status === InstallationStatus.CONTRACT_RESCUE) {
          rescueCount++;
       }

       if (i.type === 'HEATING') {
          heatingCount++;
       } else if (i.type === 'PV_STORAGE') {
          hybridCount++;
       } else if (i.type === 'PV') {
          pvOnlyCount++;
       } else if (i.type === 'ME') {
          storageOnlyCount++;
       } else {
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

       let dealMargin = i.commissionValue !== undefined ? Number(i.commissionValue) : 0;
       
       if (!dealMargin) { 
           if (i.type === 'PV_STORAGE') {
              dealMargin += (userSettings.marginHybrid || 0); 
           } else {
              if (i.systemSizeKw > 0) dealMargin += userSettings.marginPV;
              if (i.storageSizeKw) dealMargin += userSettings.marginStorage;
           }
       }
       
       const contractedStatuses = [
          InstallationStatus.CONTRACT,
          InstallationStatus.CONTRACT_RESCUE,
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
       rescueCount, dropCount,
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
     
     for (let i = 0; i < startDay - 1; i++) days.push(<div key={`empty-${i}`} className="bg-slate-50/50 border-b border-r border-slate-200 min-h-[100px]"></div>);
     
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
      
      <div className="bg-white border-b border-slate-200 px-4 py-4 md:px-8 shadow-sm z-10 shrink-0">
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
         
         {activeTab === 'OVERVIEW' && (
            <div className="h-full overflow-y-auto p-3 md:p-8 space-y-6 md:space-y-8 animate-fade-in custom-scrollbar">
               {dashboardUserFilter === 'ALL' && isAdmin && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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

               <div className="flex flex-col md:flex-row justify-between items-center bg-white p-2 rounded-xl shadow-sm border border-slate-200 gap-4">
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

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                     <StatusCard label="Do Uratowania" count={stats.rescueCount} color="bg-orange-100 text-orange-700" icon={AlertOctagon} />
                     <StatusCard label="Spadek" count={stats.dropCount} color="bg-red-100 text-red-700" icon={XCircle} />
                  </div>
               </div>

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
         
         {activeTab === 'CALENDAR' && (
            <div className="h-full overflow-y-auto p-3 md:p-8 custom-scrollbar">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
                 <div className="p-4 md:p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="flex items-center space-x-4">
                       <h3 className="text-lg md:text-2xl font-bold text-slate-800 capitalize">
                         {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                       </h3>
                       <div className="flex space-x-1 bg-white rounded-lg border border-slate-200 p-0.5">
                         <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1"><ChevronLeft className="w-5 h-5"/></button>
                         <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1"><ChevronRight className="w-5 h-5"/></button>
                         <div className="w-px h-6 bg-slate-100 mx-1"></div>
                         <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded">Dziś</button>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto p-2 md:p-6 pt-0 flex flex-col relative min-h-0">
                    <div className="grid grid-cols-7 gap-px mb-2 text-center min-w-[300px] shrink-0 sticky top-0 bg-white z-10 pt-4 pb-2 border-b border-slate-100">
                       {['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Ndz'].map((day, i) => (
                         <div key={day} className={`text-[10px] md:text-xs font-bold uppercase ${i >= 5 ? 'text-red-400' : 'text-slate-400'}`}>{day}</div>
                       ))}
                    </div>
                    <div className="grid grid-cols-7 border border-slate-200 bg-slate-200 gap-px rounded-xl overflow-hidden shadow-inner min-w-[300px] auto-rows-fr">
                       {renderCalendar()}
                    </div>
                 </div>
              </div>
            </div>
         )}
         
         {activeTab === 'NOTIFICATIONS' && (
             <NotificationsCenter 
                notifications={notifications || []}
                onMarkAsRead={onMarkAsRead || (() => {})}
                onMarkAsUnread={onMarkAsUnread || (() => {})}
                onMarkAllAsRead={onMarkAllAsRead || (() => {})}
                onDeleteNotification={onDeleteNotification || (() => {})}
                onNavigate={(v, id) => { if (onNavigate) onNavigate(v, id); }}
                currentUser={currentUser}
             />
         )}

         {activeTab === 'SETTINGS' && (
             <div className="h-full overflow-y-auto p-3 md:p-8 custom-scrollbar">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto">
                   <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center">
                      <Settings className="w-6 h-6 mr-2 text-slate-500" /> Ustawienia Osobiste
                   </h3>
                   
                   <div className="space-y-6">
                      <div>
                         <label className="block text-sm font-bold text-slate-600 mb-2">Lokalizacja (Pogoda)</label>
                         <input 
                           type="text" 
                           value={userSettings.location}
                           onChange={(e) => setUserSettings({...userSettings, location: e.target.value})}
                           className="w-full p-3 border border-slate-300 rounded-xl"
                        />
                      </div>
                      
                      {currentUser.role === UserRole.SALES && (
                      <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                         <h4 className="font-bold text-blue-800 mb-4 text-sm uppercase">Twoje Marże (Domyślne)</h4>
                         <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="block text-xs font-bold text-blue-600 mb-1">PV (%)</label>
                               <input type="number" value={userSettings.marginPV} onChange={e => setUserSettings({...userSettings, marginPV: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-blue-600 mb-1">Pompy Ciepła (PLN)</label>
                               <input type="number" value={userSettings.marginHeat} onChange={e => setUserSettings({...userSettings, marginHeat: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-blue-600 mb-1">Magazyny (PLN)</label>
                               <input type="number" value={userSettings.marginStorage} onChange={e => setUserSettings({...userSettings, marginStorage: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-blue-600 mb-1">Hybryda (PLN)</label>
                               <input type="number" value={userSettings.marginHybrid} onChange={e => setUserSettings({...userSettings, marginHybrid: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
                            </div>
                         </div>
                      </div>
                      )}
                      
                      <div className="flex justify-end pt-4 border-t border-slate-100">
                         <button 
                           onClick={handleSaveSettings}
                           disabled={isSavingSettings}
                           className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition-all disabled:opacity-70"
                         >
                            {isSavingSettings ? 'Zapisywanie...' : 'Zapisz Ustawienia'}
                         </button>
                      </div>
                   </div>
                </div>
             </div>
         )}
      </div>

      {showTaskModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
               <h3 className="text-lg font-bold mb-4">Nowe Zadanie ({selectedDate})</h3>
               
               <div className="space-y-4">
                   <input 
                       type="text" 
                       value={newTaskTitle}
                       onChange={(e) => setNewTaskTitle(e.target.value)}
                       placeholder="Tytuł zadania..."
                       className="w-full p-3 border border-slate-300 rounded-lg"
                   />
                   
                   <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                         type="text" 
                         value={newTaskCustomerName} 
                         onChange={(e) => { setNewTaskCustomerName(e.target.value); setShowCustomerSuggestions(true); }}
                         placeholder="Powiąż z klientem (opcjonalne)"
                         className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm"
                      />
                      {showCustomerSuggestions && filteredCustomerSuggestions.length > 0 && (
                         <div className="absolute z-10 w-full bg-white border border-slate-200 rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                            {filteredCustomerSuggestions.map(c => (
                               <div 
                                 key={c.id} 
                                 onClick={() => handleSelectCustomer(c)}
                                 className="p-2 hover:bg-blue-50 cursor-pointer text-sm"
                               >
                                  <div className="font-bold">{c.name}</div>
                                  <div className="text-xs text-slate-500">{c.address}</div>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                   
                   {canDelegate && (
                      <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">Przypisz do</label>
                         <select 
                           value={taskAssigneeId} 
                           onChange={(e) => setTaskAssigneeId(e.target.value)}
                           className="w-full p-2 border border-slate-300 rounded-lg text-sm"
                         >
                            <option value={currentUser.id}>Ja ({currentUser.name})</option>
                            {users?.filter(u => u.id !== currentUser.id).map(u => (
                               <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                         </select>
                      </div>
                   )}
               </div>

               <div className="flex justify-end space-x-2 mt-6">
                  <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-colors">Anuluj</button>
                  <button onClick={handleCreateTask} disabled={!newTaskTitle} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50">Dodaj</button>
               </div>
            </div>
         </div>
      )}

      {showDayDetailsModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-xl">
                  <h3 className="text-lg font-bold text-slate-800">Szczegóły dnia: {selectedDate}</h3>
                  <button onClick={() => setShowDayDetailsModal(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                  {calendarEvents.filter(e => e.date === selectedDate).length > 0 ? (
                     <div className="space-y-3">
                        {calendarEvents.filter(e => e.date === selectedDate).map(ev => (
                           <div key={ev.id} className="p-3 border rounded-lg shadow-sm flex items-start gap-3 bg-white">
                              <div className={`p-2 rounded-lg shrink-0 ${ev.type === 'INSTALLATION' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                 {ev.type === 'INSTALLATION' ? <Hammer className="w-5 h-5"/> : <CheckSquare className="w-5 h-5"/>}
                              </div>
                              <div className="flex-1 min-w-0">
                                 <h4 className="font-bold text-slate-800 text-sm truncate">{ev.title}</h4>
                                 <p className="text-xs text-slate-500 mt-1">{ev.type === 'INSTALLATION' ? `Status: ${ev.status}` : ev.customerName}</p>
                                 {ev.phone && <a href={`tel:${ev.phone}`} className="text-xs text-blue-600 hover:underline mt-1 block font-medium">{ev.phone}</a>}
                              </div>
                              {ev.type === 'TASK' && (
                                 <button 
                                    onClick={() => handleToggleTaskCompletion(ev.id, ev.status === 'COMPLETED')}
                                    className={`p-1 rounded-full border transition-all ${ev.status === 'COMPLETED' ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-transparent hover:border-green-500'}`}
                                 >
                                    <Check className="w-4 h-4" />
                                 </button>
                              )}
                           </div>
                        ))}
                     </div>
                  ) : (
                     <div className="text-center py-10 text-slate-400">
                        <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p>Brak zadań w tym dniu.</p>
                     </div>
                  )}
               </div>
               
               <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                  <button 
                     onClick={() => { setShowDayDetailsModal(false); setShowTaskModal(true); }}
                     className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-sm transition-colors flex items-center justify-center"
                  >
                     <Plus className="w-4 h-4 mr-2" /> Dodaj Zadanie
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};


import React, { useMemo, useState, useEffect } from 'react';
import { Installation, InstallationStatus, InventoryItem, Customer, ViewState, User, UserRole, Task, Message, SalesSettings, TaskType } from '../types';
import { TrendingUp, AlertTriangle, CheckCircle, Zap, Users, Wallet, ArrowRight, Sun, Calendar, Plus, X, CloudRain, CloudSun, MapPin, Loader2, Battery, Flame, Mail, Settings, BarChart3, CalendarDays, ChevronLeft, ChevronRight, MessageSquare, Send, Save, RefreshCw, ToggleLeft, ToggleRight, Percent, Wrench, CheckSquare, Phone, Briefcase, FileText, UserCircle, Edit2, Trash2, UserPlus, Search, UserCheck } from 'lucide-react';

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
  onNavigateToCustomer: (customerId: string) => void; // New prop for navigation
  onUpdateTaskDetails?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  users?: User[]; // For task delegation
}

const WEATHER_API_KEY = 'c2c69b309bf74c33822224731250612';

type DashboardTab = 'OVERVIEW' | 'CALENDAR' | 'MESSAGES' | 'SETTINGS';
type StatsPeriod = 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM';

interface CalendarEvent {
   id: string;
   type: 'TASK' | 'INSTALLATION';
   title: string;
   date: string;
   status?: string;
   details?: string;
   // Extended fields
   taskType?: TaskType;
   customerName?: string;
   phone?: string;
   address?: string;
   customerId?: string; // For navigation
   assignedTo?: string; // Who is this for?
   createdBy?: string; // Who created this?
}

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
  users = []
}) => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('OVERVIEW');
  const [statsPeriod, setStatsPeriod] = useState<StatsPeriod>('MONTH');
  
  // Custom Date Range State
  const [customDateStart, setCustomDateStart] = useState<string>(
     new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [customDateEnd, setCustomDateEnd] = useState<string>(
     new Date().toISOString().split('T')[0]
  );
  
  // Settings State
  const [userSettings, setUserSettings] = useState<SalesSettings>({
    location: currentUser.salesSettings?.location || 'Warszawa',
    marginPV: currentUser.salesSettings?.marginPV || 0,
    marginHeat: currentUser.salesSettings?.marginHeat || 0,
    marginStorage: currentUser.salesSettings?.marginStorage || 0,
    showRoiChart: currentUser.salesSettings?.showRoiChart ?? true, // Default true
  });

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Modals
  const [showDayDetailsModal, setShowDayDetailsModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false); 
  
  // New Task State
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<TaskType>('TODO');
  const [newTaskCustomerName, setNewTaskCustomerName] = useState('');
  const [newTaskPhone, setNewTaskPhone] = useState('');
  const [newTaskAddress, setNewTaskAddress] = useState('');
  
  // Task Delegation State
  const [taskAssigneeId, setTaskAssigneeId] = useState<string>(currentUser.id);
  const [assigneeSearch, setAssigneeSearch] = useState('');
  const [showAssigneeList, setShowAssigneeList] = useState(false);

  // Edit Task State
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

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

  const canDelegate = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OFFICE || currentUser.role === UserRole.SALES_MANAGER;

  // Filter users for delegation
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(assigneeSearch.toLowerCase()));

  // Fetch Weather
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
       if (currentUser.role === UserRole.SALES) {
          relevantInstalls = installations.filter(i => myCustIds.includes(i.customerId));
       }
    }

    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (statsPeriod === 'WEEK') {
        startDate.setDate(now.getDate() - 7);
    } else if (statsPeriod === 'MONTH') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of month
    } else if (statsPeriod === 'YEAR') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
    } else if (statsPeriod === 'CUSTOM') {
        startDate = new Date(customDateStart);
        endDate = new Date(customDateEnd);
        endDate.setHours(23, 59, 59, 999);
    }

    const filteredInstalls = relevantInstalls.filter(i => {
       const dateStr = i.dateScheduled || new Date().toISOString();
       const iDate = new Date(dateStr);
       return iDate >= startDate && (statsPeriod === 'CUSTOM' ? iDate <= endDate : true);
    });

    let pvCountTotal = 0;
    let pvCountSettled = 0;
    let storageCountTotal = 0;
    let storageCountSettled = 0;
    let heatCountTotal = 0;
    let heatCountSettled = 0;
    let earnedMargin = 0;
    let pendingMargin = 0;
    
    const splitPercentage = (currentUser.commissionSplit || 0) / 100;

    filteredInstalls.forEach(i => {
       const isCompleted = i.status === InstallationStatus.COMPLETED;
       
       const hasPV = i.systemSizeKw > 0;
       const hasStorage = i.storageSizeKw && i.storageSizeKw > 0;
       const hasHeat = i.notes?.toLowerCase().includes('pompa') || i.notes?.toLowerCase().includes('heat');

       if (hasPV) {
          pvCountTotal++;
          if (isCompleted) pvCountSettled++;
       }

       if (hasStorage && !hasPV) {
          storageCountTotal++;
          if (isCompleted) storageCountSettled++;
       }

       if (hasHeat) {
          heatCountTotal++;
          if (isCompleted) heatCountSettled++;
       }

       let dealMargin = 0;
       if (i.commissionValue !== undefined && i.commissionValue !== null) {
           dealMargin = Number(i.commissionValue);
       } else {
           if (hasPV) dealMargin += userSettings.marginPV;
           if (hasStorage) dealMargin += userSettings.marginStorage;
           if (hasHeat) dealMargin += userSettings.marginHeat;
       }
       
       dealMargin = dealMargin * splitPercentage;

       const realizedStatuses = [InstallationStatus.GRID_CONNECTION, InstallationStatus.GRANT_APPLICATION, InstallationStatus.COMPLETED];
       const pendingStatuses = [InstallationStatus.AUDIT, InstallationStatus.CONTRACT, InstallationStatus.PROJECT, InstallationStatus.INSTALLATION];

       if (realizedStatuses.includes(i.status)) {
          earnedMargin += dealMargin;
       } else if (pendingStatuses.includes(i.status)) {
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
  }, [installations, inventory, customers, currentUser, statsPeriod, userSettings, customDateStart, customDateEnd]);

  // --- CALENDAR EVENTS MERGE ---
  const calendarEvents = useMemo(() => {
     const events: CalendarEvent[] = [];

     // 1. Tasks (Show tasks assigned to me, OR tasks created by me if I am an admin)
     tasks.filter(t => t.assignedTo === currentUser.id || (canDelegate && t.createdBy === currentUser.id)).forEach(t => {
        events.push({
           id: t.id,
           type: 'TASK',
           title: t.title,
           date: t.date,
           status: t.completed ? 'COMPLETED' : 'PENDING',
           // Map new fields
           taskType: t.type || 'TODO',
           customerName: t.customerName,
           phone: t.phone,
           address: t.address,
           assignedTo: t.assignedTo,
           createdBy: t.createdBy
        });
     });

     // 2. Installations Sync
     const isSales = currentUser.role === UserRole.SALES;
     const myCustomerIds = customers.filter(c => c.repId === currentUser.id).map(c => c.id);

     installations.forEach(inst => {
        if (!inst.dateScheduled) return;
        
        // Visibility Check
        if (isSales && !myCustomerIds.includes(inst.customerId)) return;

        const customer = customers.find(c => c.id === inst.customerId);
        events.push({
           id: `inst-${inst.id}`,
           type: 'INSTALLATION',
           title: `Montaż: ${customer?.name || 'Klient'}`,
           date: inst.dateScheduled,
           status: inst.status,
           details: `${inst.systemSizeKw} kWp, ${inst.address}`,
           customerId: inst.customerId // For navigation
        });
     });

     return events;
  }, [tasks, installations, customers, currentUser, canDelegate]);

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

  // Helper to determine task style based on type
  const getTaskStyle = (taskType?: TaskType, completed?: boolean) => {
    if (completed) return 'bg-slate-100 text-slate-500 border-slate-200 line-through';
    switch (taskType) {
      case 'CALL': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'MEETING': return 'bg-violet-100 text-violet-700 border-violet-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200'; // TODO
    }
  };
  
  const getTaskIcon = (taskType?: TaskType, completed?: boolean) => {
    if (completed) return <CheckCircle className="w-5 h-5" />;
    switch (taskType) {
      case 'CALL': return <Phone className="w-5 h-5" />;
      case 'MEETING': return <Users className="w-5 h-5" />;
      default: return <CheckSquare className="w-5 h-5" />;
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
        assignedTo: taskAssigneeId || currentUser.id,
        createdBy: currentUser.id,
        type: newTaskType,
        customerName: newTaskCustomerName,
        phone: newTaskPhone,
        address: newTaskAddress
      });
      // Reset
      setNewTaskTitle('');
      setNewTaskType('TODO');
      setNewTaskCustomerName('');
      setNewTaskPhone('');
      setNewTaskAddress('');
      setTaskAssigneeId(currentUser.id); // Reset to self
      setShowTaskModal(false);
    }
  };

  const handleEditTaskSave = () => {
     if (taskToEdit && onUpdateTaskDetails) {
        onUpdateTaskDetails(taskToEdit);
        setTaskToEdit(null);
     }
  };

  const handleDeleteTaskAction = () => {
     if (taskToEdit && onDeleteTask) {
        if (window.confirm("Czy na pewno chcesz usunąć to zadanie?")) {
           onDeleteTask(taskToEdit.id);
           setTaskToEdit(null);
        }
     }
  };

  const handleDayClick = (dateStr: string) => {
     setSelectedDate(dateStr);
     setShowDayDetailsModal(true);
  };

  const handleEventClick = (ev: CalendarEvent) => {
    if (ev.type === 'INSTALLATION' && ev.customerId) {
       onNavigateToCustomer(ev.customerId);
       setShowDayDetailsModal(false);
    } else if (ev.type === 'TASK') {
       // Find original task object
       const originalTask = tasks.find(t => t.id === ev.id);
       if (originalTask) {
          setTaskToEdit({ ...originalTask });
          setShowDayDetailsModal(false); // Close day details to show edit modal
       }
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

  const handleAssigneeSelect = (userId: string) => {
     setTaskAssigneeId(userId);
     setAssigneeSearch('');
     setShowAssigneeList(false);
  };

  // Calendar Render
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
        
        const dayEvents = calendarEvents.filter(e => e.date === dateStr);
        
        const dateObj = new Date(year, month, d);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const mmdd = `${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isHoliday = holidays.includes(mmdd);
        const isToday = new Date().toDateString() === dateObj.toDateString();

        let bgClass = 'bg-white';
        if (isHoliday) bgClass = 'bg-red-100';
        else if (isWeekend) bgClass = 'bg-slate-50';

        days.push(
           <div 
             key={d} 
             onClick={() => handleDayClick(dateStr)}
             className={`min-h-[100px] border border-slate-100 p-2 relative hover:bg-blue-50 transition-colors cursor-pointer group flex flex-col ${bgClass} ${isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}
           >
              <div className="flex justify-between items-start">
                 <span className={`text-sm font-bold ${isHoliday ? 'text-red-500' : 'text-slate-700'}`}>{d}</span>
                 {isHoliday && <span className="text-[9px] text-red-500 uppercase font-bold tracking-tighter">Święto</span>}
              </div>
              <div className="mt-2 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
                 {dayEvents.map(ev => {
                    const styleClass = ev.type === 'INSTALLATION' 
                       ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                       : getTaskStyle(ev.taskType, ev.status === 'COMPLETED');
                    
                    const isDelegated = ev.type === 'TASK' && ev.assignedTo !== currentUser.id;

                    return (
                      <div 
                        key={ev.id} 
                        className={`text-[9px] px-1.5 py-0.5 rounded truncate font-medium border ${styleClass} ${isDelegated ? 'border-dashed opacity-80' : ''}`}
                        title={`${ev.title}${isDelegated ? ' (Delegowane)' : ''}`}
                      >
                         {ev.type === 'INSTALLATION' && <Wrench className="w-2 h-2 inline mr-1" />}
                         {ev.type === 'TASK' && ev.taskType === 'CALL' && <Phone className="w-2 h-2 inline mr-1" />}
                         {ev.type === 'TASK' && ev.taskType === 'MEETING' && <Users className="w-2 h-2 inline mr-1" />}
                         {ev.type === 'TASK' && isDelegated && <UserPlus className="w-2 h-2 inline mr-1" />}
                         {ev.title}
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
               {/* ... (Existing Stats UI preserved) ... */}
               <div className="flex flex-col md:flex-row justify-end items-end gap-2">
                  {statsPeriod === 'CUSTOM' && (
                     <div className="flex space-x-2 bg-white p-1 rounded-lg border border-slate-200">
                        <input type="date" value={customDateStart} onChange={e => setCustomDateStart(e.target.value)} className="text-xs p-1 border rounded" />
                        <span className="text-slate-400 self-center">-</span>
                        <input type="date" value={customDateEnd} onChange={e => setCustomDateEnd(e.target.value)} className="text-xs p-1 border rounded" />
                     </div>
                  )}
                  <div className="bg-white border border-slate-200 rounded-lg p-1 inline-flex">
                     {(['WEEK', 'MONTH', 'YEAR', 'CUSTOM'] as StatsPeriod[]).map(p => (
                        <button 
                           key={p} 
                           onClick={() => setStatsPeriod(p)}
                           className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${statsPeriod === p ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                        >
                           {p === 'WEEK' ? 'Tydzień' : p === 'MONTH' ? 'Miesiąc' : p === 'YEAR' ? 'Rok' : 'Zakres'}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Stats Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* ... PV, Storage, Heat, Commission cards (Kept same as before) ... */}
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

                  <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl shadow-lg text-white flex flex-col justify-between relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                     <div className="flex justify-between items-start mb-4 relative z-10">
                        <div className="p-3 bg-white/20 rounded-xl"><Wallet className="w-6 h-6"/></div>
                     </div>
                     <div className="relative z-10">
                        <p className="text-sm text-blue-100 font-medium">Prowizja ({currentUser.commissionSplit || 0}%)</p>
                        <p className="text-3xl font-bold mt-1">{stats.earnedMargin.toLocaleString()} PLN</p>
                        <p className="text-[10px] text-blue-200 mt-1 flex items-center">
                           <span className="opacity-70">W toku: {stats.pendingMargin.toLocaleString()} PLN</span>
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

         {/* TAB: MESSAGES (Unchanged) */}
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

         {/* TAB: SETTINGS (Unchanged) */}
         {activeTab === 'SETTINGS' && (
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 animate-fade-in">
               <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                  <Settings className="w-6 h-6 mr-2 text-slate-500" /> Ustawienia Osobiste
               </h3>
               {/* ... (Kept existing settings UI) ... */}
               <div className="space-y-6">
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
                        <BarChart3 className="w-5 h-5 mr-2 text-blue-600" /> Wygląd i Funkcje
                     </h4>
                     <div 
                        className="flex items-center justify-between p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50"
                        onClick={() => setUserSettings({...userSettings, showRoiChart: !userSettings.showRoiChart})}
                     >
                        <div>
                           <p className="font-bold text-slate-800">Pokaż wykres zwrotu z inwestycji (ROI)</p>
                           <p className="text-xs text-slate-500">Wyświetla wykres 20-letni w kalkulatorze (Krok 6).</p>
                        </div>
                        <div className={`transition-colors ${userSettings.showRoiChart ? 'text-green-600' : 'text-slate-300'}`}>
                           {userSettings.showRoiChart ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                        </div>
                     </div>
                  </div>
                  <div className="border-t border-slate-100 pt-6">
                     <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                        <Wallet className="w-5 h-5 mr-2 text-green-600" /> Automatyczna Marża (PLN)
                     </h4>
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
                  <div className="border-t border-slate-100 pt-6">
                     <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                        <Percent className="w-5 h-5 mr-2 text-indigo-600" /> Twój Podział Prowizji
                     </h4>
                     <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex justify-between items-center">
                        <div>
                           <p className="text-sm text-indigo-800 font-bold">Przypisany procent marży</p>
                           <p className="text-xs text-indigo-600">Wartość ustalona przez administratora.</p>
                        </div>
                        <span className="text-2xl font-bold text-indigo-700">{currentUser.commissionSplit || 0}%</span>
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

      {/* DAY DETAILS MODAL */}
      {showDayDetailsModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-2xl">
                   <h3 className="text-xl font-bold text-slate-800 flex items-center">
                      <Calendar className="w-6 h-6 mr-2 text-blue-600" />
                      {new Date(selectedDate).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}
                   </h3>
                   <button onClick={() => setShowDayDetailsModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                   {calendarEvents.filter(e => e.date === selectedDate).length > 0 ? (
                      calendarEvents.filter(e => e.date === selectedDate).map(ev => {
                         const isDelegated = ev.type === 'TASK' && ev.assignedTo !== currentUser.id;
                         const assigneeName = isDelegated && ev.assignedTo ? users.find(u => u.id === ev.assignedTo)?.name : 'Inny';
                         const creator = ev.type === 'TASK' && ev.createdBy ? users.find(u => u.id === ev.createdBy) : null;
                         const isSelfCreated = ev.createdBy === ev.assignedTo;

                         return (
                         <div 
                           key={ev.id} 
                           onClick={() => handleEventClick(ev)}
                           className={`p-4 rounded-xl border flex items-start space-x-3 transition-colors ${ev.type === 'INSTALLATION' || ev.type === 'TASK' ? 'cursor-pointer hover:shadow-md' : ''} ${
                               ev.type === 'INSTALLATION' 
                                 ? 'bg-indigo-50 border-indigo-100 hover:bg-indigo-100' 
                                 : getTaskStyle(ev.taskType, ev.status === 'COMPLETED').replace('bg-', 'hover:bg-opacity-80 bg-opacity-10 ').replace('border-', 'border-opacity-50 border-')
                           }`}
                         >
                             <div className={`p-2 rounded-lg shrink-0 ${
                                ev.type === 'INSTALLATION' ? 'bg-indigo-200 text-indigo-700' : 'bg-white bg-opacity-50'
                             }`}>
                                {ev.type === 'INSTALLATION' ? <Wrench className="w-5 h-5" /> : getTaskIcon(ev.taskType, ev.status === 'COMPLETED')}
                             </div>
                             <div className="flex-1">
                                <h4 className={`font-bold text-sm ${ev.type === 'INSTALLATION' ? 'text-indigo-900' : (ev.status === 'COMPLETED' ? 'text-slate-500 line-through' : 'text-slate-900')}`}>
                                   {ev.title}
                                </h4>
                                {ev.type === 'INSTALLATION' && (
                                   <p className="text-xs text-indigo-600 mt-1 flex items-center">
                                      <span className="underline">Przejdź do klienta</span> <ArrowRight className="w-3 h-3 ml-1" />
                                   </p>
                                )}
                                {ev.type === 'TASK' && (
                                   <div className="mt-2 text-xs space-y-1 opacity-80">
                                      {ev.phone && <div className="flex items-center"><Phone className="w-3 h-3 mr-1"/> {ev.phone}</div>}
                                      {ev.address && <div className="flex items-center"><MapPin className="w-3 h-3 mr-1"/> {ev.address}</div>}
                                      {ev.customerName && <div className="flex items-center"><UserCircle className="w-3 h-3 mr-1"/> {ev.customerName}</div>}
                                   </div>
                                )}
                                <div className="flex justify-between items-center mt-2 flex-wrap gap-2">
                                   <p className="text-[10px] uppercase font-bold tracking-wider opacity-50">
                                      {ev.type === 'INSTALLATION' ? 'Montaż' : (ev.taskType === 'CALL' ? 'Telefon' : ev.taskType === 'MEETING' ? 'Spotkanie' : 'Zadanie')}
                                   </p>
                                   <div className="flex gap-1">
                                       {isDelegated && (
                                          <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold flex items-center">
                                             <ArrowRight className="w-3 h-3 mr-1" /> Dla: {assigneeName}
                                          </span>
                                       )}
                                       {/* Show 'Assigned by' if creator is different from assignee and creator exists */}
                                       {!isSelfCreated && creator && (
                                           <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold flex items-center">
                                              <UserCheck className="w-3 h-3 mr-1" /> Zlecił: {creator.name}
                                           </span>
                                       )}
                                   </div>
                                </div>
                             </div>
                         </div>
                      )})
                   ) : (
                      <div className="text-center py-8 text-slate-400">
                         <Calendar className="w-12 h-12 mx-auto mb-2 opacity-20" />
                         <p>Brak zaplanowanych wydarzeń na ten dzień.</p>
                      </div>
                   )}
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50/50 rounded-b-2xl flex space-x-2">
                    <button 
                       onClick={() => { setShowDayDetailsModal(false); setTaskAssigneeId(currentUser.id); setShowTaskModal(true); }}
                       className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center transition-colors"
                    >
                       <Plus className="w-5 h-5 mr-2" /> Dodaj Zadanie
                    </button>
                    {canDelegate && (
                       <button 
                          onClick={() => { setShowDayDetailsModal(false); setTaskAssigneeId(''); setShowTaskModal(true); setTimeout(() => setShowAssigneeList(true), 100); }}
                          className="flex-1 bg-white hover:bg-slate-100 text-blue-600 border border-blue-200 font-bold py-3 rounded-xl flex items-center justify-center transition-colors"
                       >
                          <UserPlus className="w-5 h-5 mr-2" /> Zleć Zadanie
                       </button>
                    )}
                </div>
             </div>
         </div>
      )}

      {/* ADD TASK MODAL (Enhanced) */}
      {showTaskModal && (
         <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
               <h3 className="text-lg font-bold mb-4">Nowe Zadanie ({selectedDate})</h3>
               
               <div className="space-y-4">
                  {canDelegate && (
                     <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Przypisz do pracownika</label>
                         
                         {taskAssigneeId && taskAssigneeId !== currentUser.id ? (
                            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 p-2 rounded-lg">
                               <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold mr-3 text-xs">
                                     {users.find(u => u.id === taskAssigneeId)?.name.charAt(0)}
                                  </div>
                                  <div>
                                     <p className="text-sm font-bold text-slate-800">{users.find(u => u.id === taskAssigneeId)?.name}</p>
                                     <p className="text-[10px] text-slate-500">{users.find(u => u.id === taskAssigneeId)?.role}</p>
                                  </div>
                               </div>
                               <button onClick={() => setTaskAssigneeId('')} className="text-slate-400 hover:text-red-500 p-1">
                                  <X className="w-4 h-4" />
                               </button>
                            </div>
                         ) : taskAssigneeId === currentUser.id ? (
                            <div className="flex items-center justify-between bg-white border border-slate-200 p-2 rounded-lg cursor-pointer hover:border-blue-300" onClick={() => setTaskAssigneeId('')}>
                               <span className="text-sm font-bold text-slate-600 flex items-center"><UserCircle className="w-4 h-4 mr-2"/> Przypisz do siebie (Domyślnie)</span>
                               <span className="text-xs text-blue-600">Zmień</span>
                            </div>
                         ) : (
                            <div className="relative">
                               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                               <input 
                                  type="text" 
                                  placeholder="Wyszukaj pracownika..." 
                                  className="w-full pl-9 p-2 border border-blue-300 ring-2 ring-blue-100 rounded-lg text-sm bg-white"
                                  autoFocus
                                  value={assigneeSearch}
                                  onChange={(e) => { setAssigneeSearch(e.target.value); setShowAssigneeList(true); }}
                                  onFocus={() => setShowAssigneeList(true)}
                               />
                               {showAssigneeList && (
                                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50">
                                     {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                        <div 
                                          key={u.id} 
                                          onClick={() => handleAssigneeSelect(u.id)}
                                          className="flex items-center p-2 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0"
                                        >
                                           <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold mr-2 text-slate-600">
                                              {u.name.charAt(0)}
                                           </div>
                                           <div>
                                              <p className="text-sm font-bold text-slate-700">{u.name}</p>
                                              <p className="text-[10px] text-slate-400">{u.role}</p>
                                           </div>
                                        </div>
                                     )) : (
                                        <div className="p-3 text-center text-xs text-slate-400">Brak wyników</div>
                                     )}
                                  </div>
                               )}
                            </div>
                         )}
                     </div>
                  )}

                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Co masz do zrobienia?</label>
                     <input 
                        type="text" 
                        value={newTaskTitle} 
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        placeholder="np. Zadzwoń do Jana"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                     />
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Typ zadania</label>
                     <div className="flex gap-2">
                        <button 
                           onClick={() => setNewTaskType('CALL')}
                           className={`flex-1 p-2 border rounded-lg flex flex-col items-center justify-center transition-colors ${newTaskType === 'CALL' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'hover:bg-slate-50 border-slate-200'}`}
                        >
                           <Phone className="w-5 h-5 mb-1" />
                           <span className="text-xs font-bold">Telefon</span>
                        </button>
                        <button 
                           onClick={() => setNewTaskType('MEETING')}
                           className={`flex-1 p-2 border rounded-lg flex flex-col items-center justify-center transition-colors ${newTaskType === 'MEETING' ? 'bg-violet-50 border-violet-500 text-violet-700' : 'hover:bg-slate-50 border-slate-200'}`}
                        >
                           <Users className="w-5 h-5 mb-1" />
                           <span className="text-xs font-bold">Spotkanie</span>
                        </button>
                        <button 
                           onClick={() => setNewTaskType('TODO')}
                           className={`flex-1 p-2 border rounded-lg flex flex-col items-center justify-center transition-colors ${newTaskType === 'TODO' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-slate-50 border-slate-200'}`}
                        >
                           <CheckSquare className="w-5 h-5 mb-1" />
                           <span className="text-xs font-bold">Inne</span>
                        </button>
                     </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                     <p className="text-xs font-bold text-slate-400 uppercase mb-3">Szczegóły kontaktu (opcjonalne)</p>
                     
                     <div className="space-y-3">
                        <div className="relative">
                           <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                           <input 
                              type="text" 
                              value={newTaskCustomerName} 
                              onChange={(e) => setNewTaskCustomerName(e.target.value)}
                              placeholder="Imię klienta"
                              className="w-full pl-9 p-2 border border-slate-200 rounded-lg text-sm"
                           />
                        </div>
                        <div className="relative">
                           <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                           <input 
                              type="text" 
                              value={newTaskPhone} 
                              onChange={(e) => setNewTaskPhone(e.target.value)}
                              placeholder="Numer telefonu"
                              className="w-full pl-9 p-2 border border-slate-200 rounded-lg text-sm"
                           />
                        </div>
                        <div className="relative">
                           <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                           <input 
                              type="text" 
                              value={newTaskAddress} 
                              onChange={(e) => setNewTaskAddress(e.target.value)}
                              placeholder="Adres"
                              className="w-full pl-9 p-2 border border-slate-200 rounded-lg text-sm"
                           />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex justify-end space-x-2 mt-6">
                  <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Anuluj</button>
                  <button onClick={handleCreateTask} disabled={!newTaskTitle || (!taskAssigneeId && canDelegate)} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold disabled:opacity-50">
                     {taskAssigneeId && taskAssigneeId !== currentUser.id ? 'Zleć Zadanie' : 'Dodaj Zadanie'}
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* EDIT TASK MODAL */}
      {taskToEdit && (
         <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center">
                     <Edit2 className="w-5 h-5 mr-2 text-blue-600" /> Edycja Zadania
                  </h3>
                  <button onClick={() => setTaskToEdit(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
               </div>
               
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tytuł</label>
                     <input 
                        type="text" 
                        value={taskToEdit.title} 
                        onChange={(e) => setTaskToEdit({...taskToEdit, title: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                     />
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data</label>
                     <input 
                        type="date" 
                        value={taskToEdit.date} 
                        onChange={(e) => setTaskToEdit({...taskToEdit, date: e.target.value})}
                        className="w-full p-3 border border-slate-300 rounded-lg"
                     />
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
                     <label className="flex items-center p-3 border rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100">
                        <input 
                          type="checkbox" 
                          checked={taskToEdit.completed} 
                          onChange={(e) => setTaskToEdit({...taskToEdit, completed: e.target.checked})}
                          className="w-5 h-5 mr-3 text-green-500 rounded focus:ring-green-500"
                        />
                        <span className={`font-bold ${taskToEdit.completed ? 'text-green-600 line-through' : 'text-slate-700'}`}>
                           {taskToEdit.completed ? 'Zakończone' : 'Do zrobienia'}
                        </span>
                     </label>
                  </div>

                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Typ zadania</label>
                     <div className="flex gap-2">
                        <button 
                           onClick={() => setTaskToEdit({...taskToEdit, type: 'CALL'})}
                           className={`flex-1 p-2 border rounded-lg flex flex-col items-center justify-center transition-colors ${taskToEdit.type === 'CALL' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'hover:bg-slate-50 border-slate-200'}`}
                        >
                           <Phone className="w-5 h-5 mb-1" />
                           <span className="text-xs font-bold">Telefon</span>
                        </button>
                        <button 
                           onClick={() => setTaskToEdit({...taskToEdit, type: 'MEETING'})}
                           className={`flex-1 p-2 border rounded-lg flex flex-col items-center justify-center transition-colors ${taskToEdit.type === 'MEETING' ? 'bg-violet-50 border-violet-500 text-violet-700' : 'hover:bg-slate-50 border-slate-200'}`}
                        >
                           <Users className="w-5 h-5 mb-1" />
                           <span className="text-xs font-bold">Spotkanie</span>
                        </button>
                        <button 
                           onClick={() => setTaskToEdit({...taskToEdit, type: 'TODO'})}
                           className={`flex-1 p-2 border rounded-lg flex flex-col items-center justify-center transition-colors ${taskToEdit.type === 'TODO' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-slate-50 border-slate-200'}`}
                        >
                           <CheckSquare className="w-5 h-5 mb-1" />
                           <span className="text-xs font-bold">Inne</span>
                        </button>
                     </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                     <p className="text-xs font-bold text-slate-400 uppercase mb-3">Szczegóły kontaktu</p>
                     
                     <div className="space-y-3">
                        <div className="relative">
                           <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                           <input 
                              type="text" 
                              value={taskToEdit.customerName || ''} 
                              onChange={(e) => setTaskToEdit({...taskToEdit, customerName: e.target.value})}
                              placeholder="Imię klienta"
                              className="w-full pl-9 p-2 border border-slate-200 rounded-lg text-sm"
                           />
                        </div>
                        <div className="relative">
                           <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                           <input 
                              type="text" 
                              value={taskToEdit.phone || ''} 
                              onChange={(e) => setTaskToEdit({...taskToEdit, phone: e.target.value})}
                              placeholder="Numer telefonu"
                              className="w-full pl-9 p-2 border border-slate-200 rounded-lg text-sm"
                           />
                        </div>
                        <div className="relative">
                           <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                           <input 
                              type="text" 
                              value={taskToEdit.address || ''} 
                              onChange={(e) => setTaskToEdit({...taskToEdit, address: e.target.value})}
                              placeholder="Adres"
                              className="w-full pl-9 p-2 border border-slate-200 rounded-lg text-sm"
                           />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                  <button 
                     onClick={handleDeleteTaskAction}
                     className="text-red-500 hover:text-red-700 font-bold text-sm flex items-center px-3 py-2 hover:bg-red-50 rounded-lg transition-colors"
                  >
                     <Trash2 className="w-4 h-4 mr-2" /> Usuń
                  </button>
                  <div className="flex space-x-2">
                     <button onClick={() => setTaskToEdit(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Anuluj</button>
                     <button onClick={handleEditTaskSave} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm">Zapisz Zmiany</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

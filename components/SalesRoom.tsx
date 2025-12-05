
import React, { useState, useEffect, useMemo } from 'react';
import { User, Task, Message, SalesSettings, Installation, Customer } from '../types';
import { Calendar as CalendarIcon, Settings, Mail, Plus, Send, Clock, CheckCircle, ChevronLeft, ChevronRight, MapPin, CloudSun, CloudRain, Sun, CalendarDays, Percent, Coins, Save, CheckSquare, BarChart3, TrendingUp, PieChart } from 'lucide-react';
import { MOCK_USERS } from '../constants';

interface SalesRoomProps {
  currentUser: User;
  tasks: Task[];
  messages: Message[];
  installations: Installation[];
  customers: Customer[];
  onAddTask: (task: Task) => void;
  onUpdateTask: (taskId: string, completed: boolean) => void;
  onSendMessage: (msg: Message) => void;
  onUpdateSettings: (settings: SalesSettings) => void;
}

export const SalesRoom: React.FC<SalesRoomProps> = ({ 
  currentUser, 
  tasks, 
  messages, 
  installations,
  customers,
  onAddTask, 
  onUpdateTask, 
  onSendMessage,
  onUpdateSettings
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'CALENDAR' | 'MESSAGES' | 'SETTINGS'>('OVERVIEW');
  const [statsPeriod, setStatsPeriod] = useState<'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  
  // Settings State
  const [localSettings, setLocalSettings] = useState<SalesSettings>(currentUser.salesSettings || { marginType: 'PERCENT', marginPV: 10, marginHeat: 10, marginStorage: 10 });

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Messaging State
  const [newMessageContent, setNewMessageContent] = useState('');
  const [messageRecipient, setMessageRecipient] = useState('OFFICE');

  // Weather State
  const [weatherLocation, setWeatherLocation] = useState('Warszawa');
  const [weatherInput, setWeatherInput] = useState('');
  const [weatherData, setWeatherData] = useState<any>(null);

  const myTasks = tasks.filter(t => t.assignedTo === currentUser.id);
  const myMessages = messages.filter(m => m.toId === currentUser.id || (m.toId === 'ADMIN' && currentUser.role === 'ADMINISTRATOR'));

  // --- Statistics Logic ---
  const myStats = useMemo(() => {
    const myCustomerIds = customers.filter(c => c.repId === currentUser.id).map(c => c.id);
    const myInstalls = installations.filter(i => myCustomerIds.includes(i.customerId));

    const now = new Date();
    let startDate = new Date();
    
    if (statsPeriod === 'WEEK') startDate.setDate(now.getDate() - 7);
    if (statsPeriod === 'MONTH') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (statsPeriod === 'YEAR') startDate = new Date(now.getFullYear(), 0, 1);

    const filteredInstalls = myInstalls.filter(i => {
       // Mock logic: use dateScheduled as 'sold date' for stats, or fallback to creation mock
       // In a real app, Installation should have 'dateSold'
       const dateToCheck = i.dateScheduled ? new Date(i.dateScheduled) : new Date(2023, 10, 1); // Mock date fallback
       return dateToCheck >= startDate;
    });

    const totalRevenue = filteredInstalls.reduce((sum, i) => sum + i.price, 0);
    
    // Estimate Commission/Earnings based on settings
    let estimatedEarnings = 0;
    if (localSettings.marginType === 'PERCENT') {
      estimatedEarnings = totalRevenue * (localSettings.marginPV / 100); // Simplified: applying PV margin to everything for demo
    } else {
      estimatedEarnings = filteredInstalls.length * localSettings.marginPV;
    }

    const typeCounts = { PV: 0, HEAT: 0, STORAGE: 0 };
    filteredInstalls.forEach(i => typeCounts.PV++); // Simplified for mock

    return {
      count: filteredInstalls.length,
      revenue: totalRevenue,
      earnings: estimatedEarnings,
      types: typeCounts
    };

  }, [installations, customers, currentUser, statsPeriod, localSettings]);

  // --- Mock Weather Logic ---
  useEffect(() => {
    const generateWeather = (loc: string) => {
      const types = ['Sunny', 'Cloudy', 'Rainy'];
      const forecast = [];
      for (let i = 0; i < 3; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        forecast.push({
          day: new Date(Date.now() + i * 86400000).toLocaleDateString('pl-PL', { weekday: 'short' }),
          temp: Math.floor(Math.random() * (25 - 10) + 10),
          type
        });
      }
      return { location: loc, current: forecast[0], forecast };
    };
    setWeatherData(generateWeather(weatherLocation));
  }, [weatherLocation]);

  const handleWeatherSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (weatherInput) {
      setWeatherLocation(weatherInput);
      setWeatherInput('');
    }
  };

  // --- Calendar Logic ---
  const holidays = [
    '01-01', '01-06', '05-01', '05-03', '06-08', '08-15', '11-01', '11-11', '12-25', '12-26'
  ];

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay(); // 0 = Sun

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    let startDay = getFirstDayOfMonth(year, month);
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];
    // Empty slots
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-28 bg-slate-50/30 border border-slate-100"></div>);
    }
    // Days
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTasks = myTasks.filter(t => t.date === dateStr);
      const isToday = new Date().toDateString() === dateObj.toDateString();
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const mmdd = `${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isHoliday = holidays.includes(mmdd);

      let bgClass = 'bg-white';
      if (isHoliday) bgClass = 'bg-red-50';
      else if (isWeekend) bgClass = 'bg-slate-50';
      if (isToday) bgClass = 'bg-blue-50/50 ring-1 ring-inset ring-blue-200';

      days.push(
        <div 
          key={i} 
          onClick={() => {
            setSelectedDate(dateStr);
            setShowTaskModal(true);
          }}
          className={`h-28 border border-slate-100 p-2 relative hover:bg-amber-50 transition-colors cursor-pointer group flex flex-col ${bgClass}`}
        >
          <div className="flex justify-between items-start">
             <span className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : (isHoliday ? 'text-red-600 font-bold' : 'text-slate-700')}`}>
               {i}
             </span>
             {isHoliday && <span className="text-[10px] text-red-500 font-bold uppercase tracking-tighter">Święto</span>}
          </div>
          
          <div className="mt-1 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
             {dayTasks.map(t => (
               <div key={t.id} className={`text-[10px] px-1.5 py-1 rounded truncate shadow-sm ${t.completed ? 'bg-green-100 text-green-700 line-through opacity-70' : 'bg-blue-100 text-blue-700'}`}>
                 {t.title}
               </div>
             ))}
          </div>
          
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Plus className="w-4 h-4 text-slate-400 hover:text-blue-600" />
          </div>
        </div>
      );
    }
    return days;
  };

  const changeMonth = (delta: number) => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + delta, 1));
  };

  const handleCreateTask = () => {
    if (selectedDate && newTaskTitle) {
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

  const connectGoogleCalendar = () => {
    alert("Symulacja: Przekierowanie do logowania Google OAuth...\nKalendarz zostałby połączony.");
  };

  const handleSendMessage = () => {
    if (newMessageContent) {
      onSendMessage({
        id: Date.now().toString(),
        fromId: currentUser.id,
        toId: messageRecipient,
        content: newMessageContent,
        date: new Date().toISOString(),
        read: false
      });
      setNewMessageContent('');
    }
  };

  const handleSaveSettings = () => {
    onUpdateSettings(localSettings);
    alert('Ustawienia zapisane pomyślnie');
  };

  const renderWeatherIcon = (type: string) => {
    switch (type) {
      case 'Sunny': return <Sun className="w-8 h-8 text-yellow-500" />;
      case 'Cloudy': return <CloudSun className="w-8 h-8 text-slate-400" />;
      case 'Rainy': return <CloudRain className="w-8 h-8 text-blue-500" />;
      default: return <Sun className="w-8 h-8 text-yellow-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6 flex justify-between items-center shadow-sm z-10">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center">
             Pokój Handlowca
           </h2>
           <p className="text-slate-500 text-sm">Zarządzaj sprzedażą, zadaniami i komunikacją.</p>
        </div>
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-xl">
           <button 
             onClick={() => setActiveTab('OVERVIEW')}
             className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center ${activeTab === 'OVERVIEW' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <BarChart3 className="w-4 h-4 mr-2" /> Podsumowanie
           </button>
           <button 
             onClick={() => setActiveTab('CALENDAR')}
             className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center ${activeTab === 'CALENDAR' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <CalendarDays className="w-4 h-4 mr-2" /> Kalendarz
           </button>
           <button 
             onClick={() => setActiveTab('MESSAGES')}
             className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center ${activeTab === 'MESSAGES' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Mail className="w-4 h-4 mr-2" /> Wiadomości
             {myMessages.filter(m => !m.read).length > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] rounded-full px-1.5 py-0.5">{myMessages.filter(m => !m.read).length}</span>}
           </button>
           <button 
             onClick={() => setActiveTab('SETTINGS')}
             className={`px-4 py-2 rounded-lg font-medium text-sm transition-all flex items-center ${activeTab === 'SETTINGS' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
           >
             <Settings className="w-4 h-4 mr-2" /> Ustawienia
           </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-8">
        
        {/* TAB: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
           <div className="animate-fade-in space-y-8 max-w-7xl mx-auto">
              
              {/* Period Selector */}
              <div className="flex justify-end">
                <div className="inline-flex bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                   {['WEEK', 'MONTH', 'YEAR'].map(period => (
                     <button
                       key={period}
                       onClick={() => setStatsPeriod(period as any)}
                       className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors ${statsPeriod === period ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                       {period === 'WEEK' && 'Ten Tydzień'}
                       {period === 'MONTH' && 'Ten Miesiąc'}
                       {period === 'YEAR' && 'Ten Rok'}
                     </button>
                   ))}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {/* Earnings */}
                 <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                       <Coins className="w-24 h-24" />
                    </div>
                    <p className="text-indigo-200 font-medium mb-1">Twoje szacowane zarobki</p>
                    <h3 className="text-4xl font-bold mb-4">{myStats.earnings.toLocaleString()} PLN</h3>
                    <div className="flex items-center text-xs bg-white/20 w-fit px-2 py-1 rounded">
                       <TrendingUp className="w-3 h-3 mr-1" />
                       Na podstawie Twoich marż
                    </div>
                 </div>

                 {/* Sales Count */}
                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between">
                    <div>
                       <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                             <CheckCircle className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-bold text-slate-400">Sprzedane Instalacje</span>
                       </div>
                       <h3 className="text-3xl font-bold text-slate-800">{myStats.count}</h3>
                       <p className="text-sm text-slate-500 mt-1">w wybranym okresie</p>
                    </div>
                 </div>

                 {/* Breakdown */}
                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <h4 className="font-bold text-slate-700 mb-4 flex items-center">
                       <PieChart className="w-5 h-5 mr-2 text-slate-400" /> Struktura Sprzedaży
                    </h4>
                    <div className="space-y-3">
                       <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Fotowoltaika</span>
                          <span className="font-bold text-slate-900">{myStats.types.PV} szt.</span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-amber-400 h-full" style={{width: '80%'}}></div>
                       </div>
                       <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Magazyny Energii</span>
                          <span className="font-bold text-slate-900">{myStats.types.STORAGE} szt.</span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-green-500 h-full" style={{width: '40%'}}></div>
                       </div>
                       <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Pompy Ciepła</span>
                          <span className="font-bold text-slate-900">{myStats.types.HEAT} szt.</span>
                       </div>
                       <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div className="bg-red-500 h-full" style={{width: '20%'}}></div>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Weather & Quick Tasks */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Weather Widget */}
                 <div className="bg-gradient-to-br from-sky-400 to-blue-500 rounded-2xl shadow-md text-white p-6 relative overflow-hidden">
                    <form onSubmit={handleWeatherSearch} className="relative z-10 mb-6 flex items-center bg-white/20 rounded-lg p-1 backdrop-blur-sm border border-white/20">
                       <MapPin className="w-4 h-4 ml-2 text-white/70" />
                       <input 
                         type="text" 
                         value={weatherInput}
                         onChange={(e) => setWeatherInput(e.target.value)}
                         placeholder={weatherLocation}
                         className="bg-transparent border-none outline-none text-sm text-white placeholder-white/70 w-full px-2 py-1"
                       />
                    </form>

                    {weatherData && (
                      <div className="relative z-10">
                         <div className="flex items-center justify-between mb-6">
                            <div>
                               <p className="text-4xl font-bold">{weatherData.current.temp}°C</p>
                               <p className="text-blue-100 text-sm mt-1">{weatherData.current.type}</p>
                            </div>
                            {renderWeatherIcon(weatherData.current.type)}
                         </div>

                         <div className="grid grid-cols-3 gap-2 border-t border-white/20 pt-4">
                            {weatherData.forecast.map((day: any, idx: number) => (
                              <div key={idx} className="text-center">
                                 <p className="text-xs text-blue-100 mb-1">{day.day}</p>
                                 <div className="flex justify-center mb-1 scale-75 origin-center">{renderWeatherIcon(day.type)}</div>
                                 <p className="font-bold text-sm">{day.temp}°</p>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                 </div>

                 {/* Recent Tasks */}
                 <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                       <span className="flex items-center"><CheckSquare className="w-5 h-5 mr-2 text-green-600" /> Nadchodzące Zadania</span>
                       <button onClick={() => setActiveTab('CALENDAR')} className="text-xs text-blue-600 hover:underline">Zobacz kalendarz</button>
                    </h3>
                    <div className="space-y-3 flex-1">
                       {myTasks.filter(t => !t.completed).slice(0, 3).map(task => (
                          <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                             <div className="flex items-center">
                                <div className="w-2 h-2 rounded-full bg-blue-500 mr-3"></div>
                                <div>
                                  <p className="font-medium text-slate-700 text-sm">{task.title}</p>
                                  <p className="text-xs text-slate-400">{task.date}</p>
                                </div>
                             </div>
                             <button onClick={() => onUpdateTask(task.id, true)} className="text-xs bg-white border border-slate-200 px-2 py-1 rounded text-slate-600 hover:text-green-600 hover:border-green-200 transition-colors">
                                Wykonane
                             </button>
                          </div>
                       ))}
                       {myTasks.filter(t => !t.completed).length === 0 && (
                          <p className="text-slate-400 text-sm italic">Brak pilnych zadań.</p>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        )}

        {/* TAB: CALENDAR */}
        {activeTab === 'CALENDAR' && (
          <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className="flex items-center space-x-6">
                   <h3 className="text-2xl font-bold text-slate-800 capitalize">
                     {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}
                   </h3>
                   <div className="flex space-x-1 bg-white rounded-lg border border-slate-200 p-0.5">
                     <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ChevronLeft className="w-5 h-5"/></button>
                     <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-slate-100 rounded text-slate-600"><ChevronRight className="w-5 h-5"/></button>
                   </div>
                </div>
                <div className="flex items-center space-x-3">
                   <div className="flex items-center text-xs text-slate-500 space-x-4 mr-4">
                      <span className="flex items-center"><div className="w-3 h-3 bg-red-50 border border-slate-100 mr-1 rounded-sm"></div> Święto</span>
                      <span className="flex items-center"><div className="w-3 h-3 bg-slate-50 border border-slate-100 mr-1 rounded-sm"></div> Weekend</span>
                   </div>
                   <button onClick={connectGoogleCalendar} className="text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-lg flex items-center transition-colors">
                      <CalendarIcon className="w-4 h-4 mr-2" /> Połącz z Google Calendar
                   </button>
                </div>
             </div>
             
             {/* Calendar Grid */}
             <div className="p-6">
                <div className="grid grid-cols-7 gap-px mb-4 text-center">
                   {['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'].map((day, i) => (
                     <div key={day} className={`text-xs font-bold uppercase tracking-wider ${i >= 5 ? 'text-red-400' : 'text-slate-400'}`}>{day}</div>
                   ))}
                </div>
                <div className="grid grid-cols-7 border border-slate-200 bg-slate-200 gap-px rounded-xl overflow-hidden shadow-inner">
                   {renderCalendarGrid()}
                </div>
             </div>
          </div>
        )}

        {/* TAB: MESSAGES */}
        {activeTab === 'MESSAGES' && (
           <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 h-[600px] animate-fade-in">
             <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex justify-between items-center">
                   <span>Skrzynka Odbiorcza</span>
                   <span className="text-xs bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{myMessages.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-0">
                   {myMessages.length > 0 ? myMessages.map(msg => (
                     <div key={msg.id} className={`p-4 border-b border-slate-50 hover:bg-blue-50 cursor-pointer transition-colors ${!msg.read ? 'bg-blue-50/50' : ''}`}>
                        <div className="flex justify-between items-start mb-1">
                           <span className={`text-sm ${!msg.read ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                             {MOCK_USERS.find(u => u.id === msg.fromId)?.name || 'Nieznany'}
                           </span>
                           <span className="text-[10px] text-slate-400">{new Date(msg.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{msg.content}</p>
                     </div>
                   )) : (
                     <div className="p-8 text-center text-slate-400 text-sm">Brak wiadomości</div>
                   )}
                </div>
             </div>
             
             <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col">
                <h3 className="font-bold text-slate-800 mb-6 flex items-center">
                   <Send className="w-5 h-5 mr-2 text-blue-600" /> Wyślij wiadomość
                </h3>
                <div className="space-y-4 flex-1 flex flex-col">
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Do kogo</label>
                        <select 
                          value={messageRecipient}
                          onChange={(e) => setMessageRecipient(e.target.value)}
                          className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                          <option value="OFFICE">Biuro</option>
                          <option value="ADMIN">Administrator</option>
                          {MOCK_USERS.filter(u => u.role === 'MONTAŻYSTA').map(u => (
                            <option key={u.id} value={u.id}>{u.name} (Ekipa)</option>
                          ))}
                        </select>
                     </div>
                   </div>
                   <div className="flex-1 flex flex-col">
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Treść wiadomości</label>
                     <textarea 
                       value={newMessageContent}
                       onChange={(e) => setNewMessageContent(e.target.value)}
                       className="flex-1 w-full p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50"
                       placeholder="Wpisz treść wiadomości..."
                     />
                   </div>
                   <div className="flex justify-end pt-2">
                     <button 
                       onClick={handleSendMessage}
                       disabled={!newMessageContent}
                       className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-lg shadow-blue-200 flex items-center"
                     >
                       <Send className="w-4 h-4 mr-2" /> Wyślij
                     </button>
                   </div>
                </div>
             </div>
           </div>
        )}

        {/* TAB: SETTINGS */}
        {activeTab === 'SETTINGS' && (
           <div className="max-w-3xl mx-auto animate-fade-in">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                      <h3 className="text-2xl font-bold text-slate-800 flex items-center">
                         <Settings className="w-6 h-6 mr-3 text-slate-600" /> Ustawienia Handlowe
                      </h3>
                      <p className="text-slate-500 mt-2">Dostosuj swoje domyślne marże. Zmiany zostaną automatycznie zastosowane do nowych kalkulacji.</p>
                  </div>
                  
                  <div className="p-8 space-y-8">
                     
                     {/* Toggle Type */}
                     <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                           <p className="font-bold text-blue-900 text-lg">Rodzaj Marży</p>
                           <p className="text-sm text-blue-600/80">Wybierz globalny sposób naliczania prowizji dla kalkulatorów.</p>
                        </div>
                        <div className="flex bg-white rounded-lg p-1.5 border border-blue-200 shadow-sm">
                           <button 
                             onClick={() => setLocalSettings({...localSettings, marginType: 'PERCENT'})}
                             className={`px-6 py-2.5 rounded-md text-sm font-bold transition-all flex items-center ${localSettings.marginType === 'PERCENT' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                           >
                             <Percent className="w-4 h-4 mr-2" /> Procentowa
                           </button>
                           <button 
                             onClick={() => setLocalSettings({...localSettings, marginType: 'FIXED'})}
                             className={`px-6 py-2.5 rounded-md text-sm font-bold transition-all flex items-center ${localSettings.marginType === 'FIXED' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-800'}`}
                           >
                             <Coins className="w-4 h-4 mr-2" /> Kwotowa
                           </button>
                        </div>
                     </div>

                     <div className="space-y-8">
                         {[
                             { label: 'Fotowoltaika (PV)', field: 'marginPV', color: 'amber' },
                             { label: 'Pompy Ciepła', field: 'marginHeat', color: 'red' },
                             { label: 'Magazyny Energii', field: 'marginStorage', color: 'green' },
                         ].map((item) => (
                             <div key={item.field} className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex items-center justify-between">
                                <label className={`text-lg font-bold text-${item.color}-700 flex items-center`}>
                                   <div className={`w-3 h-3 bg-${item.color}-500 rounded-full mr-2`}></div>
                                   {item.label}
                                </label>
                                <div className="flex items-center">
                                  <input 
                                     type="number"
                                     value={localSettings[item.field as keyof SalesSettings] as number}
                                     onChange={(e) => setLocalSettings({...localSettings, [item.field]: Number(e.target.value)})}
                                     className="w-32 p-3 text-right font-mono font-bold border border-slate-300 rounded-lg mr-2 outline-none focus:ring-2 focus:ring-blue-500"
                                     placeholder="0"
                                  />
                                  <span className="text-slate-500 font-bold w-8">{localSettings.marginType === 'PERCENT' ? '%' : 'PLN'}</span>
                                </div>
                             </div>
                         ))}
                     </div>

                     <button 
                       onClick={handleSaveSettings}
                       className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold transition-colors flex items-center justify-center shadow-lg"
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
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-blue-600" /> 
                    Nowe Zadanie
                  </h3>
                  <span className="text-sm text-slate-500 bg-slate-100 px-2 py-1 rounded">{selectedDate}</span>
               </div>
               
               <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tytuł zadania</label>
                 <input 
                   type="text" 
                   autoFocus
                   value={newTaskTitle}
                   onChange={(e) => setNewTaskTitle(e.target.value)}
                   placeholder="np. Spotkanie z klientem..."
                   className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                   onKeyDown={(e) => e.key === 'Enter' && handleCreateTask()}
                 />
               </div>
               
               <div className="flex justify-end space-x-2">
                  <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg font-medium">Anuluj</button>
                  <button onClick={handleCreateTask} disabled={!newTaskTitle} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md">Dodaj</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

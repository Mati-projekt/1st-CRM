
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
  
  const [localSettings, setLocalSettings] = useState<SalesSettings>(currentUser.salesSettings || { marginType: 'PERCENT', marginPV: 10, marginHeat: 10, marginStorage: 10 });
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newMessageContent, setNewMessageContent] = useState('');
  const [messageRecipient, setMessageRecipient] = useState('OFFICE');

  const [weatherLocation, setWeatherLocation] = useState('Warszawa');
  const [weatherInput, setWeatherInput] = useState('');
  const [weatherData, setWeatherData] = useState<any>(null);

  const myTasks = tasks.filter(t => t.assignedTo === currentUser.id);
  const myMessages = messages.filter(m => m.toId === currentUser.id || (m.toId === 'ADMIN' && currentUser.role === 'ADMINISTRATOR'));

  const myStats = useMemo(() => {
    const myCustomerIds = customers.filter(c => c.repId === currentUser.id).map(c => c.id);
    const myInstalls = installations.filter(i => myCustomerIds.includes(i.customerId));
    const now = new Date();
    let startDate = new Date();
    
    if (statsPeriod === 'WEEK') startDate.setDate(now.getDate() - 7);
    if (statsPeriod === 'MONTH') startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    if (statsPeriod === 'YEAR') startDate = new Date(now.getFullYear(), 0, 1);

    const filteredInstalls = myInstalls.filter(i => {
       const dateToCheck = i.dateScheduled ? new Date(i.dateScheduled) : new Date(2023, 10, 1);
       return dateToCheck >= startDate;
    });

    const totalRevenue = filteredInstalls.reduce((sum, i) => sum + i.price, 0);
    
    let estimatedEarnings = 0;
    if (localSettings.marginType === 'PERCENT') {
      estimatedEarnings = totalRevenue * (localSettings.marginPV / 100); 
    } else {
      estimatedEarnings = filteredInstalls.length * localSettings.marginPV;
    }

    const typeCounts = { PV: 0, HEAT: 0, STORAGE: 0 };
    filteredInstalls.forEach(i => typeCounts.PV++);

    return {
      count: filteredInstalls.length,
      revenue: totalRevenue,
      earnings: estimatedEarnings,
      types: typeCounts
    };

  }, [installations, customers, currentUser, statsPeriod, localSettings]);

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

  const holidays = ['01-01', '01-06', '05-01', '05-03', '06-08', '08-15', '11-01', '11-11', '12-25', '12-26'];
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    let startDay = getFirstDayOfMonth(year, month);
    startDay = startDay === 0 ? 6 : startDay - 1;

    const days = [];
    for (let i = 0; i < startDay; i++) days.push(<div key={`empty-${i}`} className="bg-slate-50/30 border border-slate-100 flex flex-col"></div>);
    
    for (let i = 1; i <= daysInMonth; i++) {
      const dateObj = new Date(year, month, i);
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayTasks = myTasks.filter(t => t.date === dateStr);
      const isToday = new Date().toDateString() === dateObj.toDateString();
      const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
      const mmdd = `${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const isHoliday = holidays.includes(mmdd);

      let bgClass = 'bg-white';
      if (isHoliday) bgClass = 'bg-red-100'; // Make holiday distinct
      else if (isWeekend) bgClass = 'bg-slate-50';
      if (isToday) bgClass = 'bg-blue-50/50 ring-1 ring-inset ring-blue-200';

      days.push(
        <div 
          key={i} 
          onClick={() => { setSelectedDate(dateStr); setShowTaskModal(true); }}
          className={`border border-slate-100 p-1 md:p-2 relative hover:bg-amber-50 transition-colors cursor-pointer group flex flex-col overflow-hidden ${bgClass}`}
          style={{ minHeight: '80px', height: 'auto' }}
        >
          <div className="flex justify-between items-start shrink-0">
             <span className={`text-xs md:text-sm font-medium w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : (isHoliday ? 'text-red-600 font-bold' : 'text-slate-700')}`}>
               {i}
             </span>
             {isHoliday && <span className="text-[8px] md:text-[10px] text-red-500 font-bold uppercase tracking-tighter">Święto</span>}
          </div>
          <div className="mt-1 space-y-1">
             {dayTasks.map(t => (
               <div key={t.id} className={`text-[8px] md:text-[10px] px-1 py-0.5 rounded truncate shadow-sm ${t.completed ? 'bg-green-100 text-green-700 line-through opacity-70' : 'bg-blue-100 text-blue-700'}`}>
                 {t.title}
               </div>
             ))}
          </div>
        </div>
      );
    }
    return days;
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
      case 'Sunny': return <Sun className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />;
      case 'Cloudy': return <CloudSun className="w-6 h-6 md:w-8 md:h-8 text-slate-400" />;
      case 'Rainy': return <CloudRain className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />;
      default: return <Sun className="w-6 h-6 md:w-8 md:h-8 text-yellow-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 font-sans">
      
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-4 md:py-6 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm z-10 gap-4 shrink-0">
        <div>
           <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center">Pokój Handlowca</h2>
        </div>
        <div className="flex space-x-1 md:space-x-2 bg-slate-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
           {['OVERVIEW', 'CALENDAR', 'MESSAGES', 'SETTINGS'].map((tab) => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab as any)}
               className={`px-3 py-2 rounded-lg font-medium text-xs md:text-sm transition-all flex items-center whitespace-nowrap ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               {tab === 'OVERVIEW' && <BarChart3 className="w-4 h-4 mr-2" />}
               {tab === 'CALENDAR' && <CalendarDays className="w-4 h-4 mr-2" />}
               {tab === 'MESSAGES' && <Mail className="w-4 h-4 mr-2" />}
               {tab === 'SETTINGS' && <Settings className="w-4 h-4 mr-2" />}
               <span className="hidden sm:inline">{
                  tab === 'OVERVIEW' ? 'Podsumowanie' : 
                  tab === 'CALENDAR' ? 'Kalendarz' : 
                  tab === 'MESSAGES' ? 'Wiadomości' : 'Ustawienia'
               }</span>
             </button>
           ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        
        {activeTab === 'OVERVIEW' && (
           <div className="animate-fade-in space-y-6 md:space-y-8 max-w-7xl mx-auto">
              {/* Period Selector */}
              <div className="flex justify-end">
                <div className="inline-flex bg-white rounded-lg shadow-sm border border-slate-200 p-1">
                   {['WEEK', 'MONTH', 'YEAR'].map(period => (
                     <button
                       key={period}
                       onClick={() => setStatsPeriod(period as any)}
                       className={`px-3 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-colors ${statsPeriod === period ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                     >
                       {period === 'WEEK' && 'Tydzień'}
                       {period === 'MONTH' && 'Miesiąc'}
                       {period === 'YEAR' && 'Rok'}
                     </button>
                   ))}
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                 {/* Earnings */}
                 <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden group">
                    <p className="text-indigo-200 font-medium mb-1 text-sm">Twoje szacowane zarobki</p>
                    <h3 className="text-3xl md:text-4xl font-bold mb-4">{myStats.earnings.toLocaleString()} PLN</h3>
                 </div>
                 {/* Sales Count */}
                 <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                    <span className="text-xs font-bold text-slate-400">Sprzedane Instalacje</span>
                    <h3 className="text-3xl font-bold text-slate-800">{myStats.count}</h3>
                 </div>
              </div>
           </div>
        )}

        {activeTab === 'CALENDAR' && (
          <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
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
                   {renderCalendarGrid()}
                </div>
             </div>
          </div>
        )}
      </div>

      {showTaskModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
               <h3 className="text-lg font-bold mb-4">Nowe Zadanie ({selectedDate})</h3>
               <input 
                   type="text" 
                   value={newTaskTitle}
                   onChange={(e) => setNewTaskTitle(e.target.value)}
                   placeholder="Tytuł zadania..."
                   className="w-full p-3 border border-slate-300 rounded-lg mb-4"
               />
               <div className="flex justify-end space-x-2">
                  <button onClick={() => setShowTaskModal(false)} className="px-4 py-2 text-slate-500">Anuluj</button>
                  <button onClick={handleCreateTask} disabled={!newTaskTitle} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold">Dodaj</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

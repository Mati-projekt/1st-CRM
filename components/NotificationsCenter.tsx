
import React, { useState, useMemo } from 'react';
import { AppNotification, NotificationCategory, ViewState, UserRole, User } from '../types';
import { Bell, CheckCircle, Trash2, Filter, DollarSign, Package, Wrench, Mail, AlertTriangle, ArrowRight, Archive, Inbox, Eye } from 'lucide-react';

interface NotificationsCenterProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAsUnread: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
  onNavigate: (view: ViewState, id?: string) => void;
  currentUser?: User;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({ 
  notifications, 
  onMarkAsRead, 
  onMarkAsUnread,
  onMarkAllAsRead, 
  onDeleteNotification,
  onNavigate,
  currentUser
}) => {
  const [activeFilter, setActiveFilter] = useState<NotificationCategory | 'ALL'>('ALL');
  const [viewMode, setViewMode] = useState<'UNREAD' | 'READ'>('UNREAD');

  const filteredNotifications = useMemo(() => {
    let sorted = [...notifications].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Explicit Role-based filtering for STOCK alerts
    // Only ADMIN and OFFICE can see low stock alerts
    const canSeeStock = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.OFFICE;
    
    if (!canSeeStock) {
       sorted = sorted.filter(n => n.category !== 'STOCK');
    }

    // Filter by Read/Unread status based on view mode
    if (viewMode === 'UNREAD') {
       sorted = sorted.filter(n => !n.read);
    } else {
       sorted = sorted.filter(n => n.read);
    }

    // Filter by Category
    if (activeFilter !== 'ALL') {
       sorted = sorted.filter(n => n.category === activeFilter);
    }
    return sorted;
  }, [notifications, activeFilter, viewMode, currentUser]);

  // Fix: Calculate unread count based on visible notifications (role filtered)
  const unreadCount = useMemo(() => {
     let visible = notifications;
     const canSeeStock = currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.OFFICE;
     
     if (!canSeeStock) {
        visible = visible.filter(n => n.category !== 'STOCK');
     }
     
     return visible.filter(n => !n.read).length;
  }, [notifications, currentUser]);

  const getCategoryIcon = (cat: NotificationCategory) => {
     switch(cat) {
        case 'SALES': return <DollarSign className="w-6 h-6 text-green-600" />;
        case 'STOCK': return <AlertTriangle className="w-6 h-6 text-red-600" />;
        case 'INSTALLATION': return <Wrench className="w-6 h-6 text-amber-600" />;
        case 'MESSAGE': return <Mail className="w-6 h-6 text-blue-600" />;
        case 'FINANCE': return <DollarSign className="w-6 h-6 text-emerald-600" />;
        default: return <Bell className="w-6 h-6 text-slate-600" />;
     }
  };

  const getCategoryColor = (cat: NotificationCategory) => {
     switch(cat) {
        case 'SALES': return 'bg-green-50 border-green-100 hover:border-green-200';
        case 'STOCK': return 'bg-red-50 border-red-100 hover:border-red-200';
        case 'INSTALLATION': return 'bg-amber-50 border-amber-100 hover:border-amber-200';
        case 'MESSAGE': return 'bg-blue-50 border-blue-100 hover:border-blue-200';
        case 'FINANCE': return 'bg-emerald-50 border-emerald-100 hover:border-emerald-200';
        default: return 'bg-slate-50 border-slate-100 hover:border-slate-200';
     }
  };

  const categories: { id: NotificationCategory | 'ALL', label: string }[] = [
    { id: 'ALL', label: 'Wszystkie' },
    { id: 'SALES', label: 'Sprzedaż' },
    { id: 'FINANCE', label: 'Finanse' },
    { id: 'INSTALLATION', label: 'Techniczne' },
    { id: 'STOCK', label: 'Magazyn' },
    { id: 'MESSAGE', label: 'Wiadomości' },
  ];

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in max-w-5xl mx-auto h-[calc(100vh-5rem)] flex flex-col">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
             <h2 className="text-2xl font-bold text-slate-800 flex items-center">
               <Bell className="w-8 h-8 mr-3 text-blue-600" /> Centrum Powiadomień
             </h2>
             <p className="text-slate-500 text-sm mt-1">Bądź na bieżąco ze wszystkimi zdarzeniami w firmie.</p>
          </div>
          
          {/* Main Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl">
             <button
               onClick={() => setViewMode('UNREAD')}
               className={`flex items-center px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  viewMode === 'UNREAD' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
               }`}
             >
                <Inbox className="w-4 h-4 mr-2" />
                Nowe
                {unreadCount > 0 && (
                   <span className="ml-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                      {unreadCount}
                   </span>
                )}
             </button>
             <button
               onClick={() => setViewMode('READ')}
               className={`flex items-center px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  viewMode === 'READ' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
               }`}
             >
                <Archive className="w-4 h-4 mr-2" />
                Przeczytane
             </button>
          </div>
       </div>

       <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-200 pb-4">
          {/* Category Filters */}
          <div className="flex space-x-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto hide-scrollbar">
             {categories.map(cat => {
                // Hide STOCK filter if user can't see stock notifications
                if (cat.id === 'STOCK' && currentUser?.role !== UserRole.ADMIN && currentUser?.role !== UserRole.OFFICE) return null;
                
                return (
                <button
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                     activeFilter === cat.id 
                       ? 'bg-slate-800 text-white shadow-md' 
                       : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                   {cat.label}
                </button>
             )})}
          </div>

          {viewMode === 'UNREAD' && unreadCount > 0 && (
             <button 
               onClick={onMarkAllAsRead}
               className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-4 py-2 rounded-lg font-bold text-xs shadow-sm flex items-center transition-colors shrink-0"
             >
                <CheckCircle className="w-4 h-4 mr-2" /> Oznacz wszystkie jako przeczytane
             </button>
          )}
       </div>

       {/* List */}
       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
          {filteredNotifications.length > 0 ? (
             filteredNotifications.map(notification => (
                <div 
                   key={notification.id} 
                   className={`p-5 rounded-2xl border flex items-start space-x-5 transition-all bg-white relative group ${
                      notification.read ? 'border-slate-100 opacity-60 hover:opacity-100' : `${getCategoryColor(notification.category)} shadow-sm hover:shadow-md`
                   }`}
                >
                   {/* Icon Container */}
                   <div className={`p-4 rounded-xl shrink-0 flex items-center justify-center ${notification.read ? 'bg-slate-100' : 'bg-white shadow-sm'}`}>
                      {getCategoryIcon(notification.category)}
                   </div>
                   
                   {/* Content */}
                   <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1">
                         <h4 className={`text-base font-bold truncate ${notification.read ? 'text-slate-600' : 'text-slate-900'}`}>
                            {notification.title}
                         </h4>
                         <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                            {new Date(notification.date).toLocaleString('pl-PL')}
                         </span>
                      </div>
                      
                      <p className={`text-sm mt-1 break-words leading-relaxed ${notification.read ? 'text-slate-400' : 'text-slate-600'}`}>
                         {notification.message}
                      </p>
                      
                      {/* Action Bar */}
                      <div className="flex items-center gap-4 mt-4 border-t border-black/5 pt-3">
                         {notification.linkTo && (
                            <button 
                              onClick={() => onNavigate(notification.linkTo!.view, notification.linkTo!.id)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg flex items-center transition-colors"
                            >
                               Szczegóły <ArrowRight className="w-3 h-3 ml-1" />
                            </button>
                         )}
                         
                         <div className="flex-1"></div>

                         {!notification.read ? (
                            <button 
                               onClick={() => onMarkAsRead(notification.id)}
                               className="text-xs font-bold text-slate-500 hover:text-green-600 flex items-center transition-colors px-2 py-1 rounded hover:bg-slate-50"
                            >
                               <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Oznacz jako przeczytane
                            </button>
                         ) : (
                            <button 
                               onClick={() => onMarkAsUnread(notification.id)}
                               className="text-xs font-bold text-slate-400 hover:text-blue-500 flex items-center transition-colors px-2 py-1 rounded hover:bg-slate-50"
                            >
                               <Eye className="w-3.5 h-3.5 mr-1.5" /> Przywróć jako nowe
                            </button>
                         )}
                      </div>
                   </div>

                   {/* Delete Button (Absolute) */}
                   <button 
                     onClick={() => onDeleteNotification(notification.id)}
                     className="absolute top-4 right-4 text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                     title="Usuń powiadomienie"
                   >
                      <Trash2 className="w-4 h-4" />
                   </button>
                </div>
             ))
          ) : (
             <div className="h-full flex flex-col items-center justify-center text-slate-300">
                <Inbox className="w-20 h-20 mb-4 opacity-10" />
                <p className="font-bold text-xl text-slate-400">
                   {viewMode === 'UNREAD' ? 'Wszystko na bieżąco!' : 'Puste archiwum'}
                </p>
                <p className="text-sm mt-2 max-w-xs text-center text-slate-400">
                   {viewMode === 'UNREAD' 
                      ? 'Nie masz żadnych nowych powiadomień. Dobra robota.' 
                      : 'Przeczytane powiadomienia pojawią się tutaj.'}
                </p>
             </div>
          )}
       </div>
    </div>
  );
};

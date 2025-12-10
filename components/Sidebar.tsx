
import React from 'react';
import { LayoutDashboard, Users, Wrench, Package, Sun, Grid, UserCircle, LogOut, X, UserCog, CalendarRange, Megaphone } from 'lucide-react';
import { ViewState, User, UserRole } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  currentUser: User;
  onLogout: () => void;
  isOpen: boolean;
  onClose: () => void;
  unreadNotifications?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, currentUser, onLogout, isOpen, onClose, unreadNotifications = 0 }) => {
  
  // Define permission logic
  const canAccess = (role: UserRole, view: ViewState): boolean => {
    switch (role) {
      case UserRole.ADMIN:
        return true; // Access everything
      case UserRole.SALES_MANAGER:
        return ['DASHBOARD', 'CUSTOMERS', 'INSTALLATIONS', 'APPLICATIONS', 'INSTALLATION_CALENDAR', 'ANNOUNCEMENTS'].includes(view);
      case UserRole.SALES:
        return ['DASHBOARD', 'CUSTOMERS', 'INSTALLATIONS', 'APPLICATIONS'].includes(view);
      case UserRole.INSTALLER:
        return ['INSTALLATIONS', 'INVENTORY', 'INSTALLATION_CALENDAR'].includes(view);
      case UserRole.OFFICE:
        return ['DASHBOARD', 'CUSTOMERS', 'INSTALLATIONS', 'INVENTORY', 'INSTALLATION_CALENDAR', 'ANNOUNCEMENTS'].includes(view);
      default:
        return false;
    }
  };

  const menuItems = [
    { id: 'DASHBOARD', label: 'Pulpit', icon: LayoutDashboard },
    // Notifications moved to Dashboard tabs
    { id: 'CUSTOMERS', label: 'Klienci', icon: Users },
    { id: 'INSTALLATIONS', label: 'Montaże', icon: Wrench },
    { id: 'INSTALLATION_CALENDAR', label: 'Kalendarz Montaży', icon: CalendarRange },
    { id: 'INVENTORY', label: 'Magazyn', icon: Package },
    { id: 'APPLICATIONS', label: 'Aplikacja', icon: Grid },
    { id: 'EMPLOYEES', label: 'Pracownicy', icon: UserCog },
    { id: 'ANNOUNCEMENTS', label: 'Komunikaty', icon: Megaphone },
  ];

  // Map roles to Polish labels
  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return 'Administrator';
      case UserRole.SALES_MANAGER: return 'Kierownik Sprzedaży';
      case UserRole.SALES: return 'Handlowiec';
      case UserRole.INSTALLER: return 'Montażysta';
      case UserRole.OFFICE: return 'Biuro';
      default: return role;
    }
  };

  const visibleMenuItems = menuItems.filter(item => {
    // Only Admin, Office, Manager sees Announcements creator in menu
    if (item.id === 'ANNOUNCEMENTS' && ![UserRole.ADMIN, UserRole.OFFICE, UserRole.SALES_MANAGER].includes(currentUser.role)) return false;
    
    return canAccess(currentUser.role, item.id as ViewState);
  });

  return (
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col h-full shadow-xl transition-transform duration-300 transform 
      ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
      md:relative md:translate-x-0
    `}>
      <div className="p-6 flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center space-x-3">
          <Sun className="text-yellow-400 w-8 h-8" />
          <h1 className="text-xl font-bold tracking-wider">Family CRM</h1>
        </div>
        <button onClick={onClose} className="md:hidden text-slate-400 hover:text-white">
          <X className="w-6 h-6" />
        </button>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {visibleMenuItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id as ViewState)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span className="font-medium">{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center border-2 border-slate-50">
            <UserCircle className="w-6 h-6 text-slate-300" />
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-blue-400 uppercase tracking-wider font-bold truncate">
              {getRoleLabel(currentUser.role)}
            </p>
          </div>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 bg-slate-900 hover:bg-red-900/30 text-slate-400 hover:text-red-400 py-2 rounded-lg border border-slate-700 hover:border-red-900/50 transition-all text-xs font-bold uppercase tracking-wider"
        >
          <LogOut className="w-4 h-4" />
          <span>Wyloguj</span>
        </button>
      </div>
    </div>
  );
};

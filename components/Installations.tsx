
import React from 'react';
import { Installation, InstallationStatus, Customer, UserRole } from '../types';
import { Calendar, MapPin, User, ChevronRight, Settings, Banknote } from 'lucide-react';

interface InstallationsProps {
  installations: Installation[];
  customers: Customer[];
  onNavigateToCustomer: (customerId: string) => void;
  onUpdateInstallation: (installation: Installation) => void;
  currentUserRole: UserRole;
}

export const Installations: React.FC<InstallationsProps> = ({ 
  installations, 
  customers, 
  onNavigateToCustomer,
  onUpdateInstallation,
  currentUserRole
}) => {
  const getCustomerName = (id: string) => customers.find(c => c.id === id)?.name || 'Nieznany';

  // Define columns for the Kanban board
  const columns = [
    { id: InstallationStatus.NEW, title: 'Nowe', color: 'bg-slate-100 border-slate-200' },
    { id: InstallationStatus.AUDIT, title: 'Audyt', color: 'bg-blue-50 border-blue-100' },
    { id: InstallationStatus.PROJECT, title: 'Projekt', color: 'bg-indigo-50 border-indigo-100' },
    { id: InstallationStatus.INSTALLATION, title: 'Montaż', color: 'bg-amber-50 border-amber-100' },
    { id: InstallationStatus.GRID_CONNECTION, title: 'OSD', color: 'bg-purple-50 border-purple-100' },
    { id: InstallationStatus.GRANT_APPLICATION, title: 'Dotacje', color: 'bg-pink-50 border-pink-100' },
    { id: InstallationStatus.COMPLETED, title: 'Zakończone', color: 'bg-green-50 border-green-100' },
  ];

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>, inst: Installation) => {
    e.stopPropagation(); 
    const newStatus = e.target.value as InstallationStatus;
    if (newStatus !== inst.status) {
      onUpdateInstallation({ ...inst, status: newStatus });
    }
  };

  const canEditStatus = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;

  return (
    <div className="h-[calc(100vh-8rem)] overflow-x-auto overflow-y-hidden p-4">
       <div className="flex h-full space-x-4 min-w-[300px] md:min-w-[1200px] pb-4">
         {columns.map(col => {
           const colInstalls = installations.filter(i => i.status === col.id);
           
           return (
             <div key={col.id} className={`flex-1 min-w-[260px] md:min-w-[280px] rounded-xl flex flex-col border ${col.color} h-full`}>
               <div className="p-3 border-b border-inherit bg-white/50 rounded-t-xl backdrop-blur-sm sticky top-0">
                 <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 text-sm md:text-base">{col.title}</h3>
                    <span className="bg-white px-2 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm">
                      {colInstalls.length}
                    </span>
                 </div>
               </div>
               
               <div className="p-2 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                 {colInstalls.map(inst => {
                   const paymentPercent = inst.price > 0 ? (inst.paidAmount / inst.price) * 100 : 0;
                   return (
                   <div 
                    key={inst.id} 
                    onClick={() => onNavigateToCustomer(inst.customerId)}
                    className="bg-white p-3 md:p-4 rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-pointer group"
                   >
                     <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-bold text-slate-400">#{inst.id.slice(0,6)}</span>
                       <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{inst.systemSizeKw} kWp</span>
                     </div>
                     <h4 className="font-bold text-slate-800 mb-1 text-sm group-hover:text-blue-600 transition-colors truncate">
                        {getCustomerName(inst.customerId)}
                     </h4>
                     
                     <div className="space-y-1 text-xs text-slate-500 mb-3">
                       <div className="flex items-center">
                         <MapPin className="w-3 h-3 mr-1 shrink-0" />
                         <span className="truncate">{inst.address}</span>
                       </div>
                       {inst.dateScheduled && (
                         <div className="flex items-center text-blue-600 font-medium">
                           <Calendar className="w-3 h-3 mr-1 shrink-0" />
                           <span>{inst.dateScheduled}</span>
                         </div>
                       )}
                     </div>

                     {/* Payment Progress */}
                     {inst.price > 0 && (
                        <div className="mb-3">
                          <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                             <span className="flex items-center"><Banknote className="w-3 h-3 mr-1" /> Płatność</span>
                             <span className={paymentPercent >= 100 ? 'text-green-600 font-bold' : ''}>{paymentPercent.toFixed(0)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                             <div 
                               className={`h-full rounded-full ${paymentPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                               style={{width: `${Math.min(100, paymentPercent)}%`}}
                             ></div>
                          </div>
                        </div>
                     )}

                     <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                       <div className="relative flex-1 mr-2" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={inst.status}
                            onChange={(e) => handleStatusChange(e, inst)}
                            disabled={!canEditStatus}
                            className={`w-full text-xs p-1 bg-slate-50 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none ${!canEditStatus ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {Object.values(InstallationStatus).map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                       </div>
                       <button className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center whitespace-nowrap">
                         <ChevronRight className="w-4 h-4" />
                       </button>
                     </div>
                   </div>
                 )})}
               </div>
             </div>
           );
         })}
       </div>
    </div>
  );
};

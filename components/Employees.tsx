import React, { useState, useEffect } from 'react';
import { User, UserRole, SystemSettings } from '../types';
import { Plus, Save, Trash2, UserCog, Settings, UserCircle, X, Edit2, Mail, Lock, Percent, AlertCircle } from 'lucide-react';

interface EmployeesProps {
  users?: User[];
  onAddUser: (user: Partial<User>, password?: string) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (userId: string) => void;
  systemSettings: SystemSettings;
  onUpdateSystemSettings: (settings: SystemSettings) => void;
}

export const Employees: React.FC<EmployeesProps> = ({ 
  users = [], 
  onAddUser, 
  onUpdateUser,
  onDeleteUser,
  systemSettings,
  onUpdateSystemSettings
}) => {
  const [activeTab, setActiveTab] = useState<'LIST' | 'SETTINGS'>('LIST');
  const [showAddModal, setShowAddModal] = useState(false);
  
  // State for Editing
  // Use a type that allows commissionSplit to be undefined/string during editing for validation
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // State for Adding
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: UserRole.SALES,
    salesCategory: '1',
    commissionSplit: 0
  });
  // Temp state to allow empty string input
  const [newCommissionInput, setNewCommissionInput] = useState<string>('0');
  
  const [newPassword, setNewPassword] = useState('');

  // Settings State with Safe Defaults
  const [markupType, setMarkupType] = useState<'PERCENT' | 'FIXED'>('PERCENT');
  const [markupValue, setMarkupValue] = useState<number>(5);

  // Sync settings when they are loaded from App/DB
  useEffect(() => {
    if (systemSettings) {
      setMarkupType(systemSettings.cat2MarkupType || 'PERCENT');
      setMarkupValue(systemSettings.cat2MarkupValue || 0);
    }
  }, [systemSettings]);

  const salesManagers = users ? users.filter(u => u.role === UserRole.SALES_MANAGER) : [];

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;
    
    // Validate Commission
    if (newCommissionInput === '' || newCommissionInput === undefined) return;

    const userToAdd = { 
       ...newUser,
       commissionSplit: Number(newCommissionInput)
    };

    if (userToAdd.role !== UserRole.SALES) {
       delete userToAdd.salesCategory;
       delete userToAdd.managerId;
    }
    
    onAddUser(userToAdd, newPassword);
    setShowAddModal(false);
    setNewUser({ name: '', email: '', role: UserRole.SALES, salesCategory: '1', commissionSplit: 0 });
    setNewCommissionInput('0');
    setNewPassword('');
  };

  const handleEditSubmit = (e: React.FormEvent) => {
     e.preventDefault();
     if (editingUser) {
        // Double check validity before sending
        if (editingUser.commissionSplit === undefined || editingUser.commissionSplit === null) {
           return;
        }
        onUpdateUser(editingUser);
        setEditingUser(null);
     }
  };

  const handleDeleteClick = (userId: string) => {
     if (window.confirm("Czy na pewno chcesz usunąć tego pracownika? Tej operacji nie można cofnąć.")) {
        onDeleteUser(userId);
        if (editingUser?.id === userId) setEditingUser(null);
     }
  };

  const handleSettingsSave = () => {
    onUpdateSystemSettings({
      cat2MarkupType: markupType,
      cat2MarkupValue: markupValue
    });
  };

  const isCommissionInvalid = (val: number | undefined | null) => {
     return val === undefined || val === null || isNaN(val) || val.toString() === '';
  };

  return (
    <div className="p-4 md:p-8 space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800 flex items-center">
             <UserCog className="w-8 h-8 mr-3 text-blue-600" /> Zarządzanie Pracownikami
           </h2>
           <p className="text-slate-500 text-sm mt-1">Dodawaj użytkowników, nadawaj uprawnienia i konfiguruj system prowizyjny.</p>
        </div>
        <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">
           <button 
             onClick={() => setActiveTab('LIST')}
             className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'LIST' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
           >
             Lista Pracowników
           </button>
           <button 
             onClick={() => setActiveTab('SETTINGS')}
             className={`px-4 py-2 rounded-md font-bold text-sm transition-all ${activeTab === 'SETTINGS' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
           >
             Ustawienia Sprzedaży
           </button>
        </div>
      </div>

      {activeTab === 'LIST' && (
        <div className="space-y-6">
           <div className="flex justify-end">
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold shadow hover:bg-blue-700 flex items-center transition-colors"
              >
                <Plus className="w-5 h-5 mr-2" /> Dodaj Pracownika
              </button>
           </div>

           <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                   <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase">Pracownik</th>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase">Rola</th>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase">Szczegóły</th>
                         <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Akcje</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {users && users.length > 0 ? users.map(user => {
                         const manager = user.managerId ? users.find(u => u.id === user.managerId) : null;
                         return (
                            <tr key={user.id} className="hover:bg-slate-50">
                               <td className="p-4">
                                  <div className="flex items-center">
                                     <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center mr-3 text-slate-500 font-bold shrink-0">
                                        {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                                     </div>
                                     <div>
                                        <p className="font-bold text-slate-800 text-sm">{user.name}</p>
                                        <p className="text-xs text-slate-500">{user.email}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="p-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-bold border whitespace-nowrap ${
                                     user.role === UserRole.ADMIN ? 'bg-purple-100 text-purple-700 border-purple-200' :
                                     user.role === UserRole.SALES_MANAGER ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                     user.role === UserRole.SALES ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                     user.role === UserRole.INSTALLER ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                     'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                     {user.role}
                                  </span>
                               </td>
                               <td className="p-4 text-sm text-slate-600">
                                  {user.role === UserRole.SALES && (
                                     <div className="space-y-1">
                                        <p><span className="text-slate-400">Kategoria:</span> <b>{user.salesCategory === '1' ? '1 (Standard)' : '2 (Wyższa marża)'}</b></p>
                                        {manager && <p><span className="text-slate-400">Przełożony:</span> {manager.name}</p>}
                                        <p><span className="text-slate-400">Podział prowizji:</span> <b className="text-green-600">{user.commissionSplit || 0}%</b></p>
                                     </div>
                                  )}
                                  {user.role === UserRole.SALES_MANAGER && (
                                     <div className="space-y-1">
                                       <p className="text-xs text-slate-500 italic">Zarządza zespołem</p>
                                       <p><span className="text-slate-400">Podział prowizji:</span> <b className="text-green-600">{user.commissionSplit || 0}%</b></p>
                                     </div>
                                  )}
                                  {user.role === UserRole.ADMIN && (
                                     <div className="space-y-1">
                                        <p className="text-xs text-slate-400">Pełen dostęp</p>
                                        <p><span className="text-slate-400">Podział prowizji:</span> <b className="text-green-600">{user.commissionSplit || 0}%</b></p>
                                     </div>
                                  )}
                               </td>
                               <td className="p-4 text-right">
                                  <button 
                                    onClick={() => setEditingUser({...user})}
                                    className="text-slate-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                    title="Edytuj"
                                  >
                                     <Edit2 className="w-5 h-5"/>
                                  </button>
                               </td>
                            </tr>
                         );
                      }) : (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-slate-400">
                            Brak pracowników do wyświetlenia.
                          </td>
                        </tr>
                      )}
                   </tbody>
                </table>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'SETTINGS' && (
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-2xl">
            <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
               <Settings className="w-5 h-5 mr-2 text-slate-500" /> Konfiguracja Handlowców Kat. 2
            </h3>
            <p className="text-sm text-slate-500 mb-6">
               Ustal automatyczny narzut cenowy dla handlowców z drugiej kategorii. Zostanie on doliczony do ceny końcowej instalacji w kalkulatorze.
            </p>

            <div className="space-y-4">
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Typ narzutu</label>
                  <div className="flex gap-4">
                     <label className={`flex-1 p-3 border rounded-lg cursor-pointer flex items-center justify-center transition-all ${markupType === 'PERCENT' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white'}`}>
                        <input type="radio" name="markupType" value="PERCENT" checked={markupType === 'PERCENT'} onChange={() => setMarkupType('PERCENT')} className="hidden" />
                        <span className="font-bold text-sm">Procentowy (%)</span>
                     </label>
                     <label className={`flex-1 p-3 border rounded-lg cursor-pointer flex items-center justify-center transition-all ${markupType === 'FIXED' ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' : 'bg-white'}`}>
                        <input type="radio" name="markupType" value="FIXED" checked={markupType === 'FIXED'} onChange={() => setMarkupType('FIXED')} className="hidden" />
                        <span className="font-bold text-sm">Kwotowy (PLN)</span>
                     </label>
                  </div>
               </div>
               
               <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                     {markupType === 'PERCENT' ? 'Wartość procentowa (%)' : 'Wartość kwotowa (PLN)'}
                  </label>
                  <input 
                    type="number" 
                    value={markupValue}
                    onChange={(e) => setMarkupValue(Number(e.target.value))}
                    className="w-full p-3 border rounded-lg font-bold text-lg text-slate-900 bg-white"
                    min="0"
                  />
               </div>

               <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button 
                    onClick={handleSettingsSave}
                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center shadow-sm"
                  >
                     <Save className="w-4 h-4 mr-2" /> Zapisz Ustawienia
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
           <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col relative z-10 max-h-[90vh]">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-2xl shrink-0">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center">
                     <Plus className="w-6 h-6 mr-2 text-blue-600" /> Dodaj Pracownika
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full">
                    <X className="w-5 h-5" />
                  </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form id="addUserForm" onSubmit={handleAddSubmit} className="space-y-5">
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Imię i Nazwisko</label>
                        <div className="relative">
                            <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                            <input type="text" required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none" placeholder="np. Jan Kowalski" />
                        </div>
                     </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1.5">Email (Login)</label>
                           <div className="relative">
                               <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                               <input type="email" required value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full pl-9 pr-3 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="jan@firma.pl" />
                           </div>
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-1.5">Hasło</label>
                           <div className="relative">
                               <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                               <input type="text" required value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full pl-9 pr-3 py-3 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none text-sm" placeholder="Min. 6 znaków" />
                           </div>
                        </div>
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Rola w systemie</label>
                        <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})} className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
                           {Object.values(UserRole).map(role => (
                              <option key={role} value={role}>{role}</option>
                           ))}
                        </select>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-center space-x-2 text-blue-800 font-bold text-sm pb-2 border-b border-slate-200">
                             <Settings className="w-4 h-4" /> <span>Opcje Pracownika</span>
                        </div>
                        {newUser.role === UserRole.SALES && (
                           <>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategoria Prowizyjna</label>
                              <select value={newUser.salesCategory} onChange={e => setNewUser({...newUser, salesCategory: e.target.value as any})} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-800">
                                 <option value="1">Kategoria 1 (Standard)</option>
                                 <option value="2">Kategoria 2 (Wyższa cena)</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Przypisz do Kierownika</label>
                              <select value={newUser.managerId || ''} onChange={e => setNewUser({...newUser, managerId: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm text-slate-800">
                                 <option value="">-- Bezpośrednio pod Admina --</option>
                                 {salesManagers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                 ))}
                              </select>
                           </div>
                           </>
                        )}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
                              Podział Prowizji (%)
                              {(newCommissionInput === '' || newCommissionInput === undefined) && <span className="text-red-500 text-[10px] flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> Wymagane</span>}
                           </label>
                           <div className="relative">
                              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                              <input 
                                 type="number" 
                                 min="0" 
                                 max="100" 
                                 value={newCommissionInput} 
                                 onChange={e => setNewCommissionInput(e.target.value)} 
                                 className={`w-full pl-9 pr-3 py-2.5 border rounded-lg bg-white text-sm text-slate-800 outline-none focus:ring-2 ${
                                    (newCommissionInput === '' || newCommissionInput === undefined) 
                                      ? 'border-red-500 ring-red-200 focus:ring-red-500 bg-red-50' 
                                      : 'border-slate-300 focus:ring-blue-500'
                                 }`} 
                                 placeholder="np. 50"
                              />
                           </div>
                           <p className="text-[10px] text-slate-400 mt-1">Procent marży wypłacany pracownikowi.</p>
                        </div>
                     </div>
                  </form>
              </div>
              <div className="p-5 border-t border-slate-100 flex justify-end space-x-3 bg-white rounded-b-2xl shrink-0">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl">Anuluj</button>
                  <button 
                     type="submit" 
                     form="addUserForm" 
                     disabled={newCommissionInput === '' || newCommissionInput === undefined}
                     className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                      <Plus className="w-4 h-4 mr-2" /> Utwórz Konto
                  </button>
              </div>
           </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
             <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingUser(null)}></div>
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col relative z-10 max-h-[90vh]">
                <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50/80 rounded-t-xl shrink-0">
                   <h3 className="text-xl font-bold text-slate-800 flex items-center">
                      <Edit2 className="w-5 h-5 mr-2 text-blue-600" /> Edycja Pracownika
                   </h3>
                   <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full">
                      <X className="w-5 h-5" />
                   </button>
                </div>
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <form id="editUserForm" onSubmit={handleEditSubmit} className="space-y-5">
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1">Imię i Nazwisko</label>
                        <input type="text" required value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} className="w-full p-3 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500 outline-none" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1">Email (Login)</label>
                        <input type="email" disabled value={editingUser.email} className="w-full p-3 border border-slate-200 rounded-lg bg-slate-100 text-slate-500 cursor-not-allowed" />
                     </div>
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-1">Rola w systemie</label>
                        <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})} className="w-full p-3 border border-slate-300 rounded-lg bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none">
                           {Object.values(UserRole).map(role => (
                              <option key={role} value={role}>{role}</option>
                           ))}
                        </select>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                        <div className="flex items-center space-x-2 text-blue-800 font-bold text-sm pb-2 border-b border-slate-200">
                           <Settings className="w-4 h-4" /> <span>Ustawienia Sprzedażowe</span>
                        </div>
                        {editingUser.role === UserRole.SALES && (
                           <>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategoria Prowizyjna</label>
                              <select value={editingUser.salesCategory || '1'} onChange={e => setEditingUser({...editingUser, salesCategory: e.target.value as any})} className="w-full p-2 border border-slate-300 rounded bg-white text-sm text-slate-800">
                                 <option value="1">Kategoria 1 (Standard)</option>
                                 <option value="2">Kategoria 2 (Wyższa cena +{systemSettings?.cat2MarkupValue || 0}{systemSettings?.cat2MarkupType === 'PERCENT' ? '%' : 'PLN'})</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Przełożony (Kierownik)</label>
                              <select value={editingUser.managerId || ''} onChange={e => setEditingUser({...editingUser, managerId: e.target.value})} className="w-full p-2 border border-slate-300 rounded bg-white text-sm text-slate-800">
                                 <option value="">-- Bezpośrednio pod Admina --</option>
                                 {salesManagers.filter(m => m.id !== editingUser.id).map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                 ))}
                              </select>
                           </div>
                           </>
                        )}
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex justify-between">
                              Podział Prowizji (%)
                              {isCommissionInvalid(editingUser.commissionSplit) && <span className="text-red-500 text-[10px] flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> Wymagane</span>}
                           </label>
                           <div className="relative">
                              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                              <input 
                                 type="number" 
                                 min="0" 
                                 max="100" 
                                 // Handle empty input by converting to string if needed or handling in onChange
                                 value={editingUser.commissionSplit === undefined || editingUser.commissionSplit === null ? '' : editingUser.commissionSplit} 
                                 onChange={e => {
                                    const val = e.target.value;
                                    setEditingUser({
                                       ...editingUser, 
                                       commissionSplit: val === '' ? undefined : Number(val) as any
                                    });
                                 }} 
                                 className={`w-full pl-9 pr-3 py-2.5 border rounded-lg bg-white text-sm text-slate-800 outline-none focus:ring-2 ${
                                    isCommissionInvalid(editingUser.commissionSplit) 
                                      ? 'border-red-500 ring-red-200 focus:ring-red-500 bg-red-50' 
                                      : 'border-slate-300 focus:ring-blue-500'
                                 }`} 
                                 placeholder="np. 50"
                              />
                           </div>
                        </div>
                     </div>
                  </form>
                </div>
                <div className="p-5 border-t border-slate-100 flex justify-between items-center bg-white rounded-b-xl shrink-0">
                    <button type="button" onClick={() => handleDeleteClick(editingUser.id)} className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg font-bold flex items-center">
                       <Trash2 className="w-4 h-4 mr-2" /> Usuń
                    </button>
                    <div className="flex space-x-3">
                       <button type="button" onClick={() => setEditingUser(null)} className="px-5 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Anuluj</button>
                       <button 
                         type="submit" 
                         form="editUserForm" 
                         disabled={isCommissionInvalid(editingUser.commissionSplit)}
                         className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-sm hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                       >
                          <Save className="w-4 h-4 mr-2" /> Zapisz
                       </button>
                    </div>
                </div>
             </div>
         </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, Installation, User, InventoryItem, Offer, CustomerNote, UserRole, PaymentEntry, UploadedFile, InstallationStatus, NotificationType } from '../types';
import { 
  Search, Plus, User as UserIcon, Phone, Mail, MapPin, FileText, 
  Wrench, DollarSign, Calendar, Clock, Send, MessageSquare, 
  Trash2, Edit2, Save, X, CheckCircle, AlertTriangle, 
  History as HistoryIcon, Paperclip, ExternalLink, Download, 
  MoreVertical, FilePlus, ChevronRight, PenTool, Image as ImageIcon, Briefcase
} from 'lucide-react';

interface CustomersProps {
  customers: Customer[];
  installations: Installation[];
  users: User[];
  inventory: InventoryItem[];
  currentUser: User;
  onUpdateCustomer: (c: Customer) => Promise<void>;
  onUpdateInstallation: (i: Installation) => Promise<void>;
  onAddPayment: (instId: string, p: PaymentEntry) => void;
  onRemovePayment: (instId: string, pId: string) => void;
  onAddCommissionPayout: (instId: string, p: PaymentEntry) => void;
  onRemoveCommissionPayout: (instId: string, pId: string) => void;
  onShowNotification: (msg: string, type: NotificationType) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  onEditOffer: (offer: Offer) => void;
  onAcceptOffer: (custId: string, offId: string) => void;
  onAddCustomer: (data: { name: string, email: string, phone: string, address: string }) => void;
}

export const Customers: React.FC<CustomersProps> = ({
  customers,
  installations,
  users,
  inventory,
  currentUser,
  onUpdateCustomer,
  onUpdateInstallation,
  onAddPayment,
  onRemovePayment,
  onAddCommissionPayout,
  onRemoveCommissionPayout,
  onShowNotification,
  selectedCustomerId,
  setSelectedCustomerId,
  onEditOffer,
  onAcceptOffer,
  onAddCustomer
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'offers' | 'installations' | 'notes' | 'files'>('details');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', email: '', phone: '', address: '' });
  
  // Edit Form State
  const [editForm, setEditForm] = useState<Customer | null>(null);
  
  // Notes State
  const [newNoteContent, setNewNoteContent] = useState('');

  // Derived Data
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );
  }, [customers, searchTerm]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  const customerInstallation = useMemo(() => 
    installations.find(i => i.customerId === selectedCustomerId), 
  [installations, selectedCustomerId]);

  // Sync editForm with selectedCustomer
  useEffect(() => {
    if (selectedCustomer) {
       setEditForm(JSON.parse(JSON.stringify(selectedCustomer)));
    } else {
       setEditForm(null);
    }
  }, [selectedCustomer]);

  const handleSaveCustomer = async () => {
    if (editForm) {
      await onUpdateCustomer(editForm);
      onShowNotification('Zapisano zmiany w kliencie', 'success');
    }
  };

  const handleAddNote = async () => {
    if (!editForm || !newNoteContent.trim()) return;

    const newNote: CustomerNote = {
      id: Date.now().toString(),
      content: newNoteContent,
      authorId: currentUser.id,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      date: new Date().toISOString()
    };

    const updatedCustomer = {
      ...editForm,
      notesHistory: [newNote, ...(editForm.notesHistory || [])]
    };

    setEditForm(updatedCustomer);
    setNewNoteContent('');
    
    // Save immediately
    await onUpdateCustomer(updatedCustomer);
    onShowNotification('Notatka dodana', 'success');
  };

  const getRoleConfig = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return { color: 'bg-purple-100 text-purple-700 border-purple-200', iconColor: 'bg-purple-600', label: 'Admin' };
      case UserRole.SALES_MANAGER: return { color: 'bg-indigo-100 text-indigo-700 border-indigo-200', iconColor: 'bg-indigo-600', label: 'Manager' };
      case UserRole.SALES: return { color: 'bg-blue-100 text-blue-700 border-blue-200', iconColor: 'bg-blue-600', label: 'Handlowiec' };
      case UserRole.INSTALLER: return { color: 'bg-amber-100 text-amber-700 border-amber-200', iconColor: 'bg-amber-600', label: 'Montażysta' };
      case UserRole.OFFICE: return { color: 'bg-slate-100 text-slate-700 border-slate-200', iconColor: 'bg-slate-600', label: 'Biuro' };
      default: return { color: 'bg-gray-100 text-gray-700 border-gray-200', iconColor: 'bg-gray-600', label: 'Użytkownik' };
    }
  };

  const getRepName = (id?: string) => {
     const u = users.find(user => user.id === id);
     return u ? u.name : 'Nieprzypisany';
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomer(newCustomerData);
    setNewCustomerData({ name: '', email: '', phone: '', address: '' });
    setShowAddModal(false);
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-slate-50 overflow-hidden">
      
      {/* Sidebar List */}
      <div className={`w-full md:w-80 lg:w-96 bg-white border-r border-slate-200 flex flex-col z-20 ${selectedCustomerId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 shrink-0">
           <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-slate-800">Klienci</h2>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                 <Plus className="w-5 h-5" />
              </button>
           </div>
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Szukaj klienta..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
           {filteredCustomers.length > 0 ? (
              <div className="divide-y divide-slate-50">
                 {filteredCustomers.map(customer => (
                    <div 
                      key={customer.id}
                      onClick={() => setSelectedCustomerId(customer.id)}
                      className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors ${selectedCustomerId === customer.id ? 'bg-blue-50 border-l-4 border-blue-600' : 'border-l-4 border-transparent'}`}
                    >
                       <h3 className={`font-bold text-sm ${selectedCustomerId === customer.id ? 'text-blue-700' : 'text-slate-800'}`}>{customer.name}</h3>
                       <div className="flex items-center text-xs text-slate-500 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="truncate">{customer.address}</span>
                       </div>
                       <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full border border-slate-200">
                             {getRepName(customer.repId)}
                          </span>
                          {/* Installation Status Badge */}
                          {(() => {
                             const inst = installations.find(i => i.customerId === customer.id);
                             if (inst) return (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                   inst.status === 'Zakończone' ? 'bg-green-100 text-green-700' : 
                                   inst.status === 'Nowy' ? 'bg-slate-100 text-slate-600' :
                                   'bg-blue-100 text-blue-700'
                                }`}>
                                   {inst.status}
                                </span>
                             );
                             return null;
                          })()}
                       </div>
                    </div>
                 ))}
              </div>
           ) : (
              <div className="p-8 text-center text-slate-400">
                 <UserIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                 <p className="text-sm">Brak wyników</p>
              </div>
           )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col bg-slate-50 overflow-hidden ${!selectedCustomerId ? 'hidden md:flex' : 'flex'}`}>
         {selectedCustomer && editForm ? (
            <>
               {/* Header */}
               <div className="bg-white border-b border-slate-200 p-4 md:p-6 shrink-0 shadow-sm z-10">
                  <div className="flex items-center mb-4 md:hidden">
                     <button onClick={() => setSelectedCustomerId(null)} className="mr-3 text-slate-500 hover:text-slate-800">
                        <ChevronRight className="w-6 h-6 rotate-180" />
                     </button>
                     <h2 className="font-bold text-lg text-slate-800 truncate">{editForm.name}</h2>
                  </div>

                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-lg">
                           {editForm.name.charAt(0)}
                        </div>
                        <div>
                           <h1 className="text-xl md:text-2xl font-bold text-slate-900">{editForm.name}</h1>
                           <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                              <span className="flex items-center"><Mail className="w-3.5 h-3.5 mr-1.5" />{editForm.email}</span>
                              <span className="flex items-center"><Phone className="w-3.5 h-3.5 mr-1.5" />{editForm.phone}</span>
                              <span className="flex items-center"><Briefcase className="w-3.5 h-3.5 mr-1.5" />{getRepName(editForm.repId)}</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-2 w-full md:w-auto">
                        <button onClick={handleSaveCustomer} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm flex items-center justify-center transition-colors">
                           <Save className="w-4 h-4 mr-2" /> Zapisz
                        </button>
                     </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex space-x-1 mt-8 border-b border-slate-200 overflow-x-auto hide-scrollbar">
                     {[
                        { id: 'details', label: 'Szczegóły', icon: UserIcon },
                        { id: 'offers', label: 'Oferty', icon: FileText },
                        { id: 'installations', label: 'Instalacja', icon: Wrench },
                        { id: 'notes', label: 'Notatki', icon: MessageSquare },
                        { id: 'files', label: 'Pliki', icon: Paperclip }
                     ].map(tab => (
                        <button
                           key={tab.id}
                           onClick={() => setActiveTab(tab.id as any)}
                           className={`flex items-center px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
                              activeTab === tab.id 
                                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                           }`}
                        >
                           <tab.icon className="w-4 h-4 mr-2" />
                           {tab.label}
                        </button>
                     ))}
                  </div>
               </div>

               {/* Tab Content */}
               <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
                  
                  {/* TAB: DETAILS */}
                  {activeTab === 'details' && (
                     <div className="max-w-4xl space-y-6 animate-fade-in">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                           <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
                              <UserIcon className="w-5 h-5 mr-2 text-blue-500" /> Dane Kontaktowe
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imię i Nazwisko</label>
                                 <input 
                                   type="text" 
                                   value={editForm.name} 
                                   onChange={e => setEditForm({...editForm, name: e.target.value})}
                                   className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adres Email</label>
                                 <input 
                                   type="email" 
                                   value={editForm.email} 
                                   onChange={e => setEditForm({...editForm, email: e.target.value})}
                                   className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon</label>
                                 <input 
                                   type="text" 
                                   value={editForm.phone} 
                                   onChange={e => setEditForm({...editForm, phone: e.target.value})}
                                   className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adres</label>
                                 <input 
                                   type="text" 
                                   value={editForm.address} 
                                   onChange={e => setEditForm({...editForm, address: e.target.value})}
                                   className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" 
                                 />
                              </div>
                              <div className="md:col-span-2">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Opiekun Handlowy</label>
                                 <select 
                                   value={editForm.repId || ''} 
                                   onChange={e => setEditForm({...editForm, repId: e.target.value})}
                                   className="w-full p-3 border border-slate-200 rounded-xl bg-white"
                                 >
                                    <option value="">-- Wybierz opiekuna --</option>
                                    {users.filter(u => u.role === UserRole.SALES || u.role === UserRole.SALES_MANAGER || u.role === UserRole.ADMIN).map(u => (
                                       <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                                    ))}
                                 </select>
                              </div>
                           </div>
                        </div>
                     </div>
                  )}
                  
                  {/* TAB: OFFERS */}
                  {activeTab === 'offers' && (
                     <div className="max-w-4xl space-y-6 animate-fade-in">
                        {editForm.offers && editForm.offers.length > 0 ? (
                           <div className="grid gap-4">
                              {editForm.offers.map(offer => (
                                 <div key={offer.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-blue-300 transition-colors">
                                    <div>
                                       <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-bold text-slate-800 text-lg">{offer.name}</h4>
                                          {offer.status === 'ACCEPTED' && (
                                             <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-bold flex items-center">
                                                <CheckCircle className="w-3 h-3 mr-1" /> Zaakceptowana
                                             </span>
                                          )}
                                       </div>
                                       <p className="text-slate-500 text-sm">
                                          Utworzono: {new Date(offer.dateCreated).toLocaleDateString()} | Kwota: <b>{offer.finalPrice.toLocaleString()} PLN</b>
                                       </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <button 
                                          onClick={() => onEditOffer(offer)}
                                          className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center"
                                       >
                                          <Edit2 className="w-4 h-4 mr-2" /> Edytuj
                                       </button>
                                       {offer.status !== 'ACCEPTED' && (
                                          <button 
                                             onClick={() => onAcceptOffer(editForm.id, offer.id)}
                                             className="px-4 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg flex items-center shadow-sm"
                                          >
                                             <CheckCircle className="w-4 h-4 mr-2" /> Akceptuj
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <div className="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300">
                              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                              <p className="text-slate-500 font-medium">Brak ofert dla tego klienta.</p>
                              <p className="text-sm text-slate-400">Przejdź do zakładki "Aplikacje", aby stworzyć nową ofertę.</p>
                           </div>
                        )}
                     </div>
                  )}

                  {/* TAB: INSTALLATION */}
                  {activeTab === 'installations' && (
                     <div className="max-w-4xl space-y-6 animate-fade-in">
                        {customerInstallation ? (
                           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                                 <div>
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center">
                                       <Wrench className="w-5 h-5 mr-2 text-amber-500" /> Instalacja #{customerInstallation.id.slice(0,6)}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">Status: <span className="font-bold text-blue-600 uppercase">{customerInstallation.status}</span></p>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-xs text-slate-400 font-bold uppercase">Moc Systemu</p>
                                    <p className="text-2xl font-bold text-slate-800">{customerInstallation.systemSizeKw} kWp</p>
                                 </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">Szczegóły Techniczne</h4>
                                    <div className="space-y-2 text-sm">
                                       <div className="flex justify-between"><span className="text-slate-500">Panele:</span> <span className="font-medium">{customerInstallation.panelModel || '-'}</span></div>
                                       <div className="flex justify-between"><span className="text-slate-500">Falownik:</span> <span className="font-medium">{customerInstallation.inverterModel || '-'}</span></div>
                                       <div className="flex justify-between"><span className="text-slate-500">Magazyn:</span> <span className="font-medium">{customerInstallation.storageModel || 'Brak'} ({customerInstallation.storageSizeKw || 0} kWh)</span></div>
                                       <div className="flex justify-between"><span className="text-slate-500">Montaż:</span> <span className="font-medium">{customerInstallation.mountingSystem || '-'}</span></div>
                                    </div>
                                 </div>
                                 
                                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">Harmonogram</h4>
                                    <div className="space-y-2 text-sm">
                                       <div className="flex justify-between"><span className="text-slate-500">Data montażu:</span> <span className="font-medium">{customerInstallation.dateScheduled || 'Do ustalenia'}</span></div>
                                       <div className="flex justify-between"><span className="text-slate-500">Ekipa:</span> <span className="font-medium">{users.find(u => u.id === customerInstallation.assignedTeam)?.name || 'Nieprzypisana'}</span></div>
                                       <div className="flex justify-between"><span className="text-slate-500">Adres:</span> <span className="font-medium truncate max-w-[150px]">{customerInstallation.address}</span></div>
                                    </div>
                                 </div>
                              </div>

                              {/* Simple Payments View (Read Only here, management in Installations view) */}
                              <div>
                                 <h4 className="font-bold text-slate-800 mb-3 text-sm uppercase flex items-center">
                                    <DollarSign className="w-4 h-4 mr-1"/> Finanse
                                 </h4>
                                 <div className="w-full bg-slate-100 rounded-full h-4 mb-2 overflow-hidden">
                                    <div 
                                      className="bg-green-500 h-full rounded-full" 
                                      style={{ width: `${Math.min(100, (customerInstallation.paidAmount / (customerInstallation.price || 1)) * 100)}%` }}
                                    ></div>
                                 </div>
                                 <div className="flex justify-between text-sm font-bold">
                                    <span className="text-green-600">Opłacono: {customerInstallation.paidAmount.toLocaleString()} PLN</span>
                                    <span className="text-slate-600">Suma: {customerInstallation.price.toLocaleString()} PLN</span>
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300">
                              <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                              <p className="text-slate-500 font-medium">Brak aktywnej instalacji.</p>
                              <p className="text-sm text-slate-400">Zaakceptuj ofertę, aby rozpocząć proces instalacji.</p>
                           </div>
                        )}
                     </div>
                  )}

                  {/* TAB: NOTES (MODERN & READABLE) */}
                  {activeTab === 'notes' && (
                     <div className="max-w-4xl space-y-8 animate-fade-in flex flex-col h-full">
                        {/* 1. New Note Composer (Top) */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm shrink-0 relative z-10">
                           <div className="flex items-start gap-4">
                              <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-md shrink-0 overflow-hidden">
                                 <UserIcon className="w-5 h-5" />
                              </div>
                              <div className="flex-1">
                                 <textarea 
                                    className="w-full p-4 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-slate-50 focus:bg-white transition-all shadow-inner placeholder:text-slate-400"
                                    placeholder="Napisz notatkę o kliencie..."
                                    rows={3}
                                    value={newNoteContent}
                                    onChange={(e) => setNewNoteContent(e.target.value)}
                                 ></textarea>
                                 <div className="flex justify-between items-center mt-3">
                                    <p className="text-xs text-slate-400 font-medium">
                                       Notatka zostanie przypisana do: <span className="text-slate-600 font-bold">{currentUser.name}</span>
                                    </p>
                                    <button 
                                       onClick={handleAddNote}
                                       disabled={!newNoteContent.trim()}
                                       className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md disabled:opacity-50 disabled:shadow-none flex items-center hover:scale-105 active:scale-95"
                                    >
                                       <Send className="w-4 h-4 mr-2" /> Dodaj Notatkę
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* 2. Timeline History */}
                        <div className="flex-1 overflow-y-auto pr-2 pb-12">
                           {editForm.notesHistory && editForm.notesHistory.length > 0 ? (
                              <div className="relative pl-14 space-y-8 before:absolute before:left-[27px] before:top-2 before:h-full before:w-0.5 before:bg-slate-200 before:content-['']">
                                 {editForm.notesHistory.map((note) => {
                                    const roleStyle = getRoleConfig(note.authorRole);
                                    return (
                                       <div key={note.id} className="relative animate-slide-up">
                                          {/* Timeline Dot with Avatar */}
                                          <div className={`absolute left-2 top-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md border-4 border-slate-50 z-10 overflow-hidden ${roleStyle.iconColor}`}>
                                             <UserIcon className="w-5 h-5" />
                                          </div>

                                          {/* Content Card */}
                                          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                                             {/* Card Header */}
                                             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
                                                <div className="flex items-center gap-2">
                                                   <span className="font-bold text-slate-900">{note.authorName}</span>
                                                   <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full border ${roleStyle.color}`}>
                                                      {roleStyle.label}
                                                   </span>
                                                </div>
                                                <div className="flex items-center text-xs text-slate-400 font-medium">
                                                   <Clock className="w-3.5 h-3.5 mr-1.5" />
                                                   {new Date(note.date).toLocaleString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                             </div>
                                             
                                             {/* Note Body */}
                                             <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
                                                {note.content}
                                             </div>
                                          </div>
                                       </div>
                                    );
                                 })}
                              </div>
                           ) : (
                              /* Legacy or Empty State */
                              editForm.notes ? (
                                 <div className="bg-amber-50 p-6 rounded-2xl border border-amber-200 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed shadow-sm">
                                    <div className="flex items-center mb-4 font-bold text-amber-800 uppercase tracking-wide text-xs border-b border-amber-200 pb-2">
                                       <HistoryIcon className="w-4 h-4 mr-2"/> Archiwum notatek (Legacy)
                                    </div>
                                    {editForm.notes}
                                 </div>
                              ) : (
                                 <div className="text-center py-16 flex flex-col items-center">
                                    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-300">
                                       <MessageSquare className="w-10 h-10" />
                                    </div>
                                    <p className="text-slate-500 font-medium">Brak notatek dla tego klienta.</p>
                                    <p className="text-xs text-slate-400 mt-1">Bądź pierwszy i dodaj nową notatkę powyżej.</p>
                                 </div>
                              )
                           )}
                        </div>
                     </div>
                  )}

                  {/* TAB: FILES */}
                  {activeTab === 'files' && (
                     <div className="max-w-4xl space-y-6 animate-fade-in">
                        <div className="bg-white p-8 rounded-2xl border-2 border-dashed border-slate-300 text-center hover:bg-slate-50 transition-colors cursor-pointer">
                           <FilePlus className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                           <p className="font-bold text-slate-800">Przeciągnij pliki tutaj lub kliknij, aby dodać</p>
                           <p className="text-sm text-slate-400 mt-2">Dokumenty, zdjęcia, umowy (PDF, JPG, PNG)</p>
                        </div>

                        {/* File List Mockup */}
                        <div className="space-y-3">
                           {editForm.files && editForm.files.length > 0 ? (
                              editForm.files.map(file => (
                                 <div key={file.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center">
                                       <div className="p-3 bg-blue-50 text-blue-600 rounded-lg mr-4">
                                          <FileText className="w-6 h-6" />
                                       </div>
                                       <div>
                                          <p className="font-bold text-slate-800 text-sm">{file.name}</p>
                                          <p className="text-xs text-slate-400">{new Date(file.dateUploaded).toLocaleDateString()} • {file.type}</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <button className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                          <Download className="w-5 h-5" />
                                       </button>
                                       <button className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                          <Trash2 className="w-5 h-5" />
                                       </button>
                                    </div>
                                 </div>
                              ))
                           ) : (
                              <p className="text-center text-slate-400 py-4 text-sm">Brak plików</p>
                           )}
                        </div>
                     </div>
                  )}

               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
               <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                  <UserIcon className="w-12 h-12 opacity-20" />
               </div>
               <h2 className="text-2xl font-bold text-slate-400">Wybierz klienta</h2>
               <p className="text-slate-400 mt-2">Wybierz osobę z listy po lewej, aby zobaczyć szczegóły.</p>
            </div>
         )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 animate-fade-in">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                 <h3 className="text-xl font-bold text-slate-800">Nowy Klient</h3>
                 <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-6 h-6" />
                 </button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imię i Nazwisko</label>
                    <input 
                      type="text" 
                      required 
                      value={newCustomerData.name} 
                      onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                    <input 
                      type="email" 
                      required 
                      value={newCustomerData.email} 
                      onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon</label>
                    <input 
                      type="text" 
                      required 
                      value={newCustomerData.phone} 
                      onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adres</label>
                    <input 
                      type="text" 
                      required 
                      value={newCustomerData.address} 
                      onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})}
                      className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                 </div>
                 <div className="pt-4">
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-blue-700 transition-colors">
                       Dodaj Klienta
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

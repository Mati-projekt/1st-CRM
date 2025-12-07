import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Customer, Installation, InstallationStatus, UploadedFile, Offer, UserRole, PaymentEntry, User } from '../types';
import { Search, Phone, MapPin, Plus, Save, Zap, File as FileIcon, Camera, Image as ImageIcon, ClipboardList, User as UserIcon, FilePieChart, Banknote, History, Check, CheckCircle, Upload, Trash2, Users, FileText, Hammer, X, Shovel, ArrowLeft, Download, Maximize2, Filter, Briefcase, Sun, Wind, Home } from 'lucide-react';
import { generateCustomerEmail } from '../services/geminiService';
import { NotificationType } from './Notification';

interface CustomersProps {
  customers: Customer[];
  installations: Installation[];
  users?: User[]; // Pass all users to find installers and owners
  onUpdateCustomer: (customer: Customer) => void;
  onUpdateInstallation: (installation: Installation) => void;
  onAddPayment: (installationId: string, payment: PaymentEntry) => void;
  onRemovePayment: (installationId: string, paymentId: string) => void;
  onShowNotification: (message: string, type?: NotificationType) => void;
  selectedCustomerId: string | null;
  setSelectedCustomerId: (id: string | null) => void;
  onEditOffer: (offer: Offer) => void;
  onAcceptOffer: (customerId: string, offerId: string) => Promise<void>;
  onAddCustomer: (customerData: { name: string, email: string, phone: string, address: string }) => void;
  currentUser: User; // Changed from separate role/name to full User object
}

type TabType = 'data' | 'finances' | 'audit' | 'files' | 'notes' | 'offers';

export const Customers: React.FC<CustomersProps> = ({ 
  customers, 
  installations, 
  users = [],
  onUpdateCustomer, 
  onUpdateInstallation,
  onAddPayment,
  onRemovePayment,
  onShowNotification,
  selectedCustomerId,
  setSelectedCustomerId,
  onEditOffer,
  onAcceptOffer,
  onAddCustomer,
  currentUser
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [ownerFilter, setOwnerFilter] = useState<string>('ALL'); // 'ALL', 'MINE', 'TEAM', or specific userId
  const [editForm, setEditForm] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('data');
  
  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    email: '',
    phone: '',
    street: '',
    zip: '',
    city: '',
    county: '',
    voivodeship: ''
  });

  const [addressDetails, setAddressDetails] = useState({
    street: '',
    zip: '',
    city: '',
    county: '',
    voivodeship: ''
  });
  
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Finances State
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newPaymentDate, setNewPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newPaymentComment, setNewPaymentComment] = useState('');

  // Audit State
  const [photoDescription, setPhotoDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<UploadedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const auditInputRef = useRef<HTMLInputElement>(null);

  const isInstaller = currentUser.role === UserRole.INSTALLER;
  const isManager = currentUser.role === UserRole.SALES_MANAGER;
  const isAdmin = currentUser.role === UserRole.ADMIN;
  
  const canEditStatus = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OFFICE || currentUser.role === UserRole.SALES_MANAGER;
  const canEditFinances = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OFFICE;
  const canAcceptOffer = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OFFICE || currentUser.role === UserRole.SALES || currentUser.role === UserRole.SALES_MANAGER;
  const canEditInstallationDetails = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OFFICE || currentUser.role === UserRole.SALES_MANAGER;
  const canAssignTeam = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OFFICE || currentUser.role === UserRole.SALES_MANAGER;

  // Filter tabs for installers
  const visibleTabs: { id: TabType, label: string, icon: any }[] = [
    { id: 'data', label: 'Dane', icon: UserIcon },
    { id: 'audit', label: 'Audyt', icon: Camera },
    { id: 'files', label: 'Pliki', icon: FileIcon },
    { id: 'notes', label: 'Notatki', icon: ClipboardList },
  ];

  if (!isInstaller) {
     visibleTabs.splice(1, 0, { id: 'offers', label: 'Oferty', icon: FilePieChart });
     visibleTabs.splice(3, 0, { id: 'finances', label: 'Finanse', icon: Banknote });
  }

  // --- FILTERING LOGIC ---
  const filteredCustomers = useMemo(() => {
    let result = customers;

    // 1. Text Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.email.toLowerCase().includes(term)
      );
    }

    // 2. Owner Filter (Manager/Admin features)
    if (ownerFilter !== 'ALL') {
      if (ownerFilter === 'MINE') {
        result = result.filter(c => c.repId === currentUser.id);
      } else if (ownerFilter === 'TEAM') {
        // Clients that are NOT mine (belong to subordinates)
        result = result.filter(c => c.repId !== currentUser.id); 
      } else {
        // Specific User ID selected
        result = result.filter(c => c.repId === ownerFilter);
      }
    }

    return result;
  }, [customers, searchTerm, ownerFilter, currentUser.id]);

  // Determine subordinates for filter dropdown
  const subordinates = useMemo(() => {
    if (isAdmin) return users.filter(u => u.role === UserRole.SALES || u.role === UserRole.SALES_MANAGER);
    if (isManager) return users.filter(u => u.managerId === currentUser.id);
    return [];
  }, [users, isAdmin, isManager, currentUser.id]);

  const selectedInstallation = installations.find(i => i.customerId === selectedCustomerId);
  
  const acceptedOffer = editForm?.offers?.find(o => o.status === 'ACCEPTED');
  
  const installerTeams = users.filter(u => u.role === UserRole.INSTALLER);

  // Helper to get owner name
  const getCustomerOwner = (repId?: string) => {
    if (!repId) return 'Nieprzypisany';
    const owner = users.find(u => u.id === repId);
    return owner ? owner.name : 'Nieznany';
  };

  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setEditForm({ ...customer });
        
        const parts = customer.address.split(',').map(s => s.trim());
        if (parts.length >= 1) setAddressDetails(prev => ({ ...prev, street: parts[0] }));
        if (parts.length >= 2) {
           const zipCity = parts[1];
           const zipMatch = zipCity.match(/\d{2}-\d{3}/);
           if (zipMatch) {
              setAddressDetails(prev => ({ ...prev, zip: zipMatch[0], city: zipCity.replace(zipMatch[0], '').trim() }));
           } else {
              setAddressDetails(prev => ({ ...prev, city: zipCity }));
           }
        }
        if (parts.length >= 3) setAddressDetails(prev => ({ ...prev, county: parts[2] }));
        if (parts.length >= 4) setAddressDetails(prev => ({ ...prev, voivodeship: parts[3] }));

        if (editForm?.id !== customer.id) {
           setAiDraft(null);
        }
      }
    } else {
      setEditForm(null);
    }
  }, [selectedCustomerId, customers]);

  // If installer selects customer, default to Data tab if current active tab is restricted
  useEffect(() => {
    if (isInstaller && (activeTab === 'finances' || activeTab === 'offers')) {
        setActiveTab('data');
    }
  }, [isInstaller, activeTab]);

  const handleGenerateEmail = async () => {
    if (!editForm || !selectedInstallation) return;
    
    setIsGenerating(true);
    setAiDraft(null);
    const draft = await generateCustomerEmail(editForm, selectedInstallation);
    setAiDraft(draft);
    setIsGenerating(false);
    onShowNotification("Wygenerowano propozycję wiadomości email", 'info');
  };

  const handleInputChange = (field: keyof Customer, value: any) => {
    if (editForm) {
      setEditForm({ ...editForm, [field]: value });
    }
  };

  const handleAddressDetailChange = (field: string, value: string) => {
    setAddressDetails(prev => {
        const updated = { ...prev, [field]: value };
        const fullAddress = `${updated.street}, ${updated.zip} ${updated.city}, ${updated.county}, ${updated.voivodeship}`;
        if (editForm) {
            setEditForm({ ...editForm, address: fullAddress });
        }
        return updated;
    });
  };

  const handleSaveCustomer = () => {
    if (editForm) {
      onUpdateCustomer(editForm);
    }
  };

  const handleStatusChange = (newStatus: InstallationStatus) => {
    if (selectedInstallation) {
      onUpdateInstallation({ ...selectedInstallation, status: newStatus });
    }
  };

  const handleInstallationDetailChange = (field: keyof Installation, value: any) => {
    if (selectedInstallation) {
      onUpdateInstallation({ ...selectedInstallation, [field]: value });
    }
  };

  const handlePaymentSubmit = () => {
    if (!selectedInstallation || newPaymentAmount <= 0) return;

    const payment: PaymentEntry = {
      id: Date.now().toString(),
      date: newPaymentDate,
      amount: newPaymentAmount,
      recordedBy: currentUser.name,
      comment: newPaymentComment
    };

    onAddPayment(selectedInstallation.id, payment);
    setNewPaymentAmount(0);
    setNewPaymentComment('');
    onShowNotification("Dodano nową wpłatę");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'doc' | 'audit') => {
    if (e.target.files && e.target.files[0] && editForm) {
        const file = e.target.files[0];
        
        // Create a temporary URL for immediate preview
        const fileUrl = URL.createObjectURL(file);

        const newFile: UploadedFile = {
            id: Date.now().toString(),
            name: type === 'audit' && photoDescription ? photoDescription : file.name,
            type: file.type,
            dateUploaded: new Date().toISOString().split('T')[0],
            url: fileUrl // Store the blob URL
        };

        let updatedCustomer = { ...editForm };
        if (type === 'audit') {
            const updatedPhotos = [...(editForm.auditPhotos || []), newFile];
            updatedCustomer.auditPhotos = updatedPhotos;
            onShowNotification("Dodano zdjęcie do audytu");
            setPhotoDescription(''); // Reset description
        } else {
            const updatedFiles = [...(editForm.files || []), newFile];
            updatedCustomer.files = updatedFiles;
            onShowNotification("Dodano nowy plik");
        }

        setEditForm(updatedCustomer);
        onUpdateCustomer(updatedCustomer);
    }
  };

  const handleDeleteFile = (fileId: string, type: 'doc' | 'audit') => {
    if (editForm) {
      let updatedCustomer = { ...editForm };
      
      if (type === 'audit') {
        updatedCustomer.auditPhotos = (editForm.auditPhotos || []).filter(f => f.id !== fileId);
      } else {
        updatedCustomer.files = (editForm.files || []).filter(f => f.id !== fileId);
      }

      setEditForm(updatedCustomer);
      onUpdateCustomer(updatedCustomer);
      onShowNotification("Usunięto plik", 'info');
    }
  };

  const handleDownloadFile = (file: UploadedFile) => {
    if (!file.url) {
        onShowNotification("Brak URL do pobrania (tryb demo)", 'info');
        return;
    }
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOfferAcceptClick = async (e: React.MouseEvent, customerId: string, offerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await onAcceptOffer(customerId, offerId);
      onShowNotification("Pomyślnie zaakceptowano ofertę. Dane zostały zaktualizowane.");
      setActiveTab('data');
    } catch (error) {
      onShowNotification("Wystąpił błąd podczas akceptacji oferty", 'error');
    }
  };

  const submitAddCustomer = () => {
     if (!newCustomer.name || !newCustomer.phone) {
       onShowNotification("Nazwa i telefon są wymagane", 'error');
       return;
     }
     
     const fullAddress = `${newCustomer.street}, ${newCustomer.zip} ${newCustomer.city}, ${newCustomer.county}, ${newCustomer.voivodeship}`;
     
     onAddCustomer({
       name: newCustomer.name,
       email: newCustomer.email,
       phone: newCustomer.phone,
       address: fullAddress
     });
     
     setShowAddModal(false);
     setNewCustomer({
        name: '', email: '', phone: '', street: '', zip: '', city: '', county: '', voivodeship: ''
     });
  };

  return (
    <div className="flex h-full animate-fade-in bg-white shadow-sm border-r border-slate-200">
      {/* ... (Left Sidebar Column code remains same) ... */}
      <div className={`
         w-full md:w-80 border-r border-slate-200 bg-slate-50 flex-col h-full
         ${selectedCustomerId ? 'hidden md:flex' : 'flex'}
      `}>
        {/* Filter Section (Managers/Admins) */}
        {(isManager || isAdmin) && (
          <div className="p-3 bg-white border-b border-slate-200">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <select 
                value={ownerFilter} 
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-slate-50"
              >
                <option value="ALL">Wszyscy widoczni</option>
                <option value="MINE">Tylko moi klienci</option>
                <option value="TEAM">{isAdmin ? 'Wszyscy handlowcy' : 'Tylko mój zespół'}</option>
                {subordinates.length > 0 && (
                  <optgroup label="Konkretny handlowiec">
                    {subordinates.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>
        )}

        <div className="p-4 border-b border-slate-200 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Szukaj klienta..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.length > 0 ? (
            filteredCustomers.map(customer => {
              const inst = installations.find(i => i.customerId === customer.id);
              return (
                <div 
                  key={customer.id} 
                  onClick={() => setSelectedCustomerId(customer.id)}
                  className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-white transition-colors ${selectedCustomerId === customer.id ? 'bg-white border-l-4 border-l-blue-600 shadow-sm' : ''}`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className={`font-bold text-sm ${selectedCustomerId === customer.id ? 'text-blue-700' : 'text-slate-700'}`}>{customer.name}</p>
                    {inst && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        inst.status === InstallationStatus.COMPLETED ? 'bg-green-100 text-green-700' : 
                        inst.status === InstallationStatus.NEW ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {inst.status}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center text-xs text-slate-500 mb-1">
                    <Phone className="w-3 h-3 mr-1" /> {customer.phone}
                  </div>
                  <div className="flex items-center text-xs text-slate-500">
                    <MapPin className="w-3 h-3 mr-1" /> <span className="truncate">{customer.address}</span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-8 text-center text-slate-400 text-sm">
               Brak klientów spełniających kryteria.
            </div>
          )}
        </div>
        {!isInstaller && (
          <button 
            className="m-4 flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-bold text-sm"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" /> Dodaj Klienta
          </button>
        )}
      </div>

      {/* Main Content (Hidden on mobile if no customer selected) */}
      <div className={`
         flex-1 flex-col h-full overflow-hidden bg-slate-50
         ${selectedCustomerId ? 'flex' : 'hidden md:flex'}
      `}>
        {selectedCustomerId && editForm ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-4 md:p-6 shadow-sm flex flex-col md:flex-row justify-between items-start gap-4">
              <div className="flex items-start w-full">
                <button 
                  onClick={() => setSelectedCustomerId(null)}
                  className="mr-3 mt-1 md:hidden text-slate-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center">
                    <UserIcon className="w-5 h-5 md:w-6 md:h-6 mr-3 text-slate-400" />
                    {editForm.name}
                  </h2>
                  <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 mt-1 ml-0 md:ml-9">
                     <p className="text-slate-500 text-sm truncate max-w-xs md:max-w-md flex items-center">
                        <MapPin className="w-3 h-3 mr-1" /> {editForm.address}
                     </p>
                     
                     {/* Owner Attribution */}
                     <div className="flex items-center text-sm font-medium bg-slate-100 px-2 py-1 rounded-lg text-slate-600 border border-slate-200">
                        <Briefcase className="w-3 h-3 mr-1.5 text-blue-500" />
                        <span className="text-xs text-slate-400 mr-1 uppercase font-bold">Opiekun:</span>
                        <span className="text-slate-800 font-bold">{getCustomerOwner(editForm.repId)}</span>
                     </div>
                  </div>
                </div>
              </div>
              {!isInstaller && (
                <button 
                  onClick={handleSaveCustomer}
                  className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm font-bold shrink-0"
                >
                  <Save className="w-4 h-4 mr-2" /> Zapisz zmiany
                </button>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 flex overflow-x-auto space-x-6 hide-scrollbar">
               {visibleTabs.map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as TabType)}
                   className={`flex-shrink-0 flex items-center py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                 >
                   <tab.icon className="w-4 h-4 mr-2" />
                   {tab.label}
                 </button>
               ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8">
               
               {/* TAB: DATA */}
               {activeTab === 'data' && (
                 <div className="max-w-6xl space-y-6 md:space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                       <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200">
                          <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <UserIcon className="w-5 h-5 mr-2 text-slate-400" /> Dane Kontaktowe
                          </h3>
                          <div className="space-y-4">
                             <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imię i Nazwisko</label>
                               <input 
                                 type="text" 
                                 value={editForm.name} 
                                 disabled={isInstaller}
                                 onChange={(e) => handleInputChange('name', e.target.value)}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                               />
                             </div>
                             <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                               <input 
                                 type="email" 
                                 value={editForm.email} 
                                 disabled={isInstaller}
                                 onChange={(e) => handleInputChange('email', e.target.value)}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                               />
                             </div>
                             <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon</label>
                               <input 
                                 type="text" 
                                 value={editForm.phone} 
                                 disabled={isInstaller}
                                 onChange={(e) => handleInputChange('phone', e.target.value)}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50"
                               />
                             </div>
                             
                             <div className="pt-4 border-t border-slate-100">
                               <p className="text-xs font-bold text-slate-500 uppercase mb-3">Adres Inwestycji</p>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="col-span-1 sm:col-span-2">
                                     <input type="text" disabled={isInstaller} placeholder="Ulica i numer" value={addressDetails.street} onChange={(e) => handleAddressDetailChange('street', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50" />
                                  </div>
                                  <div>
                                     <input type="text" disabled={isInstaller} placeholder="Kod pocztowy" value={addressDetails.zip} onChange={(e) => handleAddressDetailChange('zip', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50" />
                                  </div>
                                  <div>
                                     <input type="text" disabled={isInstaller} placeholder="Miejscowość" value={addressDetails.city} onChange={(e) => handleAddressDetailChange('city', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-50" />
                                  </div>
                               </div>
                             </div>
                          </div>
                       </div>

                       <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-slate-200">
                          <h3 className="text-base md:text-lg font-bold text-slate-800 mb-4 flex items-center">
                            <Zap className="w-5 h-5 mr-2 text-amber-500" /> Szczegóły Instalacji
                          </h3>
                          {selectedInstallation ? (
                            <div className="space-y-4">
                               <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status Instalacji</label>
                                 <select 
                                   value={selectedInstallation.status}
                                   onChange={(e) => handleStatusChange(e.target.value as InstallationStatus)}
                                   disabled={!canEditStatus}
                                   className={`w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white ${!canEditStatus ? 'opacity-70 cursor-not-allowed' : ''}`}
                                 >
                                   {Object.values(InstallationStatus).map(s => (
                                     <option key={s} value={s}>{s}</option>
                                   ))}
                                 </select>
                               </div>

                               {canAssignTeam && (
                                 <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ekipa Montażowa</label>
                                    <select 
                                       value={selectedInstallation.assignedTeam || ''}
                                       onChange={(e) => handleInstallationDetailChange('assignedTeam', e.target.value)}
                                       className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                    >
                                       <option value="">-- Wybierz Ekipę --</option>
                                       {installerTeams.map(u => (
                                          <option key={u.id} value={u.id}>{u.name}</option>
                                       ))}
                                    </select>
                                 </div>
                               )}
                               
                               <div className="grid grid-cols-2 gap-4">
                                 <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Moc PV (kWp)</label>
                                   <input 
                                     type="number" 
                                     value={selectedInstallation.systemSizeKw}
                                     disabled={!canEditInstallationDetails}
                                     onChange={(e) => handleInstallationDetailChange('systemSizeKw', Number(e.target.value))}
                                     className={`w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 ${canEditInstallationDetails ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-slate-50'}`}
                                   />
                                 </div>
                                 <div>
                                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Magazyn (kWh)</label>
                                   <input 
                                     type="number" 
                                     value={selectedInstallation.storageSizeKw || 0}
                                     disabled={!canEditInstallationDetails}
                                     onChange={(e) => handleInstallationDetailChange('storageSizeKw', Number(e.target.value))}
                                     className={`w-full p-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 ${canEditInstallationDetails ? 'bg-white focus:ring-2 focus:ring-blue-500' : 'bg-slate-50'}`}
                                   />
                                 </div>
                               </div>

                               {!isInstaller && (
                                  <div className="pt-2 border-t border-slate-100 mt-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wartość Umowy</label>
                                    <p className="text-xl font-bold text-slate-800">{selectedInstallation.price.toLocaleString()} PLN</p>
                                  </div>
                               )}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-slate-400">
                               <p>Brak przypisanej instalacji.</p>
                               <p className="text-xs">Zaakceptuj ofertę, aby utworzyć.</p>
                            </div>
                          )}
                       </div>
                    </div>

                    {acceptedOffer && (
                       <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-6">
                          <h3 className="font-bold text-slate-700 mb-4 flex items-center">
                             <Hammer className="w-5 h-5 mr-2 text-slate-500" /> Dane Techniczne z Kalkulatora
                          </h3>
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="bg-amber-50 p-2 rounded-lg text-amber-600 shrink-0"><Home className="w-5 h-5" /></div>
                                <div>
                                   <p className="text-[10px] text-slate-400 uppercase font-bold">Typ Instalacji</p>
                                   <p className="font-bold text-slate-800 text-sm">
                                      {acceptedOffer.calculatorState.installationType === 'ROOF' ? 'Dach' : 'Grunt'}
                                      {acceptedOffer.calculatorState.roofSlope && ` (${acceptedOffer.calculatorState.roofSlope === 'FLAT' ? 'Płaski' : 'Skośny'})`}
                                   </p>
                                </div>
                             </div>
                             <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="bg-slate-100 p-2 rounded-lg text-slate-600 shrink-0">
                                   {acceptedOffer.calculatorState.installationType === 'ROOF' ? <Hammer className="w-5 h-5"/> : <Shovel className="w-5 h-5"/>}
                                </div>
                                <div>
                                   <p className="text-[10px] text-slate-400 uppercase font-bold">
                                      {acceptedOffer.calculatorState.installationType === 'ROOF' ? 'Pokrycie' : 'Przekop'}
                                   </p>
                                   <p className="font-bold text-slate-800 text-sm">
                                      {acceptedOffer.calculatorState.installationType === 'ROOF' 
                                         ? acceptedOffer.calculatorState.roofMaterial 
                                         : `${acceptedOffer.calculatorState.trenchLength} mb`}
                                   </p>
                                </div>
                             </div>
                             <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="bg-yellow-50 p-2 rounded-lg text-yellow-600 shrink-0"><Sun className="w-5 h-5" /></div>
                                <div>
                                   <p className="text-[10px] text-slate-400 uppercase font-bold">Orientacja</p>
                                   <p className="font-bold text-slate-800 text-sm">
                                      {acceptedOffer.calculatorState.orientation === 'SOUTH' ? 'Południe (S)' : 'Wschód-Zachód'}
                                   </p>
                                </div>
                             </div>
                             <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shrink-0"><Zap className="w-5 h-5" /></div>
                                <div>
                                   <p className="text-[10px] text-slate-400 uppercase font-bold">Układ</p>
                                   <p className="font-bold text-slate-800 text-sm">
                                      {acceptedOffer.calculatorState.phases}-Fazowy
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
               )}

               {/* TAB: OFFERS */}
               {activeTab === 'offers' && !isInstaller && (
                 <div className="max-w-4xl space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-bold text-slate-800">Zapisane Oferty</h3>
                       <button className="text-sm text-blue-600 font-medium hover:underline flex items-center">
                          <Plus className="w-4 h-4 mr-1" /> Utwórz nową
                       </button>
                    </div>
                    {editForm.offers && editForm.offers.length > 0 ? (
                      <div className="grid gap-4">
                        {editForm.offers.map((offer) => (
                          <div key={offer.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center group hover:border-blue-200 transition-all">
                             <div className="mb-4 md:mb-0 w-full md:w-auto">
                                <div className="flex items-center space-x-3">
                                   <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                      <FileText className="w-6 h-6" />
                                   </div>
                                   <div>
                                      <h4 className="font-bold text-slate-800 text-lg">{offer.name}</h4>
                                      <p className="text-xs text-slate-500">Utworzono: {new Date(offer.dateCreated).toLocaleDateString()}</p>
                                   </div>
                                </div>
                             </div>
                             
                             <div className="flex flex-col items-end space-y-3 w-full md:w-auto">
                                <p className="text-2xl font-bold text-slate-900 self-end md:self-auto">{offer.finalPrice.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</p>
                                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
                                   <button 
                                     onClick={() => onEditOffer(offer)}
                                     className="flex-1 md:flex-none px-4 py-2 border border-slate-300 rounded-lg text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm"
                                   >
                                      Podgląd / Edycja
                                   </button>
                                   {offer.status !== 'ACCEPTED' ? (
                                     canAcceptOffer && (
                                       <button 
                                         onClick={(e) => handleOfferAcceptClick(e, editForm.id, offer.id)}
                                         className="flex-1 md:flex-none px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm text-sm flex items-center justify-center"
                                       >
                                          <Check className="w-4 h-4 mr-2" /> Zaakceptuj
                                       </button>
                                     )
                                   ) : (
                                     <span className="flex items-center justify-center text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg text-sm border border-green-100">
                                       <CheckCircle className="w-4 h-4 mr-2" /> Zaakceptowana
                                     </span>
                                   )}
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                          <p className="text-slate-500">Brak ofert.</p>
                      </div>
                    )}
                 </div>
               )}

               {/* TAB: FINANCES */}
               {activeTab === 'finances' && selectedInstallation && !isInstaller && (
                  <div className="space-y-8 animate-fade-in max-w-4xl">
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                           <p className="text-xs font-bold text-slate-400 uppercase mb-1">Całkowita wartość</p>
                           <p className="text-2xl font-bold text-slate-800">{selectedInstallation.price.toLocaleString()} PLN</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                           <p className="text-xs font-bold text-slate-400 uppercase mb-1">Opłacono</p>
                           <p className="text-2xl font-bold text-green-600">{selectedInstallation.paidAmount.toLocaleString()} PLN</p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                           <p className="text-xs font-bold text-slate-400 uppercase mb-1">Pozostało</p>
                           <p className="text-2xl font-bold text-red-600">{(selectedInstallation.price - selectedInstallation.paidAmount).toLocaleString()} PLN</p>
                        </div>
                     </div>

                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                           <History className="w-5 h-5 mr-2 text-slate-500" /> Historia Wpłat
                        </h3>
                        {selectedInstallation.paymentHistory && selectedInstallation.paymentHistory.length > 0 ? (
                           <div className="overflow-x-auto">
                              <table className="w-full text-left">
                                 <thead className="text-xs text-slate-500 uppercase bg-slate-50">
                                    <tr>
                                       <th className="p-3">Data</th>
                                       <th className="p-3">Kwota</th>
                                       <th className="p-3">Opis</th>
                                       <th className="p-3">Dodał</th>
                                       {canEditFinances && <th className="p-3 text-right">Akcje</th>}
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-100">
                                    {selectedInstallation.paymentHistory.map(payment => (
                                       <tr key={payment.id}>
                                          <td className="p-3 text-sm font-medium">{payment.date}</td>
                                          <td className="p-3 text-sm font-bold text-green-600">{payment.amount.toLocaleString()} PLN</td>
                                          <td className="p-3 text-sm text-slate-500">{payment.comment || '-'}</td>
                                          <td className="p-3 text-sm text-slate-500">{payment.recordedBy}</td>
                                          {canEditFinances && (
                                             <td className="p-3 text-right">
                                                <button onClick={() => onRemovePayment(selectedInstallation.id, payment.id)} className="text-red-400 hover:text-red-600">
                                                   <Trash2 className="w-4 h-4" />
                                                </button>
                                             </td>
                                          )}
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        ) : (
                           <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg">Brak odnotowanych wpłat.</div>
                        )}

                        {canEditFinances && (
                           <div className="mt-6 pt-6 border-t border-slate-100">
                              <h4 className="font-bold text-sm text-slate-700 mb-3">Dodaj nową wpłatę</h4>
                              <div className="flex flex-col md:flex-row gap-3 items-end">
                                 <div className="w-full md:w-auto">
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Data</label>
                                    <input type="date" value={newPaymentDate} onChange={(e) => setNewPaymentDate(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                                 </div>
                                 <div className="w-full md:w-auto">
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Kwota (PLN)</label>
                                    <input type="number" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(Number(e.target.value))} className="w-full p-2 border border-slate-300 rounded-lg text-sm font-bold" />
                                 </div>
                                 <div className="flex-1 w-full">
                                    <label className="block text-xs font-bold text-slate-400 mb-1">Komentarz</label>
                                    <input type="text" value={newPaymentComment} onChange={(e) => setNewPaymentComment(e.target.value)} className="w-full p-2 border border-slate-300 rounded-lg text-sm" placeholder="np. Zaliczka" />
                                 </div>
                                 <button onClick={handlePaymentSubmit} disabled={newPaymentAmount <= 0} className="w-full md:w-auto bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
                                    <Plus className="w-4 h-4 inline mr-1" /> Dodaj
                                 </button>
                              </div>
                           </div>
                        )}
                     </div>
                  </div>
               )}

               {/* TAB: AUDIT */}
               {activeTab === 'audit' && (
                  <div className="space-y-6 animate-fade-in max-w-6xl">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-800">Zdjęcia z Audytu</h3>
                        <div>
                           <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              ref={auditInputRef}
                              onChange={(e) => handleFileChange(e, 'audit')} 
                           />
                           <div className="flex space-x-2">
                              <input 
                                 type="text" 
                                 placeholder="Opis zdjęcia..." 
                                 value={photoDescription}
                                 onChange={(e) => setPhotoDescription(e.target.value)}
                                 className="border border-slate-300 rounded-lg px-3 py-2 text-sm w-48 md:w-64"
                              />
                              <button 
                                 onClick={() => auditInputRef.current?.click()}
                                 className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center text-sm"
                              >
                                 <Upload className="w-4 h-4 mr-2" /> Dodaj Zdjęcie
                              </button>
                           </div>
                        </div>
                     </div>
                     
                     {editForm.auditPhotos && editForm.auditPhotos.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                           {editForm.auditPhotos.map(photo => (
                              <div key={photo.id} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm cursor-pointer" onClick={() => setSelectedImage(photo)}>
                                 {photo.url ? (
                                    <img src={photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400"><ImageIcon className="w-8 h-8"/></div>
                                 )}
                                 <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                                    <p className="text-white text-xs font-bold truncate">{photo.name}</p>
                                    <p className="text-white/70 text-[10px]">{photo.dateUploaded}</p>
                                 </div>
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteFile(photo.id, 'audit'); }}
                                    className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                                 >
                                    <Trash2 className="w-3 h-3" />
                                 </button>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                           <Camera className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                           <p className="text-slate-500 font-medium">Brak zdjęć z audytu.</p>
                           <p className="text-xs text-slate-400 mt-1">Wgraj zdjęcia dachu, rozdzielni i terenu.</p>
                        </div>
                     )}

                     {/* Image Preview Modal */}
                     {selectedImage && (
                        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImage(null)}>
                           <div className="relative max-w-5xl w-full max-h-[90vh]">
                              <img src={selectedImage.url} alt={selectedImage.name} className="w-full h-full object-contain rounded-lg shadow-2xl" />
                              <button className="absolute -top-12 right-0 text-white hover:text-slate-300" onClick={() => setSelectedImage(null)}>
                                 <X className="w-8 h-8" />
                              </button>
                              <div className="absolute bottom-4 left-4 bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm text-white">
                                 <p className="font-bold">{selectedImage.name}</p>
                                 <p className="text-xs opacity-70">{selectedImage.dateUploaded}</p>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {/* TAB: FILES */}
               {activeTab === 'files' && (
                  <div className="space-y-6 animate-fade-in max-w-4xl">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg text-slate-800">Dokumenty</h3>
                        <div>
                           <input 
                              type="file" 
                              className="hidden" 
                              ref={fileInputRef}
                              onChange={(e) => handleFileChange(e, 'doc')} 
                           />
                           <button 
                              onClick={() => fileInputRef.current?.click()}
                              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center text-sm"
                           >
                              <Upload className="w-4 h-4 mr-2" /> Wgraj Plik
                           </button>
                        </div>
                     </div>
                     
                     {editForm.files && editForm.files.length > 0 ? (
                        <div className="space-y-3">
                           {editForm.files.map(file => (
                              <div key={file.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-shadow">
                                 <div className="flex items-center space-x-3">
                                    <div className="bg-slate-100 p-2 rounded-lg text-slate-500">
                                       <FileIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                       <p className="font-bold text-slate-800 text-sm">{file.name}</p>
                                       <p className="text-xs text-slate-500">{file.dateUploaded} • {file.type || 'Nieznany'}</p>
                                    </div>
                                 </div>
                                 <div className="flex items-center space-x-2">
                                    <button 
                                       onClick={() => handleDownloadFile(file)}
                                       className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                       title="Pobierz"
                                    >
                                       <Download className="w-4 h-4" />
                                    </button>
                                    <button 
                                       onClick={() => handleDeleteFile(file.id, 'doc')}
                                       className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                       title="Usuń"
                                    >
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>
                     ) : (
                        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                           <FileIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                           <p className="text-slate-500 font-medium">Brak dokumentów.</p>
                           <p className="text-xs text-slate-400 mt-1">Tutaj pojawią się umowy, projekty i faktury.</p>
                        </div>
                     )}
                  </div>
               )}

               {/* TAB: NOTES */}
               {activeTab === 'notes' && (
                  <div className="h-full flex flex-col animate-fade-in max-w-4xl">
                     <h3 className="font-bold text-lg text-slate-800 mb-4">Notatki</h3>
                     <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col">
                        <textarea 
                           value={editForm.notes} 
                           onChange={(e) => handleInputChange('notes', e.target.value)}
                           className="flex-1 w-full p-4 border-0 focus:ring-0 outline-none resize-none text-slate-700 bg-transparent placeholder:text-slate-300"
                           placeholder="Wpisz notatki dotyczące klienta..." 
                        />
                        <div className="flex justify-between items-center pt-4 border-t border-slate-100 mt-4">
                           <span className="text-xs text-slate-400">Notatki są widoczne tylko dla pracowników.</span>
                           <button 
                              onClick={handleSaveCustomer}
                              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                           >
                              Zapisz
                           </button>
                        </div>
                     </div>
                  </div>
               )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-4 text-center">
            <Users className="w-24 h-24 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-400">Wybierz klienta z listy</p>
          </div>
        )}
      </div>

      {/* Modals (Add Customer, Image Preview) kept as is */}
      {showAddModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
                 <h3 className="font-bold text-lg mb-4">Dodaj Klienta (Skrócony)</h3>
                 <input type="text" placeholder="Imię" className="w-full border p-2 mb-2 rounded" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
                 <input type="text" placeholder="Telefon" className="w-full border p-2 mb-4 rounded" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
                 <div className="flex justify-end gap-2">
                     <button onClick={() => setShowAddModal(false)} className="text-slate-500 px-4 py-2">Anuluj</button>
                     <button onClick={submitAddCustomer} className="bg-blue-600 text-white px-4 py-2 rounded">Dodaj</button>
                 </div>
             </div>
         </div>
      )}
    </div>
  );
};
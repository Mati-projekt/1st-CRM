
import React, { useState, useEffect, useRef } from 'react';
import { Customer, Installation, InstallationStatus, UploadedFile, Offer, UserRole, PaymentEntry } from '../types';
import { Search, Phone, MapPin, Plus, Save, Zap, File as FileIcon, Camera, Image as ImageIcon, ClipboardList, User, FilePieChart, Banknote, History, Check, CheckCircle, Upload, Trash2, Users, FileText, Hammer, X, Shovel, ArrowLeft, Download, Maximize2 } from 'lucide-react';
import { generateCustomerEmail } from '../services/geminiService';
import { NotificationType } from './Notification';

interface CustomersProps {
  customers: Customer[];
  installations: Installation[];
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
  currentUserRole: UserRole;
  currentUserName: string;
}

type TabType = 'data' | 'finances' | 'audit' | 'files' | 'notes' | 'offers';

export const Customers: React.FC<CustomersProps> = ({ 
  customers, 
  installations, 
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
  currentUserRole,
  currentUserName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
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

  const canEditStatus = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;
  const canEditFinances = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;
  const canAcceptOffer = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE || currentUserRole === UserRole.SALES;
  const canEditInstallationDetails = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedInstallation = installations.find(i => i.customerId === selectedCustomerId);
  
  const acceptedOffer = editForm?.offers?.find(o => o.status === 'ACCEPTED');

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
      recordedBy: currentUserName,
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
        // Fallback if no URL (e.g. historical data mock), just alert
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
      
      {/* Customer List Column (Hidden on mobile if customer selected) */}
      <div className={`
         w-full md:w-80 border-r border-slate-200 bg-slate-50 flex-col h-full
         ${selectedCustomerId ? 'hidden md:flex' : 'flex'}
      `}>
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
          {filteredCustomers.map(customer => {
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
          })}
        </div>
        <button 
          className="m-4 flex items-center justify-center p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md font-bold text-sm"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" /> Dodaj Klienta
        </button>
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
              <div className="flex items-start">
                <button 
                  onClick={() => setSelectedCustomerId(null)}
                  className="mr-3 mt-1 md:hidden text-slate-500"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center">
                    <User className="w-5 h-5 md:w-6 md:h-6 mr-3 text-slate-400" />
                    {editForm.name}
                  </h2>
                  <p className="text-slate-500 text-sm mt-1 ml-0 md:ml-9 truncate max-w-xs md:max-w-md">{editForm.address}</p>
                </div>
              </div>
              <button 
                onClick={handleSaveCustomer}
                className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm font-bold"
              >
                <Save className="w-4 h-4 mr-2" /> Zapisz zmiany
              </button>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 px-4 md:px-6 flex overflow-x-auto space-x-6 hide-scrollbar">
               {[
                 { id: 'data', label: 'Dane', icon: User },
                 { id: 'offers', label: 'Oferty', icon: FilePieChart },
                 { id: 'audit', label: 'Audyt', icon: Camera },
                 { id: 'finances', label: 'Finanse', icon: Banknote },
                 { id: 'files', label: 'Pliki', icon: FileIcon },
                 { id: 'notes', label: 'Notatki', icon: ClipboardList },
               ].map(tab => (
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
                            <User className="w-5 h-5 mr-2 text-slate-400" /> Dane Kontaktowe
                          </h3>
                          <div className="space-y-4">
                             <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imię i Nazwisko</label>
                               <input 
                                 type="text" 
                                 value={editForm.name} 
                                 onChange={(e) => handleInputChange('name', e.target.value)}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                               />
                             </div>
                             <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                               <input 
                                 type="email" 
                                 value={editForm.email} 
                                 onChange={(e) => handleInputChange('email', e.target.value)}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                               />
                             </div>
                             <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon</label>
                               <input 
                                 type="text" 
                                 value={editForm.phone} 
                                 onChange={(e) => handleInputChange('phone', e.target.value)}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                               />
                             </div>
                             
                             <div className="pt-4 border-t border-slate-100">
                               <p className="text-xs font-bold text-slate-500 uppercase mb-3">Adres Inwestycji</p>
                               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div className="col-span-1 sm:col-span-2">
                                     <input type="text" placeholder="Ulica i numer" value={addressDetails.street} onChange={(e) => handleAddressDetailChange('street', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                  </div>
                                  <div>
                                     <input type="text" placeholder="Kod pocztowy" value={addressDetails.zip} onChange={(e) => handleAddressDetailChange('zip', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                  </div>
                                  <div>
                                     <input type="text" placeholder="Miejscowość" value={addressDetails.city} onChange={(e) => handleAddressDetailChange('city', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                  </div>
                                  <div>
                                     <input type="text" placeholder="Powiat" value={addressDetails.county} onChange={(e) => handleAddressDetailChange('county', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                  </div>
                                  <div>
                                     <input type="text" placeholder="Województwo" value={addressDetails.voivodeship} onChange={(e) => handleAddressDetailChange('voivodeship', e.target.value)} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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

                               <div className="pt-2 border-t border-slate-100 mt-2 space-y-3">
                                  <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Falownik</label>
                                     <input 
                                       type="text" 
                                       value={selectedInstallation.inverterModel || ''}
                                       disabled={!canEditInstallationDetails}
                                       onChange={(e) => handleInstallationDetailChange('inverterModel', e.target.value)}
                                       className={`w-full p-2.5 border border-slate-200 rounded-lg text-sm ${canEditInstallationDetails ? 'bg-white' : 'bg-slate-50'}`}
                                       placeholder="Model falownika"
                                     />
                                  </div>
                                  <div>
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">System Montażowy</label>
                                     <input 
                                       type="text" 
                                       value={selectedInstallation.mountingSystem || ''}
                                       disabled={!canEditInstallationDetails}
                                       onChange={(e) => handleInstallationDetailChange('mountingSystem', e.target.value)}
                                       className={`w-full p-2.5 border border-slate-200 rounded-lg text-sm ${canEditInstallationDetails ? 'bg-white' : 'bg-slate-50'}`}
                                       placeholder="Rodzaj montażu"
                                     />
                                  </div>
                               </div>

                               <div className="pt-2 border-t border-slate-100 mt-2">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wartość Umowy</label>
                                 <p className="text-xl font-bold text-slate-800">{selectedInstallation.price.toLocaleString()} PLN</p>
                               </div>
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
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                             <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="bg-amber-50 p-2 rounded-lg text-amber-600 shrink-0"><Hammer className="w-5 h-5" /></div>
                                <div>
                                   <p className="text-xs text-slate-500 uppercase font-bold">Typ Montażu</p>
                                   <p className="font-bold text-slate-800">{acceptedOffer.calculatorState.roofType}</p>
                                </div>
                             </div>
                             {acceptedOffer.calculatorState.roofType === 'GRUNT' && (
                                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                   <div className="bg-green-50 p-2 rounded-lg text-green-600 shrink-0"><Shovel className="w-5 h-5" /></div>
                                   <div>
                                      <p className="text-xs text-slate-500 uppercase font-bold">Długość Przekopu</p>
                                      <p className="font-bold text-slate-800">{acceptedOffer.calculatorState.trenchLength} mb</p>
                                   </div>
                                </div>
                             )}
                             <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600 shrink-0"><Zap className="w-5 h-5" /></div>
                                <div>
                                   <p className="text-xs text-slate-500 uppercase font-bold">Konfiguracja</p>
                                   <p className="font-bold text-slate-800 text-sm">
                                      {acceptedOffer.calculatorState.panelCount}x PV + {acceptedOffer.calculatorState.storageId ? 'Bat' : 'Brak Bat'}
                                   </p>
                                </div>
                             </div>
                          </div>
                       </div>
                    )}
                 </div>
               )}

               {/* TAB: FINANCES */}
               {activeTab === 'finances' && selectedInstallation && (
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

                     {/* Payment History */}
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                           <h3 className="font-bold text-slate-800 flex items-center">
                              <History className="w-5 h-5 mr-2 text-slate-500" /> Historia Płatności
                           </h3>
                        </div>
                        <table className="w-full text-left text-sm">
                           <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                              <tr>
                                 <th className="p-4">Data</th>
                                 <th className="p-4">Kwota</th>
                                 <th className="p-4">Opis</th>
                                 <th className="p-4">Zaksięgował</th>
                                 <th className="p-4 text-right">Akcje</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {selectedInstallation.paymentHistory && selectedInstallation.paymentHistory.length > 0 ? (
                                selectedInstallation.paymentHistory.map(payment => (
                                  <tr key={payment.id}>
                                     <td className="p-4 font-medium">{payment.date}</td>
                                     <td className="p-4 text-green-600 font-bold">+{payment.amount.toLocaleString()} PLN</td>
                                     <td className="p-4 text-slate-600">{payment.comment || '-'}</td>
                                     <td className="p-4 text-slate-500">{payment.recordedBy}</td>
                                     <td className="p-4 text-right">
                                        {canEditFinances && (
                                           <button onClick={() => onRemovePayment(selectedInstallation.id, payment.id)} className="text-red-400 hover:text-red-600 transition-colors">
                                              <Trash2 className="w-4 h-4" />
                                           </button>
                                        )}
                                     </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                   <td colSpan={5} className="p-6 text-center text-slate-400">Brak zaksięgowanych wpłat.</td>
                                </tr>
                              )}
                           </tbody>
                        </table>
                     </div>

                     {/* Add Payment Form */}
                     {canEditFinances && (
                        <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
                           <h3 className="font-bold text-blue-900 mb-4 flex items-center">
                              <Plus className="w-5 h-5 mr-2" /> Dodaj nową wpłatę
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                              <div className="col-span-1 md:col-span-1">
                                 <label className="block text-xs font-bold text-blue-800/60 uppercase mb-1">Kwota (PLN)</label>
                                 <input 
                                    type="number" 
                                    value={newPaymentAmount} 
                                    onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="0"
                                 />
                              </div>
                              <div className="col-span-1 md:col-span-1">
                                 <label className="block text-xs font-bold text-blue-800/60 uppercase mb-1">Data</label>
                                 <input 
                                    type="date" 
                                    value={newPaymentDate} 
                                    onChange={(e) => setNewPaymentDate(e.target.value)}
                                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                 />
                              </div>
                              <div className="col-span-1 md:col-span-1">
                                 <label className="block text-xs font-bold text-blue-800/60 uppercase mb-1">Tytuł/Komentarz</label>
                                 <input 
                                    type="text" 
                                    value={newPaymentComment} 
                                    onChange={(e) => setNewPaymentComment(e.target.value)}
                                    className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="np. Zaliczka"
                                 />
                              </div>
                              <button 
                                 onClick={handlePaymentSubmit}
                                 disabled={newPaymentAmount <= 0}
                                 className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                 Dodaj
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {/* TAB: OFFERS */}
               {activeTab === 'offers' && (
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
                      <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-12 text-center">
                          <FilePieChart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                          <p className="text-slate-500">Brak zapisanych ofert dla tego klienta.</p>
                          <p className="text-xs text-slate-400 mt-1">Użyj "Aplikacja &gt; Kalkulator PV", aby stworzyć nową ofertę.</p>
                      </div>
                    )}
                 </div>
               )}

               {/* TAB: FILES */}
               {activeTab === 'files' && (
                 <div className="animate-fade-in max-w-4xl space-y-6">
                    <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-bold text-slate-800">Dokumenty i Pliki</h3>
                       <div>
                          <input 
                             type="file" 
                             ref={fileInputRef} 
                             className="hidden" 
                             onChange={(e) => handleFileChange(e, 'doc')} 
                          />
                          <button 
                             onClick={() => fileInputRef.current?.click()}
                             className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-sm shadow-sm"
                          >
                             <Upload className="w-4 h-4 mr-2" /> Dodaj plik
                          </button>
                       </div>
                    </div>
                    
                    {editForm.files && editForm.files.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                           {editForm.files.map(file => (
                              <div key={file.id} className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col justify-between group hover:border-blue-300 transition-colors shadow-sm">
                                 <div className="flex items-start space-x-3 mb-4">
                                    <div className="p-2 bg-slate-100 rounded-lg text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600">
                                       <FileIcon className="w-6 h-6" />
                                    </div>
                                    <div className="overflow-hidden">
                                       <p className="font-bold text-slate-700 text-sm truncate" title={file.name}>{file.name}</p>
                                       <p className="text-xs text-slate-400">{file.dateUploaded}</p>
                                    </div>
                                 </div>
                                 <div className="flex justify-end space-x-2 border-t border-slate-50 pt-3">
                                    <button onClick={() => handleDownloadFile(file)} className="text-slate-400 hover:text-blue-600 p-1">
                                       <Download className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDeleteFile(file.id, 'doc')} className="text-slate-400 hover:text-red-500 p-1">
                                       <Trash2 className="w-4 h-4" />
                                    </button>
                                 </div>
                              </div>
                           ))}
                        </div>
                    ) : (
                        <div className="text-center py-12 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl">
                           <FileIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                           <p className="text-slate-500 font-medium">Brak plików.</p>
                           <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 text-sm font-bold hover:underline mt-2">Dodaj pierwszy dokument</button>
                        </div>
                    )}
                 </div>
               )}

               {/* TAB: AUDIT */}
               {activeTab === 'audit' && (
                 <div className="animate-fade-in max-w-4xl space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                       <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                          <Camera className="w-5 h-5 mr-2 text-slate-500" /> Dodaj zdjęcie z audytu
                       </h3>
                       <div className="flex flex-col md:flex-row gap-4">
                          <div className="flex-1">
                             <input 
                                type="text" 
                                placeholder="Opis zdjęcia (np. Skrzynka elektryczna, Dach południe)" 
                                value={photoDescription}
                                onChange={(e) => setPhotoDescription(e.target.value)}
                                className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                             />
                          </div>
                          <div>
                             <input 
                                type="file" 
                                ref={auditInputRef} 
                                accept="image/*"
                                className="hidden" 
                                onChange={(e) => handleFileChange(e, 'audit')} 
                             />
                             <button 
                                onClick={() => auditInputRef.current?.click()}
                                className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-sm flex items-center justify-center whitespace-nowrap"
                             >
                                <Camera className="w-5 h-5 mr-2" /> Dodaj zdjęcie
                             </button>
                          </div>
                       </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                       {editForm.auditPhotos && editForm.auditPhotos.length > 0 ? (
                          editForm.auditPhotos.map(photo => (
                             <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col">
                                <div 
                                  className="aspect-square relative w-full bg-slate-200 flex items-center justify-center cursor-pointer overflow-hidden"
                                  onClick={() => setSelectedImage(photo)}
                                >
                                   {photo.url ? (
                                     <img src={photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                   ) : (
                                     <div className="flex flex-col items-center justify-center text-slate-400">
                                       <ImageIcon className="w-10 h-10 mb-2" />
                                       <span className="text-[10px]">Brak podglądu</span>
                                     </div>
                                   )}
                                   
                                   <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setSelectedImage(photo); }}
                                        className="p-2 bg-white/90 rounded-full hover:bg-white text-slate-800 shadow-sm"
                                      >
                                         <Maximize2 className="w-4 h-4" />
                                      </button>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDownloadFile(photo); }}
                                        className="p-2 bg-white/90 rounded-full hover:bg-white text-blue-600 shadow-sm"
                                      >
                                         <Download className="w-4 h-4" />
                                      </button>
                                      <button 
                                         onClick={(e) => { e.stopPropagation(); handleDeleteFile(photo.id, 'audit'); }}
                                         className="p-2 bg-white/90 rounded-full hover:bg-white text-red-500 shadow-sm"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                   </div>
                                </div>
                                <div className="p-3 bg-white">
                                   <p className="text-slate-800 text-xs font-bold truncate mb-1">{photo.name}</p>
                                   <p className="text-slate-400 text-[10px]">{photo.dateUploaded}</p>
                                </div>
                             </div>
                          ))
                       ) : (
                          <div className="col-span-full text-center py-12 text-slate-400">
                             <Camera className="w-12 h-12 mx-auto mb-2 opacity-50" />
                             <p>Brak zdjęć z audytu.</p>
                          </div>
                       )}
                    </div>
                 </div>
               )}

               {/* TAB: NOTES */}
               {activeTab === 'notes' && (
                 <div className="animate-fade-in max-w-4xl h-full flex flex-col">
                    <div className="mb-4">
                       <h3 className="font-bold text-slate-800 flex items-center">
                          <ClipboardList className="w-5 h-5 mr-2 text-slate-500" /> Notatki wewnętrzne
                       </h3>
                       <p className="text-xs text-slate-500 mt-1">Miejsce na informacje o kliencie, ustalenia telefoniczne itp.</p>
                    </div>
                    <textarea 
                       className="w-full flex-1 min-h-[400px] p-6 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none shadow-sm text-slate-700 leading-relaxed"
                       value={editForm.notes}
                       onChange={(e) => handleInputChange('notes', e.target.value)}
                       placeholder="Wpisz tutaj notatki..."
                    />
                    
                    {/* AI Assistant for Notes/Emails */}
                    <div className="mt-6 bg-slate-50 rounded-xl p-6 border border-slate-200">
                       <div className="flex justify-between items-center mb-4">
                          <h4 className="font-bold text-slate-700 flex items-center">
                             <Zap className="w-4 h-4 mr-2 text-amber-500" /> Asystent AI - Generator Wiadomości
                          </h4>
                          <button 
                             onClick={handleGenerateEmail}
                             disabled={isGenerating || !selectedInstallation}
                             className="text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-lg hover:bg-slate-100 font-bold text-slate-600 disabled:opacity-50"
                          >
                             {isGenerating ? 'Generuję...' : 'Generuj email'}
                          </button>
                       </div>
                       {aiDraft && (
                          <div className="bg-white p-4 rounded-lg border border-slate-200 text-sm text-slate-600 italic">
                             {aiDraft}
                             <button 
                                onClick={() => { navigator.clipboard.writeText(aiDraft); onShowNotification("Skopiowano do schowka"); }}
                                className="block mt-2 text-blue-600 text-xs font-bold hover:underline"
                             >
                                Kopiuj treść
                             </button>
                          </div>
                       )}
                    </div>
                 </div>
               )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-4 text-center">
            <Users className="w-24 h-24 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-400">Wybierz klienta z listy</p>
            <p className="md:hidden text-sm mt-2 text-slate-300">Użyj menu aby wrócić do listy.</p>
          </div>
        )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center">
                     <Plus className="w-5 h-5 mr-2 text-blue-600" /> Dodaj Nowego Klienta
                  </h3>
                  <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                     <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="p-6 md:p-8 space-y-6">
                  {/* ... Add Customer Form Fields ... */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="col-span-1 md:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imię i Nazwisko / Nazwa Firmy</label>
                        <input 
                           type="text" 
                           value={newCustomer.name} 
                           onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input type="email" value={newCustomer.email} onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                     </div>
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon</label>
                        <input type="text" value={newCustomer.phone} onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                     </div>
                     <div className="col-span-1 md:col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <p className="text-sm font-bold text-slate-700 mb-3">Adres Inwestycji</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="col-span-1 md:col-span-2">
                                <input type="text" placeholder="Ulica i numer" value={newCustomer.street} onChange={(e) => setNewCustomer({...newCustomer, street: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                            </div>
                            <input type="text" placeholder="Kod pocztowy" value={newCustomer.zip} onChange={(e) => setNewCustomer({...newCustomer, zip: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                            <input type="text" placeholder="Miejscowość" value={newCustomer.city} onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                            <input type="text" placeholder="Powiat" value={newCustomer.county} onChange={(e) => setNewCustomer({...newCustomer, county: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                            <input type="text" placeholder="Województwo" value={newCustomer.voivodeship} onChange={(e) => setNewCustomer({...newCustomer, voivodeship: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                        </div>
                     </div>
                  </div>
               </div>

               <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                  <button 
                     onClick={() => setShowAddModal(false)}
                     className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-white transition-colors"
                  >
                     Anuluj
                  </button>
                  <button 
                     onClick={submitAddCustomer}
                     className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center"
                  >
                     <Plus className="w-5 h-5 mr-2" /> Dodaj
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Image Modal */}
      {selectedImage && (
         <div 
           className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 md:p-8 backdrop-blur-sm animate-fade-in"
           onClick={() => setSelectedImage(null)}
         >
            <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
               <img 
                 src={selectedImage.url} 
                 alt={selectedImage.name} 
                 className="max-h-[85vh] max-w-full rounded-lg shadow-2xl"
               />
               <div className="absolute top-4 right-4 flex space-x-3">
                  <button 
                    onClick={() => handleDownloadFile(selectedImage)}
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-colors"
                    title="Pobierz"
                  >
                     <Download className="w-6 h-6" />
                  </button>
                  <button 
                    onClick={() => setSelectedImage(null)}
                    className="p-3 bg-white/10 hover:bg-red-500/50 text-white rounded-full backdrop-blur-md transition-colors"
                    title="Zamknij"
                  >
                     <X className="w-6 h-6" />
                  </button>
               </div>
               <div className="absolute bottom-4 left-4 right-4 bg-black/60 p-4 rounded-xl backdrop-blur-md">
                  <p className="text-white font-bold">{selectedImage.name}</p>
                  <p className="text-white/60 text-xs">{selectedImage.dateUploaded}</p>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

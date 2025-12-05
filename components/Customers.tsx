
import React, { useState, useEffect } from 'react';
import { Customer, Installation, InstallationStatus, UploadedFile, Offer, UserRole, PaymentEntry } from '../types';
import { Search, Mail, Phone, MapPin, Plus, Save, Zap, File as FileIcon, Camera, Image as ImageIcon, ClipboardList, User, FilePieChart, ExternalLink, Banknote, History, Calendar, Check, CheckCircle, Battery, Upload, Trash2, Users, FileText, Hammer, X, Shovel } from 'lucide-react';
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

  // Detailed Address State (for Editing)
  const [addressDetails, setAddressDetails] = useState({
    street: '',
    zip: '',
    city: '',
    county: '',
    voivodeship: ''
  });
  
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Payment Form State
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newPaymentDate, setNewPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Permission Logic
  const canEditStatus = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;
  const canEditFinances = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;
  const canAcceptOffer = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE || currentUserRole === UserRole.SALES;
  const canEditInstallationDetails = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedInstallation = installations.find(i => i.customerId === selectedCustomerId);
  
  // Find accepted offer for technical details
  const acceptedOffer = editForm?.offers?.find(o => o.status === 'ACCEPTED');

  // Sync editForm with selected customer
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setEditForm({ ...customer });
        
        // Try to parse existing address string to pre-fill detailed fields
        // Simple heuristic: Street, Zip City, County, Voivodeship
        const parts = customer.address.split(',').map(s => s.trim());
        if (parts.length >= 1) setAddressDetails(prev => ({ ...prev, street: parts[0] }));
        if (parts.length >= 2) {
           // Try to split zip and city
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

        // Only clear AI draft when switching customers
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
        // Auto-update the main string
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
      recordedBy: currentUserName
    };

    onAddPayment(selectedInstallation.id, payment);
    setNewPaymentAmount(0);
    onShowNotification("Dodano nową wpłatę");
  };

  const handleFileUpload = (type: 'doc' | 'audit') => {
    if (editForm) {
      const newFile: UploadedFile = {
        id: Date.now().toString(),
        name: type === 'audit' ? `Zdjecie_Audyt_${Date.now()}.jpg` : `Dokument_${new Date().toLocaleDateString()}.pdf`,
        type: type === 'audit' ? 'image/jpeg' : 'application/pdf',
        dateUploaded: new Date().toISOString().split('T')[0]
      };

      let updatedCustomer = { ...editForm };
      
      if (type === 'audit') {
        const updatedPhotos = [...(editForm.auditPhotos || []), newFile];
        updatedCustomer.auditPhotos = updatedPhotos;
        onShowNotification("Dodano zdjęcie do audytu");
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

  const handleOfferAcceptClick = async (e: React.MouseEvent, customerId: string, offerId: string) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await onAcceptOffer(customerId, offerId);
      onShowNotification("Pomyślnie zaakceptowano ofertę. Dane zostały zaktualizowane.");
      setActiveTab('data'); // Switch to main tab AFTER update is confirmed
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
      
      {/* Sidebar List */}
      <div className="w-80 border-r border-slate-200 bg-slate-50 flex flex-col h-full">
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
        {selectedCustomerId && editForm ? (
          <>
            {/* Header */}
            <div className="bg-white border-b border-slate-200 p-6 shadow-sm flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                  <User className="w-6 h-6 mr-3 text-slate-400" />
                  {editForm.name}
                </h2>
                <p className="text-slate-500 text-sm mt-1 ml-9">{editForm.address}</p>
              </div>
              <button 
                onClick={handleSaveCustomer}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-colors text-sm font-bold"
              >
                <Save className="w-4 h-4 mr-2" /> Zapisz zmiany
              </button>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-slate-200 px-6 flex space-x-6">
               {[
                 { id: 'data', label: 'Dane Klienta', icon: User },
                 { id: 'offers', label: 'Oferty', icon: FilePieChart },
                 { id: 'audit', label: 'Audyt', icon: Camera },
                 { id: 'finances', label: 'Finanse', icon: Banknote },
                 { id: 'files', label: 'Pliki', icon: FileIcon },
                 { id: 'notes', label: 'Notatki', icon: ClipboardList },
               ].map(tab => (
                 <button
                   key={tab.id}
                   onClick={() => setActiveTab(tab.id as TabType)}
                   className={`flex items-center py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                 >
                   <tab.icon className="w-4 h-4 mr-2" />
                   {tab.label}
                 </button>
               ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-8">
               
               {/* TAB: DATA */}
               {activeTab === 'data' && (
                 <div className="max-w-6xl space-y-8 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
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
                               <div className="grid grid-cols-2 gap-3">
                                  <div className="col-span-2">
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

                       <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center">
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

                    {/* Technical Calculator Details Preview */}
                    {acceptedOffer && (
                       <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                          <h3 className="font-bold text-slate-700 mb-4 flex items-center">
                             <Hammer className="w-5 h-5 mr-2 text-slate-500" /> Dane Techniczne z Kalkulatora
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                             <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="bg-amber-50 p-2 rounded-lg text-amber-600"><Hammer className="w-5 h-5" /></div>
                                <div>
                                   <p className="text-xs text-slate-500 uppercase font-bold">Typ Montażu</p>
                                   <p className="font-bold text-slate-800">{acceptedOffer.calculatorState.roofType}</p>
                                </div>
                             </div>
                             {acceptedOffer.calculatorState.roofType === 'GRUNT' && (
                                <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                   <div className="bg-green-50 p-2 rounded-lg text-green-600"><Shovel className="w-5 h-5" /></div>
                                   <div>
                                      <p className="text-xs text-slate-500 uppercase font-bold">Długość Przekopu</p>
                                      <p className="font-bold text-slate-800">{acceptedOffer.calculatorState.trenchLength} mb</p>
                                   </div>
                                </div>
                             )}
                             <div className="flex items-center space-x-3 bg-white p-3 rounded-lg border border-slate-200">
                                <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><Zap className="w-5 h-5" /></div>
                                <div>
                                   <p className="text-xs text-slate-500 uppercase font-bold">Konfiguracja</p>
                                   <p className="font-bold text-slate-800">
                                      {acceptedOffer.calculatorState.panelCount}x PV + {acceptedOffer.calculatorState.storageId ? 'Magazyn' : 'Brak Magazynu'}
                                   </p>
                                </div>
                             </div>
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
                          <Plus className="w-4 h-4 mr-1" /> Utwórz nową w Kalkulatorze
                       </button>
                    </div>

                    {editForm.offers && editForm.offers.length > 0 ? (
                      <div className="grid gap-4">
                        {editForm.offers.map((offer) => (
                          <div key={offer.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center group hover:border-blue-200 transition-all">
                             <div className="mb-4 md:mb-0">
                                <div className="flex items-center space-x-3">
                                   <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                      <FileText className="w-6 h-6" />
                                   </div>
                                   <div>
                                      <h4 className="font-bold text-slate-800 text-lg">{offer.name}</h4>
                                      <p className="text-xs text-slate-500">Utworzono: {new Date(offer.dateCreated).toLocaleDateString()}</p>
                                   </div>
                                </div>
                                <div className="mt-3 flex items-center space-x-4 text-sm text-slate-600">
                                   <span className="flex items-center"><Zap className="w-4 h-4 mr-1 text-slate-400"/> {offer.calculatorState.panelCount}x Panele</span>
                                   <span className="flex items-center"><Battery className="w-4 h-4 mr-1 text-slate-400"/> {offer.calculatorState.storageId ? 'Z magazynem' : 'Bez magazynu'}</span>
                                </div>
                             </div>
                             
                             <div className="flex flex-col items-end space-y-3 w-full md:w-auto">
                                <p className="text-2xl font-bold text-slate-900">{offer.finalPrice.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</p>
                                <div className="flex space-x-2 w-full md:w-auto">
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
                                     <span className="flex items-center text-green-600 font-bold bg-green-50 px-3 py-2 rounded-lg text-sm border border-green-100">
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

               {/* TAB: AUDIT */}
               {activeTab === 'audit' && (
                 <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                       <h3 className="text-lg font-bold text-slate-800">Dokumentacja Zdjęciowa</h3>
                       <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors flex items-center shadow-sm text-sm font-bold">
                          <Camera className="w-4 h-4 mr-2" /> Dodaj Zdjęcie
                          <input type="file" accept="image/*" className="hidden" onChange={() => handleFileUpload('audit')} />
                       </label>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {editForm.auditPhotos && editForm.auditPhotos.length > 0 ? (
                         editForm.auditPhotos.map(photo => (
                           <div key={photo.id} className="group relative aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                              <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-200">
                                 <ImageIcon className="w-8 h-8" />
                              </div>
                              {/* Mock Image Content */}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2">
                                 <p className="text-white text-xs truncate">{photo.name}</p>
                              </div>
                              <button 
                                onClick={() => handleDeleteFile(photo.id, 'audit')}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                              >
                                 <Trash2 className="w-4 h-4" />
                              </button>
                           </div>
                         ))
                       ) : (
                         <div className="col-span-full py-12 text-center text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                            <Camera className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Brak zdjęć z audytu.</p>
                         </div>
                       )}
                    </div>
                 </div>
               )}

               {/* TAB: FILES */}
               {activeTab === 'files' && (
                 <div className="space-y-6 animate-fade-in">
                    <div className="flex justify-between items-center">
                       <h3 className="text-lg font-bold text-slate-800">Pliki i Dokumenty</h3>
                       <label className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors flex items-center shadow-sm text-sm font-bold">
                          <Upload className="w-4 h-4 mr-2" /> Wgraj Plik
                          <input type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={() => handleFileUpload('doc')} />
                       </label>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                       {editForm.files && editForm.files.length > 0 ? (
                         <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500 font-bold">
                               <tr>
                                  <th className="p-4">Nazwa Pliku</th>
                                  <th className="p-4">Data</th>
                                  <th className="p-4 text-right">Akcje</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                               {editForm.files.map(file => (
                                 <tr key={file.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-700 flex items-center">
                                       <FileIcon className="w-4 h-4 mr-3 text-blue-500" /> {file.name}
                                    </td>
                                    <td className="p-4 text-slate-500">{file.dateUploaded}</td>
                                    <td className="p-4 text-right">
                                       <button 
                                         onClick={() => handleDeleteFile(file.id, 'doc')}
                                         className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    </td>
                                 </tr>
                               ))}
                            </tbody>
                         </table>
                       ) : (
                         <div className="p-12 text-center text-slate-400">
                            <FileIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                            <p>Brak wgranych dokumentów.</p>
                         </div>
                       )}
                    </div>
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

                     {/* Progress Bar */}
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center mb-2">
                           <span className="font-bold text-slate-700">Postęp Płatności</span>
                           <span className="font-bold text-blue-600">{selectedInstallation.price > 0 ? ((selectedInstallation.paidAmount / selectedInstallation.price) * 100).toFixed(0) : 0}%</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-4 overflow-hidden">
                           <div 
                             className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-1000"
                             style={{width: `${selectedInstallation.price > 0 ? (selectedInstallation.paidAmount / selectedInstallation.price) * 100 : 0}%`}}
                           ></div>
                        </div>
                     </div>

                     {/* Payment History Table */}
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                           <h3 className="font-bold text-slate-800 flex items-center">
                              <History className="w-4 h-4 mr-2" /> Historia Wpłat
                           </h3>
                        </div>
                        
                        {selectedInstallation.paymentHistory && selectedInstallation.paymentHistory.length > 0 ? (
                           <table className="w-full text-left text-sm">
                              <thead className="bg-slate-50 text-slate-500 font-bold">
                                 <tr>
                                    <th className="p-4">Data</th>
                                    <th className="p-4">Kwota</th>
                                    <th className="p-4">Zaksięgował</th>
                                    {canEditFinances && <th className="p-4 text-right">Akcje</th>}
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                 {selectedInstallation.paymentHistory.map(payment => (
                                    <tr key={payment.id} className="hover:bg-slate-50">
                                       <td className="p-4 font-medium text-slate-700">{payment.date}</td>
                                       <td className="p-4 font-bold text-green-600">+{payment.amount.toLocaleString()} PLN</td>
                                       <td className="p-4 text-slate-500 flex items-center">
                                          <User className="w-3 h-3 mr-1" /> {payment.recordedBy}
                                       </td>
                                       {canEditFinances && (
                                          <td className="p-4 text-right">
                                             <button 
                                               onClick={() => onRemovePayment(selectedInstallation.id, payment.id)}
                                               className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded transition-colors"
                                             >
                                                <Trash2 className="w-4 h-4" />
                                             </button>
                                          </td>
                                       )}
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        ) : (
                           <div className="p-8 text-center text-slate-400">Brak historii wpłat.</div>
                        )}
                     </div>

                     {/* Add Payment Form */}
                     {canEditFinances && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                           <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                              <Plus className="w-4 h-4 mr-2" /> Dodaj Nową Wpłatę
                           </h3>
                           <div className="flex items-end space-x-4">
                              <div className="flex-1">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kwota (PLN)</label>
                                 <input 
                                   type="number" 
                                   value={newPaymentAmount}
                                   onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                                   className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                   placeholder="0.00"
                                 />
                              </div>
                              <div className="flex-1">
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Data Wpływu</label>
                                 <input 
                                   type="date" 
                                   value={newPaymentDate}
                                   onChange={(e) => setNewPaymentDate(e.target.value)}
                                   className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                 />
                              </div>
                              <button 
                                onClick={handlePaymentSubmit}
                                disabled={newPaymentAmount <= 0}
                                className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md transition-colors disabled:opacity-50"
                              >
                                 Dodaj Wpłatę
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {/* TAB: NOTES */}
               {activeTab === 'notes' && (
                  <div className="max-w-4xl space-y-6 animate-fade-in">
                     <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Notatki Wewnętrzne</h3>
                        <textarea 
                           value={editForm.notes}
                           onChange={(e) => handleInputChange('notes', e.target.value)}
                           className="w-full h-40 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-700"
                           placeholder="Wpisz notatki dotyczące klienta..."
                        />
                        <div className="mt-4 flex justify-end">
                           <button onClick={handleSaveCustomer} className="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 font-medium">Zapisz notatkę</button>
                        </div>
                     </div>

                     <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                           <h3 className="text-lg font-bold flex items-center mb-2">
                              <Zap className="w-5 h-5 mr-2 text-yellow-400" /> Asystent AI - Generator Wiadomości
                           </h3>
                           <p className="text-indigo-100 text-sm mb-4 max-w-lg">
                              Wygeneruj profesjonalną wiadomość email do klienta informującą o aktualnym etapie prac.
                           </p>
                           
                           {!aiDraft ? (
                             <button 
                               onClick={handleGenerateEmail}
                               disabled={isGenerating || !selectedInstallation}
                               className="bg-white text-indigo-600 px-6 py-2.5 rounded-lg font-bold shadow-md hover:bg-indigo-50 transition-colors disabled:opacity-70 flex items-center"
                             >
                               {isGenerating ? 'Generowanie...' : 'Generuj treść maila'}
                             </button>
                           ) : (
                             <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20 animate-fade-in">
                                <h4 className="font-bold text-xs uppercase text-indigo-200 mb-2">Propozycja treści:</h4>
                                <p className="text-sm whitespace-pre-line leading-relaxed mb-4">{aiDraft}</p>
                                <div className="flex space-x-3">
                                   <button 
                                     onClick={() => {navigator.clipboard.writeText(aiDraft); onShowNotification("Skopiowano do schowka");}}
                                     className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-50"
                                   >
                                      Kopiuj
                                   </button>
                                   <button 
                                     onClick={() => setAiDraft(null)}
                                     className="text-indigo-200 hover:text-white px-4 py-2 text-xs font-medium"
                                   >
                                      Odrzuć
                                   </button>
                                </div>
                             </div>
                           )}
                        </div>
                     </div>
                  </div>
               )}

            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
            <Users className="w-24 h-24 mb-4 opacity-20" />
            <p className="text-lg font-medium text-slate-400">Wybierz klienta z listy</p>
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
               
               <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Imię i Nazwisko / Nazwa Firmy</label>
                        <input 
                           type="text" 
                           value={newCustomer.name} 
                           onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="Jan Kowalski"
                        />
                     </div>
                     
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                        <input 
                           type="email" 
                           value={newCustomer.email} 
                           onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="email@example.com"
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefon</label>
                        <input 
                           type="text" 
                           value={newCustomer.phone} 
                           onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                           placeholder="+48 123 456 789"
                        />
                     </div>

                     <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                        <p className="text-sm font-bold text-slate-700 mb-3">Adres Inwestycji</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <input type="text" placeholder="Ulica i numer" value={newCustomer.street} onChange={(e) => setNewCustomer({...newCustomer, street: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                            </div>
                            <div>
                                <input type="text" placeholder="Kod pocztowy" value={newCustomer.zip} onChange={(e) => setNewCustomer({...newCustomer, zip: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                            </div>
                            <div>
                                <input type="text" placeholder="Miejscowość" value={newCustomer.city} onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                            </div>
                            <div>
                                <input type="text" placeholder="Powiat" value={newCustomer.county} onChange={(e) => setNewCustomer({...newCustomer, county: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                            </div>
                            <div>
                                <input type="text" placeholder="Województwo" value={newCustomer.voivodeship} onChange={(e) => setNewCustomer({...newCustomer, voivodeship: e.target.value})} className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                            </div>
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
                     <Plus className="w-5 h-5 mr-2" /> Dodaj Klienta
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { Customer, Installation, InstallationStatus, UploadedFile, Offer, UserRole, PaymentEntry } from '../types';
import { Search, Mail, Phone, MapPin, Plus, Save, Zap, File as FileIcon, Camera, Image as ImageIcon, ClipboardList, User, FilePieChart, ExternalLink, Banknote, History, Calendar, Check, CheckCircle, Battery, Upload, Trash2, Users, FileText } from 'lucide-react';
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
  onAcceptOffer: (customerId: string, offerId: string) => void;
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
  currentUserRole,
  currentUserName
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editForm, setEditForm] = useState<Customer | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('data');
  
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Payment Form State
  const [newPaymentAmount, setNewPaymentAmount] = useState<number>(0);
  const [newPaymentDate, setNewPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Permission Logic
  const canEditStatus = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;
  const canEditFinances = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE;
  const canAcceptOffer = currentUserRole === UserRole.ADMIN || currentUserRole === UserRole.OFFICE || currentUserRole === UserRole.SALES;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedInstallation = installations.find(i => i.customerId === selectedCustomerId);

  // Sync editForm with selected customer, but don't force tab switch
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer) {
        setEditForm({ ...customer });
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
         updatedCustomer.auditPhotos = editForm.auditPhotos?.filter(f => f.id !== fileId) || [];
      } else {
         updatedCustomer.files = editForm.files?.filter(f => f.id !== fileId) || [];
      }
      
      setEditForm(updatedCustomer);
      onUpdateCustomer(updatedCustomer);
      onShowNotification("Usunięto element", 'info');
    }
  };

  const handleOfferAcceptClick = (e: React.MouseEvent, offerId: string) => {
    e.stopPropagation();
    if (window.confirm("Czy na pewno chcesz zaakceptować tę ofertę?\n\nSpowoduje to:\n1. Zaktualizowanie statusu instalacji na 'Audyt'\n2. Wpisanie danych technicznych i finansowych do profilu klienta\n3. Odjęcie komponentów z magazynu")) {
      onAcceptOffer(selectedCustomerId!, offerId);
      // Wait a tick to allow state to propagate, though React batching usually handles this.
      // Explicitly switch tab to show the result.
      setTimeout(() => setActiveTab('data'), 100);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Sidebar List */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Szukaj klienta..." 
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filteredCustomers.map(customer => (
            <div 
              key={customer.id}
              onClick={() => {
                setSelectedCustomerId(customer.id);
                // Optional: Reset tab when switching customers if desired, or keep current
                // setActiveTab('data'); 
              }}
              className={`p-4 border-b border-slate-100 cursor-pointer transition-all hover:bg-slate-50 ${selectedCustomerId === customer.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                   <h3 className={`font-semibold ${selectedCustomerId === customer.id ? 'text-blue-700' : 'text-slate-700'}`}>{customer.name}</h3>
                   <p className="text-xs text-slate-500 mt-1">{customer.email}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">
                  {customer.name.substring(0, 2).toUpperCase()}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button className="w-full flex items-center justify-center space-x-2 bg-slate-800 text-white py-2 rounded-lg hover:bg-slate-700 transition-colors shadow">
            <Plus className="w-4 h-4" />
            <span>Dodaj Nowego Klienta</span>
          </button>
        </div>
      </div>

      {/* Main Detail Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {editForm ? (
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white">
               <div>
                  <h2 className="text-2xl font-bold text-slate-800">{editForm.name}</h2>
                  <p className="text-slate-500 text-sm flex items-center mt-1">
                    <MapPin className="w-3 h-3 mr-1" /> {editForm.address}
                  </p>
               </div>
               <button 
                onClick={handleSaveCustomer}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center shadow-md transition-colors"
               >
                 <Save className="w-4 h-4 mr-2" /> Zapisz Zmiany
               </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
              <button 
                onClick={() => setActiveTab('data')}
                className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 transition-colors ${activeTab === 'data' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <User className="w-4 h-4 mr-2" /> Dane Klienta
              </button>
              <button 
                onClick={() => setActiveTab('finances')}
                className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 transition-colors ${activeTab === 'finances' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Banknote className="w-4 h-4 mr-2" /> Finanse
              </button>
              <button 
                onClick={() => setActiveTab('offers')}
                className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 transition-colors ${activeTab === 'offers' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <FilePieChart className="w-4 h-4 mr-2" /> Oferty
              </button>
              <button 
                onClick={() => setActiveTab('audit')}
                className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 transition-colors ${activeTab === 'audit' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <Camera className="w-4 h-4 mr-2" /> Audyt
              </button>
              <button 
                onClick={() => setActiveTab('files')}
                className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 transition-colors ${activeTab === 'files' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <FileIcon className="w-4 h-4 mr-2" /> Pliki
              </button>
              <button 
                onClick={() => setActiveTab('notes')}
                className={`px-4 py-3 text-sm font-medium flex items-center border-b-2 transition-colors ${activeTab === 'notes' ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                <ClipboardList className="w-4 h-4 mr-2" /> Notatki & AI
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
              
              {/* TAB: DATA */}
              {activeTab === 'data' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                  <div className="space-y-6">
                    <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Dane Kontaktowe</h3>
                      <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Imię i Nazwisko</label>
                            <input 
                              type="text" 
                              value={editForm.name} 
                              onChange={(e) => handleInputChange('name', e.target.value)}
                              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center"><Mail className="w-3 h-3 mr-1"/> Email</label>
                              <input 
                                type="email" 
                                value={editForm.email} 
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center"><Phone className="w-3 h-3 mr-1"/> Telefon</label>
                              <input 
                                type="text" 
                                value={editForm.phone} 
                                onChange={(e) => handleInputChange('phone', e.target.value)}
                                className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center"><MapPin className="w-3 h-3 mr-1"/> Adres</label>
                            <input 
                              type="text" 
                              value={editForm.address} 
                              onChange={(e) => handleInputChange('address', e.target.value)}
                              className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            />
                          </div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                      <h3 className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-4 flex items-center">
                        <Zap className="w-4 h-4 mr-2" /> Instalacja
                      </h3>
                      {selectedInstallation ? (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-blue-800 mb-1">Status Realizacji</label>
                            <div className="relative">
                              <select 
                                value={selectedInstallation.status} 
                                onChange={(e) => handleStatusChange(e.target.value as InstallationStatus)}
                                disabled={!canEditStatus}
                                className={`w-full p-3 bg-white border border-blue-200 rounded-lg text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none ${!canEditStatus ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                              >
                                {Object.values(InstallationStatus).map(status => (
                                  <option key={status} value={status}>{status}</option>
                                ))}
                              </select>
                            </div>
                            {!canEditStatus && <p className="text-[10px] text-blue-600 mt-1">Brak uprawnień do zmiany statusu</p>}
                          </div>
                          <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-blue-100">
                              <span className="text-sm text-blue-600">Moc Systemu</span>
                              <span className="font-bold text-slate-800 text-lg">{selectedInstallation.systemSizeKw.toFixed(2)} kWp</span>
                          </div>
                          
                          {/* Hardware Details (Populated from Accept Offer) */}
                          <div className="space-y-2">
                             {selectedInstallation.panelModel && (
                                <div className="bg-white p-3 rounded-lg border border-blue-100 flex items-start">
                                    <div className="mr-3 mt-1 text-amber-500"><Zap className="w-4 h-4" /></div>
                                    <div>
                                       <p className="text-xs text-blue-400">Panele Fotowoltaiczne</p>
                                       <p className="font-medium text-slate-700 text-sm">{selectedInstallation.panelModel}</p>
                                    </div>
                                </div>
                             )}
                             {selectedInstallation.inverterModel && (
                                <div className="bg-white p-3 rounded-lg border border-blue-100 flex items-start">
                                    <div className="mr-3 mt-1 text-blue-500"><Zap className="w-4 h-4" /></div>
                                    <div>
                                       <p className="text-xs text-blue-400">Falownik</p>
                                       <p className="font-medium text-slate-700 text-sm">{selectedInstallation.inverterModel}</p>
                                    </div>
                                </div>
                             )}
                             {selectedInstallation.storageModel && (
                                <div className="bg-white p-3 rounded-lg border border-blue-100 flex items-start">
                                    <div className="mr-3 mt-1 text-green-500"><Battery className="w-4 h-4" /></div>
                                    <div>
                                       <p className="text-xs text-blue-400">Magazyn Energii</p>
                                       <p className="font-medium text-slate-700 text-sm">{selectedInstallation.storageModel}</p>
                                    </div>
                                </div>
                             )}
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-lg border border-blue-100">
                                <p className="text-xs text-blue-400 mb-1">Zespół Montażowy</p>
                                <p className="font-medium text-slate-700 text-sm truncate">{selectedInstallation.assignedTeam || 'Nie przypisano'}</p>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-blue-100">
                                <p className="text-xs text-blue-400 mb-1">Planowana Data</p>
                                <p className="font-medium text-slate-700 text-sm">{selectedInstallation.dateScheduled || 'Do ustalenia'}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center p-4 text-blue-400">
                          Brak przypisanej instalacji.
                        </div>
                      )}
                    </section>
                  </div>
                </div>
              )}

              {/* TAB: FINANCES */}
              {activeTab === 'finances' && selectedInstallation && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                  <div className="space-y-6">
                    {/* Main Financial Summary */}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center">
                        <Banknote className="w-5 h-5 mr-2 text-green-600" /> Rozliczenie Inwestycji
                      </h3>
                      
                      <div className="space-y-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-2">Całkowita wartość umowy (PLN)</label>
                          <input 
                            type="number" 
                            value={selectedInstallation.price} 
                            onChange={(e) => {
                               if (canEditFinances) {
                                 onUpdateInstallation({ ...selectedInstallation, price: Number(e.target.value) });
                               }
                            }}
                            disabled={!canEditFinances}
                            className={`w-full p-4 text-xl font-bold border border-slate-300 rounded-lg outline-none ${!canEditFinances ? 'bg-slate-100 text-slate-600' : 'focus:ring-2 focus:ring-blue-500'}`}
                          />
                        </div>
                        
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                          <label className="block text-sm font-medium text-slate-700 mb-2">Postęp płatności</label>
                          <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden mb-2">
                             <div 
                               className="h-full bg-green-500 transition-all duration-500"
                               style={{ width: `${selectedInstallation.price > 0 ? (selectedInstallation.paidAmount / selectedInstallation.price) * 100 : 0}%` }}
                             ></div>
                          </div>
                          <div className="flex justify-between font-bold">
                             <span className="text-green-700">{selectedInstallation.paidAmount.toLocaleString()} PLN</span>
                             <span className="text-slate-500">{selectedInstallation.price > 0 ? Math.round((selectedInstallation.paidAmount / selectedInstallation.price) * 100) : 0}%</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg border border-red-100">
                           <span className="text-red-700 font-medium">Pozostało do zapłaty:</span>
                           <span className="text-xl font-bold text-red-700">
                             {(selectedInstallation.price - selectedInstallation.paidAmount).toLocaleString('pl-PL')} PLN
                           </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Add Payment Form (Office/Admin only) */}
                    {canEditFinances && (
                       <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm border-t-4 border-t-blue-500">
                          <h4 className="font-bold text-slate-800 mb-4 flex items-center">
                             <Plus className="w-5 h-5 mr-2 text-blue-600" /> Dodaj nową wpłatę
                          </h4>
                          <div className="flex flex-col space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                                <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Kwota (PLN)</label>
                                   <input 
                                     type="number"
                                     value={newPaymentAmount}
                                     onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                                     className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                   />
                                </div>
                                <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Data zaksięgowania</label>
                                   <input 
                                     type="date"
                                     value={newPaymentDate}
                                     onChange={(e) => setNewPaymentDate(e.target.value)}
                                     className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                                   />
                                </div>
                             </div>
                             <button 
                               onClick={handlePaymentSubmit}
                               disabled={newPaymentAmount <= 0}
                               className="bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                             >
                               Zaksięguj Wpłatę
                             </button>
                          </div>
                       </div>
                    )}
                  </div>

                  {/* Payment History Table */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                     <h4 className="text-slate-800 font-bold mb-6 flex items-center">
                        <History className="w-5 h-5 mr-2 text-slate-500" /> Historia Płatności
                     </h4>
                     
                     <div className="flex-1 overflow-auto">
                        {selectedInstallation.paymentHistory && selectedInstallation.paymentHistory.length > 0 ? (
                          <table className="w-full text-left border-collapse">
                            <thead>
                               <tr className="border-b border-slate-100 text-xs text-slate-500 uppercase">
                                 <th className="py-3 px-2">Data</th>
                                 <th className="py-3 px-2">Kwota</th>
                                 <th className="py-3 px-2">Zaksięgował</th>
                                 {canEditFinances && <th className="py-3 px-2 text-right">Akcja</th>}
                               </tr>
                            </thead>
                            <tbody className="text-sm">
                               {selectedInstallation.paymentHistory.map(payment => (
                                 <tr key={payment.id} className="border-b border-slate-50 hover:bg-slate-50">
                                   <td className="py-3 px-2 text-slate-700 flex items-center">
                                     <Calendar className="w-3 h-3 mr-2 text-slate-400" /> {payment.date}
                                   </td>
                                   <td className="py-3 px-2 font-bold text-green-600">+{payment.amount.toLocaleString()} zł</td>
                                   <td className="py-3 px-2 text-slate-500 text-xs">{payment.recordedBy}</td>
                                   {canEditFinances && (
                                     <td className="py-3 px-2 text-right">
                                        <button 
                                          onClick={() => onRemovePayment(selectedInstallation.id, payment.id)}
                                          className="text-slate-400 hover:text-red-500 transition-colors"
                                          title="Usuń wpłatę"
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
                          <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-lg">
                            <Banknote className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p>Brak zaksięgowanych wpłat.</p>
                          </div>
                        )}
                     </div>
                  </div>
                </div>
              )}

              {/* TAB: OFFERS */}
              {activeTab === 'offers' && (
                 <div className="space-y-6 animate-fade-in">
                    <h3 className="text-lg font-bold text-slate-700">Zapisane Kalkulacje i Oferty</h3>
                    
                    {editForm.offers && editForm.offers.length > 0 ? (
                      <div className="grid grid-cols-1 gap-4">
                         {editForm.offers.map(offer => (
                           <div key={offer.id} className={`bg-white p-6 rounded-xl border shadow-sm transition-all group ${offer.status === 'ACCEPTED' ? 'border-green-200 bg-green-50/20' : 'border-slate-200 hover:border-amber-300'}`}>
                              <div className="flex justify-between items-start">
                                 <div>
                                   <div className="flex items-center space-x-2">
                                     <div className={`${offer.status === 'ACCEPTED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'} p-2 rounded-lg`}>
                                       {offer.status === 'ACCEPTED' ? <CheckCircle className="w-5 h-5"/> : <FilePieChart className="w-5 h-5" />}
                                     </div>
                                     <h4 className="font-bold text-slate-800 text-lg">{offer.name}</h4>
                                     {offer.status === 'ACCEPTED' && (
                                       <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full border border-green-200">ZAAKCEPTOWANA</span>
                                     )}
                                   </div>
                                   <p className="text-slate-500 text-sm mt-1 ml-11">Data utworzenia: {new Date(offer.dateCreated).toLocaleDateString('pl-PL')}</p>
                                 </div>
                                 <div className="text-right">
                                   <span className="block text-2xl font-bold text-green-600">{offer.finalPrice.toLocaleString('pl-PL', {maximumFractionDigits: 0})} PLN</span>
                                   <span className="text-xs text-slate-400">Kwota netto po dotacjach</span>
                                 </div>
                              </div>
                              
                              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                                 <div className="text-xs text-slate-500 flex space-x-4">
                                    <span>Zużycie: {offer.calculatorState.consumption} kWh</span>
                                    <span>Panele: {offer.calculatorState.panelCount} szt.</span>
                                    {offer.calculatorState.storageId && (
                                      <span className="text-green-600 font-medium">+ Magazyn Energii</span>
                                    )}
                                 </div>
                                 
                                 <div className="flex space-x-2">
                                   {offer.status !== 'ACCEPTED' && canAcceptOffer && (
                                     <button 
                                       onClick={(e) => handleOfferAcceptClick(e, offer.id)}
                                       className="text-sm bg-green-600 hover:bg-green-700 text-white font-medium px-4 py-2 rounded-lg flex items-center transition-colors shadow-sm"
                                     >
                                        <Check className="w-4 h-4 mr-2" /> Zaakceptuj
                                     </button>
                                   )}
                                   <button 
                                     onClick={() => onEditOffer(offer)}
                                     className="text-sm bg-slate-50 hover:bg-slate-100 text-blue-600 font-medium px-4 py-2 rounded-lg flex items-center transition-colors"
                                   >
                                      Podgląd <ExternalLink className="w-4 h-4 ml-2" />
                                   </button>
                                 </div>
                              </div>
                           </div>
                         ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                        <FilePieChart className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-slate-500">Brak zapisanych ofert dla tego klienta.</p>
                        <p className="text-xs text-slate-400 mt-1">Użyj "Aplikacja > Kalkulator PV", aby stworzyć nową ofertę.</p>
                      </div>
                    )}
                 </div>
              )}

              {/* ... (other tabs remain same) ... */}
              {activeTab === 'audit' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="flex justify-between items-center mb-4">
                     <h3 className="text-lg font-bold text-slate-700">Zdjęcia z Audytu</h3>
                     <button 
                       onClick={() => handleFileUpload('audit')} 
                       className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center hover:bg-blue-700 transition-colors"
                     >
                       <Camera className="w-4 h-4 mr-2" /> Dodaj Zdjęcie
                     </button>
                  </div>
                  
                  {editForm.auditPhotos && editForm.auditPhotos.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {editForm.auditPhotos.map(photo => (
                        <div key={photo.id} className="group relative bg-white p-2 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all">
                           <div className="aspect-square bg-slate-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden relative">
                             {/* Mock Image Placeholder since we don't have real URLs */}
                             <ImageIcon className="w-12 h-12 text-slate-300" />
                             <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                           </div>
                           <p className="text-xs font-medium text-slate-700 truncate px-1">{photo.name}</p>
                           <p className="text-xs text-slate-400 px-1">{photo.dateUploaded}</p>
                           
                           <button 
                             onClick={() => handleDeleteFile(photo.id, 'audit')}
                             className="absolute top-3 right-3 p-1.5 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50"
                             title="Usuń zdjęcie"
                           >
                             <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400">
                      <Camera className="w-12 h-12 mb-2" />
                      <p>Brak zdjęć z audytu.</p>
                      <button onClick={() => handleFileUpload('audit')} className="text-blue-600 font-medium mt-2 hover:underline">Dodaj pierwsze zdjęcie</button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: FILES */}
              {activeTab === 'files' && (
                <div className="space-y-6 animate-fade-in">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-slate-700">Dokumenty i Pliki</h3>
                      <button 
                        onClick={() => handleFileUpload('doc')} 
                        className="text-sm flex items-center text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-4 py-2 rounded-lg"
                      >
                        <Upload className="w-4 h-4 mr-2" /> Dodaj plik
                      </button>
                   </div>
                   
                   <div className="space-y-3">
                     {editForm.files && editForm.files.length > 0 ? (
                       editForm.files.map(file => (
                         <div key={file.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-slate-200 hover:border-blue-300 transition-colors shadow-sm group">
                           <div className="flex items-center space-x-4">
                              <div className="bg-red-50 p-3 rounded-lg">
                                <FileIcon className="w-6 h-6 text-red-500" />
                              </div>
                              <div>
                                <p className="font-medium text-slate-700">{file.name}</p>
                                <p className="text-xs text-slate-500">Data dodania: {file.dateUploaded}</p>
                              </div>
                           </div>
                           <div className="flex items-center space-x-2">
                             <button className="px-3 py-1 text-xs font-medium text-blue-600 border border-blue-200 rounded hover:bg-blue-50">Podgląd</button>
                             <button 
                              onClick={() => handleDeleteFile(file.id, 'doc')}
                              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                             >
                               <Trash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </div>
                       ))
                     ) : (
                       <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                         <FileIcon className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                         <p className="text-slate-500">Brak załączonych dokumentów.</p>
                       </div>
                     )}
                   </div>
                </div>
              )}

              {/* TAB: NOTES & AI */}
              {activeTab === 'notes' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-700 flex items-center">
                       <FileText className="w-5 h-5 mr-2" /> Notatki wewnętrzne
                    </h3>
                    <textarea 
                      value={editForm.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="w-full h-96 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-700 leading-relaxed shadow-sm"
                      placeholder="Wpisz notatki dotyczące klienta, ustaleń, preferencji..."
                    />
                    <p className="text-xs text-slate-400 text-right">Notatki są widoczne tylko dla pracowników.</p>
                  </div>

                  <div className="space-y-4">
                     <h3 className="text-lg font-bold text-indigo-700 flex items-center">
                       <Users className="w-5 h-5 mr-2" /> Asystent AI - Komunikacja
                    </h3>
                     <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 h-96 flex flex-col">
                       <p className="text-sm text-indigo-800 mb-4">
                         Wygeneruj profesjonalną wiadomość email do klienta na podstawie aktualnego statusu instalacji ({selectedInstallation?.status}).
                       </p>
                       
                       {aiDraft ? (
                         <div className="flex-1 flex flex-col">
                           <textarea 
                             readOnly 
                             value={aiDraft}
                             className="flex-1 w-full p-3 text-sm text-slate-700 bg-white border border-indigo-200 rounded-lg focus:outline-none mb-3 resize-none"
                           />
                           <div className="flex space-x-2">
                             <button 
                              onClick={() => {
                                navigator.clipboard.writeText(aiDraft);
                                onShowNotification("Skopiowano do schowka", 'success');
                              }}
                              className="flex-1 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-medium hover:bg-indigo-200 transition-colors"
                             >
                               Kopiuj
                             </button>
                             <button 
                              onClick={() => setAiDraft(null)}
                              className="px-4 py-2 border border-indigo-200 text-indigo-600 rounded-lg hover:bg-white"
                             >
                               Wróć
                             </button>
                           </div>
                         </div>
                       ) : (
                         <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                              <Users className="w-8 h-8 text-indigo-500" />
                            </div>
                            <button 
                              onClick={handleGenerateEmail}
                              disabled={isGenerating}
                              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md transition-colors font-medium"
                            >
                              {isGenerating ? 'Generowanie treści...' : 'Wygeneruj Email'}
                            </button>
                         </div>
                       )}
                     </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
               <Users className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-600">Wybierz klienta</h3>
            <p className="text-sm max-w-xs text-center mt-2">Kliknij na klienta z listy po lewej stronie, aby zobaczyć szczegóły, edytować dane i zarządzać instalacją.</p>
          </div>
        )}
      </div>
    </div>
  );
};

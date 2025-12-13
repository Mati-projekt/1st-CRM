import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, Installation, User, InventoryItem, Offer, CustomerNote, UserRole, PaymentEntry, UploadedFile, InstallationStatus, NotificationType, CalculatorState, HeatingCalculatorState, StorageCalculatorState } from '../types';
import { 
  Search, Plus, User as UserIcon, Phone, Mail, MapPin, FileText, 
  Wrench, DollarSign, Calendar, Clock, Send, MessageSquare, 
  Trash2, Edit2, Save, X, CheckCircle, AlertTriangle, 
  History as HistoryIcon, Paperclip, ExternalLink, Download, 
  MoreVertical, FilePlus, ChevronRight, PenTool, Image as ImageIcon, Briefcase, CreditCard, Camera, ClipboardCheck, Video, FileCheck, ToggleLeft, ToggleRight, Info, Home, Zap, Battery, Cpu, ArrowDownToLine, Shovel, Eye, ZoomIn, ZoomOut, MessageSquarePlus, Maximize, Minus, Check, Loader2, Move, Lock
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

// Updated 11 Steps Audit List
const AUDIT_STEPS = [
   { id: 1, label: '1. Film instalacji ME', type: 'VIDEO' },
   { id: 2, label: '2. Rozdzielnica główna', type: 'PHOTO' },
   { id: 3, label: '3. Licznik', type: 'PHOTO' },
   { id: 4, label: '4. Miejsce falownika/ME', type: 'PHOTO' },
   { id: 5, label: '5. Miejsce montażu paneli', type: 'PHOTO' },
   { id: 6, label: '6. Trasa kablowa/przekop', type: 'PHOTO' },
   { id: 7, label: '7. Faktura za energię', type: 'doc' },
   { id: 8, label: '8. Istniejąca instalacja', type: 'PHOTO' },
   { id: 9, label: '9. Miejsce wpięcia starej', type: 'PHOTO' },
   { id: 10, label: '10. Tabliczki znamionowe', type: 'PHOTO' },
   { id: 11, label: '11. Umowa poprzednia inst.', type: 'doc' },
];

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
  // Updated Tab Order
  const [activeTab, setActiveTab] = useState<'details' | 'offers' | 'installations' | 'finances' | 'audit' | 'notes' | 'files'>('details');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', email: '', phone: '', address: '' });
  
  // Edit Form State
  const [editForm, setEditForm] = useState<Customer | null>(null);
  
  // Notes State
  const [newNoteContent, setNewNoteContent] = useState('');

  // Payment State
  const [financeMode, setFinanceMode] = useState<'CLIENT' | 'COMMISSION'>('CLIENT');
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [newPaymentDesc, setNewPaymentDesc] = useState('');
  const [paymentAttachment, setPaymentAttachment] = useState<string | null>(null);
  const [commissionAttachment, setCommissionAttachment] = useState<string | null>(null);

  // Installation UI State
  const [saveSuccessField, setSaveSuccessField] = useState<string | null>(null);

  // Deleting State for UX - Specific File ID and Modal State
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<UploadedFile | null>(null);

  // Refs
  const auditFileInputRef = useRef<HTMLInputElement>(null);
  const genericFileInputRef = useRef<HTMLInputElement>(null); // NEW: For "Pliki" tab
  const paymentFileInputRef = useRef<HTMLInputElement>(null);
  const commissionFileInputRef = useRef<HTMLInputElement>(null);
  
  // Audit UI State
  const [activeAuditStepId, setActiveAuditStepId] = useState<number | null>(1); // Default to first step
  
  // --- ADVANCED IMAGE ZOOM STATE ---
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // --- PERMISSIONS LOGIC ---
  const hasFullAccess = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.OFFICE;

  // Derived Data with Security Filter
  const filteredCustomers = useMemo(() => {
    // 1. First filter by permission
    let accessibleCustomers = customers;
    if (currentUser.role === UserRole.SALES) {
       accessibleCustomers = customers.filter(c => c.repId === currentUser.id);
    }

    // 2. Then filter by search term
    return accessibleCustomers.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm)
    );
  }, [customers, searchTerm, currentUser]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  const customerInstallation = useMemo(() => 
    installations.find(i => i.customerId === selectedCustomerId), 
  [installations, selectedCustomerId]);

  // Derive Contract Info
  const acceptedOffer = useMemo(() => 
     selectedCustomer?.offers?.find(o => o.status === 'ACCEPTED'),
  [selectedCustomer]);

  const contractType = useMemo(() => {
     if (!acceptedOffer) return 'Brak aktywnej umowy';
     
     // FIX: Check for both HEATING (new) and HEAT_PUMP (legacy)
     if (acceptedOffer.type === 'HEATING' || (acceptedOffer.type as any) === 'HEAT_PUMP') {
        return 'System Grzewczy';
     }
     
     if (acceptedOffer.type === 'ME') {
        return 'Magazyn Energii';
     }
     
     // PV Check - Only check calculatorState if it's a PV offer or undefined type (legacy)
     if (acceptedOffer.type === 'PV_STORAGE') return 'Fotowoltaika + Magazyn (PVME)';
     if (acceptedOffer.type === 'PV') return 'Fotowoltaika (PV)';

     // Legacy fallback based on calculator state
     if (acceptedOffer.calculatorState && 'storageId' in acceptedOffer.calculatorState) {
        const state = acceptedOffer.calculatorState as CalculatorState;
        if (state.storageId) return 'Fotowoltaika + Magazyn (PVME)';
        return 'Fotowoltaika (PV)';
     }
     
     return 'Fotowoltaika (PV)';
  }, [acceptedOffer]);

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

  const handleAddPaymentSubmit = () => {
     if (!customerInstallation || !newPaymentAmount) return;
     
     const amount = parseFloat(newPaymentAmount);
     if (isNaN(amount) || amount <= 0) {
        onShowNotification('Podaj poprawną kwotę', 'error');
        return;
     }

     const attachBase64 = financeMode === 'CLIENT' ? paymentAttachment : commissionAttachment;
     
     // Determine extension
     let fileName = 'Potwierdzenie.jpg';
     let fileType = 'image/jpeg';
     if (attachBase64) {
        if (attachBase64.startsWith('data:application/pdf')) {
           fileName = 'Potwierdzenie.pdf';
           fileType = 'application/pdf';
        }
     }

     // Combine Date and Time for correct sorting
     const now = new Date();
     const timePart = now.toTimeString().split(' ')[0]; // HH:MM:SS
     const fullDateTime = `${newPaymentDate}T${timePart}`;

     const payment: PaymentEntry = {
        id: Date.now().toString(),
        date: fullDateTime,
        amount: amount,
        recordedBy: currentUser.name,
        comment: newPaymentDesc,
        // Attach file if exists
        attachments: attachBase64 ? [{
           id: Date.now().toString(),
           name: fileName, 
           type: fileType,
           dateUploaded: new Date().toISOString(),
           url: attachBase64
        }] : []
     };

     if (financeMode === 'CLIENT') {
        onAddPayment(customerInstallation.id, payment);
        setPaymentAttachment(null);
     } else {
        onAddCommissionPayout(customerInstallation.id, payment);
        setCommissionAttachment(null);
     }

     setNewPaymentAmount('');
     setNewPaymentDesc('');
     onShowNotification(financeMode === 'CLIENT' ? 'Wpłata klienta dodana' : 'Wypłata prowizji dodana', 'success');
  };

  // Improved File Processor
  const handleProcessFile = (file: File): Promise<{ url: string, type: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const result = event.target?.result as string;
        
        if (file.type === 'application/pdf') {
           resolve({ url: result, type: 'application/pdf' });
        } else {
           const img = new Image();
           img.src = result;
           img.onload = () => {
             const canvas = document.createElement('canvas');
             const MAX_WIDTH = 1600; 
             let width = img.width;
             let height = img.height;
     
             if (width > MAX_WIDTH) {
               height *= MAX_WIDTH / width;
               width = MAX_WIDTH;
             }
     
             canvas.width = width;
             canvas.height = height;
             const ctx = canvas.getContext('2d');
             ctx?.drawImage(img, 0, 0, width, height);
             resolve({ url: canvas.toDataURL('image/jpeg', 0.85), type: 'image/jpeg' }); 
           };
           img.onerror = (error) => reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleAuditPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editForm && activeAuditStepId) {
      try {
        const file = e.target.files[0];
        const processed = await handleProcessFile(file);
        
        const step = AUDIT_STEPS.find(s => s.id === activeAuditStepId);

        const newPhoto: UploadedFile = {
           id: Date.now().toString(),
           name: `${step?.label.split('.')[0] || 'Krok'} - ${file.name}`,
           type: processed.type,
           dateUploaded: new Date().toISOString(),
           url: processed.url,
           category: activeAuditStepId.toString() // Use Step ID as Category
        };

        const updatedCustomer = {
           ...editForm,
           auditPhotos: [...(editForm.auditPhotos || []), newPhoto]
        };
        setEditForm(updatedCustomer);
        await onUpdateCustomer(updatedCustomer);
        onShowNotification('Plik dodany do audytu', 'success');
      } catch (err) {
        onShowNotification('Błąd przetwarzania pliku', 'error');
      }
    }
  };

  // --- NEW: General File Upload Handler ---
  const handleGenericFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editForm) {
      try {
        const file = e.target.files[0];
        const processed = await handleProcessFile(file);
        
        const newFile: UploadedFile = {
           id: Date.now().toString(),
           name: file.name,
           type: processed.type,
           dateUploaded: new Date().toISOString(),
           url: processed.url,
           description: ''
        };

        const updatedCustomer = {
           ...editForm,
           files: [...(editForm.files || []), newFile]
        };
        setEditForm(updatedCustomer);
        await onUpdateCustomer(updatedCustomer);
        onShowNotification('Plik dodany', 'success');
      } catch (err) {
        onShowNotification('Błąd przetwarzania pliku', 'error');
      }
    }
  };

  const handleUpdateAuditFileNote = async (fileId: string, note: string) => {
     if (!editForm) return;
     
     const updatedFiles = editForm.auditPhotos?.map(f => {
        if (f.id === fileId) {
           return { ...f, description: note };
        }
        return f;
     });
     
     const updatedCustomer = { ...editForm, auditPhotos: updatedFiles };
     setEditForm(updatedCustomer);
  };

  // --- NEW: Update Note for General Files ---
  const handleUpdateGenericFileNote = async (fileId: string, note: string) => {
     if (!editForm) return;
     
     const updatedFiles = editForm.files?.map(f => {
        if (f.id === fileId) {
           return { ...f, description: note };
        }
        return f;
     });
     
     const updatedCustomer = { ...editForm, files: updatedFiles };
     setEditForm(updatedCustomer);
  };

  const saveAuditChanges = async () => {
     if (editForm) {
        await onUpdateCustomer(editForm);
        onShowNotification('Zapisano zmiany w audycie', 'success');
     }
  };

  // --- NEW: Save Changes for General Files ---
  const saveGenericFileChanges = async () => {
     if (editForm) {
        await onUpdateCustomer(editForm);
        onShowNotification('Zapisano zmiany w plikach', 'success');
     }
  };

  const handlePaymentAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     if (e.target.files && e.target.files[0]) {
        try {
           const processed = await handleProcessFile(e.target.files[0]);
           if (financeMode === 'CLIENT') {
              setPaymentAttachment(processed.url);
           } else {
              setCommissionAttachment(processed.url);
           }
           onShowNotification('Załącznik dodany (Gotowy do zapisu)', 'success');
        } catch (e) {
           onShowNotification('Błąd dodawania załącznika', 'error');
        }
     }
  };

  const handleDownloadFile = (file: UploadedFile) => {
     if (!file.url) return;
     const link = document.createElement('a');
     link.href = file.url;
     link.download = file.name || 'download';
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
  };

  // --- DELETE LOGIC (CUSTOM MODAL) ---
  const handleInitiateDelete = (e: React.MouseEvent, photo: UploadedFile) => {
     e.preventDefault();
     e.stopPropagation();
     setPhotoToDelete(photo);
  };

  const confirmDeletePhoto = async () => {
     if (!editForm || !photoToDelete) return;
     
     const photoId = photoToDelete.id;
     setDeletingFileId(photoId);
     setPhotoToDelete(null); // Close modal

     // 1. Calculate new state based on ACTIVE TAB
     let updatedCustomer = { ...editForm };

     if (activeTab === 'audit') {
        const currentPhotos = editForm.auditPhotos || [];
        const updatedPhotos = currentPhotos.filter(p => String(p.id) !== String(photoId));
        updatedCustomer.auditPhotos = updatedPhotos;
     } else if (activeTab === 'files') {
        const currentFiles = editForm.files || [];
        const updatedFiles = currentFiles.filter(p => String(p.id) !== String(photoId));
        updatedCustomer.files = updatedFiles;
     } else {
        // Fallback safety (should not happen given buttons are only in these tabs)
        setDeletingFileId(null);
        return;
     }

     // 2. Update Local State Immediately
     setEditForm(updatedCustomer);

     // 3. Update Database
     try {
        await onUpdateCustomer(updatedCustomer);
        onShowNotification('Plik usunięty', 'info');
     } catch (err: any) {
        console.error("Delete failed", err);
        onShowNotification('Błąd zapisu w bazie danych', 'error');
     } finally {
        setDeletingFileId(null);
     }
  };

  // --- ADVANCED IMAGE ZOOM HANDLERS ---
  const handleOpenZoom = (url: string) => {
     setZoomedImage(url);
     setZoomScale(1);
     setZoomPosition({ x: 0, y: 0 });
  };

  const handleCloseZoom = () => {
     setZoomedImage(null);
     setZoomScale(1);
     setZoomPosition({ x: 0, y: 0 });
  };

  const handleZoomIn = (e?: React.MouseEvent) => {
     e?.stopPropagation();
     setZoomScale(prev => Math.min(prev + 0.5, 5));
  };

  const handleZoomOut = (e?: React.MouseEvent) => {
     e?.stopPropagation();
     setZoomScale(prev => Math.max(prev - 0.5, 1));
     if (zoomScale <= 1.5) setZoomPosition({ x: 0, y: 0 }); // Reset pos if zooming out fully
  };

  const handleMouseDown = (e: React.MouseEvent) => {
     if (zoomScale > 1) {
        setIsDragging(true);
        setDragStart({ x: e.clientX - zoomPosition.x, y: e.clientY - zoomPosition.y });
     }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
     if (isDragging && zoomScale > 1) {
        e.preventDefault();
        setZoomPosition({
           x: e.clientX - dragStart.x,
           y: e.clientY - dragStart.y
        });
     }
  };

  const handleMouseUp = () => {
     setIsDragging(false);
  };

  const handleDownloadZoomed = () => {
     if (zoomedImage) {
        const link = document.createElement('a');
        link.href = zoomedImage;
        link.download = 'zdjecie-audyt.jpg';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
     }
  };

  // Helper for installation fields saving feedback
  const handleUpdateInstallationField = async (inst: Installation, field: keyof Installation, value: any, label: string) => {
     await onUpdateInstallation({ ...inst, [field]: value });
     setSaveSuccessField(label);
     setTimeout(() => setSaveSuccessField(null), 3000);
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

  const installers = users.filter(u => u.role === UserRole.INSTALLER);

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
                        { id: 'finances', label: 'Finanse', icon: DollarSign },
                        { id: 'audit', label: 'Audyt', icon: ClipboardCheck },
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
                        {/* ... (Existing details code) ... */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl flex items-center shadow-sm">
                              <div className="bg-indigo-100 p-3 rounded-full mr-4 text-indigo-600">
                                 <Briefcase className="w-6 h-6" />
                              </div>
                              <div>
                                 <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Opiekun Handlowy</p>
                                 <p className="text-lg font-bold text-indigo-900">{getRepName(editForm.repId)}</p>
                              </div>
                           </div>
                           
                           <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center shadow-sm">
                              <div className="bg-emerald-100 p-3 rounded-full mr-4 text-emerald-600">
                                 <FileCheck className="w-6 h-6" />
                              </div>
                              <div>
                                 <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Typ Umowy</p>
                                 <p className="text-lg font-bold text-emerald-900">{contractType}</p>
                                 {acceptedOffer && (
                                    <div className="flex items-center text-xs text-emerald-600 mt-1 font-medium">
                                       <CheckCircle className="w-3 h-3 mr-1" />
                                       Zaakceptowano: {new Date(acceptedOffer.dateCreated).toLocaleDateString()}
                                    </div>
                                 )}
                              </div>
                           </div>

                           <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl flex items-center shadow-sm">
                              <div className="bg-amber-100 p-3 rounded-full mr-4 text-amber-600">
                                 <Wrench className="w-6 h-6" />
                              </div>
                              <div>
                                 <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Etap Realizacji</p>
                                 <p className="text-lg font-bold text-amber-900">
                                    {customerInstallation ? customerInstallation.status : 'Brak'}
                                 </p>
                              </div>
                           </div>
                        </div>

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
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center">
                                    Opiekun Handlowy (Zmiana)
                                    {!hasFullAccess && <Lock className="w-3 h-3 ml-1 text-slate-400" />}
                                 </label>
                                 <select 
                                   value={editForm.repId || ''} 
                                   onChange={e => setEditForm({...editForm, repId: e.target.value})}
                                   disabled={!hasFullAccess}
                                   className="w-full p-3 border border-slate-200 rounded-xl bg-white disabled:opacity-50 disabled:cursor-not-allowed"
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

                  {/* ... OFFERS TAB ... */}
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

                  {/* ... INSTALLATIONS TAB ... */}
                  {activeTab === 'installations' && (
                     <div className="max-w-4xl space-y-6 animate-fade-in">
                        {/* ... (Existing installation code) ... */}
                        {customerInstallation ? (
                           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
                              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-slate-100">
                                 <div>
                                    <h3 className="text-xl font-bold text-slate-800 flex items-center">
                                       <Wrench className="w-5 h-5 mr-2 text-amber-500" /> Instalacja #{customerInstallation.id.slice(0,6)}
                                    </h3>
                                 </div>
                                 <div className="text-right">
                                    <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200 uppercase tracking-wide">
                                       {contractType}
                                    </span>
                                 </div>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 {/* Technical Specs - Enhanced from Offer */}
                                 <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 shadow-sm">
                                    <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center">
                                       <Info className="w-4 h-4 mr-2 text-blue-500" /> Specyfikacja Sprzętowa (Oferta)
                                    </h4>
                                    
                                    {contractType.includes('Fotowoltaika') ? (
                                       <div className="space-y-3 text-sm">
                                          {/* Core Components */}
                                          <div className="bg-white p-3 rounded-lg border border-slate-200 mb-3">
                                             <div className="flex justify-between border-b border-slate-100 pb-2 mb-2"><span className="text-slate-500">Moc Instalacji PV:</span> <span className="font-bold text-amber-600">{customerInstallation.systemSizeKw} kWp</span></div>
                                             
                                             {acceptedOffer && acceptedOffer.calculatorState && 'connectionPower' in acceptedOffer.calculatorState && (
                                                <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                                                   <span className="text-slate-500">Moc Przyłączeniowa:</span>
                                                   <span className="font-bold text-slate-800">{(acceptedOffer.calculatorState as CalculatorState).connectionPower} kW</span>
                                                </div>
                                             )}

                                             {/* Panels + Count */}
                                             <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                                                <span className="text-slate-500">Panele:</span> 
                                                <div className="text-right w-1/2">
                                                   <span className="font-medium text-slate-800 block">{customerInstallation.panelModel || '-'}</span>
                                                   {acceptedOffer && acceptedOffer.calculatorState && (
                                                      <span className="text-xs text-slate-500 font-bold">
                                                         {(acceptedOffer.calculatorState as CalculatorState).panelCount} szt.
                                                      </span>
                                                   )}
                                                </div>
                                             </div>

                                             <div className="flex justify-between"><span className="text-slate-500">Falownik:</span> <span className="font-medium text-slate-800 text-right w-1/2">{customerInstallation.inverterModel || '-'}</span></div>
                                          </div>

                                          {/* Calculator Specifics (if available via acceptedOffer) */}
                                          {acceptedOffer && acceptedOffer.calculatorState && (
                                             <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2">
                                                {/* Type casting for safety */}
                                                {(() => {
                                                   const state = acceptedOffer.calculatorState as CalculatorState;
                                                   return (
                                                      <>
                                                         <div className="flex justify-between"><span className="text-slate-500">Orientacja Paneli:</span> <span className="font-bold text-slate-800">{state.orientation === 'SOUTH' ? 'Południe' : 'Wschód-Zachód'}</span></div>
                                                         
                                                         {state.installationType === 'ROOF' ? (
                                                            <>
                                                               <div className="flex justify-between"><span className="text-slate-500">Rodzaj Dachu:</span> <span className="font-medium">{state.roofSlope === 'FLAT' ? 'Płaski' : 'Skośny'}</span></div>
                                                               <div className="flex justify-between"><span className="text-slate-500">Pokrycie:</span> <span className="font-medium">{state.roofMaterial}</span></div>
                                                            </>
                                                         ) : (
                                                            <div className="flex justify-between"><span className="text-slate-500">Dł. Przekopu:</span> <span className="font-medium">{state.trenchLength} mb</span></div>
                                                         )}

                                                         {(state.hasEMS || state.hasUPS) && (
                                                            <div className="mt-2 pt-2 border-t border-slate-100 flex gap-2">
                                                               {state.hasEMS && <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded font-bold flex items-center"><Cpu className="w-3 h-3 mr-1"/> EMS</span>}
                                                               {state.hasUPS && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-1 rounded font-bold flex items-center"><Battery className="w-3 h-3 mr-1"/> UPS</span>}
                                                            </div>
                                                         )}
                                                      </>
                                                   );
                                                })()}
                                             </div>
                                          )}

                                          {contractType.includes('ME') && (
                                             <div className="flex justify-between bg-green-50 p-3 rounded-lg border border-green-200">
                                                <span className="text-green-700 font-bold flex items-center"><Battery className="w-4 h-4 mr-2"/> Magazyn Energii:</span> 
                                                <div className="text-right">
                                                   <span className="font-bold text-green-900 block">{customerInstallation.storageModel || 'Tak'} ({customerInstallation.storageSizeKw || 0} kWh)</span>
                                                   {acceptedOffer && acceptedOffer.calculatorState && (
                                                      <span className="text-xs text-green-600 font-bold">
                                                         {(acceptedOffer.calculatorState as CalculatorState).storageCount} szt.
                                                      </span>
                                                   )}
                                                </div>
                                             </div>
                                          )}
                                       </div>
                                    ) : contractType.includes('Magazyn') || (acceptedOffer?.type === 'ME') ? (
                                       <div className="space-y-3 text-sm">
                                          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                             <div className="flex justify-between border-b border-green-200 pb-2 mb-2">
                                                <span className="text-slate-500 font-medium">Magazyn Energii:</span>
                                                <span className="font-bold text-green-800">{customerInstallation.storageModel}</span>
                                             </div>
                                             <div className="flex justify-between border-b border-green-200 pb-2 mb-2">
                                                <span className="text-slate-500 font-medium">Pojemność:</span>
                                                <span className="font-bold text-green-800">{customerInstallation.storageSizeKw} kWh</span>
                                             </div>
                                             {acceptedOffer && acceptedOffer.calculatorState && (
                                                <div className="flex justify-between">
                                                   <span className="text-slate-500 font-medium">Liczba modułów:</span>
                                                   <span className="font-bold text-green-800">{(acceptedOffer.calculatorState as StorageCalculatorState).storageCount} szt.</span>
                                                </div>
                                             )}
                                          </div>

                                          <div className="bg-white p-3 rounded-lg border border-slate-200">
                                             {acceptedOffer && acceptedOffer.calculatorState && (
                                                <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                                                   <span className="text-slate-500">Istniejąca Moc PV:</span>
                                                   <span className="font-bold text-slate-800">{(acceptedOffer.calculatorState as StorageCalculatorState).existingPvPower} kWp</span>
                                                </div>
                                             )}
                                             <div className="flex justify-between border-b border-slate-100 pb-2 mb-2">
                                                <span className="text-slate-500">Falownik (Retrofit):</span>
                                                <span className="font-medium text-slate-800">
                                                   {customerInstallation.inverterModel || (() => {
                                                      const s = acceptedOffer?.calculatorState as StorageCalculatorState;
                                                      if (s?.additionalInverterId) {
                                                          const inv = inventory.find(x => x.id === s.additionalInverterId);
                                                          return inv ? inv.name : 'Wybrano (ID nieznane)';
                                                      }
                                                      return 'Brak (Tylko magazyn)';
                                                   })()}
                                                </span>
                                             </div>
                                             <div className="flex justify-between">
                                                <span className="text-slate-500">Długość Przekopu:</span>
                                                <span className="font-bold text-slate-800">{customerInstallation.trenchLength || (acceptedOffer?.calculatorState as any)?.trenchLength || 0} mb</span>
                                             </div>
                                          </div>
                                       </div>
                                    ) : (
                                       // Heat Pump Layout
                                       <div className="space-y-3 text-sm">
                                          <div className="bg-orange-50 p-3 rounded-lg border border-orange-100 text-orange-800 font-medium mb-2">
                                             {customerInstallation.notes || 'Brak szczegółów urządzenia w notatkach.'}
                                          </div>
                                          
                                          {/* Enhanced Accessories List */}
                                          {acceptedOffer && acceptedOffer.type === 'HEATING' && (
                                             <div className="bg-white p-3 rounded-lg border border-slate-200 mt-2">
                                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Akcesoria i Usługi dodatkowe</p>
                                                {(() => {
                                                   const heatState = acceptedOffer.calculatorState as HeatingCalculatorState;
                                                   if (heatState.selectedAccessoryIds && heatState.selectedAccessoryIds.length > 0) {
                                                      const accessoryNames = heatState.selectedAccessoryIds.map(id => {
                                                         const item = inventory.find(inv => inv.id === id);
                                                         return item ? item.name : 'Nieznany element';
                                                      });
                                                      
                                                      return (
                                                         <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium text-xs">
                                                            {accessoryNames.map((name, idx) => (
                                                               <li key={idx}>{name}</li>
                                                            ))}
                                                         </ul>
                                                      );
                                                   }
                                                   return <p className="text-xs text-slate-400 italic">Brak dodatkowych akcesoriów</p>;
                                                })()}
                                             </div>
                                          )}
                                       </div>
                                    )}
                                 </div>
                                 
                                 <div className="flex flex-col gap-6">
                                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                       <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase flex items-center">
                                          <Calendar className="w-4 h-4 mr-2 text-blue-500" /> Harmonogram & Ekipa
                                       </h4>
                                       <div className="space-y-4">
                                          <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 relative">
                                             <label className="block text-xs font-bold text-blue-700 mb-1 uppercase flex items-center">
                                                Planowana Data
                                                {!hasFullAccess && <Lock className="w-3 h-3 ml-1 text-blue-400" />}
                                             </label>
                                             <input 
                                                type="date"
                                                value={customerInstallation.dateScheduled || ''}
                                                onChange={(e) => handleUpdateInstallationField(customerInstallation, 'dateScheduled', e.target.value, 'date')}
                                                disabled={!hasFullAccess}
                                                className={`w-full p-2 border border-blue-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-400 outline-none ${!hasFullAccess ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                             />
                                             {saveSuccessField === 'date' && (
                                                <span className="absolute top-2 right-2 text-green-600 text-xs font-bold animate-fade-in flex items-center">
                                                   <Check className="w-3 h-3 mr-1"/> Zapisano!
                                                </span>
                                             )}
                                          </div>
                                          <div className="relative">
                                             <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center">
                                                Przypisana Ekipa
                                                {!hasFullAccess && <Lock className="w-3 h-3 ml-1 text-slate-400" />}
                                             </label>
                                             <div className="relative">
                                                <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                                                <select 
                                                   value={customerInstallation.assignedTeam || ''}
                                                   onChange={(e) => handleUpdateInstallationField(customerInstallation, 'assignedTeam', e.target.value, 'team')}
                                                   disabled={!hasFullAccess}
                                                   className={`w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none appearance-none ${!hasFullAccess ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                                >
                                                   <option value="">-- Wybierz ekipę --</option>
                                                   {users.filter(u => u.role === UserRole.INSTALLER).map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                                                </select>
                                                {saveSuccessField === 'team' && (
                                                   <span className="absolute top-1/2 -translate-y-1/2 right-8 text-green-600 text-xs font-bold animate-fade-in flex items-center bg-white px-1">
                                                      <Check className="w-3 h-3 mr-1"/> Zapisano!
                                                   </span>
                                                )}
                                             </div>
                                          </div>
                                       </div>
                                    </div>
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

                  {/* TAB: FINANCES */}
                  {activeTab === 'finances' && (
                     <div className="max-w-4xl space-y-6 animate-fade-in">
                        {/* ... (Existing finances code) ... */}
                        {customerInstallation ? (
                           <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                              <div className="flex justify-between items-center mb-6">
                                 <h3 className="font-bold text-lg text-slate-800 flex items-center">
                                    <DollarSign className="w-6 h-6 mr-2 text-green-600" /> Finanse
                                 </h3>
                                 
                                 {/* Mode Toggle */}
                                 <div className="flex bg-slate-100 p-1 rounded-xl">
                                    <button 
                                       onClick={() => setFinanceMode('CLIENT')}
                                       className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${financeMode === 'CLIENT' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                       Rozliczenie Klienta
                                    </button>
                                    <button 
                                       onClick={() => setFinanceMode('COMMISSION')}
                                       className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${financeMode === 'COMMISSION' ? 'bg-white shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                       Wypłata Prowizji
                                    </button>
                                 </div>
                              </div>

                              {financeMode === 'CLIENT' ? (
                                 // CLIENT VIEW
                                 <div className="animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                       <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center">
                                             Wartość Umowy
                                             {!hasFullAccess && <Lock className="w-3 h-3 ml-1 text-slate-400" />}
                                          </label>
                                          <input 
                                             type="number" 
                                             value={customerInstallation.price || ''}
                                             onChange={(e) => onUpdateInstallation({ ...customerInstallation, price: parseFloat(e.target.value) })}
                                             disabled={!hasFullAccess}
                                             className="w-full bg-transparent font-bold text-2xl text-slate-800 outline-none disabled:cursor-not-allowed"
                                             placeholder="0"
                                          />
                                          <span className="text-xs text-slate-400">PLN Brutto</span>
                                       </div>
                                       <div className="p-4 rounded-xl border bg-green-50 border-green-200">
                                          <label className="block text-xs font-bold text-green-600 uppercase mb-1">Wpłacono</label>
                                          <p className="font-bold text-2xl text-green-700">{customerInstallation.paidAmount.toLocaleString()} PLN</p>
                                       </div>
                                       {/* Dynamic Payment Status: Overpayment or Due */}
                                       {(() => {
                                          const remaining = customerInstallation.price - customerInstallation.paidAmount;
                                          if (remaining < 0) {
                                             return (
                                                <div className="p-4 rounded-xl border bg-blue-50 border-blue-200">
                                                   <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Nadpłata</label>
                                                   <p className="font-bold text-2xl text-blue-700">{Math.abs(remaining).toLocaleString()} PLN</p>
                                                </div>
                                             );
                                          }
                                          return (
                                             <div className="p-4 rounded-xl border bg-red-50 border-red-200">
                                                <label className="block text-xs font-bold text-red-600 uppercase mb-1">Do Zapłaty</label>
                                                <p className="font-bold text-2xl text-red-700">{remaining.toLocaleString()} PLN</p>
                                             </div>
                                          );
                                       })()}
                                    </div>

                                    {/* Add Payment Form - Only for Admin/Office */}
                                    {hasFullAccess && (
                                       <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 mb-6">
                                          <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase">Dodaj Wpłatę Klienta</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                             <div className="md:col-span-3">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Kwota (PLN)</label>
                                                <input type="number" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="0.00" />
                                             </div>
                                             <div className="md:col-span-3">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Data</label>
                                                <input type="date" value={newPaymentDate} onChange={(e) => setNewPaymentDate(e.target.value)} className="w-full p-3 border rounded-lg" />
                                             </div>
                                             <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Opis / Tytuł</label>
                                                <input type="text" value={newPaymentDesc} onChange={(e) => setNewPaymentDesc(e.target.value)} className="w-full p-3 border rounded-lg" placeholder="np. Zaliczka, Faktura 1/2023" />
                                             </div>
                                             <div className="md:col-span-2 flex gap-2">
                                                <button 
                                                   onClick={() => paymentFileInputRef.current?.click()}
                                                   className={`p-3 rounded-lg border flex items-center justify-center transition-colors ${paymentAttachment ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-300 text-slate-500 hover:bg-slate-50'}`}
                                                   title="Dodaj załącznik (Faktura/Potwierdzenie)"
                                                >
                                                   <Paperclip className="w-5 h-5" />
                                                   <input type="file" ref={paymentFileInputRef} className="hidden" accept="image/*,.pdf" onChange={handlePaymentAttachmentUpload} />
                                                </button>
                                                <button onClick={handleAddPaymentSubmit} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold p-3 rounded-lg flex items-center justify-center">
                                                   <Plus className="w-5 h-5" />
                                                </button>
                                             </div>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              ) : (
                                 // COMMISSION VIEW
                                 <div className="animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                       <div className="p-4 rounded-xl border bg-purple-50 border-purple-200">
                                          <label className="block text-xs font-bold text-purple-600 uppercase mb-1 flex items-center">
                                             Naliczona Marża (Całość)
                                             {!hasFullAccess && <Lock className="w-3 h-3 ml-1 text-purple-400" />}
                                          </label>
                                          <input 
                                             type="number" 
                                             value={customerInstallation.commissionValue || 0}
                                             onChange={(e) => onUpdateInstallation({ ...customerInstallation, commissionValue: parseFloat(e.target.value) })}
                                             disabled={!hasFullAccess}
                                             className="w-full bg-transparent font-bold text-2xl text-purple-800 outline-none disabled:cursor-not-allowed"
                                          />
                                          <span className="text-xs text-purple-400">PLN (Do podziału)</span>
                                       </div>
                                       <div className="p-4 rounded-xl border bg-green-50 border-green-200">
                                          <label className="block text-xs font-bold text-green-600 uppercase mb-1">Wypłacono Handlowcowi</label>
                                          <p className="font-bold text-2xl text-green-700">
                                             {customerInstallation.commissionHistory?.reduce((sum, p) => sum + p.amount, 0).toLocaleString() || 0} PLN
                                          </p>
                                       </div>
                                       {/* Dynamic Commission Remaining */}
                                       {(() => {
                                          const remainingComm = (customerInstallation.commissionValue || 0) - (customerInstallation.commissionHistory?.reduce((sum, p) => sum + p.amount, 0) || 0);
                                          if (remainingComm < 0) {
                                             return (
                                                <div className="p-4 rounded-xl border bg-blue-50 border-blue-200">
                                                   <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Nadpłata Prowizji</label>
                                                   <p className="font-bold text-2xl text-blue-700">{Math.abs(remainingComm).toLocaleString()} PLN</p>
                                                </div>
                                             );
                                          }
                                          return (
                                             <div className="p-4 rounded-xl border bg-slate-50 border-slate-200">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pozostało do wypłaty</label>
                                                <p className="font-bold text-2xl text-slate-700">{remainingComm.toLocaleString()} PLN</p>
                                             </div>
                                          );
                                       })()}
                                    </div>

                                    {/* Add Commission Form - Only for Admin/Office */}
                                    {hasFullAccess && (
                                       <div className="bg-purple-50 rounded-xl p-5 border border-purple-100 mb-6">
                                          <h4 className="font-bold text-purple-800 mb-4 text-sm uppercase">Zaksięguj Wypłatę Prowizji</h4>
                                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                             <div className="md:col-span-3">
                                                <label className="block text-xs font-bold text-purple-700 mb-1">Kwota (PLN)</label>
                                                <input type="number" value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)} className="w-full p-3 border border-purple-200 rounded-lg focus:ring-purple-500" placeholder="0.00" />
                                             </div>
                                             <div className="md:col-span-3">
                                                <label className="block text-xs font-bold text-purple-700 mb-1">Data</label>
                                                <input type="date" value={newPaymentDate} onChange={(e) => setNewPaymentDate(e.target.value)} className="w-full p-3 border border-purple-200 rounded-lg focus:ring-purple-500" />
                                             </div>
                                             <div className="md:col-span-4">
                                                <label className="block text-xs font-bold text-purple-700 mb-1">Opis</label>
                                                <input type="text" value={newPaymentDesc} onChange={(e) => setNewPaymentDesc(e.target.value)} className="w-full p-3 border border-purple-200 rounded-lg focus:ring-purple-500" placeholder="np. Transza 1" />
                                             </div>
                                             <div className="md:col-span-2 flex gap-2">
                                                <button 
                                                   onClick={() => commissionFileInputRef.current?.click()}
                                                   className={`p-3 rounded-lg border border-purple-300 flex items-center justify-center transition-colors ${commissionAttachment ? 'bg-green-100 text-green-700' : 'bg-white text-purple-500 hover:bg-purple-50'}`}
                                                   title="Dodaj potwierdzenie przelewu"
                                                >
                                                   <Paperclip className="w-5 h-5" />
                                                   <input type="file" ref={commissionFileInputRef} className="hidden" accept="image/*,.pdf" onChange={handlePaymentAttachmentUpload} />
                                                </button>
                                                <button onClick={handleAddPaymentSubmit} className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold p-3 rounded-lg flex items-center justify-center">
                                                   <Plus className="w-5 h-5" />
                                                </button>
                                             </div>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              )}

                              {/* Payment History List (Generic for both modes) */}
                              <div>
                                 <h4 className="font-bold text-slate-700 mb-3 text-sm uppercase">
                                    Historia {financeMode === 'CLIENT' ? 'Wpłat Klienta' : 'Wypłat Prowizji'}
                                 </h4>
                                 <div className="space-y-2">
                                    {/* SORTING ADDED: Newest First using Full ISO String */}
                                    {((financeMode === 'CLIENT' ? customerInstallation.paymentHistory : customerInstallation.commissionHistory) || [])
                                       .slice()
                                       .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                       .map(p => {
                                          const dateObj = new Date(p.date);
                                          const isValidDate = !isNaN(dateObj.getTime());
                                          
                                          return (
                                          <div key={p.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                                             <div className="flex items-center">
                                                <span className="font-bold text-slate-700 w-24 text-right mr-4">{p.amount.toLocaleString()} PLN</span>
                                                <div className="border-l border-slate-200 pl-4">
                                                   <p className="text-slate-800 font-medium">{p.comment || 'Bez opisu'}</p>
                                                   <p className="text-xs text-slate-500">
                                                      {isValidDate ? dateObj.toLocaleDateString('pl-PL') : p.date} • {p.recordedBy}
                                                   </p>
                                                </div>
                                             </div>
                                             <div className="flex items-center gap-2">
                                                {p.attachments && p.attachments.length > 0 && (
                                                   <button 
                                                      onClick={() => handleDownloadFile(p.attachments![0])}
                                                      className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" 
                                                      title="Pobierz załącznik"
                                                   >
                                                      <Download className="w-4 h-4" />
                                                   </button>
                                                )}
                                                {hasFullAccess && (
                                                   <button 
                                                      onClick={() => financeMode === 'CLIENT' ? onRemovePayment(customerInstallation.id, p.id) : onRemoveCommissionPayout(customerInstallation.id, p.id)}
                                                      className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                                   >
                                                      <Trash2 className="w-4 h-4" />
                                                   </button>
                                                )}
                                             </div>
                                          </div>
                                          );
                                       })}
                                 </div>
                              </div>
                           </div>
                        ) : (
                           <div className="text-center p-10 bg-white rounded-2xl border border-dashed border-slate-300">
                              <DollarSign className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                              <p className="text-slate-500 font-medium">Brak danych finansowych.</p>
                              <p className="text-sm text-slate-400">Instalacja nie została jeszcze utworzona.</p>
                           </div>
                        )}
                     </div>
                  )}

                  {/* TAB: AUDIT - REDESIGNED */}
                  {activeTab === 'audit' && (
                     <div className="max-w-6xl space-y-4 animate-fade-in h-full flex flex-col">
                        
                        {/* Steps Topbar (Horizontal Pills) */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-sm">
                           <div className="flex overflow-x-auto p-3 gap-2 hide-scrollbar">
                              {AUDIT_STEPS.map(step => {
                                 const count = editForm.auditPhotos?.filter(p => p.category === step.id.toString()).length || 0;
                                 const isComplete = count > 0;
                                 const isActive = activeAuditStepId === step.id;
                                 
                                 return (
                                    <button 
                                       key={step.id}
                                       onClick={() => setActiveAuditStepId(step.id)}
                                       className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center border ${
                                          isActive 
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                                            : isComplete 
                                              ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                                       }`}
                                    >
                                       {step.label}
                                       {isComplete && <CheckCircle className={`w-3 h-3 ml-2 ${isActive ? 'text-white' : 'text-green-500'}`} />}
                                    </button>
                                 )
                              })}
                           </div>
                        </div>

                        {/* Photos Area */}
                        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
                           <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                              <h4 className="font-bold text-slate-800 text-lg">
                                 {AUDIT_STEPS.find(s => s.id === activeAuditStepId)?.label}
                              </h4>
                              <button 
                                 onClick={() => auditFileInputRef.current?.click()}
                                 className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center transition-colors shadow-sm"
                              >
                                 <Camera className="w-4 h-4 mr-2" /> Dodaj Zdjęcie
                                 <input type="file" ref={auditFileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleAuditPhotoUpload} />
                              </button>
                           </div>
                           
                           <div className="p-6 flex-1 overflow-y-auto bg-slate-100/50">
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                 {editForm.auditPhotos?.filter(p => p.category === activeAuditStepId?.toString()).map(photo => (
                                    <div key={photo.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm group relative flex flex-col transition-transform hover:scale-[1.01]">
                                       <div 
                                          className="aspect-square bg-slate-100 rounded-lg overflow-hidden mb-3 relative cursor-pointer border border-slate-100" 
                                          onClick={() => handleOpenZoom(photo.url || '')}
                                       >
                                          {photo.type === 'application/pdf' ? (
                                             <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-2">
                                                <FileText className="w-12 h-12" />
                                                <span className="text-xs font-bold uppercase">Dokument PDF</span>
                                             </div>
                                          ) : (
                                             <img src={photo.url} alt="audit" className="w-full h-full object-cover" />
                                          )}
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                             <ZoomIn className="w-10 h-10 text-white drop-shadow-md" />
                                          </div>
                                       </div>
                                       
                                       <input 
                                          type="text" 
                                          placeholder="Dodaj opis..."
                                          defaultValue={photo.description || ''}
                                          onBlur={(e) => handleUpdateAuditFileNote(photo.id, e.target.value)}
                                          className="w-full text-xs font-medium p-2 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-slate-50 outline-none transition-all text-slate-600"
                                       />
                                       
                                       <button 
                                          onClick={(e) => handleInitiateDelete(e, photo)}
                                          className="absolute top-4 right-4 bg-white/90 text-red-500 p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-50 hover:text-red-600"
                                          title="Usuń zdjęcie"
                                       >
                                          <Trash2 className="w-4 h-4" />
                                       </button>
                                    </div>
                                 ))}
                                 
                                 {(!editForm.auditPhotos?.filter(p => p.category === activeAuditStepId?.toString()).length) && (
                                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400">
                                       <div className="bg-slate-100 p-6 rounded-full mb-4">
                                          <ImageIcon className="w-12 h-12 opacity-30" />
                                       </div>
                                       <p className="font-bold text-slate-500">Brak materiałów w tym kroku</p>
                                       <p className="text-sm mt-1">Kliknij "Dodaj Zdjęcie" aby uzupełnić dokumentację.</p>
                                    </div>
                                 )}
                              </div>
                           </div>
                           <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                              <button onClick={saveAuditChanges} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors shadow-sm flex items-center">
                                 <Save className="w-4 h-4 mr-2" /> Zapisz zmiany w opisach
                              </button>
                           </div>
                        </div>
                     </div>
                  )}

                  {/* TAB: NOTES */}
                  {activeTab === 'notes' && (
                     <div className="max-w-4xl space-y-6 animate-fade-in">
                        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                           <div className="flex gap-2">
                              <textarea 
                                 value={newNoteContent}
                                 onChange={(e) => setNewNoteContent(e.target.value)}
                                 placeholder="Wpisz nową notatkę..."
                                 className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
                              />
                              <button 
                                 onClick={handleAddNote}
                                 disabled={!newNoteContent.trim()}
                                 className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 rounded-xl font-bold transition-colors"
                              >
                                 <Send className="w-5 h-5" />
                              </button>
                           </div>
                        </div>

                        <div className="space-y-4">
                           {editForm.notesHistory?.map((note, index) => (
                              <div key={note.id || index} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                 <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                       <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${getRoleConfig(note.authorRole).iconColor}`}>
                                          {note.authorName.charAt(0)}
                                       </div>
                                       <div>
                                          <p className="text-sm font-bold text-slate-800">{note.authorName}</p>
                                          <p className="text-xs text-slate-500 uppercase">{getRoleConfig(note.authorRole).label}</p>
                                       </div>
                                    </div>
                                    <span className="text-xs text-slate-400">
                                       {new Date(note.date).toLocaleString()}
                                    </span>
                                 </div>
                                 <p className="text-slate-600 text-sm whitespace-pre-wrap pl-10">
                                    {note.content}
                                 </p>
                              </div>
                           ))}
                           {(!editForm.notesHistory || editForm.notesHistory.length === 0) && (
                              <div className="text-center p-10">
                                 <p className="text-slate-400">Brak historii notatek.</p>
                              </div>
                           )}
                        </div>
                     </div>
                  )}

                  {/* TAB: FILES */}
                  {activeTab === 'files' && (
                     <div className="max-w-6xl space-y-6 animate-fade-in">
                        <div className="flex justify-between items-center">
                           <h3 className="text-lg font-bold text-slate-800">Pliki Klienta</h3>
                           <button 
                              onClick={() => genericFileInputRef.current?.click()}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-sm"
                           >
                              <FilePlus className="w-4 h-4 mr-2" /> Dodaj Plik
                              <input type="file" ref={genericFileInputRef} className="hidden" onChange={handleGenericFileUpload} />
                           </button>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[300px]">
                           {editForm.files && editForm.files.length > 0 ? (
                              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                 {editForm.files.map(file => (
                                    <div key={file.id} className="group relative bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col hover:shadow-md transition-all">
                                       <div className="aspect-[4/3] bg-white rounded-lg mb-2 overflow-hidden flex items-center justify-center border border-slate-100 cursor-pointer" onClick={() => file.type.startsWith('image') ? handleOpenZoom(file.url || '') : handleDownloadFile(file)}>
                                          {file.type.startsWith('image') ? (
                                             <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                          ) : (
                                             <FileText className="w-12 h-12 text-slate-400" />
                                          )}
                                       </div>
                                       <p className="text-xs font-bold text-slate-700 truncate mb-1" title={file.name}>{file.name}</p>
                                       <input 
                                          type="text" 
                                          placeholder="Dodaj opis..."
                                          defaultValue={file.description || ''}
                                          onBlur={(e) => handleUpdateGenericFileNote(file.id, e.target.value)}
                                          className="text-[10px] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 outline-none text-slate-500 w-full"
                                       />
                                       <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                          <button onClick={() => handleDownloadFile(file)} className="bg-white p-1.5 rounded-lg shadow text-blue-600 hover:text-blue-700"><Download className="w-3 h-3"/></button>
                                          <button onClick={(e) => handleInitiateDelete(e, file)} className="bg-white p-1.5 rounded-lg shadow text-red-500 hover:text-red-600"><Trash2 className="w-3 h-3"/></button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                                 <FileText className="w-16 h-16 mb-4 opacity-20" />
                                 <p>Brak plików w tej sekcji.</p>
                              </div>
                           )}
                           
                           {editForm.files && editForm.files.length > 0 && (
                              <div className="mt-6 flex justify-end">
                                 <button onClick={saveGenericFileChanges} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition-colors shadow-sm flex items-center">
                                    <Save className="w-4 h-4 mr-2" /> Zapisz opisy plików
                                 </button>
                              </div>
                           )}
                        </div>
                     </div>
                  )}
               </div>
            </>
         ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8">
               <div className="bg-white p-8 rounded-full shadow-sm mb-4">
                  <UserIcon className="w-16 h-16 text-slate-200" />
               </div>
               <h3 className="text-xl font-bold text-slate-700 mb-2">Wybierz klienta</h3>
               <p className="text-sm max-w-xs text-center">Wybierz klienta z listy po lewej stronie, aby zobaczyć szczegóły, oferty i historię.</p>
            </div>
         )}
      </div>

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-lg text-slate-800">Nowy Klient</h3>
                 <button onClick={() => setShowAddModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600" /></button>
              </div>
              <form onSubmit={handleAddSubmit} className="p-6 space-y-4">
                 <input type="text" placeholder="Imię i Nazwisko" required className="w-full p-3 border rounded-xl" value={newCustomerData.name} onChange={e => setNewCustomerData({...newCustomerData, name: e.target.value})} />
                 <input type="email" placeholder="Email" className="w-full p-3 border rounded-xl" value={newCustomerData.email} onChange={e => setNewCustomerData({...newCustomerData, email: e.target.value})} />
                 <input type="text" placeholder="Telefon" className="w-full p-3 border rounded-xl" value={newCustomerData.phone} onChange={e => setNewCustomerData({...newCustomerData, phone: e.target.value})} />
                 <input type="text" placeholder="Adres" className="w-full p-3 border rounded-xl" value={newCustomerData.address} onChange={e => setNewCustomerData({...newCustomerData, address: e.target.value})} />
                 <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700">Dodaj Klienta</button>
              </form>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {photoToDelete && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-shake">
               <div className="text-center">
                  <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Trash2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-bold text-lg text-slate-800 mb-2">Usunąć plik?</h3>
                  <p className="text-sm text-slate-500 mb-6">Tej operacji nie można cofnąć.</p>
                  <div className="flex gap-3">
                     <button onClick={() => setPhotoToDelete(null)} className="flex-1 py-2.5 rounded-xl border font-bold text-slate-600 hover:bg-slate-50">Anuluj</button>
                     <button onClick={confirmDeletePhoto} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-200">Usuń</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* ADVANCED IMAGE VIEWER MODAL */}
      {zoomedImage && (
         <div 
            className="fixed inset-0 z-[100] bg-black/95 flex flex-col overflow-hidden"
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
         >
            {/* Header */}
            <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/60 to-transparent">
               <span className="text-white/80 font-mono text-xs">Użyj myszki do przesuwania</span>
               <button 
                  onClick={handleCloseZoom} 
                  className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors backdrop-blur-md"
               >
                  <X className="w-6 h-6" />
               </button>
            </div>

            {/* Canvas Area */}
            <div 
               className={`flex-1 relative flex items-center justify-center overflow-hidden cursor-${isDragging ? 'grabbing' : zoomScale > 1 ? 'grab' : 'default'}`}
               onMouseDown={handleMouseDown}
               onWheel={(e) => {
                  if (e.deltaY < 0) handleZoomIn();
                  else handleZoomOut();
               }}
            >
               <img 
                  src={zoomedImage} 
                  className="max-w-full max-h-full object-contain transition-transform duration-100 ease-linear select-none" 
                  style={{ 
                     transform: `translate(${zoomPosition.x}px, ${zoomPosition.y}px) scale(${zoomScale})`,
                     cursor: isDragging ? 'grabbing' : zoomScale > 1 ? 'grab' : 'default'
                  }}
                  draggable={false}
               />
            </div>

            {/* Bottom Toolbar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-xl border border-white/10 p-2 rounded-2xl flex items-center space-x-2 z-20 shadow-2xl">
               <button onClick={handleZoomOut} className="p-3 hover:bg-white/10 rounded-xl text-white transition-colors">
                  <Minus className="w-5 h-5" />
               </button>
               
               <span className="text-white font-mono font-bold w-12 text-center text-sm">{Math.round(zoomScale * 100)}%</span>
               
               <button onClick={handleZoomIn} className="p-3 hover:bg-white/10 rounded-xl text-white transition-colors">
                  <Plus className="w-5 h-5" />
               </button>

               <div className="w-px h-6 bg-white/20 mx-2"></div>

               <button 
                  onClick={handleCloseZoom} 
                  className="p-3 hover:bg-white/10 rounded-xl text-white transition-colors"
                  title="Resetuj widok"
               >
                  <Maximize className="w-5 h-5" />
               </button>

               <button 
                  onClick={handleDownloadZoomed} 
                  className="p-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white transition-colors shadow-lg ml-2"
                  title="Pobierz"
               >
                  <Download className="w-5 h-5" />
               </button>
            </div>
         </div>
      )}
    </div>
  );
};
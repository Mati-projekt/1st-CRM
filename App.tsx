
import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Installations } from './components/Installations';
import { Inventory } from './components/Inventory';
import { Applications } from './components/Applications';
import { SalesRoom } from './components/SalesRoom';
import { Login } from './components/Login';
import { Notification, NotificationType } from './components/Notification';
import { Customer, Installation, InventoryItem, ViewState, Offer, CalculatorState, InstallationStatus, UserRole, PaymentEntry, Task, Message, SalesSettings, ProductCategory, User } from './types';
import { supabase } from './services/supabaseClient';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  // Mobile Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Data State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Edit Offer State
  const [offerToEdit, setOfferToEdit] = useState<CalculatorState | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  const showNotification = (message: string, type: NotificationType = 'success') => {
    setNotification({ message, type });
  };

  // --- INITIAL DATA FETCH ---
  const fetchData = async () => {
    if (!currentUser) return;
    // Don't set loading true here to avoid UI flicker on refresh, just background update
    try {
      // Fetch Inventory
      const { data: invData } = await supabase.from('inventory').select('*');
      if (invData) setInventory(invData as InventoryItem[]);

      // Fetch Customers
      const { data: custData } = await supabase.from('customers').select('*');
      if (custData) setCustomers(custData as Customer[]);

      // Fetch Installations
      const { data: instData } = await supabase.from('installations').select('*');
      if (instData) setInstallations(instData as Installation[]);

      // Fetch Tasks
      const { data: taskData } = await supabase.from('tasks').select('*');
      if (taskData) setTasks(taskData as Task[]);

      // Fetch Messages
      const { data: msgData } = await supabase.from('messages').select('*');
      if (msgData) setMessages(msgData as Message[]);

    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification("Błąd pobierania danych z bazy", 'error');
    }
  };

  // --- AUTH LISTENER & TIMEOUT ---
  useEffect(() => {
    let mounted = true;

    // Safety timeout: If Supabase takes too long (e.g. mobile network issues), stop loading
    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Session check timed out, forcing login screen.");
        setLoading(false);
      }
    }, 5000); // 5 seconds timeout

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          // Fetch extended profile data
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
          if (profile) {
            setCurrentUser(profile as User);
          } else {
             setCurrentUser({
               id: session.user.id,
               name: session.user.user_metadata?.name || session.user.email || 'User',
               email: session.user.email || '',
               role: UserRole.SALES
             });
          }
        } else if (mounted) {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error("Session check failed", e);
      } finally {
        if (mounted) setLoading(false);
        clearTimeout(safetyTimeout);
      }
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user && mounted) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        if (profile) {
          setCurrentUser(profile as User);
        }
      } else if (mounted) {
        setCurrentUser(null);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch data when user logs in
  useEffect(() => {
    if (currentUser) {
      fetchData();
      if (currentUser.role === UserRole.SALES) setCurrentView('SALES_ROOM');
      else if (currentUser.role === UserRole.INSTALLER) setCurrentView('INSTALLATIONS');
      else setCurrentView('DASHBOARD');
    }
  }, [currentUser]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSelectedCustomerId(null);
    setOfferToEdit(null);
    setCustomers([]);
    setInstallations([]);
    setInventory([]);
    setIsSidebarOpen(false);
  };

  // --- FILTERING LOGIC ---
  const filteredCustomers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SALES) {
      return customers.filter(c => c.repId === currentUser.id);
    }
    return customers;
  }, [customers, currentUser]);

  const filteredInstallations = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SALES) {
      const myCustomerIds = customers.filter(c => c.repId === currentUser.id).map(c => c.id);
      return installations.filter(i => myCustomerIds.includes(i.customerId));
    }
    if (currentUser.role === UserRole.INSTALLER) {
      return installations.filter(i => i.assignedTeam === currentUser.id);
    }
    return installations;
  }, [installations, customers, currentUser]);

  // --- HANDLERS (CRUD Operations) ---

  const handleUpdateInventoryItem = async (updatedItem: InventoryItem) => {
    const { error } = await supabase.from('inventory').update(updatedItem).eq('id', updatedItem.id);
    if (!error) {
      setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
      showNotification(`Zaktualizowano produkt: ${updatedItem.name}`);
    } else {
      showNotification("Błąd aktualizacji magazynu", 'error');
    }
  };

  const handleAddItem = async (newItem: InventoryItem) => {
    const { id, ...itemData } = newItem; 
    const { data, error } = await supabase.from('inventory').insert([itemData]).select().single();
    
    if (data && !error) {
      setInventory(prev => [...prev, data as InventoryItem]);
      showNotification(`Dodano nowy produkt: ${data.name}`);
    } else {
      showNotification("Błąd dodawania produktu", 'error');
    }
  };

  const handleAddCustomer = async (newCustomerData: { name: string, email: string, phone: string, address: string }) => {
    if (!currentUser) return;
    
    const { data: newCust, error } = await supabase.from('customers').insert([{
      name: newCustomerData.name,
      email: newCustomerData.email,
      phone: newCustomerData.phone,
      address: newCustomerData.address,
      repId: currentUser.id,
      notes: '',
    }]).select().single();

    if (newCust && !error) {
      setCustomers(prev => [...prev, newCust as Customer]);
      
      const { data: newInst } = await supabase.from('installations').insert([{
        customerId: newCust.id,
        address: newCust.address,
        status: InstallationStatus.NEW,
        systemSizeKw: 0,
        price: 0
      }]).select().single();

      if (newInst) {
        setInstallations(prev => [...prev, newInst as Installation]);
      }

      showNotification(`Dodano klienta: ${newCust.name}`);
    } else {
      console.error(error);
      showNotification("Błąd dodawania klienta", 'error');
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    const { error } = await supabase.from('customers').update(updatedCustomer).eq('id', updatedCustomer.id);
    if (!error) {
      setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      showNotification(`Zapisano dane klienta: ${updatedCustomer.name}`);
    } else {
      showNotification("Błąd zapisu klienta", 'error');
    }
  };

  const handleUpdateInstallation = async (updatedInstallation: Installation) => {
    const { error } = await supabase.from('installations').update(updatedInstallation).eq('id', updatedInstallation.id);
    if (!error) {
      setInstallations(prev => prev.map(i => i.id === updatedInstallation.id ? updatedInstallation : i));
      showNotification(`Zaktualizowano instalację`, 'info');
    } else {
      showNotification("Błąd aktualizacji instalacji", 'error');
    }
  };

  // Payment Logic
  const handleAddPayment = async (installationId: string, payment: PaymentEntry) => {
    const inst = installations.find(i => i.id === installationId);
    if (inst) {
      const newHistory = [...(inst.paymentHistory || []), payment];
      const newTotal = newHistory.reduce((sum, p) => sum + p.amount, 0);
      
      const { error } = await supabase.from('installations').update({
        paymentHistory: newHistory,
        paidAmount: newTotal
      }).eq('id', installationId);

      if (!error) {
        setInstallations(prev => prev.map(i => i.id === installationId ? { ...i, paymentHistory: newHistory, paidAmount: newTotal } : i));
      }
    }
  };

  const handleRemovePayment = async (installationId: string, paymentId: string) => {
     const inst = installations.find(i => i.id === installationId);
     if (inst) {
       const newHistory = (inst.paymentHistory || []).filter(p => p.id !== paymentId);
       const newTotal = newHistory.reduce((sum, p) => sum + p.amount, 0);
       
       const { error } = await supabase.from('installations').update({
        paymentHistory: newHistory,
        paidAmount: newTotal
      }).eq('id', installationId);

       if (!error) {
         setInstallations(prev => prev.map(i => i.id === installationId ? { ...i, paymentHistory: newHistory, paidAmount: newTotal } : i));
         showNotification("Usunięto wpłatę", 'info');
       }
     }
  };

  // Sales Room Logic
  const handleAddTask = async (task: Task) => {
    const { id, ...taskData } = task; 
    const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();
    if (data && !error) {
      setTasks(prev => [...prev, data as Task]);
      showNotification('Dodano nowe zadanie');
    }
  };

  const handleUpdateTask = async (taskId: string, completed: boolean) => {
    const { error } = await supabase.from('tasks').update({ completed }).eq('id', taskId);
    if (!error) {
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed } : t));
    }
  };

  const handleSendMessage = async (msg: Message) => {
    const { id, ...msgData } = msg;
    const { data, error } = await supabase.from('messages').insert([msgData]).select().single();
    if (data && !error) {
      setMessages(prev => [...prev, data as Message]);
      showNotification('Wiadomość wysłana');
    }
  };

  const handleUpdateSettings = async (settings: SalesSettings) => {
    if (currentUser) {
      const { error } = await supabase.from('profiles').update({ sales_settings: settings }).eq('id', currentUser.id);
      if (!error) {
        setCurrentUser({ ...currentUser, salesSettings: settings });
        showNotification("Zaktualizowano ustawienia");
      }
    }
  };

  const handleNavigateToCustomer = (customerId: string) => {
    const hasAccess = filteredCustomers.some(c => c.id === customerId);
    if (hasAccess) {
      setSelectedCustomerId(customerId);
      setCurrentView('CUSTOMERS');
    } else {
      showNotification('Brak dostępu do danych tego klienta', 'error');
    }
  };

  const handleSaveOffer = async (offer: Offer, isNewClient: boolean, newClientData?: { name: string, address: string, phone: string }) => {
    if (!currentUser) return;
    let customerId = offer.calculatorState.clientId;

    if (isNewClient && newClientData) {
      const { data: newCust, error: custError } = await supabase.from('customers').insert([{
        name: newClientData.name,
        address: newClientData.address,
        phone: newClientData.phone,
        email: '', 
        notes: 'Klient dodany z poziomu kalkulatora PV',
        repId: currentUser.id,
        offers: [offer]
      }]).select().single();

      if (newCust && !custError) {
        const { data: newInst } = await supabase.from('installations').insert([{
           customerId: newCust.id,
           address: newClientData.address,
           status: InstallationStatus.NEW,
           systemSizeKw: 0,
           price: 0
        }]).select().single();

        setCustomers(prev => [...prev, newCust as Customer]);
        if (newInst) setInstallations(prev => [...prev, newInst as Installation]);
        
        offer.calculatorState.clientId = newCust.id;
        showNotification(`Utworzono nowego klienta i zapisano ofertę.`);
      }
    } else if (customerId !== 'ANON') {
      const existingCustomer = customers.find(c => c.id === customerId);
      if (existingCustomer) {
        const updatedOffers = [...(existingCustomer.offers || []), offer];
        const { error } = await supabase.from('customers').update({ offers: updatedOffers }).eq('id', customerId);
        
        if (!error) {
          setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, offers: updatedOffers } : c));
          showNotification(`Zapisano ofertę dla klienta.`);
        }
      }
    }
  };

  const handleEditOffer = (offer: Offer) => {
    setOfferToEdit(offer.calculatorState);
    setCurrentView('APPLICATIONS');
  };

  const handleAcceptOffer = async (customerId: string, offerId: string): Promise<void> => {
    const customer = customers.find(c => c.id === customerId);
    if (!customer || !customer.offers) return;

    const offer = customer.offers.find(o => o.id === offerId);
    if (!offer) return;

    const { calculatorState, finalPrice } = offer;

    // 1. Update Inventory (Local Update for UI speed, DB update happening async if needed)
    if (calculatorState.panelId) {
      const item = inventory.find(i => i.id === calculatorState.panelId);
      if (item) await handleUpdateInventoryItem({ ...item, quantity: Math.max(0, item.quantity - calculatorState.panelCount) });
    }
    if (calculatorState.inverterId) {
       const item = inventory.find(i => i.id === calculatorState.inverterId);
       if (item) await handleUpdateInventoryItem({ ...item, quantity: Math.max(0, item.quantity - 1) });
    }

    // 2. Prepare Installation Data
    const panelItem = inventory.find(i => i.id === calculatorState.panelId);
    const inverterItem = inventory.find(i => i.id === calculatorState.inverterId);
    const storageItem = inventory.find(i => i.id === calculatorState.storageId);
    const mountingItem = inventory.find(i => i.id === calculatorState.mountingSystemId);

    const systemSizeKw = panelItem && panelItem.power 
      ? (panelItem.power * calculatorState.panelCount) / 1000 
      : (calculatorState.consumption ? calculatorState.consumption / 1000 : 0);
    
    const storageSizeKw = storageItem && storageItem.capacity 
      ? storageItem.capacity * calculatorState.storageCount 
      : 0;

    const offerNote = `Zaakceptowano ofertę: ${offer.name} (${new Date().toLocaleDateString('pl-PL')})`;
    const mountingTypeDesc = calculatorState.roofType + (calculatorState.roofType === 'GRUNT' ? ` (${calculatorState.trenchLength}m wykop)` : '');

    const existingInst = installations.find(i => i.customerId === customerId);
    
    const updateData = {
      price: finalPrice,
      systemSizeKw: systemSizeKw,
      status: InstallationStatus.AUDIT,
      panelModel: panelItem?.name || `Panel ID: ${calculatorState.panelId}`,
      inverterModel: inverterItem?.name || `Falownik ID: ${calculatorState.inverterId}`,
      storageModel: storageItem?.name,
      storageSizeKw: storageSizeKw,
      mountingSystem: mountingItem?.name || mountingTypeDesc,
      trenchLength: calculatorState.trenchLength,
      notes: existingInst ? (existingInst.notes || '') + '\n' + offerNote : offerNote
    };

    let newOrUpdatedInst: Installation | null = null;

    if (existingInst) {
       const { data, error } = await supabase.from('installations').update(updateData).eq('id', existingInst.id).select().single();
       if (data && !error) newOrUpdatedInst = data as Installation;
    } else {
       const { data, error } = await supabase.from('installations').insert([{
         customerId,
         address: customer.address,
         ...updateData
       }]).select().single();
       if (data && !error) newOrUpdatedInst = data as Installation;
    }

    if (newOrUpdatedInst) {
       setInstallations(prev => {
          const others = prev.filter(i => i.id !== newOrUpdatedInst!.id);
          return [...others, newOrUpdatedInst!];
       });
    }

    // 3. Update Offer Status
    const updatedOffers = customer.offers.map(o => o.id === offerId ? { ...o, status: 'ACCEPTED' as const } : o);
    const { error: custError } = await supabase.from('customers').update({ offers: updatedOffers }).eq('id', customerId);
    if (!custError) {
      setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, offers: updatedOffers } : c));
    }
  };

  const renderView = () => {
    if (!currentUser) return null;

    switch (currentView) {
      case 'DASHBOARD':
        return (
          <Dashboard 
            installations={filteredInstallations} 
            inventory={inventory} 
            customers={filteredCustomers} 
            onChangeView={setCurrentView}
          />
        );
      case 'CUSTOMERS':
        return (
          <Customers 
            customers={filteredCustomers} 
            installations={filteredInstallations} 
            onUpdateCustomer={handleUpdateCustomer}
            onUpdateInstallation={handleUpdateInstallation}
            onAddPayment={handleAddPayment}
            onRemovePayment={handleRemovePayment}
            onShowNotification={showNotification}
            selectedCustomerId={selectedCustomerId}
            setSelectedCustomerId={setSelectedCustomerId}
            onEditOffer={handleEditOffer}
            onAcceptOffer={handleAcceptOffer}
            onAddCustomer={handleAddCustomer}
            currentUserRole={currentUser.role}
            currentUserName={currentUser.name}
          />
        );
      case 'INSTALLATIONS':
        return (
          <Installations 
            installations={filteredInstallations} 
            customers={customers} 
            onNavigateToCustomer={handleNavigateToCustomer}
            onUpdateInstallation={handleUpdateInstallation}
            currentUserRole={currentUser.role}
          />
        );
      case 'INVENTORY':
        return (
          <Inventory 
            inventory={inventory} 
            onUpdateItem={handleUpdateInventoryItem} 
            onAddItem={handleAddItem} 
          />
        );
      case 'APPLICATIONS':
        return (
          <Applications 
            customers={filteredCustomers}
            inventory={inventory}
            onSaveOffer={handleSaveOffer}
            initialState={offerToEdit}
            clearInitialState={() => setOfferToEdit(null)}
          />
        );
      case 'SALES_ROOM':
        return (
           <SalesRoom 
             currentUser={currentUser}
             tasks={tasks}
             messages={messages}
             installations={installations}
             customers={customers}
             onAddTask={handleAddTask}
             onUpdateTask={handleUpdateTask}
             onSendMessage={handleSendMessage}
             onUpdateSettings={handleUpdateSettings}
           />
        );
      default:
        return null;
    }
  };

  if (loading) {
     return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center animate-fade-in">
           <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
           <p className="text-sm text-slate-400">Ładowanie systemu...</p>
        </div>
     </div>;
  }

  if (!currentUser) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* Mobile Sidebar Toggle Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <Sidebar 
        currentView={currentView} 
        onChangeView={(view) => { setCurrentView(view); setIsSidebarOpen(false); }} 
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 md:px-8 shadow-sm justify-between z-10">
           <div className="flex items-center">
             <button 
                onClick={() => setIsSidebarOpen(true)}
                className="mr-4 md:hidden text-slate-500 hover:text-slate-800"
             >
                <Menu className="w-6 h-6" />
             </button>
             <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate">
               {currentView === 'DASHBOARD' && 'Pulpit Zarządczy'}
               {currentView === 'SALES_ROOM' && 'Pokój Handlowca'}
               {currentView === 'CUSTOMERS' && 'Baza Klientów'}
               {currentView === 'INSTALLATIONS' && 'Harmonogram Montaży'}
               {currentView === 'INVENTORY' && 'Magazyn'}
               {currentView === 'APPLICATIONS' && 'Aplikacje'}
             </h1>
           </div>
           
           <div className="hidden md:flex items-center space-x-4">
             <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
               {new Date().toLocaleDateString('pl-PL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
             </div>
           </div>
        </header>
        
        <div className="flex-1 overflow-y-auto p-0">
          {renderView()}
        </div>

        {notification && (
          <Notification 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)} 
          />
        )}
      </main>
    </div>
  );
};

export default App;

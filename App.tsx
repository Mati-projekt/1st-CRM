
import React, { useState, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Installations } from './components/Installations';
import { Inventory } from './components/Inventory';
import { Applications } from './components/Applications';
import { SalesRoom } from './components/SalesRoom';
import { Login } from './components/Login';
import { Notification, NotificationType } from './components/Notification';
import { MOCK_CUSTOMERS, MOCK_INSTALLATIONS, MOCK_INVENTORY, MOCK_USERS, MOCK_TASKS, MOCK_MESSAGES } from './constants';
import { Customer, Installation, InventoryItem, ViewState, Offer, CalculatorState, InstallationStatus, UserRole, PaymentEntry, Task, Message, SalesSettings, ProductCategory, User } from './types';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [currentView, setCurrentView] = useState<ViewState>('DASHBOARD');
  
  // Data State
  const [customers, setCustomers] = useState(MOCK_CUSTOMERS);
  const [installations, setInstallations] = useState(MOCK_INSTALLATIONS);
  const [inventory, setInventory] = useState(MOCK_INVENTORY);
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  
  // Selection State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Edit Offer State
  const [offerToEdit, setOfferToEdit] = useState<CalculatorState | null>(null);

  // Notification State
  const [notification, setNotification] = useState<{ message: string; type: NotificationType } | null>(null);

  const showNotification = (message: string, type: NotificationType = 'success') => {
    setNotification({ message, type });
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Set default view based on role
    if (user.role === UserRole.SALES) setCurrentView('SALES_ROOM');
    else if (user.role === UserRole.INSTALLER) setCurrentView('INSTALLATIONS');
    else setCurrentView('DASHBOARD');
    
    showNotification(`Witaj, ${user.name}!`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setSelectedCustomerId(null);
    setOfferToEdit(null);
  };

  // --- FILTERING LOGIC BASED ON ROLE ---
  const filteredCustomers = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SALES) {
      return customers.filter(c => c.repId === currentUser.id);
    }
    // Installer doesn't really see "Customers" view usually, but if they do, maybe restricted.
    // Admin and Office see all.
    return customers;
  }, [customers, currentUser]);

  const filteredInstallations = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === UserRole.SALES) {
      // Sales see installations for their customers
      const myCustomerIds = customers.filter(c => c.repId === currentUser.id).map(c => c.id);
      return installations.filter(i => myCustomerIds.includes(i.customerId));
    }
    if (currentUser.role === UserRole.INSTALLER) {
      // Installers see installations assigned to their team
      return installations.filter(i => i.assignedTeam === currentUser.id);
    }
    return installations;
  }, [installations, customers, currentUser]);

  // Handlers
  const handleUpdateInventoryItem = (updatedItem: InventoryItem) => {
    setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    showNotification(`Zaktualizowano produkt: ${updatedItem.name}`);
  };

  const handleAddItem = (newItem: InventoryItem) => {
    setInventory(prev => [...prev, newItem]);
    showNotification(`Dodano nowy produkt: ${newItem.name}`);
  };

  const handleUpdateCustomer = (updatedCustomer: Customer) => {
    setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
    showNotification(`Zapisano dane klienta: ${updatedCustomer.name}`);
  };

  const handleUpdateInstallation = (updatedInstallation: Installation) => {
    setInstallations(prev => prev.map(i => i.id === updatedInstallation.id ? updatedInstallation : i));
    showNotification(`Zaktualizowano instalację`, 'info');
  };

  // Payment Logic
  const handleAddPayment = (installationId: string, payment: PaymentEntry) => {
    setInstallations(prev => prev.map(inst => {
      if (inst.id === installationId) {
        const newHistory = [...(inst.paymentHistory || []), payment];
        const newTotal = newHistory.reduce((sum, p) => sum + p.amount, 0);
        return {
          ...inst,
          paymentHistory: newHistory,
          paidAmount: newTotal
        };
      }
      return inst;
    }));
  };

  const handleRemovePayment = (installationId: string, paymentId: string) => {
     setInstallations(prev => prev.map(inst => {
       if (inst.id === installationId) {
         const newHistory = (inst.paymentHistory || []).filter(p => p.id !== paymentId);
         const newTotal = newHistory.reduce((sum, p) => sum + p.amount, 0);
         return {
           ...inst,
           paymentHistory: newHistory,
           paidAmount: newTotal
         };
       }
       return inst;
     }));
     showNotification("Usunięto wpłatę", 'info');
  };

  // Sales Room Logic
  const handleAddTask = (task: Task) => {
    setTasks(prev => [...prev, task]);
    showNotification('Dodano nowe zadanie');
  };

  const handleUpdateTask = (taskId: string, completed: boolean) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, completed } : t));
  };

  const handleSendMessage = (msg: Message) => {
    setMessages(prev => [...prev, msg]);
    showNotification('Wiadomość wysłana');
  };

  const handleUpdateSettings = (settings: SalesSettings) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, salesSettings: settings });
    }
  };

  const handleNavigateToCustomer = (customerId: string) => {
    // Check if user has access to this customer
    const hasAccess = filteredCustomers.some(c => c.id === customerId);
    if (hasAccess) {
      setSelectedCustomerId(customerId);
      setCurrentView('CUSTOMERS');
    } else {
      showNotification('Brak dostępu do danych tego klienta', 'error');
    }
  };

  const handleSaveOffer = (offer: Offer, isNewClient: boolean, newClientData?: { name: string, address: string, phone: string }) => {
    if (!currentUser) return;
    let customerId = offer.calculatorState.clientId;

    if (isNewClient && newClientData) {
      const newCustomer: Customer = {
        id: Date.now().toString(),
        name: newClientData.name,
        address: newClientData.address,
        phone: newClientData.phone,
        email: '', 
        notes: 'Klient dodany z poziomu kalkulatora PV',
        repId: currentUser.id, // Assign to current user (Sales Rep)
        offers: [offer],
        files: [],
        auditPhotos: []
      };
      
      const newInstallation: Installation = {
        id: `inst-${Date.now()}`,
        customerId: newCustomer.id,
        address: newClientData.address,
        systemSizeKw: 0, 
        status: InstallationStatus.NEW,
        price: 0,
        paidAmount: 0,
        paymentHistory: []
      };

      setCustomers(prev => [...prev, newCustomer]);
      setInstallations(prev => [...prev, newInstallation]);
      // Update offer to point to new customer ID for subsequent saves/edits
      offer.calculatorState.clientId = newCustomer.id;

      showNotification(`Utworzono nowego klienta i zapisano ofertę.`);
    } else if (customerId !== 'ANON') {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          return {
            ...c,
            offers: [...(c.offers || []), offer]
          };
        }
        return c;
      }));
      showNotification(`Zapisano ofertę dla klienta.`);
    }
  };

  const handleEditOffer = (offer: Offer) => {
    setOfferToEdit(offer.calculatorState);
    setCurrentView('APPLICATIONS');
  };

  const handleAcceptOffer = (customerId: string, offerId: string) => {
    console.log("Accepting offer:", offerId, "for customer:", customerId);
    const customer = customers.find(c => c.id === customerId);
    
    if (!customer) {
      showNotification('Nie znaleziono klienta.', 'error');
      return;
    }
    
    if (!customer.offers) {
      showNotification('Klient nie ma ofert.', 'error');
      return;
    }

    const offer = customer.offers.find(o => o.id === offerId);
    if (!offer) {
      showNotification('Nie znaleziono oferty.', 'error');
      return;
    }

    const { calculatorState, finalPrice } = offer;

    // 1. Update Inventory
    const updatedInventory = [...inventory];
    const deductItem = (id: string, count: number) => {
      const idx = updatedInventory.findIndex(i => i.id === id);
      if (idx !== -1) {
        updatedInventory[idx] = {
          ...updatedInventory[idx],
          quantity: Math.max(0, updatedInventory[idx].quantity - count)
        };
      }
    };

    if (calculatorState.panelId) deductItem(calculatorState.panelId, calculatorState.panelCount);
    if (calculatorState.inverterId) deductItem(calculatorState.inverterId, 1);
    if (calculatorState.storageId) deductItem(calculatorState.storageId, calculatorState.storageCount);
    if (calculatorState.mountingSystemId) deductItem(calculatorState.mountingSystemId, calculatorState.panelCount); 

    setInventory(updatedInventory);

    // 2. Prepare Installation Data
    // Find products to record detailed info with fallbacks
    const panelItem = inventory.find(i => i.id === calculatorState.panelId);
    const inverterItem = inventory.find(i => i.id === calculatorState.inverterId);
    const storageItem = inventory.find(i => i.id === calculatorState.storageId);

    // Fallback names if item not found in current inventory
    const panelName = panelItem ? panelItem.name : (calculatorState.panelId ? `Panel (ID: ${calculatorState.panelId})` : undefined);
    const inverterName = inverterItem ? inverterItem.name : (calculatorState.inverterId ? `Falownik (ID: ${calculatorState.inverterId})` : undefined);
    const storageName = storageItem ? storageItem.name : (calculatorState.storageId ? `Magazyn (ID: ${calculatorState.storageId})` : undefined);

    const systemSizeKw = panelItem && panelItem.power 
      ? (panelItem.power * calculatorState.panelCount) / 1000 
      : (calculatorState.consumption ? calculatorState.consumption / 1000 : 0); // Crude fallback

    const offerNote = `Zaakceptowano ofertę: ${offer.name} (${new Date().toLocaleDateString('pl-PL')})`;

    setInstallations(prev => {
      // Check if installation exists
      const existingIdx = prev.findIndex(i => i.customerId === customerId);
      
      const newInstallationData = {
        price: finalPrice,
        systemSizeKw: systemSizeKw,
        status: InstallationStatus.AUDIT, // Force status to Audit
        panelModel: panelName,
        inverterModel: inverterName,
        storageModel: storageName,
      };

      if (existingIdx !== -1) {
        console.log("Updating existing installation for accept offer");
        const updated = [...prev];
        const existingInst = updated[existingIdx];
        updated[existingIdx] = {
          ...existingInst,
          ...newInstallationData,
          notes: (existingInst.notes || '') + '\n' + offerNote
        };
        return updated;
      } else {
        console.log("Creating new installation for accept offer");
        return [...prev, {
          id: `inst-${Date.now()}`,
          customerId: customerId,
          address: customer.address,
          paidAmount: 0,
          paymentHistory: [],
          ...newInstallationData,
          notes: offerNote
        }];
      }
    });

    // 3. Update Offer Status
    setCustomers(prev => prev.map(c => {
      if (c.id === customerId) {
        return {
          ...c,
          offers: c.offers?.map(o => o.id === offerId ? { ...o, status: 'ACCEPTED' } : o)
        };
      }
      return c;
    }));

    showNotification('Oferta zaakceptowana! Zaktualizowano dane instalacji i wysłano do audytu.');
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
            currentUserRole={currentUser.role}
            currentUserName={currentUser.name}
          />
        );
      case 'INSTALLATIONS':
        return (
          <Installations 
            installations={filteredInstallations} 
            customers={customers} // Pass all customers so we can resolve names even if filtering logic is complex
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
             customers={customers}
             installations={installations}
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

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-8 shadow-sm justify-between z-10">
           <h1 className="text-xl font-bold text-slate-800">
             {currentView === 'DASHBOARD' && 'Pulpit Zarządczy'}
             {currentView === 'SALES_ROOM' && 'Pokój Handlowca'}
             {currentView === 'CUSTOMERS' && 'Baza Klientów'}
             {currentView === 'INSTALLATIONS' && 'Harmonogram Montaży'}
             {currentView === 'INVENTORY' && 'Magazyn'}
             {currentView === 'APPLICATIONS' && 'Aplikacje i Narzędzia'}
           </h1>
           <div className="flex items-center space-x-4">
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

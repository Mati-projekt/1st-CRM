

import React, { useState, useMemo, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Installations } from './components/Installations';
import { Inventory } from './components/Inventory';
import { Applications } from './components/Applications';
import { Employees } from './components/Employees';
import { Login } from './components/Login';
import { Notification, NotificationType } from './components/Notification';
import { Customer, Installation, InventoryItem, ViewState, Offer, CalculatorState, InstallationStatus, UserRole, PaymentEntry, Task, Message, SalesSettings, ProductCategory, User, SystemSettings } from './types';
import { supabase } from './services/supabaseClient';
import { Menu, RefreshCw } from 'lucide-react';
import { MOCK_INVENTORY } from './constants';

// Safe ID generator fallback
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

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
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // System Settings
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    cat2MarkupType: 'PERCENT',
    cat2MarkupValue: 5 // Default 5%
  });
  
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

      // Fetch Profiles (Employees)
      // Mapujemy snake_case z bazy na camelCase w aplikacji
      const { data: userData } = await supabase.from('profiles').select('*');
      if (userData) {
        const mappedUsers: User[] = userData.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as UserRole,
          salesCategory: u.sales_category,
          managerId: u.manager_id,
          salesSettings: u.sales_settings
        }));
        setAllUsers(mappedUsers);

        // Try to load system settings from Admin profile if available
        const adminUser = mappedUsers.find(u => u.role === UserRole.ADMIN);
        if (adminUser && adminUser.salesSettings) {
           // We store both SalesSettings and SystemSettings in the same JSON column in DB for simplicity
           // Check if it has system setting keys
           const potentialSettings = adminUser.salesSettings as any;
           if (potentialSettings.cat2MarkupType) {
              setSystemSettings({
                cat2MarkupType: potentialSettings.cat2MarkupType,
                cat2MarkupValue: potentialSettings.cat2MarkupValue || 0
              });
           }
        }
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      showNotification("Błąd pobierania danych z bazy", 'error');
    }
  };

  // --- AUTH LISTENER & TIMEOUT ---
  useEffect(() => {
    let mounted = true;

    const safetyTimeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("Session check timed out.");
      }
    }, 10000); 

    const syncProfile = async (sessionUser: any) => {
      // 1. Pobierz profil pasujący do ID sesji (Ten, na który jesteśmy zalogowani)
      const { data: authProfile } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
      
      // 2. Pobierz profil pasujący do EMAILA (Ten stworzony przez Admina w CRM)
      // Wykluczamy ID sesji, żeby znaleźć "tego drugiego" (duplikat stworzony w CRM)
      const { data: crmProfile } = await supabase.from('profiles').select('*').ilike('email', sessionUser.email).neq('id', sessionUser.id).single();

      // SCENARIUSZ A: Mamy profil CRM, który nie jest jeszcze połączony z kontem logowania
      if (crmProfile) {
         console.log("Wykryto profil CRM (stworzony przez Admina). Rozpoczynam synchronizację...");
         const crmId = crmProfile.id;
         const authId = sessionUser.id;

         if (authProfile) {
            // SCENARIUSZ A.1: Istnieją OBA profile.
            console.log("Scalanie kont: Nadpisywanie profilu Auth danymi z CRM...");
            
            await supabase.from('profiles').update({
                role: crmProfile.role,
                sales_category: crmProfile.sales_category,
                manager_id: crmProfile.manager_id,
                sales_settings: crmProfile.sales_settings,
                name: crmProfile.name
            }).eq('id', authId);

            await supabase.from('customers').update({ repId: authId }).eq('repId', crmId);
            await supabase.from('installations').update({ assignedTeam: authId }).eq('assignedTeam', crmId);
            await supabase.from('tasks').update({ assignedTo: authId }).eq('assignedTo', crmId);
            await supabase.from('tasks').update({ createdBy: authId }).eq('createdBy', crmId);
            await supabase.from('messages').update({ fromId: authId }).eq('fromId', crmId);
            await supabase.from('messages').update({ toId: authId }).eq('toId', crmId);
            await supabase.from('profiles').update({ manager_id: authId }).eq('manager_id', crmId);

            await supabase.from('profiles').delete().eq('id', crmId);
            
            return {
              id: authId,
              name: crmProfile.name,
              email: sessionUser.email,
              role: crmProfile.role, 
              salesCategory: crmProfile.sales_category,
              managerId: crmProfile.manager_id,
              salesSettings: crmProfile.sales_settings
            };

         } else {
            // SCENARIUSZ A.2: Istnieje tylko profil CRM
            console.log("Migracja ID: Przypisywanie profilu CRM do konta Auth...");
            
            const { error: updateError } = await supabase.from('profiles').update({ id: authId }).eq('id', crmId);
            
            if (!updateError) {
               await supabase.from('customers').update({ repId: authId }).eq('repId', crmId);
               await supabase.from('installations').update({ assignedTeam: authId }).eq('assignedTeam', crmId);
               await supabase.from('profiles').update({ manager_id: authId }).eq('manager_id', crmId);
               
               return {
                  id: authId,
                  name: crmProfile.name,
                  email: crmProfile.email,
                  role: crmProfile.role,
                  salesCategory: crmProfile.sales_category,
                  managerId: crmProfile.manager_id,
                  salesSettings: crmProfile.sales_settings
               };
            }
         }
      } 
      
      // SCENARIUSZ B: Brak profilu CRM, po prostu zwracamy profil Auth (jeśli istnieje)
      if (authProfile) {
        return {
          id: authProfile.id, 
          name: authProfile.name,
          email: authProfile.email,
          role: authProfile.role,
          salesCategory: authProfile.sales_category,
          managerId: authProfile.manager_id,
          salesSettings: authProfile.sales_settings
        };
      } 
      
      // SCENARIUSZ C: Brak jakiegokolwiek profilu. Tworzymy nowy domyślny.
      const newProfile = {
        id: sessionUser.id,
        name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Użytkownik',
        email: sessionUser.email || '',
        role: UserRole.SALES, // Domyślnie Handlowiec
        sales_category: '1'
      };

      const { error: insertError } = await supabase.from('profiles').insert([newProfile]);
      
      if (!insertError) {
        return {
          id: newProfile.id,
          name: newProfile.name,
          email: newProfile.email,
          role: newProfile.role,
          salesCategory: '1'
        };
      }
      
      return null;
    };

    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user && mounted) {
          const user = await syncProfile(session.user);
          if (user) {
             setCurrentUser(user);
          } else {
             setCurrentUser({
               id: session.user.id,
               name: session.user.email || 'User',
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

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user && mounted) {
         if (event === 'SIGNED_IN') {
             const user = await syncProfile(session.user);
             if (user) setCurrentUser(user);
         } else {
             if (!currentUser) {
                 const user = await syncProfile(session.user);
                 if (user) setCurrentUser(user);
             }
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

  useEffect(() => {
    if (currentUser) {
      fetchData();
      if (currentUser.role === UserRole.INSTALLER) setCurrentView('INSTALLATIONS');
      else setCurrentView('DASHBOARD');
    }
  }, [currentUser]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  // --- FILTERING LOGIC ---
  const filteredCustomers = useMemo(() => {
    if (!currentUser) return [];
    
    if (currentUser.role === UserRole.SALES) {
      return customers.filter(c => c.repId === currentUser.id);
    }
    
    if (currentUser.role === UserRole.SALES_MANAGER) {
      const subordinateIds = allUsers.filter(u => u.managerId === currentUser.id).map(u => u.id);
      return customers.filter(c => c.repId === currentUser.id || (c.repId && subordinateIds.includes(c.repId)));
    }

    if (currentUser.role === UserRole.INSTALLER) {
      const myInstallationCustIds = installations
        .filter(i => i.assignedTeam === currentUser.id)
        .map(i => i.customerId);
      return customers.filter(c => myInstallationCustIds.includes(c.id));
    }
    
    return customers;
  }, [customers, currentUser, allUsers, installations]);

  const filteredInstallations = useMemo(() => {
    if (!currentUser) return [];
    
    if (currentUser.role === UserRole.SALES) {
      const myCustomerIds = customers.filter(c => c.repId === currentUser.id).map(c => c.id);
      return installations.filter(i => myCustomerIds.includes(i.customerId));
    }

    if (currentUser.role === UserRole.SALES_MANAGER) {
      const subordinateIds = allUsers.filter(u => u.managerId === currentUser.id).map(u => u.id);
      const relevantCustomerIds = customers
        .filter(c => c.repId === currentUser.id || (c.repId && subordinateIds.includes(c.repId)))
        .map(c => c.id);
      return installations.filter(i => relevantCustomerIds.includes(i.customerId));
    }

    if (currentUser.role === UserRole.INSTALLER) {
      return installations.filter(i => i.assignedTeam === currentUser.id);
    }
    
    return installations;
  }, [installations, customers, currentUser, allUsers]);

  // --- HANDLERS ---

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
    }
  };

  const handleLoadSampleInventory = async () => {
    if (!MOCK_INVENTORY || MOCK_INVENTORY.length === 0) return;
    
    const itemsToInsert = MOCK_INVENTORY.map(item => {
       const { id, dateAdded, ...rest } = item;
       return { 
          ...rest,
          id: generateId(),
          dateAdded: new Date().toISOString()
       };
    });

    const { data, error } = await supabase.from('inventory').insert(itemsToInsert).select();
    
    if (!error && data) {
       setInventory(data as InventoryItem[]);
       showNotification("Wgrano przykładowe produkty do bazy!");
    } else {
       console.error("Error inserting samples:", error);
       showNotification("Błąd podczas wgrywania produktów", 'error');
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
      if (newInst) setInstallations(prev => [...prev, newInst as Installation]);
      showNotification(`Dodano klienta: ${newCust.name}`);
    } else {
      showNotification("Błąd dodawania klienta", 'error');
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    const { error } = await supabase.from('customers').update(updatedCustomer).eq('id', updatedCustomer.id);
    if (!error) {
      setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      showNotification(`Zapisano dane klienta`);
    } else {
      showNotification("Błąd zapisu klienta", 'error');
    }
  };

  const handleUpdateInstallation = async (updatedInstallation: Installation) => {
    const { error } = await supabase.from('installations').update(updatedInstallation).eq('id', updatedInstallation.id);
    if (!error) {
      setInstallations(prev => prev.map(i => i.id === updatedInstallation.id ? updatedInstallation : i));
      showNotification(`Zaktualizowano instalację`, 'info');
    }
  };

  const handleAddPayment = async (installationId: string, payment: PaymentEntry) => {
    const inst = installations.find(i => i.id === installationId);
    if (inst) {
      const newHistory = [...(inst.paymentHistory || []), payment];
      const newTotal = newHistory.reduce((sum, p) => sum + p.amount, 0);
      const { error } = await supabase.from('installations').update({ paymentHistory: newHistory, paidAmount: newTotal }).eq('id', installationId);
      if (!error) setInstallations(prev => prev.map(i => i.id === installationId ? { ...i, paymentHistory: newHistory, paidAmount: newTotal } : i));
    }
  };

  const handleRemovePayment = async (installationId: string, paymentId: string) => {
     const inst = installations.find(i => i.id === installationId);
     if (inst) {
       const newHistory = (inst.paymentHistory || []).filter(p => p.id !== paymentId);
       const newTotal = newHistory.reduce((sum, p) => sum + p.amount, 0);
       const { error } = await supabase.from('installations').update({ paymentHistory: newHistory, paidAmount: newTotal }).eq('id', installationId);
       if (!error) {
         setInstallations(prev => prev.map(i => i.id === installationId ? { ...i, paymentHistory: newHistory, paidAmount: newTotal } : i));
         showNotification("Usunięto wpłatę", 'info');
       }
     }
  };

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

  const handleUpdateSystemSettings = async (settings: SystemSettings) => {
    setSystemSettings(settings);
    // Persist logic: Try to save to current user (admin) profile meta data if possible
    // We are reusing the sales_settings column but merging the system config into it
    if (currentUser) {
       const newSettings = {
         ...currentUser.salesSettings,
         cat2MarkupType: settings.cat2MarkupType,
         cat2MarkupValue: settings.cat2MarkupValue
       };
       
       const { error } = await supabase.from('profiles').update({ sales_settings: newSettings }).eq('id', currentUser.id);
       
       if (!error) {
         showNotification("Zapisano ustawienia systemu");
       } else {
         console.warn("Could not persist system settings to DB", error);
         showNotification("Zapisano ustawienia (lokalnie)", 'info');
       }
    } else {
       showNotification("Zapisano ustawienia (lokalnie)");
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

  const handleSaveOffer = async (offer: Offer, isNewClient: boolean, newClientData?: { name: string, address: string, phone: string, email: string }) => {
    if (!currentUser) return;
    let customerId = offer.calculatorState.clientId;

    if (isNewClient && newClientData) {
      const { data: newCust, error: custError } = await supabase.from('customers').insert([{
        name: newClientData.name,
        address: newClientData.address,
        phone: newClientData.phone,
        email: newClientData.email || '', 
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

    const offerNote = `Zaakceptowano ofertę: ${offer.name}`;
    const panelItem = inventory.find(i => i.id === calculatorState.panelId);
    const inverterItem = inventory.find(i => i.id === calculatorState.inverterId);
    const storageItem = inventory.find(i => i.id === calculatorState.storageId);
    const mountingItem = inventory.find(i => i.id === calculatorState.mountingSystemId);
    const systemSizeKw = panelItem && panelItem.power ? (panelItem.power * calculatorState.panelCount) / 1000 : 0;
    const storageSizeKw = storageItem && storageItem.capacity ? storageItem.capacity * calculatorState.storageCount : 0;

    const existingInst = installations.find(i => i.customerId === customerId);
    const updateData = {
      price: finalPrice,
      systemSizeKw,
      status: InstallationStatus.AUDIT,
      panelModel: panelItem?.name,
      inverterModel: inverterItem?.name,
      storageModel: storageItem?.name,
      storageSizeKw,
      mountingSystem: mountingItem?.name,
      trenchLength: calculatorState.trenchLength,
      notes: existingInst ? (existingInst.notes || '') + '\n' + offerNote : offerNote
    };

    let newOrUpdatedInst: Installation | null = null;
    if (existingInst) {
       const { data, error } = await supabase.from('installations').update(updateData).eq('id', existingInst.id).select().single();
       if (data && !error) newOrUpdatedInst = data as Installation;
    } else {
       const { data, error } = await supabase.from('installations').insert([{ customerId, address: customer.address, ...updateData }]).select().single();
       if (data && !error) newOrUpdatedInst = data as Installation;
    }

    if (newOrUpdatedInst) {
       setInstallations(prev => {
          const others = prev.filter(i => i.id !== newOrUpdatedInst!.id);
          return [...others, newOrUpdatedInst!];
       });
    }

    const updatedOffers = customer.offers.map(o => o.id === offerId ? { ...o, status: 'ACCEPTED' as const } : o);
    const { error: custError } = await supabase.from('customers').update({ offers: updatedOffers }).eq('id', customerId);
    if (!custError) setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, offers: updatedOffers } : c));
  };

  const handleAddUser = async (user: Partial<User>, password?: string) => {
    const mockId = generateId(); 
    
    const dbProfile = {
      id: mockId,
      name: user.name,
      email: user.email,
      role: user.role,
      sales_category: user.salesCategory || null,
      manager_id: user.managerId || null,
      sales_settings: user.salesSettings || null
    };

    const { data: profileData, error } = await supabase.from('profiles').insert([dbProfile]).select().single();
    
    if (!error) {
       const newUser: User = { ...user, id: mockId } as User;
       setAllUsers(prev => [...prev, newUser]);
       showNotification(`Dodano profil w CRM: ${user.name}`);
       if (password && user.email) {
          showNotification("WAŻNE: Teraz dodaj użytkownika ręcznie w panelu Supabase -> Authentication!", 'info');
       }
    } else {
       console.error("Error adding user:", error);
       if (error.message?.includes("manager_id") || error.message?.includes("sales_category")) {
          showNotification("Błąd: Brak kolumn w bazie. Uruchom SQL aktualizujący tabelę profiles.", 'error');
       } else {
          showNotification(`Błąd bazy danych: ${error.message}`, 'error');
       }
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    const dbProfile = {
      name: updatedUser.name,
      role: updatedUser.role,
      sales_category: updatedUser.salesCategory || null,
      manager_id: updatedUser.managerId || null,
      sales_settings: updatedUser.salesSettings || null
    };

    const { error } = await supabase.from('profiles').update(dbProfile).eq('id', updatedUser.id);
    
    if (!error) {
       setAllUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
       showNotification("Zaktualizowano dane pracownika");
    } else {
       console.error("Error updating user:", error);
       showNotification("Błąd aktualizacji pracownika", 'error');
    }
  };

  const handleDeleteUser = async (userId: string) => {
     const { error } = await supabase.from('profiles').delete().eq('id', userId);
     if (!error) {
        setAllUsers(prev => prev.filter(u => u.id !== userId));
        showNotification("Usunięto pracownika");
     } else {
        console.error("Error deleting user:", error);
        showNotification("Błąd usuwania pracownika", 'error');
     }
  };

  const renderView = () => {
    if (!currentUser) return null;

    switch (currentView) {
      case 'DASHBOARD':
        return <Dashboard 
          installations={filteredInstallations} 
          inventory={inventory} 
          customers={filteredCustomers} 
          onChangeView={setCurrentView} 
          currentUser={currentUser}
          onAddTask={handleAddTask}
          tasks={tasks}
          messages={messages}
          onSendMessage={handleSendMessage}
          onUpdateSettings={handleUpdateSettings}
        />;
      case 'CUSTOMERS':
        return <Customers 
          customers={filteredCustomers} 
          installations={filteredInstallations} 
          users={allUsers}
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
          currentUser={currentUser}
        />;
      case 'INSTALLATIONS':
        return <Installations installations={filteredInstallations} customers={customers} users={allUsers} onNavigateToCustomer={handleNavigateToCustomer} onUpdateInstallation={handleUpdateInstallation} currentUserRole={currentUser.role} />;
      case 'INVENTORY':
        return <Inventory inventory={inventory} onUpdateItem={handleUpdateInventoryItem} onAddItem={handleAddItem} onLoadSampleData={handleLoadSampleInventory} />;
      case 'APPLICATIONS':
        return <Applications 
          customers={filteredCustomers}
          inventory={inventory}
          onSaveOffer={handleSaveOffer}
          initialState={offerToEdit}
          clearInitialState={() => setOfferToEdit(null)}
          currentUser={currentUser}
          systemSettings={systemSettings}
        />;
      case 'EMPLOYEES':
        return <Employees 
          users={allUsers} 
          onAddUser={handleAddUser} 
          onUpdateUser={handleUpdateUser} 
          onDeleteUser={handleDeleteUser}
          systemSettings={systemSettings} 
          onUpdateSystemSettings={handleUpdateSystemSettings} 
        />;
      default: return null;
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div></div>;

  if (!currentUser) return <Login onLogin={() => {}} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <Sidebar 
        currentView={currentView} 
        onChangeView={(view) => { setCurrentView(view); setIsSidebarOpen(false); }} 
        currentUser={currentUser}
        onLogout={handleLogout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 md:px-8 shadow-sm justify-between z-10">
           <div className="flex items-center">
             <button onClick={() => setIsSidebarOpen(true)} className="mr-4 md:hidden text-slate-500 hover:text-slate-800"><Menu className="w-6 h-6" /></button>
             <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate">
               {currentView === 'EMPLOYEES' ? 'Pracownicy' : 'Panel'}
             </h1>
           </div>
           <div className="hidden md:flex items-center space-x-4">
             <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">{new Date().toLocaleDateString('pl-PL')}</div>
           </div>
        </header>
        <div className="flex-1 overflow-y-auto p-0">{renderView()}</div>
        {notification && <Notification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      </main>
    </div>
  );
};

export default App;
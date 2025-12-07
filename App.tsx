
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
import { Menu } from 'lucide-react';
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

  // --- MAPPERS (CRITICAL FOR DB SYNC - HYBRID APPROACH) ---
  
  const mapCustomerFromDB = (c: any): Customer => ({
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    notes: c.notes || '',
    // Try snake_case first (standard), then camelCase (legacy/auto-generated)
    repId: c.rep_id || c.repId || '', 
    files: c.files || [], 
    auditPhotos: c.audit_photos || c.auditPhotos || [],
    offers: c.offers || []
  });

  const mapCustomerToDB = (c: Partial<Customer>): any => {
    const db: any = {};
    if (c.id) db.id = c.id;
    if (c.name) db.name = c.name;
    if (c.email) db.email = c.email;
    if (c.phone) db.phone = c.phone;
    if (c.address) db.address = c.address;
    if (c.notes) db.notes = c.notes;
    if (c.repId) db.rep_id = c.repId;
    if (c.offers) db.offers = c.offers;
    return db;
  };

  const mapInstallationFromDB = (i: any): Installation => ({
    id: i.id,
    customerId: i.customer_id || i.customerId || '', // Hybrid check
    address: i.address || '',
    systemSizeKw: i.system_size_kw || i.systemSizeKw || 0, // Hybrid check
    status: i.status as InstallationStatus,
    dateScheduled: i.date_scheduled || i.dateScheduled,
    assignedTeam: i.assigned_team || i.assignedTeam,
    notes: i.notes,
    panelModel: i.panel_model || i.panelModel,
    inverterModel: i.inverter_model || i.inverterModel,
    storageModel: i.storage_model || i.storageModel,
    storageSizeKw: i.storage_size_kw || i.storageSizeKw,
    mountingSystem: i.mounting_system || i.mountingSystem,
    trenchLength: i.trench_length || i.trenchLength,
    price: i.price || 0,
    paidAmount: i.paid_amount || i.paidAmount || 0,
    paymentHistory: i.payment_history || i.paymentHistory || [],
    commissionValue: i.commission_value || i.commissionValue || 0
  });

  const mapInstallationToDB = (i: Partial<Installation>): any => {
    const db: any = {};
    if (i.id) db.id = i.id;
    if (i.customerId) { db.customer_id = i.customerId; db.customerId = i.customerId; } // Send both for robust compat if schema varies
    if (i.address) db.address = i.address;
    if (i.systemSizeKw !== undefined) { db.system_size_kw = i.systemSizeKw; db.systemSizeKw = i.systemSizeKw; }
    if (i.status) db.status = i.status;
    if (i.dateScheduled !== undefined) db.date_scheduled = i.dateScheduled;
    if (i.assignedTeam !== undefined) db.assigned_team = i.assignedTeam;
    if (i.notes !== undefined) db.notes = i.notes;
    if (i.panelModel !== undefined) db.panel_model = i.panelModel;
    if (i.inverterModel !== undefined) db.inverter_model = i.inverterModel;
    if (i.storageModel !== undefined) db.storage_model = i.storageModel;
    if (i.storageSizeKw !== undefined) db.storage_size_kw = i.storageSizeKw;
    if (i.mountingSystem !== undefined) db.mounting_system = i.mountingSystem;
    if (i.trenchLength !== undefined) db.trench_length = i.trenchLength;
    if (i.price !== undefined) db.price = i.price;
    if (i.paidAmount !== undefined) db.paid_amount = i.paidAmount;
    if (i.paymentHistory !== undefined) db.payment_history = i.paymentHistory;
    if (i.commissionValue !== undefined) db.commission_value = i.commissionValue;
    return db;
  };

  // --- INITIAL DATA FETCH ---
  const fetchData = async () => {
    if (!currentUser) return;
    try {
      // Fetch Inventory with mapping
      const { data: invData } = await supabase.from('inventory').select('*');
      if (invData) {
        const mappedInventory: InventoryItem[] = invData.map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category as ProductCategory,
          quantity: item.quantity,
          minQuantity: item.min_quantity || item.minQuantity,
          price: item.price,
          unit: item.unit,
          warranty: item.warranty,
          power: item.power,
          capacity: item.capacity,
          phases: item.phases,
          url: item.url,
          dateAdded: item.date_added || item.dateAdded
        }));
        setInventory(mappedInventory);
      }

      // Fetch Customers with mapping
      const { data: custData, error: custError } = await supabase.from('customers').select('*');
      if (custData) {
        setCustomers(custData.map(mapCustomerFromDB));
      } else if (custError) {
         console.error("Customers Fetch Error:", custError);
         // If error is permission related, customers will remain []
      }

      // Fetch Installations with Mapping
      const { data: instData } = await supabase.from('installations').select('*');
      if (instData) {
         setInstallations(instData.map(mapInstallationFromDB));
      }

      // Fetch Tasks
      const { data: taskData } = await supabase.from('tasks').select('*');
      if (taskData) setTasks(taskData as Task[]);

      // Fetch Messages
      const { data: msgData } = await supabase.from('messages').select('*');
      if (msgData) setMessages(msgData as Message[]);

      // Fetch Profiles (Employees)
      const { data: userData } = await supabase.from('profiles').select('*');
      if (userData) {
        const mappedUsers: User[] = userData.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role as UserRole,
          salesCategory: u.sales_category || u.salesCategory,
          managerId: u.manager_id || u.managerId,
          salesSettings: u.sales_settings || u.salesSettings
        }));
        setAllUsers(mappedUsers);

        // Try to load system settings from Admin profile if available
        const adminUser = mappedUsers.find(u => u.role === UserRole.ADMIN);
        if (adminUser && adminUser.salesSettings) {
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
        console.warn("Session check timed out - forcing load complete.");
        setLoading(false);
      }
    }, 3000); 

    const syncProfile = async (sessionUser: any) => {
      const { data: authProfile } = await supabase.from('profiles').select('*').eq('id', sessionUser.id).single();
      const { data: crmProfile } = await supabase.from('profiles').select('*').ilike('email', sessionUser.email).neq('id', sessionUser.id).single();

      if (crmProfile) {
         console.log("Synchronizacja profilu CRM...");
         const crmId = crmProfile.id;
         const authId = sessionUser.id;

         if (authProfile) {
            await supabase.from('profiles').update({
                role: crmProfile.role,
                sales_category: crmProfile.sales_category,
                manager_id: crmProfile.manager_id,
                sales_settings: crmProfile.sales_settings,
                name: crmProfile.name
            }).eq('id', authId);

            // Update FK references to the new ID
            await supabase.from('customers').update({ rep_id: authId }).eq('rep_id', crmId);
            await supabase.from('installations').update({ assigned_team: authId }).eq('assigned_team', crmId);
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
            const { error: updateError } = await supabase.from('profiles').update({ id: authId }).eq('id', crmId);
            if (!updateError) {
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
      
      const newProfile = {
        id: sessionUser.id,
        name: sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || 'Użytkownik',
        email: sessionUser.email || '',
        role: UserRole.SALES, 
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
        if (mounted) {
          setLoading(false);
          clearTimeout(safetyTimeout);
        }
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
    const dbItem = {
      name: updatedItem.name,
      category: updatedItem.category,
      quantity: updatedItem.quantity,
      min_quantity: updatedItem.minQuantity,
      price: updatedItem.price,
      unit: updatedItem.unit,
      warranty: updatedItem.warranty,
      power: updatedItem.power,
      capacity: updatedItem.capacity,
      phases: updatedItem.phases,
      url: updatedItem.url,
    };

    const { error } = await supabase.from('inventory').update(dbItem).eq('id', updatedItem.id);
    if (!error) {
      setInventory(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
      showNotification(`Zaktualizowano produkt: ${updatedItem.name}`);
    } else {
      showNotification("Błąd aktualizacji magazynu", 'error');
    }
  };

  const handleAddItem = async (newItem: InventoryItem) => {
    const dbItem = {
      id: newItem.id || generateId(), // Ensure ID exists
      name: newItem.name,
      category: newItem.category,
      quantity: newItem.quantity,
      min_quantity: newItem.minQuantity,
      price: newItem.price,
      unit: newItem.unit,
      warranty: newItem.warranty,
      power: newItem.power,
      capacity: newItem.capacity,
      phases: newItem.phases,
      url: newItem.url,
      date_added: new Date().toISOString()
    };

    const { data, error } = await supabase.from('inventory').insert([dbItem]).select().single();
    if (data && !error) {
       const mappedNewItem: InventoryItem = {
         id: data.id,
         name: data.name,
         category: data.category,
         quantity: data.quantity,
         minQuantity: data.min_quantity || data.minQuantity,
         price: data.price,
         unit: data.unit,
         warranty: data.warranty,
         power: data.power,
         capacity: data.capacity,
         phases: data.phases,
         url: data.url,
         dateAdded: data.date_added
       };
      setInventory(prev => [...prev, mappedNewItem]);
      showNotification(`Dodano nowy produkt: ${data.name}`);
    } else {
       console.error(error);
       showNotification("Błąd dodawania produktu", 'error');
    }
  };

  const handleLoadSampleInventory = async () => {
    if (!MOCK_INVENTORY || MOCK_INVENTORY.length === 0) return;
    
    const itemsToInsert = MOCK_INVENTORY.map(item => {
       // Explicitly include ID to prevent missing PK errors
       return { 
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          min_quantity: item.minQuantity, // camel to snake
          price: item.price,
          unit: item.unit,
          warranty: item.warranty,
          power: item.power,
          capacity: item.capacity,
          phases: item.phases,
          url: item.url,
          date_added: new Date().toISOString()
       };
    });

    // Use upsert to handle re-runs gracefully without unique violations
    const { data, error } = await supabase.from('inventory').upsert(itemsToInsert).select();
    
    if (!error && data) {
       const mappedNewItems: InventoryItem[] = data.map((item: any) => ({
         id: item.id,
         name: item.name,
         category: item.category as ProductCategory,
         quantity: item.quantity,
         minQuantity: item.min_quantity || item.minQuantity,
         price: item.price,
         unit: item.unit,
         warranty: item.warranty,
         power: item.power,
         capacity: item.capacity,
         phases: item.phases,
         url: item.url,
         dateAdded: item.date_added
       }));

       setInventory(mappedNewItems);
       showNotification("Wgrano przykładowe produkty do bazy!");
    } else {
       console.error("Error inserting samples:", error);
       showNotification("Błąd podczas wgrywania produktów", 'error');
    }
  };

  const handleAddCustomer = async (newCustomerData: { name: string, email: string, phone: string, address: string }) => {
    if (!currentUser) return;
    
    // DB MAPPING FOR INSERT
    const dbCustomer = {
      name: newCustomerData.name,
      email: newCustomerData.email,
      phone: newCustomerData.phone,
      address: newCustomerData.address,
      rep_id: currentUser.id, // snake_case
      notes: '',
    };
    
    const { data: newCust, error } = await supabase.from('customers').insert([dbCustomer]).select().single();

    if (newCust && !error) {
      // Map back to App format
      const mappedNewCust = mapCustomerFromDB(newCust);
      setCustomers(prev => [...prev, mappedNewCust]);
      
      const newInst: Partial<Installation> = {
        customerId: mappedNewCust.id,
        address: mappedNewCust.address,
        status: InstallationStatus.NEW,
        systemSizeKw: 0,
        price: 0
      };
      
      const dbInst = mapInstallationToDB(newInst);
      
      const { data: insertedInst } = await supabase.from('installations').insert([dbInst]).select().single();
      
      if (insertedInst) setInstallations(prev => [...prev, mapInstallationFromDB(insertedInst)]);
      
      showNotification(`Dodano klienta: ${mappedNewCust.name}`);
    } else {
      console.error(error);
      showNotification("Błąd dodawania klienta", 'error');
    }
  };

  const handleUpdateCustomer = async (updatedCustomer: Customer) => {
    const dbCustomer = mapCustomerToDB(updatedCustomer);
    const { error } = await supabase.from('customers').update(dbCustomer).eq('id', updatedCustomer.id);
    if (!error) {
      setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
      showNotification(`Zapisano dane klienta`);
    } else {
      showNotification("Błąd zapisu klienta", 'error');
    }
  };

  const handleUpdateInstallation = async (updatedInstallation: Installation) => {
    const dbInst = mapInstallationToDB(updatedInstallation);
    const { error } = await supabase.from('installations').update(dbInst).eq('id', updatedInstallation.id);
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
      
      // Update DB with mapping
      const { error } = await supabase.from('installations').update({ 
         payment_history: newHistory, 
         paid_amount: newTotal 
      }).eq('id', installationId);

      if (!error) setInstallations(prev => prev.map(i => i.id === installationId ? { ...i, paymentHistory: newHistory, paidAmount: newTotal } : i));
    }
  };

  const handleRemovePayment = async (installationId: string, paymentId: string) => {
     const inst = installations.find(i => i.id === installationId);
     if (inst) {
       const newHistory = (inst.paymentHistory || []).filter(p => p.id !== paymentId);
       const newTotal = newHistory.reduce((sum, p) => sum + p.amount, 0);
       
       const { error } = await supabase.from('installations').update({ 
         payment_history: newHistory, 
         paid_amount: newTotal 
       }).eq('id', installationId);

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
    // 1. Check if customer exists globally
    const customer = customers.find(c => c.id === customerId);
    if (!customer) {
       showNotification('Błąd: Klient powiązany z tą instalacją nie istnieje w bazie (rekord osierocony).', 'error');
       return;
    }

    // 2. Check permissions - Admin/Office always has access
    if (currentUser?.role === UserRole.ADMIN || currentUser?.role === UserRole.OFFICE) {
       setSelectedCustomerId(customerId);
       setCurrentView('CUSTOMERS');
       return;
    }

    // 3. Check access for others
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
      // Create new customer with proper mapping
      const dbCustomer = {
        name: newClientData.name,
        address: newClientData.address,
        phone: newClientData.phone,
        email: newClientData.email || '', 
        notes: 'Klient dodany z poziomu kalkulatora PV',
        rep_id: currentUser.id, // snake_case
        offers: [offer]
      };
      
      const { data: newCust, error: custError } = await supabase.from('customers').insert([dbCustomer]).select().single();

      if (newCust && !custError) {
        const mappedNewCust = mapCustomerFromDB(newCust);
        
        // Create installation
        const newInst = {
           customerId: mappedNewCust.id,
           address: newClientData.address,
           status: InstallationStatus.NEW,
           systemSizeKw: 0,
           price: 0
        };
        const dbInst = mapInstallationToDB(newInst);
        
        const { data: insertedInst } = await supabase.from('installations').insert([dbInst]).select().single();

        setCustomers(prev => [...prev, mappedNewCust]);
        if (insertedInst) setInstallations(prev => [...prev, mapInstallationFromDB(insertedInst)]);
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
    const updateData: Partial<Installation> = {
      price: finalPrice,
      systemSizeKw,
      status: InstallationStatus.AUDIT,
      panelModel: panelItem?.name || '',
      inverterModel: inverterItem?.name || '',
      storageModel: storageItem?.name || '',
      storageSizeKw,
      mountingSystem: mountingItem?.name || '',
      trenchLength: calculatorState.trenchLength,
      notes: existingInst ? (existingInst.notes || '') + '\n' + offerNote : offerNote,
      commissionValue: offer.personalMarkup || 0
    };
    
    let newOrUpdatedInst: Installation | null = null;
    
    if (existingInst) {
       // Only update fields, keep id
       const dbUpdateData = mapInstallationToDB(updateData);
       const { data, error } = await supabase.from('installations').update(dbUpdateData).eq('id', existingInst.id).select().single();
       if (data && !error) newOrUpdatedInst = mapInstallationFromDB(data);
    } else {
       // Insert new
       const insertData = mapInstallationToDB({
          customerId, 
          address: customer.address, 
          ...updateData
       });
       const { data, error } = await supabase.from('installations').insert([insertData]).select().single();
       if (data && !error) newOrUpdatedInst = mapInstallationFromDB(data);
    }

    // FORCE LOCAL STATE UPDATE IMMEDIATELY
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

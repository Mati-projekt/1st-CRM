import React, { useState, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { 
  User, Customer, Installation, InventoryItem, Task, Message, ViewState, UserRole, 
  AppNotification, NotificationCategory, Offer, InstallationStatus, Announcement, 
  SystemSettings, CalculatorState, AppTool, PaymentEntry, NotificationType, HeatingCalculatorState, StorageCalculatorState 
} from './types';
import { Login } from './components/Login';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Installations } from './components/Installations';
import { Inventory } from './components/Inventory';
import { Applications } from './components/Applications';
import { Employees } from './components/Employees';
import { Notification } from './components/Notification';
import { InstallationCalendar } from './components/InstallationCalendar';
import { AnnouncementCreator } from './components/AnnouncementCreator';
import { AnnouncementModal } from './components/AnnouncementModal';
import { NotificationsCenter } from './components/NotificationsCenter';
import { MOCK_INVENTORY, MOCK_CUSTOMERS, MOCK_INSTALLATIONS, MOCK_USERS, MOCK_TASKS, MOCK_MESSAGES } from './constants';
import { Loader2, Sun } from 'lucide-react';

// --- MAPPING HELPERS (DB snake_case <-> App camelCase) ---

const mapProfileFromDB = (p: any): User => ({
  id: p.id,
  name: p.name || p.email, // Fallback name
  email: p.email,
  role: p.role as UserRole,
  phone: p.phone,
  // Map JSONB/Columns to User properties
  salesSettings: p.sales_settings, 
  salesCategory: p.sales_category,
  managerId: p.manager_id,
  commissionSplit: p.commission_split
});

const mapProfileToDB = (u: Partial<User>) => ({
  // id is usually handled by DB on insert, or passed on update
  name: u.name,
  email: u.email,
  role: u.role,
  phone: u.phone,
  sales_settings: u.salesSettings,
  sales_category: u.salesCategory,
  manager_id: u.managerId,
  commission_split: u.commissionSplit
});

const mapCustomerFromDB = (c: any): Customer => ({
   id: c.id,
   name: c.name,
   email: c.email,
   phone: c.phone,
   address: c.address,
   notes: c.notes,
   notesHistory: c.notes_history || [],
   repId: c.rep_id, // Map camelCase to snake_case
   files: c.files || [],
   auditPhotos: c.audit_photos || [],
   offers: c.offers || []
});

const mapCustomerToDB = (c: Customer) => ({
   id: c.id,
   name: c.name,
   email: c.email,
   phone: c.phone,
   address: c.address,
   notes: c.notes,
   notes_history: c.notesHistory, // Map camelCase to snake_case
   rep_id: c.repId, // Map camelCase to snake_case
   files: c.files,
   audit_photos: c.auditPhotos, // Map camelCase to snake_case
   offers: c.offers
});

const mapInstallationToDB = (inst: Partial<Installation>) => {
  return {
    customer_id: inst.customerId,
    address: inst.address,
    system_size_kw: inst.systemSizeKw,
    status: inst.status,
    type: inst.type, // Map Type
    price: inst.price,
    paid_amount: inst.paidAmount,
    panel_model: inst.panelModel,
    inverter_model: inst.inverterModel,
    storage_model: inst.storageModel,
    storage_size_kw: inst.storageSizeKw,
    mounting_system: inst.mountingSystem,
    trench_length: inst.trenchLength,
    commission_value: inst.commissionValue,
    date_scheduled: inst.dateScheduled,
    assigned_team: inst.assignedTeam,
    equipment_status: inst.equipmentStatus,
    notes: inst.notes,
    payment_history: inst.paymentHistory,
    commission_history: inst.commissionHistory
  };
};

const mapInstallationFromDB = (dbInst: any): Installation => {
  return {
    id: dbInst.id,
    customerId: dbInst.customer_id,
    address: dbInst.address,
    systemSizeKw: dbInst.system_size_kw,
    status: dbInst.status,
    type: dbInst.type, // Map Type
    price: dbInst.price,
    paidAmount: dbInst.paid_amount,
    panelModel: dbInst.panel_model,
    inverterModel: dbInst.inverter_model,
    storageModel: dbInst.storage_model,
    storageSizeKw: dbInst.storage_size_kw,
    mountingSystem: dbInst.mounting_system,
    trenchLength: dbInst.trench_length,
    commissionValue: dbInst.commission_value,
    dateScheduled: dbInst.date_scheduled,
    assignedTeam: dbInst.assigned_team,
    paymentHistory: dbInst.payment_history || [],
    commissionHistory: dbInst.commission_history || [],
    equipmentStatus: dbInst.equipment_status,
    notes: dbInst.notes
  };
};

// Map Inventory - Robust handling for optional fields
const mapInventoryToDB = (i: InventoryItem) => ({
  id: i.id,
  name: i.name,
  category: i.category,
  quantity: i.quantity || 0,
  min_quantity: i.minQuantity || 0,
  price: i.price || 0,
  unit: i.unit,
  warranty: i.warranty || '',
  power: i.power || null, 
  capacity: i.capacity || null,
  phases: i.phases || null,
  url: i.url || null,
  date_added: i.dateAdded || new Date().toISOString(),
  // Use undefined instead of null to prevent sending keys for missing columns
  variant: i.variant || undefined, 
  voltage_type: i.voltageType || undefined,
  inverter_type: i.inverterType || undefined,
  heat_pump_type: i.heatPumpType || undefined,
  refrigerant: i.refrigerant || undefined,
  min_operation_temp: i.minOperationTemp || undefined,
  temperature_zone: i.temperatureZone || undefined
});

const mapInventoryFromDB = (i: any): InventoryItem => ({
  id: i.id,
  name: i.name,
  category: i.category,
  quantity: i.quantity,
  minQuantity: i.min_quantity,
  price: i.price,
  unit: i.unit,
  warranty: i.warranty,
  power: i.power,
  capacity: i.capacity,
  phases: i.phases,
  url: i.url,
  dateAdded: i.date_added,
  variant: i.variant,
  voltageType: i.voltage_type,
  inverterType: i.inverter_type,
  heatPumpType: i.heat_pump_type,
  refrigerant: i.refrigerant,
  minOperationTemp: i.min_operation_temp,
  temperatureZone: i.temperature_zone
});

// Map Messages
const mapMessageFromDB = (m: any): Message => ({
  id: m.id.toString(),
  fromId: m.from_id,
  toId: m.to_id,
  content: m.content,
  date: m.created_at,
  read: m.read
});

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  // NEW: State for loading screen
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [view, setView] = useState<ViewState>('DASHBOARD');
  
  // Data States
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // App State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ cat2MarkupType: 'PERCENT', cat2MarkupValue: 5 });
  const [currentTool, setCurrentTool] = useState<AppTool>('MENU');
  const [calculatorState, setCalculatorState] = useState<CalculatorState | HeatingCalculatorState | StorageCalculatorState | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // UI State
  const [notification, setNotification] = useState<{message: string, type: NotificationType} | null>(null);
  const [pendingAnnouncement, setPendingAnnouncement] = useState<Announcement | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Load Notifications from LocalStorage on mount to persist read status
  useEffect(() => {
    const savedNotifications = localStorage.getItem('appNotifications');
    if (savedNotifications) {
      try {
        setNotifications(JSON.parse(savedNotifications));
      } catch (e) {
        console.error("Error parsing notifications", e);
      }
    }
  }, []);

  // Save Notifications to LocalStorage whenever they change
  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('appNotifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  // LOW STOCK NOTIFICATION LOGIC (FIXED)
  useEffect(() => {
    if (inventory.length === 0) return;

    setNotifications(prevNotifications => {
      let updatedNotifications = [...prevNotifications];
      let hasChanges = false;

      inventory.forEach(item => {
        // 1. Check if item is low stock
        if (item.quantity <= item.minQuantity) {
          const existingNotif = updatedNotifications.find(
            n => n.linkTo?.id === item.id && n.category === 'STOCK'
          );

          if (!existingNotif) {
            // CASE: New low stock - Create notification
            updatedNotifications.unshift({
              id: Date.now().toString() + Math.random().toString(),
              category: 'STOCK',
              title: 'Niski stan magazynowy',
              message: `Produkt ${item.name} osiągnął stan krytyczny (${item.quantity} ${item.unit}). Domów towar.`,
              date: new Date().toISOString(),
              read: false,
              linkTo: { view: 'INVENTORY', id: item.id }
            });
            hasChanges = true;
          } else if (existingNotif.read) {
            // CASE: Existing but read - check if 48 hours passed SINCE IT WAS READ (handled by resetting date on read)
            const notifDate = new Date(existingNotif.date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - notifDate.getTime());
            const diffHours = diffTime / (1000 * 60 * 60);

            if (diffHours >= 48) {
              // Renew notification: mark unread and update date to NOW
              // CRITICAL: We create a new object to trigger UI update
              const renewedNotif = {
                 ...existingNotif,
                 read: false,
                 date: new Date().toISOString(), // Update timestamp to now
                 message: `Przypomnienie: Produkt ${item.name} nadal ma niski stan (${item.quantity} ${item.unit}).`
              };
              
              // Remove old, add new at top
              updatedNotifications = updatedNotifications.filter(n => n.id !== existingNotif.id);
              updatedNotifications.unshift(renewedNotif);
              hasChanges = true;
            }
          }
        } else {
          // 2. Check if item is healthy but has lingering stock notification
          const existingIndex = updatedNotifications.findIndex(
            n => n.linkTo?.id === item.id && n.category === 'STOCK'
          );

          if (existingIndex !== -1) {
            // Remove notification if stock is replenished
            updatedNotifications.splice(existingIndex, 1);
            hasChanges = true;
          }
        }
      });

      return hasChanges ? updatedNotifications : prevNotifications;
    });
  }, [inventory]);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        handleLogin(); 
      }
    };
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // HYBRID DATA FETCHING: Try Supabase -> Fail -> Load Mocks
  // Changed dependency to currentUser.id to avoid loop on profile/settings update
  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      
      try {
        // PERFORMANCE OPTIMIZATION: Fetch all data in parallel using Promise.all
        // This avoids the "waterfall" effect where each request waits for the previous one to finish.
        // NOTE: Optimized 'customers' select to NOT fetch heavy JSONB columns (files/photos) on initial load.
        const [
          usersRes,
          customersRes,
          inventoryRes,
          installationsRes,
          messagesRes,
          settingsRes
        ] = await Promise.all([
          supabase.from('profiles').select('*'),
          // Optimizing Customer Fetch - Excluding heavy files/audit_photos for list view
          supabase.from('customers').select('id, name, email, phone, address, rep_id, notes, offers'), 
          supabase.from('inventory').select('*'),
          supabase.from('installations').select('*'),
          supabase.from('messages').select('*').or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`),
          supabase.from('system_settings').select('*').single()
        ]);

        // 1. PROFILES (Users)
        if (usersRes.error) throw usersRes.error;
        if (!usersRes.data || usersRes.data.length === 0) {
           console.warn("DB connected but empty. Seeding Mock Users...");
           setUsers(MOCK_USERS);
        } else {
           setUsers(usersRes.data.map(mapProfileFromDB));
        }

        // 2. CUSTOMERS
        if (customersRes.data) {
           // We map what we got. Note that files/auditPhotos will be empty/undefined here initially
           // ideally we would fetch them on demand when clicking a customer
           setCustomers(customersRes.data.map(mapCustomerFromDB));
        } else if (customersRes.error) {
           setCustomers(MOCK_CUSTOMERS);
        }

        // 3. INVENTORY
        if (inventoryRes.data) {
           setInventory(inventoryRes.data.map(mapInventoryFromDB));
        } else if (inventoryRes.error) {
           setInventory(MOCK_INVENTORY);
        }

        // 4. INSTALLATIONS
        if (installationsRes.data) {
           setInstallations(installationsRes.data.map(mapInstallationFromDB));
        } else if (installationsRes.error) {
           setInstallations(MOCK_INSTALLATIONS);
        }

        // 5. MESSAGES
        if (messagesRes.data && messagesRes.data.length > 0) {
           setMessages(messagesRes.data.map(mapMessageFromDB));
        } else {
           setMessages(MOCK_MESSAGES);
        }

        // 6. SYSTEM SETTINGS - FETCH FROM DB
        if (settingsRes.data) {
           setSystemSettings({
              cat2MarkupType: settingsRes.data.cat2_markup_type || 'PERCENT',
              cat2MarkupValue: settingsRes.data.cat2_markup_value || 5
           });
        } else {
           const savedSettings = localStorage.getItem('systemSettings');
           if (savedSettings) {
              setSystemSettings(JSON.parse(savedSettings));
           }
        }
        
        // 7. TASKS (Still Mock/Local for now as per previous instructions unless asked)
        setTasks(MOCK_TASKS);

      } catch (err) {
        console.error("Data Fetch Error - Falling back to MOCKS", err);
        setUsers(MOCK_USERS);
        setCustomers(MOCK_CUSTOMERS);
        setInventory(MOCK_INVENTORY);
        setInstallations(MOCK_INSTALLATIONS);
        setTasks(MOCK_TASKS);
        setMessages(MOCK_MESSAGES);
        showNotification("Błąd bazy danych. Pracujesz na danych lokalnych.", 'info');
      } finally {
        // TURN OFF LOADING SCREEN when all data is ready (or error happened)
        // Add a small artificial delay for better UX (smooth transition)
        setTimeout(() => setIsInitialLoading(false), 800);
      }
    };
    
    fetchData();
  }, [currentUser?.id]);

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type });
  };

  const handleLogin = async (fallbackUser?: User) => {
    setIsInitialLoading(true); // Start loading immediately
    
    if (fallbackUser) {
       setCurrentUser(fallbackUser);
       return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setCurrentUser(mapProfileFromDB(profile));
      } else {
        // Fallback: If auth works but profile missing (shouldn't happen with triggers)
        setCurrentUser(MOCK_USERS[0]); 
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  // --- ACTIONS HANDLERS (Supabase Integration) ---

  // ... (Previous Handlers for Customers, Inventory, Users, Settings remain same) ...
  
  // MESSAGES
  const handleSendMessage = async (msg: Message) => {
     // Optimistic update
     setMessages(prev => [...prev, msg]);
     
     try {
        const { error } = await supabase.from('messages').insert([{
           from_id: msg.fromId,
           to_id: msg.toId,
           content: msg.content,
           read: false,
           // created_at auto handled
        }]);
        if (error) throw error;
     } catch(e) {
        console.error("Error sending message", e);
        showNotification("Nie udało się wysłać wiadomości", 'error');
     }
  };

  // Notification Handlers with "Snooze" logic for STOCK
  const handleMarkAsRead = (id: string) => {
     setNotifications(prev => prev.map(n => {
        if (n.id === id) {
           // SPECIAL LOGIC: If marking STOCK as read, verify we reset date to NOW
           // This ensures the 48h timer starts from the moment user CLICKED read, not from notification creation.
           return {
              ...n,
              read: true,
              date: n.category === 'STOCK' ? new Date().toISOString() : n.date
           };
        }
        return n;
     }));
  };

  // 1. CUSTOMERS
  const handleAddCustomer = async (data: { name: string, email: string, phone: string, address: string }) => {
      const newCust: Customer = {
        id: crypto.randomUUID(),
        ...data,
        repId: currentUser?.id,
        notes: '',
        files: [],
        auditPhotos: [],
        offers: []
      };
      
      // Optimistic update
      setCustomers(prev => [...prev, newCust]);
      setSelectedCustomerId(newCust.id);
      showNotification("Klient dodany", 'success');

      try {
         // USE STANDARDIZED MAPPING FUNCTION
         const dbPayload = mapCustomerToDB(newCust);
         const { error } = await supabase.from('customers').insert([dbPayload]);
         if (error) throw error;
      } catch (e) {
         console.error("DB Error adding customer", e);
         showNotification("Błąd zapisu w bazie. Klient może zniknąć po odświeżeniu.", 'error');
      }
  };

  // 2. INVENTORY
  const handleAddInventoryItem = async (item: InventoryItem) => {
      // Optimistic Update
      setInventory(prev => [...prev, item]);
      showNotification("Dodano produkt", 'success');
      
      try {
         // Use mapped payload for DB
         // CRITICAL FIX: Add .select() to ensure we get a response and any DB constraints throw immediately
         const { error } = await supabase.from('inventory').insert([mapInventoryToDB(item)]).select();
         
         if (error) {
            throw error;
         }
      } catch (e) { 
         console.error("Error adding inventory item", e);
         // ROLLBACK Optimistic update
         setInventory(prev => prev.filter(i => i.id !== item.id));
         showNotification("Błąd zapisu w bazie! Produkt nie został dodany. Upewnij się, że baza danych ma najnowsze kolumny.", 'error'); 
      }
  };

  const handleUpdateInventoryItem = async (item: InventoryItem) => {
      setInventory(prev => prev.map(i => i.id === item.id ? item : i));
      try {
         // CRITICAL FIX: Use UPSERT instead of UPDATE
         // This ensures that if we edit a "Mock" item (which has an ID but isn't in DB yet),
         // it gets created in the DB instead of failing silently.
         const { error } = await supabase.from('inventory').upsert(mapInventoryToDB(item)).select();
         
         if (error) throw error;
      } catch(e) { 
         console.error("Error updating inventory item", e);
         showNotification("Błąd aktualizacji w bazie. Sprawdź połączenie.", 'error');
      }
  };

  // UPDATED DELETE FUNCTION
  const handleDeleteInventoryItem = async (id: string) => {
      setInventory(prev => prev.filter(i => i.id !== id));
      try {
         const { error } = await supabase.from('inventory').delete().eq('id', id);
         if (error) throw error;
         showNotification("Produkt usunięty", 'info');
      } catch (e) { 
         console.error(e); 
         showNotification("Błąd usuwania z bazy", 'error');
      }
  };

  // 3. EMPLOYEES (PROFILES)
  const handleAddUser = async (userData: Partial<User>, password?: string) => {
      const newId = crypto.randomUUID();
      const newUser: User = {
         id: newId,
         ...userData as User
      };

      setUsers(prev => [...prev, newUser]);
      showNotification("Pracownik dodany do listy", 'success');
      
      try {
         const dbPayload = mapProfileToDB(newUser);
         await supabase.from('profiles').insert([{ id: newId, ...dbPayload }]);
         
         if (password) {
            showNotification(`Utwórz konto w panelu Supabase dla: ${newUser.email}`, 'info');
         }
      } catch (e) {
         console.error("DB Error adding user", e);
         showNotification("Błąd zapisu pracownika w bazie", 'error');
      }
  };

  const handleUpdateUser = async (updatedUser: User) => {
      setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
      try {
         const dbPayload = mapProfileToDB(updatedUser);
         const { error } = await supabase.from('profiles').update(dbPayload).eq('id', updatedUser.id);
         if (error) throw error;
         showNotification("Zaktualizowano pracownika", 'success');
      } catch (e) {
         console.error(e);
         showNotification("Błąd aktualizacji w bazie", 'error');
      }
  };

  const handleDeleteUser = async (userId: string) => {
      setUsers(prev => prev.filter(u => u.id !== userId));
      try {
         await supabase.from('profiles').delete().eq('id', userId);
         showNotification("Usunięto pracownika", 'info');
      } catch (e) { console.error(e); }
  };

  // 4. SYSTEM SETTINGS
  const handleUpdateSystemSettings = async (settings: SystemSettings) => {
     setSystemSettings(settings);
     try {
        const { error } = await supabase.from('system_settings').upsert({
           id: 1, 
           cat2_markup_type: settings.cat2MarkupType,
           cat2_markup_value: settings.cat2MarkupValue
        });
        if (error) throw error;
        showNotification("Zapisano ustawienia systemu w bazie", 'success');
     } catch (e) {
        console.error("Settings Save Error", e);
        localStorage.setItem('systemSettings', JSON.stringify(settings));
        showNotification("Błąd zapisu w bazie. Zapisano lokalnie.", 'info');
     }
  };

  // 5. OFFERS & INSTALLATIONS
  const handleAcceptOffer = async (custId: string, offId: string) => {
    if (!currentUser) return;
    
    const customer = customers.find(c => c.id === custId);
    if (!customer || !customer.offers) return;

    const updatedOffers = customer.offers.map(o => o.id === offId ? { ...o, status: 'ACCEPTED' as const } : o);
    const acceptedOffer = customer.offers.find(o => o.id === offId);

    setCustomers(prev => prev.map(c => c.id === custId ? { ...c, offers: updatedOffers } : c));

    try {
       await supabase.from('customers').update({ offers: updatedOffers }).eq('id', custId);
    } catch(e) { console.error(e) }

    const existingInstallation = installations.find(i => i.customerId === custId);
    
    if (!existingInstallation && acceptedOffer) {
       let newInstallation: Partial<Installation> | null = null;

       if (acceptedOffer.type === 'HEATING' || (acceptedOffer.type as any) === 'HEAT_PUMP') {
           const calcState = acceptedOffer.calculatorState as HeatingCalculatorState;
           const device = inventory.find(i => i.id === calcState.selectedDeviceId);
           const totalCommission = (acceptedOffer.appliedMarkup || 0) + (acceptedOffer.personalMarkup || 0);

           newInstallation = {
              customerId: custId,
              address: customer.address,
              systemSizeKw: 0, 
              status: InstallationStatus.AUDIT,
              type: 'HEATING', // Explicitly Set Type
              price: acceptedOffer.finalPrice,
              paidAmount: 0,
              commissionValue: totalCommission,
              notes: `System Grzewczy: ${calcState.systemType === 'HEAT_PUMP' ? 'Pompa Ciepła' : 'Kocioł na Pellet'}. Urządzenie: ${device?.name || 'Brak'}`
           };

       } else if (acceptedOffer.type === 'ME') {
           // ENERGY STORAGE ONLY
           const calcState = acceptedOffer.calculatorState as StorageCalculatorState;
           const storage = inventory.find(i => i.id === calcState.selectedStorageId);
           const totalCommission = (acceptedOffer.appliedMarkup || 0) + (acceptedOffer.personalMarkup || 0);
           const capacity = (storage?.capacity || 0) * calcState.storageCount;

           newInstallation = {
              customerId: custId,
              address: customer.address,
              systemSizeKw: 0,
              status: InstallationStatus.AUDIT,
              type: 'ME',
              price: acceptedOffer.finalPrice,
              paidAmount: 0,
              storageModel: storage?.name,
              storageSizeKw: capacity,
              commissionValue: totalCommission,
              notes: `Magazyn Energii: ${storage?.name} x ${calcState.storageCount}. Pojemność: ${capacity} kWh.`
           };

       } else {
           // Default to PV or PV_STORAGE
           const calcState = acceptedOffer.calculatorState as CalculatorState;
       
           const panelModel = inventory.find(i => i.id === calcState.panelId)?.name || 'Standardowy Panel';
           const inverterModel = inventory.find(i => i.id === calcState.inverterId)?.name || 'Standardowy Falownik';
           const storageModel = calcState.storageId ? (inventory.find(i => i.id === calcState.storageId)?.name || 'Magazyn') : undefined;
           const storageSize = calcState.storageId ? (inventory.find(i => i.id === calcState.storageId)?.capacity || 0) * calcState.storageCount : undefined;

           const totalCommission = (acceptedOffer.appliedMarkup || 0) + (acceptedOffer.personalMarkup || 0);

           newInstallation = {
              customerId: custId,
              address: customer.address,
              systemSizeKw: calcState.consumption ? calcState.consumption / 1000 : 0, 
              status: InstallationStatus.AUDIT,
              type: acceptedOffer.type === 'PV_STORAGE' ? 'PV_STORAGE' : 'PV', // Explicit Type
              price: acceptedOffer.finalPrice,
              paidAmount: 0,
              panelModel,
              inverterModel,
              storageModel,
              storageSizeKw: storageSize,
              mountingSystem: calcState.installationType === 'ROOF' ? `Dach ${calcState.roofMaterial}` : 'Grunt',
              trenchLength: calcState.trenchLength,
              commissionValue: totalCommission 
           };
       }

       if (newInstallation) {
           const tempId = crypto.randomUUID();
           const createdInst = { 
              ...newInstallation, 
              id: tempId, 
              paymentHistory: [], 
              commissionHistory: [] 
           } as Installation;
           
           setInstallations(prev => [...prev, createdInst]);
           
           try {
              const dbPayload = mapInstallationToDB(newInstallation);
              const { data, error } = await supabase.from('installations').insert([dbPayload]).select().single();
              if (data) {
                 setInstallations(prev => prev.map(i => i.id === tempId ? mapInstallationFromDB(data) : i));
              }
           } catch (e) { console.error(e) }
           
           const notif: AppNotification = {
              id: Date.now().toString(),
              category: 'SALES',
              title: 'Nowa Sprzedaż',
              message: `Klient ${customer.name} zaakceptował ofertę na kwotę ${acceptedOffer.finalPrice.toLocaleString()} PLN.`,
              date: new Date().toISOString(),
              read: false,
              linkTo: { view: 'INSTALLATIONS' }
           };
           setNotifications(prev => [notif, ...prev]);
       }
    } 
 };

  // 6. USER SETTINGS (PERSISTENCE)
  const handleUpdateUserSettings = async (settings: any) => {
      if (!currentUser) return;
      const updatedUser = { ...currentUser, salesSettings: settings };
      setCurrentUser(updatedUser);
      
      try {
         const { error } = await supabase.from('profiles').update({
            sales_settings: settings
         }).eq('id', currentUser.id);
         if (error) throw error;
      } catch (e) {
         console.error("Error saving user settings", e);
         showNotification("Błąd zapisu ustawień w bazie", 'error');
      }
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} onLoginStart={() => setIsInitialLoading(true)} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900 relative">
      
      {/* --- NEW: Loading Overlay (Modernized) --- */}
      {isInitialLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md animate-fade-in transition-opacity duration-500">
           
           {/* Background Pulse Effect */}
           <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-[100px] animate-pulse"></div>

           <div className="relative z-10 text-center flex flex-col items-center p-8 rounded-3xl bg-white/10 border border-white/10 shadow-2xl backdrop-blur-xl">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl mb-6 animate-bounce-slow">
                 <Sun className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-3xl font-bold text-white mb-2 tracking-tight drop-shadow-sm">
                 Witaj, {currentUser.name.split(' ')[0]}!
              </h1>
              <p className="text-slate-200 text-base mb-8 font-medium">
                 Przygotowujemy Twój pulpit...
              </p>
              
              <div className="flex items-center space-x-3 bg-black/20 px-5 py-2.5 rounded-full border border-white/5">
                 <Loader2 className="w-5 h-5 text-amber-400 animate-spin" />
                 <span className="text-sm font-semibold text-white tracking-wide">Ładowanie CRM</span>
              </div>
           </div>
        </div>
      )}

      {/* Main App Content - Blurred only when loading */}
      <div className={`flex flex-1 w-full h-full transition-all duration-700 ${isInitialLoading ? 'filter blur-sm scale-[0.99] opacity-80 pointer-events-none' : 'filter-none scale-100 opacity-100'}`}>
        <Sidebar 
          currentView={view} 
          onChangeView={setView} 
          currentUser={currentUser} 
          onLogout={handleLogout}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          unreadNotifications={notifications.filter(n => !n.read).length}
        />
        
        <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full">
          {view === 'DASHBOARD' && (
            <Dashboard 
              installations={installations}
              inventory={inventory}
              customers={customers}
              onChangeView={setView}
              currentUser={currentUser}
              tasks={tasks}
              onAddTask={(t) => setTasks([...tasks, t])}
              messages={messages}
              users={users} // Pass users for messaging lookup
              onSendMessage={handleSendMessage}
              onUpdateSettings={handleUpdateUserSettings}
              onNavigateToCustomer={(id) => { setSelectedCustomerId(id); setView('CUSTOMERS'); }}
              notifications={notifications}
              onMarkAsRead={handleMarkAsRead}
              onMarkAsUnread={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, read: false} : n))}
              onMarkAllAsRead={() => setNotifications(prev => prev.map(n => ({...n, read: true, date: n.category === 'STOCK' ? new Date().toISOString() : n.date})))}
              onDeleteNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
              onNavigate={(v, id) => { setView(v); if(id && v === 'CUSTOMERS') setSelectedCustomerId(id); }}
            />
          )}

          {/* ... Other Views (Notifications, Customers, etc.) remain unchanged ... */}
          {view === 'NOTIFICATIONS' && (
             <NotificationsCenter 
                notifications={notifications}
                onMarkAsRead={handleMarkAsRead}
                onMarkAsUnread={(id) => setNotifications(prev => prev.map(n => n.id === id ? {...n, read: false} : n))}
                onMarkAllAsRead={() => setNotifications(prev => prev.map(n => ({...n, read: true, date: n.category === 'STOCK' ? new Date().toISOString() : n.date})))}
                onDeleteNotification={(id) => setNotifications(prev => prev.filter(n => n.id !== id))}
                onNavigate={(v, id) => { setView(v); if(id && v === 'CUSTOMERS') setSelectedCustomerId(id); }}
                currentUser={currentUser}
             />
          )}
          
          {view === 'CUSTOMERS' && (
            <Customers 
              customers={customers}
              installations={installations}
              users={users}
              inventory={inventory}
              currentUser={currentUser}
              onUpdateCustomer={async (c) => {
                 setCustomers(prev => prev.map(cust => cust.id === c.id ? c : cust));
                 await supabase.from('customers').update(mapCustomerToDB(c)).eq('id', c.id);
              }}
              onUpdateInstallation={async (i) => {
                 const oldInst = installations.find(inst => inst.id === i.id);
                 if (oldInst && oldInst.status === InstallationStatus.NEW && i.status !== InstallationStatus.NEW) {
                    const customerName = customers.find(c => c.id === i.customerId)?.name || 'Klient';
                    const newNotif: AppNotification = {
                       id: Date.now().toString(),
                       category: 'INSTALLATION',
                       title: 'Zmiana Statusu Instalacji',
                       message: `Klient ${customerName} przeszedł z etapu "${oldInst.status}" do "${i.status}".`,
                       date: new Date().toISOString(),
                       read: false,
                       linkTo: { view: 'CUSTOMERS', id: i.customerId }
                    };
                    setNotifications(prev => [newNotif, ...prev]);
                    showNotification(`Status klienta ${customerName} zmieniony na ${i.status}`, 'success');
                 }
                 if (i.status === InstallationStatus.PROJECT && !i.dateScheduled) {
                    const customerName = customers.find(c => c.id === i.customerId)?.name || 'Klient';
                    const newNotif: AppNotification = {
                       id: Date.now().toString() + Math.random(),
                       category: 'INSTALLATION',
                       title: 'Brak Terminu Montażu',
                       message: `Klient ${customerName} jest w fazie PROJEKT, ale nie ma ustalonej daty montażu. Ustal termin!`,
                       date: new Date().toISOString(),
                       read: false,
                       linkTo: { view: 'CUSTOMERS', id: i.customerId }
                    };
                    setNotifications(prev => [newNotif, ...prev]);
                 }
                 setInstallations(prev => prev.map(inst => inst.id === i.id ? i : inst));
                 await supabase.from('installations').update(mapInstallationToDB(i)).eq('id', i.id);
              }}
              onAddPayment={async (instId, p) => {
                 const targetInst = installations.find(inst => inst.id === instId);
                 if (!targetInst) return;
                 const updatedInst = { 
                    ...targetInst, 
                    paidAmount: targetInst.paidAmount + p.amount, 
                    paymentHistory: [...(targetInst.paymentHistory || []), p] 
                 };
                 setInstallations(prev => prev.map(inst => inst.id === instId ? updatedInst : inst));
                 try {
                    const dbPayload = mapInstallationToDB(updatedInst);
                    const { error } = await supabase.from('installations').update(dbPayload).eq('id', instId);
                    if (error) throw error;
                 } catch(e) {
                    console.error("DB Error adding payment", e);
                    showNotification("Błąd zapisu wpłaty w bazie.", "error");
                 }
              }}
              onRemovePayment={async (instId, pId) => {
                 const targetInst = installations.find(inst => inst.id === instId);
                 if (!targetInst) return;
                 const payment = targetInst.paymentHistory?.find(p => p.id === pId);
                 if (!payment) return;
                 const updatedInst = { 
                    ...targetInst, 
                    paidAmount: targetInst.paidAmount - payment.amount, 
                    paymentHistory: targetInst.paymentHistory?.filter(p => p.id !== pId) 
                 };
                 setInstallations(prev => prev.map(inst => inst.id === instId ? updatedInst : inst));
                 try {
                    const dbPayload = mapInstallationToDB(updatedInst);
                    const { error } = await supabase.from('installations').update(dbPayload).eq('id', instId);
                    if (error) throw error;
                 } catch(e) {
                    console.error("DB Error removing payment", e);
                    showNotification("Błąd zapisu usunięcia wpłaty.", "error");
                 }
              }}
              onAddCommissionPayout={async (instId, p) => {
                 const targetInst = installations.find(inst => inst.id === instId);
                 if (!targetInst) return;
                 const updatedInst = { 
                    ...targetInst, 
                    commissionHistory: [...(targetInst.commissionHistory || []), p] 
                 };
                 setInstallations(prev => prev.map(inst => inst.id === instId ? updatedInst : inst));
                 try {
                    const dbPayload = mapInstallationToDB(updatedInst);
                    const { error } = await supabase.from('installations').update(dbPayload).eq('id', instId);
                    if (error) throw error;
                 } catch(e) {
                    console.error("DB Error adding commission", e);
                    showNotification("Błąd zapisu prowizji.", "error");
                 }
              }}
              onRemoveCommissionPayout={async (instId, pId) => {
                 const targetInst = installations.find(inst => inst.id === instId);
                 if (!targetInst) return;
                 const updatedInst = { 
                    ...targetInst, 
                    commissionHistory: targetInst.commissionHistory?.filter(p => p.id !== pId) 
                 };
                 setInstallations(prev => prev.map(inst => inst.id === instId ? updatedInst : inst));
                 try {
                    const dbPayload = mapInstallationToDB(updatedInst);
                    const { error } = await supabase.from('installations').update(dbPayload).eq('id', instId);
                    if (error) throw error;
                 } catch(e) {
                    console.error("DB Error removing commission", e);
                    showNotification("Błąd usuwania prowizji.", "error");
                 }
              }}
              onShowNotification={showNotification}
              selectedCustomerId={selectedCustomerId}
              setSelectedCustomerId={setSelectedCustomerId}
              onEditOffer={(offer) => {
                 setCalculatorState(offer.calculatorState);
                 if (offer.type === 'HEATING' || 'systemType' in offer.calculatorState) {
                     setCurrentTool('CALC_HEAT');
                 } else if (offer.type === 'ME' || 'selectedStorageId' in offer.calculatorState) {
                     setCurrentTool('CALC_ME');
                 } else {
                     setCurrentTool('CALC_PV');
                 }
                 setView('APPLICATIONS');
              }}
              onAcceptOffer={handleAcceptOffer}
              onAddCustomer={handleAddCustomer}
            />
          )}

          {view === 'INSTALLATIONS' && (
            <Installations 
              installations={installations}
              customers={customers}
              users={users}
              onNavigateToCustomer={(id) => { setSelectedCustomerId(id); setView('CUSTOMERS'); }}
              onUpdateInstallation={async (i) => {
                 setInstallations(prev => prev.map(inst => inst.id === i.id ? i : inst));
                 await supabase.from('installations').update(mapInstallationToDB(i)).eq('id', i.id);
              }}
              currentUserRole={currentUser.role}
            />
          )}

          {view === 'INSTALLATION_CALENDAR' && (
             <InstallationCalendar 
                installations={installations}
                customers={customers}
                users={users}
                onNavigateToCustomer={(id) => { setSelectedCustomerId(id); setView('CUSTOMERS'); }}
                currentUser={currentUser}
             />
          )}

          {view === 'INVENTORY' && (
            <Inventory 
              inventory={inventory}
              onUpdateItem={handleUpdateInventoryItem}
              onAddItem={handleAddInventoryItem}
              onDeleteItem={handleDeleteInventoryItem}
              currentUser={currentUser}
            />
          )}

          {view === 'APPLICATIONS' && (
            <Applications 
               customers={customers}
               inventory={inventory}
               onSaveOffer={async (offer, isNewClient, newClientData) => {
                  let custId = offer.calculatorState.clientId;
                  if (isNewClient && newClientData) {
                     const newCust: Customer = {
                        id: crypto.randomUUID(),
                        name: newClientData.name,
                        email: newClientData.email,
                        phone: newClientData.phone,
                        address: newClientData.address,
                        repId: currentUser.id,
                        notes: '',
                        offers: [offer],
                        files: [],
                        auditPhotos: [],
                        notesHistory: []
                     };
                     setCustomers([...customers, newCust]);
                     custId = newCust.id;
                     try { 
                        const dbPayload = mapCustomerToDB(newCust);
                        const { error } = await supabase.from('customers').insert([dbPayload]);
                        if (error) throw error;
                     } catch(e){
                        console.error("DB Save error", e);
                        showNotification("Błąd zapisu w bazie danych", "error");
                     }
                  } else {
                     setCustomers(prev => prev.map(c => c.id === custId ? { ...c, offers: [...(c.offers || []), offer] } : c));
                     try { 
                        const c = customers.find(x => x.id === custId);
                        if (c) {
                           const updatedOffers = [...(c.offers || []), offer];
                           await supabase.from('customers').update({ offers: updatedOffers }).eq('id', custId);
                        }
                     } catch(e){}
                  }
                  showNotification('Oferta została zapisana', 'success');
               }}
               initialState={calculatorState}
               clearInitialState={() => setCalculatorState(null)}
               currentUser={currentUser}
               systemSettings={systemSettings}
               currentTool={currentTool}
               onChangeTool={setCurrentTool}
            />
          )}

          {view === 'EMPLOYEES' && (
             <Employees 
                users={users}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
                systemSettings={systemSettings}
                onUpdateSystemSettings={handleUpdateSystemSettings}
             />
          )}
          
          {view === 'ANNOUNCEMENTS' && (
             <AnnouncementCreator 
                onSave={(ann) => {
                   const newAnn = { ...ann, id: Date.now().toString(), createdAt: new Date().toISOString(), createdBy: currentUser.id };
                   setAnnouncements([newAnn, ...announcements]);
                   showNotification("Komunikat opublikowany", 'success');
                   setView('DASHBOARD');
                }}
             />
          )}

          {notification && (
            <Notification 
              message={notification.message} 
              type={notification.type} 
              onClose={() => setNotification(null)} 
            />
          )}
          
          {pendingAnnouncement && (
             <AnnouncementModal 
                announcement={pendingAnnouncement} 
                onAccept={() => setPendingAnnouncement(null)}
             />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
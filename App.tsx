
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
import { Loader2, Sun, Menu } from 'lucide-react';

const mapProfileFromDB = (p: any): User => ({
  id: p.id,
  name: p.name || p.email,
  email: p.email,
  role: p.role as UserRole,
  phone: p.phone,
  salesSettings: p.sales_settings, 
  salesCategory: p.sales_category,
  managerId: p.manager_id,
  commissionSplit: p.commission_split
});

const mapProfileToDB = (u: Partial<User>) => ({
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
   repId: c.rep_id,
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
   notes_history: c.notesHistory,
   rep_id: c.repId,
   files: c.files,
   audit_photos: c.auditPhotos,
   offers: c.offers
});

const mapInstallationToDB = (inst: Partial<Installation>) => {
  return {
    customer_id: inst.customerId,
    address: inst.address,
    system_size_kw: inst.systemSizeKw,
    status: inst.status,
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
    type: dbInst.type,
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
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false);
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [installations, setInstallations] = useState<Installation[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({ cat2MarkupType: 'PERCENT', cat2MarkupValue: 5 });
  const [currentTool, setCurrentTool] = useState<AppTool>('MENU');
  const [calculatorState, setCalculatorState] = useState<CalculatorState | HeatingCalculatorState | StorageCalculatorState | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{message: string, type: NotificationType} | null>(null);
  const [pendingAnnouncement, setPendingAnnouncement] = useState<Announcement | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  useEffect(() => {
    if (notifications.length > 0) {
      localStorage.setItem('appNotifications', JSON.stringify(notifications));
    }
  }, [notifications]);

  useEffect(() => {
    if (inventory.length === 0) return;
    setNotifications(prevNotifications => {
      let updatedNotifications = [...prevNotifications];
      let hasChanges = false;
      inventory.forEach(item => {
        if (item.quantity <= item.minQuantity) {
          const existingNotif = updatedNotifications.find(n => n.linkTo?.id === item.id && n.category === 'STOCK');
          if (!existingNotif) {
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
            const notifDate = new Date(existingNotif.date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - notifDate.getTime());
            const diffHours = diffTime / (1000 * 60 * 60);
            if (diffHours >= 48) {
              const renewedNotif = {
                 ...existingNotif,
                 read: false,
                 date: new Date().toISOString(),
                 message: `Przypomnienie: Produkt ${item.name} nadal ma niski stan (${item.quantity} ${item.unit}).`
              };
              updatedNotifications = updatedNotifications.filter(n => n.id !== existingNotif.id);
              updatedNotifications.unshift(renewedNotif);
              hasChanges = true;
            }
          }
        } else {
          const existingIndex = updatedNotifications.findIndex(n => n.linkTo?.id === item.id && n.category === 'STOCK');
          if (existingIndex !== -1) {
            updatedNotifications.splice(existingIndex, 1);
            hasChanges = true;
          }
        }
      });
      return hasChanges ? updatedNotifications : prevNotifications;
    });
  }, [inventory]);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { handleLogin(); }
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) { setCurrentUser(null); }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!currentUser) return;
      try {
        const [usersRes, customersRes, inventoryRes, installationsRes, messagesRes, settingsRes] = await Promise.all([
          supabase.from('profiles').select('*'),
          supabase.from('customers').select('*'), 
          supabase.from('inventory').select('*'),
          supabase.from('installations').select('*'),
          supabase.from('messages').select('*').or(`from_id.eq.${currentUser.id},to_id.eq.${currentUser.id}`),
          supabase.from('system_settings').select('*').single()
        ]);

        if (usersRes.error) throw usersRes.error;
        if (!usersRes.data || usersRes.data.length === 0) {
           console.warn("DB connected but empty. Seeding Mock Users...");
           setUsers(MOCK_USERS);
        } else {
           setUsers(usersRes.data.map(mapProfileFromDB));
        }

        if (customersRes.data) setCustomers(customersRes.data.map(mapCustomerFromDB));
        else if (customersRes.error) setCustomers(MOCK_CUSTOMERS);

        if (inventoryRes.data) setInventory(inventoryRes.data.map(mapInventoryFromDB));
        else if (inventoryRes.error) setInventory(MOCK_INVENTORY);

        if (installationsRes.data) setInstallations(installationsRes.data.map(mapInstallationFromDB));
        else if (installationsRes.error) setInstallations(MOCK_INSTALLATIONS);

        if (messagesRes.data && messagesRes.data.length > 0) setMessages(messagesRes.data.map(mapMessageFromDB));
        else setMessages(MOCK_MESSAGES);

        if (settingsRes.data) {
           setSystemSettings({ cat2MarkupType: settingsRes.data.cat2_markup_type || 'PERCENT', cat2MarkupValue: settingsRes.data.cat2_markup_value || 5 });
        } else {
           const savedSettings = localStorage.getItem('systemSettings');
           if (savedSettings) setSystemSettings(JSON.parse(savedSettings));
        }
        
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
        setTimeout(() => setIsInitialLoading(false), 800);
      }
    };
    fetchData();
  }, [currentUser?.id]);

  const showNotification = (message: string, type: NotificationType = 'info') => {
    setNotification({ message, type });
  };

  const handleLogin = async (fallbackUser?: User) => {
    setIsInitialLoading(true);
    if (fallbackUser) { setCurrentUser(fallbackUser); return; }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      let { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
      if (!profile && user.email) {
         const { data: profileByEmail } = await supabase.from('profiles').select('*').eq('email', user.email).maybeSingle();
         if (profileByEmail) profile = profileByEmail;
      }
      if (profile) {
        setCurrentUser(mapProfileFromDB(profile));
      } else {
        console.warn("Profile not found in DB. Creating temp session.");
        const tempUser: User = {
           id: user.id,
           name: user.user_metadata?.name || user.email?.split('@')[0] || 'Użytkownik',
           email: user.email || '',
           role: UserRole.SALES,
           salesSettings: { marginType: 'PERCENT', marginPV: 8, marginHeat: 10, marginStorage: 8, marginPellet: 8 },
           salesCategory: '1',
           commissionSplit: 50
        };
        setCurrentUser(tempUser);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  const handleSendMessage = async (msg: Message) => {
     setMessages(prev => [...prev, msg]);
     try {
        const { error } = await supabase.from('messages').insert([{
           from_id: msg.fromId,
           to_id: msg.toId,
           content: msg.content,
           read: false,
        }]);
        if (error) throw error;
     } catch(e) {
        console.error("Error sending message", e);
        showNotification("Nie udało się wysłać wiadomości", 'error');
     }
  };

  const handleMarkAsRead = (id: string) => {
     setNotifications(prev => prev.map(n => {
        if (n.id === id) {
           return {
              ...n,
              read: true,
              date: n.category === 'STOCK' ? new Date().toISOString() : n.date
           };
        }
        return n;
     }));
  };

  const handleAddCustomer = async (data: { name: string, email: string, phone: string, address: string }) => {
      const newCust: Customer = { id: crypto.randomUUID(), ...data, repId: currentUser?.id, notes: '', files: [], auditPhotos: [], offers: [] };
      setCustomers(prev => [...prev, newCust]);
      setSelectedCustomerId(newCust.id);
      showNotification("Klient dodany", 'success');
      try {
         const dbPayload = mapCustomerToDB(newCust);
         const { error } = await supabase.from('customers').insert([dbPayload]);
         if (error) throw error;
      } catch (e) {
         console.error("DB Error adding customer", e);
         showNotification("Błąd zapisu w bazie. Klient może zniknąć po odświeżeniu.", 'error');
      }
  };

  const handleAddInventoryItem = async (item: InventoryItem) => {
      setInventory(prev => [...prev, item]);
      showNotification("Dodano produkt", 'success');
      try {
         const { error } = await supabase.from('inventory').insert([mapInventoryToDB(item)]).select();
         if (error) throw error;
      } catch (e) { 
         console.error("Error adding inventory item", e);
         setInventory(prev => prev.filter(i => i.id !== item.id));
         showNotification("Błąd zapisu w bazie!", 'error'); 
      }
  };

  const handleUpdateInventoryItem = async (item: InventoryItem) => {
      setInventory(prev => prev.map(i => i.id === item.id ? item : i));
      try {
         const { error } = await supabase.from('inventory').upsert(mapInventoryToDB(item)).select();
         if (error) throw error;
      } catch(e) { 
         console.error("Error updating inventory item", e);
         showNotification("Błąd aktualizacji w bazie.", 'error');
      }
  };

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

  const handleAddUser = async (userData: Partial<User>, password?: string) => {
      const newId = crypto.randomUUID();
      const newUser: User = { id: newId, ...userData as User };
      setUsers(prev => [...prev, newUser]);
      showNotification("Pracownik dodany do listy", 'success');
      try {
         const dbPayload = mapProfileToDB(newUser);
         await supabase.from('profiles').insert([{ id: newId, ...dbPayload }]);
         if (password) showNotification(`Utwórz konto w panelu Supabase dla: ${newUser.email}`, 'info');
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

  const handleUpdateSystemSettings = async (settings: SystemSettings) => {
     setSystemSettings(settings);
     try {
        const { error } = await supabase.from('system_settings').upsert({ id: 1, cat2_markup_type: settings.cat2MarkupType, cat2_markup_value: settings.cat2MarkupValue });
        if (error) throw error;
        showNotification("Zapisano ustawienia systemu w bazie", 'success');
     } catch (e) {
        console.error("Settings Save Error", e);
        localStorage.setItem('systemSettings', JSON.stringify(settings));
        showNotification("Błąd zapisu w bazie. Zapisano lokalnie.", 'info');
     }
  };

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
           const totalCommission = (Number(acceptedOffer.appliedMarkup) || 0) + (Number(acceptedOffer.personalMarkup) || 0);

           newInstallation = {
              customerId: custId,
              address: customer.address,
              systemSizeKw: 0, 
              status: InstallationStatus.AUDIT,
              type: 'HEATING', 
              price: acceptedOffer.finalPrice,
              paidAmount: 0,
              commissionValue: totalCommission,
              notes: `System Grzewczy: ${calcState.systemType === 'HEAT_PUMP' ? 'Pompa Ciepła' : 'Kocioł na Pellet'}. Urządzenie: ${device?.name || 'Brak'}`
           };

       } else if (acceptedOffer.type === 'ME') {
           const calcState = acceptedOffer.calculatorState as StorageCalculatorState;
           const storage = inventory.find(i => i.id === calcState.selectedStorageId);
           const totalCommission = (Number(acceptedOffer.appliedMarkup) || 0) + (Number(acceptedOffer.personalMarkup) || 0);
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
           const calcState = acceptedOffer.calculatorState as CalculatorState;
       
           const panelItem = inventory.find(i => i.id === calcState.panelId);
           const panelModel = panelItem?.name || 'Standardowy Panel';
           const inverterModel = inventory.find(i => i.id === calcState.inverterId)?.name || 'Standardowy Falownik';
           
           const storageItem = calcState.storageId ? inventory.find(i => i.id === calcState.storageId) : undefined;
           const storageModel = storageItem ? storageItem.name : (calcState.storageId ? 'Magazyn Energii' : undefined);
           
           let storageSize = 0;
           if (calcState.storageId) {
               const capacity = storageItem?.capacity || 5; 
               const count = calcState.storageCount || 1;
               storageSize = capacity * count;
           }

           const totalCommission = (Number(acceptedOffer.appliedMarkup) || 0) + (Number(acceptedOffer.personalMarkup) || 0);
           
           const panelPower = panelItem?.power || 400;
           const systemSizeKw = (panelPower * calcState.panelCount) / 1000;

           newInstallation = {
              customerId: custId,
              address: customer.address,
              systemSizeKw: systemSizeKw,
              status: InstallationStatus.AUDIT,
              type: storageSize > 0 ? 'PV_STORAGE' : 'PV',
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

       if (newInstallation && (newInstallation.commissionValue === undefined || isNaN(newInstallation.commissionValue))) {
          newInstallation.commissionValue = 0;
       }

       if (newInstallation) {
           const tempId = crypto.randomUUID();
           const createdInst: Installation = { 
              id: tempId, 
              status: InstallationStatus.AUDIT,
              paymentHistory: [], 
              commissionHistory: [], 
              equipmentStatus: {
                 panelsPicked: false,
                 inverterPicked: false,
                 storagePicked: false,
                 mountingPicked: false
              },
              ...newInstallation
           } as Installation;
           
           setInstallations(prev => [...prev, createdInst]);
           
           try {
              const dbPayload = mapInstallationToDB(createdInst);
              const { data, error } = await supabase.from('installations').insert([dbPayload]).select().single();
              if (error) throw error;
              if (data) {
                 setInstallations(prev => prev.map(i => i.id === tempId ? mapInstallationFromDB(data) : i));
              }
           } catch (e: any) { 
              console.error("Installation Creation Error:", e);
              showNotification(`Błąd tworzenia instalacji w bazie: ${e.message || 'Nieznany błąd'}`, 'error');
           }
           
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

  const handleUpdateUserSettings = async (settings: any) => {
      if (!currentUser) return;
      const updatedUser = { ...currentUser, salesSettings: settings };
      setCurrentUser(updatedUser);
      try {
         const { error } = await supabase.from('profiles').update({ sales_settings: settings }).eq('id', currentUser.id);
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
      {isInitialLoading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/40 backdrop-blur-md animate-fade-in transition-opacity duration-500">
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
           
           <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 z-30 shadow-sm">
              <div className="flex items-center space-x-3">
                 <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white p-1.5 rounded-lg shadow-md">
                    <Sun className="w-5 h-5" />
                 </div>
                 <span className="font-bold text-slate-800 text-lg tracking-wide">Family CRM</span>
              </div>
              <button 
                 onClick={() => setIsSidebarOpen(true)} 
                 className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                 <Menu className="w-6 h-6" />
              </button>
           </div>

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
              users={users} 
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
              currentUser={currentUser}
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

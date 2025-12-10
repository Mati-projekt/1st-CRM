
import { Customer, Installation, InstallationStatus, InventoryItem, ProductCategory, User, UserRole, Task, Message } from "./types";

export const MOCK_USERS: User[] = [
  { id: 'admin1', name: 'Adam Administrator', role: UserRole.ADMIN, email: 'admin@solarcrm.pl', salesSettings: { marginType: 'PERCENT', marginPV: 8, marginHeat: 10, marginStorage: 5 } },
  { id: 'sales1', name: 'Hubert Handlowiec', role: UserRole.SALES, email: 'handlowiec@solarcrm.pl', salesSettings: { marginType: 'PERCENT', marginPV: 10, marginHeat: 12, marginStorage: 8 } },
  { id: 'team1', name: 'Marek Montażysta', role: UserRole.INSTALLER, email: 'ekipa1@solarcrm.pl' },
  { id: 'office1', name: 'Beata Biurowa', role: UserRole.OFFICE, email: 'biuro@solarcrm.pl' },
];

export const MOCK_TASKS: Task[] = [
  { id: 't1', title: 'Spotkanie z klientem Jan Kowalski', date: '2023-11-20', completed: false, assignedTo: 'sales1', createdBy: 'sales1' },
  { id: 't2', title: 'Przygotować ofertę dla firmy Budex', date: '2023-11-21', completed: false, assignedTo: 'sales1', createdBy: 'admin1' },
  { id: 't3', title: 'Dosłać zdjęcia audytu - Zielona 5', date: '2023-11-19', completed: true, assignedTo: 'sales1', createdBy: 'team1' },
];

export const MOCK_MESSAGES: Message[] = [
  { id: 'm1', fromId: 'office1', toId: 'sales1', content: 'Cześć Hubert, pamiętaj o fakturze dla Kowalskiego.', date: '2023-11-18 09:00', read: true },
  { id: 'm2', fromId: 'sales1', toId: 'ADMIN', content: 'Proszę o zatwierdzenie rabatu dla Budexu.', date: '2023-11-18 10:30', read: false },
];

export const MOCK_CUSTOMERS: Customer[] = [
  { 
    id: '1', 
    name: 'Jan Kowalski', 
    email: 'jan.kowalski@example.com', 
    phone: '+48 500 100 100', 
    address: 'Ul. Słoneczna 12, 05-500 Piaseczno', 
    notes: 'Klient zainteresowany pompą ciepła w przyszłości.',
    repId: 'sales1', 
    files: [],
    auditPhotos: [],
    offers: []
  },
  { 
    id: '2', 
    name: 'Anna Nowak', 
    email: 'anna.nowak@example.com', 
    phone: '+48 600 200 200', 
    address: 'Ul. Zielona 5, 30-001 Kraków', 
    notes: 'Dach płaski, wymaga ekierki.',
    repId: 'admin1',
    offers: []
  },
  { 
    id: '3', 
    name: 'Firma Budex Sp. z o.o.', 
    email: 'biuro@budex.pl', 
    phone: '+48 700 300 300', 
    address: 'Ul. Przemysłowa 10, 80-001 Gdańsk', 
    notes: 'Instalacja na gruncie.',
    repId: 'sales1',
    offers: []
  },
  { 
    id: '4', 
    name: 'Piotr Wiśniewski', 
    email: 'piotr.w@example.com', 
    phone: '+48 505 606 707', 
    address: 'Ul. Leśna 3, 10-100 Olsztyn', 
    notes: '',
    repId: 'admin1',
    offers: []
  },
];

export const MOCK_INVENTORY: InventoryItem[] = [
  // PANELE
  { id: 'p1', name: 'Jinko Tiger Neo 440W N-Type', category: ProductCategory.PANEL, quantity: 200, minQuantity: 50, price: 460, unit: 'szt.', power: 440, warranty: '25 lat', dateAdded: '2023-10-01T10:00:00Z', variant: 'STANDARD' },
  { id: 'p2', name: 'Longi Solar Hi-MO 6 435W', category: ProductCategory.PANEL, quantity: 200, minQuantity: 40, price: 450, unit: 'szt.', power: 435, warranty: '15 lat', dateAdded: '2023-11-10T16:50:00Z', variant: 'STANDARD' },
  { id: 'p3', name: 'Jinko 475W Bifacial', category: ProductCategory.PANEL, quantity: 50, minQuantity: 20, price: 520, unit: 'szt.', power: 475, warranty: '30 lat', dateAdded: '2023-12-05T10:00:00Z', variant: 'BIFACIAL' },
  
  // FALOWNIKI STANDARDOWE (Sieciowe)
  { id: 'i1', name: 'FoxESS 3.0 (1F) Standard', category: ProductCategory.INVERTER, quantity: 5, minQuantity: 2, price: 3000, unit: 'szt.', warranty: '12 lat', power: 3, phases: 1, dateAdded: '2023-10-05T12:30:00Z', inverterType: 'NETWORK' },
  { id: 'i2', name: 'FoxESS 5.0 (3F) Standard', category: ProductCategory.INVERTER, quantity: 10, minQuantity: 5, price: 4000, unit: 'szt.', warranty: '12 lat', power: 5, phases: 3, dateAdded: '2023-10-06T09:15:00Z', inverterType: 'NETWORK' },
  { id: 'i3', name: 'FoxESS 8.0 (3F) Standard', category: ProductCategory.INVERTER, quantity: 8, minQuantity: 3, price: 4800, unit: 'szt.', warranty: '12 lat', power: 8, phases: 3, dateAdded: '2023-10-06T09:15:00Z', inverterType: 'NETWORK' },
  { id: 'i4', name: 'FoxESS 10.0 (3F) Standard', category: ProductCategory.INVERTER, quantity: 12, minQuantity: 5, price: 5200, unit: 'szt.', warranty: '12 lat', power: 10, phases: 3, dateAdded: '2023-10-06T09:15:00Z', inverterType: 'NETWORK' },
  { id: 'i5', name: 'FoxESS 15.0 (3F) Standard', category: ProductCategory.INVERTER, quantity: 4, minQuantity: 2, price: 6500, unit: 'szt.', warranty: '12 lat', power: 15, phases: 3, dateAdded: '2023-10-06T09:15:00Z', inverterType: 'NETWORK' },
  { id: 'i6', name: 'FoxESS 20.0 (3F) Standard', category: ProductCategory.INVERTER, quantity: 2, minQuantity: 1, price: 7500, unit: 'szt.', warranty: '12 lat', power: 20, phases: 3, dateAdded: '2023-10-06T09:15:00Z', inverterType: 'NETWORK' },

  // FALOWNIKI HYBRYDOWE
  { id: 'ih1', name: 'FoxESS H3-5.0 Hybrid', category: ProductCategory.INVERTER, quantity: 5, minQuantity: 2, price: 6500, unit: 'szt.', warranty: '12 lat', power: 5, phases: 3, dateAdded: '2023-10-07T09:15:00Z', inverterType: 'HYBRID' },
  { id: 'ih2', name: 'FoxESS H3-8.0 Hybrid', category: ProductCategory.INVERTER, quantity: 5, minQuantity: 2, price: 7800, unit: 'szt.', warranty: '12 lat', power: 8, phases: 3, dateAdded: '2023-10-07T09:15:00Z', inverterType: 'HYBRID' },
  { id: 'ih3', name: 'FoxESS H3-10.0 Hybrid', category: ProductCategory.INVERTER, quantity: 8, minQuantity: 2, price: 8500, unit: 'szt.', warranty: '12 lat', power: 10, phases: 3, dateAdded: '2023-10-07T09:15:00Z', inverterType: 'HYBRID' },
  { id: 'ih4', name: 'FoxESS H3-12.0 Hybrid', category: ProductCategory.INVERTER, quantity: 4, minQuantity: 2, price: 9200, unit: 'szt.', warranty: '12 lat', power: 12, phases: 3, dateAdded: '2023-10-07T09:15:00Z', inverterType: 'HYBRID' },

  // MAGAZYNY ENERGII
  { id: 's1', name: 'FoxESS ECS 5.76 kWh (Master+Slave)', category: ProductCategory.ENERGY_STORAGE, quantity: 10, minQuantity: 2, price: 7500, unit: 'kpl.', warranty: '10 lat', power: 5, capacity: 5.76, dateAdded: '2023-11-01T08:45:00Z' },
  { id: 's2', name: 'FoxESS ECS 11.52 kWh (Master+3xSlave)', category: ProductCategory.ENERGY_STORAGE, quantity: 5, minQuantity: 1, price: 13500, unit: 'kpl.', warranty: '10 lat', power: 10, capacity: 11.52, dateAdded: '2023-11-01T08:45:00Z' },
  { id: 's3', name: 'FoxESS ECS 14.4 kWh (Master+4xSlave)', category: ProductCategory.ENERGY_STORAGE, quantity: 3, minQuantity: 1, price: 17500, unit: 'kpl.', warranty: '10 lat', power: 10, capacity: 14.4, dateAdded: '2023-11-01T08:45:00Z' },
  { id: 's4', name: 'FoxESS ECS 20.16 kWh (2xStack)', category: ProductCategory.ENERGY_STORAGE, quantity: 2, minQuantity: 1, price: 23500, unit: 'kpl.', warranty: '10 lat', power: 10, capacity: 20.16, dateAdded: '2023-11-01T08:45:00Z' },

  // SYSTEMY MONTAŻOWE
  { id: 'm1', name: 'Konstrukcja na dach skośny (Dachówka)', category: ProductCategory.ACCESSORIES, quantity: 100, minQuantity: 10, price: 120, unit: 'szt.', warranty: '10 lat', dateAdded: '2023-09-25T11:10:00Z' },
  { id: 'm2', name: 'Konstrukcja na dach skośny (Blacha/Trapez)', category: ProductCategory.ACCESSORIES, quantity: 100, minQuantity: 10, price: 100, unit: 'szt.', warranty: '10 lat', dateAdded: '2023-09-25T11:10:00Z' },
  { id: 'm3', name: 'Ekierki dach płaski (15 stopni)', category: ProductCategory.ACCESSORIES, quantity: 50, minQuantity: 5, price: 200, unit: 'szt.', warranty: '10 lat', dateAdded: '2023-09-25T11:10:00Z' },
  { id: 'm4', name: 'Konstrukcja Gruntowa 2-podporowa', category: ProductCategory.ACCESSORIES, quantity: 20, minQuantity: 2, price: 400, unit: 'szt.', warranty: '15 lat', dateAdded: '2023-09-25T11:10:00Z' },

  // AKCESORIA
  { id: 'a1', name: 'Kabel solarny 6mm2', category: ProductCategory.ADDONS, quantity: 500, minQuantity: 200, price: 4, unit: 'mb', warranty: '5 lat', dateAdded: '2023-09-20T14:20:00Z' },
  { id: 'a2', name: 'Złączki MC4 (Para)', category: ProductCategory.ADDONS, quantity: 200, minQuantity: 50, price: 8, unit: 'szt.', warranty: '2 lata', dateAdded: '2023-10-15T13:05:00Z' },
  { id: 'a3', name: 'Skrzynka AC/DC (Zabezpieczenia)', category: ProductCategory.ADDONS, quantity: 15, minQuantity: 5, price: 800, unit: 'szt.', warranty: '2 lata', dateAdded: '2023-10-15T13:05:00Z' },
  // ADDONS FOR CALCULATOR
  { id: 'ems1', name: 'System EMS (Zarządzanie Energią)', category: ProductCategory.ADDONS, quantity: 10, minQuantity: 2, price: 1500, unit: 'szt.', warranty: '2 lata', dateAdded: '2023-12-01T10:00:00Z' },
  { id: 'ups1', name: 'System UPS (Zasilanie Awaryjne)', category: ProductCategory.ADDONS, quantity: 5, minQuantity: 1, price: 2500, unit: 'szt.', warranty: '2 lata', dateAdded: '2023-12-01T10:00:00Z' },
];

export const MOCK_INSTALLATIONS: Installation[] = [
  { 
    id: '101', 
    customerId: '1', 
    address: 'Ul. Słoneczna 12, 05-500 Piaseczno', 
    systemSizeKw: 5.5, 
    status: InstallationStatus.PROJECT, 
    dateScheduled: '2023-11-15', 
    assignedTeam: 'team1', 
    price: 25000, 
    paidAmount: 5000,
    paymentHistory: [
      { id: 'p1', date: '2023-10-01', amount: 5000, recordedBy: 'Beata Biurowa' }
    ]
  },
  { 
    id: '102', 
    customerId: '2', 
    address: 'Ul. Zielona 5, 30-001 Kraków', 
    systemSizeKw: 9.8, 
    status: InstallationStatus.NEW, 
    notes: 'Czeka na audyt', 
    price: 0, 
    paidAmount: 0,
    paymentHistory: []
  },
  { 
    id: '103', 
    customerId: '3', 
    address: 'Ul. Przemysłowa 10, 80-001 Gdańsk', 
    systemSizeKw: 49.5, 
    status: InstallationStatus.INSTALLATION, 
    dateScheduled: '2023-10-28', 
    assignedTeam: 'team1', 
    price: 120000, 
    paidAmount: 120000,
    paymentHistory: [
      { id: 'p2', date: '2023-09-01', amount: 60000, recordedBy: 'Beata Biurowa' },
      { id: 'p3', date: '2023-10-20', amount: 60000, recordedBy: 'Beata Biurowa' }
    ]
  },
  { 
    id: '104', 
    customerId: '4', 
    address: 'Ul. Leśna 3, 10-100 Olsztyn', 
    systemSizeKw: 6.0, 
    status: InstallationStatus.GRID_CONNECTION, 
    notes: 'Zgłoszenie wysłane 2 dni temu', 
    price: 30000, 
    paidAmount: 25000,
    paymentHistory: [
      { id: 'p4', date: '2023-10-15', amount: 25000, recordedBy: 'Adam Administrator' }
    ]
  },
];
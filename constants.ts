
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
    repId: 'sales1', // Assigned to Hubert
    files: [
      { id: 'f1', name: 'Umowa_wstępna.pdf', type: 'application/pdf', dateUploaded: '2023-10-01' },
      { id: 'f2', name: 'Rzut_dachu.pdf', type: 'application/pdf', dateUploaded: '2023-10-02' }
    ],
    auditPhotos: [
      { id: 'ap1', name: 'Dach_poludnie.jpg', type: 'image/jpeg', dateUploaded: '2023-10-03' },
      { id: 'ap2', name: 'Skrzynka_elektryczna.jpg', type: 'image/jpeg', dateUploaded: '2023-10-03' }
    ],
    offers: []
  },
  { 
    id: '2', 
    name: 'Anna Nowak', 
    email: 'anna.nowak@example.com', 
    phone: '+48 600 200 200', 
    address: 'Ul. Zielona 5, 30-001 Kraków', 
    notes: 'Dach płaski, wymaga ekierki.',
    repId: 'admin1', // Assigned to Admin
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
  { id: '1', name: 'Jinko Tiger Neo', category: ProductCategory.PANEL, quantity: 120, minQuantity: 50, price: 450, unit: 'szt.', power: 440, warranty: '25 lat', url: 'https://example.com/jinko-panel', dateAdded: '2023-10-01T10:00:00Z' },
  { id: '2', name: 'Huawei SUN2000-5KTL', category: ProductCategory.INVERTER, quantity: 4, minQuantity: 5, price: 3200, unit: 'szt.', warranty: '10 lat', power: 5, url: 'https://example.com/huawei-inverter', dateAdded: '2023-10-05T12:30:00Z' },
  { id: '3', name: 'Huawei SUN2000-10KTL', category: ProductCategory.INVERTER, quantity: 12, minQuantity: 5, price: 4500, unit: 'szt.', warranty: '10 lat', power: 10, dateAdded: '2023-10-06T09:15:00Z' },
  { id: '4', name: 'Kabel solarny 6mm2', category: ProductCategory.ACCESSORIES, quantity: 500, minQuantity: 200, price: 4, unit: 'mb', warranty: '5 lat', dateAdded: '2023-09-20T14:20:00Z' },
  { id: '5', name: 'System montażowy dachówka', category: ProductCategory.ACCESSORIES, quantity: 15, minQuantity: 20, price: 1200, unit: 'kpl.', warranty: '10 lat', dateAdded: '2023-09-25T11:10:00Z' },
  { id: '6', name: 'FoxESS ECS 2900', category: ProductCategory.ENERGY_STORAGE, quantity: 2, minQuantity: 3, price: 15600, unit: 'szt.', warranty: '10 lat', power: 2.8, capacity: 5.76, url: 'https://example.com/foxess-storage', dateAdded: '2023-11-01T08:45:00Z' },
  { id: '7', name: 'Longi Solar Hi-MO 6', category: ProductCategory.PANEL, quantity: 30, minQuantity: 100, price: 420, unit: 'szt.', power: 435, warranty: '15 lat', dateAdded: '2023-11-10T16:50:00Z' },
  { id: '8', name: 'Złączki MC4', category: ProductCategory.ADDONS, quantity: 200, minQuantity: 50, price: 5, unit: 'szt.', warranty: '2 lata', dateAdded: '2023-10-15T13:05:00Z' },
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

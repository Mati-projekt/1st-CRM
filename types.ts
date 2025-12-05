
export enum InstallationStatus {
  NEW = 'Nowy',
  AUDIT = 'Audyt',
  CONTRACT = 'Umowa',
  PROJECT = 'Projekt',
  INSTALLATION = 'Montaż',
  GRID_CONNECTION = 'Zgłoszenie OSD',
  GRANT_APPLICATION = 'Zgłoszenie do dotacji',
  COMPLETED = 'Zakończone'
}

export enum ProductCategory {
  PANEL = 'Panele PV',
  INVERTER = 'Falowniki',
  ENERGY_STORAGE = 'Magazyny Energii',
  ACCESSORIES = 'Akcesoria',
  ADDONS = 'Dodatki'
}

export enum UserRole {
  ADMIN = 'ADMINISTRATOR',
  SALES = 'HANDLOWIEC',
  INSTALLER = 'MONTAŻYSTA',
  OFFICE = 'BIURO'
}

export interface SalesSettings {
  marginType: 'PERCENT' | 'FIXED';
  marginPV: number;
  marginHeat: number;
  marginStorage: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  salesSettings?: SalesSettings;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  assignedTo: string; // User ID
  createdBy: string; // User ID
}

export interface Message {
  id: string;
  fromId: string;
  toId: string; // 'OFFICE' | 'ADMIN' | specific User ID
  content: string;
  date: string;
  read: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  dateUploaded: string;
  url?: string; // Preview URL for images
}

export type RoofType = 'DACHOWKA' | 'BLACHA' | 'PLASKI' | 'GRUNT';

export type TariffType = 'G11' | 'G12' | 'G12w' | 'C11' | 'C12a' | 'C12b';

export interface CalculatorState {
  step: number;
  
  // Step 1: Client
  clientId: string | 'ANON';
  isNewClient: boolean;
  newClientData: {
    name: string;
    address: string;
    phone: string;
  };

  // Step 2: Energy
  tariff: TariffType;
  consumption: number;
  connectionPower: number; // Moc przyłączeniowa in kW
  pricePerKwh: number; // Treated as Peak Price (Strefa dzienna/I)
  priceOffPeak?: number; // Optional, for dual zone (Strefa nocna/II)
  percentOffPeak?: number; // % of usage in off-peak zone (0-100)
  
  // Step 3: Core Components
  panelId: string;
  panelCount: number;
  inverterId: string;
  storageId: string;
  storageCount: number;

  // Step 4: Mounting & Addons
  roofType: RoofType;
  trenchLength: number; // for Ground
  mountingSystemId: string; // From inventory
  hasEMS: boolean;
  hasUPS: boolean;

  // Step 5: Financials
  subsidyMojPrad: boolean; 
  subsidyCzystePowietrze: boolean;
  taxRelief: 'NONE' | '12' | '32'; 
}

export interface Offer {
  id: string;
  name: string;
  dateCreated: string;
  finalPrice: number;
  calculatorState: CalculatorState;
  status?: 'DRAFT' | 'ACCEPTED'; // Track if offer was accepted
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  repId?: string; // ID of the Sales Rep who owns this customer
  files?: UploadedFile[];
  auditPhotos?: UploadedFile[];
  offers?: Offer[];
}

export interface InventoryItem {
  id: string;
  name: string;
  category: ProductCategory;
  quantity: number;
  minQuantity: number;
  price: number;
  unit: string;
  warranty: string;
  power?: number;   // Optional (Panels & Energy Storage)
  capacity?: number; // New field (Energy Storage, in kWh)
  url?: string;     // URL to supplier/shop
  dateAdded?: string; // ISO Date string
}

export interface PaymentEntry {
  id: string;
  date: string;
  amount: number;
  recordedBy: string; // Name of the user who added it
  comment?: string; // Optional description (e.g. Zaliczka)
}

export interface Installation {
  id: string;
  customerId: string;
  address: string;
  systemSizeKw: number;
  status: InstallationStatus;
  dateScheduled?: string;
  assignedTeam?: string; // Can match User ID for installers
  notes?: string;
  
  // Hardware details from accepted offer
  panelModel?: string;
  inverterModel?: string;
  storageModel?: string;
  storageSizeKw?: number; // Capacity in kWh
  mountingSystem?: string; // e.g. "Dachówka - K2 System"
  trenchLength?: number; // Only for Ground

  // Payment tracking
  price: number;       // Total contract value
  paidAmount: number;  // Amount paid so far
  paymentHistory?: PaymentEntry[];
}

export type ViewState = 'DASHBOARD' | 'CUSTOMERS' | 'INSTALLATIONS' | 'INVENTORY' | 'APPLICATIONS' | 'SALES_ROOM';

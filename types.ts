

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
  SALES_MANAGER = 'KIEROWNIK SPRZEDAŻY',
  SALES = 'HANDLOWIEC',
  INSTALLER = 'MONTAŻYSTA',
  OFFICE = 'BIURO'
}

export interface SalesSettings {
  location?: string;
  marginType?: 'PERCENT' | 'FIXED';
  marginPV: number;      // Fixed amount in PLN or Percent
  marginHeat: number;    // Fixed amount in PLN or Percent
  marginStorage: number; // Fixed amount in PLN or Percent
}

export interface SystemSettings {
  cat2MarkupType: 'PERCENT' | 'FIXED';
  cat2MarkupValue: number;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  salesSettings?: SalesSettings;
  salesCategory?: '1' | '2';
  managerId?: string;
}

export interface Task {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  assignedTo: string;
  createdBy: string;
}

export interface Message {
  id: string;
  fromId: string;
  toId: string;
  content: string;
  date: string;
  read: boolean;
}

export interface UploadedFile {
  id: string;
  name: string;
  type: string;
  dateUploaded: string;
  url?: string;
}

export type TariffType = 'G11' | 'G12' | 'G12w' | 'C11' | 'C12a' | 'C12b';

// Updated Calculator Types
export type InstallationType = 'ROOF' | 'GROUND';
export type RoofSlope = 'FLAT' | 'PITCHED';
export type RoofMaterial = 'DACHOWKA' | 'BLACHA' | 'BLACHODACHOWKA' | 'PAPA' | 'GONTY' | 'TRAPEZ';
export type Orientation = 'SOUTH' | 'EAST_WEST';

export interface CalculatorState {
  step: number;
  
  // Step 1: Client
  clientId: string | 'ANON';
  isNewClient: boolean;
  newClientData: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };

  // Step 2: Energy
  tariff: TariffType;
  phases: 1 | 3; // New: 1-phase or 3-phase
  consumption: number;
  connectionPower: number;
  pricePerKwh: number;
  priceOffPeak?: number;
  percentOffPeak?: number;
  
  // Step 3: Core Components
  panelId: string;
  panelCount: number;
  inverterId: string;
  storageId: string;
  storageCount: number;
  connectionPowerWarningAccepted: boolean; // New: User explicit acceptance

  // Step 4: Mounting & Addons
  installationType: InstallationType; // New
  roofSlope?: RoofSlope; // New
  roofMaterial?: RoofMaterial; // New
  trenchLength: number; // Only for Ground
  mountingSystemId: string;
  orientation: Orientation; // New
  
  hasEMS: boolean;
  hasUPS: boolean;

  // Step 5: Financials
  subsidyMojPradPV: boolean; // Changed: Specific for PV 
  subsidyMojPradStorage: boolean; // Changed: Specific for Storage
  subsidyCzystePowietrze: boolean;
  taxRelief: 'NONE' | '12' | '32'; 
}

export interface Offer {
  id: string;
  name: string;
  dateCreated: string;
  finalPrice: number;
  calculatorState: CalculatorState;
  status?: 'DRAFT' | 'ACCEPTED';
  appliedMarkup?: number;
  personalMarkup?: number; // New: Track personal margin
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  repId?: string;
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
  power?: number;   // kW for Inverters/Storage, W for Panels
  capacity?: number; // kWh
  phases?: 1 | 3; // New: For Inverters
  url?: string;
  dateAdded?: string;
}

export interface PaymentEntry {
  id: string;
  date: string;
  amount: number;
  recordedBy: string;
  comment?: string;
}

export interface Installation {
  id: string;
  customerId: string;
  address: string;
  systemSizeKw: number;
  status: InstallationStatus;
  dateScheduled?: string;
  assignedTeam?: string;
  notes?: string;
  
  panelModel?: string;
  inverterModel?: string;
  storageModel?: string;
  storageSizeKw?: number;
  mountingSystem?: string;
  trenchLength?: number;

  price: number;
  paidAmount: number;
  paymentHistory?: PaymentEntry[];
  
  commissionValue?: number; // New field to track solidified commission
}

export type ViewState = 'DASHBOARD' | 'CUSTOMERS' | 'INSTALLATIONS' | 'INVENTORY' | 'APPLICATIONS' | 'EMPLOYEES';
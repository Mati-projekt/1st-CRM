

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

export type AppTool = 'MENU' | 'PRESENTATION' | 'CALC_PV' | 'CALC_ME' | 'CALC_PV_WIND' | 'CALC_HEAT';

export interface SalesSettings {
  location?: string;
  marginType?: 'PERCENT' | 'FIXED';
  marginPV: number;      // Fixed amount in PLN or Percent
  marginHeat: number;    // Fixed amount in PLN or Percent
  marginStorage: number; // Fixed amount in PLN or Percent
  showRoiChart?: boolean; // Toggle for ROI Chart visibility
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
  phone?: string; // Added phone to User interface
  salesSettings?: SalesSettings;
  salesCategory?: '1' | '2';
  managerId?: string;
  commissionSplit?: number; // % of margin paid to user
}

export type TaskType = 'CALL' | 'MEETING' | 'TODO';

export interface Task {
  id: string;
  title: string;
  date: string;
  completed: boolean;
  assignedTo: string;
  createdBy: string;
  // Extended fields
  type?: TaskType;
  description?: string;
  customerName?: string;
  phone?: string;
  address?: string;
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
  calcMode: 'BILL_AMOUNT' | 'ANNUAL_KWH'; // New field for switching modes
  tariff: TariffType;
  phases: 1 | 3; 
  consumption: number; // Calculated or Entered manually depending on mode
  connectionPower: number;
  pricePerKwh: number;
  priceOffPeak?: number;
  percentOffPeak?: number;
  
  currentBillAmount: number;
  billingPeriod: '1' | '2' | '3' | '6' | '12'; // Months

  // Step 3: Core Components
  panelId: string;
  panelCount: number;
  inverterId: string;
  storageId: string;
  storageCount: number;
  connectionPowerWarningAccepted: boolean; 

  // Step 4: Mounting & Addons
  installationType: InstallationType; 
  roofSlope?: RoofSlope; 
  roofMaterial?: RoofMaterial; 
  trenchLength: number; 
  mountingSystemId: string;
  orientation: Orientation; 
  
  hasEMS: boolean;
  hasUPS: boolean;

  // Step 5: Financials
  subsidyMojPradPV: boolean; 
  subsidyMojPradStorage: boolean; 
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
  personalMarkup?: number; 
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
  phases?: 1 | 3; 
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
  
  commissionValue?: number;
  commissionHistory?: PaymentEntry[]; // History of commission payouts

  equipmentStatus?: {
    panelsPicked: boolean;
    inverterPicked: boolean;
    storagePicked: boolean;
    mountingPicked: boolean;
  };
}

export type ViewState = 'DASHBOARD' | 'CUSTOMERS' | 'INSTALLATIONS' | 'INVENTORY' | 'APPLICATIONS' | 'EMPLOYEES';
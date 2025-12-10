
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
  HEAT_PUMP = 'Pompy Ciepła',
  BOILER = 'Kotły',
  HEATING_ACCESSORY = 'Akcesoria Grzewcze',
  ACCESSORIES = 'Akcesoria PV',
  ADDONS = 'Dodatki',
  SERVICE = 'Usługi'
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
  marginHybrid?: number; // New: Fixed amount for PV + Storage combo
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
  customerId?: string; // Links task to a specific customer profile
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
  category?: string; // Added for Audit Categories
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
  forceHybrid?: boolean; // New field: Allow user to force hybrid inverter without storage

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

export interface HeatingCalculatorState {
  step: number;
  systemType: 'HEAT_PUMP' | 'GAS' | 'PELLET' | 'OTHER';
  mode: 'QUICK_QUOTE' | 'AUDIT';
  
  // Client (shared with PV logic structure for consistency)
  clientId: string | 'ANON';
  isNewClient: boolean;
  newClientData: {
    name: string;
    address: string;
    phone: string;
    email: string;
  };

  // Building Data
  address: string;
  lat?: number;
  lon?: number;
  avgTemp?: number;
  
  buildingType: 'NEW' | 'OLD' | 'RETROFIT' | 'FLAT_ROOF' | 'PITCHED_ROOF';
  yearBuilt?: number;
  area?: number;
  
  // Dimensions for advanced calculation
  dimensions: {
     A: number;
     B: number;
     C: number;
     D: number;
  };
  
  hasBasement: boolean;
  ventilation: 'GRAVITY' | 'MECHANICAL' | 'RECUPERATION';
  
  // Thermal details
  heatedArea: number; // m2
  roomHeight: number; // m
  
  // Insulation
  wallMaterial: string;
  wallThickness: number; // mm
  wallInsulation: string;
  wallInsulationThickness: number; // mm
  
  atticInsulation: string;
  atticInsulationThickness: number; // mm
  
  floorInsulation: string;
  floorInsulationThickness: number; // mm
  
  // Windows & Doors
  glazingType: 'OLD_SINGLE' | 'OLD_DOUBLE' | 'NEW_DOUBLE' | 'NEW_TRIPLE';
  glazingArea: number; // m2
  
  doors: { type: string, width: number, height: number, count: number }[];
  
  // Heating System
  emitterType: 'RADIATORS' | 'UNDERFLOOR' | 'MIXED' | 'RAD_LOW' | 'RAD_HIGH';
  targetTemp: number; // 21 C
  
  // CWU
  hasCWU: boolean;
  occupants: number;
  dailyWaterUsage: number; // L per person
  startWaterTemp: number;
  endWaterTemp: number; // 45-55 C
  
  // Results / Selection
  calculatedHeatingPower: number; // kW
  selectedProducer: string;
  selectedHeatPumpId: string;
  selectedTankId: string;
  selectedBufferId: string;
  selectedServices: string[];
}

export interface Offer {
  id: string;
  name: string;
  dateCreated: string;
  finalPrice: number;
  type?: 'PV' | 'HEAT_PUMP'; // Added type discriminator
  calculatorState: CalculatorState;
  status?: 'DRAFT' | 'ACCEPTED';
  appliedMarkup?: number;
  personalMarkup?: number; 
}

export interface CustomerNote {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  date: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  notes: string; // Keep for legacy/summary
  notesHistory?: CustomerNote[]; // Structured history
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
  power?: number;   // kW for Inverters/Storage/HeatPumps, W for Panels
  capacity?: number; // kWh
  phases?: 1 | 3; 
  url?: string;
  dateAdded?: string;
  variant?: 'STANDARD' | 'BIFACIAL'; // For panels
  voltageType?: 'HV' | 'LV'; // For Inverters/Storage
  inverterType?: 'NETWORK' | 'HYBRID'; // For Inverters
  
  // Specific Heat Pump Fields
  heatPumpType?: 'AIR_WATER' | 'GROUND' | 'WATER_WATER' | 'AIR_AIR';
  refrigerant?: string; // e.g. R290, R32
  minOperationTemp?: number; // e.g. -25
  temperatureZone?: 'LOW' | 'HIGH';
}

export interface PaymentEntry {
  id: string;
  date: string;
  amount: number;
  recordedBy: string;
  comment?: string;
  attachments?: UploadedFile[]; // Added support for files (invoices, confirmations)
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

export type NotificationCategory = 'SALES' | 'STOCK' | 'FINANCE' | 'INSTALLATION' | 'MESSAGE';

export interface AppNotification {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  date: string;
  read: boolean;
  linkTo?: { view: ViewState, id?: string };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  targetRoles: string[]; // 'ALL' or specific UserRole
  createdBy?: string;
  createdAt: string;
}

export type ViewState = 'DASHBOARD' | 'CUSTOMERS' | 'INSTALLATIONS' | 'INVENTORY' | 'APPLICATIONS' | 'EMPLOYEES' | 'NOTIFICATIONS' | 'INSTALLATION_CALENDAR' | 'ANNOUNCEMENTS';

export type NotificationType = 'success' | 'info' | 'error';

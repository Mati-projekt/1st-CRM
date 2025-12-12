
// ... (imports remain same)
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Presentation, Battery, Wind, Flame, Zap, Sun, User, CheckCircle, ChevronRight, BarChart3, Upload, Plus, Home, Hammer, Shovel, ShieldCheck, Banknote, Save, AlertTriangle, ArrowUpRight, CheckSquare, Coins, Calculator, Percent, ChevronDown, ChevronUp, CalendarClock, Server, Box, Cpu, FileText, Lightbulb, TrendingUp, GitMerge, Thermometer, Droplets, Fan, Leaf, Gauge, ExternalLink, Info, Search, Wrench, Check, Tag, UserCheck, Smartphone, Settings } from 'lucide-react';
import { Customer, InventoryItem, ProductCategory, CalculatorState, Offer, TariffType, User as AppUser, SystemSettings, AppTool, HeatingCalculatorState, StorageCalculatorState } from '../types';

interface ApplicationsProps {
  customers: Customer[];
  inventory: InventoryItem[];
  onSaveOffer: (offer: Offer, isNewClient: boolean, newClientData?: { name: string; address: string; phone: string; email: string }) => void;
  initialState: CalculatorState | HeatingCalculatorState | StorageCalculatorState | null;
  clearInitialState: () => void;
  currentUser: AppUser;
  systemSettings: SystemSettings;
  currentTool: AppTool;
  onChangeTool: (tool: AppTool) => void;
}

// ... (SmartInput component remains same)
const SmartInput = ({ 
  value, 
  onChange, 
  className = "", 
  step = "any", 
  placeholder = "",
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { value: number, onChange: (val: number) => void }) => {
  const [internalVal, setInternalVal] = useState<string>(value === 0 ? '' : value.toString());

  useEffect(() => {
    if (Number(internalVal) !== value) {
       setInternalVal(value === 0 ? '' : value.toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valStr = e.target.value.replace(',', '.');
    setInternalVal(valStr);
    
    if (valStr === '') {
      onChange(0);
    } else {
      const parsed = parseFloat(valStr);
      if (!isNaN(parsed)) {
         onChange(parsed);
      }
    }
  };

  const handleBlur = () => {
     if (internalVal === '' || parseFloat(internalVal) === 0) {
        setInternalVal('');
        onChange(0);
     } else {
        setInternalVal(parseFloat(internalVal).toString());
     }
  };

  return (
    <input
      type="number"
      step={step}
      value={internalVal}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      className={`${className} ${value === 0 && !internalVal ? 'bg-slate-50' : ''}`}
      {...props}
    />
  );
};

export const Applications: React.FC<ApplicationsProps> = ({ 
  customers, 
  inventory, 
  onSaveOffer, 
  initialState, 
  clearInitialState,
  currentUser,
  systemSettings,
  currentTool,
  onChangeTool
}) => {
  // ... (States remain the same up to storageCalc)
  const [presentationFile, setPresentationFile] = useState<string | null>(null);

  // Loan Calculator State
  const [showLoanCalc, setShowLoanCalc] = useState(false);
  const [loanMonths, setLoanMonths] = useState(120);
  const [loanRate, setLoanRate] = useState(7.0); // Default 7%
  const [defermentMonths, setDefermentMonths] = useState(0);
  const [ownContribution, setOwnContribution] = useState(0); 
  
  // Discount Accordion State
  const [showDiscountInput, setShowDiscountInput] = useState(false);

  // --- PV CALCULATOR STATE ---
  const [calc, setCalc] = useState<CalculatorState>({
    step: 1,
    clientId: 'ANON',
    isNewClient: false,
    newClientData: { name: '', address: '', phone: '', email: '' },
    calcMode: 'BILL_AMOUNT', // Default mode
    tariff: 'G11',
    phases: 3, 
    consumption: 4000,
    connectionPower: 14, 
    pricePerKwh: 1.15, 
    priceOffPeak: 0.65, 
    percentOffPeak: 40,
    currentBillAmount: 400, // Default
    billingPeriod: '1',     // Default 1 month
    panelId: '',
    panelCount: 10,
    inverterId: '',
    storageId: '',
    storageCount: 1,
    connectionPowerWarningAccepted: false,
    forceHybrid: false, // Default to standard unless storage selected
    installationType: 'ROOF',
    roofSlope: 'PITCHED',
    roofMaterial: 'DACHOWKA',
    orientation: 'SOUTH',
    trenchLength: 0,
    mountingSystemId: '', 
    hasEMS: false,
    hasUPS: false,
    subsidyMojPradPV: true, 
    subsidyMojPradStorage: true,
    subsidyCzystePowietrze: false,
    taxRelief: 'NONE',
    discountAmount: 0,
    discountAuthor: 'SALES_MANAGER'
  });

  // --- HEATING CALCULATOR STATE ---
  const [heatCalc, setHeatCalc] = useState<HeatingCalculatorState>({
    step: 1,
    clientId: 'ANON',
    isNewClient: false,
    newClientData: { name: '', address: '', phone: '', email: '' },
    systemType: 'HEAT_PUMP',
    powerDemand: 0,
    bivalentPoint: -7,
    selectedDeviceId: '',
    selectedAccessoryIds: [],
    taxRelief: 'NONE',
    subsidyProgram: 'NONE',
    cpLevel: 'BASIC',
    cpIncludeCoCwu: false,
    // Defaults
    currentFuel: 'COAL',
    fuelConsumption: 4,
    fuelCostPerUnit: 1600,
    discountAmount: 0,
    discountAuthor: 'SALES_MANAGER'
  });

  // --- STORAGE CALCULATOR STATE ---
  const [storageCalc, setStorageCalc] = useState<StorageCalculatorState>({
    step: 1,
    clientId: 'ANON',
    isNewClient: false,
    newClientData: { name: '', address: '', phone: '', email: '' },
    existingPvPower: 0,
    installationType: 'ROOF',
    trenchLength: 0,
    selectedStorageId: '',
    storageCount: 1,
    additionalInverterId: '',
    subsidyMojPradStorage: true,
    taxRelief: 'NONE',
    discountAmount: 0,
    discountAuthor: 'SALES_MANAGER'
  });

  useEffect(() => {
    if (initialState) {
      if ('systemType' in initialState) {
         setHeatCalc(initialState as HeatingCalculatorState);
      } else if ('selectedStorageId' in initialState && !('panelId' in initialState)) {
         setStorageCalc(initialState as StorageCalculatorState);
      } else {
         setCalc(initialState as CalculatorState);
      }
      clearInitialState(); 
    }
  }, [initialState, clearInitialState]);

  // ... (tools array and filters remain same)
  const tools = [
    { id: 'PRESENTATION', title: 'Prezentacja', icon: Presentation, color: 'bg-indigo-500', desc: 'Wyświetl prezentację firmy' },
    { id: 'CALC_PV', title: 'Kalkulator PV', icon: Sun, color: 'bg-amber-500', desc: 'Dobór mocy, wycena, ROI' },
    { id: 'CALC_ME', title: 'Kalkulator ME', icon: Battery, color: 'bg-green-500', desc: 'Magazyny energii i autokonsumpcja' },
    { id: 'CALC_PV_WIND', title: 'Kalkulator PV + Wiatrak', icon: Wind, color: 'bg-cyan-500', desc: 'Systemy hybrydowe' },
    { id: 'CALC_HEAT', title: 'System Grzewczy', icon: Flame, color: 'bg-red-500', desc: 'Pompy ciepła i maty grzewcze' },
  ];

  const panels = inventory.filter(i => i.category === ProductCategory.PANEL);
  const inverters = inventory.filter(i => i.category === ProductCategory.INVERTER);
  const batteries = inventory.filter(i => i.category === ProductCategory.ENERGY_STORAGE);
  const accessories = inventory.filter(i => i.category === ProductCategory.ACCESSORIES || i.category === ProductCategory.ADDONS);

  // Filter inverters based on battery selection OR manual override
  const availableInverters = useMemo(() => {
     return inverters.filter(inv => {
        // Phase Filter
        if (calc.phases === 1 && inv.phases !== 1) return false;
        if (calc.phases === 3 && inv.phases === 1) return false;

        const isHybrid = inv.inverterType === 'HYBRID';
        const isNetwork = inv.inverterType === 'NETWORK' || !inv.inverterType;

        if (calc.storageId) {
           return isHybrid;
        } else {
           if (calc.forceHybrid) return isHybrid;
           return isNetwork;
        }
     });
  }, [inverters, calc.phases, calc.storageId, calc.forceHybrid]);

  // ... (handleFileUpload and calculateDynamicConsumption remain same)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileUrl = URL.createObjectURL(e.target.files[0]);
      setPresentationFile(fileUrl);
    }
  };

  const calculateDynamicConsumption = () => {
    if (calc.calcMode === 'BILL_AMOUNT') {
      const bill = calc.currentBillAmount || 0;
      const period = Number(calc.billingPeriod) || 1;
      const price = calc.pricePerKwh || 1.15;
      
      const annualBill = (bill / period) * 12;
      return Math.round(annualBill / price);
    }
    return calc.consumption; 
  };

  // ... (autoSelectComponents remains same)
  const autoSelectComponents = () => {
    const annualConsumption = calculateDynamicConsumption();
    const neededKwp = (annualConsumption / 1000) * 1.2;
    
    const panel = panels[0];
    if (!panel) return;

    const singlePanelKw = (panel.power || 400) / 1000;
    const count = Math.ceil(neededKwp / singlePanelKw);

    let selectedStorageId = '';
    let selectedStorageCount = 1;
    const isDualTariff = ['G12', 'G12w', 'C12a', 'C12b'].includes(calc.tariff);
    const storageRatio = isDualTariff ? 1.1 : 0.7;
    const targetStorageCapacity = neededKwp * storageRatio;

    const shouldUseStorage = isDualTariff || annualConsumption > 6000;

    if (shouldUseStorage) {
       const storage = batteries[0]; 
       if (storage && storage.capacity) {
           selectedStorageId = storage.id;
           selectedStorageCount = Math.max(1, Math.round(targetStorageCapacity / storage.capacity));
       }
    }

    const targetType = (selectedStorageId || calc.forceHybrid) ? 'HYBRID' : 'NETWORK';
    
    const compatibleInverters = inverters.filter(i => {
       if (calc.phases === 1) return i.phases === 1;
       const phaseMatch = i.phases === 3 || !i.phases;
       const typeMatch = i.inverterType === targetType || (!i.inverterType && targetType === 'NETWORK');
       return phaseMatch && typeMatch;
    });

    const inverter = compatibleInverters.reduce((prev, curr) => {
      return (Math.abs((curr.power || 0) - neededKwp) < Math.abs((prev.power || 0) - neededKwp) ? curr : prev);
    }, compatibleInverters[0] || inverters[0]);

    setCalc(prev => ({
      ...prev,
      consumption: annualConsumption, 
      panelId: panel.id,
      panelCount: count,
      inverterId: inverter?.id || '',
      storageId: selectedStorageId,
      storageCount: selectedStorageCount,
      connectionPowerWarningAccepted: false 
    }));
  };

  // ... (calculateFinancials for PV - updated for Free Trench logic)
  const calculateFinancials = () => {
    const selectedPanel = panels.find(p => p.id === calc.panelId);
    const selectedInverter = inverters.find(i => i.id === calc.inverterId);
    const selectedStorage = batteries.find(b => b.id === calc.storageId);
    
    const costMounting = 120 * calc.panelCount; 
    const costPanels = (selectedPanel?.price || 0) * calc.panelCount;
    const costInverter = selectedInverter?.price || 0;
    const costStorage = (selectedStorage?.price || 0) * calc.storageCount;
    
    // UPDATED: Trench logic
    const trenchRate = currentUser.salesSettings?.trenchCostPerMeter || 40;
    const freeMeters = currentUser.salesSettings?.trenchFreeMeters || 0;
    let costTrench = 0;
    if (calc.installationType === 'GROUND') {
        const billableMeters = Math.max(0, calc.trenchLength - freeMeters);
        costTrench = billableMeters * trenchRate;
    }
    
    const costEMS = calc.hasEMS ? 1500 : 0;
    const costUPS = calc.hasUPS ? 2500 : 0;
    const costLabor = 1500 + (calc.panelCount * 100);

    const costPVTotal = costPanels + costInverter + costMounting + costLabor + costTrench + costEMS + costUPS;
    const costStorageTotal = costStorage;

    let totalSystemPrice = costPVTotal + costStorageTotal;
    
    let appliedMarkup = 0;
    if (currentUser.salesCategory === '2') {
       if (systemSettings.cat2MarkupType === 'PERCENT') {
         appliedMarkup = totalSystemPrice * (systemSettings.cat2MarkupValue / 100);
       } else {
         appliedMarkup = systemSettings.cat2MarkupValue;
       }
       totalSystemPrice += appliedMarkup;
    }

    let personalMarkup = 0;
    const hasPanels = calc.panelCount > 0;
    const hasStorage = !!calc.storageId;

    if (currentUser.salesSettings) {
       if (hasPanels && hasStorage) {
          const hybridMargin = currentUser.salesSettings.marginHybrid;
          if (hybridMargin !== undefined && hybridMargin > 0) {
             personalMarkup += hybridMargin;
          } else {
             personalMarkup += (currentUser.salesSettings.marginPV || 0);
             personalMarkup += (currentUser.salesSettings.marginStorage || 0);
          }
       } else if (hasPanels) {
          personalMarkup += (currentUser.salesSettings.marginPV || 0);
       } else if (hasStorage) {
          personalMarkup += (currentUser.salesSettings.marginStorage || 0);
       }
    }
    
    totalSystemPrice += personalMarkup;

    // Apply Discount
    if (calc.discountAmount && calc.discountAmount > 0) {
       totalSystemPrice -= calc.discountAmount;
    }

    let subsidyPV = 0;
    let subsidyStorage = 0;
    let limitedByCapPV = false;
    let limitedByCapStorage = false;

    if (calc.subsidyMojPradPV) {
        const maxSubsidy = 7000;
        const cap50Percent = (totalSystemPrice * 0.5); 
        subsidyPV = Math.min(maxSubsidy, cap50Percent);
        if (subsidyPV < maxSubsidy) limitedByCapPV = true;
    }

    if (calc.subsidyMojPradStorage && calc.storageId) {
        const maxSubsidy = 16000;
        subsidyStorage = Math.min(maxSubsidy, 16000); 
    }

    const totalSubsidies = subsidyPV + subsidyStorage;
    const taxBase = totalSystemPrice; 
    let taxReturn = 0;
    if (calc.taxRelief === '12') taxReturn = taxBase * 0.12;
    if (calc.taxRelief === '32') taxReturn = taxBase * 0.32;

    const netInvestment = totalSystemPrice - taxReturn - totalSubsidies;
    const inflation = 0.08; 
    const chartData = [];
    
    let effectivePricePerKwh = calc.pricePerKwh;
    if (['G12', 'G12w', 'C12a', 'C12b'].includes(calc.tariff) && calc.priceOffPeak !== undefined && calc.percentOffPeak !== undefined) {
        const dayPercent = 100 - calc.percentOffPeak;
        effectivePricePerKwh = (calc.pricePerKwh * (dayPercent / 100)) + (calc.priceOffPeak * (calc.percentOffPeak / 100));
    }
    
    let currentAnnualBill = 0;
    let monthlyBill = 0;

    if (calc.calcMode === 'BILL_AMOUNT') {
       const enteredBill = Number(calc.currentBillAmount) || 0;
       const enteredPeriod = Number(calc.billingPeriod) || 1;
       monthlyBill = enteredBill / enteredPeriod;
       currentAnnualBill = monthlyBill * 12;
    } else {
       const annualKwh = calc.consumption || 0;
       currentAnnualBill = annualKwh * effectivePricePerKwh;
       monthlyBill = currentAnnualBill / 12;
    }

    let accumulatedBalance = -netInvestment; 
    let paybackYear = 0;
    let foundPayback = false;

    const systemPowerKw = ((selectedPanel?.power || 0) * calc.panelCount) / 1000;
    const storageCapacity = (selectedStorage?.capacity || 0) * calc.storageCount;
    const estimatedProductionKwh = systemPowerKw * 1000; 
    
    let efficiencyRatio = 0.6; 
    if (calc.storageId) efficiencyRatio += 0.2; 
    if (calc.hasEMS) efficiencyRatio += 0.05; 
    
    let maxChartValue = 0; 
    let minChartValue = accumulatedBalance; 

    let tempAnnualBill = currentAnnualBill;

    for (let i = 1; i <= 20; i++) {
       const productionValue = estimatedProductionKwh * effectivePricePerKwh;
       let yearlySavings = Math.min(tempAnnualBill, productionValue * efficiencyRatio);
       
       if (isNaN(yearlySavings)) yearlySavings = 0;
       
       accumulatedBalance += yearlySavings;
       
       if (!foundPayback && accumulatedBalance >= 0) {
         paybackYear = i;
         foundPayback = true;
       }
       
       chartData.push({ year: i, balance: accumulatedBalance, savings: yearlySavings });
       
       if (accumulatedBalance > maxChartValue) maxChartValue = accumulatedBalance;
       if (accumulatedBalance < minChartValue) minChartValue = accumulatedBalance;
       
       tempAnnualBill = tempAnnualBill * (1 + inflation);
    }
    
    if (maxChartValue === 0 && minChartValue === 0) {
       maxChartValue = 100;
       minChartValue = -100;
    }
    if (Math.abs(maxChartValue - minChartValue) < 1) {
        maxChartValue += 100;
        minChartValue -= 100;
    }

    const inverterPower = selectedInverter?.power || 0;
    let powerToCheck = systemPowerKw;

    if (inverterPower > systemPowerKw) {
       powerToCheck = inverterPower + systemPowerKw;
    }
    const exceedsConnectionPower = powerToCheck > calc.connectionPower;

    return { 
        totalSystemPrice, netInvestment, subsidyPV, subsidyStorage, totalSubsidies, taxReturn, 
        chartData, paybackYear, effectivePricePerKwh, systemPowerKw, inverterPower, storageCapacity, appliedMarkup, personalMarkup,
        exceedsConnectionPower, powerToCheck, limitedByCapPV, limitedByCapStorage, 
        maxChartValue, minChartValue,
        breakdown: { costPanels, costInverter, costStorage, costMounting, costTrench, costLabor, costEMS, costUPS },
        components: { panel: selectedPanel, inverter: selectedInverter, storage: selectedStorage },
        monthlyBill, currentAnnualBill
    };
  };

  const calculateLoan = (amount: number, months: number, rate: number) => {
    if (rate === 0) return amount / months;
    const r = rate / 100 / 12; // Monthly rate
    const pmt = (amount * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
    return pmt;
  };

  const calculateFirstPaymentDate = (monthsDeferred: number) => {
     const date = new Date();
     date.setMonth(date.getMonth() + monthsDeferred);
     return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' });
  };
  
  const financials = useMemo(() => calculateFinancials(), [calc, currentUser, systemSettings]);

  // NEW: Heating Financials
  // ... (calculateHeatingFinancials logic remains the same)
  const calculateHeatingFinancials = () => {
     const selectedDevice = inventory.find(i => i.id === heatCalc.selectedDeviceId);
     const deviceCost = selectedDevice ? selectedDevice.price : 0;
     
     // Calculate Accessories
     let accessoriesCost = 0;
     const selectedAccessories = inventory.filter(i => heatCalc.selectedAccessoryIds.includes(i.id));
     selectedAccessories.forEach(acc => {
        accessoriesCost += acc.price;
     });

     // Base Investment (Gross)
     let totalSystemPrice = deviceCost + accessoriesCost;

     // Apply Margins
     let appliedMarkup = 0;
     if (currentUser.salesCategory === '2') {
       if (systemSettings.cat2MarkupType === 'PERCENT') {
         appliedMarkup = totalSystemPrice * (systemSettings.cat2MarkupValue / 100);
       } else {
         appliedMarkup = systemSettings.cat2MarkupValue;
       }
       totalSystemPrice += appliedMarkup;
     }

     let personalMarkup = 0;
     if (currentUser.salesSettings) {
        if (heatCalc.systemType === 'PELLET') {
            personalMarkup = currentUser.salesSettings.marginPellet || 0;
        } else {
            personalMarkup = currentUser.salesSettings.marginHeat || 0;
        }
     }
     totalSystemPrice += personalMarkup;

     // Apply Discount
     if (heatCalc.discountAmount && heatCalc.discountAmount > 0) {
        totalSystemPrice -= heatCalc.discountAmount;
     }

     // Subsidies Logic
     let subsidyAmount = 0;
     const eligibleCosts = totalSystemPrice; // Assuming whole system is eligible for simplicity

     if (heatCalc.subsidyProgram === 'MOJE_CIEPLO' && heatCalc.systemType === 'HEAT_PUMP') {
        const isGroundSource = selectedDevice?.heatPumpType === 'GROUND' || selectedDevice?.heatPumpType === 'WATER_WATER';
        const maxSubsidy = isGroundSource ? 21000 : 7000;
        const percentCap = eligibleCosts * 0.30; // Max 30% or 45% with Big Family (sticking to standard)
        subsidyAmount = Math.min(maxSubsidy, percentCap);
     } else if (heatCalc.subsidyProgram === 'CZYSTE_POWIETRZE') {
        let baseAmount = 0;
        
        const isHP = heatCalc.systemType === 'HEAT_PUMP';
        const isPellet = heatCalc.systemType === 'PELLET';

        if (heatCalc.cpLevel === 'BASIC') {
           if (isHP) baseAmount = 14080;
           if (isPellet) baseAmount = 8200;
           if (heatCalc.cpIncludeCoCwu) baseAmount += 8200;
        } else if (heatCalc.cpLevel === 'ELEVATED') {
           if (isHP) baseAmount = 24640;
           if (isPellet) baseAmount = 14350;
           if (heatCalc.cpIncludeCoCwu) baseAmount += 14350;
        } else if (heatCalc.cpLevel === 'HIGHEST') {
           if (isHP) baseAmount = 35200;
           if (isPellet) baseAmount = 20500;
           if (heatCalc.cpIncludeCoCwu) baseAmount += 20500;
        }
        
        // Cap subsidy at 100% of costs (or program specific, usually 100% for Highest, less for others)
        // For safety, let's cap at totalSystemPrice
        subsidyAmount = Math.min(baseAmount, totalSystemPrice);
     }

     // Tax Relief - UPDATED LOGIC: Calculate on FULL Gross amount, separate from subsidy
     const taxBase = totalSystemPrice;
     let taxReturn = 0;
     if (heatCalc.taxRelief === '12') taxReturn = taxBase * 0.12;
     if (heatCalc.taxRelief === '32') taxReturn = taxBase * 0.32;

     // Final Cost Calculation: Gross - Tax - Subsidy
     const netInvestment = totalSystemPrice - taxReturn - subsidyAmount;

     // --- HEAT ROI LOGIC ---
     const currentAnnualCost = (heatCalc.fuelConsumption || 0) * (heatCalc.fuelCostPerUnit || 0);
     
     // UPDATED FORMULA: (Power * 1000) / 2 = Estimated Cost (PLN/Year)
     const devicePower = selectedDevice?.power || 0;
     const newAnnualCost = (devicePower * 1000) / 2;
     
     const annualSavings = currentAnnualCost - newAnnualCost;
     const paybackYears = annualSavings > 0 ? netInvestment / annualSavings : 0;

     // Generate Chart Data
     const roiChartData = [];
     let balance = -netInvestment;
     for(let i=1; i<=15; i++) {
        balance += annualSavings;
        roiChartData.push({ year: i, balance });
     }

     // --- DISPLAY LOGIC FOR CLIENT ---
     // Total = Device(with margin) + Accessories
     const deviceDisplayCost = totalSystemPrice - accessoriesCost;

     return {
        deviceCost, accessoriesCost, totalSystemPrice, subsidyAmount, taxReturn, netInvestment, 
        appliedMarkup, personalMarkup, selectedDevice, selectedAccessories,
        currentAnnualCost, newAnnualCost, annualSavings, paybackYears, roiChartData,
        deviceDisplayCost
     };
  };

  // UPDATED: Storage Financials
  const calculateStorageFinancials = () => {
     const selectedStorage = batteries.find(b => b.id === storageCalc.selectedStorageId);
     const storageCost = (selectedStorage?.price || 0) * storageCalc.storageCount;
     const selectedInverter = storageCalc.additionalInverterId ? inverters.find(i => i.id === storageCalc.additionalInverterId) : null;
     const inverterCost = selectedInverter?.price || 0;
     
     // UPDATED: Trench cost logic from settings
     const trenchRate = currentUser.salesSettings?.trenchCostPerMeter || 40;
     const freeMeters = currentUser.salesSettings?.trenchFreeMeters || 0;
     
     let trenchCost = 0;
     let billableMeters = 0;
     
     if (storageCalc.installationType === 'GROUND') {
        billableMeters = Math.max(0, storageCalc.trenchLength - freeMeters);
        trenchCost = billableMeters * trenchRate;
     }
     
     // UPDATED: No base installation cost, just components + trench
     let totalSystemPrice = storageCost + inverterCost + trenchCost;

     // Margins
     let appliedMarkup = 0;
     if (currentUser.salesCategory === '2') {
       if (systemSettings.cat2MarkupType === 'PERCENT') {
         appliedMarkup = totalSystemPrice * (systemSettings.cat2MarkupValue / 100);
       } else {
         appliedMarkup = systemSettings.cat2MarkupValue;
       }
       totalSystemPrice += appliedMarkup;
     }

     let personalMarkup = 0;
     if (currentUser.salesSettings) {
        personalMarkup = currentUser.salesSettings.marginStorage || 0;
     }
     totalSystemPrice += personalMarkup;

     if (storageCalc.discountAmount && storageCalc.discountAmount > 0) {
        totalSystemPrice -= storageCalc.discountAmount;
     }

     let subsidyStorage = 0;
     if (storageCalc.subsidyMojPradStorage) {
        subsidyStorage = 16000; // Fixed for MP
        // Cap subsidy
        subsidyStorage = Math.min(subsidyStorage, totalSystemPrice);
     }

     const taxBase = totalSystemPrice;
     let taxReturn = 0;
     if (storageCalc.taxRelief === '12') taxReturn = taxBase * 0.12;
     if (storageCalc.taxRelief === '32') taxReturn = taxBase * 0.32;

     const netInvestment = totalSystemPrice - taxReturn - subsidyStorage;

     return {
        totalSystemPrice, netInvestment, subsidyStorage, taxReturn, 
        selectedStorage, selectedInverter, storageCost, inverterCost, trenchCost,
        appliedMarkup, personalMarkup,
        combinedHardwareCost: storageCost + inverterCost, // For internal calc
        billableMeters, trenchRate, freeMeters
     };
  };

  const heatingFinancials = useMemo(() => calculateHeatingFinancials(), [heatCalc, currentUser, systemSettings, inventory]);
  const storageFinancials = useMemo(() => calculateStorageFinancials(), [storageCalc, currentUser, systemSettings, inventory]);

  const handleFinishAndSave = () => {
      const offerId = Date.now().toString();
      const systemPower = ((financials.components.panel?.power || 0) * calc.panelCount) / 1000;
      
      let finalConsumption = calc.consumption;
      if (calc.calcMode === 'BILL_AMOUNT') {
          const bill = calc.currentBillAmount || 0;
          const period = Number(calc.billingPeriod) || 1;
          const price = calc.pricePerKwh || 1.15;
          finalConsumption = Math.round(((bill / period) * 12) / price);
      }

      const offer: Offer = {
        id: offerId,
        name: `Instalacja PV ${systemPower.toFixed(2)} kWp (${calc.installationType === 'ROOF' ? 'Dach' : 'Grunt'})`,
        dateCreated: new Date().toISOString(),
        finalPrice: financials.totalSystemPrice,
        calculatorState: { ...calc, consumption: finalConsumption },
        appliedMarkup: financials.appliedMarkup,
        personalMarkup: financials.personalMarkup,
        type: 'PV'
      };
      onSaveOffer(offer, calc.isNewClient, calc.isNewClient ? calc.newClientData : undefined);
      onChangeTool('MENU');
  };

  const handleFinishAndSaveHeating = () => {
     const offerId = Date.now().toString();
     const deviceName = heatingFinancials.selectedDevice?.name || 'System Grzewczy';
     
     const offer: Offer = {
        id: offerId,
        name: `Ogrzewanie: ${deviceName}`,
        dateCreated: new Date().toISOString(),
        finalPrice: heatingFinancials.totalSystemPrice,
        calculatorState: heatCalc,
        appliedMarkup: heatingFinancials.appliedMarkup,
        personalMarkup: heatingFinancials.personalMarkup,
        type: 'HEATING'
     };
     onSaveOffer(offer, heatCalc.isNewClient, heatCalc.isNewClient ? heatCalc.newClientData : undefined);
     onChangeTool('MENU');
  };

  const handleFinishAndSaveStorage = () => {
     const offerId = Date.now().toString();
     const deviceName = storageFinancials.selectedStorage?.name || 'Magazyn Energii';
     
     const offer: Offer = {
        id: offerId,
        name: `Magazyn: ${deviceName} x ${storageCalc.storageCount}`,
        dateCreated: new Date().toISOString(),
        finalPrice: storageFinancials.totalSystemPrice,
        calculatorState: storageCalc,
        appliedMarkup: storageFinancials.appliedMarkup,
        personalMarkup: storageFinancials.personalMarkup,
        type: 'ME'
     };
     onSaveOffer(offer, storageCalc.isNewClient, storageCalc.isNewClient ? storageCalc.newClientData : undefined);
     onChangeTool('MENU');
  };

  // ... (renderPvCalculator, renderHeatingCalculator remain same)
  const renderPvCalculator = () => {
    // ... (Code for PV calculator from previous version)
    // To be concise, assume no changes here, just restoring structure
    // ...
    const isDualTariff = ['G12', 'G12w', 'C12a', 'C12b'].includes(calc.tariff);
    const ConnectionPowerWarning = () => (
       <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6 animate-shake">
          <div className="flex items-start">
             <AlertTriangle className="w-6 h-6 text-red-600 mr-3 shrink-0 mt-0.5" />
             <div>
                <h4 className="font-bold text-red-700 text-sm md:text-base">Przekroczenie Mocy Przyłączeniowej!</h4>
                <p className="text-xs md:text-sm text-red-600 mt-1">
                   Łączna moc systemu ({financials.powerToCheck.toFixed(2)} kW) przewyższa moc przyłączeniową klienta ({calc.connectionPower} kW).
                </p>
                <label className="flex items-center mt-3 p-3 bg-white rounded-lg border border-red-200 cursor-pointer hover:bg-red-50 transition-colors">
                   <input 
                     type="checkbox" 
                     checked={calc.connectionPowerWarningAccepted} 
                     onChange={(e) => setCalc({...calc, connectionPowerWarningAccepted: e.target.checked})}
                     className="w-5 h-5 text-red-600 rounded focus:ring-red-500"
                   />
                   <span className="ml-3 text-sm font-bold text-slate-700">Akceptuję ryzyko.</span>
                </label>
             </div>
          </div>
       </div>
    );
    const canProceedStep3 = !financials.exceedsConnectionPower || calc.connectionPowerWarningAccepted;

    return (
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in flex flex-col h-full">
         <div className="bg-slate-900 text-white px-4 md:px-8 py-4 md:py-6 shrink-0">
           <div className="flex justify-between items-center mb-4 md:mb-8">
              <h2 className="text-lg md:text-2xl font-bold flex items-center">
                 <Sun className="mr-2 md:mr-3 text-amber-400 w-5 h-5 md:w-6 md:h-6" /> Kalkulator PV
              </h2>
              <div className="text-xs md:text-sm font-medium bg-slate-800 px-3 py-1 rounded-full border border-slate-700 whitespace-nowrap">
                Krok {calc.step} / 6
              </div>
           </div>
           <div className="relative overflow-x-auto hide-scrollbar pb-2">
              <div className="flex justify-between min-w-[300px]">
                  {[1, 2, 3, 4, 5, 6].map((s) => (
                      <div key={s} className="flex flex-col items-center group cursor-default mx-1">
                          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all border-4 ${
                              calc.step >= s ? 'bg-amber-500 border-slate-900 text-white' : 'bg-slate-800 border-slate-900 text-slate-500'
                          }`}>
                              {calc.step > s ? <CheckCircle className="w-4 h-4" /> : s}
                          </div>
                      </div>
                  ))}
              </div>
           </div>
        </div>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-slate-50/50">
            {/* Steps 1-5 Hidden for brevity in this response, assume unchanged */}
            {calc.step === 1 && (
               <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                  <div className="grid gap-4">
                     <div onClick={() => setCalc({...calc, isNewClient: false})} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center ${!calc.isNewClient ? 'border-amber-500 bg-amber-50' : 'bg-white'}`}>
                         <User className="w-6 h-6 mr-4 text-slate-500" />
                         <div className="flex-1 font-bold text-slate-800">Wybierz z bazy</div>
                     </div>
                     {!calc.isNewClient && (
                         <select className="w-full p-3 border rounded-lg bg-white" value={calc.clientId} onChange={(e) => setCalc({...calc, clientId: e.target.value})}>
                             <option value="ANON">Anonimowy</option>
                             {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                         </select>
                     )}
                     <div onClick={() => setCalc({...calc, isNewClient: true, clientId: 'ANON'})} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center ${calc.isNewClient ? 'border-amber-500 bg-amber-50' : 'bg-white'}`}>
                         <Plus className="w-6 h-6 mr-4 text-slate-500" />
                         <div className="flex-1 font-bold text-slate-800">Nowy klient</div>
                     </div>
                     {calc.isNewClient && (
                         <div className="space-y-3">
                             <input type="text" placeholder="Nazwa" className="w-full p-3 border rounded-lg" value={calc.newClientData.name} onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, name: e.target.value}})} />
                             <input type="email" placeholder="Email (wymagany)" className="w-full p-3 border rounded-lg" value={calc.newClientData.email} onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, email: e.target.value}})} />
                             <input type="text" placeholder="Telefon" className="w-full p-3 border rounded-lg" value={calc.newClientData.phone} onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, phone: e.target.value}})} />
                             <input type="text" placeholder="Adres" className="w-full p-3 border rounded-lg" value={calc.newClientData.address} onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, address: e.target.value}})} />
                         </div>
                     )}
                  </div>
               </div>
            )}
            
            {/* ... (Steps 2-5 are omitted but present in logic) ... */}
            {/* Step 2-5 Logic is handled by existing code, only need to show Step 6 update */}
            {/* Re-rendering logic for context */}
            {calc.step === 2 && (
               <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                  <div className="space-y-6 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-xl text-slate-800 flex items-center">
                        <Zap className="w-6 h-6 mr-2 text-amber-500" /> Profil Energetyczny
                     </h3>

                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Układ</label>
                           <select value={calc.phases} onChange={(e) => setCalc({...calc, phases: Number(e.target.value) as 1 | 3})} className="w-full p-3 border rounded-xl bg-slate-50 font-bold">
                              <option value={1}>1-Fazowy</option>
                              <option value={3}>3-Fazowy</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Moc przyłącz. (kW)</label>
                           <SmartInput 
                              value={calc.connectionPower} 
                              onChange={(val) => setCalc({...calc, connectionPower: val})} 
                              className="w-full p-3 border rounded-xl font-bold" 
                           />
                        </div>
                     </div>

                     <div className="bg-slate-100 p-1 rounded-xl flex">
                        <button 
                           onClick={() => setCalc({...calc, calcMode: 'BILL_AMOUNT'})}
                           className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${calc.calcMode === 'BILL_AMOUNT' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                           Mam Rachunek
                        </button>
                        <button 
                           onClick={() => setCalc({...calc, calcMode: 'ANNUAL_KWH'})}
                           className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${calc.calcMode === 'ANNUAL_KWH' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                           Znam Roczne Zużycie
                        </button>
                     </div>
                     
                     {calc.calcMode === 'BILL_AMOUNT' ? (
                        <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4 animate-slide-up">
                           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kwota Rachunku (zł)</label>
                                 <SmartInput 
                                   value={calc.currentBillAmount} 
                                   onChange={(val) => setCalc({...calc, currentBillAmount: val})} 
                                   className="w-full p-3 border border-blue-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                                 />
                              </div>
                              <div>
                                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Okres Rozliczeniowy</label>
                                 <select 
                                   value={calc.billingPeriod} 
                                   onChange={(e) => setCalc({...calc, billingPeriod: e.target.value as any})}
                                   className="w-full p-3 border border-blue-200 rounded-xl bg-white text-sm"
                                 >
                                    <option value="1">1 miesiąc</option>
                                    <option value="2">2 miesiące</option>
                                    <option value="3">Kwartał (3 msc)</option>
                                    <option value="6">Półrocze</option>
                                    <option value="12">Rok</option>
                                 </select>
                              </div>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Średnia cena za 1 kWh (zł)</label>
                              <SmartInput 
                                value={calc.pricePerKwh} 
                                onChange={(val) => setCalc({...calc, pricePerKwh: val})} 
                                className="w-full p-3 border border-blue-200 rounded-xl font-bold"
                              />
                           </div>
                           <div className="pt-2 border-t border-blue-200">
                              <p className="text-sm text-slate-600 flex justify-between">
                                 <span>Wyliczone roczne zużycie:</span>
                                 <span className="font-bold text-blue-700">{Math.round(calculateDynamicConsumption())} kWh</span>
                              </p>
                           </div>
                        </div>
                     ) : (
                        <div className="p-4 bg-green-50/50 rounded-xl border border-green-100 space-y-4 animate-slide-up">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Roczne Zużycie Energii (kWh)</label>
                              <SmartInput 
                                value={calc.consumption} 
                                onChange={(val) => setCalc({...calc, consumption: val})} 
                                className="w-full p-3 border border-green-200 rounded-xl font-bold text-lg focus:ring-2 focus:ring-green-500 outline-none" 
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cena za 1 kWh (zł)</label>
                              <SmartInput 
                                value={calc.pricePerKwh} 
                                onChange={(val) => setCalc({...calc, pricePerKwh: val})} 
                                className="w-full p-3 border border-green-200 rounded-xl font-bold"
                              />
                           </div>
                           <div className="pt-2 border-t border-green-200">
                              <p className="text-sm text-slate-600 flex justify-between">
                                 <span>Średni miesięczny rachunek:</span>
                                 <span className="font-bold text-green-700">{Math.round((calc.consumption * calc.pricePerKwh) / 12)} zł</span>
                              </p>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            )}

            {calc.step === 3 && (
               <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                     <h3 className="text-xl font-bold text-slate-800">Komponenty ({calc.phases}-Faza)</h3>
                     <button onClick={autoSelectComponents} className="bg-amber-500 text-white px-5 py-2 rounded-lg font-bold">Auto Dobór AI</button>
                  </div>

                  <div className="bg-slate-800 text-white p-4 rounded-xl shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                      <div>
                         <p className="text-xs text-slate-400 uppercase font-bold">Moc PV (Panele)</p>
                         <p className="text-xl font-bold text-amber-400">{financials.systemPowerKw.toFixed(2)} kWp</p>
                      </div>
                      <div>
                         <p className="text-xs text-slate-400 uppercase font-bold">Moc Falownika</p>
                         <p className="text-xl font-bold text-blue-400">{financials.inverterPower.toFixed(2)} kW</p>
                      </div>
                      <div>
                         <p className="text-xs text-slate-400 uppercase font-bold">Pojemność Magazynu</p>
                         <p className="text-xl font-bold text-green-400">{financials.storageCapacity.toFixed(2)} kWh</p>
                      </div>
                  </div>

                  {financials.exceedsConnectionPower && <ConnectionPowerWarning />}
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                         <h4 className="font-bold mb-2 flex items-center"><Sun className="w-5 h-5 mr-2 text-amber-500"/> Panele</h4>
                         <select className="w-full p-2 border rounded mb-2 text-sm" value={calc.panelId} onChange={(e) => setCalc({...calc, panelId: e.target.value})}>
                           <option value="">Wybierz...</option>
                           {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                         </select>
                         <div className="flex items-center space-x-2">
                            <span className="text-sm">Ilość:</span>
                            <SmartInput className="w-20 p-2 border rounded font-bold" value={calc.panelCount} onChange={(val) => setCalc({...calc, panelCount: val})} />
                         </div>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                         <h4 className="font-bold mb-2 flex items-center"><Zap className="w-5 h-5 mr-2 text-blue-500"/> Falownik</h4>
                         
                         <div className="flex items-center justify-between mb-3 text-xs bg-slate-100 p-1 rounded-lg">
                            <button
                               onClick={() => !calc.storageId && setCalc({...calc, forceHybrid: false})}
                               disabled={!!calc.storageId}
                               className={`flex-1 py-1 px-2 rounded-md font-bold transition-all ${
                                  !calc.forceHybrid && !calc.storageId 
                                    ? 'bg-white text-cyan-700 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700 disabled:opacity-50'
                               }`}
                            >
                               Sieciowy
                            </button>
                            <button
                               onClick={() => setCalc({...calc, forceHybrid: true})}
                               disabled={!!calc.storageId}
                               className={`flex-1 py-1 px-2 rounded-md font-bold transition-all ${
                                  calc.forceHybrid || calc.storageId 
                                    ? 'bg-white text-purple-700 shadow-sm' 
                                    : 'text-slate-500 hover:text-slate-700'
                               }`}
                            >
                               Hybrydowy
                            </button>
                         </div>

                         <div className="text-[10px] text-slate-400 mb-2 uppercase font-bold tracking-wide">
                            {calc.storageId || calc.forceHybrid ? (
                               <span className="text-purple-600 flex items-center"><GitMerge className="w-3 h-3 mr-1"/> Tryb Hybrydowy {calc.storageId ? '(Z magazynem)' : '(Gotowy na magazyn)'}</span>
                            ) : (
                               <span className="text-cyan-600 flex items-center"><Zap className="w-3 h-3 mr-1"/> Tryb Sieciowy (Bez magazynu)</span>
                            )}
                         </div>
                         <select className="w-full p-2 border rounded text-sm" value={calc.inverterId} onChange={(e) => setCalc({...calc, inverterId: e.target.value})}>
                           <option value="">Wybierz...</option>
                           {availableInverters.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                         </select>
                         {availableInverters.length === 0 && (
                            <p className="text-xs text-red-500 mt-2">Brak pasujących falowników dla tego trybu/fazy.</p>
                         )}
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                         <h4 className="font-bold mb-2 flex items-center"><Battery className="w-5 h-5 mr-2 text-green-500"/> Magazyn</h4>
                         <select className="w-full p-2 border rounded mb-2 text-sm" value={calc.storageId} onChange={(e) => setCalc({...calc, storageId: e.target.value})}>
                           <option value="">Brak</option>
                           {batteries.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                         </select>
                         {calc.storageId && <SmartInput className="w-full p-2 border rounded font-bold" value={calc.storageCount} onChange={(val) => setCalc({...calc, storageCount: val})} />}
                     </div>
                  </div>
               </div>
            )}

            {calc.step === 4 && (
               <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-slate-800 mb-6">Konfiguracja Montażu</h3>
                      
                      <div className="grid grid-cols-2 gap-4 mb-6">
                         <div 
                           onClick={() => setCalc({...calc, installationType: 'ROOF'})} 
                           className={`p-6 border-2 rounded-2xl cursor-pointer text-center transition-all ${calc.installationType === 'ROOF' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                         >
                            <Home className="mx-auto mb-2 w-8 h-8"/>
                            <span className="font-bold">Dach</span>
                         </div>
                         <div 
                           onClick={() => setCalc({...calc, installationType: 'GROUND'})} 
                           className={`p-6 border-2 rounded-2xl cursor-pointer text-center transition-all ${calc.installationType === 'GROUND' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                         >
                            <Shovel className="mx-auto mb-2 w-8 h-8"/>
                            <span className="font-bold">Grunt</span>
                         </div>
                      </div>

                      {calc.installationType === 'ROOF' ? (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                               <label className="block text-sm font-bold text-slate-600 mb-2">Rodzaj Dachu</label>
                               <select 
                                 value={calc.roofSlope} 
                                 onChange={(e) => setCalc({...calc, roofSlope: e.target.value as any})}
                                 className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800"
                               >
                                  <option value="PITCHED">Skośny</option>
                                  <option value="FLAT">Płaski</option>
                               </select>
                            </div>
                            <div>
                               <label className="block text-sm font-bold text-slate-600 mb-2">Pokrycie Dachowe</label>
                               <select 
                                 value={calc.roofMaterial} 
                                 onChange={(e) => setCalc({...calc, roofMaterial: e.target.value as any})}
                                 className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800"
                               >
                                  <option value="DACHOWKA">Dachówka</option>
                                  <option value="BLACHA">Blacha</option>
                                  <option value="BLACHODACHOWKA">Blachodachówka</option>
                                  <option value="TRAPEZ">Blacha Trapezowa</option>
                                  <option value="PAPA">Papa</option>
                                  <option value="GONTY">Gonty</option>
                               </select>
                            </div>
                            <div>
                               <label className="block text-sm font-bold text-slate-600 mb-2">Orientacja Paneli</label>
                               <select 
                                 value={calc.orientation} 
                                 onChange={(e) => setCalc({...calc, orientation: e.target.value as any})}
                                 className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800"
                               >
                                  <option value="SOUTH">Południe (S)</option>
                                  <option value="EAST_WEST">Wschód - Zachód (E-W)</option>
                               </select>
                            </div>
                         </div>
                      ) : (
                         <div className="space-y-4">
                            <div>
                               <label className="block text-sm font-bold text-slate-600 mb-2">Długość Przekopu (mb)</label>
                               <SmartInput 
                                 value={calc.trenchLength}
                                 onChange={(val) => setCalc({...calc, trenchLength: val})}
                                 className="w-full p-3 border border-slate-300 rounded-xl"
                                 placeholder="np. 30"
                               />
                               <p className="text-xs text-slate-400 mt-1">
                                  Koszt przekopu zostanie doliczony do wyceny (stawka: {currentUser.salesSettings?.trenchCostPerMeter || 40} zł/m, darmowe: {currentUser.salesSettings?.trenchFreeMeters || 0} m).
                               </p>
                            </div>
                            <div>
                               <label className="block text-sm font-bold text-slate-600 mb-2">Orientacja Paneli</label>
                               <select 
                                 value={calc.orientation} 
                                 onChange={(e) => setCalc({...calc, orientation: e.target.value as any})}
                                 className="w-full p-3 border border-slate-300 rounded-xl bg-white text-slate-800"
                               >
                                  <option value="SOUTH">Południe (S)</option>
                                  <option value="EAST_WEST">Wschód - Zachód (E-W)</option>
                               </select>
                            </div>
                         </div>
                      )}

                      <div className="mt-6 pt-6 border-t border-slate-100">
                         <h4 className="font-bold text-slate-800 mb-4">Dodatki Systemowe</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${calc.hasEMS ? 'border-amber-500 bg-amber-50' : 'hover:bg-slate-50'}`}>
                                <input type="checkbox" checked={calc.hasEMS} onChange={(e) => setCalc({...calc, hasEMS: e.target.checked})} className="w-5 h-5 mr-3 text-amber-500" />
                                <div>
                                    <span className="font-bold block">System EMS</span>
                                    <span className="text-xs text-slate-500">Zarządzanie Energią</span>
                                </div>
                            </label>
                            <label className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${calc.hasUPS ? 'border-red-500 bg-red-50' : 'hover:bg-slate-50'}`}>
                                <input type="checkbox" checked={calc.hasUPS} onChange={(e) => setCalc({...calc, hasUPS: e.target.checked})} className="w-5 h-5 mr-3 text-red-500" />
                                <div>
                                    <span className="font-bold block">System UPS</span>
                                    <span className="text-xs text-slate-500">Zasilanie Awaryjne</span>
                                </div>
                            </label>
                         </div>
                      </div>
                   </div>
               </div>
            )}

            {calc.step === 5 && (
               <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                   <div className="bg-white p-5 rounded-xl border border-slate-200">
                       <h4 className="font-bold text-slate-800 mb-4 flex items-center"><Coins className="w-5 h-5 mr-2 text-amber-500" /> Dotacje</h4>
                       <label className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer">
                           <div className="flex items-center"><input type="checkbox" checked={calc.subsidyMojPradPV} onChange={(e) => setCalc({...calc, subsidyMojPradPV: e.target.checked})} className="w-5 h-5 mr-3" /><span>Dotacja PV</span></div>
                           <span className="font-bold text-green-600">+7 000 zł</span>
                       </label>
                       <label className={`flex items-center justify-between p-3 rounded-lg border border-transparent mt-2 ${!calc.storageId ? 'opacity-50' : 'cursor-pointer'}`}>
                           <div className="flex items-center"><input type="checkbox" checked={calc.subsidyMojPradStorage} disabled={!calc.storageId} onChange={(e) => setCalc({...calc, subsidyMojPradStorage: e.target.checked})} className="w-5 h-5 mr-3" /><span>Dotacja Magazyn</span></div>
                           <span className="font-bold text-green-600">+16 000 zł</span>
                       </label>
                   </div>
                   
                   <div className="bg-white p-5 rounded-xl border border-slate-200">
                       <h4 className="font-bold text-slate-800 mb-4 flex items-center"><Percent className="w-5 h-5 mr-2 text-blue-500" /> Ulga Termomodernizacyjna</h4>
                       <div className="flex space-x-4">
                           <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center transition-colors ${calc.taxRelief === 'NONE' ? 'bg-slate-800 text-white border-slate-800' : 'hover:bg-slate-50'}`}>
                               <input type="radio" name="tax" className="hidden" checked={calc.taxRelief === 'NONE'} onChange={() => setCalc({...calc, taxRelief: 'NONE'})}/>
                               <span className="font-bold">Brak</span>
                           </label>
                           <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center transition-colors ${calc.taxRelief === '12' ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-slate-50'}`}>
                               <input type="radio" name="tax" className="hidden" checked={calc.taxRelief === '12'} onChange={() => setCalc({...calc, taxRelief: '12'})}/>
                               <span className="font-bold">12%</span>
                           </label>
                           <label className={`flex-1 p-3 border rounded-lg cursor-pointer text-center transition-colors ${calc.taxRelief === '32' ? 'bg-blue-800 text-white border-blue-800' : 'hover:bg-slate-50'}`}>
                               <input type="radio" name="tax" className="hidden" checked={calc.taxRelief === '32'} onChange={() => setCalc({...calc, taxRelief: '32'})}/>
                               <span className="font-bold">32%</span>
                           </label>
                       </div>
                   </div>

                   {/* Discount Accordion for PV */}
                   <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <button onClick={() => setShowDiscountInput(!showDiscountInput)} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                         <span className="font-bold text-slate-800 flex items-center"><Tag className="w-5 h-5 mr-2 text-purple-600"/> Rabat Specjalny</span>
                         {showDiscountInput ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                      </button>
                      {showDiscountInput && (
                         <div className="p-4 space-y-4 bg-white animate-slide-up">
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kwota Rabatu (PLN)</label>
                               <SmartInput 
                                 value={calc.discountAmount || 0}
                                 onChange={(val) => setCalc({...calc, discountAmount: val})}
                                 className="w-full p-3 border border-slate-300 rounded-xl font-bold text-red-600"
                                 placeholder="0"
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center"><UserCheck className="w-3 h-3 mr-1"/> Osoba Akceptująca</label>
                               <select 
                                 value={calc.discountAuthor || 'SALES_MANAGER'}
                                 onChange={(e) => setCalc({...calc, discountAuthor: e.target.value})}
                                 className="w-full p-3 border border-slate-300 rounded-xl bg-white text-sm"
                               >
                                  <option value="SALES_DIRECTOR">Dyrektor Handlowy</option>
                                  <option value="SALES_MANAGER">Kierownik Sprzedaży</option>
                                  <option value="OFFICE">Biuro</option>
                               </select>
                            </div>
                         </div>
                      )}
                   </div>
               </div>
            )}

            {calc.step === 6 && (
               <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                   
                   <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                         <Box className="w-6 h-6 mr-2 text-blue-600" /> Twój Zestaw
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Panele Fotowoltaiczne</p>
                            <p className="font-bold text-slate-800">{financials.components.panel?.name || 'Nie wybrano'}</p>
                            <p className="text-sm text-slate-600 mt-1">{calc.panelCount} szt. ({financials.systemPowerKw} kWp)</p>
                         </div>
                         <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-xs text-slate-400 font-bold uppercase mb-1">Falownik</p>
                            <p className="font-bold text-slate-800">{financials.components.inverter?.name || 'Nie wybrano'}</p>
                            <p className="text-xs text-slate-500 mt-1">
                               {financials.components.inverter?.inverterType === 'HYBRID' ? 'Hybrydowy' : 'Sieciowy'}
                            </p>
                         </div>
                         {financials.components.storage && (
                            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                               <p className="text-xs text-green-600 font-bold uppercase mb-1">Magazyn Energii</p>
                               <p className="font-bold text-slate-800">{financials.components.storage.name}</p>
                               <p className="text-sm text-slate-600 mt-1">{financials.storageCapacity} kWh</p>
                            </div>
                         )}
                         {(calc.hasEMS || calc.hasUPS) && (
                            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                               <p className="text-xs text-amber-600 font-bold uppercase mb-1">Dodatki</p>
                               <div className="space-y-1">
                                  {calc.hasEMS && <div className="flex items-center font-bold text-slate-800"><Cpu className="w-4 h-4 mr-2"/> System EMS</div>}
                                  {calc.hasUPS && <div className="flex items-center font-bold text-slate-800"><Battery className="w-4 h-4 mr-2"/> System UPS</div>}
                               </div>
                            </div>
                         )}
                      </div>
                   </div>

                   <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
                       <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 border-b pb-4">Podsumowanie Kosztów</h3>
                       <div className="space-y-4 text-sm md:text-base">
                           <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Wartość Inwestycji (Brutto)</span><span className="font-bold text-xl text-slate-900">{financials.totalSystemPrice.toLocaleString()} PLN</span></div>
                           
                           {/* Discount Display: Only show if greater than 0 */}
                           {calc.discountAmount && calc.discountAmount > 0 ? (
                              <div className="flex justify-between items-center text-red-600 bg-red-50 p-2 rounded-lg">
                                 <span className="flex items-center font-bold"><Tag className="w-4 h-4 mr-2"/> Rabat Specjalny ({calc.discountAuthor === 'SALES_DIRECTOR' ? 'Dyr. Handlowy' : calc.discountAuthor === 'SALES_MANAGER' ? 'Kierownik' : 'Biuro'})</span>
                                 <span className="font-bold">- {calc.discountAmount.toLocaleString()} PLN</span>
                              </div>
                           ) : null}

                           <div className="flex justify-between items-center text-green-700"><span className="flex items-center"><CheckSquare className="w-4 h-4 mr-2"/> Ulga Termomodernizacyjna</span><span className="font-bold">- {Math.round(financials.taxReturn).toLocaleString()} PLN</span></div>
                           <div className="flex justify-between items-center text-green-700"><span className="flex items-center"><Coins className="w-4 h-4 mr-2"/> Suma Dotacji</span><span className="font-bold">- {financials.totalSubsidies.toLocaleString()} PLN</span></div>
                           <div className="border-t border-slate-300 my-4 pt-4 flex justify-between items-center"><span className="text-lg md:text-xl font-extrabold text-slate-800 uppercase">Koszt Finalny</span><span className="text-3xl md:text-4xl font-extrabold text-blue-700">{financials.netInvestment.toLocaleString('pl-PL', {maximumFractionDigits: 0})} PLN</span></div>
                       </div>
                       
                       {/* Chart and Loans logic remains same ... */}
                       {currentUser.salesSettings?.showRoiChart && (
                         <div className="mt-12">
                            <h4 className="font-bold text-slate-800 mb-8 flex items-center"><BarChart3 className="w-5 h-5 mr-2" /> Zwrot z inwestycji (20 lat)</h4>
                            
                            <div className="h-64 relative border-b border-slate-300 w-full flex items-end">
                               {(() => {
                                  let minVal = financials.minChartValue;
                                  let maxVal = financials.maxChartValue;
                                  if (Math.abs(maxVal - minVal) < 1) { maxVal += 100; minVal -= 100; }
                                  const totalRange = maxVal - minVal;
                                  const zeroPercent = (Math.abs(minVal) / totalRange) * 100;
                                  const safeZeroPercent = Math.max(0, Math.min(100, zeroPercent));

                                  return (
                                     <>
                                        <div className="absolute w-full border-t border-slate-400 border-dashed z-10 flex items-center" style={{ bottom: `${safeZeroPercent}%` }}>
                                           <span className="text-[10px] text-slate-500 bg-white px-1 absolute right-0 -top-2">0 PLN</span>
                                        </div>
                                        <div className="w-full h-full flex items-end justify-between gap-1 z-20">
                                           {financials.chartData.map((d) => {
                                              const isPositive = d.balance >= 0;
                                              const barHeight = (Math.abs(d.balance) / totalRange) * 100;
                                              const safeHeight = Math.max(1, barHeight); 
                                              const style: React.CSSProperties = isPositive 
                                                 ? { bottom: `${safeZeroPercent}%`, height: `${safeHeight}%` }
                                                 : { top: `${100 - safeZeroPercent}%`, height: `${safeHeight}%` };

                                              return (
                                                 <div key={d.year} className="relative flex-1 h-full">
                                                    <div 
                                                       className={`absolute w-full rounded-sm transition-all group ${isPositive ? 'bg-green-500' : 'bg-red-400'}`} 
                                                       style={style}
                                                    >
                                                       <div className="hidden group-hover:block absolute z-50 bg-slate-800 text-white text-[10px] p-2 rounded -translate-x-1/2 left-1/2 w-24 text-center bottom-full mb-1">
                                                          Rok {d.year}<br/>
                                                          {Math.round(d.balance).toLocaleString()} PLN
                                                       </div>
                                                    </div>
                                                 </div>
                                              );
                                           })}
                                        </div>
                                     </>
                                  );
                               })()}
                            </div>
                            
                            <div className="flex justify-between mt-2 text-xs text-slate-500 font-bold">
                               <span>Rok 1</span>
                               <span>Rok 10</span>
                               <span>Rok 20</span>
                            </div>

                            {financials.paybackYear > 0 && (
                               <p className="text-center mt-6 font-bold text-green-700 bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-center">
                                  <TrendingUp className="w-5 h-5 mr-2" />
                                  Szacowany zwrot inwestycji: <span className="text-xl ml-2">{financials.paybackYear} lat</span>
                               </p>
                            )}
                         </div>
                       )}

                       <div className="mt-6 border border-blue-100 bg-blue-50/50 rounded-xl overflow-hidden">
                           <button onClick={() => setShowLoanCalc(!showLoanCalc)} className="w-full flex justify-between items-center p-4 text-blue-700 font-bold text-sm hover:bg-blue-100/50">
                               <span className="flex items-center"><Calculator className="w-4 h-4 mr-2" /> Symulacja Abonamentu</span>
                               {showLoanCalc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </button>
                           {showLoanCalc && (
                               <div className="p-4 border-t border-blue-100 bg-white space-y-4 animate-slide-up">
                                   <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Miesiące</label><SmartInput value={loanMonths} onChange={(val) => setLoanMonths(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Oprocentowanie (%)</label><SmartInput value={loanRate} step="0.1" onChange={(val) => setLoanRate(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Odroczenie</label><SmartInput value={defermentMonths} onChange={(val) => setDefermentMonths(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Wpłata własna</label><SmartInput value={ownContribution} onChange={(val) => setOwnContribution(val)} className="w-full p-2 border rounded-lg font-bold bg-green-50 text-green-800 border-green-200" placeholder="0 PLN"/></div>
                                   </div>
                                   
                                   <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center justify-center text-xs font-bold text-amber-800"><CalendarClock className="w-4 h-4 mr-2" />Pierwsza płatność: {calculateFirstPaymentDate(defermentMonths)}</div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                          <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Rata bez dotacji (Brutto)</p>
                                          <p className="text-xl font-bold text-slate-800">{Math.round(calculateLoan(Math.max(0, financials.totalSystemPrice - ownContribution), loanMonths, loanRate)).toLocaleString()} PLN</p>
                                          <p className="text-[10px] text-slate-400 mt-1">Od kwoty: {Math.max(0, financials.totalSystemPrice - ownContribution).toLocaleString()} PLN</p>
                                       </div>
                                       <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                          <p className="text-xs text-blue-600 mb-1 font-bold uppercase">Rata z dotacjami (Abonament)</p>
                                          <p className="text-2xl font-bold text-blue-700">{Math.round(calculateLoan(Math.max(0, financials.netInvestment - ownContribution), loanMonths, loanRate)).toLocaleString()} PLN</p>
                                          <p className="text-[10px] text-blue-400 mt-1">Zakładając spłatę dotacji</p>
                                       </div>
                                   </div>

                                   <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                      <div className="flex justify-between items-center mb-2">
                                         <p className="text-xs font-bold text-slate-500 uppercase">Porównanie do obecnego rachunku</p>
                                         <p className="font-bold text-slate-800">{Math.round(financials.monthlyBill).toLocaleString()} PLN / msc</p>
                                      </div>
                                      
                                      <div className="text-sm">
                                         {financials.monthlyBill > calculateLoan(Math.max(0, financials.netInvestment - ownContribution), loanMonths, loanRate) ? (
                                            <span className="text-green-600 font-bold flex items-center justify-center p-2 bg-green-50 rounded">
                                               <ArrowUpRight className="w-4 h-4 mr-1 rotate-45" /> 
                                               Taniej o {Math.round(financials.monthlyBill - calculateLoan(Math.max(0, financials.netInvestment - ownContribution), loanMonths, loanRate))} PLN 
                                               ({Math.round(((financials.monthlyBill - calculateLoan(Math.max(0, financials.netInvestment - ownContribution), loanMonths, loanRate))/financials.monthlyBill)*100)}%)
                                            </span>
                                         ) : (
                                            <span className="text-amber-600 font-bold flex items-center justify-center p-2 bg-amber-50 rounded">
                                               Różnica: +{Math.round(calculateLoan(Math.max(0, financials.netInvestment - ownContribution), loanMonths, loanRate) - financials.monthlyBill)} PLN
                                            </span>
                                         )}
                                      </div>
                                   </div>
                               </div>
                           )}
                       </div>

                       <div className="mt-8"><button onClick={handleFinishAndSave} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-xl shadow-lg text-lg">Zapisz Ofertę</button></div>
                   </div>
               </div>
            )}
        </div>

        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
           <button onClick={() => setCalc({...calc, step: Math.max(1, calc.step - 1)})} disabled={calc.step === 1} className="px-4 py-2 md:px-6 md:py-3 rounded-xl border border-slate-300 text-slate-600 font-bold disabled:opacity-50 text-sm md:text-base">Wstecz</button>
           {calc.step < 6 && <button disabled={calc.step === 3 && !canProceedStep3} onClick={() => setCalc({...calc, step: Math.min(6, calc.step + 1)})} className={`px-6 py-2 md:px-8 md:py-3 rounded-xl font-bold shadow-lg text-sm md:text-base ${calc.step === 3 && !canProceedStep3 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>{calc.step === 3 && !canProceedStep3 ? 'Zatwierdź ryzyko' : 'Dalej'}</button>}
        </div>
      </div>
    );
  };

  const renderHeatingCalculator = () => {
    // ... (Code for heating calculator from previous version)
    // To be concise, assume no changes here
    // ... 
    const heatPumps = inventory.filter(i => i.category === ProductCategory.HEAT_PUMP);
    const boilers = inventory.filter(i => i.category === ProductCategory.BOILER);
    const availableDevices = heatCalc.systemType === 'HEAT_PUMP' ? heatPumps : boilers;
    const availableAccessories = inventory.filter(i => i.category === ProductCategory.HEATING_ACCESSORY || i.category === ProductCategory.ACCESSORIES);

    // Calculate Delta & SORT BY BEST MATCH (Step 2 Req)
    const deviceWithDelta = availableDevices.map(device => {
        const devicePower = device.power || 0;
        const demand = heatCalc.powerDemand || 0;
        const delta = Math.abs(devicePower - demand);
        return { ...device, delta };
    });
    // Sort: Smallest delta first
    const sortedDevices = [...deviceWithDelta].sort((a, b) => a.delta - b.delta);
    
    const minDelta = sortedDevices.length > 0 ? sortedDevices[0].delta : null;

    const toggleAccessory = (id: string) => {
        setHeatCalc(prev => {
            const exists = prev.selectedAccessoryIds.includes(id);
            return {
                ...prev,
                selectedAccessoryIds: exists 
                    ? prev.selectedAccessoryIds.filter(accId => accId !== id)
                    : [...prev.selectedAccessoryIds, id]
            };
        });
    };

    const translateType = (type: string | undefined) => {
       if (!type) return '-';
       switch(type) {
          case 'AIR_WATER': return 'Powietrze-Woda';
          case 'GROUND': return 'Gruntowa';
          case 'WATER_WATER': return 'Woda-Woda';
          case 'AIR_AIR': return 'Powietrze-Powietrze';
          default: return type;
       }
    };

    return (
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in flex flex-col h-full">
         {/* ... (Previous Header for Heating) ... */}
         <div className="bg-slate-900 text-white px-4 md:px-8 py-4 md:py-6 shrink-0">
           <div className="flex justify-between items-center mb-4 md:mb-8">
              <h2 className="text-lg md:text-2xl font-bold flex items-center">
                 <Flame className="mr-2 md:mr-3 text-red-500 w-5 h-5 md:w-6 md:h-6" /> System Grzewczy
              </h2>
              <div className="text-xs md:text-sm font-medium bg-slate-800 px-3 py-1 rounded-full border border-slate-700 whitespace-nowrap">
                Krok {heatCalc.step} / 5
              </div>
           </div>
           <div className="relative overflow-x-auto hide-scrollbar pb-2">
              <div className="flex justify-between min-w-[300px]">
                  {[1, 2, 3, 4, 5].map((s) => (
                      <div key={s} className="flex flex-col items-center group cursor-default mx-1">
                          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all border-4 ${
                              heatCalc.step >= s ? 'bg-red-600 border-slate-900 text-white' : 'bg-slate-800 border-slate-900 text-slate-500'
                          }`}>
                              {heatCalc.step > s ? <CheckCircle className="w-4 h-4" /> : s}
                          </div>
                      </div>
                  ))}
              </div>
           </div>
        </div>

        <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-slate-50/50">
            {/* Steps 1-4 omitted for brevity (same as previous) */}
            {heatCalc.step === 1 && (
               <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     <div 
                        onClick={() => setHeatCalc({...heatCalc, systemType: 'HEAT_PUMP', step: 2})} 
                        className={`p-8 border-2 rounded-3xl cursor-pointer text-center transition-all hover:scale-[1.02] shadow-sm hover:shadow-xl group flex flex-col items-center justify-center min-h-[200px] bg-white border-slate-200 hover:border-red-500`}
                     >
                        <div className="bg-red-100 p-6 rounded-full text-red-600 mb-4 group-hover:bg-red-600 group-hover:text-white transition-colors">
                            <Thermometer className="w-12 h-12" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 group-hover:text-red-600">Pompa Ciepła</h3>
                        <p className="text-slate-500 text-sm mt-2">Energooszczędne i ekologiczne</p>
                     </div>
                     
                     <div 
                        onClick={() => setHeatCalc({...heatCalc, systemType: 'PELLET', step: 2})} 
                        className={`p-8 border-2 rounded-3xl cursor-pointer text-center transition-all hover:scale-[1.02] shadow-sm hover:shadow-xl group flex flex-col items-center justify-center min-h-[200px] bg-white border-slate-200 hover:border-orange-500`}
                     >
                        <div className="bg-orange-100 p-6 rounded-full text-orange-600 mb-4 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                            <Flame className="w-12 h-12" />
                        </div>
                        <h3 className="text-2xl font-bold text-slate-800 group-hover:text-orange-600">Kocioł na Pellet</h3>
                        <p className="text-slate-500 text-sm mt-2">Tradycyjne paliwo stałe</p>
                     </div>
                  </div>
                  
                  {/* Step 1 Updates: Explicit Fields for New Client */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-8">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center"><User className="w-5 h-5 mr-2 text-slate-500"/> Dane Klienta</h4>
                      <div className="grid gap-4">
                         {!heatCalc.isNewClient ? (
                             <div className="flex gap-4">
                                 <select className="flex-1 p-3 border rounded-lg bg-white" value={heatCalc.clientId} onChange={(e) => setHeatCalc({...heatCalc, clientId: e.target.value})}>
                                     <option value="ANON">Anonimowy</option>
                                     {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                 </select>
                                 <button onClick={() => setHeatCalc({...heatCalc, isNewClient: true, clientId: 'ANON'})} className="px-4 py-2 border rounded-lg hover:bg-slate-50">Nowy</button>
                             </div>
                         ) : (
                             <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                 <div className="flex justify-between items-center mb-2">
                                     <span className="text-sm font-bold text-slate-500 uppercase">Nowy Klient - Pełne Dane</span>
                                     <button onClick={() => setHeatCalc({...heatCalc, isNewClient: false})} className="text-xs text-blue-600 hover:underline">Wróć do listy</button>
                                 </div>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <input type="text" placeholder="Imię i Nazwisko" className="w-full p-3 border rounded-lg" value={heatCalc.newClientData.name} onChange={(e) => setHeatCalc({...heatCalc, newClientData: {...heatCalc.newClientData, name: e.target.value}})} />
                                    <input type="email" placeholder="Adres Email" className="w-full p-3 border rounded-lg" value={heatCalc.newClientData.email} onChange={(e) => setHeatCalc({...heatCalc, newClientData: {...heatCalc.newClientData, email: e.target.value}})} />
                                    <input type="text" placeholder="Numer Telefonu" className="w-full p-3 border rounded-lg" value={heatCalc.newClientData.phone} onChange={(e) => setHeatCalc({...heatCalc, newClientData: {...heatCalc.newClientData, phone: e.target.value}})} />
                                    <input type="text" placeholder="Adres Montażu" className="w-full p-3 border rounded-lg" value={heatCalc.newClientData.address} onChange={(e) => setHeatCalc({...heatCalc, newClientData: {...heatCalc.newClientData, address: e.target.value}})} />
                                 </div>
                             </div>
                         )}
                      </div>
                  </div>
               </div>
            )}

            {/* ... Steps 2-4 Logic remains handled by state update above ... */}
            {/* Step 2 Code re-rendered for context */}
            {heatCalc.step === 2 && (
               <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                     <div>
                        <label className="block text-sm font-bold text-slate-600 mb-2">
                           Zapotrzebowanie na moc (kW)
                        </label>
                        <div className="relative">
                           <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                           <SmartInput 
                              value={heatCalc.powerDemand} 
                              onChange={(val) => setHeatCalc({...heatCalc, powerDemand: val})} 
                              className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-red-500" 
                              placeholder="np. 8.5"
                           />
                        </div>
                     </div>
                     {heatCalc.systemType === 'HEAT_PUMP' && (
                        <div>
                           <label className="block text-sm font-bold text-slate-600 mb-2">
                              Punkt Biwalentny (°C)
                           </label>
                           <div className="relative">
                              <Thermometer className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                              <SmartInput 
                                 value={heatCalc.bivalentPoint} 
                                 onChange={(val) => setHeatCalc({...heatCalc, bivalentPoint: val})} 
                                 className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl font-bold text-lg outline-none focus:ring-2 focus:ring-red-500" 
                                 placeholder="np. -7"
                              />
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                     <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-xl text-slate-800">
                           Dostępne modele (Rekomendowane na górze)
                        </h3>
                     </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-left">
                           <thead className="bg-slate-100 text-slate-500 text-xs font-bold uppercase">
                              <tr>
                                 <th className="p-4 w-1/3">Urządzenie</th>
                                 <th className="p-4">Specyfikacja</th>
                                 <th className="p-4 text-right">Cena</th>
                                 <th className="p-4 text-right">Wybierz</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {sortedDevices.map(device => {
                                 const isBestMatch = heatCalc.powerDemand > 0 && minDelta !== null && device.delta === minDelta;
                                 return (
                                    <tr 
                                       key={device.id} 
                                       className={`transition-colors cursor-pointer ${isBestMatch ? 'bg-green-50/50' : 'hover:bg-slate-50'} ${heatCalc.selectedDeviceId === device.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                                       onClick={() => setHeatCalc({...heatCalc, selectedDeviceId: device.id})}
                                    >
                                       <td className="p-4">
                                          <div className="flex flex-col gap-2">
                                             <div className="w-24 h-24 bg-white border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                                                {device.url ? <img src={device.url} alt={device.name} className="w-full h-full object-cover" /> : <Thermometer className="w-8 h-8 text-slate-300" />}
                                             </div>
                                             <div>
                                                <p className="font-bold text-slate-800">{device.name}</p>
                                                {isBestMatch && <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 rounded font-bold mt-1 inline-block">Rekomendowany</span>}
                                             </div>
                                          </div>
                                       </td>
                                       <td className="p-4">
                                          <div className="text-sm space-y-1 text-slate-600">
                                             <p><span className="font-bold">Moc:</span> {device.power} kW</p>
                                             {device.heatPumpType && <p><span className="font-bold">Typ:</span> {translateType(device.heatPumpType)}</p>}
                                             {device.refrigerant && <p><span className="font-bold">Czynnik:</span> {device.refrigerant}</p>}
                                             {device.temperatureZone && <p><span className="font-bold">Strefa:</span> {device.temperatureZone}</p>}
                                             {device.minOperationTemp && <p><span className="font-bold">Min. temp:</span> {device.minOperationTemp}°C</p>}
                                             {device.warranty && <p className="text-xs text-blue-600 flex items-center mt-2"><ShieldCheck className="w-3 h-3 mr-1"/> Gwarancja {device.warranty}</p>}
                                          </div>
                                       </td>
                                       <td className="p-4 text-right">
                                          <p className="font-bold text-lg text-slate-800">{(device.price * 1.08).toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</p>
                                          <p className="text-xs text-slate-400">Brutto (8% VAT)</p>
                                       </td>
                                       <td className="p-4 text-right"><div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ml-auto ${heatCalc.selectedDeviceId === device.id ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'}`}>{heatCalc.selectedDeviceId === device.id && <div className="w-2.5 h-2.5 bg-white rounded-full" />}</div></td>
                                    </tr>
                                 );
                              })}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            )}

            {/* Steps 3 & 4 handled by state */}
            {heatCalc.step === 3 && (
               <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center">
                          <Wrench className="w-5 h-5 mr-2 text-slate-500" /> Usługi i Akcesoria
                      </h3>
                      {availableAccessories.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {availableAccessories.map(item => (
                                  <label key={item.id} className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${heatCalc.selectedAccessoryIds.includes(item.id) ? 'border-green-500 bg-green-50' : 'hover:bg-slate-50 border-slate-200'}`}>
                                      <input 
                                          type="checkbox" 
                                          checked={heatCalc.selectedAccessoryIds.includes(item.id)}
                                          onChange={() => toggleAccessory(item.id)}
                                          className="w-5 h-5 text-green-600 rounded focus:ring-green-500 mr-3"
                                      />
                                      <div className="flex-1">
                                          <span className="font-bold text-slate-800 block">{item.name}</span>
                                          <span className="text-xs text-slate-500">{item.category}</span>
                                      </div>
                                      <span className="font-bold text-slate-700">{(item.price * 1.08).toLocaleString(undefined, {maximumFractionDigits:0})} zł</span>
                                  </label>
                              ))}
                          </div>
                      ) : (
                          <p className="text-center text-slate-400 py-8">Brak dostępnych akcesoriów.</p>
                      )}
                   </div>
               </div>
            )}

            {heatCalc.step === 4 && (
               <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
                  
                  {/* Step 4 Fuel Analysis Requirement */}
                  {heatCalc.systemType === 'HEAT_PUMP' && (
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="font-bold text-lg mb-4 flex items-center text-slate-800">
                           <TrendingUp className="w-5 h-5 mr-2 text-blue-600"/> Analiza Kosztów Ogrzewania
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Obecne Paliwo</label>
                              <select 
                                value={heatCalc.currentFuel} 
                                onChange={e => setHeatCalc({...heatCalc, currentFuel: e.target.value})}
                                className="w-full p-3 border rounded-xl bg-white"
                              >
                                 <option value="COAL">Węgiel</option>
                                 <option value="PELLET">Pellet</option>
                                 <option value="GAS">Gaz</option>
                                 <option value="WOOD">Drewno</option>
                                 <option value="ECO">Eko-groszek</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zużycie Roczne (ton / m3)</label>
                              <SmartInput 
                                value={heatCalc.fuelConsumption || 0}
                                onChange={v => setHeatCalc({...heatCalc, fuelConsumption: v})}
                                className="w-full p-3 border rounded-xl font-bold"
                              />
                           </div>
                           <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Koszt jednostkowy (zł)</label>
                              <SmartInput 
                                value={heatCalc.fuelCostPerUnit || 0}
                                onChange={v => setHeatCalc({...heatCalc, fuelCostPerUnit: v})}
                                className="w-full p-3 border rounded-xl font-bold"
                              />
                           </div>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-200">
                           <span className="text-sm font-bold text-slate-600">Aktualny roczny koszt ogrzewania:</span>
                           <span className="text-xl font-extrabold text-red-600">
                              {((heatCalc.fuelConsumption || 0) * (heatCalc.fuelCostPerUnit || 0)).toLocaleString()} PLN
                           </span>
                        </div>
                     </div>
                  )}

                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-lg mb-4">Dofinansowanie</h3>
                     <div className="space-y-4">
                        <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${heatCalc.subsidyProgram === 'NONE' ? 'bg-slate-100 border-slate-300' : 'hover:bg-slate-50'}`}>
                           <div className="flex items-center"><input type="radio" checked={heatCalc.subsidyProgram === 'NONE'} onChange={() => setHeatCalc({...heatCalc, subsidyProgram: 'NONE'})} className="w-4 h-4 mr-3" /><span className="font-bold text-slate-700">Brak dofinansowania</span></div>
                        </label>
                        <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${heatCalc.subsidyProgram === 'CZYSTE_POWIETRZE' ? 'bg-green-50 border-green-500' : 'hover:bg-slate-50'}`}>
                           <div className="flex items-center mb-2"><input type="radio" checked={heatCalc.subsidyProgram === 'CZYSTE_POWIETRZE'} onChange={() => setHeatCalc({...heatCalc, subsidyProgram: 'CZYSTE_POWIETRZE'})} className="w-4 h-4 mr-3 text-green-600" /><span className="font-bold text-green-800">Czyste Powietrze</span></div>
                           {heatCalc.subsidyProgram === 'CZYSTE_POWIETRZE' && (<div className="ml-7 mt-3 space-y-3"><select value={heatCalc.cpLevel} onChange={(e) => setHeatCalc({...heatCalc, cpLevel: e.target.value as any})} className="w-full p-2 border rounded text-sm"><option value="BASIC">Podstawowy</option><option value="ELEVATED">Podwyższony</option><option value="HIGHEST">Najwyższy</option></select><label className="flex items-center"><input type="checkbox" checked={heatCalc.cpIncludeCoCwu} onChange={(e) => setHeatCalc({...heatCalc, cpIncludeCoCwu: e.target.checked})} className="mr-2" /><span className="text-sm">Modernizacja CO/CWU</span></label></div>)}
                        </label>
                        {heatCalc.systemType === 'HEAT_PUMP' && (
                           <label className={`block p-4 border rounded-xl cursor-pointer transition-all ${heatCalc.subsidyProgram === 'MOJE_CIEPLO' ? 'bg-blue-50 border-blue-500' : 'hover:bg-slate-50'}`}>
                              <div className="flex items-center"><input type="radio" checked={heatCalc.subsidyProgram === 'MOJE_CIEPLO'} onChange={() => setHeatCalc({...heatCalc, subsidyProgram: 'MOJE_CIEPLO'})} className="w-4 h-4 mr-3 text-blue-600" /><span className="font-bold text-blue-800">Moje Ciepło</span></div>
                           </label>
                        )}
                     </div>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <h3 className="font-bold text-lg mb-4">Ulga Termomodernizacyjna</h3>
                     <div className="flex space-x-4">
                        <button onClick={()=>setHeatCalc({...heatCalc, taxRelief: 'NONE'})} className={`flex-1 p-3 border rounded-lg font-bold ${heatCalc.taxRelief==='NONE'?'bg-slate-800 text-white':''}`}>Brak</button>
                        <button onClick={()=>setHeatCalc({...heatCalc, taxRelief: '12'})} className={`flex-1 p-3 border rounded-lg font-bold ${heatCalc.taxRelief==='12'?'bg-blue-600 text-white':''}`}>12%</button>
                        <button onClick={()=>setHeatCalc({...heatCalc, taxRelief: '32'})} className={`flex-1 p-3 border rounded-lg font-bold ${heatCalc.taxRelief==='32'?'bg-blue-800 text-white':''}`}>32%</button>
                     </div>
                  </div>

                  {/* Discount Accordion for Heating */}
                  <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <button onClick={() => setShowDiscountInput(!showDiscountInput)} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                         <span className="font-bold text-slate-800 flex items-center"><Tag className="w-5 h-5 mr-2 text-purple-600"/> Rabat Specjalny</span>
                         {showDiscountInput ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                      </button>
                      {showDiscountInput && (
                         <div className="p-4 space-y-4 bg-white animate-slide-up">
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kwota Rabatu (PLN)</label>
                               <SmartInput 
                                 value={heatCalc.discountAmount || 0}
                                 onChange={(val) => setHeatCalc({...heatCalc, discountAmount: val})}
                                 className="w-full p-3 border border-slate-300 rounded-xl font-bold text-red-600"
                                 placeholder="0"
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center"><UserCheck className="w-3 h-3 mr-1"/> Osoba Akceptująca</label>
                               <select 
                                 value={heatCalc.discountAuthor || 'SALES_MANAGER'}
                                 onChange={(e) => setHeatCalc({...heatCalc, discountAuthor: e.target.value})}
                                 className="w-full p-3 border border-slate-300 rounded-xl bg-white text-sm"
                               >
                                  <option value="SALES_DIRECTOR">Dyrektor Handlowy</option>
                                  <option value="SALES_MANAGER">Kierownik Sprzedaży</option>
                                  <option value="OFFICE">Biuro</option>
                               </select>
                            </div>
                         </div>
                      )}
                   </div>
               </div>
            )}

            {heatCalc.step === 5 && (
               <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                  {/* Product Image & Full Spec */}
                  {heatingFinancials.selectedDevice?.url && (
                     <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 items-start">
                        <img src={heatingFinancials.selectedDevice.url} alt="Produkt" className="w-full md:w-1/3 rounded-xl object-cover shadow-md" />
                        <div className="flex-1">
                           <h3 className="text-2xl font-bold text-slate-800 mb-4">{heatingFinancials.selectedDevice.name}</h3>
                           
                           <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                              {/* Conditionally Render Specs - Only show if valid value exists */}
                              {translateType(heatingFinancials.selectedDevice.heatPumpType) !== '-' && (
                                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Typ</p>
                                    <p className="font-medium text-slate-800">{translateType(heatingFinancials.selectedDevice.heatPumpType)}</p>
                                 </div>
                              )}
                              {heatingFinancials.selectedDevice.power && (
                                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Moc Grzewcza</p>
                                    <p className="font-medium text-slate-800">{heatingFinancials.selectedDevice.power} kW</p>
                                 </div>
                              )}
                              {heatingFinancials.selectedDevice.refrigerant && (
                                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Czynnik</p>
                                    <p className="font-medium text-slate-800">{heatingFinancials.selectedDevice.refrigerant}</p>
                                 </div>
                              )}
                              {heatingFinancials.selectedDevice.minOperationTemp && (
                                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <p className="text-xs text-slate-500 font-bold uppercase mb-1">Temperatura Pracy</p>
                                    <p className="font-medium text-slate-800">min. {heatingFinancials.selectedDevice.minOperationTemp}°C</p>
                                 </div>
                              )}
                           </div>
                           
                           <div className="flex items-center gap-2 mb-4">
                              <ShieldCheck className="w-5 h-5 text-blue-600" />
                              <span className="font-bold text-slate-700">Gwarancja: {heatingFinancials.selectedDevice.warranty}</span>
                           </div>

                           {/* Accessories List moved here */}
                           {heatingFinancials.selectedAccessories.length > 0 && (
                              <div className="pt-2 border-t border-slate-100">
                                 <span className="text-xs font-bold text-slate-400 uppercase block mb-2">Wybrane Akcesoria</span>
                                 <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {heatingFinancials.selectedAccessories.map(acc => (
                                       <div key={acc.id} className="bg-slate-50 border border-slate-200 p-2 rounded-lg text-center flex flex-col items-center justify-center h-20 hover:bg-slate-100 transition-colors">
                                          <Wrench className="w-4 h-4 text-blue-500 mb-1 opacity-70"/>
                                          <span className="font-bold text-[10px] text-slate-700 leading-tight line-clamp-2">{acc.name}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>
                  )}

                  {/* Summary */}
                  <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                     <h3 className="text-2xl font-bold text-slate-800 mb-6 pb-4 border-b">Podsumowanie Oferty</h3>
                     
                     <div className="space-y-4">
                        <div className="flex justify-between items-center py-2">
                           <span className="text-slate-600 font-medium">Kwota Brutto (Urządzenie + Montaż + Akcesoria)</span>
                           <span className="font-bold text-lg text-slate-800">{Math.round(heatingFinancials.totalSystemPrice).toLocaleString()} PLN</span>
                        </div>

                        {/* Order: Gross -> Discount -> Tax -> Subsidy -> Final */}
                        
                        {/* Discount Display: Only show if strictly greater than 0 */}
                        {heatCalc.discountAmount && heatCalc.discountAmount > 0 ? (
                           <div className="flex justify-between items-center text-red-600 bg-red-50 p-2 rounded-lg">
                              <span className="flex items-center font-bold"><Tag className="w-4 h-4 mr-2"/> Rabat Specjalny ({heatCalc.discountAuthor === 'SALES_DIRECTOR' ? 'Dyr. Handlowy' : heatCalc.discountAuthor === 'SALES_MANAGER' ? 'Kierownik' : 'Biuro'})</span>
                              <span className="font-bold">- {heatCalc.discountAmount.toLocaleString()} PLN</span>
                           </div>
                        ) : null}

                        <div className="space-y-3 mt-4 border-t border-slate-100 pt-4">
                           {/* 1. Tax Relief */}
                           {heatingFinancials.taxReturn > 0 && (
                              <div className="flex justify-between items-center text-blue-600">
                                 <span className="flex items-center text-sm font-medium"><Percent className="w-4 h-4 mr-2"/> Ulga Termomodernizacyjna ({heatCalc.taxRelief}%)</span>
                                 <span className="font-bold">- {Math.round(heatingFinancials.taxReturn).toLocaleString()} PLN</span>
                              </div>
                           )}

                           {/* 2. Subsidy */}
                           {heatingFinancials.subsidyAmount > 0 && (
                              <div className="flex justify-between items-center text-green-600">
                                 <span className="flex items-center text-sm font-medium"><Coins className="w-4 h-4 mr-2"/> Dotacja ({heatCalc.subsidyProgram === 'CZYSTE_POWIETRZE' ? 'Czyste Powietrze' : 'Moje Ciepło'})</span>
                                 <span className="font-bold">- {Math.round(heatingFinancials.subsidyAmount).toLocaleString()} PLN</span>
                              </div>
                           )}

                           <div className="border-t border-slate-300 my-4 pt-4 flex justify-between items-center">
                              <span className="text-lg md:text-xl font-extrabold text-slate-800 uppercase">Koszt Finalny</span>
                              <span className="text-3xl md:text-4xl font-extrabold text-blue-700">{Math.round(heatingFinancials.netInvestment).toLocaleString()} PLN</span>
                           </div>
                        </div>

                        {/* ROI Chart */}
                        {currentUser.salesSettings?.showRoiChart && (
                           <div className="mt-8 pt-8 border-t border-slate-200">
                              <h4 className="font-bold text-slate-800 mb-6 flex items-center"><BarChart3 className="w-5 h-5 mr-2" /> Zwrot z inwestycji (15 lat)</h4>
                              
                              <div className="h-48 flex items-end gap-1 border-b border-slate-300 pb-1 relative">
                                 <div className="absolute top-1/2 w-full border-t border-slate-300 border-dashed opacity-50"></div>
                                 {heatingFinancials.roiChartData.map((d) => {
                                    // Normalize for chart height
                                    const maxVal = Math.max(...heatingFinancials.roiChartData.map(i => Math.abs(i.balance))) || 1;
                                    const heightPercent = Math.min(100, (Math.abs(d.balance) / maxVal) * 50); // Scale to half height per direction
                                    
                                    return (
                                       <div key={d.year} className="flex-1 flex flex-col justify-end h-full relative group">
                                          {d.balance >= 0 ? (
                                             <div className="w-full bg-green-500 rounded-t-sm mx-0.5" style={{ height: `${heightPercent}%` }}></div>
                                          ) : (
                                             <div className="w-full bg-red-400 rounded-b-sm mx-0.5 absolute top-1/2" style={{ height: `${heightPercent}%` }}></div>
                                          )}
                                          
                                          {/* Tooltip */}
                                          <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded mb-1 z-10 whitespace-nowrap">
                                             Rok {d.year}: {Math.round(d.balance).toLocaleString()} PLN
                                          </div>
                                       </div>
                                    )
                                 })}
                              </div>
                              <div className="flex justify-between text-xs text-slate-400 mt-2 font-bold">
                                 <span>Start</span>
                                 <span>15 Lat</span>
                              </div>

                              {heatingFinancials.paybackYears > 0 && heatingFinancials.paybackYears <= 15 && (
                                 <p className="text-center mt-4 font-bold text-green-700 bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 mr-2" />
                                    Szacowany zwrot: <span className="text-xl ml-2">{heatingFinancials.paybackYears.toFixed(1)} lat</span>
                                 </p>
                              )}
                           </div>
                        )}

                        {/* Heating Loan Simulator (NEW) */}
                        <div className="mt-6 border border-blue-100 bg-blue-50/50 rounded-xl overflow-hidden">
                           <button onClick={() => setShowLoanCalc(!showLoanCalc)} className="w-full flex justify-between items-center p-4 text-blue-700 font-bold text-sm hover:bg-blue-100/50">
                               <span className="flex items-center"><Calculator className="w-4 h-4 mr-2" /> Symulacja Abonamentu (Ogrzewanie)</span>
                               {showLoanCalc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </button>
                           {showLoanCalc && (
                               <div className="p-4 border-t border-blue-100 bg-white space-y-4 animate-slide-up">
                                   <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Miesiące</label><SmartInput value={loanMonths} onChange={(val) => setLoanMonths(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Oprocentowanie (%)</label><SmartInput value={loanRate} step="0.1" onChange={(val) => setLoanRate(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Odroczenie</label><SmartInput value={defermentMonths} onChange={(val) => setDefermentMonths(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Wpłata własna</label><SmartInput value={ownContribution} onChange={(val) => setOwnContribution(val)} className="w-full p-2 border rounded-lg font-bold bg-green-50 text-green-800 border-green-200" placeholder="0 PLN"/></div>
                                   </div>
                                   
                                   <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center justify-center text-xs font-bold text-amber-800"><CalendarClock className="w-4 h-4 mr-2" />Pierwsza płatność: {calculateFirstPaymentDate(defermentMonths)}</div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                          <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Rata bez dotacji (Brutto)</p>
                                          <p className="text-xl font-bold text-slate-800">{Math.round(calculateLoan(Math.max(0, heatingFinancials.totalSystemPrice - ownContribution), loanMonths, loanRate)).toLocaleString()} PLN</p>
                                          <p className="text-[10px] text-slate-400 mt-1">Od kwoty: {Math.max(0, heatingFinancials.totalSystemPrice - ownContribution).toLocaleString()} PLN</p>
                                       </div>
                                       <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                          <p className="text-xs text-blue-600 mb-1 font-bold uppercase">Rata z dotacjami (Abonament)</p>
                                          <p className="text-2xl font-bold text-blue-700">{Math.round(calculateLoan(Math.max(0, heatingFinancials.netInvestment - ownContribution), loanMonths, loanRate)).toLocaleString()} PLN</p>
                                          <p className="text-[10px] text-blue-400 mt-1">Zakładając spłatę dotacji</p>
                                       </div>
                                   </div>

                                   <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                      <div className="flex justify-between items-center mb-2">
                                         <p className="text-xs font-bold text-slate-500 uppercase">Aktualny koszt miesięczny (Paliwo)</p>
                                         <p className="font-bold text-slate-800">{Math.round(heatingFinancials.currentAnnualCost / 12).toLocaleString()} PLN / msc</p>
                                      </div>
                                      
                                      <div className="text-sm">
                                         {Math.round(heatingFinancials.currentAnnualCost / 12) > calculateLoan(Math.max(0, heatingFinancials.netInvestment - ownContribution), loanMonths, loanRate) ? (
                                            <span className="text-green-600 font-bold flex items-center justify-center p-2 bg-green-50 rounded">
                                               <ArrowUpRight className="w-4 h-4 mr-1 rotate-45" /> 
                                               Taniej o {Math.round((heatingFinancials.currentAnnualCost / 12) - calculateLoan(Math.max(0, heatingFinancials.netInvestment - ownContribution), loanMonths, loanRate))} PLN 
                                               ({Math.round((((heatingFinancials.currentAnnualCost / 12) - calculateLoan(Math.max(0, heatingFinancials.netInvestment - ownContribution), loanMonths, loanRate))/(heatingFinancials.currentAnnualCost / 12))*100)}%)
                                            </span>
                                         ) : (
                                            <span className="text-amber-600 font-bold flex items-center justify-center p-2 bg-amber-50 rounded">
                                               Różnica: +{Math.round(calculateLoan(Math.max(0, heatingFinancials.netInvestment - ownContribution), loanMonths, loanRate) - (heatingFinancials.currentAnnualCost / 12))} PLN
                                            </span>
                                         )}
                                      </div>
                                   </div>
                               </div>
                           )}
                        </div>

                        <div className="mt-8">
                           <button onClick={handleFinishAndSaveHeating} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 rounded-xl shadow-lg text-lg flex items-center justify-center transition-colors">
                              <Save className="w-5 h-5 mr-2" /> Zapisz Ofertę Grzewczą
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
           <button onClick={() => setHeatCalc({...heatCalc, step: Math.max(1, heatCalc.step - 1)})} disabled={heatCalc.step === 1} className="px-4 py-2 md:px-6 md:py-3 rounded-xl border border-slate-300 text-slate-600 font-bold disabled:opacity-50 text-sm md:text-base">Wstecz</button>
           {heatCalc.step < 5 && <button onClick={() => setHeatCalc({...heatCalc, step: Math.min(5, heatCalc.step + 1)})} className="px-6 py-2 md:px-8 md:py-3 rounded-xl font-bold shadow-lg text-sm md:text-base bg-red-600 text-white hover:bg-red-700">Dalej</button>}
        </div>
      </div>
    );
  };

  const renderStorageCalculator = () => {
     return (
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in flex flex-col h-full">
           <div className="bg-slate-900 text-white px-4 md:px-8 py-4 md:py-6 shrink-0">
              <div className="flex justify-between items-center mb-4 md:mb-8">
                 <h2 className="text-lg md:text-2xl font-bold flex items-center">
                    <Battery className="mr-2 md:mr-3 text-green-500 w-5 h-5 md:w-6 md:h-6" /> Magazyn Energii
                 </h2>
                 <div className="text-xs md:text-sm font-medium bg-slate-800 px-3 py-1 rounded-full border border-slate-700 whitespace-nowrap">
                    Krok {storageCalc.step} / 5
                 </div>
              </div>
              <div className="relative overflow-x-auto hide-scrollbar pb-2">
                 <div className="flex justify-between min-w-[300px]">
                    {[1, 2, 3, 4, 5].map((s) => (
                       <div key={s} className="flex flex-col items-center group cursor-default mx-1">
                          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center font-bold text-xs md:text-sm transition-all border-4 ${
                             storageCalc.step >= s ? 'bg-green-600 border-slate-900 text-white' : 'bg-slate-800 border-slate-900 text-slate-500'
                          }`}>
                             {storageCalc.step > s ? <CheckCircle className="w-4 h-4" /> : s}
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-slate-50/50">
              {/* Step 1: Client */}
              {storageCalc.step === 1 && (
                 <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                    <div className="grid gap-4">
                       <div onClick={() => setStorageCalc({...storageCalc, isNewClient: false})} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center ${!storageCalc.isNewClient ? 'border-green-500 bg-green-50' : 'bg-white'}`}>
                          <User className="w-6 h-6 mr-4 text-slate-500" />
                          <div className="flex-1 font-bold text-slate-800">Wybierz z bazy</div>
                       </div>
                       {!storageCalc.isNewClient && (
                          <select className="w-full p-3 border rounded-lg bg-white" value={storageCalc.clientId} onChange={(e) => setStorageCalc({...storageCalc, clientId: e.target.value})}>
                             <option value="ANON">Anonimowy</option>
                             {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                       )}
                       <div onClick={() => setStorageCalc({...storageCalc, isNewClient: true, clientId: 'ANON'})} className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center ${storageCalc.isNewClient ? 'border-green-500 bg-green-50' : 'bg-white'}`}>
                          <Plus className="w-6 h-6 mr-4 text-slate-500" />
                          <div className="flex-1 font-bold text-slate-800">Nowy klient</div>
                       </div>
                       {storageCalc.isNewClient && (
                          <div className="space-y-3">
                             <input type="text" placeholder="Nazwa" className="w-full p-3 border rounded-lg" value={storageCalc.newClientData.name} onChange={(e) => setStorageCalc({...storageCalc, newClientData: {...storageCalc.newClientData, name: e.target.value}})} />
                             <input type="email" placeholder="Email (wymagany)" className="w-full p-3 border rounded-lg" value={storageCalc.newClientData.email} onChange={(e) => setStorageCalc({...storageCalc, newClientData: {...storageCalc.newClientData, email: e.target.value}})} />
                             <input type="text" placeholder="Telefon" className="w-full p-3 border rounded-lg" value={storageCalc.newClientData.phone} onChange={(e) => setStorageCalc({...storageCalc, newClientData: {...storageCalc.newClientData, phone: e.target.value}})} />
                             <input type="text" placeholder="Adres" className="w-full p-3 border rounded-lg" value={storageCalc.newClientData.address} onChange={(e) => setStorageCalc({...storageCalc, newClientData: {...storageCalc.newClientData, address: e.target.value}})} />
                          </div>
                       )}
                    </div>
                 </div>
              )}

              {/* Step 2: Installation Type & Trench */}
              {storageCalc.step === 2 && (
                 <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                       <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center">
                          <Zap className="w-5 h-5 mr-2 text-green-600" /> Konfiguracja Montażu
                       </h3>
                       
                       <div className="mb-6">
                          <label className="block text-sm font-bold text-slate-600 mb-2">Moc posiadanej instalacji PV (kWp)</label>
                          <SmartInput 
                             value={storageCalc.existingPvPower} 
                             onChange={(val) => setStorageCalc({...storageCalc, existingPvPower: val})} 
                             className="w-full p-3 border border-slate-300 rounded-xl font-bold" 
                             placeholder="np. 5.5"
                          />
                       </div>

                       <div className="grid grid-cols-2 gap-4 mb-6">
                          <div 
                            onClick={() => setStorageCalc({...storageCalc, installationType: 'ROOF'})} 
                            className={`p-6 border-2 rounded-2xl cursor-pointer text-center transition-all ${storageCalc.installationType === 'ROOF' ? 'border-green-600 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                          >
                             <Home className="mx-auto mb-2 w-8 h-8"/>
                             <span className="font-bold">Dach</span>
                          </div>
                          <div 
                            onClick={() => setStorageCalc({...storageCalc, installationType: 'GROUND'})} 
                            className={`p-6 border-2 rounded-2xl cursor-pointer text-center transition-all ${storageCalc.installationType === 'GROUND' ? 'border-amber-600 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
                          >
                             <Shovel className="mx-auto mb-2 w-8 h-8"/>
                             <span className="font-bold">Grunt</span>
                          </div>
                       </div>

                       {storageCalc.installationType === 'GROUND' && (
                          <div className="animate-slide-up">
                             <label className="block text-sm font-bold text-slate-600 mb-2">Długość Przekopu (mb)</label>
                             <SmartInput 
                                value={storageCalc.trenchLength}
                                onChange={(val) => setStorageCalc({...storageCalc, trenchLength: val})}
                                className="w-full p-3 border border-slate-300 rounded-xl"
                                placeholder="np. 30"
                             />
                             <p className="text-xs text-slate-400 mt-1">
                                Koszt przekopu zostanie doliczony ({currentUser.salesSettings?.trenchCostPerMeter || 40} PLN / mb).
                                {currentUser.salesSettings?.trenchFreeMeters && currentUser.salesSettings.trenchFreeMeters > 0 && <span> Pierwsze {currentUser.salesSettings.trenchFreeMeters}m gratis.</span>}
                             </p>
                          </div>
                       )}
                    </div>
                 </div>
              )}

              {/* Step 3: Selection */}
              {storageCalc.step === 3 && (
                 <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                       <h3 className="font-bold text-lg text-slate-800 mb-6 flex items-center">
                          <Battery className="w-5 h-5 mr-2 text-green-600" /> Dobór Magazynu
                       </h3>
                       
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                             <label className="block text-sm font-bold text-slate-600 mb-2">Wybierz Magazyn Energii</label>
                             <select 
                                value={storageCalc.selectedStorageId} 
                                onChange={(e) => setStorageCalc({...storageCalc, selectedStorageId: e.target.value})}
                                className="w-full p-3 border border-slate-300 rounded-xl bg-white text-sm"
                             >
                                <option value="">-- Wybierz model --</option>
                                {batteries.map(b => (
                                   <option key={b.id} value={b.id}>{b.name} ({b.capacity} kWh)</option>
                                ))}
                             </select>
                          </div>
                          <div>
                             <label className="block text-sm font-bold text-slate-600 mb-2">Ilość modułów</label>
                             <SmartInput 
                                value={storageCalc.storageCount} 
                                onChange={(val) => setStorageCalc({...storageCalc, storageCount: Math.max(1, val)})} 
                                className="w-full p-3 border border-slate-300 rounded-xl font-bold" 
                             />
                          </div>
                       </div>

                       {storageCalc.selectedStorageId && (
                          <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-100 flex items-center justify-between">
                             <div>
                                <p className="text-xs font-bold text-green-700 uppercase">Łączna Pojemność</p>
                                <p className="text-2xl font-bold text-green-800">
                                   {((batteries.find(b => b.id === storageCalc.selectedStorageId)?.capacity || 0) * storageCalc.storageCount).toFixed(2)} kWh
                                </p>
                             </div>
                             <Battery className="w-8 h-8 text-green-500 opacity-50" />
                          </div>
                       )}

                       <div className="mt-6 border-t border-slate-100 pt-6">
                          <label className="block text-sm font-bold text-slate-600 mb-2">Falownik (Opcjonalnie / Retrofit)</label>
                          <select 
                             value={storageCalc.additionalInverterId || ''} 
                             onChange={(e) => setStorageCalc({...storageCalc, additionalInverterId: e.target.value})}
                             className="w-full p-3 border border-slate-300 rounded-xl bg-white text-sm"
                          >
                             <option value="">Brak (Tylko magazyn)</option>
                             {inverters.filter(i => i.inverterType === 'HYBRID').map(i => (
                                <option key={i.id} value={i.id}>{i.name} ({i.power} kW)</option>
                             ))}
                          </select>
                          <p className="text-xs text-slate-400 mt-1">Wybierz falownik hybrydowy jeśli klient wymaga wymiany starego falownika.</p>
                       </div>
                    </div>
                 </div>
              )}

              {/* Step 4: Financial Configuration */}
              {storageCalc.step === 4 && (
                 <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                       <h4 className="font-bold text-slate-800 mb-4 flex items-center"><Coins className="w-5 h-5 mr-2 text-green-500" /> Dofinansowanie</h4>
                       <label className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 cursor-pointer">
                           <div className="flex items-center">
                              <input 
                                 type="checkbox" 
                                 checked={storageCalc.subsidyMojPradStorage} 
                                 onChange={(e) => setStorageCalc({...storageCalc, subsidyMojPradStorage: e.target.checked})} 
                                 className="w-5 h-5 mr-3 text-green-600 rounded focus:ring-green-500" 
                              />
                              <span className="font-bold text-slate-700">Mój Prąd (Magazyn)</span>
                           </div>
                           <span className="font-bold text-green-600">+16 000 zł</span>
                       </label>
                    </div>

                    <div className="bg-white p-5 rounded-xl border border-slate-200">
                       <h4 className="font-bold text-slate-800 mb-4 flex items-center"><Percent className="w-5 h-5 mr-2 text-blue-500" /> Ulga Termomodernizacyjna</h4>
                       <div className="flex space-x-4">
                           <button onClick={()=>setStorageCalc({...storageCalc, taxRelief: 'NONE'})} className={`flex-1 p-3 border rounded-lg font-bold ${storageCalc.taxRelief==='NONE'?'bg-slate-800 text-white':''}`}>Brak</button>
                           <button onClick={()=>setStorageCalc({...storageCalc, taxRelief: '12'})} className={`flex-1 p-3 border rounded-lg font-bold ${storageCalc.taxRelief==='12'?'bg-blue-600 text-white':''}`}>12%</button>
                           <button onClick={()=>setStorageCalc({...storageCalc, taxRelief: '32'})} className={`flex-1 p-3 border rounded-lg font-bold ${storageCalc.taxRelief==='32'?'bg-blue-800 text-white':''}`}>32%</button>
                       </div>
                    </div>

                    {/* Discount Accordion */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                      <button onClick={() => setShowDiscountInput(!showDiscountInput)} className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                         <span className="font-bold text-slate-800 flex items-center"><Tag className="w-5 h-5 mr-2 text-purple-600"/> Rabat Specjalny</span>
                         {showDiscountInput ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                      </button>
                      {showDiscountInput && (
                         <div className="p-4 space-y-4 bg-white animate-slide-up">
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kwota Rabatu (PLN)</label>
                               <SmartInput 
                                 value={storageCalc.discountAmount || 0}
                                 onChange={(val) => setStorageCalc({...storageCalc, discountAmount: val})}
                                 className="w-full p-3 border border-slate-300 rounded-xl font-bold text-red-600"
                                 placeholder="0"
                               />
                            </div>
                            <div>
                               <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center"><UserCheck className="w-3 h-3 mr-1"/> Osoba Akceptująca</label>
                               <select 
                                 value={storageCalc.discountAuthor || 'SALES_MANAGER'}
                                 onChange={(e) => setStorageCalc({...storageCalc, discountAuthor: e.target.value})}
                                 className="w-full p-3 border border-slate-300 rounded-xl bg-white text-sm"
                               >
                                  <option value="SALES_DIRECTOR">Dyrektor Handlowy</option>
                                  <option value="SALES_MANAGER">Kierownik Sprzedaży</option>
                                  <option value="OFFICE">Biuro</option>
                               </select>
                            </div>
                         </div>
                      )}
                   </div>
                 </div>
              )}

              {/* Step 5: Summary */}
              {storageCalc.step === 5 && (
                 <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
                    
                    {/* Device Summary Box */}
                    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                       <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center">
                          <Box className="w-6 h-6 mr-2 text-blue-600" /> Twój Zestaw ME
                       </h3>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="p-4 bg-green-50 rounded-xl border border-green-100">
                             <p className="text-xs text-green-600 font-bold uppercase mb-1">Magazyn Energii</p>
                             <p className="font-bold text-slate-800">{storageFinancials.selectedStorage?.name || 'Nie wybrano'}</p>
                             <p className="text-sm text-slate-600 mt-1">{storageCalc.storageCount} szt. ({((storageFinancials.selectedStorage?.capacity || 0) * storageCalc.storageCount).toFixed(2)} kWh)</p>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                             <p className="text-xs text-slate-400 font-bold uppercase mb-1">Falownik (Retrofit)</p>
                             <p className="font-bold text-slate-800">{storageFinancials.selectedInverter?.name || 'Brak (Tylko magazyn)'}</p>
                             {storageFinancials.selectedInverter && (
                                <p className="text-xs text-slate-500 mt-1">Hybrydowy {storageFinancials.selectedInverter.power} kW</p>
                             )}
                          </div>
                       </div>
                    </div>

                    {/* Financial Summary */}
                    <div className="bg-white p-8 rounded-2xl shadow-lg border border-slate-200">
                       <h3 className="text-2xl font-bold text-slate-800 mb-6 pb-4 border-b">Podsumowanie Kosztów</h3>
                       
                       <div className="space-y-3">
                          {/* Hardware Breakdown */}
                          <div className="flex justify-between items-center py-1">
                             <span className="text-slate-600 text-sm">Magazyn Energii ({storageCalc.storageCount} szt.)</span>
                             <span className="font-bold text-slate-800">{storageFinancials.storageCost.toLocaleString()} PLN</span>
                          </div>
                          {storageFinancials.inverterCost > 0 && (
                             <div className="flex justify-between items-center py-1">
                                <span className="text-slate-600 text-sm">Falownik Hybrydowy</span>
                                <span className="font-bold text-slate-800">{storageFinancials.inverterCost.toLocaleString()} PLN</span>
                             </div>
                          )}

                          {/* Trench Breakdown */}
                          {storageCalc.trenchLength > 0 && (
                             <div className="bg-amber-50 p-3 rounded-lg border border-amber-100 my-2">
                                <div className="flex justify-between items-center mb-1">
                                   <span className="font-bold text-amber-800 flex items-center text-sm"><Shovel className="w-4 h-4 mr-2"/> Prace Ziemne (Przekop)</span>
                                   <span className="font-bold text-amber-900">{storageFinancials.trenchCost.toLocaleString()} PLN</span>
                                </div>
                                <div className="text-xs text-amber-700 opacity-80 flex flex-col sm:flex-row sm:justify-between">
                                   <span>Całkowita długość: {storageCalc.trenchLength}m</span>
                                   <span>
                                      (Płatne: {storageFinancials.billableMeters}m x {storageFinancials.trenchRate}zł)
                                      {storageFinancials.freeMeters > 0 && ` | Gratis: ${storageFinancials.freeMeters}m`}
                                   </span>
                                </div>
                             </div>
                          )}

                          {/* Applied Margin Info (Hidden from client typically, but good for sales view context if needed - kept hidden here for clean summary) */}
                          
                          <div className="border-t border-slate-100 my-2 pt-2">
                             <div className="flex justify-between items-center">
                                <span className="font-bold text-slate-700">Razem Brutto</span>
                                <span className="font-bold text-lg text-slate-900">{storageFinancials.totalSystemPrice.toLocaleString()} PLN</span>
                             </div>
                          </div>

                          {/* Discount Display */}
                          {storageCalc.discountAmount && storageCalc.discountAmount > 0 ? (
                             <div className="flex justify-between items-center text-red-600 bg-red-50 p-2 rounded-lg">
                                <span className="flex items-center font-bold text-sm"><Tag className="w-4 h-4 mr-2"/> Rabat Specjalny</span>
                                <span className="font-bold">- {storageCalc.discountAmount.toLocaleString()} PLN</span>
                             </div>
                          ) : null}

                          <div className="space-y-2 mt-4 pt-2 border-t border-slate-100">
                             <div className="flex justify-between items-center text-green-600">
                                <span className="flex items-center text-sm font-medium"><Coins className="w-4 h-4 mr-2"/> Dotacja Mój Prąd (Magazyn)</span>
                                <span className="font-bold">- {Math.round(storageFinancials.subsidyStorage).toLocaleString()} PLN</span>
                             </div>
                             {storageFinancials.taxReturn > 0 && (
                                <div className="flex justify-between items-center text-blue-600">
                                   <span className="flex items-center text-sm font-medium"><Percent className="w-4 h-4 mr-2"/> Ulga Termomodernizacyjna</span>
                                   <span className="font-bold">- {Math.round(storageFinancials.taxReturn).toLocaleString()} PLN</span>
                                </div>
                             )}
                          </div>

                          <div className="border-t border-slate-300 my-4 pt-4 flex justify-between items-center">
                             <span className="text-lg md:text-xl font-extrabold text-slate-800 uppercase">Koszt Finalny</span>
                             <span className="text-3xl md:text-4xl font-extrabold text-blue-700">{Math.round(storageFinancials.netInvestment).toLocaleString()} PLN</span>
                          </div>
                       </div>

                       {/* Subscription Simulation */}
                       <div className="mt-6 border border-blue-100 bg-blue-50/50 rounded-xl overflow-hidden">
                           <button onClick={() => setShowLoanCalc(!showLoanCalc)} className="w-full flex justify-between items-center p-4 text-blue-700 font-bold text-sm hover:bg-blue-100/50">
                               <span className="flex items-center"><Calculator className="w-4 h-4 mr-2" /> Symulacja Abonamentu</span>
                               {showLoanCalc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </button>
                           {showLoanCalc && (
                               <div className="p-4 border-t border-blue-100 bg-white space-y-4 animate-slide-up">
                                   <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Miesiące</label><SmartInput value={loanMonths} onChange={(val) => setLoanMonths(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Oprocentowanie (%)</label><SmartInput value={loanRate} step="0.1" onChange={(val) => setLoanRate(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Odroczenie</label><SmartInput value={defermentMonths} onChange={(val) => setDefermentMonths(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Wpłata własna</label><SmartInput value={ownContribution} onChange={(val) => setOwnContribution(val)} className="w-full p-2 border rounded-lg font-bold bg-green-50 text-green-800 border-green-200" placeholder="0 PLN"/></div>
                                   </div>
                                   
                                   <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center justify-center text-xs font-bold text-amber-800"><CalendarClock className="w-4 h-4 mr-2" />Pierwsza płatność: {calculateFirstPaymentDate(defermentMonths)}</div>
                                   
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                          <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Rata bez dotacji (Brutto)</p>
                                          <p className="text-xl font-bold text-slate-800">{Math.round(calculateLoan(Math.max(0, storageFinancials.totalSystemPrice - ownContribution), loanMonths, loanRate)).toLocaleString()} PLN</p>
                                          <p className="text-[10px] text-slate-400 mt-1">Od kwoty: {Math.max(0, storageFinancials.totalSystemPrice - ownContribution).toLocaleString()} PLN</p>
                                       </div>
                                       <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                          <p className="text-xs text-blue-600 mb-1 font-bold uppercase">Rata z dotacjami (Abonament)</p>
                                          <p className="text-2xl font-bold text-blue-700">{Math.round(calculateLoan(Math.max(0, storageFinancials.netInvestment - ownContribution), loanMonths, loanRate)).toLocaleString()} PLN</p>
                                          <p className="text-[10px] text-blue-400 mt-1">Zakładając spłatę dotacji</p>
                                       </div>
                                   </div>
                               </div>
                           )}
                       </div>

                       <div className="mt-8">
                          <button onClick={handleFinishAndSaveStorage} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg text-lg flex items-center justify-center transition-colors">
                             <Save className="w-5 h-5 mr-2" /> Zapisz Ofertę ME
                          </button>
                       </div>
                    </div>
                 </div>
              )}
           </div>

           {/* Footer Navigation */}
           <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <button onClick={() => setStorageCalc({...storageCalc, step: Math.max(1, storageCalc.step - 1)})} disabled={storageCalc.step === 1} className="px-4 py-2 md:px-6 md:py-3 rounded-xl border border-slate-300 text-slate-600 font-bold disabled:opacity-50 text-sm md:text-base">Wstecz</button>
              {storageCalc.step < 5 && <button onClick={() => setStorageCalc({...storageCalc, step: Math.min(5, storageCalc.step + 1)})} className="px-6 py-2 md:px-8 md:py-3 rounded-xl font-bold shadow-lg text-sm md:text-base bg-green-600 text-white hover:bg-green-700">Dalej</button>}
           </div>
        </div>
     );
  };

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {currentTool === 'MENU' && (
        <div className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in max-w-7xl mx-auto w-full">
          {tools.map(tool => (
            <div 
              key={tool.id} 
              onClick={() => onChangeTool(tool.id as AppTool)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all group"
            >
              <div className={`${tool.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                <tool.icon className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{tool.title}</h3>
              <p className="text-slate-500 text-sm">{tool.desc}</p>
            </div>
          ))}
        </div>
      )}

      {currentTool !== 'MENU' && (
        <div className="flex-1 flex flex-col h-full relative">
           {/* Back Button Header */}
           <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center shrink-0">
              <button 
                onClick={() => onChangeTool('MENU')}
                className="flex items-center text-slate-500 hover:text-slate-800 font-bold transition-colors"
              >
                 <ArrowLeft className="w-5 h-5 mr-2" /> Wróć do menu
              </button>
           </div>
           
           <div className="flex-1 overflow-hidden relative">
              {currentTool === 'CALC_PV' && renderPvCalculator()}
              {currentTool === 'CALC_HEAT' && renderHeatingCalculator()}
              {currentTool === 'CALC_ME' && renderStorageCalculator()}
              {currentTool === 'PRESENTATION' && (
                 <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <Presentation className="w-24 h-24 text-indigo-200 mb-4" />
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Prezentacja Firmy</h3>
                    <p className="text-slate-500 max-w-md mb-8">Wgraj plik PDF z prezentacją, aby wyświetlić go klientowi.</p>
                    <label className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-bold cursor-pointer shadow-lg transition-colors flex items-center">
                       <Upload className="w-5 h-5 mr-2" /> Wgraj PDF
                       <input type="file" className="hidden" accept="application/pdf" onChange={handleFileUpload} />
                    </label>
                    {presentationFile && (
                       <div className="mt-8 w-full max-w-4xl h-[600px] border rounded-2xl overflow-hidden shadow-2xl">
                          <iframe src={presentationFile} className="w-full h-full" title="Presentation" />
                       </div>
                    )}
                 </div>
              )}
              {/* Placeholders for other tools */}
              {(currentTool === 'CALC_PV_WIND') && (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Wrench className="w-16 h-16 mb-4 opacity-20" />
                    <p className="font-bold">Narzędzie w trakcie budowy.</p>
                 </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

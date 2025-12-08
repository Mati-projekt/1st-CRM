

import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Presentation, Battery, Wind, Flame, Zap, Sun, User, CheckCircle, ChevronRight, BarChart3, Upload, Plus, Home, Hammer, Shovel, ShieldCheck, Banknote, Save, AlertTriangle, ArrowUpRight, CheckSquare, Coins, Calculator, Percent, ChevronDown, ChevronUp, CalendarClock, Server, Box, Cpu, FileText, Lightbulb, TrendingUp } from 'lucide-react';
import { Customer, InventoryItem, ProductCategory, CalculatorState, Offer, TariffType, User as AppUser, SystemSettings, AppTool } from '../types';

interface ApplicationsProps {
  customers: Customer[];
  inventory: InventoryItem[];
  onSaveOffer: (offer: Offer, isNewClient: boolean, newClientData?: { name: string, address: string, phone: string, email: string }) => void;
  initialState: CalculatorState | null;
  clearInitialState: () => void;
  currentUser: AppUser;
  systemSettings: SystemSettings;
  currentTool: AppTool;
  onChangeTool: (tool: AppTool) => void;
}

// --- SMART INPUT COMPONENT ---
// Defined OUTSIDE the main component to prevent focus loss on re-render
const SmartInput = ({ 
  value, 
  onChange, 
  className = "", 
  step = "any",
  ...props 
}: React.InputHTMLAttributes<HTMLInputElement> & { value: number, onChange: (val: number) => void }) => {
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let valStr = e.target.value.replace(',', '.');
    
    if (valStr === '') {
      onChange(0);
    } else {
      // Only update if it's a valid partial number (e.g. "0." should be allowed while typing)
      if (!isNaN(Number(valStr)) || valStr.endsWith('.')) {
         onChange(parseFloat(valStr));
      }
    }
  };

  return (
    <input
      type="number"
      step={step}
      // If value is 0, show empty string to allow placeholder to show or just be empty
      // But we must handle the case where user types '0' specifically if needed, 
      // though usually for price/qty 0 means empty in this context.
      value={value === 0 ? '' : value}
      onChange={handleChange}
      className={`${className} ${value === 0 ? 'border-red-300 bg-red-50 focus:ring-red-200' : ''}`}
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
  const [presentationFile, setPresentationFile] = useState<string | null>(null);

  // Loan Calculator State
  const [showLoanCalc, setShowLoanCalc] = useState(false);
  const [loanMonths, setLoanMonths] = useState(120);
  const [loanRate, setLoanRate] = useState(7.0); // Default 7%
  const [defermentMonths, setDefermentMonths] = useState(0);

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
  });

  useEffect(() => {
    if (initialState) {
      setCalc(initialState);
      // Tool switching is handled by parent when setting initialState
      clearInitialState(); 
    }
  }, [initialState, clearInitialState]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileUrl = URL.createObjectURL(e.target.files[0]);
      setPresentationFile(fileUrl);
    }
  };

  const calculateDynamicConsumption = () => {
    // Helper to calculate Annual KWh based on Bill Mode inputs
    if (calc.calcMode === 'BILL_AMOUNT') {
      const bill = calc.currentBillAmount || 0;
      const period = Number(calc.billingPeriod) || 1;
      const price = calc.pricePerKwh || 1.15;
      
      const annualBill = (bill / period) * 12;
      return Math.round(annualBill / price);
    }
    return calc.consumption; // If in Annual KWh mode, return the entered value
  };

  const autoSelectComponents = () => {
    const annualConsumption = calculateDynamicConsumption();
    const neededKwp = (annualConsumption / 1000) * 1.2;
    
    const panel = panels[0];
    if (!panel) return;

    const singlePanelKw = (panel.power || 400) / 1000;
    const count = Math.ceil(neededKwp / singlePanelKw);

    const compatibleInverters = inverters.filter(i => {
       if (calc.phases === 1) return i.phases === 1;
       return i.phases === 3 || !i.phases; 
    });

    const inverter = compatibleInverters.reduce((prev, curr) => {
      return (Math.abs((curr.power || 0) - neededKwp) < Math.abs((prev.power || 0) - neededKwp) ? curr : prev);
    }, compatibleInverters[0] || inverters[0]);

    let selectedStorageId = '';
    let selectedStorageCount = 1;
    const isDualTariff = ['G12', 'G12w', 'C12a', 'C12b'].includes(calc.tariff);
    const storageRatio = isDualTariff ? 1.1 : 0.7;
    const targetStorageCapacity = neededKwp * storageRatio;

    const storage = batteries[0]; 
    if (storage && storage.capacity) {
        selectedStorageId = storage.id;
        selectedStorageCount = Math.max(1, Math.round(targetStorageCapacity / storage.capacity));
    }

    setCalc(prev => ({
      ...prev,
      // Update consumption in state if we are in BILL mode, to persist the calculated value
      consumption: annualConsumption, 
      panelId: panel.id,
      panelCount: count,
      inverterId: inverter?.id || '',
      storageId: selectedStorageId,
      storageCount: selectedStorageCount,
      connectionPowerWarningAccepted: false 
    }));
  };

  const calculateFinancials = () => {
    const selectedPanel = panels.find(p => p.id === calc.panelId);
    const selectedInverter = inverters.find(i => i.id === calc.inverterId);
    const selectedStorage = batteries.find(b => b.id === calc.storageId);
    
    // Auto-select mounting based on type (Logic kept, UI removed)
    const costMounting = 120 * calc.panelCount; 

    // Costs
    const costPanels = (selectedPanel?.price || 0) * calc.panelCount;
    const costInverter = selectedInverter?.price || 0;
    const costStorage = (selectedStorage?.price || 0) * calc.storageCount;
    
    const costTrench = calc.installationType === 'GROUND' ? calc.trenchLength * 100 : 0;
    
    // EMS/UPS Pricing
    const costEMS = calc.hasEMS ? 1500 : 0;
    const costUPS = calc.hasUPS ? 2500 : 0;
    
    // Labor Cost Logic
    const costLabor = 1500 + (calc.panelCount * 100);

    // Group Costs
    const costPVTotal = costPanels + costInverter + costMounting + costLabor + costTrench + costEMS + costUPS;
    const costStorageTotal = costStorage;

    let totalSystemPrice = costPVTotal + costStorageTotal;
    
    // Apply Category 2 Markup
    let appliedMarkup = 0;
    if (currentUser.salesCategory === '2') {
       if (systemSettings.cat2MarkupType === 'PERCENT') {
         appliedMarkup = totalSystemPrice * (systemSettings.cat2MarkupValue / 100);
       } else {
         appliedMarkup = systemSettings.cat2MarkupValue;
       }
       totalSystemPrice += appliedMarkup;
    }

    // Apply Personal Fixed Margin
    let personalMarkup = 0;
    if (currentUser.salesSettings) {
       if (calc.panelCount > 0) {
         personalMarkup += (currentUser.salesSettings.marginPV || 0);
       }
       if (calc.storageId) {
         personalMarkup += (currentUser.salesSettings.marginStorage || 0);
       }
    }
    
    totalSystemPrice += personalMarkup;

    // Subsidies Logic with 50% Cap
    let subsidyPV = 0;
    let subsidyStorage = 0;
    let limitedByCapPV = false;
    let limitedByCapStorage = false;

    if (calc.subsidyMojPradPV) {
        const maxSubsidy = 7000;
        const cap50Percent = (costPVTotal + appliedMarkup + (calc.panelCount > 0 ? (currentUser.salesSettings?.marginPV || 0) : 0)) * 0.5; 
        subsidyPV = Math.min(maxSubsidy, cap50Percent);
        if (subsidyPV < maxSubsidy) limitedByCapPV = true;
    }

    if (calc.subsidyMojPradStorage && calc.storageId) {
        const maxSubsidy = 16000;
        const cap50Percent = (costStorageTotal + (calc.storageId ? (currentUser.salesSettings?.marginStorage || 0) : 0)) * 0.5;
        subsidyStorage = Math.min(maxSubsidy, cap50Percent);
        if (subsidyStorage < maxSubsidy) limitedByCapStorage = true;
    }

    const totalSubsidies = subsidyPV + subsidyStorage;
    
    // Tax Relief - calculated from Gross Price (Brutto)
    const taxBase = totalSystemPrice; 
    let taxReturn = 0;
    if (calc.taxRelief === '12') taxReturn = taxBase * 0.12;
    if (calc.taxRelief === '32') taxReturn = taxBase * 0.32;

    // Final Calculation
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

    // DETERMINE CONSUMPTION & BILL BASED ON MODE
    if (calc.calcMode === 'BILL_AMOUNT') {
       // Mode A: Driven by Bill Amount
       const enteredBill = Number(calc.currentBillAmount) || 0;
       const enteredPeriod = Number(calc.billingPeriod) || 1;
       monthlyBill = enteredBill / enteredPeriod;
       currentAnnualBill = monthlyBill * 12;
    } else {
       // Mode B: Driven by Annual kWh
       const annualKwh = calc.consumption || 0;
       currentAnnualBill = annualKwh * effectivePricePerKwh;
       monthlyBill = currentAnnualBill / 12;
    }

    // Chart Calculation Logic
    let accumulatedBalance = -netInvestment; 
    let paybackYear = 0;
    let foundPayback = false;

    const systemPowerKw = ((selectedPanel?.power || 0) * calc.panelCount) / 1000;
    const storageCapacity = (selectedStorage?.capacity || 0) * calc.storageCount;
    // Estimated production ~1000 kWh per 1 kWp
    const estimatedProductionKwh = systemPowerKw * 1000; 
    
    let efficiencyRatio = 0.6; 
    if (calc.storageId) efficiencyRatio += 0.2; 
    if (calc.hasEMS) efficiencyRatio += 0.05; 
    
    // Determine min/max value for chart scaling
    let maxChartValue = 0; // Highest positive value
    let minChartValue = accumulatedBalance; // Lowest negative value (start)

    let tempAnnualBill = currentAnnualBill;

    for (let i = 1; i <= 20; i++) {
       // How much money we saved this year (production value capped by bill)
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
       
       // Increase bill by inflation
       tempAnnualBill = tempAnnualBill * (1 + inflation);
    }
    
    // Safety check for empty range to prevent division by zero or NaN in chart
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

  const handleFinishAndSave = () => {
      const offerId = Date.now().toString();
      const systemPower = ((financials.components.panel?.power || 0) * calc.panelCount) / 1000;
      
      // Update consumption in state one last time based on mode before saving
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
        personalMarkup: financials.personalMarkup
      };
      onSaveOffer(offer, calc.isNewClient, calc.isNewClient ? calc.newClientData : undefined);
      onChangeTool('MENU');
  };

  const renderPvCalculator = () => {
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
         {/* Wizard Header */}
         <div className="bg-slate-900 text-white px-4 md:px-8 py-4 md:py-6 shrink-0">
           <div className="flex justify-between items-center mb-4 md:mb-8">
              <h2 className="text-lg md:text-2xl font-bold flex items-center">
                 <Sun className="mr-2 md:mr-3 text-amber-400 w-5 h-5 md:w-6 md:h-6" /> Kalkulator PV
              </h2>
              <div className="text-xs md:text-sm font-medium bg-slate-800 px-3 py-1 rounded-full border border-slate-700 whitespace-nowrap">
                Krok {calc.step} / 6
              </div>
           </div>
           {/* Steps Indicator */}
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

        {/* Wizard Content */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto bg-slate-50/50">
            {/* Step 1: Client */}
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
            
            {/* Step 2: Energy */}
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

                     {/* Calculation Mode Tabs */}
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
                     
                     {/* Dynamic Content based on Mode */}
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

            {/* Step 3: Components */}
            {calc.step === 3 && (
               <div className="space-y-6 animate-fade-in">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                     <h3 className="text-xl font-bold text-slate-800">Komponenty ({calc.phases}-Faza)</h3>
                     <button onClick={autoSelectComponents} className="bg-amber-500 text-white px-5 py-2 rounded-lg font-bold">Auto Dobór AI</button>
                  </div>

                  {/* Power Summary Banner */}
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
                         <select className="w-full p-2 border rounded text-sm" value={calc.inverterId} onChange={(e) => setCalc({...calc, inverterId: e.target.value})}>
                           <option value="">Wybierz...</option>
                           {inverters.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                         </select>
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

            {/* Step 4: Mounting & Extras */}
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
                               <p className="text-xs text-slate-400 mt-1">Koszt przekopu zostanie doliczony do wyceny.</p>
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

            {/* Step 5: Financials */}
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
               </div>
            )}

            {/* Step 6: Summary */}
            {calc.step === 6 && (
               <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
                   
                   {/* Components Breakdown */}
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
                           <div className="flex justify-between items-center text-green-700"><span className="flex items-center"><CheckSquare className="w-4 h-4 mr-2"/> Ulga Termomodernizacyjna</span><span className="font-bold">- {Math.round(financials.taxReturn).toLocaleString()} PLN</span></div>
                           <div className="flex justify-between items-center text-green-700"><span className="flex items-center"><Coins className="w-4 h-4 mr-2"/> Suma Dotacji</span><span className="font-bold">- {financials.totalSubsidies.toLocaleString()} PLN</span></div>
                           <div className="border-t border-slate-300 my-4 pt-4 flex justify-between items-center"><span className="text-lg md:text-xl font-extrabold text-slate-800 uppercase">Koszt Finalny</span><span className="text-3xl md:text-4xl font-extrabold text-blue-700">{financials.netInvestment.toLocaleString('pl-PL', {maximumFractionDigits: 0})} PLN</span></div>
                       </div>
                       
                       {/* ROI CHART - CONDITIONAL RENDERING */}
                       {currentUser.salesSettings?.showRoiChart && (
                         <div className="mt-12">
                            <h4 className="font-bold text-slate-800 mb-8 flex items-center"><BarChart3 className="w-5 h-5 mr-2" /> Zwrot z inwestycji (20 lat)</h4>
                            
                            {/* Container */}
                            <div className="h-64 relative border-b border-slate-300 w-full flex items-end">
                               
                               {/* Calculated Zero Line Position */}
                               {(() => {
                                  // Chart logic - safe defaults if range is 0
                                  let minVal = financials.minChartValue;
                                  let maxVal = financials.maxChartValue;
                                  
                                  if (Math.abs(maxVal - minVal) < 1) {
                                     maxVal += 100;
                                     minVal -= 100;
                                  }
                                  
                                  const totalRange = maxVal - minVal;
                                  const zeroPercent = (Math.abs(minVal) / totalRange) * 100;
                                  
                                  // Ensure 0 <= zeroPercent <= 100
                                  const safeZeroPercent = Math.max(0, Math.min(100, zeroPercent));

                                  return (
                                     <>
                                        {/* Zero Line */}
                                        <div className="absolute w-full border-t border-slate-400 border-dashed z-10 flex items-center" style={{ bottom: `${safeZeroPercent}%` }}>
                                           <span className="text-[10px] text-slate-500 bg-white px-1 absolute right-0 -top-2">0 PLN</span>
                                        </div>

                                        <div className="w-full h-full flex items-end justify-between gap-1 z-20">
                                           {financials.chartData.map((d) => {
                                              const isPositive = d.balance >= 0;
                                              const barHeight = (Math.abs(d.balance) / totalRange) * 100;
                                              const safeHeight = Math.max(1, barHeight); // Min height 1% to be visible
                                              
                                              // Dynamic Styles
                                              const style: React.CSSProperties = isPositive 
                                                 ? { bottom: `${safeZeroPercent}%`, height: `${safeHeight}%` }
                                                 : { top: `${100 - safeZeroPercent}%`, height: `${safeHeight}%` };

                                              return (
                                                 <div key={d.year} className="relative flex-1 h-full">
                                                    <div 
                                                       className={`absolute w-full rounded-sm transition-all group ${isPositive ? 'bg-green-500' : 'bg-red-400'}`} 
                                                       style={style}
                                                    >
                                                       {/* Tooltip */}
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

                       {/* Subscription Sim (Loan) */}
                       <div className="mt-6 border border-blue-100 bg-blue-50/50 rounded-xl overflow-hidden">
                           <button onClick={() => setShowLoanCalc(!showLoanCalc)} className="w-full flex justify-between items-center p-4 text-blue-700 font-bold text-sm hover:bg-blue-100/50">
                               <span className="flex items-center"><Calculator className="w-4 h-4 mr-2" /> Symulacja Abonamentu</span>
                               {showLoanCalc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </button>
                           {showLoanCalc && (
                               <div className="p-4 border-t border-blue-100 bg-white space-y-4 animate-slide-up">
                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Miesiące</label><SmartInput value={loanMonths} onChange={(val) => setLoanMonths(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Oprocentowanie (%)</label><SmartInput value={loanRate} step="0.1" onChange={(val) => setLoanRate(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Odroczenie</label><SmartInput value={defermentMonths} onChange={(val) => setDefermentMonths(val)} className="w-full p-2 border rounded-lg font-bold" /></div>
                                   </div>
                                   
                                   <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center justify-center text-xs font-bold text-amber-800"><CalendarClock className="w-4 h-4 mr-2" />Pierwsza płatność: {calculateFirstPaymentDate(defermentMonths)}</div>
                                   
                                   {/* Loan Details */}
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                       <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                          <p className="text-xs text-slate-500 mb-1 font-bold uppercase">Rata bez dotacji (Brutto)</p>
                                          <p className="text-xl font-bold text-slate-800">{Math.round(calculateLoan(financials.totalSystemPrice, loanMonths, loanRate)).toLocaleString()} PLN</p>
                                          <p className="text-[10px] text-slate-400 mt-1">Liczona od pełnej kwoty</p>
                                       </div>
                                       <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                          <p className="text-xs text-blue-600 mb-1 font-bold uppercase">Rata z dotacjami (Abonament)</p>
                                          <p className="text-2xl font-bold text-blue-700">{Math.round(calculateLoan(financials.netInvestment, loanMonths, loanRate)).toLocaleString()} PLN</p>
                                          <p className="text-[10px] text-blue-400 mt-1">Zakładając spłatę dotacji</p>
                                       </div>
                                   </div>

                                   {/* Bill Comparison (Only compare to Post-Subsidy) */}
                                   <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                      <div className="flex justify-between items-center mb-2">
                                         <p className="text-xs font-bold text-slate-500 uppercase">Porównanie do obecnego rachunku</p>
                                         <p className="font-bold text-slate-800">{Math.round(financials.monthlyBill).toLocaleString()} PLN / msc</p>
                                      </div>
                                      
                                      <div className="text-sm">
                                         {financials.monthlyBill > calculateLoan(financials.netInvestment, loanMonths, loanRate) ? (
                                            <span className="text-green-600 font-bold flex items-center justify-center p-2 bg-green-50 rounded">
                                               <ArrowUpRight className="w-4 h-4 mr-1 rotate-45" /> 
                                               Taniej o {Math.round(financials.monthlyBill - calculateLoan(financials.netInvestment, loanMonths, loanRate))} PLN 
                                               ({Math.round(((financials.monthlyBill - calculateLoan(financials.netInvestment, loanMonths, loanRate))/financials.monthlyBill)*100)}%)
                                            </span>
                                         ) : (
                                            <span className="text-amber-600 font-bold flex items-center justify-center p-2 bg-amber-50 rounded">
                                               Różnica: +{Math.round(calculateLoan(financials.netInvestment, loanMonths, loanRate) - financials.monthlyBill)} PLN
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

        {/* Footer */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
           <button onClick={() => setCalc({...calc, step: Math.max(1, calc.step - 1)})} disabled={calc.step === 1} className="px-4 py-2 md:px-6 md:py-3 rounded-xl border border-slate-300 text-slate-600 font-bold disabled:opacity-50 text-sm md:text-base">Wstecz</button>
           {calc.step < 6 && <button disabled={calc.step === 3 && !canProceedStep3} onClick={() => setCalc({...calc, step: Math.min(6, calc.step + 1)})} className={`px-6 py-2 md:px-8 md:py-3 rounded-xl font-bold shadow-lg text-sm md:text-base ${calc.step === 3 && !canProceedStep3 ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-amber-500 text-white hover:bg-amber-600'}`}>{calc.step === 3 && !canProceedStep3 ? 'Zatwierdź ryzyko' : 'Dalej'}</button>}
        </div>
      </div>
    );
  };

  const renderToolContent = () => {
    switch (currentTool) {
      case 'PRESENTATION':
        return (
          <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
               <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center">
                 <Presentation className="mr-3 text-indigo-600" /> Prezentacja
               </h2>
               <label className="bg-indigo-600 text-white px-3 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors flex items-center shadow-sm text-sm">
                 <Upload className="w-4 h-4 mr-2" /> Wgraj <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
               </label>
             </div>
             <div className="flex-1 bg-slate-100 p-2 md:p-4 flex items-center justify-center">
                {presentationFile ? <iframe src={presentationFile} className="w-full h-full rounded-lg shadow-lg" title="Prezentacja" /> : <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-dashed border-slate-300"><p className="text-slate-500 mb-4">Wgraj plik PDF.</p></div>}
             </div>
          </div>
        );
      case 'CALC_PV':
        return renderPvCalculator();
      default:
        return <div className="text-center p-8 text-slate-400">Wybierz narzędzie</div>;
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      {currentTool === 'MENU' ? (
        <div className="max-w-6xl mx-auto pt-4 md:pt-10 px-4">
          <div className="text-center mb-8 md:mb-12"><h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">Aplikacje</h1><p className="text-sm md:text-lg text-slate-500">Wybierz moduł.</p></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {tools.map((tool) => (
              <button key={tool.id} onClick={() => onChangeTool(tool.id as AppTool)} className="group bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 flex flex-col items-center text-center">
                <div className={`w-16 h-16 md:w-20 md:h-20 ${tool.color} rounded-2xl flex items-center justify-center text-white mb-4 md:mb-6 shadow-lg`}><tool.icon className="w-8 h-8 md:w-10 md:h-10" /></div>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1">{tool.title}</h3>
                <p className="text-xs md:text-sm text-slate-500">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
           <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex items-center shadow-sm sticky top-0 z-20 shrink-0">
              <button onClick={() => onChangeTool('MENU')} className="flex items-center text-slate-500 hover:text-slate-800 font-medium"><ArrowLeft className="w-5 h-5 mr-2" /> Menu</button>
           </div>
           <div className="flex-1 p-0 md:p-8 overflow-y-auto">{renderToolContent()}</div>
        </div>
      )}
    </div>
  );
};
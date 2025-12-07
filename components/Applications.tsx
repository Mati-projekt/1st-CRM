import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Presentation, Battery, Wind, Flame, Zap, Sun, User, CheckCircle, ChevronRight, BarChart3, Upload, Plus, Home, Hammer, Shovel, ShieldCheck, Banknote, Save, AlertTriangle, ArrowUpRight, CheckSquare, Coins, Calculator, Percent, ChevronDown, ChevronUp, CalendarClock } from 'lucide-react';
import { Customer, InventoryItem, ProductCategory, CalculatorState, Offer, TariffType, User as AppUser, SystemSettings } from '../types';

interface ApplicationsProps {
  customers: Customer[];
  inventory: InventoryItem[];
  onSaveOffer: (offer: Offer, isNewClient: boolean, newClientData?: { name: string, address: string, phone: string, email: string }) => void;
  initialState: CalculatorState | null;
  clearInitialState: () => void;
  currentUser: AppUser;
  systemSettings: SystemSettings;
}

type AppTool = 'MENU' | 'PRESENTATION' | 'CALC_PV' | 'CALC_ME' | 'CALC_PV_WIND' | 'CALC_HEAT';

export const Applications: React.FC<ApplicationsProps> = ({ 
  customers, 
  inventory, 
  onSaveOffer, 
  initialState, 
  clearInitialState,
  currentUser,
  systemSettings
}) => {
  const [currentTool, setCurrentTool] = useState<AppTool>('MENU');
  const [presentationFile, setPresentationFile] = useState<string | null>(null);

  // Loan Calculator State
  const [showLoanCalc, setShowLoanCalc] = useState(false);
  const [loanMonths, setLoanMonths] = useState(120);
  const [loanRate, setLoanRate] = useState(9.0);
  const [defermentMonths, setDefermentMonths] = useState(0);

  const [calc, setCalc] = useState<CalculatorState>({
    step: 1,
    clientId: 'ANON',
    isNewClient: false,
    newClientData: { name: '', address: '', phone: '', email: '' },
    tariff: 'G11',
    phases: 3, 
    consumption: 4000,
    connectionPower: 14, 
    pricePerKwh: 1.15, 
    priceOffPeak: 0.65, 
    percentOffPeak: 40, 
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
      setCurrentTool('CALC_PV');
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

  const autoSelectComponents = () => {
    const neededKwp = (calc.consumption / 1000) * 1.2;
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
    const selectedMounting = accessories.find(a => a.id === calc.mountingSystemId);

    // Costs
    const costPanels = (selectedPanel?.price || 0) * calc.panelCount;
    const costInverter = selectedInverter?.price || 0;
    const costStorage = (selectedStorage?.price || 0) * calc.storageCount;
    // Mounting cost logic adjusted to fit table pricing (per panel pricing + base)
    const costMounting = (selectedMounting?.price || 120) * calc.panelCount; 
    
    const costTrench = calc.installationType === 'GROUND' ? calc.trenchLength * 100 : 0;
    const costEMS = calc.hasEMS ? 1500 : 0;
    const costUPS = calc.hasUPS ? 2500 : 0;
    
    // Labor Cost Logic: Optimized to match the pricing table
    // 10kW System: ~21,000 Total.
    // Hardware: ~12,000 (Panels + Inv).
    // Remaining for Labor + Mounting: ~9,000.
    // Mounting ~2500. Labor ~6500.
    // New Formula: Base 1500 + 100 per panel (Lower than before to fit competitive pricing)
    const costLabor = 1500 + (calc.panelCount * 100);

    // Group Costs for Subsidy Calculation (50% rule)
    // PV Costs = Panels + Inverter + Mounting + Labor + Trench + EMS/UPS
    const costPVTotal = costPanels + costInverter + costMounting + costLabor + costTrench + costEMS + costUPS;
    // Storage Costs = Batteries
    const costStorageTotal = costStorage;

    let totalSystemPrice = costPVTotal + costStorageTotal;
    
    // Apply Category 2 Markup (Global Admin Setting)
    let appliedMarkup = 0;
    if (currentUser.salesCategory === '2') {
       if (systemSettings.cat2MarkupType === 'PERCENT') {
         appliedMarkup = totalSystemPrice * (systemSettings.cat2MarkupValue / 100);
       } else {
         appliedMarkup = systemSettings.cat2MarkupValue;
       }
       totalSystemPrice += appliedMarkup;
    }

    // Apply Personal Fixed Margin (Sales Rep Setting)
    let personalMarkup = 0;
    if (currentUser.salesSettings) {
       // Add PV margin if there's a system (checking if panels > 0)
       if (calc.panelCount > 0) {
         personalMarkup += (currentUser.salesSettings.marginPV || 0);
       }
       // Add Storage margin if storage selected
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

    // Check PV subsidy
    if (calc.subsidyMojPradPV) {
        const maxSubsidy = 7000;
        const cap50Percent = (costPVTotal + appliedMarkup + (calc.panelCount > 0 ? (currentUser.salesSettings?.marginPV || 0) : 0)) * 0.5; 
        subsidyPV = Math.min(maxSubsidy, cap50Percent);
        if (subsidyPV < maxSubsidy) limitedByCapPV = true;
    }

    // Check Storage subsidy (only if storage is actually selected)
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
    
    let currentBill = calc.consumption * effectivePricePerKwh; 
    let accumulatedBalance = -netInvestment; 
    let paybackYear = 0;
    let foundPayback = false;

    const systemPowerKw = ((selectedPanel?.power || 0) * calc.panelCount) / 1000;
    const estimatedProductionKwh = systemPowerKw * 1000; 
    
    let efficiencyRatio = 0.6; 
    if (calc.storageId) efficiencyRatio += 0.2; 
    if (calc.hasEMS) efficiencyRatio += 0.05; 
    
    // Determine max value for chart scaling
    let maxChartValue = 0;

    for (let i = 1; i <= 20; i++) {
       const yearlyBillWithoutPV = currentBill;
       const productionValue = estimatedProductionKwh * effectivePricePerKwh;
       let yearlySavings = Math.min(yearlyBillWithoutPV, productionValue * efficiencyRatio);

       accumulatedBalance += yearlySavings;
       if (!foundPayback && accumulatedBalance >= 0) {
         paybackYear = i;
         foundPayback = true;
       }
       chartData.push({ year: i, balance: accumulatedBalance, savings: yearlySavings });
       
       if (Math.abs(accumulatedBalance) > maxChartValue) maxChartValue = Math.abs(accumulatedBalance);
       
       currentBill = currentBill * (1 + inflation);
    }

    const inverterPower = selectedInverter?.power || 0;
    let powerToCheck = systemPowerKw;

    if (inverterPower > systemPowerKw) {
       powerToCheck = inverterPower + systemPowerKw;
    }
    const exceedsConnectionPower = powerToCheck > calc.connectionPower;

    return { 
        totalSystemPrice, netInvestment, subsidyPV, subsidyStorage, totalSubsidies, taxReturn, chartData, paybackYear, effectivePricePerKwh, systemPowerKw, inverterPower, appliedMarkup, personalMarkup,
        exceedsConnectionPower, powerToCheck, limitedByCapPV, limitedByCapStorage, maxChartValue,
        breakdown: { costPanels, costInverter, costStorage, costMounting, costTrench, costLabor, costEMS, costUPS },
        components: { panel: selectedPanel, inverter: selectedInverter, storage: selectedStorage, mounting: selectedMounting }
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
      const offer: Offer = {
        id: offerId,
        name: `Instalacja PV ${systemPower.toFixed(2)} kWp (${calc.installationType === 'ROOF' ? 'Dach' : 'Grunt'})`,
        dateCreated: new Date().toISOString(),
        finalPrice: financials.totalSystemPrice,
        calculatorState: { ...calc },
        appliedMarkup: financials.appliedMarkup,
        personalMarkup: financials.personalMarkup
      };
      onSaveOffer(offer, calc.isNewClient, calc.isNewClient ? calc.newClientData : undefined);
      setCurrentTool('MENU');
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
               <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
                  <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">Instalacja</label>
                           <select value={calc.phases} onChange={(e) => setCalc({...calc, phases: Number(e.target.value) as 1 | 3})} className="w-full p-3 border rounded-xl bg-white font-bold">
                              <option value={1}>1-Fazowa</option>
                              <option value={3}>3-Fazowa</option>
                           </select>
                        </div>
                        <div>
                           <label className="block text-sm font-bold text-slate-700 mb-2">Moc przyłącz. (kW)</label>
                           <input type="number" value={calc.connectionPower} onChange={(e) => setCalc({...calc, connectionPower: Number(e.target.value)})} className="w-full p-3 border rounded-xl font-bold" />
                        </div>
                     </div>
                     <div><label className="block text-sm font-bold text-slate-700 mb-2">Zużycie (kWh)</label><input type="number" value={calc.consumption} onChange={(e) => setCalc({...calc, consumption: Number(e.target.value)})} className="w-full p-3 border rounded-xl font-bold text-lg" /></div>
                     <div><label className="block text-sm font-bold text-slate-700 mb-2">Taryfa</label><select value={calc.tariff} onChange={(e) => setCalc({...calc, tariff: e.target.value as TariffType})} className="w-full p-3 border rounded-xl bg-white"><option value="G11">G11</option><option value="G12">G12</option></select></div>
                     <div><label className="block text-sm font-bold text-slate-700 mb-2">Cena prądu (PLN)</label><input type="number" step="0.01" value={calc.pricePerKwh} onChange={(e) => setCalc({...calc, pricePerKwh: Number(e.target.value)})} className="w-full p-3 border rounded-xl font-bold text-lg" /></div>
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
                  {financials.exceedsConnectionPower && <ConnectionPowerWarning />}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                         <h4 className="font-bold mb-2 flex items-center"><Sun className="w-5 h-5 mr-2 text-amber-500"/> Panele</h4>
                         <select className="w-full p-2 border rounded mb-2 text-sm" value={calc.panelId} onChange={(e) => setCalc({...calc, panelId: e.target.value})}><option value="">Wybierz...</option>{panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                         <input type="number" className="w-full p-2 border rounded font-bold" value={calc.panelCount} onChange={(e) => setCalc({...calc, panelCount: Number(e.target.value)})} />
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                         <h4 className="font-bold mb-2 flex items-center"><Zap className="w-5 h-5 mr-2 text-blue-500"/> Falownik</h4>
                         <select className="w-full p-2 border rounded text-sm" value={calc.inverterId} onChange={(e) => setCalc({...calc, inverterId: e.target.value})}><option value="">Wybierz...</option>{inverters.map(i => <option key={i.id} value={i.id}>{i.name} - {i.price} zł</option>)}</select>
                     </div>
                     <div className="bg-white p-4 rounded-xl border border-slate-200">
                         <h4 className="font-bold mb-2 flex items-center"><Battery className="w-5 h-5 mr-2 text-green-500"/> Magazyn</h4>
                         <select className="w-full p-2 border rounded mb-2 text-sm" value={calc.storageId} onChange={(e) => setCalc({...calc, storageId: e.target.value})}><option value="">Brak</option>{batteries.map(b => <option key={b.id} value={b.id}>{b.name} - {b.price} zł</option>)}</select>
                         {calc.storageId && <input type="number" className="w-full p-2 border rounded font-bold" value={calc.storageCount} min={1} onChange={(e) => setCalc({...calc, storageCount: Number(e.target.value)})} />}
                     </div>
                  </div>
               </div>
            )}

            {/* Step 4: Mounting (RESTORED) */}
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
                               <input 
                                 type="number" 
                                 value={calc.trenchLength}
                                 onChange={(e) => setCalc({...calc, trenchLength: Number(e.target.value)})}
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
                         <label className="block text-sm font-bold text-slate-600 mb-2">Wybierz System Montażowy (Z Magazynu)</label>
                         <select 
                           className="w-full p-3 border border-slate-300 rounded-xl bg-white font-bold" 
                           value={calc.mountingSystemId} 
                           onChange={(e) => setCalc({...calc, mountingSystemId: e.target.value})}
                         >
                            <option value="">-- Wybierz System --</option>
                            {accessories.map(a => (
                               <option key={a.id} value={a.id}>{a.name} - {a.price} zł</option>
                            ))}
                         </select>
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
                   <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-slate-200">
                       <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-6 border-b pb-4">Podsumowanie Kosztów</h3>
                       <div className="space-y-4 text-sm md:text-base">
                           <div className="flex justify-between items-center"><span className="font-medium text-slate-600">Wartość Inwestycji (Brutto)</span><span className="font-bold text-xl text-slate-900">{financials.totalSystemPrice.toLocaleString()} PLN</span></div>
                           <div className="flex justify-between items-center text-green-700"><span className="flex items-center"><CheckSquare className="w-4 h-4 mr-2"/> Ulga Termomodernizacyjna</span><span className="font-bold">- {Math.round(financials.taxReturn).toLocaleString()} PLN</span></div>
                           <div className="flex justify-between items-center text-green-700"><span className="flex items-center"><Coins className="w-4 h-4 mr-2"/> Suma Dotacji</span><span className="font-bold">- {financials.totalSubsidies.toLocaleString()} PLN</span></div>
                           <div className="border-t border-slate-300 my-4 pt-4 flex justify-between items-center"><span className="text-lg md:text-xl font-extrabold text-slate-800 uppercase">Koszt Finalny</span><span className="text-3xl md:text-4xl font-extrabold text-blue-700">{financials.netInvestment.toLocaleString('pl-PL', {maximumFractionDigits: 0})} PLN</span></div>
                       </div>
                       
                       {/* ROI Chart */}
                       <div className="mt-8">
                          <h4 className="font-bold text-slate-800 mb-4 flex items-center"><BarChart3 className="w-5 h-5 mr-2" /> Zwrot z inwestycji (20 lat)</h4>
                          <div className="h-64 flex items-end space-x-1 relative border-b border-slate-300 pb-2">
                             {/* Zero Line */}
                             <div className="absolute w-full border-t border-slate-400 border-dashed" style={{ bottom: `${(Math.abs(-financials.netInvestment) / (financials.maxChartValue + financials.netInvestment)) * 100}%` }}></div>
                             
                             {financials.chartData.map((d) => {
                                const isPositive = d.balance >= 0;
                                // Calculate height percentage relative to max value
                                // Offset base by negative investment amount to fit in graph
                                const totalRange = financials.maxChartValue + Math.abs(-financials.netInvestment); 
                                const zeroOffset = Math.abs(-financials.netInvestment);
                                const barHeight = Math.abs(d.balance) / totalRange * 100;
                                const bottomPos = isPositive 
                                   ? (zeroOffset / totalRange * 100) 
                                   : ((zeroOffset - Math.abs(d.balance)) / totalRange * 100);

                                return (
                                   <div key={d.year} className="flex-1 flex flex-col items-center group relative">
                                      <div 
                                         className={`w-full rounded-t-sm transition-all ${isPositive ? 'bg-green-500' : 'bg-red-400'}`} 
                                         style={{ 
                                            height: `${Math.max(1, barHeight)}%`, 
                                            marginBottom: `${bottomPos}%`
                                         }}
                                      ></div>
                                      {/* Tooltip */}
                                      <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] p-2 rounded pointer-events-none z-10 w-24 text-center">
                                         Rok {d.year}<br/>
                                         {Math.round(d.balance).toLocaleString()} PLN
                                      </div>
                                   </div>
                                );
                             })}
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-slate-500 font-bold">
                             <span>Rok 1</span>
                             <span>Rok 10</span>
                             <span>Rok 20</span>
                          </div>
                          {financials.paybackYear > 0 && (
                             <p className="text-center mt-4 font-bold text-green-600 bg-green-50 p-2 rounded-lg border border-green-100">
                                Szacowany zwrot inwestycji: <span className="text-lg">{financials.paybackYear} lat</span>
                             </p>
                          )}
                       </div>

                       {/* Subscription Sim (Loan) */}
                       <div className="mt-6 border border-blue-100 bg-blue-50/50 rounded-xl overflow-hidden">
                           <button onClick={() => setShowLoanCalc(!showLoanCalc)} className="w-full flex justify-between items-center p-4 text-blue-700 font-bold text-sm hover:bg-blue-100/50">
                               <span className="flex items-center"><Calculator className="w-4 h-4 mr-2" /> Symulacja Abonamentu</span>
                               {showLoanCalc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                           </button>
                           {showLoanCalc && (
                               <div className="p-4 border-t border-blue-100 bg-white space-y-4 animate-slide-up">
                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Miesiące</label><input type="number" value={loanMonths} onChange={(e) => setLoanMonths(Number(e.target.value))} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Oprocentowanie (%)</label><input type="number" value={loanRate} step="0.1" onChange={(e) => setLoanRate(Number(e.target.value))} className="w-full p-2 border rounded-lg font-bold" /></div>
                                       <div><label className="block text-xs font-bold text-slate-500 mb-1">Odroczenie</label><input type="number" value={defermentMonths} min="0" max="24" onChange={(e) => setDefermentMonths(Number(e.target.value))} className="w-full p-2 border rounded-lg font-bold" /></div>
                                   </div>
                                   <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg flex items-center justify-center text-xs font-bold text-amber-800"><CalendarClock className="w-4 h-4 mr-2" />Pierwsza płatność: {calculateFirstPaymentDate(defermentMonths)}</div>
                                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                       <div className="bg-slate-50 p-3 rounded-lg border border-slate-200"><p className="text-xs text-slate-500 mb-1">Abonament przed dotacją</p><p className="text-xl font-bold text-slate-800">{Math.round(calculateLoan(financials.totalSystemPrice, loanMonths, loanRate)).toLocaleString()} PLN</p></div>
                                       <div className="bg-blue-50 p-3 rounded-lg border border-blue-200"><p className="text-xs text-blue-600 mb-1 font-bold">Abonament po dotacjach</p><p className="text-xl font-bold text-blue-700">{Math.round(calculateLoan(financials.netInvestment, loanMonths, loanRate)).toLocaleString()} PLN</p></div>
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
              <button key={tool.id} onClick={() => setCurrentTool(tool.id as AppTool)} className="group bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 flex flex-col items-center text-center">
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
              <button onClick={() => setCurrentTool('MENU')} className="flex items-center text-slate-500 hover:text-slate-800 font-medium"><ArrowLeft className="w-5 h-5 mr-2" /> Menu</button>
           </div>
           <div className="flex-1 p-0 md:p-8 overflow-y-auto">{renderToolContent()}</div>
        </div>
      )}
    </div>
  );
};
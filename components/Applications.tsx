
import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, Presentation, Battery, Wind, Flame, Zap, Sun, User, CheckCircle, ChevronRight, BarChart3, Upload, Plus, Home, Hammer, Shovel, ShieldCheck, Banknote, Save, AlertTriangle } from 'lucide-react';
import { Customer, InventoryItem, ProductCategory, CalculatorState, Offer, RoofType, TariffType } from '../types';

interface ApplicationsProps {
  customers: Customer[];
  inventory: InventoryItem[];
  onSaveOffer: (offer: Offer, isNewClient: boolean, newClientData?: { name: string, address: string, phone: string }) => void;
  initialState: CalculatorState | null;
  clearInitialState: () => void;
}

type AppTool = 'MENU' | 'PRESENTATION' | 'CALC_PV' | 'CALC_ME' | 'CALC_PV_WIND' | 'CALC_HEAT';

export const Applications: React.FC<ApplicationsProps> = ({ customers, inventory, onSaveOffer, initialState, clearInitialState }) => {
  const [currentTool, setCurrentTool] = useState<AppTool>('MENU');
  const [presentationFile, setPresentationFile] = useState<string | null>(null);

  // PV Calculator State
  const [calc, setCalc] = useState<CalculatorState>({
    step: 1,
    clientId: 'ANON',
    isNewClient: false,
    newClientData: { name: '', address: '', phone: '' },
    
    // Energy
    tariff: 'G11',
    consumption: 4000,
    connectionPower: 14, // Default 14kW
    pricePerKwh: 1.15, // Single/Day Price
    priceOffPeak: 0.65, // Night Price
    percentOffPeak: 40, // % usage in cheap zone

    panelId: '',
    panelCount: 10,
    inverterId: '',
    storageId: '',
    storageCount: 1,
    roofType: 'DACHOWKA',
    trenchLength: 0,
    mountingSystemId: '',
    hasEMS: false,
    hasUPS: false,
    subsidyMojPrad: true,
    subsidyCzystePowietrze: false,
    taxRelief: 'NONE',
  });

  // Effect to load initial state (Editing an offer)
  useEffect(() => {
    if (initialState) {
      setCalc(initialState);
      setCurrentTool('CALC_PV');
      clearInitialState(); // consume the state so it doesn't reload on component updates
    }
  }, [initialState, clearInitialState]);

  const tools = [
    { id: 'PRESENTATION', title: 'Prezentacja', icon: Presentation, color: 'bg-indigo-500', desc: 'Wyświetl prezentację firmy' },
    { id: 'CALC_PV', title: 'Kalkulator PV', icon: Sun, color: 'bg-amber-500', desc: 'Dobór mocy, wycena, ROI' },
    { id: 'CALC_ME', title: 'Kalkulator ME', icon: Battery, color: 'bg-green-500', desc: 'Magazyny energii i autokonsumpcja' },
    { id: 'CALC_PV_WIND', title: 'Kalkulator PV + Wiatrak', icon: Wind, color: 'bg-cyan-500', desc: 'Systemy hybrydowe' },
    { id: 'CALC_HEAT', title: 'System Grzewczy', icon: Flame, color: 'bg-red-500', desc: 'Pompy ciepła i maty grzewcze' },
  ];

  // Helper to filter inventory
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

  // --- PV Calculator Logic ---

  const autoSelectComponents = () => {
    // 1. Calculate needed PV Power
    // Standard rule: consumption / 1000 * 1.2 (for autarky)
    const neededKwp = (calc.consumption / 1000) * 1.2;
    const panel = panels[0];
    if (!panel) return;

    const singlePanelKw = (panel.power || 400) / 1000;
    const count = Math.ceil(neededKwp / singlePanelKw);

    // 2. Select Inverter
    const inverter = inverters.reduce((prev, curr) => {
      return (Math.abs((curr.power || 0) - neededKwp) < Math.abs((prev.power || 0) - neededKwp) ? curr : prev);
    }, inverters[0]);

    // 3. Smart Storage Selection (AI Logic Mock)
    let selectedStorageId = '';
    let selectedStorageCount = 1;

    // Logic: If user has a dual tariff (G12/G12w), they benefit more from larger storage to bridge the peak gap
    // G11 -> Ratio ~0.6-0.8 kWh per kWp
    // G12/G12w -> Ratio ~1.0-1.2 kWh per kWp (to store cheap night energy or cover expensive peaks)
    const isDualTariff = ['G12', 'G12w', 'C12a', 'C12b'].includes(calc.tariff);
    const storageRatio = isDualTariff ? 1.1 : 0.7;
    const targetStorageCapacity = neededKwp * storageRatio;

    const storage = batteries[0]; // Simplified selection from inventory
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
      storageCount: selectedStorageCount
    }));
  };

  const calculateFinancials = () => {
    // 1. Calculate Hardware Cost
    const selectedPanel = panels.find(p => p.id === calc.panelId);
    const selectedInverter = inverters.find(i => i.id === calc.inverterId);
    const selectedStorage = batteries.find(b => b.id === calc.storageId);
    const selectedMounting = accessories.find(a => a.id === calc.mountingSystemId);

    const costPanels = (selectedPanel?.price || 0) * calc.panelCount;
    const costInverter = selectedInverter?.price || 0;
    const costStorage = (selectedStorage?.price || 0) * calc.storageCount;
    const costMounting = (selectedMounting?.price || 0) * calc.panelCount; 
    
    const costTrench = calc.roofType === 'GRUNT' ? calc.trenchLength * 100 : 0;

    const costEMS = calc.hasEMS ? 1500 : 0;
    const costUPS = calc.hasUPS ? 2500 : 0;

    const costLabor = 3000 + (calc.panelCount * 200);

    const totalSystemPrice = costPanels + costInverter + costStorage + costMounting + costTrench + costEMS + costUPS + costLabor;

    // 2. Subsidies
    let subsidyPV = 0;
    let subsidyStorage = 0;

    const valueStorage = costStorage;
    const valuePV = totalSystemPrice - valueStorage;

    if (calc.subsidyMojPrad) {
        if (calc.storageId) {
            const maxPvGrant = 7000;
            subsidyPV = Math.min(maxPvGrant, valuePV * 0.5);

            const maxStorageGrant = 16000;
            subsidyStorage = Math.min(maxStorageGrant, valueStorage * 0.5);
        } else {
            const maxPvGrant = 6000;
            subsidyPV = Math.min(maxPvGrant, valuePV * 0.5);
            subsidyStorage = 0;
        }
    }

    const totalSubsidies = subsidyPV + subsidyStorage;
    
    // 3. Tax Relief
    const taxBase = Math.max(0, totalSystemPrice - totalSubsidies);
    let taxReturn = 0;
    if (calc.taxRelief === '12') taxReturn = taxBase * 0.12;
    if (calc.taxRelief === '32') taxReturn = taxBase * 0.32;

    const netInvestment = totalSystemPrice - taxReturn - totalSubsidies;

    // 5. ROI Loop
    const inflation = 0.08; 
    const chartData = [];
    
    // Calculate effective electricity price based on tariff
    let effectivePricePerKwh = calc.pricePerKwh;
    if (['G12', 'G12w', 'C12a', 'C12b'].includes(calc.tariff) && calc.priceOffPeak !== undefined && calc.percentOffPeak !== undefined) {
        // Weighted Average: (DayPrice * Day%) + (NightPrice * Night%)
        const dayPercent = 100 - calc.percentOffPeak;
        effectivePricePerKwh = (calc.pricePerKwh * (dayPercent / 100)) + (calc.priceOffPeak * (calc.percentOffPeak / 100));
    }
    
    let currentBill = calc.consumption * effectivePricePerKwh; 
    let accumulatedBalance = -netInvestment; 
    let paybackYear = 0;
    let foundPayback = false;

    const systemPowerKw = ((selectedPanel?.power || 0) * calc.panelCount) / 1000;
    const estimatedProductionKwh = systemPowerKw * 1000; 
    
    // Smart efficiency adjustment
    // Storage + Dual Tariff = better savings optimization
    let efficiencyRatio = 0.6; // Base self-consumption/savings ratio
    if (calc.storageId) efficiencyRatio += 0.2; // Battery adds ~20%
    if (calc.hasEMS) efficiencyRatio += 0.05; // EMS adds ~5%
    
    for (let i = 1; i <= 20; i++) {
       const yearlyBillWithoutPV = currentBill;
       const productionValue = estimatedProductionKwh * effectivePricePerKwh;
       
       // Savings cannot exceed the bill (unless selling, but net-billing is complex, simplifying to bill offset)
       let yearlySavings = Math.min(yearlyBillWithoutPV, productionValue * efficiencyRatio);

       accumulatedBalance += yearlySavings;

       if (!foundPayback && accumulatedBalance >= 0) {
         paybackYear = i;
         foundPayback = true;
       }
       
       chartData.push({ 
           year: i, 
           balance: accumulatedBalance, 
           savings: yearlySavings 
       });

       currentBill = currentBill * (1 + inflation);
    }

    return { 
        totalSystemPrice, 
        netInvestment, 
        subsidyPV, 
        subsidyStorage, 
        taxReturn, 
        chartData, 
        paybackYear,
        effectivePricePerKwh,
        systemPowerKw,
        breakdown: {
            costPanels, costInverter, costStorage, costMounting, costTrench, costLabor, costEMS, costUPS
        },
        components: {
            panel: selectedPanel,
            inverter: selectedInverter,
            storage: selectedStorage,
            mounting: selectedMounting
        }
    };
  };

  const financials = useMemo(() => calculateFinancials(), [calc]);

  const handleFinishAndSave = () => {
      // 1. Prepare data
      const offerId = Date.now().toString();
      const systemPower = ((financials.components.panel?.power || 0) * calc.panelCount) / 1000;
      
      const offer: Offer = {
        id: offerId,
        name: `Instalacja PV ${systemPower.toFixed(2)} kWp`,
        dateCreated: new Date().toISOString(),
        finalPrice: financials.netInvestment,
        calculatorState: { ...calc } // Save a snapshot
      };

      // 2. Call handler to save to Customer
      onSaveOffer(offer, calc.isNewClient, calc.isNewClient ? calc.newClientData : undefined);

      // 3. Exit
      setCurrentTool('MENU');
  };

  const renderPvCalculator = () => {
    const isDualTariff = ['G12', 'G12w', 'C12a', 'C12b'].includes(calc.tariff);
    const exceedsConnectionPower = financials.systemPowerKw > calc.connectionPower;

    return (
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in flex flex-col h-full">
        {/* Wizard Header */}
        <div className="bg-slate-900 text-white px-8 py-6">
           <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold flex items-center">
                 <Sun className="mr-3 text-amber-400" /> Kalkulator Fotowoltaiczny
              </h2>
              <div className="text-sm font-medium bg-slate-800 px-3 py-1 rounded-full border border-slate-700">Krok {calc.step} z 6</div>
           </div>
           
           {/* Steps */}
           <div className="relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 rounded"></div>
              <div 
                className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-amber-500 rounded transition-all duration-500"
                style={{ width: `${((calc.step - 1) / 5) * 100}%` }}
              ></div>
              <div className="relative flex justify-between">
                  {[
                      { n: 1, label: 'Klient' }, 
                      { n: 2, label: 'Energia' }, 
                      { n: 3, label: 'Komponenty' }, 
                      { n: 4, label: 'Montaż' }, 
                      { n: 5, label: 'Finanse' },
                      { n: 6, label: 'Podsumowanie' }
                  ].map((s) => (
                      <div key={s.n} className="flex flex-col items-center group cursor-default">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all border-4 ${
                              calc.step >= s.n 
                              ? 'bg-amber-500 border-slate-900 text-white' 
                              : 'bg-slate-800 border-slate-900 text-slate-500'
                          }`}>
                              {calc.step > s.n ? <CheckCircle className="w-5 h-5" /> : s.n}
                          </div>
                          <span className={`text-xs mt-2 font-medium ${calc.step >= s.n ? 'text-amber-400' : 'text-slate-600'}`}>{s.label}</span>
                      </div>
                  ))}
              </div>
           </div>
        </div>

        {/* Wizard Content */}
        <div className="p-8 flex-1 overflow-y-auto bg-slate-50/50">
          
          {/* STEP 1: CLIENT */}
          {calc.step === 1 && (
            <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
               <div className="text-center">
                   <h3 className="text-2xl font-bold text-slate-800 mb-2">Dla kogo wykonujemy kalkulację?</h3>
                   <p className="text-slate-500">Wybierz klienta z bazy lub wprowadź dane ręcznie.</p>
               </div>
               
               <div className="grid gap-4">
                  {/* Option: Existing Customer */}
                  <div 
                    onClick={() => setCalc({...calc, isNewClient: false})}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center ${!calc.isNewClient ? 'border-amber-500 bg-amber-50' : 'border-white bg-white hover:border-amber-200'}`}
                  >
                      <User className={`w-6 h-6 mr-4 ${!calc.isNewClient ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div className="flex-1">
                          <p className="font-bold text-slate-800">Wybierz z bazy klientów</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!calc.isNewClient ? 'border-amber-500' : 'border-slate-300'}`}>
                          {!calc.isNewClient && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                      </div>
                  </div>

                  {!calc.isNewClient && (
                      <select 
                        className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                        value={calc.clientId}
                        onChange={(e) => setCalc({...calc, clientId: e.target.value})}
                      >
                          <option value="ANON">Klient Anonimowy</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  )}

                  {/* Option: New Customer */}
                  <div 
                    onClick={() => setCalc({...calc, isNewClient: true, clientId: 'ANON'})}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center ${calc.isNewClient ? 'border-amber-500 bg-amber-50' : 'border-white bg-white hover:border-amber-200'}`}
                  >
                      <Plus className={`w-6 h-6 mr-4 ${calc.isNewClient ? 'text-amber-600' : 'text-slate-400'}`} />
                      <div className="flex-1">
                          <p className="font-bold text-slate-800">Dodaj nowego klienta</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${calc.isNewClient ? 'border-amber-500' : 'border-slate-300'}`}>
                          {calc.isNewClient && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                      </div>
                  </div>

                  {calc.isNewClient && (
                      <div className="bg-white p-6 rounded-xl border border-amber-100 space-y-4 shadow-sm">
                          <input 
                            type="text" 
                            placeholder="Imię i Nazwisko / Nazwa Firmy"
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-amber-400"
                            value={calc.newClientData.name}
                            onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, name: e.target.value}})}
                          />
                          <input 
                            type="text" 
                            placeholder="Adres inwestycji"
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-amber-400"
                            value={calc.newClientData.address}
                            onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, address: e.target.value}})}
                          />
                          <input 
                            type="text" 
                            placeholder="Telefon kontaktowy"
                            className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:border-amber-400"
                            value={calc.newClientData.phone}
                            onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, phone: e.target.value}})}
                          />
                      </div>
                  )}
               </div>
            </div>
          )}

          {/* STEP 2: ENERGY & TARIFF */}
          {calc.step === 2 && (
            <div className="max-w-xl mx-auto space-y-8 animate-fade-in">
               <div className="text-center">
                   <h3 className="text-2xl font-bold text-slate-800 mb-2">Profil Energetyczny</h3>
                   <p className="text-slate-500">Wybierz taryfę, aby dokładnie obliczyć opłacalność.</p>
               </div>
               
               <div className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Roczne zużycie energii</label>
                     <div className="relative">
                       <input 
                        type="number" 
                        value={calc.consumption}
                        onChange={(e) => setCalc({...calc, consumption: Number(e.target.value)})}
                        className="w-full p-4 pr-16 text-2xl font-bold text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                       />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">kWh</span>
                     </div>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Moc przyłączeniowa (z umowy z operatorem)</label>
                     <div className="relative">
                       <input 
                        type="number" 
                        step="0.5"
                        value={calc.connectionPower}
                        onChange={(e) => setCalc({...calc, connectionPower: Number(e.target.value)})}
                        className="w-full p-4 pr-16 text-2xl font-bold text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                       />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">kW</span>
                     </div>
                     <p className="text-xs text-slate-400 mt-1">Moc instalacji PV nie może przekraczać mocy przyłączeniowej.</p>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Taryfa Operatora</label>
                     <select 
                       value={calc.tariff}
                       onChange={(e) => setCalc({...calc, tariff: e.target.value as TariffType})}
                       className="w-full p-4 text-lg border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                     >
                        <option value="G11">G11 - Stała (Całodobowa)</option>
                        <option value="G12">G12 - Dwustrefowa (Dzień/Noc)</option>
                        <option value="G12w">G12w - Weekendowa</option>
                        <option value="C11">C11 - Biznes (Stała)</option>
                        <option value="C12a">C12a - Biznes (Szczytowa)</option>
                     </select>
                  </div>

                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">
                       {isDualTariff ? 'Cena prądu - Szczyt (I Strefa)' : 'Cena prądu (Brutto)'}
                     </label>
                     <div className="relative">
                       <input 
                        type="number" 
                        step="0.01"
                        value={calc.pricePerKwh}
                        onChange={(e) => setCalc({...calc, pricePerKwh: Number(e.target.value)})}
                        className="w-full p-4 pr-16 text-2xl font-bold text-slate-800 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
                       />
                       <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">PLN</span>
                     </div>
                  </div>

                  {isDualTariff && (
                    <div className="grid grid-cols-2 gap-4 animate-fade-in">
                       <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">Cena - Pozaszczyt (II)</label>
                         <div className="relative">
                           <input 
                            type="number" 
                            step="0.01"
                            value={calc.priceOffPeak || 0.60}
                            onChange={(e) => setCalc({...calc, priceOffPeak: Number(e.target.value)})}
                            className="w-full p-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                           />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">PLN</span>
                         </div>
                       </div>
                       <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">Zużycie w taniej strefie</label>
                         <div className="relative">
                           <input 
                            type="number" 
                            value={calc.percentOffPeak || 40}
                            onChange={(e) => setCalc({...calc, percentOffPeak: Number(e.target.value)})}
                            className="w-full p-3 text-lg font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                           />
                           <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                         </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          )}

          {/* STEP 3: CORE COMPONENTS */}
          {calc.step === 3 && (
            <div className="space-y-8 animate-fade-in">
               <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-slate-800">Główne Komponenty</h3>
                  <button onClick={autoSelectComponents} className="flex items-center space-x-2 text-white bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-2.5 rounded-lg font-bold hover:shadow-lg transition-all shadow-md transform hover:-translate-y-0.5">
                     <Zap className="w-5 h-5" /> <span>Inteligentny Dobór AI</span>
                  </button>
               </div>

               {exceedsConnectionPower && (
                 <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start animate-fade-in">
                    <AlertTriangle className="w-5 h-5 mr-3 mt-0.5" />
                    <div>
                       <p className="font-bold">Uwaga: Przekroczono moc przyłączeniową!</p>
                       <p className="text-sm">Moc instalacji ({financials.systemPowerKw.toFixed(2)} kWp) jest większa niż moc przyłączeniowa ({calc.connectionPower} kW). Wymagane będzie złożenie wniosku o zwiększenie mocy przyłączeniowej do operatora.</p>
                    </div>
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Panels Card */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                      <div className="mb-4 bg-slate-100 w-12 h-12 rounded-lg flex items-center justify-center">
                          <Sun className="w-6 h-6 text-amber-500" />
                      </div>
                      <h4 className="font-bold text-slate-800 mb-4">Panele PV</h4>
                      <select 
                        className="w-full p-3 border border-slate-200 rounded-lg mb-4 text-sm"
                        value={calc.panelId}
                        onChange={(e) => setCalc({...calc, panelId: e.target.value})}
                      >
                        <option value="">Wybierz model...</option>
                        {panels.map(p => <option key={p.id} value={p.id}>{p.name} ({p.power}W)</option>)}
                      </select>
                      
                      <label className="text-xs font-bold text-slate-500 uppercase mb-1">Ilość sztuk</label>
                      <input 
                        type="number" 
                        className="w-full p-3 border border-slate-200 rounded-lg font-bold text-slate-800"
                        value={calc.panelCount}
                        onChange={(e) => setCalc({...calc, panelCount: Number(e.target.value)})}
                      />
                      <div className="mt-4 pt-4 border-t border-slate-100 text-right">
                          <p className="text-xs text-slate-500">Moc generatora</p>
                          <p className="text-xl font-bold text-amber-500">
                             {calc.panelId ? (((panels.find(p => p.id === calc.panelId)?.power || 0) * calc.panelCount) / 1000).toFixed(2) : 0} kWp
                          </p>
                      </div>
                  </div>

                  {/* Inverter Card */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                      <div className="mb-4 bg-slate-100 w-12 h-12 rounded-lg flex items-center justify-center">
                          <Zap className="w-6 h-6 text-blue-500" />
                      </div>
                      <h4 className="font-bold text-slate-800 mb-4">Falownik</h4>
                      <select 
                        className="w-full p-3 border border-slate-200 rounded-lg mb-4 text-sm"
                        value={calc.inverterId}
                        onChange={(e) => setCalc({...calc, inverterId: e.target.value})}
                      >
                        <option value="">Wybierz model...</option>
                        {inverters.map(i => <option key={i.id} value={i.id}>{i.name} ({i.power}kW)</option>)}
                      </select>
                      <div className="flex-1"></div>
                      <div className="mt-4 pt-4 border-t border-slate-100">
                          {calc.inverterId && (
                              <p className="text-sm text-slate-600">
                                 Moc: <b>{inverters.find(i => i.id === calc.inverterId)?.power} kW</b>
                              </p>
                          )}
                      </div>
                  </div>

                  {/* Storage Card */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                      <div className="mb-4 bg-slate-100 w-12 h-12 rounded-lg flex items-center justify-center">
                          <Battery className="w-6 h-6 text-green-500" />
                      </div>
                      <div className="flex justify-between items-start mb-4">
                        <h4 className="font-bold text-slate-800">Magazyn Energii</h4>
                        {calc.storageId && (
                           <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">Dotacja+</span>
                        )}
                      </div>
                      <select 
                        className="w-full p-3 border border-slate-200 rounded-lg mb-4 text-sm"
                        value={calc.storageId}
                        onChange={(e) => setCalc({...calc, storageId: e.target.value})}
                      >
                        <option value="">Brak magazynu</option>
                        {batteries.map(b => <option key={b.id} value={b.id}>{b.name} ({b.capacity}kWh)</option>)}
                      </select>
                      
                      {calc.storageId && (
                          <div className="animate-fade-in">
                            <label className="text-xs font-bold text-slate-500 uppercase mb-1">Ilość modułów</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border border-slate-200 rounded-lg font-bold text-slate-800"
                                value={calc.storageCount}
                                min={1}
                                onChange={(e) => setCalc({...calc, storageCount: Number(e.target.value)})}
                            />
                            <div className="mt-4 pt-4 border-t border-slate-100 text-right">
                                <p className="text-xs text-slate-500">Łączna pojemność</p>
                                <p className="text-xl font-bold text-green-500">
                                    {((batteries.find(b => b.id === calc.storageId)?.capacity || 0) * calc.storageCount).toFixed(2)} kWh
                                </p>
                            </div>
                          </div>
                      )}
                  </div>
               </div>
            </div>
          )}

          {/* STEP 4: MOUNTING & ADDONS */}
          {calc.step === 4 && (
             <div className="space-y-8 animate-fade-in">
                <h3 className="text-xl font-bold text-slate-800">System Montażowy i Dodatki</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {/* Mounting Selection */}
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <h4 className="font-bold text-slate-800 mb-6 flex items-center"><Hammer className="w-5 h-5 mr-2 text-slate-500"/> Konstrukcja</h4>
                      
                      <div className="grid grid-cols-2 gap-3 mb-6">
                         {[
                             {id: 'DACHOWKA', label: 'Dachówka', icon: Home},
                             {id: 'BLACHA', label: 'Blacha', icon: Home},
                             {id: 'PLASKI', label: 'Dach Płaski', icon: Home},
                             {id: 'GRUNT', label: 'Grunt', icon: Shovel},
                         ].map(type => (
                             <button 
                               key={type.id}
                               onClick={() => setCalc({...calc, roofType: type.id as RoofType})}
                               className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center justify-center transition-all ${calc.roofType === type.id ? 'bg-amber-50 border-amber-500 text-amber-700' : 'border-slate-200 hover:bg-slate-50'}`}
                             >
                                <type.icon className="w-6 h-6 mb-2 opacity-80" />
                                {type.label}
                             </button>
                         ))}
                      </div>

                      <div className="space-y-4">
                         {calc.roofType === 'GRUNT' && (
                             <div className="animate-fade-in bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <label className="block text-xs font-bold text-slate-600 mb-1">Długość wykopu (mb)</label>
                                <input 
                                  type="number" 
                                  value={calc.trenchLength}
                                  onChange={(e) => setCalc({...calc, trenchLength: Number(e.target.value)})}
                                  className="w-full p-2 border border-slate-300 rounded"
                                />
                             </div>
                         )}

                         <div>
                             <label className="block text-xs font-bold text-slate-600 mb-2">Element montażowy (z magazynu)</label>
                             <select 
                                className="w-full p-2 border border-slate-300 rounded"
                                value={calc.mountingSystemId}
                                onChange={(e) => setCalc({...calc, mountingSystemId: e.target.value})}
                             >
                                <option value="">Wybierz system...</option>
                                {accessories.map(a => <option key={a.id} value={a.id}>{a.name} ({a.price} zł)</option>)}
                             </select>
                         </div>
                      </div>
                   </div>

                   {/* Addons */}
                   <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                       <h4 className="font-bold text-slate-800 mb-6 flex items-center"><ShieldCheck className="w-5 h-5 mr-2 text-slate-500"/> Zabezpieczenia i Dodatki</h4>
                       
                       <div className="space-y-4">
                          <label className="flex items-center p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={calc.hasEMS}
                                onChange={(e) => setCalc({...calc, hasEMS: e.target.checked})}
                                className="w-5 h-5 text-amber-600 rounded mr-4"
                              />
                              <div>
                                  <p className="font-bold text-slate-800">System HEMS / EMS</p>
                                  <p className="text-xs text-slate-500">Inteligentne zarządzanie energią (+1500 zł)</p>
                              </div>
                          </label>

                          <label className="flex items-center p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={calc.hasUPS}
                                onChange={(e) => setCalc({...calc, hasUPS: e.target.checked})}
                                className="w-5 h-5 text-amber-600 rounded mr-4"
                              />
                              <div>
                                  <p className="font-bold text-slate-800">System Zasilania Awaryjnego (UPS)</p>
                                  <p className="text-xs text-slate-500">Full Backup Box (+2500 zł)</p>
                              </div>
                          </label>
                       </div>
                   </div>
                </div>
             </div>
          )}

          {/* STEP 5: FINANCIALS */}
          {calc.step === 5 && (
             <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
                <div className="text-center">
                    <h3 className="text-2xl font-bold text-slate-800 mb-2">Finansowanie Inwestycji</h3>
                    <p className="text-slate-500">System automatycznie przeliczył wartość zestawu.</p>
                </div>

                <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col items-center">
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">Całkowita wartość inwestycji (brutto)</p>
                    <div className="text-5xl font-bold mb-2 flex items-baseline">
                        {financials.totalSystemPrice.toLocaleString('pl-PL')} 
                        <span className="text-2xl text-slate-400 ml-2 font-medium">PLN</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-2 bg-slate-800 px-3 py-1 rounded-full">
                        Cena zawiera komponenty oraz usługę montażu
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Subsidies */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h4 className="font-bold text-slate-800 mb-4 flex items-center"><Banknote className="w-5 h-5 mr-2 text-green-600"/> Dotacja Mój Prąd</h4>
                        
                        <div className="space-y-4">
                            <label className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Aktywna dotacja</span>
                                <input type="checkbox" checked={calc.subsidyMojPrad} onChange={(e) => setCalc({...calc, subsidyMojPrad: e.target.checked})} className="w-5 h-5 text-green-600 rounded" />
                            </label>
                            
                            {calc.subsidyMojPrad && (
                                <div className="pt-4 border-t border-slate-100 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Dofinansowanie PV:</span>
                                        <span className="font-bold text-green-600">+{financials.subsidyPV.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Dofinansowanie Magazyn:</span>
                                        <span className="font-bold text-green-600">+{financials.subsidyStorage.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</span>
                                    </div>
                                    <div className="flex justify-between font-bold pt-2 border-t border-dashed border-slate-200">
                                        <span className="text-slate-700">Razem dotacje:</span>
                                        <span className="text-green-600">+{Math.round(financials.subsidyPV + financials.subsidyStorage).toLocaleString('pl-PL')} zł</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Tax Relief */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h4 className="font-bold text-slate-800 mb-4">Ulga Termomodernizacyjna</h4>
                        <div className="flex flex-col space-y-3">
                             {['NONE', '12', '32'].map((rate) => (
                                 <button 
                                   key={rate}
                                   onClick={() => setCalc({...calc, taxRelief: rate as any})}
                                   className={`w-full py-2 px-4 rounded-lg text-sm font-medium border flex justify-between items-center transition-all ${calc.taxRelief === rate ? 'bg-green-50 border-green-500 text-green-800' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                 >
                                    <span>{rate === 'NONE' ? 'Brak ulgi' : `Podatek ${rate}%`}</span>
                                    {rate !== 'NONE' && calc.taxRelief === rate && <CheckCircle className="w-4 h-4" />}
                                 </button>
                             ))}
                        </div>
                         {calc.taxRelief !== 'NONE' && (
                             <div className="mt-4 pt-4 border-t border-slate-100 text-right">
                                 <p className="text-xs text-slate-500">Szacowany zwrot podatku</p>
                                 <p className="font-bold text-green-600">+{financials.taxReturn.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</p>
                             </div>
                         )}
                    </div>
                </div>
             </div>
          )}

          {/* STEP 6: SUMMARY */}
          {calc.step === 6 && (
              <div className="space-y-8 animate-fade-in max-w-5xl mx-auto">
                 <div className="flex justify-between items-end border-b border-slate-200 pb-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900">Podsumowanie Oferty</h2>
                        <p className="text-slate-500 mt-1">Kompletne zestawienie dla {calc.isNewClient ? calc.newClientData.name : customers.find(c => c.id === calc.clientId)?.name || 'Klienta'}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500">Finalny koszt inwestycji</p>
                        <p className="text-3xl font-bold text-green-600">{financials.netInvestment.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</p>
                    </div>
                 </div>
                 
                 {exceedsConnectionPower && (
                   <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start animate-fade-in">
                      <AlertTriangle className="w-5 h-5 mr-3 mt-0.5" />
                      <div>
                         <p className="font-bold">Ostrzeżenie: Moc przyłączeniowa przekroczona</p>
                         <p className="text-sm">Moc instalacji ({financials.systemPowerKw.toFixed(2)} kWp) jest większa niż zadeklarowana moc przyłączeniowa ({calc.connectionPower} kW). Zgodnie z polskim prawem, przed przyłączeniem mikroinstalacji konieczne będzie złożenie wniosku o zwiększenie mocy przyłączeniowej.</p>
                      </div>
                   </div>
                 )}

                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                     {/* Left: Components List (No Prices) */}
                     <div className="lg:col-span-2 space-y-6">
                         <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                             <div className="bg-slate-50 p-4 border-b border-slate-100 font-bold text-slate-700">Specyfikacja Sprzętowa</div>
                             <div className="divide-y divide-slate-100">
                                 <div className="p-4 flex items-center">
                                     <Sun className="w-5 h-5 text-amber-500 mr-3" />
                                     <div>
                                         <p className="font-bold text-slate-800">{financials.components.panel?.name || 'Panele PV'}</p>
                                         <p className="text-xs text-slate-500">{calc.panelCount} szt. x {financials.components.panel?.power}W</p>
                                     </div>
                                 </div>
                                 <div className="p-4 flex items-center">
                                     <Zap className="w-5 h-5 text-blue-500 mr-3" />
                                     <div>
                                         <p className="font-bold text-slate-800">{financials.components.inverter?.name || 'Falownik'}</p>
                                         <p className="text-xs text-slate-500">{financials.components.inverter?.power} kW</p>
                                     </div>
                                 </div>
                                 {financials.components.storage && (
                                     <div className="p-4 flex items-center bg-green-50/50">
                                         <Battery className="w-5 h-5 text-green-500 mr-3" />
                                         <div>
                                             <p className="font-bold text-slate-800">{financials.components.storage.name}</p>
                                             <p className="text-xs text-slate-500">{calc.storageCount} szt. x {financials.components.storage.capacity} kWh</p>
                                         </div>
                                     </div>
                                 )}
                                 <div className="p-4 flex items-center">
                                     <Hammer className="w-5 h-5 text-slate-500 mr-3" />
                                     <div>
                                         <p className="font-bold text-slate-800">System Montażowy ({calc.roofType})</p>
                                         <p className="text-xs text-slate-500">{financials.components.mounting?.name || 'Zestaw standard'}</p>
                                     </div>
                                 </div>
                                 <div className="p-4 flex items-center bg-slate-50">
                                     <User className="w-5 h-5 text-slate-500 mr-3" />
                                     <div>
                                         <p className="font-bold text-slate-800">Montaż i Uruchomienie</p>
                                         <p className="text-xs text-slate-500">Kompleksowa usługa instalatorska</p>
                                     </div>
                                 </div>
                             </div>
                         </div>
                         
                         {/* ROI Chart - Financial Balance */}
                         <div className="bg-white p-6 rounded-2xl border border-slate-200">
                             <div className="flex justify-between items-start mb-6">
                                <h4 className="font-bold text-slate-800 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-blue-600"/> Bilans Finansowy (20 lat)</h4>
                                <div className="text-right">
                                    <p className="text-xs text-slate-500 uppercase">Twoja Taryfa</p>
                                    <p className="font-bold text-slate-800">{calc.tariff}</p>
                                    {['G12', 'G12w', 'C12a', 'C12b'].includes(calc.tariff) && (
                                        <p className="text-[10px] text-slate-400">Śr. cena: {financials.effectivePricePerKwh.toFixed(2)} zł/kWh</p>
                                    )}
                                </div>
                             </div>
                             
                             <div className="h-64 flex items-end justify-between space-x-1 w-full px-2">
                                 {financials.chartData.map((data) => {
                                     // Determine scale. Max positive usually around 2-3x initial cost. Min is initial cost.
                                     const maxScale = Math.max(Math.abs(financials.netInvestment), Math.abs(financials.chartData[19].balance)) * 1.1;
                                     const zeroLine = (Math.abs(financials.netInvestment) / (maxScale + Math.abs(financials.netInvestment))) * 100; // rough placement
                                     
                                     // Normalized height for the bar (0 to 100% of container)
                                     const barHeightPercent = (Math.abs(data.balance) / maxScale) * 100;
                                     const isNegative = data.balance < 0;

                                     return (
                                         <div key={data.year} className="flex-1 flex flex-col justify-end items-center group relative h-full">
                                             {/* Zero Line Marker */}
                                             <div className="absolute w-full border-b border-slate-300" style={{bottom: isNegative ? `${barHeightPercent}%` : '0%'}}></div>
                                             
                                             <div 
                                                className={`w-full max-w-[10px] md:max-w-[20px] rounded-t-sm transition-all hover:opacity-80 ${isNegative ? 'bg-red-400' : 'bg-green-500'}`}
                                                style={{ 
                                                  height: `${Math.min(barHeightPercent, 100)}%`,
                                                  marginBottom: isNegative ? '0' : '0' // Simplified, just growing up from bottom for positive/negative logic needs absolute positioning usually
                                                }} 
                                             ></div>
                                             
                                             {/* Tooltip */}
                                             <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-800 text-white text-[10px] p-1 rounded z-10 whitespace-nowrap">
                                                Rok {data.year}: {data.balance.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł
                                             </div>
                                         </div>
                                     )
                                 })}
                             </div>
                             {/* X-Axis Labels */}
                             <div className="flex justify-between mt-2 text-[10px] text-slate-400 px-2">
                               <span>Rok 1</span>
                               <span>Rok 5</span>
                               <span>Rok 10</span>
                               <span>Rok 15</span>
                               <span>Rok 20</span>
                             </div>

                             <div className="mt-4 text-center">
                                <span className="text-sm text-slate-600">Inwestycja zwróci się w </span>
                                <span className="font-bold text-green-600 text-lg">{financials.paybackYear} roku</span>
                             </div>
                         </div>
                     </div>

                     {/* Right: Summary Cards (Waterfall Calculation) */}
                     <div className="space-y-6">
                         <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                             <h4 className="font-bold text-slate-800 mb-4">Kalkulacja Kosztów</h4>
                             <div className="space-y-3">
                                 <div className="flex justify-between items-center text-sm">
                                     <span className="text-slate-600">Cena zestawu (Brutto 8%)</span>
                                     <span className="font-bold text-slate-900">{financials.totalSystemPrice.toLocaleString()} zł</span>
                                 </div>
                                 
                                 <div className="flex justify-between items-center text-sm">
                                     <span className="text-slate-600 flex items-center"><span className="text-red-500 mr-1">-</span> Ulga Termomodernizacyjna</span>
                                     <span className="font-bold text-green-600">{financials.taxReturn.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</span>
                                 </div>

                                 <div className="flex justify-between items-center text-sm">
                                     <span className="text-slate-600 flex items-center"><span className="text-red-500 mr-1">-</span> Dotacje (Mój Prąd)</span>
                                     <span className="font-bold text-green-600">{(financials.subsidyPV + financials.subsidyStorage).toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</span>
                                 </div>

                                 <div className="pt-4 border-t border-slate-200 mt-2">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800">Finalny Koszt</span>
                                        <span className="font-bold text-xl text-slate-900">{financials.netInvestment.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 text-right">Rzeczywisty koszt "na rękę" po odliczeniach.</p>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="bg-slate-900 text-white p-6 rounded-2xl text-center">
                             <p className="text-slate-400 text-xs uppercase tracking-widest mb-2">Twoja inwestycja netto</p>
                             <p className="text-4xl font-bold mb-4">{financials.netInvestment.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</p>
                             <button 
                               onClick={handleFinishAndSave}
                               className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center shadow-lg"
                             >
                                 <Save className="w-5 h-5 mr-2" />
                                 Zatwierdź i Zapisz Ofertę
                             </button>
                             {(calc.isNewClient || calc.clientId !== 'ANON') && (
                               <p className="text-xs text-slate-400 mt-3">Oferta zostanie zapisana w kartotece klienta.</p>
                             )}
                         </div>
                     </div>
                 </div>
              </div>
          )}

        </div>

        {/* Wizard Footer Controls */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
           <button 
             onClick={() => setCalc({...calc, step: Math.max(1, calc.step - 1)})}
             disabled={calc.step === 1}
             className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold disabled:opacity-50 hover:bg-white transition-colors flex items-center"
           >
             <ArrowLeft className="w-4 h-4 mr-2" /> Wstecz
           </button>
           
           {calc.step < 6 ? (
             <button 
              onClick={() => setCalc({...calc, step: Math.min(6, calc.step + 1)})}
              className="px-8 py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 transition-colors shadow-lg shadow-amber-200 flex items-center"
             >
               Dalej <ChevronRight className="w-4 h-4 ml-2" />
             </button>
           ) : (
             <span className="text-xs text-slate-400">Podsumowanie jest gotowe do zapisu.</span>
           )}
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
               <h2 className="text-2xl font-bold text-slate-800 flex items-center">
                 <Presentation className="mr-3 text-indigo-600" /> Prezentacja Firmowa
               </h2>
               <label className="bg-indigo-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors flex items-center shadow-sm">
                 <Upload className="w-4 h-4 mr-2" />
                 Wgraj PDF
                 <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
               </label>
             </div>
             
             <div className="flex-1 bg-slate-100 p-4 flex items-center justify-center">
                {presentationFile ? (
                  <iframe 
                    src={presentationFile} 
                    className="w-full h-full rounded-lg shadow-lg border border-slate-300" 
                    title="Prezentacja"
                  />
                ) : (
                  <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-dashed border-slate-300 max-w-lg">
                     <Presentation className="w-24 h-24 text-slate-200 mx-auto mb-4" />
                     <h3 className="text-lg font-bold text-slate-700 mb-2">Brak wgranej prezentacji</h3>
                     <p className="text-slate-500 mb-6">Wgraj plik PDF, aby wyświetlić go klientowi.</p>
                     <label className="inline-block bg-indigo-50 text-indigo-700 px-6 py-3 rounded-lg cursor-pointer hover:bg-indigo-100 font-medium transition-colors">
                        Wybierz plik z dysku
                        <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
                     </label>
                  </div>
                )}
             </div>
          </div>
        );
      case 'CALC_PV':
        return renderPvCalculator();
      
      case 'CALC_ME':
      case 'CALC_PV_WIND':
      case 'CALC_HEAT':
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            Moduł w trakcie przebudowy...
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-slate-50">
      {currentTool === 'MENU' ? (
        <div className="max-w-6xl mx-auto pt-10 px-4">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-extrabold text-slate-900 mb-4">Narzędzia i Aplikacje</h1>
            <p className="text-lg text-slate-500">Wybierz moduł, aby przejść do edycji lub kalkulacji.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setCurrentTool(tool.id as AppTool)}
                className="group bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-200 flex flex-col items-center text-center hover:-translate-y-1"
              >
                <div className={`w-20 h-20 ${tool.color} rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform`}>
                   <tool.icon className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">{tool.title}</h3>
                <p className="text-slate-500">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
           <div className="bg-white border-b border-slate-200 px-8 py-4 flex items-center shadow-sm sticky top-0 z-20">
              <button 
                onClick={() => setCurrentTool('MENU')}
                className="flex items-center text-slate-500 hover:text-slate-800 font-medium transition-colors"
              >
                <ArrowLeft className="w-5 h-5 mr-2" /> Wróć do menu
              </button>
           </div>
           <div className="flex-1 p-4 md:p-8 overflow-y-auto">
              {renderToolContent()}
           </div>
        </div>
      )}
    </div>
  );
};

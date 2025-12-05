
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

  const [calc, setCalc] = useState<CalculatorState>({
    step: 1,
    clientId: 'ANON',
    isNewClient: false,
    newClientData: { name: '', address: '', phone: '' },
    tariff: 'G11',
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
    roofType: 'DACHOWKA',
    trenchLength: 0,
    mountingSystemId: '',
    hasEMS: false,
    hasUPS: false,
    subsidyMojPrad: true,
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

    const inverter = inverters.reduce((prev, curr) => {
      return (Math.abs((curr.power || 0) - neededKwp) < Math.abs((prev.power || 0) - neededKwp) ? curr : prev);
    }, inverters[0]);

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
      storageCount: selectedStorageCount
    }));
  };

  const calculateFinancials = () => {
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

    let subsidyPV = 0;
    let subsidyStorage = 0;
    const valueStorage = costStorage;
    const valuePV = totalSystemPrice - valueStorage;

    if (calc.subsidyMojPrad) {
        if (calc.storageId) {
            subsidyPV = Math.min(7000, valuePV * 0.5);
            subsidyStorage = Math.min(16000, valueStorage * 0.5);
        } else {
            subsidyPV = Math.min(6000, valuePV * 0.5);
        }
    }

    const totalSubsidies = subsidyPV + subsidyStorage;
    const taxBase = Math.max(0, totalSystemPrice - totalSubsidies);
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
    
    let currentBill = calc.consumption * effectivePricePerKwh; 
    let accumulatedBalance = -netInvestment; 
    let paybackYear = 0;
    let foundPayback = false;

    const systemPowerKw = ((selectedPanel?.power || 0) * calc.panelCount) / 1000;
    const estimatedProductionKwh = systemPowerKw * 1000; 
    
    let efficiencyRatio = 0.6; 
    if (calc.storageId) efficiencyRatio += 0.2; 
    if (calc.hasEMS) efficiencyRatio += 0.05; 
    
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
       currentBill = currentBill * (1 + inflation);
    }

    return { 
        totalSystemPrice, netInvestment, subsidyPV, subsidyStorage, taxReturn, chartData, paybackYear, effectivePricePerKwh, systemPowerKw,
        breakdown: { costPanels, costInverter, costStorage, costMounting, costTrench, costLabor, costEMS, costUPS },
        components: { panel: selectedPanel, inverter: selectedInverter, storage: selectedStorage, mounting: selectedMounting }
    };
  };

  const financials = useMemo(() => calculateFinancials(), [calc]);

  const handleFinishAndSave = () => {
      const offerId = Date.now().toString();
      const systemPower = ((financials.components.panel?.power || 0) * calc.panelCount) / 1000;
      const offer: Offer = {
        id: offerId,
        name: `Instalacja PV ${systemPower.toFixed(2)} kWp`,
        dateCreated: new Date().toISOString(),
        finalPrice: financials.netInvestment,
        calculatorState: { ...calc }
      };
      onSaveOffer(offer, calc.isNewClient, calc.isNewClient ? calc.newClientData : undefined);
      setCurrentTool('MENU');
  };

  const renderPvCalculator = () => {
    const exceedsConnectionPower = financials.systemPowerKw > calc.connectionPower;
    const isDualTariff = ['G12', 'G12w', 'C12a', 'C12b'].includes(calc.tariff);

    return (
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden animate-fade-in flex flex-col h-full">
        {/* Wizard Header - Scrollable on mobile */}
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
                              calc.step >= s 
                              ? 'bg-amber-500 border-slate-900 text-white' 
                              : 'bg-slate-800 border-slate-900 text-slate-500'
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
          
          {/* STEP 1: CLIENT */}
          {calc.step === 1 && (
            <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
               <div className="text-center">
                   <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-2">Klient</h3>
               </div>
               <div className="grid gap-4">
                  <div 
                    onClick={() => setCalc({...calc, isNewClient: false})}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center ${!calc.isNewClient ? 'border-amber-500 bg-amber-50' : 'bg-white'}`}
                  >
                      <User className="w-6 h-6 mr-4 text-slate-500" />
                      <div className="flex-1 font-bold text-slate-800">Wybierz z bazy</div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${!calc.isNewClient ? 'border-amber-500' : 'border-slate-300'}`}>
                          {!calc.isNewClient && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                      </div>
                  </div>
                  {!calc.isNewClient && (
                      <select 
                        className="w-full p-3 border rounded-lg bg-white"
                        value={calc.clientId}
                        onChange={(e) => setCalc({...calc, clientId: e.target.value})}
                      >
                          <option value="ANON">Anonimowy</option>
                          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                  )}
                  <div 
                    onClick={() => setCalc({...calc, isNewClient: true, clientId: 'ANON'})}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center ${calc.isNewClient ? 'border-amber-500 bg-amber-50' : 'bg-white'}`}
                  >
                      <Plus className="w-6 h-6 mr-4 text-slate-500" />
                      <div className="flex-1 font-bold text-slate-800">Nowy klient</div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${calc.isNewClient ? 'border-amber-500' : 'border-slate-300'}`}>
                          {calc.isNewClient && <div className="w-2.5 h-2.5 bg-amber-500 rounded-full" />}
                      </div>
                  </div>
                  {calc.isNewClient && (
                      <div className="space-y-3">
                          <input type="text" placeholder="Nazwa" className="w-full p-3 border rounded-lg" value={calc.newClientData.name} onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, name: e.target.value}})} />
                          <input type="text" placeholder="Adres" className="w-full p-3 border rounded-lg" value={calc.newClientData.address} onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, address: e.target.value}})} />
                          <input type="text" placeholder="Telefon" className="w-full p-3 border rounded-lg" value={calc.newClientData.phone} onChange={(e) => setCalc({...calc, newClientData: {...calc.newClientData, phone: e.target.value}})} />
                      </div>
                  )}
               </div>
            </div>
          )}

          {/* STEP 2: ENERGY */}
          {calc.step === 2 && (
            <div className="max-w-xl mx-auto space-y-6 animate-fade-in">
               <h3 className="text-xl md:text-2xl font-bold text-slate-800 text-center">Energia</h3>
               <div className="space-y-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Zużycie (kWh/rok)</label>
                     <input type="number" value={calc.consumption} onChange={(e) => setCalc({...calc, consumption: Number(e.target.value)})} className="w-full p-3 border rounded-xl font-bold text-lg" />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Moc przyłączeniowa (kW)</label>
                     <input type="number" value={calc.connectionPower} onChange={(e) => setCalc({...calc, connectionPower: Number(e.target.value)})} className="w-full p-3 border rounded-xl font-bold text-lg" />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Taryfa</label>
                     <select value={calc.tariff} onChange={(e) => setCalc({...calc, tariff: e.target.value as TariffType})} className="w-full p-3 border rounded-xl bg-white">
                        <option value="G11">G11</option>
                        <option value="G12">G12</option>
                        <option value="G12w">G12w</option>
                        <option value="C11">C11</option>
                     </select>
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Cena prądu (PLN/kWh)</label>
                     <input type="number" step="0.01" value={calc.pricePerKwh} onChange={(e) => setCalc({...calc, pricePerKwh: Number(e.target.value)})} className="w-full p-3 border rounded-xl font-bold text-lg" />
                  </div>
                  {isDualTariff && (
                     <div className="grid grid-cols-2 gap-4">
                       <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">Cena II strefa</label>
                         <input type="number" step="0.01" value={calc.priceOffPeak || 0.60} onChange={(e) => setCalc({...calc, priceOffPeak: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
                       </div>
                       <div>
                         <label className="block text-xs font-bold text-slate-500 mb-1">% w taniej</label>
                         <input type="number" value={calc.percentOffPeak || 40} onChange={(e) => setCalc({...calc, percentOffPeak: Number(e.target.value)})} className="w-full p-2 border rounded-lg" />
                       </div>
                     </div>
                  )}
               </div>
            </div>
          )}

          {/* STEP 3: COMPONENTS */}
          {calc.step === 3 && (
            <div className="space-y-6 animate-fade-in">
               <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                  <h3 className="text-xl font-bold text-slate-800">Komponenty</h3>
                  <button onClick={autoSelectComponents} className="w-full md:w-auto flex items-center justify-center space-x-2 text-white bg-amber-500 px-5 py-2 rounded-lg font-bold shadow-md">
                     <Zap className="w-5 h-5" /> <span>Auto Dobór AI</span>
                  </button>
               </div>
               
               {exceedsConnectionPower && (
                 <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                    <p className="font-bold flex items-center"><AlertTriangle className="w-4 h-4 mr-2"/> Przekroczono moc przyłączeniową!</p>
                 </div>
               )}

               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                      <h4 className="font-bold mb-2 flex items-center"><Sun className="w-5 h-5 mr-2 text-amber-500"/> Panele</h4>
                      <select className="w-full p-2 border rounded mb-2 text-sm" value={calc.panelId} onChange={(e) => setCalc({...calc, panelId: e.target.value})}>
                        <option value="">Wybierz...</option>
                        {panels.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <input type="number" className="w-full p-2 border rounded font-bold" value={calc.panelCount} onChange={(e) => setCalc({...calc, panelCount: Number(e.target.value)})} />
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
                      {calc.storageId && (
                        <input type="number" className="w-full p-2 border rounded font-bold" value={calc.storageCount} min={1} onChange={(e) => setCalc({...calc, storageCount: Number(e.target.value)})} />
                      )}
                  </div>
               </div>
            </div>
          )}

          {/* STEP 4: MOUNTING - Simplified visual for brevity, same logic */}
          {calc.step === 4 && (
             <div className="space-y-6 animate-fade-in">
                <h3 className="text-xl font-bold text-slate-800">Montaż</h3>
                <div className="grid grid-cols-2 gap-3">
                    {['DACHOWKA', 'BLACHA', 'PLASKI', 'GRUNT'].map(type => (
                        <button key={type} onClick={() => setCalc({...calc, roofType: type as any})} className={`p-4 border rounded-xl font-bold ${calc.roofType === type ? 'bg-amber-50 border-amber-500' : 'bg-white'}`}>
                           {type}
                        </button>
                    ))}
                </div>
                {calc.roofType === 'GRUNT' && (
                    <input type="number" placeholder="Długość wykopu (m)" value={calc.trenchLength} onChange={(e) => setCalc({...calc, trenchLength: Number(e.target.value)})} className="w-full p-3 border rounded-xl" />
                )}
                <select className="w-full p-3 border rounded-xl bg-white" value={calc.mountingSystemId} onChange={(e) => setCalc({...calc, mountingSystemId: e.target.value})}>
                    <option value="">System montażowy...</option>
                    {accessories.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
             </div>
          )}

          {/* STEP 5: FINANCIALS - Stacked columns */}
          {calc.step === 5 && (
             <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
                <div className="bg-slate-900 text-white p-6 rounded-2xl text-center">
                    <p className="text-xs uppercase text-slate-400">Wartość Brutto</p>
                    <p className="text-3xl font-bold">{financials.totalSystemPrice.toLocaleString()} PLN</p>
                </div>
                <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border">
                        <label className="flex items-center justify-between font-bold">
                            <span>Dotacja Mój Prąd</span>
                            <input type="checkbox" checked={calc.subsidyMojPrad} onChange={(e) => setCalc({...calc, subsidyMojPrad: e.target.checked})} className="w-5 h-5" />
                        </label>
                        {calc.subsidyMojPrad && <p className="text-right text-green-600 font-bold mt-1">+{Math.round(financials.subsidyPV + financials.subsidyStorage)} zł</p>}
                    </div>
                    <div className="bg-white p-4 rounded-xl border">
                        <p className="font-bold mb-2">Ulga Termomodernizacyjna</p>
                        <div className="flex gap-2">
                             {['NONE', '12', '32'].map((rate) => (
                                 <button key={rate} onClick={() => setCalc({...calc, taxRelief: rate as any})} className={`flex-1 py-2 text-xs border rounded ${calc.taxRelief === rate ? 'bg-green-100 border-green-500' : ''}`}>
                                    {rate === 'NONE' ? 'Brak' : `${rate}%`}
                                 </button>
                             ))}
                        </div>
                    </div>
                </div>
             </div>
          )}

          {/* STEP 6: SUMMARY - Stacked */}
          {calc.step === 6 && (
              <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
                 <div className="bg-slate-900 text-white p-6 rounded-2xl text-center">
                     <p className="text-xs uppercase text-slate-400">Inwestycja Netto (po zwrotach)</p>
                     <p className="text-4xl font-bold mb-4">{financials.netInvestment.toLocaleString('pl-PL', {maximumFractionDigits: 0})} zł</p>
                     <button onClick={handleFinishAndSave} className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-xl shadow-lg">
                         Zapisz Ofertę
                     </button>
                 </div>
                 
                 <div className="bg-white p-6 rounded-2xl border border-slate-200">
                    <h4 className="font-bold mb-4">Zwrot Inwestycji</h4>
                    <p className="text-center text-lg">Zwrot w <span className="font-bold text-green-600">{financials.paybackYear} roku</span></p>
                    {/* Simplified Chart for Mobile - Text based representation or simplified bars */}
                    <div className="mt-4 h-32 flex items-end space-x-1">
                        {financials.chartData.filter((_, i) => i % 2 === 0).map(d => ( // Show every 2nd year on mobile to save space
                            <div key={d.year} className={`flex-1 ${d.balance < 0 ? 'bg-red-300' : 'bg-green-500'}`} style={{height: `${Math.min(100, Math.abs(d.balance) / financials.netInvestment * 50)}%`}}></div>
                        ))}
                    </div>
                 </div>
              </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 md:p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
           <button 
             onClick={() => setCalc({...calc, step: Math.max(1, calc.step - 1)})}
             disabled={calc.step === 1}
             className="px-4 py-2 md:px-6 md:py-3 rounded-xl border border-slate-300 text-slate-600 font-bold disabled:opacity-50 text-sm md:text-base"
           >
             Wstecz
           </button>
           
           {calc.step < 6 && (
             <button 
              onClick={() => setCalc({...calc, step: Math.min(6, calc.step + 1)})}
              className="px-6 py-2 md:px-8 md:py-3 rounded-xl bg-amber-500 text-white font-bold hover:bg-amber-600 shadow-lg text-sm md:text-base"
             >
               Dalej
             </button>
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
             {/* ... Presentation Tool (Responsive by default via flex) ... */}
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
               <h2 className="text-lg md:text-2xl font-bold text-slate-800 flex items-center">
                 <Presentation className="mr-3 text-indigo-600" /> Prezentacja
               </h2>
               <label className="bg-indigo-600 text-white px-3 py-2 rounded-lg cursor-pointer hover:bg-indigo-700 transition-colors flex items-center shadow-sm text-sm">
                 <Upload className="w-4 h-4 mr-2" />
                 Wgraj
                 <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} />
               </label>
             </div>
             <div className="flex-1 bg-slate-100 p-2 md:p-4 flex items-center justify-center">
                {presentationFile ? (
                  <iframe src={presentationFile} className="w-full h-full rounded-lg shadow-lg" title="Prezentacja" />
                ) : (
                  <div className="text-center p-8 bg-white rounded-2xl shadow-sm border border-dashed border-slate-300">
                     <p className="text-slate-500 mb-4">Wgraj plik PDF.</p>
                  </div>
                )}
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
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-2">Aplikacje</h1>
            <p className="text-sm md:text-lg text-slate-500">Wybierz moduł.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => setCurrentTool(tool.id as AppTool)}
                className="group bg-white rounded-2xl p-6 md:p-8 shadow-sm hover:shadow-xl transition-all border border-slate-200 flex flex-col items-center text-center"
              >
                <div className={`w-16 h-16 md:w-20 md:h-20 ${tool.color} rounded-2xl flex items-center justify-center text-white mb-4 md:mb-6 shadow-lg`}>
                   <tool.icon className="w-8 h-8 md:w-10 md:h-10" />
                </div>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-1">{tool.title}</h3>
                <p className="text-xs md:text-sm text-slate-500">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-full flex flex-col">
           <div className="bg-white border-b border-slate-200 px-4 md:px-8 py-3 md:py-4 flex items-center shadow-sm sticky top-0 z-20 shrink-0">
              <button onClick={() => setCurrentTool('MENU')} className="flex items-center text-slate-500 hover:text-slate-800 font-medium">
                <ArrowLeft className="w-5 h-5 mr-2" /> Menu
              </button>
           </div>
           <div className="flex-1 p-0 md:p-8 overflow-y-auto">
              {renderToolContent()}
           </div>
        </div>
      )}
    </div>
  );
};


import React, { useState, useRef } from 'react';
import { InventoryItem, ProductCategory, User, UserRole } from '../types';
import { AlertTriangle, Package, Brain, Edit2, X, Save, Plus, Filter, Search, ArrowUpDown, Database, ShieldCheck, Sun, Trash2, Check, Zap, GitMerge, Thermometer, Wind, Upload, Image as ImageIcon } from 'lucide-react';
import { analyzeInventory } from '../services/geminiService';

interface InventoryProps {
  inventory: InventoryItem[];
  onUpdateItem: (item: InventoryItem) => void;
  onAddItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onLoadSampleData?: () => void;
  currentUser: User;
}

type SortField = 'name' | 'price' | 'quantity' | 'dateAdded';
type SortOrder = 'asc' | 'desc';

// Helper to compress image
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // Limit width for inventory thumbs
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.7)); 
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const Inventory: React.FC<InventoryProps> = ({ inventory, onUpdateItem, onAddItem, onDeleteItem, onLoadSampleData, currentUser }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null); // New state for custom delete modal
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Installers have restricted access
  const isInstaller = currentUser.role === UserRole.INSTALLER;

  const handleAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    const result = await analyzeInventory(filteredInventory);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem({ ...item });
  };

  const handleDeleteClick = (e: React.MouseEvent, item: InventoryItem) => {
    e.stopPropagation(); // Just stop propagation, don't use window.confirm here
    setDeletingItem(item); // Trigger custom modal
  };

  const handleAddNew = () => {
    setEditingItem({
      id: '', 
      name: '',
      category: ProductCategory.PANEL,
      quantity: 0,
      minQuantity: 5,
      price: 0,
      unit: 'szt.',
      warranty: '',
      power: undefined,
      capacity: undefined,
      url: '',
      variant: 'STANDARD',
      voltageType: undefined,
      inverterType: 'NETWORK',
      // Default Heat Pump Fields
      heatPumpType: 'AIR_WATER',
      refrigerant: 'R290',
      minOperationTemp: -25,
      temperatureZone: 'HIGH'
    });
  };

  const handleSave = () => {
    if (editingItem) {
      if (!editingItem.name) {
        alert("Nazwa produktu jest wymagana");
        return;
      }
      if (editingItem.id === '') {
        const newItem = { 
          ...editingItem,
          id: self.crypto.randomUUID(), 
          dateAdded: new Date().toISOString()
        };
        onAddItem(newItem);
      } else {
        onUpdateItem(editingItem);
      }
      setEditingItem(null);
    }
  };

  const handleEditModalDelete = () => {
     if (editingItem && editingItem.id) {
        const itemToDelete = editingItem;
        setEditingItem(null); // Close edit modal
        setDeletingItem(itemToDelete); // Open delete confirmation modal
     }
  };

  const confirmDelete = () => {
      if (deletingItem) {
          onDeleteItem(deletingItem.id);
          setDeletingItem(null);
      }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && editingItem) {
      try {
        const base64 = await compressImage(e.target.files[0]);
        setEditingItem({ ...editingItem, url: base64 });
      } catch (err) {
        alert("Błąd przetwarzania zdjęcia");
      }
    }
  };

  const filteredInventory = inventory.filter(item => {
    const matchesCategory = filterCategory === 'ALL' || item.category === filterCategory;
    const matchesLowStock = filterLowStock ? item.quantity <= item.minQuantity : true;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesLowStock && matchesSearch;
  }).sort((a, b) => {
    let valA: any = a[sortField];
    let valB: any = b[sortField];
    if (sortField === 'dateAdded') {
        valA = new Date(a.dateAdded || 0).getTime();
        valB = new Date(b.dateAdded || 0).getTime();
    }
    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <>
      <div className="h-full overflow-y-auto custom-scrollbar p-4 md:p-6 space-y-4 md:space-y-6 animate-fade-in bg-slate-50">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
           <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center">
                <Package className="w-5 h-5 md:w-6 md:h-6 mr-3 text-blue-600" /> Stan Magazynowy
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-1">Zarządzaj produktami i monitoruj dostępność.</p>
           </div>
           {/* Hide actions for Installer */}
           {!isInstaller && (
             <div className="flex space-x-2 w-full md:w-auto">
                 {inventory.length === 0 && onLoadSampleData && (
                   <button 
                     onClick={onLoadSampleData}
                     className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-center shadow-lg"
                   >
                     <Database className="w-5 h-5 mr-2" /> Wgraj Dane
                   </button>
                 )}
                 <button 
                   onClick={handleAddNew}
                   className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center shadow-lg shadow-blue-200"
                 >
                   <Plus className="w-5 h-5 mr-2" /> Dodaj Produkt
                 </button>
             </div>
           )}
        </div>

        {/* Filters Stack */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 md:gap-4">
           <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input 
                type="text" 
                placeholder="Szukaj produktu..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
              />
           </div>
           <div className="md:col-span-3">
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <select 
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                >
                  <option value="ALL">Wszystkie kategorie</option>
                  {Object.values(ProductCategory).map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
           </div>
           <div className="md:col-span-3 flex items-center space-x-2">
              <div className="relative w-full">
                 <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                 <select 
                    value={sortField}
                    onChange={(e) => setSortField(e.target.value as SortField)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                 >
                    <option value="dateAdded">Data dodania</option>
                    <option value="name">Nazwa</option>
                    <option value="quantity">Ilość</option>
                    {!isInstaller && <option value="price">Cena</option>}
                 </select>
              </div>
              <button 
                 onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                 className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 bg-white"
              >
                 {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
           </div>
           <div className="md:col-span-2">
               <button 
                 onClick={() => setFilterLowStock(!filterLowStock)}
                 className={`w-full h-full py-3 px-4 rounded-xl font-medium border flex items-center justify-center transition-all ${filterLowStock ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
               >
                 <span title="Niski stan"><AlertTriangle className={`w-4 h-4 mr-2 ${filterLowStock ? 'text-red-500' : 'text-slate-400'}`} /></span>
                 Niski stan
               </button>
           </div>
        </div>

        {/* AI Analysis Section (Hidden for Installers) */}
        {!isInstaller && (
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2">
                  <h3 className="text-lg font-bold flex items-center">
                     <Brain className="w-6 h-6 mr-2 text-violet-200" /> Inteligentna Analiza
                  </h3>
                  {analysis ? (
                     <button onClick={() => setAnalysis(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
                  ) : (
                    <button 
                      onClick={handleAnalysis}
                      disabled={analyzing}
                      className="bg-white text-violet-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-violet-50 transition-colors shadow-lg disabled:opacity-70 w-full md:w-auto"
                    >
                      {analyzing ? 'Analizuję...' : 'Uruchom AI'}
                    </button>
                  )}
                </div>
                
                {analysis ? (
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-sm leading-relaxed animate-fade-in">
                    {analysis}
                  </div>
                ) : (
                  <p className="text-violet-100 text-sm max-w-xl">
                     Wykorzystaj sztuczną inteligencję do wykrycia braków i rekomendacji zakupowych.
                  </p>
                )}
             </div>
          </div>
        )}

        {/* Inventory Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
           {filteredInventory.length > 0 ? (
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[800px]">
                   <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                         <th className="p-4 font-bold w-1/3">Nazwa Produktu</th>
                         <th className="p-4 font-bold">Kategoria / Typ</th>
                         <th className="p-4 font-bold">Specyfikacja</th>
                         <th className="p-4 font-bold text-right">Ilość</th>
                         {!isInstaller && <th className="p-4 font-bold text-right">Cena</th>}
                         {!isInstaller && <th className="p-4 font-bold text-right">Akcje</th>}
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {filteredInventory.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                           <td className="p-4">
                              <div className="flex items-center">
                                 {/* Image Thumbnail */}
                                 {item.url ? (
                                    <img src={item.url} alt={item.name} className="w-10 h-10 rounded-lg object-cover mr-3 border border-slate-200 shadow-sm" />
                                 ) : (
                                    <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center mr-3 border border-slate-200 text-slate-400">
                                       <Package className="w-5 h-5" />
                                    </div>
                                 )}
                                 <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                              </div>
                           </td>
                           <td className="p-4">
                              <div className="flex flex-wrap gap-1">
                                 <span className="text-[10px] px-2 py-1 rounded-full font-bold border bg-slate-100 text-slate-600 border-slate-200">
                                    {item.category}
                                 </span>
                                 {item.category === ProductCategory.PANEL && item.variant === 'BIFACIAL' && (
                                    <span className="text-[10px] px-2 py-1 rounded-full font-bold border bg-indigo-100 text-indigo-700 border-indigo-200 flex items-center">
                                       <Sun className="w-3 h-3 mr-1" /> Bifacial
                                    </span>
                                 )}
                                 {/* Voltage Badge */}
                                 {item.voltageType && (
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold border flex items-center ${
                                       item.voltageType === 'HV' 
                                         ? 'bg-amber-100 text-amber-700 border-amber-200' 
                                         : 'bg-blue-100 text-blue-700 border-blue-200'
                                    }`}>
                                       <Zap className="w-3 h-3 mr-1" /> {item.voltageType === 'HV' ? 'HV (Wysokie)' : 'LV (Niskie)'}
                                    </span>
                                 )}
                                 {/* Inverter Type Badge */}
                                 {item.category === ProductCategory.INVERTER && item.inverterType && (
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold border flex items-center ${
                                       item.inverterType === 'HYBRID' 
                                         ? 'bg-purple-100 text-purple-700 border-purple-200' 
                                         : 'bg-cyan-100 text-cyan-700 border-cyan-200'
                                    }`}>
                                       <GitMerge className="w-3 h-3 mr-1" /> {item.inverterType === 'HYBRID' ? 'Hybrydowy' : 'Sieciowy'}
                                    </span>
                                 )}
                                 {/* Heat Pump Specific Badge */}
                                 {item.category === ProductCategory.HEAT_PUMP && item.heatPumpType && (
                                    <span className="text-[10px] px-2 py-1 rounded-full font-bold border bg-orange-100 text-orange-700 border-orange-200 flex items-center">
                                       <Thermometer className="w-3 h-3 mr-1" /> 
                                       {item.heatPumpType === 'AIR_WATER' ? 'Powietrze-Woda' : 
                                        item.heatPumpType === 'GROUND' ? 'Gruntowa' : 'Woda-Woda'}
                                    </span>
                                 )}
                              </div>
                           </td>
                           <td className="p-4 text-xs text-slate-600">
                              <div className="flex flex-col gap-1">
                                 {item.power && (
                                    <span className="font-bold">
                                       Moc: {item.power} {item.category === ProductCategory.PANEL ? 'W' : 'kW'}
                                    </span>
                                 )}
                                 {item.capacity && (
                                    <span className="font-bold text-green-700">
                                       Pojemność: {item.capacity} kWh
                                    </span>
                                 )}
                                 {/* Heat Pump Specifics */}
                                 {item.category === ProductCategory.HEAT_PUMP && (
                                    <>
                                       {item.refrigerant && <span className="text-slate-500">Czynnik: <b>{item.refrigerant}</b></span>}
                                       {item.minOperationTemp && <span className="text-slate-500">Min. temp: <b>{item.minOperationTemp}°C</b></span>}
                                       {item.temperatureZone && <span className="text-slate-500">Strefa: <b>{item.temperatureZone === 'HIGH' ? 'Wysoka' : 'Niska'}</b></span>}
                                    </>
                                 )}
                                 {item.warranty && (
                                    <span className="flex items-center text-slate-500">
                                       <ShieldCheck className="w-3 h-3 mr-1" /> {item.warranty}
                                    </span>
                                 )}
                                 {!item.power && !item.capacity && !item.warranty && !item.refrigerant && <span className="text-slate-400">-</span>}
                              </div>
                           </td>
                           <td className="p-4 text-right">
                              {item.category === ProductCategory.SERVICE ? (
                                 <span className="text-slate-400 font-medium">-</span>
                              ) : (
                                 <span className={`font-bold text-sm ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-700'}`}>
                                   {item.quantity} {item.unit}
                                 </span>
                              )}
                           </td>
                           {!isInstaller && (
                              <td className="p-4 text-right font-medium text-slate-700 text-sm">
                                 {item.price.toLocaleString()} zł
                              </td>
                           )}
                           {!isInstaller && (
                              <td className="p-4 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button onClick={() => handleEditClick(item)} className="p-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors z-20 relative" title="Edytuj">
                                       <Edit2 className="w-4 h-4 pointer-events-none" />
                                    </button>
                                    <button 
                                      onClick={(e) => handleDeleteClick(e, item)} 
                                      className="p-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors z-20 relative" 
                                      title="Usuń"
                                    >
                                       <Trash2 className="w-4 h-4 pointer-events-none" />
                                    </button>
                                 </div>
                              </td>
                           )}
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           ) : (
             <div className="p-10 text-center text-slate-400">
               <Package className="w-16 h-16 mx-auto mb-4 opacity-20" />
               <p className="font-bold">Magazyn jest pusty.</p>
               <p className="text-sm mt-1">Dodaj produkty ręcznie lub wgraj przykładowe dane.</p>
             </div>
           )}
        </div>
      </div>
      
      {/* Edit/Add Modal */}
      {editingItem && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
             {/* Backdrop */}
             <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingItem(null)}></div>
             
             {/* Modal Window */}
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col relative z-10 max-h-[95vh] overflow-hidden">
               
               {/* 1. Fixed Header */}
               <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 rounded-t-2xl shrink-0">
                  <h3 className="text-xl font-bold text-slate-800">
                     {editingItem.id ? 'Edycja Produktu' : 'Dodaj Produkt'}
                  </h3>
                  <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition-colors">
                     <X className="w-5 h-5" />
                  </button>
               </div>

               {/* 2. Scrollable Body */}
               <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                  
                  {/* Image Upload Section */}
                  {editingItem.category !== ProductCategory.SERVICE && (
                     <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Zdjęcie Produktu</label>
                        <div className="flex items-center gap-4">
                           {editingItem.url ? (
                              <div className="relative group">
                                 <img src={editingItem.url} alt="Podgląd" className="w-24 h-24 rounded-xl object-cover border border-slate-200 shadow-sm" />
                                 <button 
                                    onClick={() => setEditingItem({...editingItem, url: ''})}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                                 >
                                    <X className="w-3 h-3" />
                                 </button>
                              </div>
                           ) : (
                              <div 
                                 onClick={() => fileInputRef.current?.click()}
                                 className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 cursor-pointer hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition-all"
                              >
                                 <Upload className="w-6 h-6 mb-1" />
                                 <span className="text-[10px] font-bold">Wgraj</span>
                              </div>
                           )}
                           <div className="flex-1">
                              <p className="text-xs text-slate-500 mb-2">Dodaj zdjęcie, aby łatwiej identyfikować produkt w magazynie i ofertach.</p>
                              <input 
                                 type="file" 
                                 ref={fileInputRef} 
                                 className="hidden" 
                                 accept="image/*" 
                                 onChange={handleImageUpload}
                              />
                           </div>
                        </div>
                     </div>
                  )}

                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nazwa</label>
                     <input 
                        type="text" 
                        value={editingItem.name} 
                        onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                        className="w-full p-3 border rounded-xl"
                        placeholder="np. Pompa Ciepła Nibe F750"
                     />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategoria</label>
                        <select 
                           value={editingItem.category} 
                           onChange={(e) => setEditingItem({...editingItem, category: e.target.value as ProductCategory})}
                           className="w-full p-3 border rounded-xl bg-white"
                        >
                           {Object.values(ProductCategory).map(cat => (
                              <option key={cat} value={cat}>{cat}</option>
                           ))}
                        </select>
                     </div>
                     {editingItem.category === ProductCategory.PANEL && (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Wariant Panela</label>
                           <select 
                              value={editingItem.variant || 'STANDARD'} 
                              onChange={(e) => setEditingItem({...editingItem, variant: e.target.value as any})}
                              className="w-full p-3 border rounded-xl bg-white font-bold text-slate-700"
                           >
                              <option value="STANDARD">Jednostronne (Standard)</option>
                              <option value="BIFACIAL">Dwustronne (Bifacial)</option>
                           </select>
                        </div>
                     )}
                     {/* Inverter Type Selector */}
                     {editingItem.category === ProductCategory.INVERTER && (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center">
                              <GitMerge className="w-3 h-3 mr-1"/> Typ Falownika
                           </label>
                           <select 
                              value={editingItem.inverterType || 'NETWORK'} 
                              onChange={(e) => setEditingItem({...editingItem, inverterType: e.target.value as any})}
                              className="w-full p-3 border rounded-xl bg-white font-bold text-slate-700"
                           >
                              <option value="NETWORK">Sieciowy (Standard)</option>
                              <option value="HYBRID">Hybrydowy (Z magazynem)</option>
                           </select>
                        </div>
                     )}
                     {(editingItem.category === ProductCategory.INVERTER || editingItem.category === ProductCategory.ENERGY_STORAGE) && (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1 flex items-center">
                              <Zap className="w-3 h-3 mr-1"/> Typ Napięcia
                           </label>
                           <select 
                              value={editingItem.voltageType || 'LV'} 
                              onChange={(e) => setEditingItem({...editingItem, voltageType: e.target.value as any})}
                              className="w-full p-3 border rounded-xl bg-white font-bold text-slate-700"
                           >
                              <option value="LV">Niskie Napięcie (LV)</option>
                              <option value="HV">Wysokie Napięcie (HV)</option>
                           </select>
                        </div>
                     )}
                  </div>

                  {/* HEAT PUMP SPECIFIC FIELDS */}
                  {editingItem.category === ProductCategory.HEAT_PUMP && (
                     <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 space-y-4">
                        <div className="flex items-center text-orange-800 font-bold text-sm border-b border-orange-200 pb-2 mb-2">
                           <Thermometer className="w-4 h-4 mr-2" /> Parametry Pompy Ciepła
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Typ Pompy</label>
                              <select 
                                 value={editingItem.heatPumpType || 'AIR_WATER'} 
                                 onChange={(e) => setEditingItem({...editingItem, heatPumpType: e.target.value as any})}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm"
                              >
                                 <option value="AIR_WATER">Powietrze-Woda</option>
                                 <option value="GROUND">Gruntowa</option>
                                 <option value="WATER_WATER">Woda-Woda</option>
                                 <option value="AIR_AIR">Powietrze-Powietrze</option>
                              </select>
                           </div>
                           <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Czynnik Chłodniczy</label>
                              <input 
                                 type="text" 
                                 value={editingItem.refrigerant || ''} 
                                 onChange={(e) => setEditingItem({...editingItem, refrigerant: e.target.value})}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                 placeholder="np. R290, R32"
                              />
                           </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Min. Temp. Pracy (°C)</label>
                              <input 
                                 type="number" 
                                 value={editingItem.minOperationTemp ?? ''} 
                                 onChange={(e) => setEditingItem({...editingItem, minOperationTemp: parseFloat(e.target.value)})}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
                                 placeholder="np. -25"
                              />
                           </div>
                           <div>
                              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Strefa Temperaturowa</label>
                              <select 
                                 value={editingItem.temperatureZone || 'HIGH'} 
                                 onChange={(e) => setEditingItem({...editingItem, temperatureZone: e.target.value as any})}
                                 className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm"
                              >
                                 <option value="HIGH">Wysokotemperaturowa</option>
                                 <option value="LOW">Niskotemperaturowa</option>
                              </select>
                           </div>
                        </div>
                     </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cena (PLN)</label>
                        <input 
                           type="number" 
                           value={editingItem.price === 0 ? '' : editingItem.price} 
                           onChange={(e) => setEditingItem({...editingItem, price: e.target.value === '' ? 0 : Number(e.target.value)})} 
                           className="w-full p-3 border rounded-xl" 
                           placeholder="0.00" 
                        />
                     </div>
                     {/* Hide Quantity Input for Services */}
                     {editingItem.category !== ProductCategory.SERVICE && (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ilość</label>
                           <input 
                              type="number" 
                              value={editingItem.quantity === 0 ? '' : editingItem.quantity} 
                              onChange={(e) => setEditingItem({...editingItem, quantity: e.target.value === '' ? 0 : Number(e.target.value)})} 
                              className="w-full p-3 border rounded-xl" 
                              placeholder="0" 
                           />
                        </div>
                     )}
                  </div>

                  {/* Hide Low Stock Alarm for Services */}
                  {editingItem.category !== ProductCategory.SERVICE && (
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Alarm niskiego stanu (Min. ilość)</label>
                        <input 
                           type="number" 
                           value={editingItem.minQuantity === 0 ? '' : editingItem.minQuantity} 
                           onChange={(e) => setEditingItem({...editingItem, minQuantity: e.target.value === '' ? 0 : Number(e.target.value)})} 
                           className="w-full p-3 border rounded-xl" 
                           placeholder="5" 
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Gdy ilość spadnie poniżej tej wartości, otrzymasz powiadomienie.</p>
                     </div>
                  )}

                  {/* Hide Technical Specs for Services */}
                  {editingItem.category !== ProductCategory.SERVICE && (
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Moc (W/kW)</label>
                           <input 
                              type="number" 
                              value={editingItem.power === undefined || editingItem.power === 0 ? '' : editingItem.power} 
                              onChange={(e) => setEditingItem({...editingItem, power: e.target.value === '' ? 0 : Number(e.target.value)})} 
                              className="w-full p-3 border rounded-xl" 
                              placeholder="Opcjonalne" 
                           />
                        </div>
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pojemność (kWh)</label>
                           <input 
                              type="number" 
                              value={editingItem.capacity === undefined || editingItem.capacity === 0 ? '' : editingItem.capacity} 
                              onChange={(e) => setEditingItem({...editingItem, capacity: e.target.value === '' ? 0 : Number(e.target.value)})} 
                              className="w-full p-3 border rounded-xl" 
                              placeholder="Opcjonalne" 
                           />
                        </div>
                     </div>
                  )}

                  {/* Hide Warranty for Services */}
                  {editingItem.category !== ProductCategory.SERVICE && (
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gwarancja</label>
                        <input 
                           type="text" 
                           value={editingItem.warranty || ''} 
                           onChange={(e) => setEditingItem({...editingItem, warranty: e.target.value})}
                           className="w-full p-3 border rounded-xl"
                           placeholder="np. 25 lat produktowa" 
                        />
                     </div>
                  )}
                  <div className="h-4"></div>
               </div>

               {/* 3. Fixed Footer */}
               <div className="p-5 border-t border-slate-100 flex justify-end space-x-3 bg-white rounded-b-2xl shrink-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                  {/* DELETE BUTTON IN MODAL */}
                  {editingItem.id && (
                      <button 
                        onClick={handleEditModalDelete}
                        className="mr-auto text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl font-bold flex items-center transition-colors"
                        title="Usuń ten produkt"
                      >
                          <Trash2 className="w-4 h-4 mr-2" /> Usuń
                      </button>
                  )}
                  <button onClick={() => setEditingItem(null)} className="px-5 py-2.5 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Anuluj</button>
                  <button onClick={handleSave} className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-sm hover:bg-blue-700 flex items-center transition-colors">
                     <Save className="w-4 h-4 mr-2" /> Zapisz
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {deletingItem && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
             {/* Stronger backdrop */}
             <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={() => setDeletingItem(null)}></div>
             
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm relative z-20 p-6 animate-shake">
                 <div className="flex flex-col items-center text-center">
                     <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                         <AlertTriangle className="w-8 h-8 text-red-600" />
                     </div>
                     <h3 className="text-xl font-bold text-slate-800 mb-2">Usuwanie Produktu</h3>
                     <p className="text-slate-500 text-sm mb-6">
                         Czy na pewno chcesz usunąć <b>{deletingItem.name}</b>?<br/>
                         Tej operacji nie można cofnąć.
                     </p>
                     
                     <div className="flex space-x-3 w-full">
                         <button 
                             onClick={() => setDeletingItem(null)} 
                             className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                         >
                             Anuluj
                         </button>
                         <button 
                             onClick={confirmDelete} 
                             className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-colors"
                         >
                             Usuń
                         </button>
                     </div>
                 </div>
             </div>
         </div>
      )}
    </>
  );
};

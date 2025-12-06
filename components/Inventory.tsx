

import React, { useState } from 'react';
import { InventoryItem, ProductCategory } from '../types';
import { AlertTriangle, Package, Brain, Edit2, X, Save, Zap, ShieldCheck, Plus, Battery, Filter, ExternalLink, Search, Link as LinkIcon, ArrowUpDown, Database } from 'lucide-react';
import { analyzeInventory } from '../services/geminiService';

interface InventoryProps {
  inventory: InventoryItem[];
  onUpdateItem: (item: InventoryItem) => void;
  onAddItem: (item: InventoryItem) => void;
  onLoadSampleData?: () => void;
}

type SortField = 'name' | 'price' | 'quantity' | 'dateAdded';
type SortOrder = 'asc' | 'desc';

export const Inventory: React.FC<InventoryProps> = ({ inventory, onUpdateItem, onAddItem, onLoadSampleData }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

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
      url: ''
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
          id: Date.now().toString(),
          dateAdded: new Date().toISOString()
        };
        onAddItem(newItem);
      } else {
        onUpdateItem(editingItem);
      }
      setEditingItem(null);
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
    <div className="space-y-4 md:space-y-6 animate-fade-in p-4 md:p-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
         <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center">
              <Package className="w-5 h-5 md:w-6 md:h-6 mr-3 text-blue-600" /> Stan Magazynowy
            </h2>
            <p className="text-slate-500 text-xs md:text-sm mt-1">Zarządzaj produktami i monitoruj dostępność.</p>
         </div>
         <div className="flex space-x-2 w-full md:w-auto">
             {inventory.length === 0 && onLoadSampleData && (
               <button 
                 onClick={onLoadSampleData}
                 className="flex-1 md:flex-none bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold transition-colors flex items-center justify-center shadow-lg"
               >
                 <Database className="w-5 h-5 mr-2" /> Wgraj Przykładowe Produkty
               </button>
             )}
             <button 
               onClick={handleAddNew}
               className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center shadow-lg shadow-blue-200"
             >
               <Plus className="w-5 h-5 mr-2" /> Dodaj Produkt
             </button>
         </div>
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
                  <option value="price">Cena</option>
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

      {/* AI Analysis Section */}
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

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         {filteredInventory.length > 0 ? (
           <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                 <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                       <th className="p-4 font-bold">Produkt</th>
                       <th className="p-4 font-bold">Kategoria</th>
                       <th className="p-4 font-bold text-right">Stan</th>
                       <th className="p-4 font-bold text-right">Cena</th>
                       <th className="p-4 font-bold">Info</th>
                       <th className="p-4 font-bold text-right">Akcje</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    {filteredInventory.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                         <td className="p-4">
                            <p className="font-bold text-slate-800 text-sm">{item.name}</p>
                         </td>
                         <td className="p-4">
                            <span className="text-[10px] px-2 py-1 rounded-full font-bold border bg-slate-100 text-slate-600 border-slate-200">
                               {item.category}
                            </span>
                         </td>
                         <td className="p-4 text-right">
                            <span className={`font-bold text-sm ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-700'}`}>
                              {item.quantity} {item.unit}
                            </span>
                         </td>
                         <td className="p-4 text-right font-medium text-slate-700 text-sm">
                            {item.price.toLocaleString()} zł
                         </td>
                         <td className="p-4 text-xs text-slate-600">
                            {item.power && `${item.power} ${item.category === ProductCategory.PANEL ? 'W' : 'kW'}`}
                         </td>
                         <td className="p-4 text-right">
                            <button onClick={() => handleEditClick(item)} className="p-2 text-blue-600 bg-blue-50 rounded-lg">
                               <Edit2 className="w-4 h-4" />
                            </button>
                         </td>
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
      
      {/* Edit Modal (Keeping simplified for brevity, layout is responsive by default) */}
      {editingItem && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
               <h3 className="text-xl font-bold">Edycja Produktu</h3>
               <input 
                  type="text" 
                  value={editingItem.name} 
                  onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                  className="w-full p-3 border rounded-xl"
                  placeholder="Nazwa"
               />
               <div className="grid grid-cols-2 gap-4">
                  <input type="number" value={editingItem.price} onChange={(e) => setEditingItem({...editingItem, price: Number(e.target.value)})} className="w-full p-3 border rounded-xl" placeholder="Cena" />
                  <input type="number" value={editingItem.quantity} onChange={(e) => setEditingItem({...editingItem, quantity: Number(e.target.value)})} className="w-full p-3 border rounded-xl" placeholder="Ilość" />
               </div>
               <div className="flex justify-end gap-2 pt-4">
                  <button onClick={() => setEditingItem(null)} className="px-4 py-2 text-slate-500">Anuluj</button>
                  <button onClick={handleSave} className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Zapisz</button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

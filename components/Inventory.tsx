
import React, { useState } from 'react';
import { InventoryItem, ProductCategory } from '../types';
import { AlertTriangle, Package, Brain, Edit2, X, Save, Zap, ShieldCheck, Plus, Battery, Filter, ExternalLink, Search, Link as LinkIcon, ArrowUpDown } from 'lucide-react';
import { analyzeInventory } from '../services/geminiService';

interface InventoryProps {
  inventory: InventoryItem[];
  onUpdateItem: (item: InventoryItem) => void;
  onAddItem: (item: InventoryItem) => void;
}

type SortField = 'name' | 'price' | 'quantity' | 'dateAdded';
type SortOrder = 'asc' | 'desc';

export const Inventory: React.FC<InventoryProps> = ({ inventory, onUpdateItem, onAddItem }) => {
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  // Filtering State
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterLowStock, setFilterLowStock] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Sorting State
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Edit State
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const handleAnalysis = async () => {
    setAnalyzing(true);
    setAnalysis(null);
    const result = await analyzeInventory(filteredInventory);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const handleEditClick = (item: InventoryItem) => {
    setEditingItem({ ...item }); // Create a copy to edit
  };

  const handleAddNew = () => {
    setEditingItem({
      id: '', // Empty ID indicates new item
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
        // Create New
        const newItem = { 
          ...editingItem,
          id: Date.now().toString(),
          dateAdded: new Date().toISOString()
        };
        onAddItem(newItem);
      } else {
        // Update
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
    
    // Handle date sorting
    if (sortField === 'dateAdded') {
        valA = new Date(a.dateAdded || 0).getTime();
        valB = new Date(b.dateAdded || 0).getTime();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in p-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
         <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center">
              <Package className="w-6 h-6 mr-3 text-blue-600" /> Stan Magazynowy
            </h2>
            <p className="text-slate-500 text-sm mt-1">Zarządzaj produktami i monitoruj dostępność.</p>
         </div>
         <button 
           onClick={handleAddNew}
           className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center shadow-lg shadow-blue-200"
         >
           <Plus className="w-5 h-5 mr-2" /> Dodaj Produkt
         </button>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
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
               className="p-3 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600"
            >
               {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
         </div>
         <div className="md:col-span-2">
             <button 
               onClick={() => setFilterLowStock(!filterLowStock)}
               className={`w-full h-full py-3 px-4 rounded-xl font-medium border flex items-center justify-center transition-all ${filterLowStock ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
             >
               <AlertTriangle className={`w-4 h-4 mr-2 ${filterLowStock ? 'text-red-500' : 'text-slate-400'}`} />
               Niski stan
             </button>
         </div>
      </div>

      {/* AI Analysis Section */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
         <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold flex items-center">
                 <Brain className="w-6 h-6 mr-2 text-violet-200" /> Inteligentna Analiza Magazynu
              </h3>
              {analysis && (
                 <button onClick={() => setAnalysis(null)} className="text-white/70 hover:text-white"><X className="w-5 h-5" /></button>
              )}
            </div>
            
            {analysis ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 text-sm leading-relaxed animate-fade-in">
                {analysis}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-violet-100 text-sm max-w-xl">
                   Wykorzystaj sztuczną inteligencję do przeanalizowania stanów magazynowych, wykrycia braków i otrzymania rekomendacji zakupowych.
                </p>
                <button 
                  onClick={handleAnalysis}
                  disabled={analyzing}
                  className="bg-white text-violet-700 px-6 py-2 rounded-lg font-bold text-sm hover:bg-violet-50 transition-colors shadow-lg disabled:opacity-70"
                >
                  {analyzing ? 'Analizuję...' : 'Uruchom Analizę AI'}
                </button>
              </div>
            )}
         </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                     <th className="p-4 font-bold">Produkt</th>
                     <th className="p-4 font-bold">Kategoria</th>
                     <th className="p-4 font-bold text-right">Stan</th>
                     <th className="p-4 font-bold text-right">Cena Netto</th>
                     <th className="p-4 font-bold">Parametry</th>
                     <th className="p-4 font-bold text-right">Akcje</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                       <td className="p-4">
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5">ID: {item.id}</p>
                          {item.url && (
                             <a href={item.url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 flex items-center mt-1 hover:underline">
                                <LinkIcon className="w-3 h-3 mr-1" /> Zobacz u dostawcy
                             </a>
                          )}
                       </td>
                       <td className="p-4">
                          <span className={`text-xs px-2 py-1 rounded-full font-bold border ${
                             item.category === ProductCategory.PANEL ? 'bg-amber-50 text-amber-700 border-amber-100' :
                             item.category === ProductCategory.INVERTER ? 'bg-blue-50 text-blue-700 border-blue-100' :
                             item.category === ProductCategory.ENERGY_STORAGE ? 'bg-green-50 text-green-700 border-green-100' :
                             'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                             {item.category}
                          </span>
                       </td>
                       <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                             <span className={`font-bold ${item.quantity <= item.minQuantity ? 'text-red-600' : 'text-slate-700'}`}>
                                {item.quantity} {item.unit}
                             </span>
                             {item.quantity <= item.minQuantity && (
                                <AlertTriangle className="w-4 h-4 text-red-500" title="Poniżej stanu minimalnego" />
                             )}
                          </div>
                          <p className="text-[10px] text-slate-400">Min: {item.minQuantity}</p>
                       </td>
                       <td className="p-4 text-right font-medium text-slate-700">
                          {item.price.toLocaleString()} zł
                       </td>
                       <td className="p-4 text-xs text-slate-600 space-y-1">
                          {item.power && (
                            <div className="flex items-center">
                               <Zap className="w-3 h-3 mr-1 text-amber-500" />
                               {item.power} {item.category === ProductCategory.PANEL ? 'W' : 'kW'}
                            </div>
                          )}
                          {item.capacity && (
                             <div className="flex items-center">
                                <Battery className="w-3 h-3 mr-1 text-green-500" />
                                {item.capacity} kWh
                             </div>
                          )}
                          <div className="flex items-center">
                             <ShieldCheck className="w-3 h-3 mr-1 text-blue-500" />
                             {item.warranty}
                          </div>
                       </td>
                       <td className="p-4 text-right">
                          <button 
                            onClick={() => handleEditClick(item)}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edytuj"
                          >
                             <Edit2 className="w-4 h-4" />
                          </button>
                          {item.url && (
                            <a 
                              href={item.url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="inline-block p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors ml-1"
                              title="Otwórz link"
                            >
                               <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         {filteredInventory.length === 0 && (
            <div className="p-12 text-center text-slate-400">
               <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
               <p>Brak produktów spełniających kryteria wyszukiwania.</p>
            </div>
         )}
      </div>

      {/* Edit/Add Modal */}
      {editingItem && (
         <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
               <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-xl font-bold text-slate-800 flex items-center">
                     {editingItem.id ? 'Edytuj Produkt' : 'Dodaj Nowy Produkt'}
                  </h3>
                  <button onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-600">
                     <X className="w-6 h-6" />
                  </button>
               </div>
               
               <div className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                     <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nazwa Produktu</label>
                        <input 
                           type="text" 
                           value={editingItem.name} 
                           onChange={(e) => setEditingItem({...editingItem, name: e.target.value})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                     </div>
                     
                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kategoria</label>
                        <select 
                           value={editingItem.category} 
                           onChange={(e) => setEditingItem({...editingItem, category: e.target.value as ProductCategory})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                           {Object.values(ProductCategory).map(cat => (
                             <option key={cat} value={cat}>{cat}</option>
                           ))}
                        </select>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cena Netto (PLN)</label>
                        <input 
                           type="number" 
                           value={editingItem.price} 
                           onChange={(e) => setEditingItem({...editingItem, price: Number(e.target.value)})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ilość</label>
                        <input 
                           type="number" 
                           value={editingItem.quantity} 
                           onChange={(e) => setEditingItem({...editingItem, quantity: Number(e.target.value)})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Stan Minimalny</label>
                        <input 
                           type="number" 
                           value={editingItem.minQuantity} 
                           onChange={(e) => setEditingItem({...editingItem, minQuantity: Number(e.target.value)})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Jednostka</label>
                        <select
                           value={editingItem.unit} 
                           onChange={(e) => setEditingItem({...editingItem, unit: e.target.value})}
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                        >
                           <option value="szt.">szt.</option>
                           <option value="mb">mb</option>
                           <option value="kpl.">kpl.</option>
                           <option value="kg">kg</option>
                        </select>
                     </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Gwarancja</label>
                        <input 
                           type="text" 
                           value={editingItem.warranty} 
                           onChange={(e) => setEditingItem({...editingItem, warranty: e.target.value})}
                           placeholder="np. 15 lat"
                           className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                     </div>
                     
                     {/* Dynamic Fields based on Category */}
                     {(editingItem.category === ProductCategory.PANEL || editingItem.category === ProductCategory.INVERTER || editingItem.category === ProductCategory.ENERGY_STORAGE) && (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                              {editingItem.category === ProductCategory.PANEL ? 'Moc (W)' : 'Moc (kW)'}
                           </label>
                           <input 
                              type="number" 
                              value={editingItem.power || ''} 
                              onChange={(e) => setEditingItem({...editingItem, power: Number(e.target.value)})}
                              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                           />
                        </div>
                     )}

                     {editingItem.category === ProductCategory.ENERGY_STORAGE && (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pojemność (kWh)</label>
                           <input 
                              type="number" 
                              value={editingItem.capacity || ''} 
                              onChange={(e) => setEditingItem({...editingItem, capacity: Number(e.target.value)})}
                              className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                           />
                        </div>
                     )}

                     <div className="col-span-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link do produktu / dostawcy</label>
                        <div className="relative">
                           <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                           <input 
                              type="text" 
                              value={editingItem.url || ''} 
                              onChange={(e) => setEditingItem({...editingItem, url: e.target.value})}
                              placeholder="https://..."
                              className="w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                           />
                        </div>
                     </div>

                  </div>
               </div>

               <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-end space-x-3">
                  <button 
                     onClick={() => setEditingItem(null)}
                     className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-white transition-colors"
                  >
                     Anuluj
                  </button>
                  <button 
                     onClick={handleSave}
                     className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-colors flex items-center"
                  >
                     <Save className="w-5 h-5 mr-2" /> Zapisz
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};

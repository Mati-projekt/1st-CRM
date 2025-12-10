
import React, { useState, useRef, useEffect } from 'react';
import { Announcement, UserRole } from '../types';
import { Megaphone, Save, Image as ImageIcon, Bold, Italic, Link as LinkIcon, Heading1, List, Type, X, Upload, Check, AlignLeft, AlignCenter, AlignRight, Underline } from 'lucide-react';

interface AnnouncementCreatorProps {
  onSave: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'createdBy'>) => void;
}

// Simple helper to compress images
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
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

export const AnnouncementCreator: React.FC<AnnouncementCreatorProps> = ({ onSave }) => {
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [targetRoles, setTargetRoles] = useState<string[]>(['ALL']);
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Selection State Tracking
  const savedRange = useRef<Range | null>(null);

  // Link Modal State
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkData, setLinkData] = useState({ url: '', text: '' });

  const roles = [
    { id: 'ALL', label: 'Wszyscy' },
    { id: UserRole.SALES, label: 'Handlowcy' },
    { id: UserRole.INSTALLER, label: 'Montażyści' },
    { id: UserRole.OFFICE, label: 'Biuro' },
    { id: UserRole.SALES_MANAGER, label: 'Kierownicy' }
  ];

  const fonts = [
    { value: 'Arial', label: 'Arial' },
    { value: 'Georgia', label: 'Georgia' },
    { value: 'Impact', label: 'Impact' },
    { value: 'Tahoma', label: 'Tahoma' },
    { value: 'Times New Roman', label: 'Times New Roman' },
    { value: 'Verdana', label: 'Verdana' },
    { value: 'Courier New', label: 'Courier New' },
  ];

  const fontSizes = [
    { value: '1', label: '1 - Mała' },
    { value: '2', label: '2 - Drobna' },
    { value: '3', label: '3 - Normalna' },
    { value: '4', label: '4 - Średnia' },
    { value: '5', label: '5 - Duża' },
    { value: '6', label: '6 - Bardzo duża' },
    { value: '7', label: '7 - Ogromna' },
  ];

  // --- SELECTION HELPERS ---
  
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      // Ensure the range is inside our editor
      if (contentRef.current && contentRef.current.contains(range.commonAncestorContainer)) {
        savedRange.current = range;
      }
    }
  };

  const restoreSelection = () => {
    const sel = window.getSelection();
    if (sel && savedRange.current) {
      sel.removeAllRanges();
      sel.addRange(savedRange.current);
    } else if (contentRef.current) {
      // Fallback: focus at the end if no range saved
      contentRef.current.focus();
    }
  };

  // Capture selection on any mouse/key activity in editor
  const handleEditorActivity = () => {
    saveSelection();
  };

  const handleRoleToggle = (roleId: string) => {
    if (roleId === 'ALL') {
      setTargetRoles(['ALL']);
    } else {
      let newRoles = targetRoles.filter(r => r !== 'ALL');
      if (newRoles.includes(roleId)) {
        newRoles = newRoles.filter(r => r !== roleId);
      } else {
        newRoles.push(roleId);
      }
      if (newRoles.length === 0) newRoles = ['ALL'];
      setTargetRoles(newRoles);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const base64 = await compressImage(e.target.files[0]);
        setImageUrl(base64);
      } catch (err) {
        alert("Błąd przetwarzania zdjęcia");
      }
    }
  };

  const execCmd = (command: string, value: string | undefined = undefined) => {
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection(); // Save new state
    if (contentRef.current) contentRef.current.focus();
  };

  // --- LINK HANDLING ---

  const handleLinkClick = () => {
    saveSelection(); // Save where the cursor is
    const selection = window.getSelection();
    const selectedText = selection ? selection.toString() : '';
    
    setLinkData({
      url: 'https://',
      text: selectedText
    });
    setShowLinkModal(true);
  };

  const applyLink = () => {
    if (!linkData.url) return;
    
    restoreSelection();
    
    // Create the HTML for the link
    // We use insertHTML instead of createLink to handle custom text correctly
    const linkHtml = `<a href="${linkData.url}" target="_blank" rel="noopener noreferrer" style="color: #2563eb; text-decoration: underline;">${linkData.text || linkData.url}</a>`;
    
    document.execCommand('insertHTML', false, linkHtml);
    
    setShowLinkModal(false);
    saveSelection();
  };

  const handleSubmit = () => {
    if (!title) {
        alert("Wpisz tytuł komunikatu");
        return;
    }
    const content = contentRef.current?.innerHTML || '';
    if (!content.trim()) {
        alert("Wpisz treść komunikatu");
        return;
    }

    onSave({
      title,
      content,
      imageUrl: imageUrl || undefined,
      targetRoles
    });

    // Reset
    setTitle('');
    if (contentRef.current) contentRef.current.innerHTML = '';
    setImageUrl(null);
    setTargetRoles(['ALL']);
    savedRange.current = null;
  };

  // Toolbar Button Component
  const ToolbarButton = ({ 
    cmd, 
    arg, 
    icon: Icon, 
    title 
  }: { cmd: string, arg?: string, icon: any, title: string }) => (
    <button 
      onMouseDown={(e) => {
        e.preventDefault(); // Prevent focus loss for buttons
        execCmd(cmd, arg);
      }}
      className="p-2 hover:bg-slate-200 rounded text-slate-700 transition-colors" 
      title={title}
    >
      <Icon className="w-4 h-4"/>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in pb-24 relative">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
          <div className="bg-blue-100 p-3 rounded-xl text-blue-600">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Kreator Komunikatów</h2>
            <p className="text-slate-500 text-sm">Stwórz ważną wiadomość, którą muszą zaakceptować pracownicy.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Tytuł Komunikatu</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-slate-300 rounded-xl text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="np. WAŻNE: Zmiana cennika od 1 lipca"
            />
          </div>

          {/* Main Image */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Zdjęcie główne (Opcjonalne)</label>
            {!imageUrl ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-400 hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all cursor-pointer h-48"
              >
                <ImageIcon className="w-10 h-10 mb-2" />
                <span className="font-bold text-sm">Kliknij, aby dodać zdjęcie</span>
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden group shadow-md border border-slate-200">
                <img src={imageUrl} alt="Preview" className="w-full h-64 object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={() => setImageUrl(null)} className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold flex items-center hover:bg-red-700 transition-colors">
                      <X className="w-4 h-4 mr-2" /> Usuń zdjęcie
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* Rich Text Editor */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Treść Wiadomości</label>
            <div className="border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 transition-all">
              {/* Toolbar */}
              <div className="bg-slate-50 border-b border-slate-200 p-2 flex gap-2 flex-wrap items-center">
                
                {/* Font Family - No PreventDefault here to allow opening */}
                <select 
                  onChange={(e) => execCmd('fontName', e.target.value)}
                  className="p-1 border border-slate-300 rounded text-xs text-slate-700 outline-none w-32 cursor-pointer hover:bg-slate-100"
                  defaultValue="Arial"
                  title="Wybierz czcionkę"
                >
                   {fonts.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>

                {/* Font Size - No PreventDefault here */}
                <select 
                  onChange={(e) => execCmd('fontSize', e.target.value)}
                  className="p-1 border border-slate-300 rounded text-xs text-slate-700 outline-none w-24 cursor-pointer hover:bg-slate-100"
                  defaultValue="3"
                  title="Rozmiar czcionki"
                >
                   {fontSizes.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>

                <div className="w-px h-6 bg-slate-300 mx-1"></div>

                <ToolbarButton cmd="bold" icon={Bold} title="Pogrubienie" />
                <ToolbarButton cmd="italic" icon={Italic} title="Kursywa" />
                <ToolbarButton cmd="underline" icon={Underline} title="Podkreślenie" />
                
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                
                <ToolbarButton cmd="justifyLeft" icon={AlignLeft} title="Wyrównaj do lewej" />
                <ToolbarButton cmd="justifyCenter" icon={AlignCenter} title="Wyśrodkuj" />
                <ToolbarButton cmd="justifyRight" icon={AlignRight} title="Wyrównaj do prawej" />

                <div className="w-px h-6 bg-slate-300 mx-1"></div>

                <ToolbarButton cmd="formatBlock" arg="H2" icon={Heading1} title="Nagłówek" />
                <ToolbarButton cmd="formatBlock" arg="P" icon={Type} title="Paragraf" />
                
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                
                {/* Custom Link Button */}
                <button 
                  onMouseDown={(e) => { e.preventDefault(); handleLinkClick(); }}
                  className="p-2 hover:bg-slate-200 rounded text-slate-700 transition-colors" 
                  title="Wstaw link"
                >
                   <LinkIcon className="w-4 h-4"/>
                </button>
                
                <ToolbarButton cmd="insertUnorderedList" icon={List} title="Lista punktowana" />
              </div>
              
              {/* Editable Area */}
              <div 
                ref={contentRef}
                contentEditable
                onKeyUp={handleEditorActivity}
                onMouseUp={handleEditorActivity}
                className="editor-content min-h-[300px] p-4 outline-none text-slate-700 bg-white"
                style={{ lineHeight: '1.6' }}
              ></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 ml-1">
               Wskazówka: Zaznacz tekst, aby go edytować. Listy i linki pojawią się w podglądzie.
            </p>
          </div>

          {/* Target Audience */}
          <div>
             <label className="block text-sm font-bold text-slate-700 mb-3">Odbiorcy</label>
             <div className="flex flex-wrap gap-2">
                {roles.map(role => (
                   <button
                     key={role.id}
                     onClick={() => handleRoleToggle(role.id)}
                     className={`px-4 py-2 rounded-full text-sm font-bold border transition-all flex items-center ${
                        targetRoles.includes(role.id) 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                     }`}
                   >
                      {targetRoles.includes(role.id) && <Check className="w-3 h-3 mr-2" />}
                      {role.label}
                   </button>
                ))}
             </div>
          </div>

          {/* Action */}
          <div className="pt-6 border-t border-slate-100 flex justify-end">
             <button 
               onClick={handleSubmit}
               className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center transition-transform hover:scale-105 active:scale-95"
             >
                <Save className="w-5 h-5 mr-2" /> Opublikuj Komunikat
             </button>
          </div>

        </div>
      </div>

      {/* Insert Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLinkModal(false)}></div>
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-md relative z-10 overflow-hidden animate-slide-up">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                 <h3 className="font-bold text-slate-800 flex items-center">
                    <LinkIcon className="w-4 h-4 mr-2 text-blue-600" /> Wstaw Hiperłącze
                 </h3>
                 <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Adres URL</label>
                    <input 
                       type="text" 
                       value={linkData.url} 
                       onChange={(e) => setLinkData({...linkData, url: e.target.value})}
                       className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                       placeholder="https://example.com"
                       autoFocus
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tekst do wyświetlenia</label>
                    <input 
                       type="text" 
                       value={linkData.text} 
                       onChange={(e) => setLinkData({...linkData, text: e.target.value})}
                       className="w-full p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                       placeholder="Kliknij tutaj"
                    />
                 </div>
              </div>
              <div className="p-4 border-t border-slate-100 flex justify-end space-x-2 bg-slate-50">
                 <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded-lg">Anuluj</button>
                 <button onClick={applyLink} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Wstaw Link</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

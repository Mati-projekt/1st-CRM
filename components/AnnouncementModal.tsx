
import React from 'react';
import { Announcement } from '../types';
import { X, Check } from 'lucide-react';

interface AnnouncementModalProps {
  announcement: Announcement;
  onAccept: (id: string) => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({ announcement, onAccept }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"></div>
      
      {/* Modal Content */}
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        
        {/* Header (Optional Image or Just Title Bar) */}
        <div className="bg-slate-50 border-b border-slate-100 shrink-0">
           {announcement.imageUrl ? (
              <div className="w-full h-48 md:h-64 overflow-hidden relative">
                 <img src={announcement.imageUrl} alt={announcement.title} className="w-full h-full object-cover" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                 <h2 className="absolute bottom-4 left-6 text-2xl md:text-3xl font-extrabold text-white drop-shadow-md pr-4">{announcement.title}</h2>
              </div>
           ) : (
              <div className="p-6 pb-4">
                 <h2 className="text-xl font-bold text-slate-800">Komunikat</h2>
                 <h1 className="text-2xl md:text-3xl font-extrabold text-blue-600 mt-1">{announcement.title}</h1>
              </div>
           )}
        </div>

        {/* Content Body - Added 'editor-content' class */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
           <div 
             className="editor-content prose prose-slate max-w-none text-slate-700 leading-relaxed"
             dangerouslySetInnerHTML={{ __html: announcement.content }}
           />
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
           <button 
             onClick={() => onAccept(announcement.id)}
             className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg flex items-center transition-all hover:scale-105 active:scale-95"
           >
              <Check className="w-5 h-5 mr-2" /> Zaakceptuj
           </button>
        </div>
      </div>
    </div>
  );
};


import React, { useEffect } from 'react';
import { CheckCircle, Info, X } from 'lucide-react';
import { NotificationType } from '../types';

interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    error: <X className="w-5 h-5 text-red-500" />,
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center p-4 rounded-xl border shadow-lg animate-slide-up ${bgColors[type]}`}>
      <div className="mr-3">
        {icons[type]}
      </div>
      <div className="mr-4 font-medium text-sm">
        {message}
      </div>
      <button onClick={onClose} className="opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

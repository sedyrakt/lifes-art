// src/components/employes/EmployesStats/ModalHeader.tsx

import React from 'react';
import { X } from 'lucide-react';

interface ModalHeaderProps {
  title: string;
  icon: React.ElementType;
  color: string;
  dataLength: number;
  onClose: () => void;
  colors: { text: string; muted: string; };
  hexToRgba: (color: string, alpha: number) => string;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({
  title,
  icon: Icon,
  color,
  dataLength,
  onClose,
  colors,
  hexToRgba,
}) => {
  return (
    <div
      className="flex items-center justify-between p-5 border-b"
      style={{ borderColor: 'rgba(99,102,241,0.1)' }}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg" style={{ background: hexToRgba(color, 0.15) }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: colors.text }}>
            {title}
          </h2>
          <p className="text-sm" style={{ color: colors.muted }}>
            {dataLength} employé{dataLength > 1 ? 's' : ''}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
        style={{ color: colors.muted }}
        aria-label="Fermer"
      >
        <X className="w-4.5 h-4.5" />
      </button>
    </div>
  );
};

export default ModalHeader;
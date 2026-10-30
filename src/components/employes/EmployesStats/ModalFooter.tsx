// src/components/employes/EmployesStats/ModalFooter.tsx

import React from 'react';

interface ModalFooterProps {
  onClose: () => void;
  color: string;
  colors: {
    card: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
  };
  hexToRgba: (color: string, alpha: number) => string;
}

const ModalFooter: React.FC<ModalFooterProps> = ({
  onClose,
  color,
  colors,
  hexToRgba,
}) => {
  return (
    <div
      className="p-4 border-t flex justify-end items-center"
      style={{ borderColor: 'rgba(99,102,241,0.08)' }}
    >
      <button
        onClick={onClose}
        className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98] text-white"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
          boxShadow: `0 2px 12px ${hexToRgba(color, 0.3)}`,
        }}
      >
        Fermer
      </button>
    </div>
  );
};

export default ModalFooter;
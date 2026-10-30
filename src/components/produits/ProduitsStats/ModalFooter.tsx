// src/components/produits/ProduitsStats/ModalFooter.tsx

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
}

const ModalFooter: React.FC<ModalFooterProps> = ({
  onClose,
  color,
}) => {
  return (
    <div className="px-6 py-3.5 flex justify-end items-center bg-transparent">
      <button
        type="button"
        onClick={onClose}
        className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] text-white cursor-pointer shadow-premium"
        style={{
          background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        }}
      >
        Fermer le module
      </button>
    </div>
  );
};

export default ModalFooter;
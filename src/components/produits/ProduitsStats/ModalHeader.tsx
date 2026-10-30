// src/components/produits/ProduitsStats/ModalHeader.tsx

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
  const logoSrc = '/images/logolight.png'; // Na azonao ovaina arakaraka ny mode

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-transparent">
      <div className="flex items-center gap-4">
        <div className="p-1.5 rounded-2xl border border-slate-700/20 shadow-inner bg-slate-500/5">
          <img 
            src={logoSrc} 
            alt="Logo Life's Art"
            className="object-contain flex-shrink-0 rounded-xl"
            style={{ width: '48px', height: '48px' }}
          />
        </div>
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl shadow-soft" style={{ background: hexToRgba(color, 0.15) }}>
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold tracking-tight" style={{ color: colors.text }}>
                {title}
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                ERP MODULE
              </span>
            </div>
            <p className="text-xs font-medium mt-0.5" style={{ color: colors.muted }}>
              Total: <span className="font-bold" style={{ color }}>{dataLength}</span> produit{dataLength > 1 ? 's' : ''} en stock
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="p-2.5 rounded-2xl transition-all hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer flex-shrink-0 border border-slate-700/20 shadow-sm bg-transparent"
        style={{ color: colors.muted }}
        aria-label="Fermer"
      >
        <X className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ModalHeader;
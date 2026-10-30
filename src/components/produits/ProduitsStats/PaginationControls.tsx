// src/components/produits/ProduitsStats/PaginationControls.tsx
// ⭐ FANITSARA: Nesorina ny fond ary namboarina ho UI Pro compact

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  dataLength: number;
  color: string;
  onGoToPage: (page: number) => void;
  onGoToPrevious: () => void;
  onGoToNext: () => void;
  renderPageNumbers: () => number[];
  colors: {
    card: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
  };
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  dataLength,
  color,
  onGoToPage,
  onGoToPrevious,
  onGoToNext,
  renderPageNumbers,
  colors,
}) => {
  return (
    <div className="px-6 py-2.5 flex items-center justify-between bg-transparent">
      <p className="text-xs font-medium" style={{ color: colors.muted }}>
        Affichage de <span className="font-bold" style={{ color: colors.text }}>{dataLength > 0 ? `${startIndex + 1} - ${Math.min(endIndex, dataLength)}` : '0'}</span> sur <span className="font-bold" style={{ color: colors.text }}>{dataLength}</span> éléments
      </p>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onGoToPrevious}
          disabled={currentPage === 1}
          className="p-1.5 rounded-xl transition-all disabled:opacity-20 hover:bg-slate-500/10 cursor-pointer border border-slate-700/20 shadow-xs bg-transparent"
          style={{ color: colors.muted }}
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {renderPageNumbers().map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onGoToPage(page)}
            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center border shadow-xs ${
              page === currentPage
                ? 'text-white scale-105 border-transparent shadow-soft'
                : 'hover:bg-slate-500/10'
            }`}
            style={{
              background: page === currentPage ? color : 'transparent',
              borderColor: page === currentPage ? 'transparent' : 'rgba(99,102,241,0.2)',
              color: page === currentPage ? '#FFFFFF' : colors.text,
            }}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          onClick={onGoToNext}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-xl transition-all disabled:opacity-20 hover:bg-slate-500/10 cursor-pointer border border-slate-700/20 shadow-xs bg-transparent"
          style={{ color: colors.muted }}
          aria-label="Page suivante"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
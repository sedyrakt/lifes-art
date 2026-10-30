// src/components/employes/EmployesStats/PaginationControls.tsx

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
    <div
      className="px-5 py-3 border-t flex items-center justify-between"
      style={{ borderColor: 'rgba(99,102,241,0.08)' }}
    >
      <p className="text-sm" style={{ color: colors.muted }}>
        {startIndex + 1} - {Math.min(endIndex, dataLength)} sur {dataLength}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={onGoToPrevious}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700"
          style={{ color: colors.muted }}
          aria-label="Page précédente"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {renderPageNumbers().map((page) => (
          <button
            key={page}
            onClick={() => onGoToPage(page)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
              page === currentPage
                ? 'text-white shadow-sm'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
            style={{
              background: page === currentPage ? color : 'transparent',
              color: page === currentPage ? '#FFFFFF' : colors.muted,
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={onGoToNext}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg transition-colors disabled:opacity-30 hover:bg-gray-100 dark:hover:bg-gray-700"
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
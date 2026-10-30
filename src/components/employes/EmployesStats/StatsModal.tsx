// src/components/employes/EmployesStats/StatsModal.tsx

import React from 'react';
import { X, Users } from 'lucide-react';
import ModalHeader from './ModalHeader';
import EmployeeList from './EmployeeList';
import PaginationControls from './PaginationControls';
import ModalFooter from './ModalFooter';

interface Employe {
  id: number;
  nom: string;
  prenom: string;
  poste: string;
  departement?: string;
  salaire: number;
  date_embauche?: string;
  status: string;
  image?: string;
  email?: string;
  telephone?: string;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalData: {
    title: string;
    data: Employe[];
    icon: React.ElementType;
    color: string;
  };
  dataLength: number;
  currentData: Employe[];
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  imageUrls: Record<number, string | null>;
  imageErrors: Record<number, boolean>;
  modalImageUrls: Record<number, string | null>;
  onImageError: (id: number) => void;
  onGoToPage: (page: number) => void;
  onGoToPrevious: () => void;
  onGoToNext: () => void;
  renderPageNumbers: () => number[];
  isDark: boolean;
  colors: {
    card: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
    modalOverlay: string;
  };
  curveImage: string;
  hexToRgba: (color: string, alpha: number) => string;
}

const StatsModal: React.FC<StatsModalProps> = ({
  isOpen,
  onClose,
  modalData,
  dataLength,
  currentData,
  currentPage,
  totalPages,
  startIndex,
  endIndex,
  imageUrls,
  imageErrors,
  modalImageUrls,
  onImageError,
  onGoToPage,
  onGoToPrevious,
  onGoToNext,
  renderPageNumbers,
  isDark,
  colors,
  curveImage,
  hexToRgba,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: colors.modalOverlay }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl border flex flex-col"
        style={{
          background: colors.card,
          borderColor: 'rgba(99,102,241,0.15)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${curveImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: isDark ? 0.06 : 0.08,
            filter: 'blur(1px)',
          }}
        />

        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: isDark 
              ? `radial-gradient(circle at 50% 30%, rgba(99,102,241,0.03), transparent 70%)`
              : `radial-gradient(circle at 50% 30%, rgba(99,102,241,0.02), transparent 70%)`,
          }}
        />

        <div className="relative z-10 flex flex-col h-full">
          <ModalHeader
            title={modalData.title}
            icon={modalData.icon}
            color={modalData.color}
            dataLength={dataLength}
            onClose={onClose}
            colors={colors}
            hexToRgba={hexToRgba}
          />

          <EmployeeList
            data={currentData}
            dataLength={dataLength}
            color={modalData.color}
            modalImageUrls={modalImageUrls}
            imageUrls={imageUrls}
            imageErrors={imageErrors}
            onImageError={onImageError}
            selectedStat={modalData.title}
            isDark={isDark}
            colors={colors}
            hexToRgba={hexToRgba}
          />

          {dataLength > 6 && (
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              startIndex={startIndex}
              endIndex={endIndex}
              dataLength={dataLength}
              color={modalData.color}
              onGoToPage={onGoToPage}
              onGoToPrevious={onGoToPrevious}
              onGoToNext={onGoToNext}
              renderPageNumbers={renderPageNumbers}
              colors={colors}
            />
          )}

          <ModalFooter
            onClose={onClose}
            color={modalData.color}
            colors={colors}
            hexToRgba={hexToRgba}
          />
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
// ============================================================
// src/components/produits/ProduitsStats/StatsModal.tsx
// ⭐ FANITSARA: Modal background miaraka amin'ny gradient malefaka sy glowing effect mitovy amin'ny sary (Dark mode bg: #1E293B)
// ============================================================

import React from 'react';
import { X, ChevronLeft, ChevronRight, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import ProductCard from './ProductCard';

interface Produit {
  id: number;
  code: string;
  nom: string;
  description?: string;
  prix_vente: number;
  prix_achat: number;
  quantite_stock: number;
  quantite_minimale: number;
  unite: string;
  status: string;
  image?: string;
  categorie_nom?: string;
  fournisseur_nom?: string;
}

interface ModalData {
  title: string;
  data: Produit[];
  icon: React.ElementType;
  color: string;
}

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  modalData: ModalData;
  dataLength: number;
  currentData: Produit[];
  currentPage: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  imageUrls: Record<number, string | null>;
  imageErrors: Record<number, boolean>;
  onImageError: (id: number) => void;
  onGoToPage: (page: number) => void;
  onGoToPrevious: () => void;
  onGoToNext: () => void;
  renderPageNumbers: () => number[];
  isDark: boolean;
  colors: any;
  hexToRgba: (color: string, alpha: number) => string;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onView?: (produit: Produit) => void;
  onEdit?: (produit: Produit) => void;
  onDelete?: (id: number) => void;
  nbCommandesMap?: Record<number, number>;
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
  onImageError,
  onGoToPage,
  onGoToPrevious,
  onGoToNext,
  renderPageNumbers,
  isDark,
  colors,
  hexToRgba,
  searchTerm,
  onSearchChange,
  onView,
  onEdit,
  onDelete,
  nbCommandesMap = {},
}) => {
  if (!isOpen) return null;

  const Icon = modalData.icon;
  const logoSrc = isDark ? '/images/logodark.png' : '/images/logolight.png';

  // ⭐ Loko fototra sy loko mifangaro (Dark mode misy #1E293B)
  const baseBg = isDark ? '#1E293B' : '#FFFFFF';
  const borderColor = isDark ? '#334155' : 'rgba(226, 232, 240, 1)';
  const textColor = isDark ? '#F8FAFC' : '#1F2937';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md animate-fadeIn"
      style={{ background: isDark ? 'rgba(2, 6, 23, 0.8)' : 'rgba(15, 23, 42, 0.4)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-3xl overflow-hidden shadow-2xl border flex flex-col transition-all duration-300"
        style={{
          width: '80vw',
          height: '90vh',
          maxWidth: '80vw',
          maxHeight: '90vh',
          background: baseBg,
          borderColor: borderColor,
          boxShadow: isDark 
            ? '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 40px rgba(99, 102, 241, 0.15)' 
            : '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 0 30px rgba(99, 102, 241, 0.08)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ⭐ BACKGROUND GLOWING ORB */}
        <div 
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20 transition-all duration-700"
          style={{ background: modalData.color }}
        />
        <div 
          className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-10 transition-all duration-700"
          style={{ background: modalData.color }}
        />

        {/* ⭐ TOP NAV - Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0 relative z-10"
          style={{ 
            background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(8px)',
            borderColor: borderColor 
          }}
        >
          <div className="flex items-center gap-4">
            <div className="p-1.5 rounded-2xl border shadow-inner" style={{ background: isDark ? 'rgba(15, 23, 42, 0.5)' : '#F1F5F9', borderColor: borderColor }}>
              <img 
                src={logoSrc} 
                alt="Logo Life's Art"
                className="object-contain flex-shrink-0 rounded-xl"
                style={{ width: '48px', height: '48px' }}
              />
            </div>
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl shadow-soft" style={{ background: hexToRgba(modalData.color, 0.15) }}>
                <Icon className="w-5 h-5" style={{ color: modalData.color }} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-extrabold tracking-tight" style={{ color: textColor }}>
                    {modalData.title}
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                    ERP MODULE
                  </span>
                </div>
                <p className="text-xs font-medium mt-0.5" style={{ color: mutedColor }}>
                  Total: <span className="font-bold" style={{ color: modalData.color }}>{dataLength}</span> produit{dataLength > 1 ? 's' : ''} en stock
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-2xl transition-all hover:bg-rose-500/10 hover:text-rose-500 cursor-pointer flex-shrink-0 border shadow-sm"
            style={{ color: mutedColor, borderColor: borderColor, background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF' }}
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ⭐ ERP ADVANCED SEARCH BAR */}
        <div 
          className="px-6 py-4 border-b flex-shrink-0 flex items-center gap-3 relative z-10" 
          style={{ 
            background: isDark ? 'rgba(15, 23, 42, 0.4)' : 'rgba(248, 250, 252, 0.6)',
            backdropFilter: 'blur(4px)',
            borderColor: borderColor 
          }}
        >
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" style={{ color: modalData.color }}>
              <Search className="w-4.5 h-4.5" />
            </div>
            
            <input
              type="text"
              placeholder="Recherche ERP avancée (Nom du produit, code SKU, catégorie...)"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-11 pr-10 py-3 rounded-2xl text-sm border focus:outline-none focus:ring-4 transition-all shadow-inner font-medium"
              style={{
                background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#FFFFFF',
                borderColor: searchTerm ? modalData.color : borderColor,
                color: textColor,
              }}
            />

            {searchTerm && (
              <button 
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center hover:text-rose-500 transition-colors"
                style={{ color: mutedColor }}
                title="Effacer la recherche"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-semibold shadow-xs" style={{ background: isDark ? 'rgba(15, 23, 42, 0.7)' : '#FFFFFF', borderColor: borderColor, color: mutedColor }}>
            <SlidersHorizontal className="w-4 h-4" style={{ color: modalData.color }} />
            <span>Filtre actif: <strong style={{ color: textColor }}>{dataLength}</strong></span>
          </div>
        </div>

        {/* ⭐ CONTENU - Grid misy Card */}
        <div className="p-6 overflow-y-auto flex-1 relative z-10">
          {dataLength === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center h-full">
              <div className="p-4 rounded-3xl mb-3 shadow-soft" style={{ background: hexToRgba(modalData.color, 0.1) }}>
                <Sparkles className="w-10 h-10" style={{ color: modalData.color }} />
              </div>
              <p className="text-base font-bold" style={{ color: textColor }}>Aucun résultat trouvé dans l'ERP</p>
              {searchTerm && (
                <p className="text-xs mt-1" style={{ color: mutedColor }}>
                  Aucun produit ne correspond au terme &quot;<span className="font-semibold" style={{ color: modalData.color }}>{searchTerm}</span>&quot;
                </p>
              )}
            </div>
          ) : currentData.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center h-full">
              <p className="text-base font-bold" style={{ color: textColor }}>Aucun produit sur cette page de pagination</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {currentData.map((produit) => (
                <ProductCard
                  key={produit.id}
                  produit={produit}
                  color={modalData.color}
                  imageUrl={imageUrls[produit.id] || null}
                  isDark={isDark}
                  colors={colors}
                  hexToRgba={hexToRgba}
                  hasImageError={imageErrors[produit.id] || false}
                  onImageError={onImageError}
                  nbCommandes={nbCommandesMap[produit.id] || 0}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>

        {/* ⭐ PAGINATION ERP PRO */}
        {dataLength > 0 && (
          <div
            className="px-6 py-3.5 border-t flex flex-wrap items-center justify-between gap-3 flex-shrink-0 relative z-10"
            style={{ 
              background: isDark ? 'rgba(30, 41, 59, 0.8)' : 'rgba(255, 255, 255, 0.8)',
              backdropFilter: 'blur(8px)',
              borderColor: borderColor 
            }}
          >
            <p className="text-xs font-medium" style={{ color: mutedColor }}>
              Affichage de <span className="font-bold" style={{ color: textColor }}>{dataLength > 0 ? `${startIndex + 1} - ${Math.min(endIndex, dataLength)}` : '0'}</span> sur <span className="font-bold" style={{ color: textColor }}>{dataLength}</span> éléments
            </p>
            
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={onGoToPrevious}
                disabled={currentPage === 1}
                className="p-2 rounded-xl transition-all disabled:opacity-20 cursor-pointer border shadow-xs"
                style={{ color: mutedColor, borderColor: borderColor, background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF' }}
                aria-label="Page précédente"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {renderPageNumbers().map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => onGoToPage(page)}
                  className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center border shadow-xs ${
                    page === currentPage
                      ? 'text-white scale-105 border-transparent'
                      : 'hover:bg-indigo-500/10'
                  }`}
                  style={{
                    background: page === currentPage ? modalData.color : (isDark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF'),
                    borderColor: page === currentPage ? 'transparent' : borderColor,
                    color: page === currentPage ? '#FFFFFF' : textColor,
                  }}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={onGoToNext}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl transition-all disabled:opacity-20 cursor-pointer border shadow-xs"
                style={{ color: mutedColor, borderColor: borderColor, background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#FFFFFF' }}
                aria-label="Page suivante"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ⭐ FOOTER BUTTON */}
        <div
          className="px-6 py-4 border-t flex justify-end items-center flex-shrink-0 relative z-10"
          style={{ 
            background: isDark ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(8px)',
            borderColor: borderColor 
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] text-white cursor-pointer shadow-premium"
            style={{
              background: `linear-gradient(135deg, ${modalData.color}, ${modalData.color}dd)`,
            }}
          >
            Fermer le module
          </button>
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
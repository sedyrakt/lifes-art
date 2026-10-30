// src/components/produits/ProduitsStats/ProductCard.tsx
// ⭐ FANITSARA: UI Pro Card misy iconography miloko (violet, pink, red, etc.)

import React from 'react';
import { 
  ImageOff, CheckCircle, XCircle, 
  Eye, Edit, Trash2, ShoppingBag 
} from 'lucide-react';
import { formatMoney } from '../../../lib/formatMoney';

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

interface ProductCardProps {
  produit: Produit;
  color: string;
  imageUrl: string | null;
  isDark: boolean;
  colors: any;
  hexToRgba: (color: string, alpha: number) => string;
  hasImageError?: boolean;
  onImageError?: (id: number) => void;
  nbCommandes?: number;
  onView?: (produit: Produit) => void;
  onEdit?: (produit: Produit) => void;
  onDelete?: (id: number) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  produit: p,
  color,
  imageUrl,
  isDark,
  colors,
  hexToRgba,
  hasImageError = false,
  onImageError,
  nbCommandes = 0,
  onView,
  onEdit,
  onDelete,
}) => {
  const initiales = p.nom?.charAt(0)?.toUpperCase() || '?';
  const showImage = imageUrl && typeof imageUrl === 'string' && !hasImageError;

  const handleImageError = () => {
    if (onImageError && !hasImageError) {
      onImageError(p.id);
    }
  };

  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all duration-300 hover:shadow-card-hover hover:-translate-y-1 flex flex-col group relative"
      style={{
        background: isDark ? 'rgba(15, 23, 42, 0.6)' : 'rgba(255, 255, 255, 0.8)',
        borderColor: 'rgba(99,102,241,0.15)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Sary miaraka amin'ny Badge Code */}
      <div className="w-full h-36 bg-slate-900/10 dark:bg-slate-900/50 flex items-center justify-center overflow-hidden relative">
        {showImage ? (
          <img
            src={imageUrl}
            alt={p.nom}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            loading="lazy"
            onError={handleImageError}
          />
        ) : hasImageError ? (
          <ImageOff className="w-8 h-8 opacity-40" style={{ color: colors.muted }} />
        ) : (
          <span className="text-4xl font-extrabold tracking-wider" style={{ color }}>
            {initiales}
          </span>
        )}
        
        {/* Code Badge Overlay */}
        <div className="absolute top-2.5 left-2.5">
          <span 
            className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-xl backdrop-blur-md shadow-sm border"
            style={{
              background: isDark ? 'rgba(2, 6, 23, 0.75)' : 'rgba(255, 255, 255, 0.9)',
              color: color,
              borderColor: hexToRgba(color, 0.3)
            }}
          >
            {p.code || 'N/A'}
          </span>
        </div>
      </div>

      {/* Infos Content */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-bold line-clamp-1 tracking-tight" style={{ color: colors.text }}>
              {p.nom}
            </h3>
          </div>

          {p.categorie_nom && (
            <p className="text-[11px] font-medium line-clamp-1 mt-0.5 uppercase tracking-wider" style={{ color: colors.muted }}>
              {p.categorie_nom}
            </p>
          )}

          <div className="w-full h-px my-3" style={{ background: hexToRgba(color, 0.15) }} />

          <div className="w-full text-xs space-y-1.5" style={{ color: colors.muted }}>
            <div className="flex justify-between items-center">
              <span className="font-medium">Prix vente</span>
              <span className="text-sm font-extrabold" style={{ color: color }}>
                {formatMoney(p.prix_vente || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Stock</span>
              <span className="font-bold" style={{ color: colors.text }}>
                {p.quantite_stock || 0} <span className="text-[10px] font-normal opacity-70">{p.unite || 'pièce'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Ligne du bas : statut + commandes + Actions miloko (Violet, Pink, Red) */}
        <div className="mt-4 pt-3 border-t w-full" style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
          <div className="flex items-center justify-between">
            <span
              className={`text-[11px] font-bold px-2.5 py-1 rounded-xl inline-flex items-center gap-1.5 shadow-xs ${
                p.status === 'actif'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                  : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
              }`}
            >
              {p.status === 'actif' ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {p.status === 'actif' ? 'Actif' : 'Inactif'}
            </span>

            <span className="text-xs flex items-center gap-1 font-medium" style={{ color: colors.muted }}>
              <ShoppingBag className="w-3.5 h-3.5 text-violet-400" />
              <span className="font-bold" style={{ color: colors.text }}>{nbCommandes}</span>
              <span className="text-[11px]">cmd</span>
            </span>
          </div>

          {/* Actions Bar Pro miaraka amin'ny loko samihafa (Violet, Pink, Red) */}
          <div className="flex items-center justify-end gap-2 mt-3 pt-2.5 border-t border-slate-700/20">
            {/* 👁️ VIEW - VIOLET */}
            {onView && (
              <button
                onClick={() => onView(p)}
                className="p-2 rounded-xl transition-all duration-200 bg-violet-500/10 hover:bg-violet-500/25 text-violet-400 hover:text-violet-300 cursor-pointer border border-violet-500/20 shadow-xs hover:scale-105"
                title="Voir le produit"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}

            {/* ✏️ EDIT - PINK */}
            {onEdit && (
              <button
                onClick={() => onEdit(p)}
                className="p-2 rounded-xl transition-all duration-200 bg-pink-500/10 hover:bg-pink-500/25 text-pink-400 hover:text-pink-300 cursor-pointer border border-pink-500/20 shadow-xs hover:scale-105"
                title="Modifier le produit"
              >
                <Edit className="w-4 h-4" />
              </button>
            )}

            {/* 🗑️ DELETE - RED */}
            {onDelete && (
              <button
                onClick={() => onDelete(p.id)}
                className="p-2 rounded-xl transition-all duration-200 bg-red-500/10 hover:bg-red-500/25 text-red-400 hover:text-red-300 cursor-pointer border border-red-500/20 shadow-xs hover:scale-105"
                title="Supprimer le produit"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
// src/components/produits/ProduitsStats/ProductList.tsx

import React from 'react';
import { Sparkles } from 'lucide-react';
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

interface ProductListProps {
  data: Produit[];
  dataLength: number;
  color: string;
  imageUrls: Record<number, string | null>;
  isDark: boolean;
  colors: {
    card: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
  };
  hexToRgba: (color: string, alpha: number) => string;
  imageErrors?: Record<number, boolean>;
  onImageError?: (id: number) => void;
  nbCommandesMap?: Record<number, number>;
  onView?: (produit: Produit) => void;
  onEdit?: (produit: Produit) => void;
  onDelete?: (id: number) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  data,
  dataLength,
  color,
  imageUrls,
  isDark,
  colors,
  hexToRgba,
  imageErrors = {},
  onImageError,
  nbCommandesMap = {},
  onView,
  onEdit,
  onDelete,
}) => {
  if (dataLength === 0) {
    return (
      <div className="text-center py-20 flex flex-col items-center justify-center flex-1 bg-transparent">
        <div className="p-4 rounded-3xl mb-3 shadow-soft" style={{ background: hexToRgba(color, 0.1) }}>
          <Sparkles className="w-10 h-10" style={{ color }} />
        </div>
        <p className="text-base font-bold" style={{ color: colors.text }}>Aucun résultat trouvé dans l'ERP</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-20 flex flex-col items-center justify-center flex-1 bg-transparent">
        <p className="text-base font-bold" style={{ color: colors.text }}>Aucun produit sur cette page de pagination</p>
      </div>
    );
  }

  return (
    <div className="p-6 overflow-y-auto flex-1 bg-transparent">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {data.map((p) => (
          <ProductCard
            key={p.id}
            produit={p}
            color={color}
            imageUrl={imageUrls[p.id] || null}
            isDark={isDark}
            colors={colors}
            hexToRgba={hexToRgba}
            hasImageError={imageErrors[p.id] || false}
            onImageError={onImageError}
            nbCommandes={nbCommandesMap[p.id] || 0}
            onView={onView}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};

export default ProductList;
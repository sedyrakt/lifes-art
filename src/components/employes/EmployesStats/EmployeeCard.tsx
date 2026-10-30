// src/components/employes/EmployesStats/EmployeeCard.tsx

import React from 'react';
import { ImageOff, Mail, Phone, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { formatMoney } from '../../../lib/formatMoney';

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

interface EmployeeCardProps {
  employee: Employe;
  color: string;
  imageUrl: string | null;
  hasError: boolean;
  onImageError: (id: number) => void;
  selectedStat: string;
  isDark: boolean;
  colors: {
    card: string;
    border: string;
    text: string;
    muted: string;
    primary: string;
  };
  hexToRgba: (color: string, alpha: number) => string;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee: emp,
  color,
  imageUrl,
  hasError,
  onImageError,
  selectedStat,
  isDark,
  colors,
  hexToRgba,
}) => {
  const isActif = emp.status?.toLowerCase() === 'actif' || emp.status?.toLowerCase() === 'Actif';

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-200 hover:shadow-md hover:scale-[1.02] flex flex-col"
      style={{
        background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
        borderColor: 'rgba(99,102,241,0.12)',
      }}
    >
      <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
        {imageUrl && !hasError && typeof imageUrl === 'string' ? (
          <img 
            src={imageUrl} 
            alt={`${emp.prenom} ${emp.nom}`}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            loading="lazy"
            onError={() => onImageError(emp.id)}
          />
        ) : hasError ? (
          <ImageOff className="w-8 h-8" style={{ color: colors.muted }} />
        ) : (
          <span className="text-3xl font-bold" style={{ color }}>
            {emp.prenom?.[0]?.toUpperCase() || '?'}
            {emp.nom?.[0]?.toUpperCase() || ''}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-semibold" style={{ color: colors.text }}>
          {emp.prenom} {emp.nom}
        </h3>
        
        <p className="text-sm font-medium" style={{ color }}>
          {emp.poste || 'N/A'}
        </p>
        {emp.departement && (
          <p className="text-xs" style={{ color: colors.muted }}>
            {emp.departement}
          </p>
        )}

        <div className="w-12 h-0.5 rounded-full my-2" style={{ background: hexToRgba(color, 0.3) }} />

        <div className="w-full text-sm space-y-1" style={{ color: colors.muted }}>
          {emp.email && (
            <div className="flex items-center justify-center gap-1 truncate max-w-full">
              <Mail className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{emp.email}</span>
            </div>
          )}
          {emp.telephone && (
            <div className="flex items-center justify-center gap-1">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{emp.telephone}</span>
            </div>
          )}
        </div>

        <div className="mt-3 pt-3 border-t w-full" style={{ borderColor: 'rgba(99,102,241,0.08)' }}>
          {selectedStat.includes('salaire') ? (
            <p className="text-sm font-semibold" style={{ color }}>
              {formatMoney(emp.salaire || 0)}
            </p>
          ) : selectedStat.includes('total') || selectedStat.includes('taux') ? (
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full inline-flex items-center gap-1 ${
                isActif
                  ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'text-red-500 bg-red-50 dark:bg-red-900/20'
              }`}
            >
              {isActif ? (
                <CheckCircle className="w-3.5 h-3.5" />
              ) : (
                <XCircle className="w-3.5 h-3.5" />
              )}
              {isActif ? 'Actif' : 'Inactif'}
            </span>
          ) : selectedStat.includes('actifs') ? (
            <span className="text-sm text-emerald-500 font-medium">Actif</span>
          ) : null}
          {selectedStat.includes('taux') && emp.date_embauche && (
            <p className="text-xs mt-1" style={{ color: colors.muted }}>
              <Calendar className="w-3.5 h-3.5 inline mr-1" />
              {new Date(emp.date_embauche).toLocaleDateString('fr-FR')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeCard;
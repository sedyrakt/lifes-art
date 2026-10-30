// src/components/employes/EmployesStats/EmployeeList.tsx

import React from 'react';
import { Users } from 'lucide-react';
import EmployeeCard from './EmployeeCard';

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

interface EmployeeListProps {
  data: Employe[];
  dataLength: number;
  color: string;
  modalImageUrls: Record<number, string | null>;
  imageUrls: Record<number, string | null>;
  imageErrors: Record<number, boolean>;
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

const EmployeeList: React.FC<EmployeeListProps> = ({
  data,
  dataLength,
  color,
  modalImageUrls,
  imageUrls,
  imageErrors,
  onImageError,
  selectedStat,
  isDark,
  colors,
  hexToRgba,
}) => {
  if (dataLength === 0) {
    return (
      <div className="text-center py-10">
        <Users className="w-12 h-12 mx-auto mb-3" style={{ color: colors.muted }} />
        <p className="text-base" style={{ color: colors.muted }}>Aucun employé trouvé</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-base" style={{ color: colors.muted }}>Aucun employé sur cette page</p>
      </div>
    );
  }

  return (
    <div className="p-5 overflow-y-auto max-h-[55vh]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((emp) => (
          <EmployeeCard
            key={emp.id}
            employee={emp}
            color={color}
            imageUrl={modalImageUrls[emp.id] || imageUrls[emp.id] || null}
            hasError={imageErrors[emp.id] || false}
            onImageError={onImageError}
            selectedStat={selectedStat}
            isDark={isDark}
            colors={colors}
            hexToRgba={hexToRgba}
          />
        ))}
      </div>
    </div>
  );
};

export default EmployeeList;
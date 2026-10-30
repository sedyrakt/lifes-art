// src/components/commandes/CommandesModalForm/CommandesModalHeader.tsx
// ⭐ FONT SIZE: h2 16px, subtitle 12.5px
// ⭐ NOUVEAU: isEditing prop — aseho "Modifier la commande" rehefa edit mode

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { COLORS } from './CommandesModalConstants';

interface CommandesModalHeaderProps {
  onClose: () => void;
  isEditing?: boolean;
}

export const CommandesModalHeader: React.FC<CommandesModalHeaderProps> = ({ onClose, isEditing = false }) => {
  const { isDark } = useTheme();
  const theme = isDark ? COLORS.dark : COLORS.light;

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ background: theme.headerBg, borderColor: theme.border }}>
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: theme.text }}>
            {isEditing ? 'Modifier la commande' : 'Nouvelle commande'}
          </h2>
          <p className="text-[12.5px]" style={{ color: theme.muted }}>
            {isEditing ? 'Modifier une commande existante' : 'Créer une commande'}
          </p>
        </div>
      </div>
      <button
        onClick={onClose}
        aria-label="Fermer"
        className={`flex h-9 w-9 items-center justify-center rounded-md text-[20px] leading-none ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-100'}`}
        style={{ color: theme.muted }}
      >
        ×
      </button>
    </div>
  );
};
// src/components/employes/EmployesStats/StatsCard.tsx

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { StatType } from '../EmployesStats';

interface StatItem {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  evolution: number;
  statType: StatType;
}

interface StatsCardProps {
  stat: StatItem;
  isDark: boolean;
  curveImage: string;
  colors: {
    card: string;
    border: string;
    text: string;
    muted: string;
  };
  hexToRgba: (color: string, alpha: number) => string;
  onCardClick: (statType: StatType) => void;
}

const StatsCard: React.FC<StatsCardProps> = ({
  stat,
  isDark,
  curveImage,
  colors,
  hexToRgba,
  onCardClick,
}) => {
  const isPositive = stat.evolution >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  const cardBg = isDark
    ? colors.card
    : hexToRgba(stat.color, 0.05);

  const iconBg = isDark
    ? hexToRgba(stat.color, 0.15)
    : '#FFFFFF';

  return (
    <div
      onClick={() => onCardClick(stat.statType)}
      className="group relative rounded-xl p-4 border transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer flex flex-col justify-between overflow-hidden"
      style={{
        background: cardBg,
        borderColor: isDark ? colors.border : hexToRgba(stat.color, 0.15),
        boxShadow: isDark 
          ? '0 2px 10px rgba(0,0,0,0.2)' 
          : `0 2px 10px ${hexToRgba(stat.color, 0.06)}`,
        position: 'relative',
        overflow: 'hidden',
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCardClick(stat.statType);
        }
      }}
    >
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${curveImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: isDark ? 0.08 : 0.10,
          filter: 'blur(1px)',
        }}
      />

      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark 
            ? `radial-gradient(circle at 30% 20%, ${hexToRgba(stat.color, 0.05)}, transparent 70%)`
            : `radial-gradient(circle at 30% 20%, ${hexToRgba(stat.color, 0.03)}, transparent 70%)`,
        }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div 
            className="p-2 rounded-lg transition-transform duration-300 group-hover:scale-105 shadow-xs" 
            style={{ 
              background: iconBg,
              border: isDark ? `1px solid ${hexToRgba(stat.color, 0.3)}` : 'none'
            }}
          >
            <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
          </div>
          
          <div className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            isPositive ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'
          }`}>
            <TrendIcon className="w-2.5 h-2.5" />
            <span>{isPositive ? '+' : ''}{stat.evolution}%</span>
          </div>
        </div>

        <div>
          <p className="text-lg font-black tracking-tight" style={{ color: colors.text }}>
            {stat.value}
          </p>
          <p className="text-sm font-bold uppercase tracking-wider truncate mt-0.5" style={{ color: colors.muted }}>
            {stat.label}
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatsCard;
import React from 'react';
import { ITEM_INFO } from '../game/constants';
import { BuildingKind, ItemType } from '../game/types';

export const TitleLogoSvg: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 360 72"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="Рудопоток"
  >
    {/* Core Hexagonal Emblem */}
    <rect x="4" y="8" width="56" height="56" rx="10" fill="#191E28" stroke="#F59E0B" strokeWidth="2.5" />
    <polygon
      points="32,16 46,24 46,40 32,48 18,40 18,24"
      fill="#12161D"
      stroke="#38BDF8"
      strokeWidth="2"
    />
    <path d="M24 32 L32 25 L40 32 L32 39 Z" fill="#F59E0B" />
    <path d="M8 36 H16 M48 36 H56" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />

    {/* Wordmark */}
    <text
      x="76"
      y="43"
      fill="#F1F5F9"
      fontFamily="Manrope, system-ui, sans-serif"
      fontSize="34"
      fontWeight="800"
      letterSpacing="-0.03em"
    >
      РУДОПОТОК
    </text>
    <text
      x="77"
      y="60"
      fill="#8E9BB0"
      fontFamily="Manrope, system-ui, sans-serif"
      fontSize="12"
      fontWeight="600"
      letterSpacing="0.06em"
    >
      АВТОМАТИЗАЦИЯ И ЛОГИСТИКА ЗАВОДА
    </text>
  </svg>
);

export const ItemIcon: React.FC<{ item: ItemType; size?: number; className?: string }> = ({
  item,
  size = 18,
  className = '',
}) => {
  const info = ITEM_INFO[item];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {info.shape === 'ore' && (
        <polygon
          points="5,8 12,3 20,10 17,20 6,18"
          fill={info.color}
          stroke={info.accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}
      {info.shape === 'coil' && (
        <>
          <circle cx="12" cy="12" r="7" stroke={info.color} strokeWidth="4" />
          <path d="M8 6.5 A7 7 0 0 1 18.5 11" stroke={info.accent} strokeWidth="1.6" strokeLinecap="round" />
        </>
      )}
      {info.shape === 'ingot' && (
        <>
          <rect x="3.5" y="7" width="17" height="10" rx="2.5" fill={info.color} stroke="#475569" strokeWidth="1.6" />
          <rect x="6.5" y="9.5" width="11" height="2.4" rx="1" fill={info.accent} />
        </>
      )}
      {info.shape === 'chip' && (
        <>
          <rect x="4.5" y="4.5" width="15" height="15" rx="2.5" fill="#0F172A" stroke={info.color} strokeWidth="2" />
          <rect x="9.5" y="9.5" width="5" height="5" rx="1" fill={info.accent} />
        </>
      )}
      {info.shape === 'plate' && (
        <polygon
          points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5"
          fill={info.color}
          stroke={info.accent}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      )}
      {info.shape === 'core' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#1E1B2E" stroke={info.color} strokeWidth="2.2" />
          <circle cx="12" cy="12" r="3.5" fill={info.accent} />
        </>
      )}
    </svg>
  );
};

export const BuildingIcon: React.FC<{ kind: BuildingKind; size?: number; className?: string }> = ({
  kind,
  size = 24,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {kind === 'belt' && (
        <>
          <rect x="5" y="2" width="14" height="20" rx="2" fill="#202736" stroke="#475569" strokeWidth="1.5" />
          <path d="M8.5 15 L12 10.5 L15.5 15" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.5 9.5 L12 5 L15.5 9.5" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
      {kind === 'drill' && (
        <>
          <rect x="3" y="3" width="18" height="18" rx="3" fill="#252E3F" stroke="#E07A38" strokeWidth="1.8" />
          <path d="M12 6 V18 M6 12 H18" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3" fill="#E07A38" />
        </>
      )}
      {kind === 'turbo_drill' && (
        <>
          <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="#252E3F" stroke="#38BDF8" strokeWidth="2" />
          <path d="M7 7 L17 17 M17 7 L7 17" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="3.8" fill="#38BDF8" />
        </>
      )}
      {kind === 'router' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#2B3548" stroke="#94A3B8" strokeWidth="1.8" />
          <path d="M12 6 V18 M6 12 H18" stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.5" fill="#F59E0B" />
        </>
      )}
      {kind === 'junction' && (
        <>
          <rect x="3.5" y="3.5" width="17" height="17" rx="2" fill="#1D2432" stroke="#64748B" strokeWidth="1.6" />
          <rect x="3.5" y="9.5" width="17" height="5" fill="#334155" />
          <rect x="9.5" y="3.5" width="5" height="17" fill="#475569" />
        </>
      )}
      {kind === 'bridge' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3.5" fill="#232C3D" stroke="#38BDF8" strokeWidth="1.8" />
          <path d="M12 7 L16.5 14 H13.5 V17 H10.5 V14 H7.5 Z" fill="#38BDF8" />
        </>
      )}
      {kind === 'sorter' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#263042" stroke="#38BDF8" strokeWidth="1.8" />
          <polygon points="12,6.5 15.5,11 8.5,11" fill="#38BDF8" />
          <circle cx="12" cy="14.5" r="3" fill="#F59E0B" />
        </>
      )}
      {kind === 'smelter' && (
        <>
          <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="#202736" stroke="#F59E0B" strokeWidth="2" />
          <rect x="6" y="6" width="12" height="12" rx="2" fill="#141923" />
          <circle cx="12" cy="12" r="3.5" fill="#F59E0B" />
        </>
      )}
      {kind === 'assembler' && (
        <>
          <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="#202736" stroke="#10B981" strokeWidth="2" />
          <rect x="6" y="6" width="12" height="12" rx="2" fill="#141923" />
          <rect x="9" y="9" width="6" height="6" rx="1" fill="#10B981" />
        </>
      )}
      {kind === 'trash' && (
        <>
          <rect x="4" y="4" width="16" height="16" rx="3" fill="#2B1D24" stroke="#EF4444" strokeWidth="1.8" />
          <path d="M8.5 8.5 L15.5 15.5 M15.5 8.5 L8.5 15.5" stroke="#F87171" strokeWidth="2.2" strokeLinecap="round" />
        </>
      )}
      {kind === 'core' && (
        <>
          <rect x="2.5" y="2.5" width="19" height="19" rx="3" fill="#1E2534" stroke="#F59E0B" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" fill="#F59E0B" />
        </>
      )}
    </svg>
  );
};

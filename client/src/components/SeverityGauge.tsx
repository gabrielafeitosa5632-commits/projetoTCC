/**
 * PhytoPathometric — SeverityGauge Component
 * Circular gauge showing the measured percentage without agronomic categories.
 * Design: AgTech Dashboard Moderno — Emerald/Green palette
 */
import { formatSeverityPercentage } from '@/contexts/AnalysisContext';
import { motion } from 'framer-motion';
import { useId } from 'react';

interface SeverityGaugeProps {
  value: number;
  size?: number;
  showLabel?: boolean;
  animated?: boolean;
  label?: string;
  color?: string;
}

export function SeverityGauge({
  value,
  size = 160,
  showLabel = true,
  animated = true,
  label = 'Severidade foliar',
  color = '#0f766e',
}: SeverityGaugeProps) {
  const gaugeId = useId().replace(/:/g, '');
  const safeValue = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const strokeWidth = Math.max(8, size * 0.07);
  const radius = (size - strokeWidth - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (safeValue / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;
  const isCompact = size < 120;

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative rounded-full"
        style={{
          width: size,
          height: size,
          filter: isCompact ? undefined : 'drop-shadow(0 14px 24px rgba(8, 59, 38, 0.16))',
        }}
      >
        {!isCompact && (
          <div
            className="absolute inset-3 rounded-full"
            style={{
              background: 'radial-gradient(circle, #ffffff 58%, #ecfdf5 100%)',
              boxShadow: 'inset 0 0 0 1px #a7f3d0',
            }}
          />
        )}
        <svg width={size} height={size} className="relative rotate-[-90deg]">
          <defs>
            <filter id={`glow${gaugeId}`} x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={color} floodOpacity="0.35" />
            </filter>
          </defs>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={isCompact ? '#d9e4d7' : '#d4decf'}
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={animated ? { strokeDashoffset: circumference } : undefined}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            filter={isCompact ? undefined : `url(#glow${gaugeId})`}
          />
          <circle
            cx={cx}
            cy={cy - radius}
            r={Math.max(3, strokeWidth * 0.28)}
            fill={color}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="font-display font-extrabold leading-none"
            style={{
              color,
              fontSize: size * (isCompact ? 0.2 : 0.25),
              textShadow: isCompact ? undefined : '0 2px 16px #d1fae5',
            }}
            initial={animated ? { opacity: 0, scale: 0.5 } : undefined}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            {formatSeverityPercentage(safeValue)}
          </motion.span>
          <span
            className="font-body font-bold mt-1"
            style={{ color: isCompact ? '#0f766e' : '#245331', fontSize: size * (isCompact ? 0.09 : 0.105) }}
          >
            {label}
          </span>
        </div>
      </div>
      {showLabel && (
        <motion.div
          className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold shadow-sm"
          style={{
            background: 'linear-gradient(135deg, #ecfdf5, #ffffff)',
            color: '#0f766e',
            border: '1px solid #a7f3d0',
          }}
          initial={animated ? { opacity: 0, y: 8 } : undefined}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.3 }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
          Percentual calculado sobre a área foliar válida
        </motion.div>
      )}
    </div>
  );
}

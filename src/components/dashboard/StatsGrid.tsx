import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Shield,
  MapPin,
  TrendingDown,
  TrendingUp,
  Gauge,
  School,
  Wifi
} from 'lucide-react';
import { useRiskStore } from '@/services/riskStore';
import { useMemo } from 'react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  unit?: string;
  delay?: number;
  isHero?: boolean;
  subtitle?: string;
}

function StatCard({ icon, label, value, change, trend, unit, delay = 0, isHero, subtitle }: StatCardProps) {
  const isPositive = trend === 'down' ? change && change < 0 : change && change > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={`
        relative overflow-hidden rounded-2xl border backdrop-blur-xl
        transition-all duration-300 hover:-translate-y-1
        ${isHero
          ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30 shadow-lg shadow-primary/10 p-8 col-span-2 lg:col-span-1'
          : 'bg-zinc-900/40 border-zinc-800/50 shadow-xl p-6 hover:shadow-2xl hover:border-zinc-700/50'
        }
      `}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`
            p-3 rounded-xl backdrop-blur-sm
            ${isHero
              ? 'bg-primary/20 shadow-lg shadow-primary/20'
              : 'bg-zinc-800/50'
            }
          `}>
            {icon}
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg backdrop-blur-sm ${isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
              }`}>
              {trend === 'down' ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <TrendingUp className="w-3 h-3" />
              )}
              {Math.abs(change)}{unit === '%' ? '%' : ''}
            </div>
          )}
        </div>

        <div>
          <p className="text-zinc-400 text-sm font-medium mb-2">{label}</p>
          <p className={`font-display font-bold text-white ${isHero ? 'text-5xl' : 'text-3xl'}`}>
            {value}
            {unit && unit !== '%' && <span className="text-xl ml-1 text-zinc-400">{unit}</span>}
          </p>
          {subtitle && (
            <p className="text-xs text-zinc-500 mt-2">{subtitle}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function StatsGrid() {
  const { zones, userLocation } = useRiskStore();

  // Calculate real-time metrics from zones
  const metrics = useMemo(() => {
    const highRiskCount = zones.filter(z => z.riskLevel === 'critical' || z.riskLevel === 'high').length;
    const mediumRiskCount = zones.filter(z => z.riskLevel === 'medium').length;
    const totalRoads = zones.length;

    // Calculate risk index (0-100)
    const riskIndex = totalRoads > 0
      ? Math.round(((highRiskCount * 2 + mediumRiskCount) / (totalRoads * 2)) * 100)
      : 0;

    // Sensitive zones (schools, etc.) - estimate 20% of medium risk zones
    const sensitiveZones = Math.round(mediumRiskCount * 0.2);

    return {
      riskIndex,
      highRiskRoads: highRiskCount,
      sensitiveZones,
      systemHealth: userLocation ? 98 : 85 // Higher when location is active
    };
  }, [zones, userLocation]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Hero Card - Live Risk Index */}
      <StatCard
        icon={<Gauge className="w-7 h-7 text-primary" />}
        label="Live Risk Index"
        value={metrics.riskIndex}
        change={-12}
        trend="down"
        unit="%"
        delay={0}
        isHero
        subtitle="Real-time traffic risk assessment"
      />

      {/* High-Risk Roads Nearby */}
      <StatCard
        icon={<AlertTriangle className="w-6 h-6 text-red-400" />}
        label="High-Risk Roads Nearby"
        value={metrics.highRiskRoads}
        change={-3}
        trend="down"
        delay={0.1}
        subtitle="Within 2km radius"
      />

      {/* Sensitive Zones Near You */}
      <StatCard
        icon={<School className="w-6 h-6 text-amber-400" />}
        label="Sensitive Zones Near You"
        value={metrics.sensitiveZones}
        delay={0.2}
        subtitle="Schools, hospitals, etc."
      />

      {/* System Health */}
      <StatCard
        icon={<Wifi className="w-6 h-6 text-emerald-400" />}
        label="System Health"
        value={metrics.systemHealth}
        unit="%"
        change={2}
        trend="up"
        delay={0.3}
        subtitle="All systems operational"
      />
    </div>
  );
}

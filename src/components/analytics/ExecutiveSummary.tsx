import { memo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Activity, ShieldAlert, AlertOctagon, Car } from 'lucide-react';
import { useAnalyticsStore } from '@/services/analyticsService';

const KPICard = memo(({ label, value, trend, icon: Icon, color, isPrimary = false }: any) => {
    const isPositive = trend > 0;

    // Primary card gets a slight glow and solid border accent
    const cardStyles = isPrimary
        ? "relative overflow-hidden bg-gradient-to-br from-emerald-950/40 to-black border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]"
        : "relative overflow-hidden bg-zinc-900/20 border-white/5 hover:bg-zinc-900/40 transition-colors";

    const valueStyles = isPrimary
        ? "text-3xl font-bold text-white tracking-tight text-emerald-100"
        : "text-2xl font-bold text-zinc-200 tracking-tight";

    return (
        <Card className={cardStyles}>
            <CardContent className="p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <p className={`text-[10px] uppercase font-bold tracking-widest mb-1 ${isPrimary ? 'text-emerald-400' : 'text-zinc-500'}`}>{label}</p>
                        <h3 className={valueStyles}>{value}</h3>
                    </div>
                    <div className={`p-2 rounded-lg ${isPrimary ? 'bg-emerald-500/20 text-emerald-400' : `bg-${color}-500/5 text-${color}-500/70`}`}>
                        {Icon && <Icon className="w-5 h-5" />}
                    </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded flex items-center gap-1 ${isPositive ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                        }`}>
                        {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {Math.abs(trend)}%
                    </span>
                    <span className="text-[10px] text-zinc-600">vs last 24h</span>
                </div>
            </CardContent>
        </Card>
    );
});

export const ExecutiveSummary = memo(() => {
    const data = useAnalyticsStore((state) => state.data);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Primary Focus */}
            <KPICard
                label="Active Risk Zones"
                value={data.activeRiskZones}
                trend={12.1}
                icon={ShieldAlert}
                color="emerald"
                isPrimary={true}
            />
            {/* Secondary Metrics */}
            <KPICard
                label="Total Incidents"
                value={data.totalIncidents}
                trend={-5.5}
                icon={AlertOctagon}
                color="rose"
            />
            <KPICard
                label="Avg Risk Score"
                value={`${data.averageRiskScore}%`}
                trend={-2.2}
                icon={Activity}
                color="amber"
            />
            <KPICard
                label="Traffic Volume"
                value="14.2k"
                trend={8.4}
                icon={Car}
                color="blue"
            />
        </div>
    );
});

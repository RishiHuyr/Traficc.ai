import { useEffect, useState, useMemo, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, RefreshCcw, Sparkles, MapPin } from 'lucide-react';
import { useAnalyticsStore } from '@/services/analyticsService';
import { useRiskStore } from '@/services/riskStore';
import { ExecutiveSummary } from '@/components/analytics/ExecutiveSummary';
import { InsightCard } from '@/components/analytics/InsightCard';
import { useNavigate } from 'react-router-dom';

// Lazy Load Heavy Charts
const TrendAnalysis = lazy(() => import('@/components/analytics/TrendAnalysis').then(module => ({ default: module.TrendAnalysis })));

export default function AnalyticsPage() {
  const [isSimulating, setIsSimulating] = useState(true);
  const updateAnalytics = useAnalyticsStore((state) => state.updateAnalytics);

  // Simulation Effect to make page feel "Live"
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      // Simulate micro-changes in risk score and active zones
      updateAnalytics({
        activeRiskZones: Math.floor(Math.random() * 5) + 5, // 5-10
        averageRiskScore: Math.floor(Math.random() * 10) + 40, // 40-50
      });
    }, 5000); // Update every 5s

    return () => clearInterval(interval);
  }, [isSimulating, updateAnalytics]);

  const { zones, fetchNearbyRoads, userLocation } = useRiskStore();
  const navigate = useNavigate();
  const [dismissedInsightIds, setDismissedInsightIds] = useState<Set<string>>(new Set());

  // Ensure we have data
  useEffect(() => {
    // If no zones and no location, try fetching default or wait for user location
    // Real-app: trigger location request here if needed. 
    // For now, if we have no zones, we trigger a fetch for default location (NY) or user's last known
    if (zones.length <= 7 && !userLocation) { // 7 is length of mock data
      // optionally trigger fetch for default location
    }
  }, [zones, userLocation]);

  const generateInsights = useMemo(() => {
    // Filter out dismissed
    // Generate insights from zones
    const generated = [];

    // 1. Critical High Risk Zones
    const criticalZones = zones.filter(z => z.riskLevel === 'critical');
    criticalZones.forEach(z => {
      generated.push({
        id: `crit-${z.id}`,
        type: 'critical' as const,
        title: 'Critical Congestion Detected',
        description: `Severe delays detected on ${z.name}. Traffic flow has halted.`,
        recommendation: 'Dispatch traffic control unit to clear intersection.',
        relatedZoneId: z.id
      });
    });

    // 2. Rising Risk (High)
    const highZones = zones.filter(z => z.riskLevel === 'high');
    highZones.forEach(z => {
      generated.push({
        id: `high-${z.id}`,
        type: 'warning' as const,
        title: 'Congestion Build-up',
        description: `Traffic density increasing on ${z.name}. Potential bottleneck.`,
        recommendation: 'Monitor signal timing and upstream flow.',
        relatedZoneId: z.id
      });
    });

    // 3. Positive Trends (Low risk but previously might have been high - simulated)
    // Since we don't have historical data per zone in this simple store, we pick a few random 'low' zones to show as 'cleared'
    const lowZones = zones.filter(z => z.riskLevel === 'low').slice(0, 1);
    lowZones.forEach(z => {
      generated.push({
        id: `low-${z.id}`,
        type: 'positive' as const,
        title: 'Traffic Flow Restored',
        description: `Congestion cleared on ${z.name}. Flow rate returning to normal.`,
        recommendation: 'Maintain current signal adjustments.',
        relatedZoneId: z.id
      });
    });

    return generated.filter(i => !dismissedInsightIds.has(i.id));
  }, [zones, dismissedInsightIds]);

  const handleDismiss = (id: string) => {
    setDismissedInsightIds(prev => new Set(prev).add(id));
  };

  const handleViewZone = (zoneId: string) => {
    navigate(`/map?focusZone=${zoneId}`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 p-2">
        {/* ... Header ... */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
        >
          {/* ... (Keep existing Header content) ... */}
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
              Analytics & Intelligence
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </h1>
            <p className="text-zinc-400 mt-1 max-w-2xl text-sm">
              Real-time decision support system driven by AI pattern recognition.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Check if we have real location data */}
            {userLocation && (
              <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5 animate-pulse">
                <MapPin className="w-3 h-3 mr-1" />
                Loc: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </Badge>
            )}
            <Button variant="outline" size="sm" className="bg-black/20 border-zinc-800 text-zinc-300 hover:text-white">
              <Calendar className="w-4 h-4 mr-2" />
              Last 24 Hours
            </Button>
            <Button variant="outline" size="sm" className="bg-black/20 border-zinc-800 text-zinc-300 hover:text-white" onClick={() => window.location.reload()}>
              <RefreshCcw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
            <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 shadow-lg shadow-emerald-900/20">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </motion.div>

        {/* Executive Summary */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ExecutiveSummary />
        </motion.div>

        {/* AI Insights Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            AI Generated Insights {userLocation ? '(Location Based)' : '(Simulated)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {generateInsights.length > 0 ? (
              generateInsights.slice(0, 6).map((insight) => (
                <InsightCard
                  key={insight.id}
                  {...insight}
                  onDismiss={() => handleDismiss(insight.id)}
                  onViewZone={() => handleViewZone(insight.relatedZoneId)}
                />
              ))
            ) : (
              <div className="col-span-3 h-32 flex items-center justify-center border border-dashed border-zinc-800 rounded-xl bg-white/5">
                <p className="text-zinc-500 text-sm">No active insights in your area.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Charts Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className='grid grid-cols-1 lg:grid-cols-3 gap-6'
        >
          <Suspense fallback={<div className="h-[300px] w-full bg-zinc-900/50 animate-pulse rounded-xl" />}>
            <div className="lg:col-span-2">
              <TrendAnalysis />
            </div>
          </Suspense>

          {/* Top Risk Zones List */}
          <div className="h-full min-h-[250px] bg-black/40 border-white/5 backdrop-blur-sm border rounded-xl p-4 flex flex-col">
            <h4 className="text-sm font-medium text-zinc-300 mb-4 flex items-center justify-between">
              <span>Critical Zones</span>
              <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-0.5 rounded-full">Live Monitor</span>
            </h4>

            <div className="space-y-3">
              {[
                { name: 'Downtown Intersection A', risk: 85, trend: 'up' },
                { name: 'Highway 101 North', risk: 72, trend: 'stable' },
                { name: 'School Zone B', risk: 64, trend: 'down' },
              ].map((zone, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-zinc-200 group-hover:text-emerald-400 transition-colors">{zone.name}</span>
                    <span className="text-[10px] text-zinc-500">Camera ID: CAM-00{i + 1}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">{zone.risk}%</div>
                      <div className="text-[10px] text-zinc-600">Risk Score</div>
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${zone.risk > 80 ? 'bg-rose-500 animate-pulse' : zone.risk > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  </div>
                </div>
              ))}
            </div>

            <Button variant="ghost" className="w-full mt-auto text-xs text-zinc-500 hover:text-zinc-300 hover:bg-white/5">
              View All Zones
            </Button>
          </div>
        </motion.div>

      </div>
    </DashboardLayout>
  );
}

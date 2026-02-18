import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'react-router-dom';
import {
  MapPin,
  AlertTriangle,
  Filter,
  Layers,
  Clock,
  Car,
  Shield,
  Activity,
  Loader2
} from 'lucide-react';
import LiveRiskMapImpl from '@/components/dashboard/LiveRiskMapImpl';
import { RoadSegment } from '@/lib/mockRoads';
import { useRiskStore } from '@/services/riskStore';

export default function RiskMapPage() {
  const [activeZones, setActiveZones] = useState<RoadSegment[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const { zones: storeZones } = useRiskStore();

  // Sync store zones to local state (for now, or replace use of local state entirely)
  // Initially we used onTrafficUpdate, but now we can use storeZones directly.
  // However, LiveRiskMapImpl still calls onTrafficUpdate, so let's keep it for compatibility or migrate.
  // Better to use storeZones directly for the list.

  // Handle Deep Linking
  useEffect(() => {
    const focusId = searchParams.get('focusZone');
    if (focusId) {
      setSelectedZoneId(focusId);
    }
  }, [searchParams]);

  // Derived Values/Stats
  const stats = useMemo(() => {
    // USE STORE DATA INSTEAD OF LOCAL STATE
    const source = storeZones.length > 0 ? storeZones : activeZones;
    return {
      critical: source.filter(z => z.riskLevel === 'critical').length,
      high: source.filter(z => z.riskLevel === 'high').length,
      medium: source.filter(z => z.riskLevel === 'medium').length,
      low: source.filter(z => z.riskLevel === 'low').length,
      total: source.length
    };
  }, [activeZones, storeZones]);

  // Sort zones by risk (Critical first)
  const sortedZones = useMemo(() => {
    const source = storeZones.length > 0 ? storeZones : activeZones;
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...source].sort((a, b) => order[a.riskLevel] - order[b.riskLevel]);
  }, [activeZones, storeZones]);

  return (
    <DashboardLayout>
      <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 flex-shrink-0"
        >
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-3">
              Live Risk Intelligence
              <Badge variant="outline" className="animate-pulse border-primary text-primary ml-2">
                <Activity className="w-3 h-3 mr-1" /> LIVE
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time road network monitoring and predictive safety analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/10">
              <Filter className="w-4 h-4 mr-2" />
              Smart Filters
            </Button>
            <Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/10">
              <Layers className="w-4 h-4 mr-2" />
              Layers
            </Button>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-grow min-h-0">
          {/* Map Area */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3 h-full"
          >
            <Card className="overflow-hidden h-full border-zinc-800 bg-zinc-900/50">
              <CardContent className="p-0 h-full relative">
                <LiveRiskMapImpl
                  onTrafficUpdate={setActiveZones}
                  selectedSegmentId={selectedZoneId}
                />
              </CardContent>
            </Card>
          </motion.div>

          {/* Sidebar - Zone List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 flex flex-col h-full min-h-0"
          >
            {/* Active Zones List */}
            <Card className="flex-grow flex flex-col min-h-0 border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-sm font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-primary" />
                    Nearby Active Zones
                  </div>
                  <Badge variant="secondary" className="text-xs">{stats.total} Detected</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-grow">
                <AnimatePresence mode="popLayout">
                  {sortedZones.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 opacity-50" />
                      Scanning Road Network...
                    </div>
                  ) : (
                    sortedZones.map((zone, index) => (
                      <motion.div
                        key={zone.id}
                        layout
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        onClick={() => setSelectedZoneId(zone.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedZoneId === zone.id ? 'bg-primary/10 border-primary' : 'bg-zinc-950/50 border-zinc-800 hover:border-zinc-700'}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">
                              {zone.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Live
                              </span>
                              <span className="flex items-center gap-1">
                                <Car className="w-3 h-3" />
                                {zone.riskLevel === 'critical' ? '>90%' : zone.riskLevel === 'high' ? '75%' : 'Moderate'}
                              </span>
                            </div>
                          </div>
                          <Badge className={`${zone.riskLevel === 'critical' ? 'bg-red-900/30 text-red-500 border-red-500/50' :
                            zone.riskLevel === 'high' ? 'bg-orange-900/30 text-orange-500 border-orange-500/50' :
                              zone.riskLevel === 'medium' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-500/50' :
                                'bg-emerald-900/30 text-emerald-500 border-emerald-500/50'
                            } border uppercase text-[10px]`}>
                            {zone.riskLevel}
                          </Badge>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

            {/* Quick Stats (Fixed at bottom) */}
            <Card className="flex-shrink-0 border-zinc-800 bg-zinc-900/50">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                  <Shield className="w-3 h-3 text-primary" />
                  Live Risk Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <div className="flex justify-between items-center group cursor-help">
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-300">Critical Congestion</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 transition-all duration-500" style={{ width: `${(stats.critical / Math.max(stats.total, 1)) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-red-500 w-4 text-right">
                      {stats.critical}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center group cursor-help">
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-300">High Risk Areas</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-600 transition-all duration-500" style={{ width: `${(stats.high / Math.max(stats.total, 1)) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-orange-500 w-4 text-right">
                      {stats.high}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center group cursor-help">
                  <span className="text-sm text-zinc-400 group-hover:text-zinc-300">Moderate Flow</span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${(stats.medium / Math.max(stats.total, 1)) * 100}%` }} />
                    </div>
                    <span className="text-sm font-bold text-yellow-500 w-4 text-right">
                      {stats.medium}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}



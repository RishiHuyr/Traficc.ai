import { motion } from 'framer-motion';
import { AlertTriangle, MapPin, Construction, School, Clock, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useRiskStore } from '@/services/riskStore';
import { useMemo } from 'react';

interface Alert {
  id: string;
  type: 'road_risk' | 'school_zone' | 'construction';
  title: string;
  location: string;
  reason: string;
  riskLevel: 'high' | 'medium';
  zoneId: string;
  timestamp: string;
}

interface AlertsPanelProps {
  onAlertClick?: (zoneId: string) => void;
}

export function AlertsPanel({ onAlertClick }: AlertsPanelProps) {
  const { zones, userLocation } = useRiskStore();

  // Calculate distance between two coordinates (Haversine formula)
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  // Generate 2 real-time alerts from nearby zones
  const alerts = useMemo<Alert[]>(() => {
    if (zones.length === 0) return [];
    if (!userLocation) return []; // No alerts without user location

    const generated: Alert[] = [];
    const now = new Date();
    const MAX_RADIUS_KM = 2; // 2km radius

    // Calculate distances for all zones
    const zonesWithDistance = zones.map(zone => {
      // Calculate center of zone path
      const centerLat = zone.path.reduce((sum, p) => sum + p[0], 0) / zone.path.length;
      const centerLng = zone.path.reduce((sum, p) => sum + p[1], 0) / zone.path.length;

      const distance = calculateDistance(
        userLocation.lat,
        userLocation.lng,
        centerLat,
        centerLng
      );

      return { ...zone, distance, centerLat, centerLng };
    });

    // Filter zones within radius and sort by distance
    const nearbyZones = zonesWithDistance
      .filter(z => z.distance <= MAX_RADIUS_KM)
      .sort((a, b) => a.distance - b.distance);

    if (nearbyZones.length === 0) {
      // No zones within radius - return empty
      return [];
    }

    // 1. Nearest Traffic Light Alert - closest high/medium risk zone
    const trafficLightZone = nearbyZones
      .find(z => z.riskLevel === 'high' || z.riskLevel === 'medium');

    if (trafficLightZone) {
      generated.push({
        id: `traffic-${trafficLightZone.id}`,
        type: 'road_risk',
        title: 'Nearby Traffic Light',
        location: trafficLightZone.name,
        reason: trafficLightZone.riskLevel === 'high'
          ? `Heavy congestion at intersection (${trafficLightZone.distance.toFixed(1)}km away)`
          : `Moderate traffic flow (${trafficLightZone.distance.toFixed(1)}km away)`,
        riskLevel: trafficLightZone.riskLevel === 'high' ? 'high' : 'medium',
        zoneId: trafficLightZone.id,
        timestamp: 'Live'
      });
    }

    // 2. Nearby School Alert - different zone from traffic light
    const schoolZone = nearbyZones
      .filter(z => z.id !== trafficLightZone?.id)
    [0]; // Pick the next nearest

    if (schoolZone) {
      const hour = now.getHours();
      const isSchoolTime = (hour >= 7 && hour <= 9) || (hour >= 14 && hour <= 16);

      generated.push({
        id: `school-${schoolZone.id}`,
        type: 'school_zone',
        title: 'Nearby School',
        location: `Near ${schoolZone.name}`,
        reason: isSchoolTime
          ? (hour >= 7 && hour <= 9
            ? `Morning drop-off - reduced speed limit (${schoolZone.distance.toFixed(1)}km away)`
            : `Afternoon pickup - increased pedestrian activity (${schoolZone.distance.toFixed(1)}km away)`)
          : `School zone - drive carefully (${schoolZone.distance.toFixed(1)}km away)`,
        riskLevel: 'medium',
        zoneId: schoolZone.id,
        timestamp: 'Live'
      });
    }

    return generated.slice(0, 2); // Ensure exactly 2 alerts
  }, [zones, userLocation]);

  const handleAlertClick = (alert: Alert) => {
    // Trigger map focus via callback instead of navigation
    onAlertClick?.(alert.zoneId);
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'road_risk':
        return <AlertTriangle className="w-4 h-4" />;
      case 'school_zone':
        return <School className="w-4 h-4" />;
      case 'construction':
        return <Construction className="w-4 h-4" />;
    }
  };

  const getAlertColor = (type: Alert['type']) => {
    switch (type) {
      case 'road_risk':
        return 'bg-red-500/10 border-red-500/30 text-red-500';
      case 'school_zone':
        return 'bg-amber-500/10 border-amber-500/30 text-amber-500';
      case 'construction':
        return 'bg-orange-500/10 border-orange-500/30 text-orange-500';
    }
  };

  return (
    <div className="glass-panel p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-warning" />
          Active Alerts
        </h3>
        <Badge variant="alertWarning">
          {alerts.length} Nearby
        </Badge>
      </div>

      {userLocation && (
        <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 text-emerald-500" />
          <span>Within 2km of your location</span>
        </div>
      )}

      <div className="space-y-3">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No alerts in your area</p>
            <p className="text-xs mt-1">
              {userLocation ? 'No traffic lights within 2km' : 'Enable location to see nearby alerts'}
            </p>
          </div>
        ) : (
          alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleAlertClick(alert)}
              className={`p-4 rounded-xl border transition-all duration-200 hover:border-primary/50 cursor-pointer hover:shadow-lg ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getAlertColor(alert.type).replace('/10', '/20')}`}>
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-white truncate">
                      {alert.title}
                    </span>
                    <Badge
                      variant={alert.riskLevel === 'high' ? 'riskHigh' : 'riskMedium'}
                      className="text-[10px] px-1.5"
                    >
                      {alert.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                  <p className="text-xs text-zinc-300 mb-2 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {alert.location}
                  </p>
                  <p className="text-xs text-zinc-400 line-clamp-2">
                    {alert.reason}
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1 hover:text-primary"
                    >
                      View on Map <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

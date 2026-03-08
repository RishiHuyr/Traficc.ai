import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Play,
  Pause,
  Maximize2,
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  Eye,
  Shield,
} from 'lucide-react';
import { CameraFeed } from '@/lib/mockData';

interface DetectedVehicle {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  riskLevel: 'safe' | 'moderate' | 'high';
  violationType: string | null;
  confidence: number;
  speed?: number;
}

interface EnhancedCameraFeedProps {
  camera: CameraFeed;
  isFeatured?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}

const violationTypes = [
  'Speed Violation',
  'Lane Departure',
  'Signal Violation',
  'Unsafe Distance',
  'Illegal Turn',
  null, // No violation
  null,
  null,
];

export default function EnhancedCameraFeed({
  camera,
  isFeatured = false,
  isSelected = false,
  onSelect,
}: EnhancedCameraFeedProps) {
  const [vehicles, setVehicles] = useState<DetectedVehicle[]>([]);
  const [isPlaying, setIsPlaying] = useState(true);

  // Generate and animate vehicle detections
  useEffect(() => {
    if (!isPlaying) return;

    const generateVehicles = () => {
      const count = Math.min(camera.vehicleCount % 6 + 2, 5);
      const newVehicles: DetectedVehicle[] = [];

      for (let i = 0; i < count; i++) {
        const hasViolation = Math.random() < 0.3;
        const riskLevel: DetectedVehicle['riskLevel'] =
          hasViolation && Math.random() > 0.5 ? 'high' :
            hasViolation ? 'moderate' : 'safe';

        newVehicles.push({
          id: `v-${i}`,
          x: 10 + (i * 18) + (Math.random() * 8),
          y: 25 + (Math.random() * 35),
          width: 12 + Math.random() * 6,
          height: 10 + Math.random() * 8,
          riskLevel,
          violationType: hasViolation ? violationTypes[Math.floor(Math.random() * violationTypes.length)] : null,
          confidence: 85 + Math.random() * 14,
          speed: 25 + Math.random() * 45,
        });
      }

      setVehicles(newVehicles);
    };

    generateVehicles();
    const interval = setInterval(generateVehicles, 3000);
    return () => clearInterval(interval);
  }, [camera.vehicleCount, isPlaying]);

  const getRiskColor = (level: DetectedVehicle['riskLevel']) => {
    switch (level) {
      case 'high': return { border: 'border-destructive', bg: 'bg-destructive', glow: 'shadow-destructive/50' };
      case 'moderate': return { border: 'border-warning', bg: 'bg-warning', glow: 'shadow-warning/50' };
      default: return { border: 'border-success', bg: 'bg-success', glow: 'shadow-success/50' };
    }
  };

  const stats = useMemo(() => {
    const safeCount = vehicles.filter(v => v.riskLevel === 'safe').length;
    const moderateCount = vehicles.filter(v => v.riskLevel === 'moderate').length;
    const highCount = vehicles.filter(v => v.riskLevel === 'high').length;
    const avgConfidence = vehicles.length > 0
      ? vehicles.reduce((acc, v) => acc + v.confidence, 0) / vehicles.length
      : 0;

    return { safeCount, moderateCount, highCount, avgConfidence };
  }, [vehicles]);

  return (
    <Card
      className={`overflow-hidden group cursor-pointer transition-all duration-300 ${isSelected ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : 'hover:border-primary/30'
        }`}
      onClick={onSelect}
    >
      <CardContent className="p-0">
        {/* Video Feed Simulation */}
        <div
          className={`relative bg-gradient-to-br from-background via-muted/50 to-background overflow-hidden ${isFeatured ? 'h-[400px]' : 'h-[220px]'
            }`}
        >
          {/* Ambient road simulation */}
          <div className="absolute inset-0">
            <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-muted-foreground/5 to-transparent" />
            <div className="absolute inset-0 opacity-30" style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 48%, hsl(var(--muted)) 49%, hsl(var(--muted)) 51%, transparent 52%),
                linear-gradient(180deg, transparent 0%, transparent 50%, hsl(var(--muted-foreground) / 0.1) 100%)
              `,
              backgroundSize: '100% 100%, 100% 100%',
            }} />
          </div>

          {/* Enhanced Vehicle Detection Boxes */}
          <div className="absolute inset-0">
            <AnimatePresence mode="sync">
              {vehicles.map((vehicle) => {
                const colors = getRiskColor(vehicle.riskLevel);
                return (
                  <motion.div
                    key={vehicle.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className={`absolute ${colors.border} border-2 rounded-sm transition-all duration-300`}
                    style={{
                      left: `${vehicle.x}%`,
                      top: `${vehicle.y}%`,
                      width: `${vehicle.width}%`,
                      height: `${vehicle.height}%`,
                      boxShadow: vehicle.riskLevel !== 'safe'
                        ? `0 0 12px 2px ${vehicle.riskLevel === 'high' ? 'hsl(var(--destructive) / 0.4)' : 'hsl(var(--warning) / 0.4)'}`
                        : 'none',
                    }}
                  >
                    {/* Corner accents */}
                    <div className={`absolute -top-0.5 -left-0.5 w-2 h-2 ${colors.bg}`} style={{ clipPath: 'polygon(0 0, 100% 0, 0 100%)' }} />
                    <div className={`absolute -top-0.5 -right-0.5 w-2 h-2 ${colors.bg}`} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }} />
                    <div className={`absolute -bottom-0.5 -left-0.5 w-2 h-2 ${colors.bg}`} style={{ clipPath: 'polygon(0 0, 0 100%, 100% 100%)' }} />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 ${colors.bg}`} style={{ clipPath: 'polygon(100% 0, 0 100%, 100% 100%)' }} />

                    {/* Info tooltip - only show for violations */}
                    {vehicle.violationType && (
                      <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap z-10"
                      >
                        <div className={`px-2 py-1 rounded text-[10px] font-medium backdrop-blur-sm border ${vehicle.riskLevel === 'high'
                            ? 'bg-destructive/90 text-destructive-foreground border-destructive/50'
                            : 'bg-warning/90 text-warning-foreground border-warning/50'
                          }`}>
                          <div className="flex items-center gap-1">
                            <span>{vehicle.violationType}</span>
                            <span className="opacity-70">({vehicle.confidence.toFixed(0)}%)</span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Scan line animation */}
          {isPlaying && (
            <motion.div
              className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/60 to-transparent pointer-events-none"
              animate={{ top: ['0%', '100%'] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
            />
          )}

          {/* Processing overlay effect */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          </div>

          {/* Status Badge */}
          <div className="absolute top-3 left-3">
            <Badge
              variant={
                camera.status === 'online' ? 'online' :
                  camera.status === 'processing' ? 'processing' : 'offline'
              }
              className="backdrop-blur-sm"
            >
              {camera.status === 'online' && <Wifi className="w-3 h-3 mr-1" />}
              {camera.status === 'offline' && <WifiOff className="w-3 h-3 mr-1" />}
              {camera.status === 'processing' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
              {camera.status}
            </Badge>
          </div>

          {/* Camera ID */}
          <div className="absolute top-3 right-3">
            <span className="text-xs font-mono bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-foreground border border-border/50">
              {camera.name}
            </span>
          </div>

          {/* Live indicator */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-destructive/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-destructive-foreground">
              <motion.div
                className="w-2 h-2 rounded-full bg-white"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              LIVE
            </div>
          </div>

          {/* Real-time stats overlay */}
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-foreground border border-border/50">
              <Eye className="w-3 h-3 text-primary" />
              <span className="font-mono">{vehicles.length} tracked</span>
            </div>
            {stats.avgConfidence > 0 && (
              <div className="flex items-center gap-1.5 bg-background/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] text-foreground border border-border/50">
                <Shield className="w-3 h-3 text-success" />
                <span className="font-mono">{stats.avgConfidence.toFixed(0)}% conf</span>
              </div>
            )}
          </div>

          {/* Controls overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-14 gap-2">
            <Button
              variant="glass"
              size="sm"
              onClick={(e) => { e.stopPropagation(); setIsPlaying(!isPlaying); }}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="glass" size="sm" onClick={(e) => e.stopPropagation()}>
              <Maximize2 className="w-4 h-4" />
            </Button>
            <Button variant="glass" size="sm" onClick={(e) => e.stopPropagation()}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Camera Info Footer */}
        <div className="p-4 border-t border-border bg-card/50">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-foreground truncate">{camera.location}</p>
              <div className="flex items-center gap-4 mt-2">
                {/* Risk distribution indicators */}
                <div className="flex items-center gap-1 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-muted-foreground">{stats.safeCount}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <span className="text-muted-foreground">{stats.moderateCount}</span>
                </div>
                <div className="flex items-center gap-1 text-[10px]">
                  <div className="w-2 h-2 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">{stats.highCount}</span>
                </div>
                <div className="h-3 w-px bg-border" />
                <span className="text-[10px] text-muted-foreground">
                  {camera.violations} violations today
                </span>
              </div>
            </div>
            <Badge variant={
              camera.riskLevel === 'high' ? 'riskHigh' :
                camera.riskLevel === 'medium' ? 'riskMedium' : 'riskLow'
            }>
              {camera.riskLevel}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

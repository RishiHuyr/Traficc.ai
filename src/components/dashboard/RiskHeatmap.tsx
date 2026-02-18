import { lazy, Suspense } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/card';

// Lazy load the heavy map component
const LiveRiskMapImpl = lazy(() => import('./LiveRiskMapImpl'));

interface RiskHeatmapProps {
  selectedSegmentId?: string | null;
}

export function RiskHeatmap({ selectedSegmentId }: RiskHeatmapProps) {
  return (
    <Card className="col-span-12 lg:col-span-8 h-[400px] lg:h-[500px] overflow-hidden border-zinc-800 bg-zinc-900/50 relative group">
      <Suspense
        fallback={
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950 text-zinc-500 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-xs font-mono tracking-widest uppercase">Initializing Terrestrial Data...</p>
          </div>
        }
      >
        <LiveRiskMapImpl selectedSegmentId={selectedSegmentId} />
      </Suspense>

      {/* Decorative Grid Overlay (pointer-events-none) */}
      <div className="absolute inset-0 pointer-events-none opacity-20 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
    </Card>
  );
}

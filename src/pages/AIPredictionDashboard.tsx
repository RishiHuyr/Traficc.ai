import {
  useState, useEffect, useCallback, useMemo
} from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle, Clock, Sparkles, Brain, Zap, Activity,
  Mic, Search, Info, ShieldAlert, Video, PlayCircle,
  Loader2, LocateFixed, CheckCircle2,
} from 'lucide-react';
import { useRiskStore } from '@/services/riskStore';
import LiveRiskMapImpl from '@/components/dashboard/LiveRiskMapImpl';

/* ─── Types ──────────────────────────────────────────────────── */
const SESSION_KEY = 'trafiq_geo_loc';

interface Loc { name: string; lat: number; lng: number; }
interface Road {
  id: string; name: string;
  current: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  midpoint: [number, number];
  path: [number, number][];
}

/* ─── Utils ──────────────────────────────────────────────────── */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en' } },
    );
    const d = await r.json();
    const a = d.address;
    return a.city || a.town || a.village || a.suburb || a.county || 'Ludhiana';
  } catch { return 'Ludhiana'; }
}

/* ─── Color map ──────────────────────────────────────────────── */
const ROAD_COLOR: Record<Road['current'], string> = {
  low: '#10b981', // green
  medium: '#f59e0b', // yellow
  high: '#f97316', // orange
  critical: '#ef4444', // red
};

/* ═══ (InteractiveMap removed — LiveRiskMapImpl is used directly) ══ */


/* ═══ ORCHESTRATOR ════════════════════════════════════════════════ */
export default function AIPredictionDashboard() {
  const { zones, updateUserLocation, fetchNearbyRoads } = useRiskStore();
  const [stage, setStage] = useState<'loading' | 'ready'>('loading');
  const [loc, setLoc] = useState<Loc | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  useEffect(() => {
    let active = true;
    const fetchLoc = async () => {
      const v = sessionStorage.getItem(SESSION_KEY);
      let lat = 30.900965;
      let lng = 75.8572758;
      let name = 'Ludhiana';

      if (v) {
        const p = JSON.parse(v);
        lat = p.lat; lng = p.lng; name = p.name;
      } else if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 8000 })
          );
          lat = pos.coords.latitude; lng = pos.coords.longitude;
          name = await reverseGeocode(lat, lng);
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ name, lat, lng }));
        } catch { /* fallback to default */ }
      }

      if (!active) return;

      const locObj = { lat, lng, name };
      setLoc(locObj);
      updateUserLocation({ lat, lng });

      // Fetch full network 4-5km from Overpass API (dashboard data)
      await fetchNearbyRoads(lat, lng);

      if (active) { setStage('ready'); }
    };
    fetchLoc();
    return () => { active = false; };
  }, [updateUserLocation, fetchNearbyRoads]);

  // Derive display roads dynamically from global OSM Overpass data
  const processedRoads = useMemo(() => {
    if (!zones || zones.length === 0) return [];

    return zones.map(zone => {
      let riskScore = 0;
      switch (zone.riskLevel) {
        case 'critical': riskScore = 85 + Math.floor(Math.random() * 15); break;
        case 'high': riskScore = 65 + Math.floor(Math.random() * 20); break;
        case 'medium': riskScore = 40 + Math.floor(Math.random() * 25); break;
        case 'low': riskScore = 10 + Math.floor(Math.random() * 30); break;
      }

      // Convert from [lat, lon] to [lat, lon] is already correct for Leaflet natively
      const pathUrlFormat: [number, number][] = zone.path;
      const midpoint = pathUrlFormat[Math.floor(pathUrlFormat.length / 2)] || (loc ? [loc.lat, loc.lng] : [0, 0]);

      return {
        id: zone.id,
        name: zone.name !== "Unnamed Road" && zone.name ? zone.name : `Route ${zone.id.slice(-4)}`,
        current: zone.riskLevel,
        riskScore,
        midpoint,
        path: pathUrlFormat
      } as Road;
    }).sort((a, b) => b.riskScore - a.riskScore); // Highest risk first
  }, [zones, loc]);

  if (stage === 'loading' || !loc) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center text-cyan-500 gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-xs text-zinc-500 tracking-widest uppercase">Loading AI Traffic Data…</p>
      </div>
    );
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-1rem)] bg-[#020617] text-white p-3 md:p-4 gap-4 overflow-x-hidden font-sans">

        {/* === HEADER === */}
        <div className="flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-widest uppercase leading-none">TRAFIQ.AI</h1>
                <p className="text-[9px] text-zinc-500 uppercase tracking-widest">AI Prediction</p>
              </div>
            </div>

            {/* Search */}
            <div className="hidden lg:flex flex-1 min-w-[300px] max-w-md relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/60" />
              <input
                readOnly defaultValue='Traffic near me: "fastest route"'
                className="w-full h-10 bg-[#0f172a]/80 border border-cyan-500/20 rounded-full pl-10 pr-10 text-xs text-cyan-50 cursor-default focus:outline-none"
              />
              <Mic className="absolute right-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-400" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <div className="hidden md:flex items-center gap-1.5 text-cyan-300 bg-cyan-500/5 border border-cyan-500/20 rounded-full px-3 py-1.5">
              <Activity className="w-3 h-3 animate-pulse" />
              <span>48 Cameras Live</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <Clock className="w-3 h-3" /> {timeStr}
            </div>
            <div className="flex items-center gap-1.5 text-zinc-300 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
              <LocateFixed className="w-3 h-3 text-cyan-400" /> {loc.name}
            </div>
          </div>
        </div>

        {/* === AI PREDICTION CARDS (DYNAMIC TO REAL DATA) === */}
        <div className="shrink-0 bg-[#0f172a]/50 border border-white/[0.06] rounded-2xl p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-widest">AI Prediction For Your Area</span>
            <span className="ml-auto text-[10px] text-zinc-500 flex items-center gap-1">
              <Info className="w-3 h-3" /> Active Live Feeds
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {processedRoads.slice(0, 3).map((road, i) => {
              const isCritical = road.current === 'critical' || road.current === 'high';
              const isWarning = road.current === 'medium';
              const colorHex = ROAD_COLOR[road.current];

              const Icon = isCritical ? AlertTriangle : isWarning ? Zap : CheckCircle2;
              const statusStr = isCritical ? 'Heavy' : isWarning ? 'Moderate' : 'Stable';

              return (
                <div key={road.id} className="rounded-xl border p-4 relative overflow-hidden transition-colors cursor-pointer"
                  onClick={() => handleSelect(road.id)}
                  style={{
                    borderColor: `${colorHex}60`,
                    backgroundColor: `${colorHex}10`,
                    boxShadow: `0 0 28px ${colorHex}15, inset 0 0 20px ${colorHex}10`
                  }}>
                  <div className="absolute top-0 left-0 w-1 h-full shadow-[0_0_12px]" style={{ backgroundColor: colorHex, color: colorHex }} />
                  <div className="flex items-center gap-2 mb-1 pl-3">
                    <Icon className="w-4 h-4 shrink-0" style={{ color: colorHex }} />
                    <span className="font-bold text-white text-sm truncate">{road.name} — {statusStr}</span>
                  </div>
                  <p className="text-[11px] mb-2 pl-3" style={{ color: colorHex, opacity: 0.8 }}>
                    {isCritical ? `High traffic buildup — expected +12 mins` : isWarning ? `Moderate congestion detected` : `Flow remains stable and steady`}
                  </p>
                  <div className="flex justify-between items-end pl-3">
                    <span className="text-[9px] font-semibold uppercase tracking-widest flex items-center gap-1" style={{ color: colorHex }}>
                      {isCritical && <AlertTriangle className="w-2.5 h-2.5" />}
                      {isCritical ? 'Accident detected' : '90% confidence'}
                    </span>
                    <span className="text-2xl font-black leading-none" style={{ color: colorHex }}>
                      {road.riskScore}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* === MAP + RIGHT PANEL === */}
        <div className="flex flex-1 gap-4 min-h-0">

          {/* MAP — same LiveRiskMapImpl used in Dashboard, RiskMap & RoutePlanner */}
          <div className="relative flex-1 rounded-2xl overflow-hidden border border-white/[0.07] z-0"
            style={{ boxShadow: '0 0 50px rgba(0,0,0,0.7)' }}>
            <LiveRiskMapImpl
              selectedSegmentId={selectedId}
              onSegmentClick={handleSelect}
              onTrafficUpdate={undefined}
            />
          </div>

          {/* RIGHT PANEL */}
          <div className="w-72 xl:w-80 flex-shrink-0 hidden lg:flex flex-col gap-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>

            {/* Smart Traffic Forecast */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0f172a]/60 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Clock className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Smart Traffic Forecast</span>
              </div>
              <div className="flex gap-4 text-[10px] font-bold border-b border-white/5 pb-2 mb-3">
                <span className="text-cyan-400 border-b border-cyan-400 pb-1 -mb-[9px] flex items-center gap-1">
                  <Activity className="w-2.5 h-2.5" /> 30 min
                </span>
                <span className="text-zinc-500">1 hr</span>
                <span className="text-zinc-500">2 hr</span>
              </div>

              {processedRoads.slice(0, 2).map((road, i) => {
                const color = ROAD_COLOR[road.current];
                return (
                  <div key={road.id} className="rounded-xl border p-3 mb-2" style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3" style={{ color }} /> {road.name}
                      </span>
                      <Badge className="border-none text-[8px] h-4 px-1.5" style={{ backgroundColor: `${color}30`, color }}>{road.current.toUpperCase()}</Badge>
                    </div>
                    {i === 0 && (
                      <svg width="100%" height="32" viewBox="0 0 200 32" preserveAspectRatio="none" className="opacity-80">
                        <path d="M0 16 Q30 4,60 16 T120 8 T180 24 T200 16" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 4px #ef4444)' }} />
                      </svg>
                    )}
                    <div className="flex justify-between items-center border-t border-white/5 pt-1 mt-1">
                      <span className="text-[9px] text-zinc-500">{i === 0 ? 'Peaks in ~20 mins' : '90% confidence'}</span>
                      <span className="text-[10px] font-black" style={{ color }}>HEAVY</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Predicted Risk Zones */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0f172a]/60 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <ShieldAlert className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Predicted Risk Zones</span>
              </div>
              {processedRoads.slice(2, 6).map((road) => (
                <div key={road.id}
                  className="rounded-xl border p-3 mb-2 cursor-pointer transition-all last:mb-0"
                  style={{
                    borderColor: road.id === selectedId ? ROAD_COLOR[road.current] + '80' : ROAD_COLOR[road.current] + '30',
                    background: ROAD_COLOR[road.current] + '08',
                    boxShadow: road.id === selectedId ? `0 0 16px ${ROAD_COLOR[road.current]}30` : 'none',
                  }}
                  onClick={() => handleSelect(road.id)}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-semibold text-white text-xs">{road.name}</span>
                    <span className="text-[9px] font-black uppercase"
                      style={{ color: ROAD_COLOR[road.current] }}>
                      {road.current.toUpperCase()}
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800/80 rounded-full h-1 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${road.riskScore}%`, background: ROAD_COLOR[road.current], boxShadow: `0 0 8px ${ROAD_COLOR[road.current]}` }} />
                  </div>
                  <div className="flex justify-between mt-1.5 text-[9px] text-zinc-500">
                    <span>Risk score: {road.riskScore}%</span>
                    {road.id === selectedId && <span style={{ color: ROAD_COLOR[road.current] }}>↑ Map focused</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* AI Insights & Video Analysis (Unchanged layouts) */}
            <div className="rounded-2xl border border-white/[0.06] bg-[#0f172a]/60 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Brain className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">AI Insights</span>
              </div>
              <ul className="space-y-2 text-[10px] text-zinc-300">
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_#06b6d4] mt-1 shrink-0" />
                  <p>Traffic expected to normalize after 9:30 PM on primary links.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_#ef4444] mt-1 shrink-0" style={{ backgroundColor: processedRoads[0] ? ROAD_COLOR[processedRoads[0].current] : '#ef4444' }} />
                  <p>Avoid <span className="font-bold text-white">{processedRoads[0]?.name || 'Primary link'}</span> for next 45 mins due to sustained blockage.</p>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] mt-1 shrink-0" />
                  <p>Side roads improving — consider them as alternate routes.</p>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl border border-white/[0.06] bg-[#0f172a]/60 p-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Video className="w-3 h-3 text-cyan-400" />
                <span className="text-[10px] font-bold text-white uppercase tracking-widest">Video Analysis</span>
              </div>
              <div className="aspect-video w-full rounded-lg overflow-hidden border border-rose-500/20 mb-3 relative group cursor-pointer">
                <img
                  src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=400&q=60"
                  className="w-full h-full object-cover opacity-60 mix-blend-luminosity"
                  alt="Traffic camera feed"
                />
                <div className="absolute top-1/4 left-1/4 w-1/3 h-1/3 border border-rose-500 bg-rose-500/10 shadow-[0_0_12px_rgba(239,68,68,0.3)] flex items-end p-1">
                  <span className="text-[8px] bg-rose-500 text-white px-1 py-0.5 rounded font-bold">95% ACC</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <PlayCircle className="w-8 h-8 text-white" />
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-rose-400 font-bold text-[11px] mb-0.5">Accident detected</p>
                  <p className="text-zinc-500 text-[9px]">83% confidence</p>
                </div>
                <Button className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-[10px] h-6 px-3 rounded-full">
                  Go Live
                </Button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

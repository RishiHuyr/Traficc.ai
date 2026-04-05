import { memo } from 'react';
import { useRoutePlannerStore } from '@/store/routePlannerStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Route as RouteIcon, ShieldCheck, Zap, Maximize, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    return `${m}m`;
};

const formatDistance = (meters: number) => {
    const km = meters / 1000;
    return `${km.toFixed(1)} km`;
};

export const RouteOptionsPanel = memo(() => {
    const { routes, selectedRouteId, setSelectedRouteId, isCalculating } = useRoutePlannerStore();

    if (isCalculating || routes.length === 0) {
        return null;
    }

    const getTypeStyle = (type: string, isSelected: boolean) => {
        switch (type) {
            case 'fastest':
                return isSelected ? 'border-blue-500 bg-blue-500/10' : 'border-zinc-800 bg-zinc-950/50 hover:border-blue-500/30';
            case 'shortest':
                return isSelected ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-800 bg-zinc-950/50 hover:border-emerald-500/30';
            case 'safest':
                return isSelected ? 'border-amber-500 bg-amber-500/10' : 'border-zinc-800 bg-zinc-950/50 hover:border-amber-500/30';
            default:
                return isSelected ? 'border-primary bg-primary/10' : 'border-zinc-800 bg-zinc-950/50';
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'fastest': return 'text-blue-400';
            case 'shortest': return 'text-emerald-400';
            case 'safest': return 'text-amber-400';
            default: return 'text-primary';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'fastest': return <Zap className="w-4 h-4" />;
            case 'shortest': return <Maximize className="w-4 h-4" />;
            case 'safest': return <ShieldCheck className="w-4 h-4" />;
            default: return <RouteIcon className="w-4 h-4" />;
        }
    };

    const selectedRoute = routes.find(r => r.id === selectedRouteId);

    return (
        <div className="space-y-4">
            {/* AI Suggested Route Header */}
            <div className="flex items-center justify-between px-1 pt-1">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Navigation className="w-3.5 h-3.5 text-primary" />
                    AI Suggested Route
                </h3>
                <span className="text-[10px] text-zinc-600 bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">AI Optimized</span>
            </div>


            <AnimatePresence>
                {routes.map((route, index) => {
                    const isSelected = selectedRouteId === route.id;
                    const typeColor = getTypeColor(route.type);

                    return (
                        <motion.div
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            key={route.id}
                        >
                            <Card
                                className={`group cursor-pointer transition-all duration-300 border ${getTypeStyle(route.type, isSelected)} relative overflow-hidden`}
                                onClick={() => setSelectedRouteId(route.id)}
                            >
                                {isSelected && (
                                    <div className={`absolute top-0 right-0 w-12 h-12 flex items-center justify-end pr-1 pt-1 opacity-20`}>
                                        <div className={`w-8 h-8 rounded-full blur-xl ${typeColor.replace('text', 'bg')}`} />
                                    </div>
                                )}

                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg bg-zinc-900 border border-zinc-800 group-hover:border-zinc-700 transition-colors ${typeColor}`}>
                                                {getTypeIcon(route.type)}
                                            </div>
                                            <div>
                                                <span className="block text-xs font-bold text-white capitalize tracking-wide leading-none">{route.type} Route</span>
                                                <span className="text-[10px] text-zinc-500 font-medium">via AI optimization</span>
                                            </div>
                                        </div>
                                        {isSelected && (
                                            <div className={`px-2 py-1 rounded flex items-center gap-1.5 bg-zinc-900 border border-zinc-800`}>
                                                <div className={`w-1 h-1 rounded-full ${typeColor.replace('text', 'bg')} animate-pulse`} />
                                                <span className={`text-[9px] font-black uppercase tracking-tighter ${typeColor}`}>Active</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Time</span>
                                            <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                                                <Clock className="w-3 h-3 text-zinc-500" />
                                                <span className="text-xs">{formatDuration(route.durationSeconds)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Dist</span>
                                            <div className="flex items-center gap-1.5 font-bold text-zinc-200">
                                                <RouteIcon className="w-3 h-3 text-zinc-500" />
                                                <span className="text-xs">{formatDistance(route.distanceMeters)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 items-end">
                                            <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Risk</span>
                                            <div className={`flex items-center gap-1.5 font-bold ${route.riskScore >= 85 ? 'text-emerald-500' : route.riskScore >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                                                <span className="text-xs">{route.riskScore}%</span>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Start Navigation Button */}
            {selectedRoute && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Button
                        className="w-full mt-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm h-10 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]"
                        onClick={() => alert(`Navigation started via ${selectedRoute.type} route`)}
                    >
                        <Navigation className="w-4 h-4" />
                        Start Navigation
                    </Button>
                </motion.div>
            )}
        </div>
    );
});

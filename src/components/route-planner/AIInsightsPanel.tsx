import { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, AlertTriangle, Shield, MapPin, Loader2 } from 'lucide-react';
import { useRoutePlannerStore } from '@/store/routePlannerStore';
import { motion, AnimatePresence } from 'framer-motion';

export const AIInsightsPanel = memo(() => {
    const { routes, selectedRouteId, isCalculating } = useRoutePlannerStore();
    const activeRoute = routes.find(r => r.id === selectedRouteId) || routes[0];

    if (isCalculating) {
        return (
            <Card className="bg-card/95 backdrop-blur-xl border-primary/30 shadow-2xl shadow-primary/10">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-4 min-h-[200px]">
                    <Loader2 className="w-8 h-8 animate-spin text-primary opacity-50" />
                    <p className="text-sm text-muted-foreground">Running AI Traffic Matrix Analysis...</p>
                </CardContent>
            </Card>
        );
    }

    if (!activeRoute) {
        return null;
    }

    const { riskScore, congestionProbability, accidentRisk, warnings } = activeRoute;

    const getRiskColor = (score: number) => {
        if (score >= 80) return "text-success bg-success/10 border-success/30";
        if (score >= 60) return "text-warning bg-warning/10 border-warning/30";
        return "text-destructive bg-destructive/10 border-destructive/30";
    };

    const getRiskTextClass = (level: string) => {
        if (level === 'low') return "text-success";
        if (level === 'moderate') return "text-warning";
        return "text-destructive";
    };

    return (
        <Card className="bg-card/95 backdrop-blur-xl border-primary/30 shadow-2xl shadow-primary/10">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-row items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30">
                            <Zap className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm text-foreground leading-tight">AI Safety Analysis</h4>
                            <p className="text-[10px] text-muted-foreground">Real-time route intelligence</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className={`text-2xl font-bold px-3 py-1 rounded-md border ${getRiskColor(riskScore)}`}>
                            {riskScore}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 text-center font-bold">Risk Score</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Congestion</p>
                        <p className="text-sm font-bold text-foreground">{congestionProbability}% Probability</p>
                    </div>
                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Accident Risk</p>
                        <p className={`text-sm font-bold capitalize ${getRiskTextClass(accidentRisk)}`}>{accidentRisk}</p>
                    </div>
                </div>

                <AnimatePresence>
                    {warnings.length > 0 && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2">
                            <p className="text-xs font-medium text-foreground mb-1 flex items-center gap-1.5 pt-2 border-t border-border/50">
                                <AlertTriangle className="w-3.5 h-3.5 text-warning" />
                                Active Alerts
                            </p>
                            {warnings.map((warning, i) => (
                                <div key={i} className="flex items-start gap-2 text-xs bg-warning/10 border border-warning/20 p-2 rounded-lg">
                                    <Shield className="w-3.5 h-3.5 text-warning flex-shrink-0 mt-0.5" />
                                    <span className="text-warning/90 leading-relaxed font-medium">{warning}</span>
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>
            </CardContent>
        </Card>
    );
});
